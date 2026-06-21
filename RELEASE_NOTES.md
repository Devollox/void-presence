# Config Profiles: Immutable Load Fix

## Bug Fixes

- **Fixed config profiles mutating after load** — applying a saved config now uses a cloned state (`deepCloneState`) instead of a direct reference from `vpConfigs`, so changes in the UI no longer corrupt the original profile.
- **Fixed cycles and fields drifting from saved state** — after applying a config, cycles, timestamps and related fields are no longer written back into the stored profile, so the configs list always reflects exactly what was originally saved.
- **Fixed inconsistent base state restore** — the base state when loading a config is now built via `buildBaseStateFromConfig`, ensuring correct `clientId`, intervals, time modes and activity type even for partial configs.

## Stability

- **Aligned config behavior with status profiles** — config logic is now aligned with status profiles: data is always cloned before being mapped into the working `FullState`.
- **Safer state application pipeline** — rendering and applying configs now always start from a clean clone of the stored state, reducing side effects from drag‑and‑drop and live updates in the main context.
