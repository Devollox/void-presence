# Error Logging Fix

## Improvements

- **Fixed log spam for Custom Status errors** - errors now update in place instead of creating new log entries
- **Added `updateExistingLogItem` helper function** - extracts common log update logic for reuse
- **Improved log readability** - same behavior as download progress updates

## Bug Fixed

**Issue:** Log spam with repeated `Custom status apply error: fetch failed` messages every few seconds
**Fix:** Errors now consolidate into a single line that updates with the latest error message using the new helper function
