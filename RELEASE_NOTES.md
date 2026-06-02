# Custom Status: Smart Discord Detection, Token Validation & State Reset Fixes

## Bug fixes

- Fixed custom status state not resetting when disabled: now `currentIndex`, `lastSignature`, `hasEverBeenReady`, and `hasLoggedReadyOnce` are properly reset when custom status is disabled, when token is missing, or when token is invalid.
- Fixed custom status continuing to work after Discord logout: the worker now validates the Discord token by calling `/users/@me` and stops gracefully when the token is invalid (401/403), detecting that the user has logged out.

## New features

- Added token validation on each cycle: the worker verifies that your Discord token is still valid before applying custom status, and stops gracefully if you've logged out or the token expired.

## Improvements

- Better logging: clearer messages when Discord is disconnected, token is invalid, or custom status is disabled.
- More reliable behavior: custom status now starts fresh each time it is enabled, with all internal counters reset.
