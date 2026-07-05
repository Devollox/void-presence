# Backend Image Color Extraction & Stability

## Added

- **Server-side average color calculation** — moved image color analysis from the desktop client to backend Cloud Functions, which now use `sharp` in the config creation API to compute average colors from `imageCycles` URLs during upload.

## Improved

- **Lighter desktop client uploads** — the client now only sends config data and author info; the backend automatically enriches presence configs with `averageColors`, reducing client bundle size and moving all heavy image processing into Cloud Functions.

## Dependencies

- **Removed sharp from the client app** — dropped the `sharp` dependency from the desktop application, keeping it only in backend Cloud Functions for image processing, which improves client startup time and install size.
