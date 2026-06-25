# Config & Status Import Improvements, Presence Controls Refactor

## New Features

- **Import both configs and statuses** — added a unified import flow that handles JSON files as both Rich Presence configs and text-based status presets, so users no longer have to split imports across different screens.
- **Unified profile import flow** — imported configs and statuses now land in a single profile panel where they can be viewed, edited, and deleted regardless of type.
- **Consistent JSON format across types** — the JSON structure for configs and statuses has been aligned, simplifying export/import between the desktop app and the web catalog.

## Refactoring

- **Shared presence control helper** — restart and stop logic for Discord Rich Presence has been refactored into a single `setupPresenceControls` helper so one place manages both `Restart` and `Stop` actions.
- **Restart/stop actions wired to Electron API** — button handlers use a unified Electron API layer; `restartDiscordRich` and `stopDiscordRich` are called from `setupPresenceControls()` and update RPC state (`RPC_RESTARTING`, `RPC_DISABLED`) as well as the current presence info.

## Improvements

- **Extended Toast helpers for presence actions** — `setupToasts()` now exposes additional helpers for presence-related events, including restart and stop, so users always get immediate visual feedback after clicking `Restart` or `Stop`.
- **Context-aware RPC state messages** — toast messages are tailored to the current RPC state (restarting, disabled), making it clear what exactly happened to Discord Rich Presence after each action.
