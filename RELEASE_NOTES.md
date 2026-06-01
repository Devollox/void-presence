# Bug fixes: RPC Interval

## Bug fixes

- Fixed an issue where the main RPC update interval (`updateIntervalSec`) was being reset to the default value (30) on load, even when a custom value (e.g. 5 or 10) was saved. Now the saved interval is correctly preserved and applied from localStorage without being overwritten by the default.
