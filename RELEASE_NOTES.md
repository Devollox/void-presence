# Worker Session Hold Fix

## Improvements

- **Added last valid session retention** — the worker now keeps the previous valid SMTC session when the current one is temporarily unavailable.
- **Reduced status dropouts** — short media-session gaps no longer clear the now playing state immediately.
- **Improved playback stability** — cached session data is reused briefly to prevent flickering or missing activity during long playback.
