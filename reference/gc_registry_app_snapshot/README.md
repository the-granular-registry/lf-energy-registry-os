# GC Registry App Snapshot (Reference)

This folder contains a **verbatim snapshot** of selected modules from `the-granular-registry/gc-registry-app` that relate to **GC issuance**.

Purpose:
- Provide LF Energy / external contributors visibility into the full issuance architecture.
- Keep the current `lf-energy-registry-os` Python package minimal and installable.

Notes:
- Code here is **not currently wired** into the RegistryOS FastAPI service.
- Modules may depend on other parts of `gc-registry-app` (DB models, services, etc.).
- Adapters (PJM/Elexon/manual) may require external credentials and/or environment-specific configuration.
