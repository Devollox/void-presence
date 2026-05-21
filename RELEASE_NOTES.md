# Hardware Worker

## Improvements

- **New hardware worker**: added a separate worker path for CPU, GPU, and RAM monitoring, so hardware stats are handled independently from the main playback flow.
- **Cleaner rotation**: hardware entries now cycle line by line, letting CPU, GPU, and memory data appear in a consistent order.
- **Better display formatting**: hardware values are normalized into a compact bar plus label layout, with clearer per-device output.

## Fixed

- **Mixed activity output**: hardware stats no longer compete with playback data in the same branch, reducing overwritten details and state.
- **Unstable hardware reads**: invalid or partial stats are filtered out more safely before being shown in presence.
- **Display glitches**: bar rendering and device labels now stay consistent across updates, including memory formatting and GPU naming.

## Result

- **Hardware monitoring now feels like its own worker**, keeping CPU, GPU, and RAM updates readable without interfering with music or video presence.
