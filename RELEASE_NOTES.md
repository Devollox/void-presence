# Custom Status & Guided Tutorials

## Added

- **Custom status**: A separate status has been added that can use a custom Discord token to update the custom status through a separate channel.
- **Status page tutorials**: The status page has built-in step-by-step tutorials with cards that explain how to enable the worker, set up cycles and set the update interval.
- **Quick‑link buttons**: added buttons that immediately open Discord, the author's profile page, and a tutorial video on how to get a token (`tutorial-inline-open-dev`, `get-author-id`, `get-video-id'), via the appropriate IPC channels.

## Improvements

- **Token guidance**: The tutorial has been updated — now it shows how to open DevTools (F12 or Ctrl+Shift+I), go to the Network tab, find the query `science` and copy the header `authorization` as a token.
- **Interval best practices**: added recommendations for status update intervals — use 10-30 seconds and do not set less than 10 seconds if the main RPC activity is already updated every 5 seconds.
- **Safety notice**: a disclaimer has appeared in the interface for custom status worker: use with caution and at your own risk, Discord is officially disliked by third-party clients, we do not store anything on the server and are not responsible for possible consequences, although bans for such a scenario have not yet been observed.
