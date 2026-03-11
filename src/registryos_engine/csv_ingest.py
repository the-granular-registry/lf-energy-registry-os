from __future__ import annotations

import csv
from io import StringIO
from typing import Iterable

from .schemas import HourlyMeasurement


def parse_hourly_csv(csv_text: str) -> list[HourlyMeasurement]:
    """Parse a minimal hourly CSV.

    Expected headers (v0):
    - timestamp (ISO8601)
    - energy_mwh (signed float)
    """
    f = StringIO(csv_text)
    reader = csv.DictReader(f)
    rows: list[HourlyMeasurement] = []
    for r in reader:
        rows.append(
            HourlyMeasurement(
                timestamp=r["timestamp"],
                energy_mwh=float(r["energy_mwh"]),
            )
        )
    return rows
