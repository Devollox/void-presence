# Rate Limit Retry-After Fix

## Bug fixes

- Fixed custom status rate limit spam: worker now respects `retry_after` from Discord's 429 response and waits the exact amount of seconds before retrying.
- Previous behavior: worker continued with normal interval after 429, causing repeated rate limits.
- New behavior: worker pauses for `retry_after` seconds (e.g. 9.6s) before next custom status attempt.
