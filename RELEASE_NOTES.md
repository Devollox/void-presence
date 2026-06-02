# RPC Auto-Start Fix for Hardware/SMTC Workers

## Improvements

- **Fixed RPC auto-start issue** - RPC no longer immediately re-enables after being manually toggled on
- **Added `rpcEnabled` check in SMTC worker** - worker now verifies RPC is enabled before auto-starting
- **Added `rpcEnabled` check in Hardware worker** - worker now verifies RPC is enabled before auto-starting
- **Added `rpcStarted = false` reset** - flag reset when toggling RPC on to prevent duplicate starts

## Bug Fixed

**Issue:** RPC would immediately turn back on after being toggled off due to hardware/SMTC workers auto-starting it
**Fix:** Workers now respect `rpcEnabled` setting and won't start RPC if it's disabled
