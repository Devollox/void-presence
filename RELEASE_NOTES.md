# Author Field & Fallback Fix

## Added

- **Author field persistence** — new configs now store the `author` nickname in Realtime Database alongside `authorTag`, so streams and listings can always show the creator name.
- **Client‑side author name injection** — status and presence uploads now read the author name from local state/localStorage instead of sending an empty string, ensuring the payload carries a valid `authorName`.

## Fixed

- **Server write logic** — the add‑config route no longer drops the `author` field when writing configs; it keeps all payload fields except `kind`, including the author nickname.
- **API fallback lookup** — if the client upload payload arrives without a usable `authorName`, the uploader calls `/v1/authors/{authorId}/configs` to fetch `user.name` and uses it as the author for the new config.
