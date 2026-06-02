# Smart Discord Detection for Custom Status

## New features

- Added smart detection of whether Discord is running and ready for custom status updates. The custom status worker now automatically checks if Discord is actually available and stops updating when Discord is closed or the user has logged out, preventing unnecessary API calls and incorrect status behavior.
- Custom status now shows clear state indicators: `CUSTOM_STATUS_SEARCHING_DISCORD`, `CUSTOM_STATUS_CONNECTING`, `CUSTOM_STATUS_READY`, `CUSTOM_STATUS_DISABLED`, and `CUSTOM_STATUS_ERROR`, so you always know what's happening.
