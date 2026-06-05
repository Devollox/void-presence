# Update: RPC & SMTC Worker

## Improvements

- **Removed SMTC session cache** — eliminated caching in the Windows SMTC worker to get fresh media position on every poll.
- **Fixed local progress calculation** — position now increases over time even when SMTC returns static values, ensuring accurate playback progress in Discord RPC.
- **Media now overrides hardware** — when music or video is playing, it takes priority and shows in Discord RPC instead of hardware stats.
