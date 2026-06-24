# Config Profile Export Scope Fix & Stability

## Bug Fixes

- **Export current config instead of all profiles** — the global config export button now serializes only the currently active config data, rather than the entire `vpConfigs` array from local storage.
- **Prevent multi-profile exports for single-config actions** — exporting a config no longer produces a JSON file containing every saved profile; a file now represents exactly one config for import.
- **Align global export with per-card behavior** — the page-level export now mirrors the intended “export current config” semantics, while per-profile card exports continue to work on their specific saved profile state.

## Stability

- **Isolated config export payloads** — each export file now contains data for a single working config, reducing the risk of overwriting multiple profiles when importing.
- **Improved import predictability** — the new export format is tailored for single-profile import, so importing an exported config no longer replaces or conflicts with unrelated profiles.
- **Consistent export scope with user intent** — global config export behaviour now matches what users expect when exporting “this” config, instead of silently including the whole stored array.

## Dependencies

- Updated **Electron** to 42.5.0 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
