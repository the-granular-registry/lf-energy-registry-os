from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlmodel import Session

from gc_registry.device.models import Device
from gc_registry.certificate.models import GranularCertificateBundle


class AbstractMeterDataClient(ABC):
    NAME = "AbstractMeterDataClient"

    @abstractmethod
    def get_metering_by_device_in_datetime_range(self, *args, **kwargs):
        pass

    @abstractmethod
    def map_metering_to_certificates(self, *args, **kwargs):
        pass
    
    @abstractmethod
    def map_metering_to_certificates_with_eac_constraints(
        self,
        generation_data: List[Any],
        account_id: int,
        device: Device,
        is_storage: bool,
        issuance_metadata_id: int,
        validate_constraints: bool = True,
        advanced_processing: bool = False,
        project_id: Optional[int] = None
    ) -> List[GranularCertificateBundle]:
        """
        Enhanced method enforcing EAC/GC constraints.
        
        Args:
            generation_data: Meter data records
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
        pass
