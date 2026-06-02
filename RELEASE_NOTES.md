# Custom Status Rate Limit Fix

## Improvements

- Added comprehensive JSDoc documentation to all functions and file header
- Added Discord User-Agent header to API requests for better spoofing:
  - `User-Agent`: discord/1.0.9006 Chrome/108.0.5359.215 Electron/22.3.26
  - `Accept`: `*/*`
  - `Accept-Language`: `ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7`
- Improved rate limit handling with proper retry_after respect
- Maintains signature-based change detection (skips if status unchanged)
- Token validation on each cycle (stops if logged out)
- Smart Discord process detection (checks Discord.exe before starting)

**Rate Limits**:

- Minimum interval: 5 seconds (5000ms)
- Recommended interval: 60-90 seconds for smooth animation
- On 429: waits `retry_after` seconds before next attempt
- Global rate limit bucket: ~60 seconds for `/users/@me/settings`
