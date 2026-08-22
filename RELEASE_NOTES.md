# Tray & Presence Control & New Domain

## New

- **Direct presence control from tray** — Restart Presence and Stop Presence actions now execute Discord Rich Presence logic directly in the main process, removing the previous IPC round-trip and ensuring immediate, reliable state changes from the tray menu.

## Improved

- **Simplified restart/stop flow** — tray menu handlers now call `stopDiscordRich()` and `startDiscordRichLogic()` directly, reducing indirection and making the presence lifecycle easier to reason about and debug.
- **Consistent status updates** — stopping presence from the tray now always emits `RPC_DISABLED` status, keeping UI and logs in sync with the actual RPC state.

## Infrastructure

- **New primary domain** — Void Presence has moved to [`voidpresence.com`](https://voidpresence.com).
- **Legacy-domain redirects** — requests to `voidpresence.site`, `www.voidpresence.site`, and `api.voidpresence.site` now permanently redirect to their corresponding `.com` endpoints, preserving existing links and API access.
- **Dedicated API domain** — the API is now available at [`api.voidpresence.com`](https://api.voidpresence.com).
