# Timestamp Safety

## Improvements

- **Smoother Live Timestamp Editing**
  Updated the `live-set-timestamp` IPC handler so that switching timestamp modes (`now`, `range`, `persist`) no longer forces a Discord Rich Presence restart. Mode, range, and display settings now apply live without interrupting the active RPC session, making timestamp experimentation feel more responsive in the UI.

## Internal Changes

- **Centralized Timestamp Config Handling**
  All timestamp-related logic (`mode`, `rangeMin`, `rangeMax`, `persistOffsetSec`, `nowMode`, `timeCycles`) now flows through the shared `setTimestampConfig` helper, ensuring consistent validation, rounding, and safety checks across both regular and live update paths.
