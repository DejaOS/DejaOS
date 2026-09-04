# dxUi Canvas API Validation Demo

This SDK 4.0 example demonstrates the public `dxui.Canvas` wrapper introduced
with dxUi 2.0.6. It targets the VF105_V12 800 × 1280 display and keeps the API
tour on one page so developers can compare the source with the rendered result.

## Coverage

| Section | APIs demonstrated |
| --- | --- |
| Draw primitives | `setBuffer`, `fillBg`, `drawRect`, `drawLine`, `drawPolygon`, `drawArc`, `drawText` |
| Pixels and palette | `setPxColor`, `setPxOpa`, `setPalette`, `getPx` |
| Copy and image | `copyBuf`, `drawImg` with a Canvas source, `drawImg` with a file path |
| Transform | `transform` with rotation, zoom, pivot and antialiasing |
| Blur filters | Regional and whole-canvas forms of `blurHor` and `blurVer` |
| Buffer and info | Buffer resizing, `getImg`, ArrayBuffer, TypedArray and `{ data }` sources |

Every Canvas is created with `dxui.Canvas.build(id, parent)`. The example also
uses inherited base methods such as `setPos()` and `invalidate()`.

## Important usage notes

- Call `dxui.init()` before building a Canvas.
- Keep the `dxui.handler()` timer active.
- Drawing descriptors are created through `dxui.Utils.GG.NativeDraw`.
- `drawPolygon()` supports convex polygons only. Pass perimeter points in order; concave or self-intersecting point lists are not supported by LVGL's canvas rasterizer.
- The one-argument blur form blurs the complete Canvas; the five-argument form
  limits the operation to a region.
- Use absolute runtime resource paths beginning with `/app/code/resource/`.
- Large, frequently redrawn canvases are CPU intensive. Prefer small dynamic
  regions, reuse descriptors, and keep static content outside animation loops.

## Run

```powershell
dejaos run --project C:\Work\2026\temp\5\startup_animation_demo
```

## Screenshot

`screenshot/canvas-api-validation.png` is a simulated 800 × 1280 device screenshot for documentation and preview use; it is not captured from the physical device. Run `screenshot/render-preview.py` with Python and Pillow to regenerate it after visual changes.
