# Update RPC

## Improvements

- **Improved SMTC playback tracking** — media progress now stays accurate even when the worker reports a static position.
- **Media now takes priority** — when music or video is playing, Discord RPC shows media activity before hardware stats.
- **Safer cover lookup** — `resolveCoverUrlFromITunes` now handles failures more cleanly and avoids unnecessary extra work.
- **Cleaner RPC lifecycle** — stale `clearActivity()` behavior was removed from places where it could wipe active presence too aggressively.
- **More stable refresh flow** — timestamp and presence updates now follow the latest playback state more reliably.
