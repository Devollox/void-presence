# Cloud Color Fix & Average Color Reveal Update

## Improvements

- **Added image-based average color extraction** — configs now compute `averageColor` from the first `imageCycles[0].largeImage` using `sharp`, so each card gets a color derived from its preview image.
- **Improved card color reveal** — cards now start with the neutral base color and then reveal the extracted `averageColor` smoothly after a short delay, which makes the UI feel softer and more polished.

## Stability

- **Hardened the image fetch path** — the code checks fetch success and image MIME type before processing, which reduces failures on bad remote URLs.
- **Preserved upload reliability** — the upload still posts the full config payload to Firebase, while also storing `averageColor` alongside the other fields.

## Dependencies

- **Uses `sharp` for color extraction** — the image is resized and sampled efficiently before calculating the average hex color.
