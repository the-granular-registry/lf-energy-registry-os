from __future__ import annotations

from .schemas import HourlyMeasurement, SCR, SDR, IssuanceResult


def issue_scr_sdr(measurements: list[HourlyMeasurement]) -> IssuanceResult:
    """Generate SCR/SDR per hour.

    v0 rule:
    - energy_mwh > 0 => SCR (charge)
    - energy_mwh < 0 => SDR (discharge, stored as positive magnitude)
    - energy_mwh == 0 => ignored

    This is intentionally minimal and will be expanded to match EnergyTag v2 methodology.
    """
    scr: list[SCR] = []
    sdr: list[SDR] = []

    for m in measurements:
        if m.energy_mwh > 0:
            scr.append(SCR(timestamp=m.timestamp, energy_mwh=m.energy_mwh))
        elif m.energy_mwh < 0:
            sdr.append(SDR(timestamp=m.timestamp, energy_mwh=abs(m.energy_mwh)))

    return IssuanceResult(scr=scr, sdr=sdr)
