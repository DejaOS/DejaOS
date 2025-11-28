# Animation Demo (vf203_v12)

This demo showcases how to create advanced UI animations on dejaOS devices using the **dxUi** module (based on LVGL 8.3). It demonstrates the capability to build fluid, complex visual effects using JavaScript.

## Overview

The project implements three distinct types of loading animations to illustrate different animation techniques:

1.  **Simple Loader**:
    - **Effect**: Orbiting eclipse effect.
    - **Technique**: Uses basic rotation and coordinate calculation (`dxui.Utils.anime`) to move masks over static circles.
2.  **Creative Loader**:

    - **Effect**: Wave-like "jumping" dots.
    - **Technique**: Driven by a mathematical wave function (`getValue`) that calculates vertical offset and opacity based on a linear progress value.

3.  **Advanced Loader**:
    - **Effect**: Morphing geometric shapes (breathing & sequence transformation).
    - **Technique**: A complex, multi-stage animation sequence managed by nested timers and state flags, combining sine-wave "breathing" with structural morphing.

## Key Concepts

- **dxUi Module**: The core UI building block that wraps LVGL functionality for JavaScript.
- **Animation Loop**: Uses `dxui.Utils.anime` for tweening values and `std.setInterval` for loop control.
- **View Utils**: A helper library (`src/viewUtils.js`) is used to simplify component creation and method chaining.

For more details on UI development in dejaOS, please refer to the [Official Documentation](https://dejaos.com/docs/ui/overview).
