# New REST API Backend Endpoint

## Rationale

The main reason for introducing the internal REST API endpoint is to move all sensitive update and upload logic off the client and into the backend. By doing this, the Electron app no longer needs to know about internal author identifiers or touch the database layer directly. Instead, it only talks to a stable HTTP surface, and the server is responsible for resolving author IDs, enforcing permissions, and shaping responses.

From a security perspective, this effectively closes off direct database exposure and reduces the blast radius of any client-side issue. The client sees opaque IDs and sanitized payloads, while the backend can evolve its schema, validation and authorization rules without leaking internals to the outside world. This also makes it easier to apply API security best practices such as “do not expose more data than necessary”, strict rate limiting and centralized error handling in one place.

This also opens the door to working with sensitive integrations entirely on the API side, including Discord tokens and other secret-bound flows. With that logic moved out of the Electron client, it becomes possible to reuse the same backend for future web or bot versions of Presence without exposing secrets in the desktop app.

The new version was already ready to ship, but 3.0.1 kept it blocked because of the weekly contract requirement. This delayed the release even though the update itself was prepared and fully functional.

This issue has worried me for a long time, because with only the database address it would be possible to expose or extract a lot of sensitive information. By sensitive data here, I also mean abuse risks such as artificially inflating activity, stats, or presence counts through author IDs and related internal fields. Again, we are not storing tokens or client IDs, but fake engagement, spammed presences, and manipulated statistics are still a real problem and something I want to prevent.

## Added

- **Internal update metadata endpoint** — introduced a new backend endpoint at `https://api.voidpresence.site/v1/github/application` that proxies the latest GitHub release for the main app, returning the tag, installer asset name, download URL, and release notes body as JSON.
- **GitHub access moved to server** — all calls to the GitHub Releases API for update checks are now performed on the server, keeping tokens and rate limits on the backend instead of the Electron client.
- **Changelog delivery via API** — the Electron app now receives the Markdown changelog directly from the internal endpoint and displays it in the update overlay without talking to GitHub.
- **Public API reference page** — added a structured API endpoints page on the website that documents authors, configs, analytics, auth and GitHub helper routes in a single, grouped view, with sample JSON payloads and fetch examples.
- **Cloud upload flow moved to the API** — presence and status uploads now go through the backend API path instead of relying on the legacy direct storage flow, with sanitized payloads and server-side author resolution.
- **Upload rate limiting added** — repeated cloud upload requests are now throttled per upload type to prevent duplicate submissions and reduce accidental spam.
- **Support and logs actions buttons** — added four new buttons in the logs/support section for opening the support site, opening Discord, clearing the console, and downloading logs as a `.txt` file.

## Changed

- **Update source switched to internal API** — the app’s update check logic now fetches release metadata from `api.voidpresence.site` instead of calling GitHub directly from the client.
- **Simplified client update logic** — the Electron updater now relies on a stable JSON contract from the website API and no longer parses GitHub release structures or selects assets itself.
- **Improved backend control** — update behavior can now be adjusted server-side by shaping the API response, filtering assets, or handling GitHub errors without shipping a new desktop client.
- **Unified API grouping** — HTTP endpoints are now organized by domain in the site docs, matching the backend structure and making the route layout easier to navigate.

## Bug Fixes

- **Status upload overlay dismissal fixed** — the status upload confirmation overlay now closes correctly when pressing Escape and no longer leaves stale UI state or event listeners behind.
