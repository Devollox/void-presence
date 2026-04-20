# Persist Timestamp Safety Clamp

## Improvements

- **Safer Persist Timestamp Updates**
  Added a guard to the `persistOffsetSec` timestamp configuration so that large jumps are ignored. Incoming `persistOffsetSec` values are still rounded to the nearest 5 seconds, but if a new value is more than 10 seconds higher than the currently stored offset, the change is discarded and the existing value is preserved. This prevents accidental or noisy updates from causing sudden, unrealistic jumps in the persisted timestamp.
