# LF Energy RegistryOS (WIP)

**Status:** Work in progress (initial public scaffold for LF Energy TAC review)

RegistryOS is an open-source reference implementation of a **registry core engine** for granular energy attribute certificates, focused initially on **EnergyTag-aligned** storage charge/discharge record issuance.

## What’s included in v0 (today)
- A small Python engine for:
  - ingesting hourly measurement CSV
  - generating **SCR/SDR** (storage charge/discharge records) per hour
- A minimal FastAPI service exposing measurement report endpoints (scaffold)
- Example input/output files

## What’s explicitly *not* included
- STARs / NetSTARs / GC merge flows (proprietary; intentionally excluded)
- Billing, payments
- Production-grade auth/SSO (will be pluggable)
- Full UI (only placeholder docs for a future reference UI)

## Quickstart (dev)
```bash
python -m pip install -e '.[dev]'
uvicorn api.main:app --reload
```

## License
Apache-2.0
