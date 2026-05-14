# Persistent Timestamps

## Improvements

- **Guaranteed offset save on shutdown**: `stopDiscordRich()` now **awaits** `savePersistOffsetIfNeeded()` — config file always updated before exit.
- **Synchronous crash protection**: File write completes before process termination — no more lost offsets on kill/crash.

## Fixed

- **Async race condition**: `updatePersistOffsetIfNeeded()` fire-and-forget → **awaited** in `stopDiscordRich()` — Promise always resolves before shutdown.
- **Lost writes on crash**: Background `setTimestampConfig()` Promise hangs → **Emergency save** on stop with await guarantee.
