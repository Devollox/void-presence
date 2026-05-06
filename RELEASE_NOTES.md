# Persist Mode Fixes

## Bug Fixes

- Fixed `persist` timestamp offset reset on app restart after a power loss — `persistOffsetSec` is now preserved in the config and no longer gets overwritten by renderer state.
