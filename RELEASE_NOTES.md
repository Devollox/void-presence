# Author Field & Fallback Fix

## Added

- **Author field persistence** — new configs now store the `author` nickname in Realtime Database alongside `authorTag`, so streams and listings can always show the creator name.
- **Client‑side author name injection** — status and presence uploads now read the author name from local state/localStorage instead of sending an empty string, ensuring the payload carries a valid `authorName`.
- **Author avatar storage** — configs now save an `authorAvatar` URL resolved from the author profile, so the site and stream UI can display the creator’s avatar without extra lookups.

## Fixed

- **Server write logic** — the add‑config route no longer drops the `author` field when writing configs; it keeps all payload fields except `kind`, including the author nickname.
- **API fallback lookup** — if the client upload payload arrives without a usable `authorName`, the uploader calls `/v1/authors/{authorId}/configs` to fetch `user.name` and `user.avatar`, and uses them as `author` and `authorAvatar` for the new config.
