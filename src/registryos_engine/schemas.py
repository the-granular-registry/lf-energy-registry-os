from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class HourlyMeasurement(BaseModel):
    """Single hourly measurement row (minimal)."""

    timestamp: datetime
    # Positive = charge (into storage), Negative = discharge (out of storage)
    energy_mwh: float = Field(..., description="Signed energy for the interval in MWh")


class SCR(BaseModel):
    timestamp: datetime
    energy_mwh: float


class SDR(BaseModel):
    timestamp: datetime
    energy_mwh: float


class IssuanceResult(BaseModel):
    scr: list[SCR]
    sdr: list[SDR]
