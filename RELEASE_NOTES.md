# Timestamp Validation Fix

## Improvements

- **Reliable Rich Presence Timestamps**
  Rich Presence **timestamps** are now sent as **Unix time in seconds (`>= 1`)** instead of raw JavaScript milliseconds.
  This fixes validation errors such as:
  `child "activity" fails because [child "timestamps" fails because [child "start" fails because ["start" must be larger than or equal to 1]]]`
  when updating activity via `SET_ACTIVITY`.

## Internal Changes

- **Consistent Time Format for Discord**
  All internal time calculations still use **JavaScript milliseconds** (from `Date.now()`), but before sending data to Discord, they are converted to **Unix seconds** using a small helper function.
  This ensures that the `activity.timestamps.start` and `activity.timestamps.end` fields always match Discord’s expected format and range.

- **Safe Timestamp Conversion Layer**
  A dedicated conversion helper now:
  - Converts millisecond values to **Unix seconds** using `Math.floor(ms / 1000)`.
  - Ignores invalid or too small values (anything `< 1`), so Discord never receives zero or negative timestamps.
  - Builds a safe `activity.timestamps` object right before the `SET_ACTIVITY` request is sent.

- **No Behavior Changes for Existing Features**
  All existing behaviors (such as **“now”**, **“range”**, **“persist”** timestamp modes and **playback progress** from the media session) remain the same from the user’s point of view.
  Only the way timestamps are formatted for Discord has changed, making the integration more stable and standards‑compliant.

## Dependency Cleanup

- **Removed `dotenv` Dependency**
  The project no longer depends on the **`dotenv`** package for loading environment variables.
