# Media Settings Fixes

## Fixed

- **IPC video-filter toggle** — fixed a broken renderer-to-main IPC call for toggling the video filter (`settings:set-video-filter`). The renderer now passes the boolean state correctly, and the main-process handler applies the change reliably, so the filter switches as expected.
