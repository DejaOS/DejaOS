# Facial Application Rules

## Live Preview and Layers

- The live facial-camera feed is full-screen by default and displayed on the bottommost screen layer.
- Ordinary UI pages sit above it; an opaque root background completely hides the camera image.
- For a full preview, make the overlying UI root background transparent.
- For a partial camera region, use a background image with a transparent window or make the corresponding UI area transparent.
- Check text, button, and status-layer readability whenever transparency is used.

## Recognition Experience

- Show the live preview by default during facial recognition so users can adjust distance, angle, and position.
- If the product explicitly requires a hidden preview, record that decision and the alternative user feedback.
- Detection or tracking boxes are a product-experience choice, not a mandatory feature.
- A tracking box must align with camera coordinates, screen rotation, scaling, and any transparent window.

## Enrollment

- During facial enrollment, call:

  ```js
  dxFacial.setStatus(true)
  ```

- Never pass `false` during enrollment, or enrollment will not function correctly.
- Entering enrollment, capturing features, saving business records, and leaving enrollment should form an explicit state machine.
- Handle rollback or recoverable state when feature extraction, photo storage, and database writes partially succeed.

## SDK 2.0 Initialization

- In SDK 2.0, `dxFacial` normally encapsulates the combined camera, image-pipeline, and facial-engine capabilities. Initializing `dxFacial` once in the facial Worker is usually sufficient.
- Do not copy SDK 4.0 `dxCapturer`, `dxIvcore`, and `dxDisplay` initialization templates directly into 2.0.
- If the installed 2.0 wrapper or device documentation explicitly requires other components, follow that project-specific evidence.
- The facial Worker owns `dxFacial` and its callbacks. Avoid initialization from multiple Workers.

## SDK 4.0 Initialization

SDK 4.0 exposes capabilities that older facial components handled internally as separate public components. For a complete live-camera, bottom-layer preview, and facial-recognition pipeline, check at least:

- `dxCapturer`: initializes RGB/NIR camera capture channels.
- `dxIvcore`: initializes image/video processing and G2D foundations.
- `dxDisplay`: initializes display capabilities required for display and live preview.
- `dxFacial`: initializes detection, recognition, and the feature library after the prerequisite image pipeline is ready.
- `dxSystemBus`: installed as an SDK 4.0 base component for internal wrapper use; the app does not initialize or call it directly.

The currently reviewed `face_app` uses this order:

```text
dxCapturer.init()
  -> dxIvcore.init()
  -> dxDisplay.init()
  -> register dxFacial recognition/detection events
  -> dxFacial.init(options)
  -> dxFacial.setConfig(...)
  -> dxFacial.setStatus(true)
```

This is the actual pipeline from the reviewed project, not a fixed function template that can bypass wrapper validation. Exports, arguments, return values, and ordering still come from the target project's `dxmodules/`.

### dxCapcal Boundary

- `dxCapcal` is not required for SDK 4.0 facial recognition, live preview, or facial enrollment.
- Import and initialize it only when the product requires camera calibration and the installed `dxCapcal.js` is compatible with the current SDK and native library.
- Do not add `dxCapcal` to the default facial pipeline merely because the project contains a placeholder calibration driver.

## Events and Startup

- In SDK 4.0, use `dxFacial.on/off/once` only when the project wrapper defines them.
- When the wrapper distributes native events through the system bus, register events before `dxFacial.init()` so early recognition or detection events are not missed.
- `detection` is normally high frequency. Do not forward it unnecessarily when no tracking box is displayed.
- If any required prerequisite image component fails to initialize, do not start `dxFacial`. Explicitly degrade or disable the facial feature and log the error.
- Verify every callback, feature extraction, comparison, feature add/update/delete, and status method against the target `dxmodules/*.js`.

## Cleanup

- Leaving a page or flow does not necessarily mean destroying components. Distinguish pausing recognition from full deinitialization according to product needs.
- In SDK 2.0, stop recognition and unregister callbacks before deinitializing according to `dxFacial.js`.
- In SDK 4.0, clean up in reverse dependency order: stop facial status, unregister events, deinitialize `dxFacial`, then clean up display/image pipeline resources, `dxIvcore`, and `dxCapturer`.
- Call only cleanup functions that actually exist in the project wrapper. For example, if `dxDisplay` has no `deinit`, do not invent `dxDisplay.deinit()`.
- Do not retain duplicate listeners, unbounded image caches, or ownerless timers.

## On-Device Checks

- The camera preview is visible and not hidden by the root View.
- A partial transparent window has the correct position and dimensions.
- As the face moves, the video and optional tracking box stay aligned.
- Enrollment logs prove that `setStatus(true)` was established.
- No module-loading, camera, feature-extraction, or database errors occur.
- Static checks do not replace on-device camera and enrollment-experience validation.
