# Bug fixes: Custom Status & Stability

## Bug fixes

- Fixed an issue where changes to custom status cycles (text or emoji) were not applied until the status update interval was modified. Now edits to the status list are immediately persisted to localStorage and sent to the custom status worker without requiring an interval change.

## Dependencies

- Updated **Electron** to 42.3.0 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
