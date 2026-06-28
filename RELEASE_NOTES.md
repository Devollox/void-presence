# New Installer & Update Flow

> IMPORTANT: THIS RELEASE INTRODUCES A NEW VOID PRESENCE INSTALLER.
> LEGACY UPDATES WILL CONTINUE TO WORK FOR 1 WEEK FROM THE RELEASE DATE.
> AFTER THAT, ONLY THE NEW INSTALLER‑BASED UPDATE FLOW WILL BE SUPPORTED.
> IF AUTO‑UPDATE DOES NOT WORK, YOU SEE ERRORS, OR VOID PRESENCE DOES NOT START AFTER UPDATE,
> YOU MUST OPEN THE RELEASE PAGE AND UPDATE MANUALLY USING THE INSTALLER FROM THIS RELEASE.

## New Installer

- **Installer stored in app folder** — the update flow now downloads `Void.Presence.Setup.<version>.exe` directly into the app directory instead of a temporary location, so the installer always runs next to the current executable.
- **Single installer per release** — the `void-updates` → `void-presence` pipeline ensures that each release exposes one up‑to‑date installer asset that the client can safely use for upgrades.

## Manual Update Notice

- **Manual update required on update failure** — if auto‑update does not complete, the installer reports corruption, or Void Presence fails to start after updating, you need to perform a manual update using this release’s installer.
- **Direct installer download from Releases** — open the Releases page, download the latest `Void.Presence.Setup.<version>.exe` from Assets, and run it manually to migrate your installation to the new installer flow.

## Compatibility with Older Versions

- **Older clients may not support the new flow** — previous versions of Void Presence use the legacy updater and may not correctly handle the new installer behavior.
- **One‑time manual upgrade path** — if auto‑update fails on an older version, perform a single manual update with this release’s installer; future updates will then use the new installer‑based flow correctly.
