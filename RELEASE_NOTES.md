Changelog Bridge & Structure Cleanup

## Improvements

- **Inline Changelog in Update Overlay**: The existing update overlay now shows a short “What’s new” section, pulling release notes directly from the latest GitHub Release body and rendering them as markdown inside the app.

## Internal Changes

- **Unified Update Payload**: Main, preload and renderer now share a single `UpdateInfo` shape for updates, including `changelogMd` for the inline changelog.
- **Folder Structure Cleanup**: Refined main/renderer module layout for update logic and UI modals to keep all update‑related code in clear, focused files and folders.
