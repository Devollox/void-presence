# Atomic Writes & Stability

## Improvements

- Implemented **atomic config writes** for all Electron‑managed JSON files:
  - All config files (`client-config.json`, `settings.json`, `image-cycles.json`, `party-config.json`, `timestamp-config.json`, etc.) are now written via temporary file + `rename` when possible.
  - This improves reliability and reduces the chance of corrupted or half‑written configuration files on Windows and Electron.
  - Atomic write layer includes retry‑based fallback and proper `tmp`‑file cleanup.
- Internal plumbing and error‑handling around `live-set-party`, `live-set-images`, and related IPC handlers now safely recover from `ENOENT` / `EPERM` filesystem errors during config writes.
- Improved readability and consistency of RPC‑related tooltips and advanced options layout across all config panels.
- State field now consistently shows `(optional)` placeholder text:
  - Input rows use `{ placeholder: 'State (optional)', value: entry.state || '' }`.
  - Empty `state` values are represented with a clear, optional‑labelled placeholder instead of leaving misleading empty labels.
- Updated timestamps and cycle‑management helpers to reduce visual flicker and state‑jitter when toggling `now` / `range` / `persist` and `nowMode`.

## Bug Fixes

- Fixed rare `EPERM: operation not permitted` and `ENOENT: no such file or directory` errors when saving:
  - `image-cycles.json`
  - `client-config.json`
  - `party-config.json`
  - by switching to an **atomic write strategy** with retries and tmp‑file cleanup.
- Eliminated accidental disappearance of the `now
