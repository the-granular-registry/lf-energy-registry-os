# LF Energy RegistryOS (WIP)

**Status:** Work in progress (public reference implementation for LF Energy TAC review)

RegistryOS is an open-source reference implementation of a **registry core engine** for granular energy attribute certificates.

## What’s included
### ✅ Included and functional (in this repo today)
- A small Python engine for:
  - ingesting hourly measurement CSV
  - generating **SCR/SDR** (storage charge/discharge records) per hour
- A minimal FastAPI service exposing a measurement report endpoint (scaffold)
- Example input/output files

### ✅ Included (code present)
- **Frontend UI:** the full Registry UI codebase is included under `./frontend/` (as-is from `gc-registry-app`).
- **GC issuance engine + ingestion adapters:** reference snapshot under `./reference/gc_registry_app_snapshot/` including:
  - two-phase certificate issuance engine
  - ingestion adapters (PJM, Elexon, manual submission)

### ⚠️ Included but not wired up yet
- The frontend UI is not currently wired to the RegistryOS API scaffold in this repository.
- The GC issuance engine and adapters are included for architectural transparency, but are not currently invoked by the RegistryOS API.
- Adapters may require external credentials / environment configuration to run (see adapter modules for details).

### ❌ Excluded (not included in this repo)
- STARs / NetSTARs / GC merge flows
- Billing, payments
- Production-grade auth/SSO

## Quickstart (dev)
```bash
python -m pip install -e '.[dev]'
uvicorn api.main:app --reload
```

## License
Apache-2.0
