# Fetch App Names & Stability

## Improvements

- **Auto-fetch Discord app names** in recent apps list:
  - Fetches real app name/icon from public Discord `/applications/{ID}/rpc` endpoint
  - One-time request per ID, caches in storage permanently
  - Users can override fetched name manually (input editable)
  - No tokens/secrets needed — fully public API

## Bug Fixes

- **Removed `overflow: hidden`** from config panels — long data lists (cycles, buttons, recent apps) now properly scroll instead of clipping content
- Fixed layout shift/jitter when recent apps list grows beyond viewport height
