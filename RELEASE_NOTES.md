# Structural Architecture Shift & Client Optimization

## Added

- **Relational database restructuring** — migrated the entire database architecture away from redundant data duplication. Presence and status configurations now store only a strict `authorId` foreign key instead of baking mutable author names and avatars directly into configurations.
- **On-the-fly metadata joining** — implemented an efficient server-side batch collection pattern (`uniqueAuthorIds`) in global queries and Server-Sent Events (SSE) streams, fetching and combining real-time profile data dynamically instead of downloading entire raw collection snapshots.

## Improved

- **Zero-overhead client synchronization** — eliminated the complex, recursive multi-path background updates across config trees upon user profile synchronization. Modifying user avatars or Discord tags now updates only a single atomic database leaf in the `users` branch.
- **Linear complexity queries (O(1))** — removed heavy recursive user-to-configuration scanners (`buildConfigToOwnerMap`/`findUserByConfig`) in individual fetch, delete, and streaming endpoints, replacing whole-table memory processing with direct key-based lookups.
- **Serverless SSE stability** — locked down persistent update listeners (`.on('value')`) to look up strictly targeted author resources instead of listening to the global database root, completely preventing cascade server crashes under traffic spikes.

## Fixed

- **Ghost config creation** — fixed an issue where updating user info while handling deleted configurations could accidentally recreate partial ghost config documents in the configurations branch due to Firebase `.update()` properties.
