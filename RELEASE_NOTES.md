# RPC Ready & First Activity Dispatch

## Improvements

- **Accurate ACTIVE State**
  The RPC status is now marked as **ACTIVE** only after the first Rich Presence payload has been successfully sent to Discord, instead of immediately on socket readiness. This makes the status indicator reflect real in‑Discord activity rather than just a connected transport.

## Internal Changes

- **`ready` Handler Adjusted**
  The `localClient.on('ready')` handler now:
  - Reads the current `NowPlaying` snapshot from SMTC.
  - If a track/title or playback status is present, calls `pushActivity(np)` once and only then sets `sendStatus('ACTIVE')`.
  - Updates `lastJsonSignature` based on the initial snapshot so that the polling loop does not immediately re‑send the same payload.
