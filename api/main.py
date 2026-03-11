from __future__ import annotations

from fastapi import FastAPI, UploadFile, File, HTTPException

from registryos_engine.csv_ingest import parse_hourly_csv
from registryos_engine.issuance import issue_scr_sdr

app = FastAPI(title="LF Energy RegistryOS (WIP)")


@app.get("/live")
def live():
    return {"status": "ok"}


@app.post("/v1/measurement-reports")
async def create_measurement_report(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="missing file")
    raw = (await file.read()).decode("utf-8")
    measurements = parse_hourly_csv(raw)
    result = issue_scr_sdr(measurements)
    return result.model_dump()
