# Automatic Profile Linking & Stability

## Features

- **Automatic profile linking via deep link**
  - Added a dynamic "Use this author in Void Presence" button on the website.
  - Clicking automatically opens Void Presence with `voidpresence://auth?authorId=...`.
  - On app startup:
    - `authorId` is saved into `localStorage` and the `config-author-input` field;
    - the **"Config"** view is opened automatically;
    - no manual `authorId` copy‑paste is required — the profile is pre‑connected.

## Improvements

- Reordered some UI blocks for better flow and readability.
- Added automatic redirection to the **Logs** and **Configs** pages in predefined situations (e.g. after profile linking or certain setup actions), so the user lands on the most relevant screen without manual navigation.

## Dependencies

- Updated **Electron** to 41.3.0 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
