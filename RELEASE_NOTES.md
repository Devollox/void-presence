# Custom Status: UI Fix & Retry Fix

## Improvements

- **Added double retry on send failure** - custom status now retries one more time before showing an error
- **Improved error logging** - repeated apply failures are now consolidated into a single log entry
- **Refined status display** - status labels and idle states are now shown more clearly in the UI

## Fixed

**Fix:** The app now attempts a second send before logging the failure, and status updates were cleaned up to match the new flow

## Dependencies

- Updated **Electron** to 42.3.3 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
