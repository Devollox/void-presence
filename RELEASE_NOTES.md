# Discord RPC Now Starts After Workers Initialize

## Added

- **Worker-first RPC initialization**: Discord Rich Presence now starts only after SMTC or hardware worker sends its first message, ensuring workers are fully initialized before RPC begins.

## Improvements

- **Deterministic startup order**: RPC no longer starts in parallel with workers — it waits for `nowPlaying` (SMTC) or `hardwareStats` (hardware) message first.
- **Duplicate RPC prevention**: Added `rpcStarted` flag to guarantee RPC initializes exactly once, even if multiple worker messages arrive.
