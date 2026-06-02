# Custom Status Token Validation Fix & Added Browser Mode Toggle

## New Feature

- **Added `statusEnabledBrowser` toggle** - new setting to enable Custom Status in browser mode
- **When enabled, completely skips Discord.exe process check** - Custom Status runs without verifying Discord is running
- **Added `setStatusEnabledBrowser()` IPC method** - new Electron API method for browser mode toggle
- **Added `statusEnabledBrowser` to settings** - stored in localStorage and persisted across restarts

## Improvements

- **Removed Discord token validation check** - token is no longer validated on each cycle, preventing premature worker stoppage
- **Removed `isDiscordTokenValid()` function** - eliminated unnecessary API call that caused "token invalid" errors after ~1 minute
- **Custom status now runs continuously** - loop doesn't stop due to false "logged out" detections
