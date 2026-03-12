import datetime
from typing import Any, List, Optional

import pandas as pd
from sqlmodel import Session, select

from gc_registry.core.models.base import (
    CertificateStatus,
    EnergyCarrierType,
)
from gc_registry.device.meter_data.abstract_meter_client import AbstractMeterDataClient
from gc_registry.device.models import Device
from gc_registry.logging_config import logger
from gc_registry.measurement.models import MeasurementReport
from gc_registry.settings import settings
from gc_registry.certificate.models import GranularCertificateBundle
from gc_registry.certificate.eac_gc_integration import EACGCIntegrationWrapper


class ManualSubmissionMeterClient(AbstractMeterDataClient):
    def __init__(self):
        self.NAME = "ManualSubmissionMeterClient"

    def get_metering_by_device_in_datetime_range(
        self,
        start_datetime: datetime.datetime,
        end_datetime: datetime.datetime,
        device_id: int,
        read_session: Session,
    ) -> list[MeasurementReport] | None:
        """Retrieve meter records from the database for a specific device in a specific time range.

        Will raise an error if no records are found for the specified device and time range.

        Args:

            device_id (int): The ID of the device for which to retrieve meter records.
            start_datetime (datetime.datetime): The start of the time range for which to retrieve meter records.
            end_datetime (datetime.datetime): The end of the time range for which to retrieve meter records.

        Returns:

                dict: A dictionary containing the meter records.
        """

        # Use raw datetimes for SQL filtering to avoid tz-mismatch issues
        stmt = select(MeasurementReport).filter(
            MeasurementReport.device_id == device_id,
            MeasurementReport.interval_start_datetime >= start_datetime,
            MeasurementReport.interval_end_datetime <= end_datetime,
        )

        meter_records = read_session.exec(stmt).all()  # type: ignore

        if not meter_records:
            logger.error(
                f"No meter records found for device {device_id} in the specified time range."
            )
            return None

        return meter_records

    def map_metering_to_certificates(
        self,
        generation_data: list[MeasurementReport],
        account_id: int,
        device: Device,
        is_storage: bool,
        issuance_metadata_id: int,
        certificate_bundle_id_range_start: int = 0,
    ) -> list[dict[str, Any]]:
        """Map meter records to certificate bundles.

        Args:
            generation_data (list[MeasurementReport]): A list of meter records taken from the database.
            account_id (int): The ID of the account to which the certificate bundles will be issued.
            device (Device): The device for which the meter records were taken.
            is_storage (bool): Whether the device is a storage device.
            issuance_metadata_id (int): The ID of the issuance metadata associated with these records.
            certificate_bundle_id_range_start (int): The starting ID of the bundle range, if not zero.

        Returns:
            list[dict[str, Any]]: A list of dictionaries containing the certificate bundle data.
        """

        mapped_data: list = []

        for data in generation_data:
            # Get existing "certificate_bundle_id_range_end" from the last item in mapped_data
            if mapped_data:
                certificate_bundle_id_range_start = (
                    mapped_data[-1]["certificate_bundle_id_range_end"] + 1
                )

            # E.g., if bundle_wh = 1000, certificate_bundle_id_range_start = 0, certificate_bundle_id_range_end = 999
            # TODO this breaks for a bundle of 1 Wh as certificate_bundle_id_range_end = certificate_bundle_id_range_start
            certificate_bundle_id_range_end = (
                certificate_bundle_id_range_start + data.interval_usage - 1
            )

            transformed = {
                "account_id": account_id,
                "certificate_bundle_status": CertificateStatus.ACTIVE,
                "certificate_bundle_id_range_start": certificate_bundle_id_range_start,
                "certificate_bundle_id_range_end": certificate_bundle_id_range_end,
                "bundle_quantity": certificate_bundle_id_range_end
                - certificate_bundle_id_range_start
                + 1,
                "energy_carrier": EnergyCarrierType.electricity,
                "energy_source": device.energy_source,
                "face_value": 1,
                "issuance_post_energy_carrier_conversion": False,
                "device_id": device.id,
                "production_starting_interval": data.interval_start_datetime,
                "production_ending_interval": data.interval_end_datetime,
                "issuance_datestamp": datetime.datetime.now(
                    tz=datetime.timezone.utc
                ).date(),
                "expiry_datestamp": (
                    datetime.datetime.now(tz=datetime.timezone.utc)
                    + datetime.timedelta(days=365 * settings.CERTIFICATE_EXPIRY_YEARS)
                ).date(),
                "metadata_id": issuance_metadata_id,
                "is_storage": is_storage,
                "hash": "Some hash",
            }

            transformed["issuance_id"] = (
                f"{device.id}-{transformed['production_starting_interval']}"
            )

            mapped_data.append(transformed)

        return mapped_data
    
    def map_metering_to_certificates_with_eac_constraints(
        self,
        generation_data: List[MeasurementReport],
        account_id: int,
        device: Device,
        is_storage: bool,
        issuance_metadata_id: int,
        validate_constraints: bool = True,
        advanced_processing: bool = False,
        project_id: Optional[int] = None
    ) -> List[GranularCertificateBundle]:
        """
        Enhanced certificate mapping with EAC/GC constraints.
        
        CONSTRAINTS ENFORCED:
        1. EAC energy limit (≤ 1 MWh per EAC ID)
        2. Hourly energy conservation (meter data = certificate energy)
        3. Meter data validation against EAC capacity
        4. EAC ID sharing rules
        
        Args:
            generation_data: Meter measurement records
            account_id: Account ID for certificate ownership
            device: Device model instance
            is_storage: Whether device is storage type
            issuance_metadata_id: Metadata ID for tracking
            validate_constraints: Enable constraint validation
            advanced_processing: Use advanced EAC/GC algorithms
            project_id: Project ID for structured GC ID generation
            
        Returns:
            List of GranularCertificateBundle objects with EAC compliance
        """
        if not generation_data:
            logger.warning(f"No generation data provided for device {device.id}")
            return []
        
        try:
            # Convert MeasurementReport to meter data format
            meter_data = []
            for report in generation_data:
                meter_data.append({
                    'production_starting_interval': report.interval_start_datetime,
                    'production_ending_interval': report.interval_end_datetime,
                    'energy_wh': report.interval_usage,  # Assuming interval_usage is in Wh
                    'local_time': report.interval_start_datetime
                })
            
            # Use EAC/GC integration wrapper for constraint-compliant processing
            certificates = EACGCIntegrationWrapper.issue_certificates_by_device_with_eac_constraints(
                device=device,
                from_datetime=generation_data[0].interval_start_datetime,
                to_datetime=generation_data[-1].interval_end_datetime,
                write_session=None,  # Will be handled by caller
                read_session=None,   # Will be handled by caller
                account_id=account_id,
                issuance_metadata_id=issuance_metadata_id,
                meter_data=meter_data,
                advanced=advanced_processing,
                project_id=project_id or device.id
            )
            
            logger.info(
                f"Created {len(certificates)} constraint-compliant certificates for device {device.id} "
                f"using {'advanced' if advanced_processing else 'basic'} processing"
            )
            
            return certificates
            
        except Exception as e:
            logger.error(f"EAC constraint certificate mapping failed for device {device.id}: {e}")
            if validate_constraints:
                raise
            else:
                # Fallback to legacy mapping
                logger.warning(f"Falling back to legacy certificate mapping for device {device.id}")
                legacy_data = self.map_metering_to_certificates(
                    generation_data, account_id, device, is_storage, issuance_metadata_id
                )
                
                # Convert legacy format to GranularCertificateBundle objects
                certificates = []
                for data in legacy_data:
                    cert = GranularCertificateBundle(**data)
                    certificates.append(cert)
                
                return certificates
