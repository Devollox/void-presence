# RPC Payload Priority & Bar Style

## Improvements

- **Explicit media/hardware priority**: Introduced `PresencePayload` with `priority` and split state into `activePayload` (media) and `fallbackPayload` (hardware) — the visible payload is now always `active ?? fallback`, без смешивания.
- **Cleaner timestamp handling**: Unified timestamp calculation for media, range, persist, and cycle modes so Rich Presence always receives a consistent and sane `start/end` pair.
- **Adaptive bar style visibility**: The bar style row now reacts to RPC-related toggles (filters, hardware monitor, automatic activity) and only appears when one of these features is actually enabled.

## Fixed

- **Media/hardware merge bug**: Fixed a conflict where media updates could be partially merged with hardware data, causing mixed `details/state` in Discord; media presence now fully overrides hardware while playback is active.
- **TypeScript excess property error**: Resolved `PresencePayload` typing by adding the `priority` field to the shared type, so internal priority logic no longer triggers “object literal may only specify known properties” during build.
- **Bar style UI desync**: Fixed cases where the bar style section stayed visible or hidden incorrectly by wiring all relevant toggles through `localStorage` and `refreshBarStyleVisibility()`.
