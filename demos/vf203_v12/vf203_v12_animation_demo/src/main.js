import log from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'
import v from './viewUtils.js'

(function () {
    const context = {}

    dxui.init({ orientation: 1 }, context);

    let act = v.create('act').bgColor(0)

    // =============================
    // 1. UI Layout Setup
    // =============================

    // --- Simple Loader Setup ---
    let simpleLoader = v.create(act, "Label")
        .text("Simple Loader")
        .top_mid()
        .font(30)
        .textColor(0xffffff)

    let box1 = v.create(act)
        .clearStyle()
        .radius(20)
        .setSize(500, 1024 / 3 - 50)
        .out_bottom_mid_to(simpleLoader)
        .bgColor(0x616990)

    // --- Creative Loader Setup ---
    let creativeLoader = v.create(act, "Label")
        .text("Creative Loader")
        .top_mid(0, 1024 / 3)
        .font(30)
        .textColor(0xffffff)

    let box2 = v.create(act)
        .clearStyle()
        .radius(20)
        .setSize(500, 1024 / 3 - 50)
        .out_bottom_mid_to(creativeLoader)
        .bgColor(0x616990)

    // --- Advanced Loader Setup ---
    let advancedLoader = v.create(act, "Label")
        .text("Advanced Loader")
        .top_mid(0, 1024 / 3 * 2)
        .font(30)
        .textColor(0xffffff)

    let box3 = v.create(act)
        .clearStyle()
        .radius(20)
        .setSize(500, 1024 / 3 - 50)
        .out_bottom_mid_to(advancedLoader)
        .bgColor(0x616990)

    // =============================
    // 2. Component Initialization
    // =============================

    // --- Components for Simple Loader (Orbiting Masks) ---
    // Two circles (cir1, cir2) with rotating masks (mask1, mask2) to create an eclipse/wobble effect.
    let cir1 = v.create(box1)
        .hide()
        .center()
        .bgColor(0xb1f5ff)
        .borderWidth(0)
        .scroll(false)

    let mask1 = v.create(cir1)
        .hide()
        .setSize(144, 144)
        .radius(72)
        .bgColor(0x616990)
        .center(-5)
        .borderWidth(0)

    let cir2 = v.create(box1)
        .hide()
        .center()
        .bgColor(0xe16e7a)
        .borderWidth(0)
        .scroll(false)

    let mask2 = v.create(cir2)
        .hide()
        .setSize(114, 114)
        .radius(57)
        .bgColor(0x616990)
        .center(3)
        .borderWidth(0)

    // --- Components for Creative Loader (Wave Dots) ---
    // 5 dots that will "jump" in a wave pattern driven by a mathematical function.
    let size = 30
    let side = 40
    let offset = 20
    function dot(parent) {
        let _d = v.create(parent)
            .clearStyle()
            .bgColor(0xffffff)
            .borderWidth(0)
        return _d
    }
    let dot1 = dot(box2)
        .hide()
        .center(-side * 2)
    let dot1Mask = dot(dot1)
        .bgColor(0xe16e7a)
        .bgOpa(0)
        .setSize(size, size)
        .radius(size / 2)

    let dot2 = dot(box2)
        .hide()
        .center(-side)
    let dot2Mask = dot(dot2)
        .bgColor(0xe16e7a)
        .bgOpa(0)
        .setSize(size, size)
        .radius(size / 2)

    let dot3 = dot(box2)
        .hide()
        .center()
    let dot3Mask = dot(dot3)
        .bgColor(0xe16e7a)
        .bgOpa(0)
        .setSize(size, size)
        .radius(size / 2)

    let dot4 = dot(box2)
        .hide()
        .center(side)
    let dot4Mask = dot(dot4)
        .bgColor(0xe16e7a)
        .bgOpa(0)
        .setSize(size, size)
        .radius(size / 2)

    let dot5 = dot(box2)
        .hide()
        .center(side * 2)
    let dot5Mask = dot(dot5)
        .bgColor(0xe16e7a)
        .bgOpa(0)
        .setSize(size, size)
        .radius(size / 2)

    // --- Components for Advanced Loader (Morphing Rects) ---
    // 5 rectangles that change size and position in a choreographed sequence.
    let rect1 = v.create(box3)
        .hide()
        .clearStyle()
        .center()
        .bgColor(0x8c839e)
        .setBorderColor(0xffffff)
        .setSize(45, 120)
    let rect2 = v.create(box3)
        .hide()
        .clearStyle()
        .center()
        .bgColor(0x8c839e)
        .setBorderColor(0xffffff)
    let rect3 = v.create(box3)
        .hide()
        .clearStyle()
        .center(40)
        .bgColor(0xffffff)
        .moveBackground()
    let rect4 = v.create(box3)
        .hide()
        .clearStyle()
        .center(0, 60)
        .bgColor(0xffffff)
        .setSize(0, 0)
        .moveBackground()
    let rect5 = v.create(box3)
        .hide()
        .clearStyle()
        .center(0, 70)
        .bgColor(0xffffff)
        .radius(8)
        .setSize(0, 0)

    let anime1 = false
    let anime2 = false
    let anime3 = false


    // =============================
    // 3. Initial State Setup
    // =============================

    // Show Simple Loader elements
    cir1.show()
        .setSize(150, 150)
        .radius(75)
    mask1.show()
    cir2.show()
        .setSize(120, 120)
        .radius(60)
    mask2.show()
    anime1 = true


    // Show Creative Loader elements
    dot1.show()
        .setSize(size, size)
        .radius(size / 2)
    dot2.show()
        .setSize(size, size)
        .radius(size / 2)
    dot3.show()
        .setSize(size, size)
        .radius(size / 2)
    dot4.show()
        .setSize(size, size)
        .radius(size / 2)
    dot5.show()
        .setSize(size, size)
        .radius(size / 2)
    anime2 = true

    // Show Advanced Loader elements
    rect1.show()
        .borderWidth(5)
        .radius(8)
    rect2.show()
        .borderWidth(5)
        .radius(8)
        .setSize(60, 60)
    rect3.show()
        .radius(8)
        .setSize(5, 20)
    rect4.show()
    rect5.show()
    anime3 = true




    // =============================
    // 4. Animation Logic
    // =============================

    // Helper function for Creative Loader wave effect
    // Calculates the position and style of a dot based on the current animation progress 'x'.
    function getValue(x, startValue = side * 2, mask) {
        let modX = x % (side * 5 + offset);
        let resX = startValue - modX

        let resY = 0
        let over = 0
        if (resX < -side * 2) {
            over = -resX - side * 2
            if (over >= side) {
                resX = side * 2 - over + side
            } else {
                if (over <= side / 6) {
                    // Phase 1: Rising
                    resX = -side * 2
                    resY = -over * 6
                } else if (over <= side / 6 * 5) {
                    // Phase 2: Top plateau / Transition
                    resY = -side
                    resX = -side * 2 + (over - side / 6) * 6
                    mask.bgOpa(100)
                } else if (over < side) {
                    // Phase 3: Falling
                    resX = side * 2
                    resY = - (side - over) * 6
                }
            }
        }
        if (resY == 0) {
            mask.bgOpa(0)
        }
        return { x: resX, y: resY };
    }


    // --- Animation Loop 1: Simple Loader ---
    std.setInterval(() => {
        if (!anime1) {
            return
        }
        // Rotate mask1 counter-clockwise (0 -> 360)
        context.anime1 = dxui.Utils.anime(mask1, 0, 360, (obj, v) => {
            let { x, y } = calculateCircleCoordinate(v, 5)
            x *= -1
            y *= -1
            obj.center(Math.floor(x), Math.floor(y))
        }, 500, null, null, "ease_in_out")

        // Rotate mask2 clockwise (360 -> 0)
        context.anime2 = dxui.Utils.anime(mask2, 360, 0, (obj, v) => {
            let { x, y } = calculateCircleCoordinate(v, 5)
            obj.center(Math.floor(x), Math.floor(y))
        }, 500, null, null, "ease_in_out")
    }, 500, true)


    // --- Animation Loop 2: Creative Loader ---
    std.setInterval(() => {
        if (!anime2) {
            return
        }
        // Move a virtual wave across the dots
        context.anime3 = dxui.Utils.anime(null, 0, side * 5 + offset, (obj, v) => {
            let move1 = getValue(v, -side * 2, dot1Mask)
            dot1.center(move1.x, move1.y)
            let move2 = getValue(v, -side, dot2Mask)
            dot2.center(move2.x, move2.y)
            let move3 = getValue(v, 0, dot3Mask)
            dot3.center(move3.x, move3.y)
            let move4 = getValue(v, side, dot4Mask)
            dot4.center(move4.x, move4.y)
            let move5 = getValue(v, side * 2, dot5Mask)
            dot5.center(move5.x, move5.y)
        }, 2000, null, null, "linear")
    }, 2000, true)


    let offsetYRect5 = 0
    let offsetYRect4 = 0
    // --- Animation Loop 3 Part A: Advanced Loader Floating ---
    std.setInterval(() => {
        if (!anime3) {
            return
        }
        // Floating/Breathing effect using Sine wave
        context.anime4 = dxui.Utils.anime(null, 0, 360, (obj, v) => {
            let sin = Math.sin(Math.PI / 180 * v)
            rect1.center(0, sin * 20)
            rect2.center(0, sin * 20)
            rect3.center(40, sin * 20)
            rect4.center(0, sin * 20 + 60 + offsetYRect4)
            rect5.center(0, sin * 20 + 70 + offsetYRect5)
        }, 1000, null, null, "linear")
    }, 1000, true)

    // --- Animation Loop 3 Part B: Advanced Loader Morphing Sequence ---
    std.setInterval(() => {
        if (!anime3) {
            return
        }
        offsetYRect5 = 0
        offsetYRect4 = 0

        // Step 1: Initial expansion/adjustment
        context.anime5 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
            rect1.setSize(45 - v / 3, 120 - v / 3)
            rect2.setSize(60 + v, 60 + v / 2)
            rect3.setSize(5 - v / 20, 20 - v / 5)
            rect4.setSize(v / 100 * 5, v / 100 * 25)
            rect5.setSize(v / 100 * 70, v / 100 * 5)
        }, 1000, null, null, "ease_in_out")

        // Step 2: Contraction after 1s
        std.setTimeout(() => {
            let flag = false
            let w, h, w1
            context.anime6 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
                if (!flag) {
                    flag = true
                    rect4.update()
                    w = rect4.width()
                    h = rect4.height()
                    w1 = rect5.width()
                }
                rect4.setSize(w - v / 100 * w, h - v / 100 * h)
                rect5.width(w1 - v / 100 * 20)
                offsetYRect5 = -1 * (v / 100 * 30)
                offsetYRect4 = -1 * (v / 100 * 30)
            }, 1000, null, null, "ease_in_out")
        }, 1000)

        // Step 3: Morphing head (rect2) after 2s
        std.setTimeout(() => {
            if (!anime3) {
                return
            }
            let flag = false
            let w, h, w1, offsetYRect5_
            context.anime7 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
                if (!flag) {
                    flag = true
                    rect2.update()
                    w = rect2.width()
                    h = rect2.height()
                    w1 = rect5.width()
                    offsetYRect5_ = offsetYRect5
                }
                rect2.setSize(w - v / 100 * 80, h + v / 100 * 20)
                rect5.width(w1 - v / 100 * 40)
                offsetYRect5 = offsetYRect5_ + v / 100 * 10
            }, 1000, null, null, "ease_in_out")
        }, 2000)

        // Step 4: Reset/Transition back after 3s
        std.setTimeout(() => {
            if (!anime3) {
                return
            }
            let flag = false
            let w1, h1, w2, h2, w3, h3, offsetYRect5_, offsetYRect4_
            context.anime8 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
                if (!flag) {
                    flag = true
                    rect1.update()
                    w1 = rect1.width()
                    h1 = rect1.height()

                    rect2.update()
                    w2 = rect2.width()
                    h2 = rect2.height()

                    w3 = rect5.width()
                    h3 = rect5.height()
                    offsetYRect5_ = offsetYRect5
                    offsetYRect4_ = offsetYRect4
                }

                rect1.setSize(v / 100 * 45, v / 100 * 120)
                rect2.setSize(w2 - v / 100 * (w2 - 60), h2 - v / 100 * (h2 - 60))
                rect3.setSize(v / 100 * 5, v / 100 * 20)
                rect5.setSize(w3 - v / 100 * w3, h3 - v / 100 * h3)

                offsetYRect5 = offsetYRect5_ - v / 100 * offsetYRect5_
                offsetYRect4 = offsetYRect4_ - v / 100 * offsetYRect4_

            }, 1000, null, null, "ease_in_out")
        }, 3000)
    }, 4000, true)




    dxui.loadMain(act)
})();

// Helper: Calculate circle coordinates from angle and radius
function calculateCircleCoordinate(angleInDegrees, radius) {
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    const x = radius * Math.cos(angleInRadians);
    const y = radius * Math.sin(angleInRadians);
    return { x: x, y: y };
}

std.setInterval(() => {
    dxui.handler()
}, 5)
