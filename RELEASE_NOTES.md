# Custom Status: Worker Optimization & Rate Limit Fix & Multi-language support (Test)

> **Version 2.13.13 is UNSTABLE**
> To update, download and reinstall **Void Presence** again from the latest release.

## Improvements

- **Hard stop worker on disable** - when feature is turned off, worker now completely stops instead of running empty cycles with timers
- **Retry buffer +500ms** - added 500ms buffer to `retry_after` to prevent repeated 429 errors due to network ping/timezone differences
- **Session-based race condition protection** - existing sessionId check prevents concurrent worker executions
- **Isolated worker architecture** - custom status runs independently from main RPC loop, protecting presence updates from status errors
- **Multi-language support (i18n)** - UI and logs now support Russian (ru), English (en), and Turkish (tr) languages. Language is stored in `language.json` and can be changed in settings. Translations are loaded via IPC from main process to renderer.
