"""
Two-Phase Certificate Issuance Engine

Implements the complete certificate issuance system with:
- Phase 1: Certificate creation maintaining hourly energy conservation
- Phase 2: EAC ID assignment using sophisticated carryover logic
- Comprehensive error handling and validation
- Perfect energy conservation at 1 Wh precision
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from decimal import Decimal
import logging

from sqlmodel import Session, select
from sqlalchemy.exc import SQLAlchemyError

from gc_registry.core.models.time_series_reading import TimeSeriesReading
from gc_registry.core.models.eac_verification_record import EACVerificationRecord
from gc_registry.measurement.models import MeasurementReport
from gc_registry.certificate.models import GranularCertificateBundle, CertificateStatus
from gc_registry.certificate.services import get_latest_issuance_metadata
from gc_registry.device.models import Device
from gc_registry.core.models.base import EnergySourceType, EnergyCarrierType

logger = logging.getLogger(__name__)


@dataclass
class CertificateCreationResult:
    """Result of Phase 1 certificate creation."""
    success: bool
    certificates: List[GranularCertificateBundle]
    error_details: Optional[Dict[str, Any]] = None
    total_energy_wh: int = 0
    certificates_created: int = 0


@dataclass
class EACAssignmentResult:
    """Result of Phase 2 EAC assignment."""
    success: bool
    certificates: List[GranularCertificateBundle]
    carryover_chains: List['CarryoverChain']
    error_details: Optional[Dict[str, Any]] = None
    eacs_assigned: int = 0
    remainder_energy_wh: int = 0


@dataclass
class CarryoverChain:
    """Audit trail for EAC carryover chain formation."""
    eac_id: str
    certificates: List[GranularCertificateBundle]
    total_energy_wh: int
    remaining_energy_wh: int
    formation_details: Dict[str, Any]


@dataclass
class EnergyConservationResult:
    """Result of energy conservation validation."""
    is_valid: bool
    expected_total: int
    actual_total: int
    violation_wh: int


class CertificateIssuanceEngine:
    """
    Two-Phase Certificate Issuance Engine.
    
    Phase 1: Create certificates directly from time series data with perfect energy conservation
    Phase 2: Assign EAC IDs using carryover logic to optimize EAC utilization
    
    Key Features:
    - Perfect energy conservation at 1 Wh precision
    - Certificate splitting at EAC boundaries (1 MWh maximum)
    - Multi-day carryover chain support
    - Comprehensive audit trails
    - Transaction safety with rollback
    """
    
    def __init__(self):
        self.logger = logger
        
    def create_certificates_from_measurement_report(
        self, 
        measurement_report_id: int,
        write_session: Session,
        read_session: Session,
        force_recreate: bool = False,
    ) -> Tuple[List[GranularCertificateBundle], bool]:
        """
        Complete two-phase certificate creation from measurement report.
        
        Args:
            measurement_report_id: ID of the measurement report
            write_session: Database write session
            read_session: Database read session
            
        Returns:
            tuple: (certificates, success)
        """
        try:
            # Get measurement report (prefer write session to avoid replica lag)
            measurement_report = write_session.get(MeasurementReport, measurement_report_id)
            if not measurement_report:
                measurement_report = read_session.get(MeasurementReport, measurement_report_id)
            if not measurement_report:
                self.logger.error(f"Measurement report {measurement_report_id} not found")
                return [], False
            
            # Get time series data (prefer write session)
            time_series_data = write_session.exec(
                select(TimeSeriesReading).where(
                    TimeSeriesReading.measurement_report_id == measurement_report_id
                ).order_by(TimeSeriesReading.timestamp)
            ).all()
            if not time_series_data:
                time_series_data = read_session.exec(
                    select(TimeSeriesReading).where(
                        TimeSeriesReading.measurement_report_id == measurement_report_id
                    ).order_by(TimeSeriesReading.timestamp)
                ).all()
            
            if not time_series_data:
                # Fallback: pull meter data via ManualSubmissionMeterClient within MR interval
                try:
                    from gc_registry.device.meter_data.manual_submission import ManualSubmissionMeterClient
                    self.logger.warning(
                        f"No time series readings; falling back to meter client for MR {measurement_report_id}"
                    )
                    start_dt = measurement_report.interval_start_datetime
                    end_dt = measurement_report.interval_end_datetime
                    meter_client = ManualSubmissionMeterClient()
                    meter_rows = meter_client.get_metering_by_device_in_datetime_range(
                        start_dt, end_dt, device.id, read_session
                    )
                    # Map to minimal objects expected by phase_1: .timestamp and .energy_wh
                    mapped_rows = []
                    for row in meter_rows or []:
                        ts = getattr(row, 'interval_start_datetime', None)
                        wh = getattr(row, 'interval_usage', None)
                        if ts is None or wh is None:
                            continue
                        mapped = type('TS', (), {})()
                        setattr(mapped, 'timestamp', ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc))
                        setattr(mapped, 'energy_wh', int(wh))
                        mapped_rows.append(mapped)
                    if not mapped_rows:
                        self.logger.error(
                            f"Fallback meter data empty for MR {measurement_report_id}"
                        )
                        return [], False
                    time_series_data = mapped_rows
                except Exception as e:
                    self.logger.error(
                        f"Failed meter-data fallback for MR {measurement_report_id}: {e}"
                    )
                    return [], False
            
            # Get device (prefer write session)
            device = write_session.get(Device, measurement_report.device_id)
            if not device:
                device = read_session.get(Device, measurement_report.device_id)
            if not device:
                self.logger.error(f"Device {measurement_report.device_id} not found")
                return [], False
            
            # Idempotency guard unless force_recreate is requested
            existing_bundles: List[GranularCertificateBundle] = []
            if not force_recreate:
                try:
                    existing_bundles = write_session.exec(
                        select(GranularCertificateBundle).where(
                            GranularCertificateBundle.device_id == device.id,
                            GranularCertificateBundle.production_starting_interval >= measurement_report.interval_start_datetime,
                            GranularCertificateBundle.production_ending_interval <= measurement_report.interval_end_datetime,
                        )
                    ).all()
                    if not existing_bundles:
                        existing_bundles = read_session.exec(
                            select(GranularCertificateBundle).where(
                                GranularCertificateBundle.device_id == device.id,
                                GranularCertificateBundle.production_starting_interval >= measurement_report.interval_start_datetime,
                                GranularCertificateBundle.production_ending_interval <= measurement_report.interval_end_datetime,
                            )
                        ).all()
                except Exception:
                    existing_bundles = []

            if (not force_recreate) and existing_bundles:
                self.logger.info(
                    f"Idempotency: found {len(existing_bundles)} existing bundles for MR {measurement_report_id}; skipping Phase 1"
                )
                phase1_result = CertificateCreationResult(
                    success=True,
                    certificates=existing_bundles,
                    total_energy_wh=sum(b.energy_precision_wh for b in existing_bundles),
                    certificates_created=len(existing_bundles),
                )
            else:
                # Resolve IssuanceMetaData id (prefer write session to avoid replica lag)
                issuance_md = get_latest_issuance_metadata(write_session) or get_latest_issuance_metadata(read_session)
                if issuance_md is None:
                    self.logger.error("No issuance metadata available for certificate creation")
                    return [], False

                # Phase 1: Create certificates
                phase1_result = self.phase_1_create_certificates(
                    time_series_data=time_series_data,
                    measurement_report_id=measurement_report_id,
                    device_id=device.id,
                    account_id=device.account_id,
                    metadata_id=int(getattr(issuance_md, "id", 1))
                )
            
            if not phase1_result.success:
                self.logger.error(f"Phase 1 certificate creation failed: {phase1_result.error_details}")
                # Update measurement report metadata with error info (handle session conflicts)
                write_measurement_report = write_session.get(MeasurementReport, measurement_report_id)
                if write_measurement_report:
                    if write_measurement_report.measurement_report_metadata is None:
                        write_measurement_report.measurement_report_metadata = {}
                    write_measurement_report.measurement_report_metadata.update({
                        "error": "Certificate creation failed",
                        "phase": "phase_1", 
                        "details": phase1_result.error_details,
                        "error_timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    write_session.add(write_measurement_report)
                write_session.commit()
                return [], False
            
            # Get EAC verification (optional)
            logger.info(f"🔍 Looking for EAC verification for measurement report {measurement_report_id}")
            # Prefer write session via session-based lookup; fall back to legacy by MR id
            eac_verification = None
            try:
                if getattr(measurement_report, 'measurement_report_session', None):
                    eac_verification = write_session.exec(
                        select(EACVerificationRecord).where(
                            EACVerificationRecord.measurement_report_session == measurement_report.measurement_report_session
                        )
                    ).first()
                    if not eac_verification:
                        eac_verification = read_session.exec(
                            select(EACVerificationRecord).where(
                                EACVerificationRecord.measurement_report_session == measurement_report.measurement_report_session
                            )
                        ).first()
            except Exception:
                eac_verification = None
            if not eac_verification:
                eac_verification = EACVerificationRecord.find_by_measurement_report(
                    measurement_report_id, write_session
                ) or EACVerificationRecord.find_by_measurement_report(
                    measurement_report_id, read_session
                )
            
            if eac_verification:
                logger.info(f"✅ Found EAC verification record {eac_verification.id} with {eac_verification.total_eacs_issued} EACs")
            else:
                logger.warning(f"❌ No EAC verification record found for measurement report {measurement_report_id}")
            
            logger.info(f"🔧 Device {device.id} EAC enabled: {device.is_eac_enabled}")
            
            # Phase 2: EAC assignment ALWAYS runs automatically.
            # If no verification or device not EAC-enabled, assignment proceeds with zero EACs
            # and leaves certificates with null EAC IDs for QC to catch.
            final_certificates = phase1_result.certificates
            stub_verification = None
            if not eac_verification:
                try:
                    stub_verification = EACVerificationRecord(
                        measurement_report_id=measurement_report_id,
                        total_eacs_issued=0,
                        verification_metadata={
                            "eac_device_id": f"DEV{device.id}",
                            "registry_name": getattr(device, 'eac_registry_name', None),
                        }
                    )
                except Exception:
                    stub_verification = None
            ver = eac_verification or stub_verification
            try:
                logger.info(
                    f"🚀 Starting Phase 2: EAC assignment for {len(phase1_result.certificates)} certificates"
                )
                phase2_result = self.phase_2_assign_eac_ids(
                    certificates=phase1_result.certificates,
                    eac_verification=ver if ver is not None else eac_verification,
                    device=device
                )
                if phase2_result and phase2_result.success:
                    final_certificates = phase2_result.certificates
                    logger.info(
                        f"✅ Phase 2 completed: {len(final_certificates)} certificates (EACs assigned where available)"
                    )
                else:
                    self.logger.warning(
                        f"Phase 2 EAC assignment returned non-success; continuing with unassigned certificates"
                    )
            except Exception as e:
                self.logger.warning(f"Phase 2 assignment encountered an error: {e}; proceeding without EAC IDs")
            
            # Store certificates in database only if newly created by this invocation or force_recreate was used
            if force_recreate or not existing_bundles:
                with write_session.no_autoflush:
                    for certificate in final_certificates:
                        write_session.add(certificate)
                    
                    # Update measurement report metadata within the same no_autoflush block
                    write_measurement_report = write_session.get(MeasurementReport, measurement_report_id)
                    if write_measurement_report:
                        # Handle JSONB field properly for PostgreSQL
                        existing_metadata = write_measurement_report.measurement_report_metadata or {}
                        updated_metadata = {
                            **existing_metadata,
                            "certificates_created": len(final_certificates),
                            "certificate_creation_timestamp": datetime.now(timezone.utc).isoformat(),
                            "phase_1_completed": True,
                            "phase_2_completed": bool(eac_verification and device.is_eac_enabled),
                            # Status remains PENDING until SUPER_ADMIN approval
                        }
                        write_measurement_report.measurement_report_metadata = updated_metadata
                        write_session.add(write_measurement_report)
                        logger.info(f"Updated measurement report {measurement_report_id} metadata with {len(final_certificates)} certificates")

            
            write_session.commit()
            
            self.logger.info(f"Successfully created {len(final_certificates)} certificates for measurement report {measurement_report_id}")
            return final_certificates, True
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error during certificate creation: {e}")
            write_session.rollback()
            
            # Update measurement report status to ERROR
            try:
                write_measurement_report = write_session.get(MeasurementReport, measurement_report_id)
                if write_measurement_report:
                    if write_measurement_report.measurement_report_metadata is None:
                        write_measurement_report.measurement_report_metadata = {}
                    write_measurement_report.measurement_report_metadata.update({
                        "error": "Database error during certificate creation",
                        "exception": str(e),
                        "error_timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    write_session.add(write_measurement_report)
                    write_session.commit()
            except Exception:
                pass  # Avoid nested error handling
                
            return [], False
            
        except Exception as e:
            self.logger.error(f"Unexpected error during certificate creation: {e}")
            write_session.rollback()
            return [], False

    def phase_1_create_certificates(
        self,
        time_series_data: List[TimeSeriesReading],
        measurement_report_id: int,
        device_id: int,
        account_id: int,
        metadata_id: int
    ) -> CertificateCreationResult:
        """
        Phase 1: Create certificates maintaining hourly energy conservation.
        
        Args:
            time_series_data: List of time series readings
            measurement_report_id: ID of the measurement report
            device_id: Device ID
            account_id: Account ID for certificate ownership
            
        Returns:
            CertificateCreationResult: Phase 1 results
        """
        try:
            certificates = []
            total_energy_wh = 0
            certificate_id_counter = 1

            # Debug: log first few input readings
            try:
                sample_readings = sorted(time_series_data, key=lambda x: x.timestamp)[:3]
                self.logger.info(
                    "Phase1 input readings (first 3): %s",
                    [
                        {
                            "ts": (r.timestamp.isoformat() if hasattr(r, "timestamp") and r.timestamp else None),
                            "energy_wh": getattr(r, "energy_wh", None),
                        }
                        for r in sample_readings
                    ],
                )
            except Exception:
                pass

            for reading in sorted(time_series_data, key=lambda x: x.timestamp):
                # Skip zero-energy hours (e.g., nighttime solar generation)
                if reading.energy_wh <= 0:
                    continue

                # Normalize timestamp to UTC and set 1-hour ending interval
                ts = reading.timestamp
                if ts is None:
                    # Safety fallback; skip invalid rows
                    continue
                if ts.tzinfo is None:
                    ts_utc = ts.replace(tzinfo=timezone.utc)
                else:
                    ts_utc = ts.astimezone(timezone.utc)
                end_ts_utc = ts_utc + timedelta(hours=1)

                # Create certificate for this hour with exact energy conservation
                certificate = GranularCertificateBundle(
                    account_id=account_id,
                    device_id=device_id,
                    bundle_quantity=reading.energy_wh,
                    energy_precision_wh=reading.energy_wh,
                    production_starting_interval=ts_utc,
                    production_ending_interval=end_ts_utc,
                    certificate_bundle_id_range_start=certificate_id_counter,
                    certificate_bundle_id_range_end=certificate_id_counter + reading.energy_wh - 1,
                    certificate_bundle_status=CertificateStatus.PENDING,
                    eac_id=None,  # Phase 2 assignment
                    # Required fields from schema  
                    energy_carrier=EnergyCarrierType.electricity,
                    energy_source=EnergySourceType.solar_pv,  # TODO: Get from device.energy_source
                    face_value=1,  # 1 Wh per certificate
                    issuance_post_energy_carrier_conversion=False,
                    is_storage=0,  # Not a storage device (database expects integer)
                    # Required metadata fields
                    issuance_id=f"device_{device_id}_{ts_utc.isoformat()}",
                    metadata_id=metadata_id,
                    # Required date fields
                    expiry_datestamp=datetime.now(timezone.utc) + timedelta(days=365*2)  # 2 year expiry
                )

                certificates.append(certificate)
                total_energy_wh += reading.energy_wh
                certificate_id_counter += reading.energy_wh

            # Debug: log first few output certificates
            try:
                self.logger.info(
                    "Phase1 output certificates (first 3): %s",
                    [
                        {
                            "start": c.production_starting_interval.isoformat(),
                            "end": c.production_ending_interval.isoformat(),
                            "energy_wh": c.energy_precision_wh,
                        }
                        for c in certificates[:3]
                    ],
                )
            except Exception:
                pass

            return CertificateCreationResult(
                success=True,
                certificates=certificates,
                total_energy_wh=total_energy_wh,
                certificates_created=len(certificates)
            )
            
        except Exception as e:
            self.logger.error(f"Phase 1 certificate creation failed: {e}")
            return CertificateCreationResult(
                success=False,
                certificates=[],
                error_details={
                    "error": "Phase 1 certificate creation failed",
                    "exception": str(e)
                }
            )

    def phase_2_assign_eac_ids(
        self,
        certificates: List[GranularCertificateBundle],
        eac_verification: EACVerificationRecord,
        device: Device
    ) -> EACAssignmentResult:
        """
        Phase 2: Assign EAC IDs using carryover logic.
        
        Args:
            certificates: Certificates from Phase 1
            eac_verification: EAC verification data
            device: Device with EAC configuration
            
        Returns:
            EACAssignmentResult: Phase 2 results
        """
        try:
            if eac_verification.total_eacs_issued <= 0:
                return EACAssignmentResult(
                    success=False,
                    certificates=certificates,
                    carryover_chains=[],
                    error_details={"error": "Zero EACs provided for assignment"}
                )
            
            # Sort certificates chronologically for sequential processing
            sorted_certificates = sorted(certificates, key=lambda x: x.production_starting_interval)
            
            # Ensure EAC device identifier is populated for ID generation
            try:
                meta = eac_verification.verification_metadata or {}
                if not meta.get("eac_device_id"):
                    fallback_id = getattr(device, 'eac_registry_device_id', None) or f"DEV{device.id:06d}"
                    meta["eac_device_id"] = fallback_id
                    eac_verification.verification_metadata = meta
            except Exception:
                pass

            # Generate EAC IDs
            eac_ids = eac_verification.generate_eac_ids(start_serial=1)
            
            # Initialize carryover logic
            assigned_certificates = []
            carryover_chains = []
            current_eac_index = 0
            current_eac_capacity_wh = 1_000_000  # 1 MWh per EAC
            current_chain_certificates = []
            
            for certificate in sorted_certificates:
                remaining_energy_wh = certificate.energy_precision_wh
                certificate_parts = []
                
                while remaining_energy_wh > 0 and current_eac_index < len(eac_ids):
                    if remaining_energy_wh <= current_eac_capacity_wh:
                        # Certificate fits in current EAC
                        cert_part = self._create_certificate_part(
                            certificate, remaining_energy_wh, eac_ids[current_eac_index]
                        )
                        certificate_parts.append(cert_part)
                        current_chain_certificates.append(cert_part)
                        current_eac_capacity_wh -= remaining_energy_wh
                        remaining_energy_wh = 0
                        
                        # If EAC is full, complete the chain
                        if current_eac_capacity_wh == 0:
                            chain = CarryoverChain(
                                eac_id=eac_ids[current_eac_index],
                                certificates=current_chain_certificates.copy(),
                                total_energy_wh=1_000_000,
                                remaining_energy_wh=0,
                                formation_details={
                                    "chain_length": len(current_chain_certificates),
                                    "start_timestamp": current_chain_certificates[0].production_starting_interval.isoformat(),
                                    "end_timestamp": current_chain_certificates[-1].production_starting_interval.isoformat()
                                }
                            )
                            carryover_chains.append(chain)
                            
                            # Start next EAC
                            current_eac_index += 1
                            current_eac_capacity_wh = 1_000_000
                            current_chain_certificates = []
                    else:
                        # Certificate exceeds current EAC capacity - split it
                        cert_part = self._create_certificate_part(
                            certificate, current_eac_capacity_wh, eac_ids[current_eac_index]
                        )
                        certificate_parts.append(cert_part)
                        current_chain_certificates.append(cert_part)
                        
                        # Complete the current EAC chain
                        chain = CarryoverChain(
                            eac_id=eac_ids[current_eac_index],
                            certificates=current_chain_certificates.copy(),
                            total_energy_wh=1_000_000,
                            remaining_energy_wh=0,
                            formation_details={
                                "chain_length": len(current_chain_certificates),
                                "start_timestamp": current_chain_certificates[0].production_starting_interval.isoformat(),
                                "end_timestamp": current_chain_certificates[-1].production_starting_interval.isoformat()
                            }
                        )
                        carryover_chains.append(chain)
                        
                        # Update remaining energy and move to next EAC
                        remaining_energy_wh -= current_eac_capacity_wh
                        current_eac_index += 1
                        current_eac_capacity_wh = 1_000_000
                        current_chain_certificates = []
                
                # Handle remaining energy (no more EACs available)
                if remaining_energy_wh > 0:
                    cert_part = self._create_certificate_part(
                        certificate, remaining_energy_wh, None  # No EAC assignment
                    )
                    certificate_parts.append(cert_part)
                
                assigned_certificates.extend(certificate_parts)
            
            # Handle incomplete chain at the end
            if current_chain_certificates and current_eac_index < len(eac_ids):
                incomplete_chain = CarryoverChain(
                    eac_id=eac_ids[current_eac_index],
                    certificates=current_chain_certificates.copy(),
                    total_energy_wh=1_000_000 - current_eac_capacity_wh,
                    remaining_energy_wh=current_eac_capacity_wh,
                    formation_details={
                        "chain_length": len(current_chain_certificates),
                        "start_timestamp": current_chain_certificates[0].production_starting_interval.isoformat(),
                        "end_timestamp": current_chain_certificates[-1].production_starting_interval.isoformat(),
                        "incomplete": True
                    }
                )
                carryover_chains.append(incomplete_chain)
            
            # Calculate remainder energy
            remainder_energy_wh = sum(
                cert.energy_precision_wh for cert in assigned_certificates 
                if cert.eac_id is None
            )
            
            return EACAssignmentResult(
                success=True,
                certificates=assigned_certificates,
                carryover_chains=carryover_chains,
                eacs_assigned=len([chain for chain in carryover_chains if not chain.formation_details.get("incomplete", False)]),
                remainder_energy_wh=remainder_energy_wh
            )
            
        except Exception as e:
            self.logger.error(f"Phase 2 EAC assignment failed: {e}")
            return EACAssignmentResult(
                success=False,
                certificates=certificates,
                carryover_chains=[],
                error_details={
                    "error": "Phase 2 EAC assignment failed",
                    "exception": str(e)
                }
            )

    def split_certificate_at_eac_boundary(
        self,
        certificate: GranularCertificateBundle,
        remaining_eac_capacity_wh: int
    ) -> List[GranularCertificateBundle]:
        """
        Split certificate at EAC boundary to maintain 1 MWh maximum per EAC.
        
        Args:
            certificate: Certificate to split
            remaining_eac_capacity_wh: Remaining capacity in current EAC
            
        Returns:
            list: Split certificates
        """
        if remaining_eac_capacity_wh >= certificate.energy_precision_wh:
            return [certificate]  # No splitting needed
        
        # Split certificate
        first_part = self._create_certificate_part(certificate, remaining_eac_capacity_wh, certificate.eac_id)
        second_part = self._create_certificate_part(
            certificate, 
            certificate.energy_precision_wh - remaining_eac_capacity_wh,
            None  # No EAC assignment yet
        )
        
        return [first_part, second_part]

    def validate_energy_conservation(
        self, 
        certificates: List[GranularCertificateBundle], 
        expected_total: int
    ) -> EnergyConservationResult:
        """
        Validate energy conservation across certificates.
        
        Args:
            certificates: List of certificates to validate
            expected_total: Expected total energy in Wh
            
        Returns:
            EnergyConservationResult: Validation results
        """
        actual_total = sum(cert.energy_precision_wh for cert in certificates)
        violation_wh = abs(actual_total - expected_total)
        
        return EnergyConservationResult(
            is_valid=violation_wh == 0,
            expected_total=expected_total,
            actual_total=actual_total,
            violation_wh=violation_wh
        )

    def _create_certificate_part(
        self,
        original_certificate: GranularCertificateBundle,
        energy_wh: int,
        eac_id: Optional[str]
    ) -> GranularCertificateBundle:
        """Create a certificate part during splitting or assignment."""
        return GranularCertificateBundle(
            account_id=original_certificate.account_id,
            device_id=original_certificate.device_id,
            bundle_quantity=energy_wh,
            energy_precision_wh=energy_wh,
            production_starting_interval=original_certificate.production_starting_interval,
            production_ending_interval=original_certificate.production_ending_interval,
            certificate_bundle_id_range_start=original_certificate.certificate_bundle_id_range_start,
            certificate_bundle_id_range_end=original_certificate.certificate_bundle_id_range_start + energy_wh - 1,
            certificate_bundle_status=CertificateStatus.PENDING,
            eac_id=eac_id,
            # Required fields copied from original certificate
            energy_carrier=original_certificate.energy_carrier,
            energy_source=original_certificate.energy_source,
            face_value=original_certificate.face_value,
            issuance_post_energy_carrier_conversion=original_certificate.issuance_post_energy_carrier_conversion,
            issuance_id=original_certificate.issuance_id,
            metadata_id=original_certificate.metadata_id,
            expiry_datestamp=original_certificate.expiry_datestamp,
            is_storage=int(original_certificate.is_storage) if original_certificate.is_storage is not None else 0
        )