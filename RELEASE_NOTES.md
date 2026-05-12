# Smart Recent Apps UX & Link Validation & Quick Client Switching

## Added

- Quick “use” button for recent apps that instantly applies the selected Client ID, restarts Discord Rich Presence, and returns you to the main view.

## Improvements

- URL inputs are now auto-trimmed and rejected if they contain spaces, preventing broken Discord buttons and image links from being saved.
- Log message when connecting RPC now clearly includes the Client ID in a consistent format (`Connecting RPC Client ID: <id>`).

## Fixed

- Non-existent or invalid app IDs now show a clear status (`App not found` or `Fetch failed`) and are visually dimmed.
- Recent app rows no longer lose their disabled/“not found” state after removing other items from the list.
