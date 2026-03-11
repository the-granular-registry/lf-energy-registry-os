from datetime import datetime, timezone

from registryos_engine.schemas import HourlyMeasurement
from registryos_engine.issuance import issue_scr_sdr


def test_issue_scr_sdr_split():
    ms = [
        HourlyMeasurement(timestamp=datetime(2025, 1, 1, 0, tzinfo=timezone.utc), energy_mwh=1.0),
        HourlyMeasurement(timestamp=datetime(2025, 1, 1, 1, tzinfo=timezone.utc), energy_mwh=-2.0),
        HourlyMeasurement(timestamp=datetime(2025, 1, 1, 2, tzinfo=timezone.utc), energy_mwh=0.0),
    ]
    r = issue_scr_sdr(ms)
    assert len(r.scr) == 1
    assert len(r.sdr) == 1
    assert r.sdr[0].energy_mwh == 2.0
