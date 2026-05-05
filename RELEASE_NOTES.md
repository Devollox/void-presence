# Stability Client ID

## Improvements

- **Strict Client ID validation**: Now requires exactly 19 digits (`length > 18`) before saving to `client-config.json`.

## Bug Fixes

- Fixed `clientId: null` after restart — empty strings from inputs no longer overwrite valid IDs.
- Cleaner state sync between localStorage, UI inputs, and main process config.
