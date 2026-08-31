# API v3 & Updates Download

## New

- **GitHub Releases API v3** — a new `/v3/github/releases` endpoint now serves release info with platform-aware asset selection (`windows`, `macos`, `linux`) and distinct handling for the auto-updater.

## Improved

- **Microservice-based releases** — the updater now fetches release data from the dedicated `void-updates` microservice repository instead of the main `void-presence` app repo, ensuring the correct installer assets and download URLs are always used for each platform.
- **Consistent asset naming** — the embedded updater now expects and downloads files named `Void.Presence.Updates.{version}.exe/.dmg/.deb` on all platforms, matching the assets published in the `void-updates` repository.

## Fixed

- **Auto-update file naming** — corrected the updater's expected file names from `Void.Presence.Setup.*` / `Void.Presence.*` to `Void.Presence.Updates.*` on Windows, macOS, and Linux, which likely resolves broken auto-updates across all platforms.

## Infrastructure

- **Decoupled release flow** — release metadata for the auto-updater is now fully separated from the main application, allowing independent versioning and deployment of the updater microservice.
