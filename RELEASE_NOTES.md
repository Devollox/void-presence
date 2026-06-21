# Cloud Status Profiles, Author Linking & Protocol Auth

## New

- **Cloud upload for status profiles** — you can now upload your custom status profiles to the cloud separately from main RPC configs.
- **Dedicated `status-configs` cloud branch** — status presets are stored in their own collection, keeping them isolated from activity configs.
- **Deep link from website to app** — added `voidpresence://auth?...` protocol to instantly link your web profile with the desktop app.
- **Author metadata in app UI** — the config screen now shows your linked profile instead of a generic “None” label.

## Improvements

- **Author ID sync from web profile** — clicking “Use this author ID in app” on the website opens the app and fills in the author ID automatically.
- **Name & provider displayed in client** — the app now reads `name` and `provider` from the protocol URL and shows them next to your author ID.
- **Cloud upload UX for statuses** — status profiles use the same confirmation modal pattern as configs, with a dedicated “Upload status profile” dialog.
- **Persistent author metadata** — author ID, name, and provider are stored in local settings and restored on app launch and config screen open.

## Bug Fixes

- **Fixed status upload modal not appearing** — corrected markup, imports, and CSS selectors so the status upload confirmation modal opens reliably.
- **Fixed cloud upload endpoint for statuses** — status uploads now use a separate `/status-configs` path and respect Firebase rules for this branch.
- **Fixed Cyrillic path typo** — replaced accidental Cyrillic characters in the status configs URL to avoid invalid Firebase paths and 401 errors.
- **Fixed type warnings in preload** — added proper TypeScript types for `uploadConfig` and `uploadStatusConfig` parameters to remove implicit `any` diagnostics.

## Stability

- **Safer payload filtering before upload** — only allowed keys (`buttonPairs`, `cycles`, `imageCycles`, `party` for configs; `statusCycles` for statuses) are sent to the cloud.
- **Single‑instance protocol handling** — improved handling of `voidpresence://` URLs when the app is already running, including focus/restore logic and pending URL queue.
