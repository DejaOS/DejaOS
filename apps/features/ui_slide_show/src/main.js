import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'
import dxDriver from '../dxmodules/dxDriver.js'
import images from './slideshowImages.js'

(function () {
    const context = {}

    dxui.init({ orientation: 1 }, context);

    const root = dxui.View.build(std.genRandomStr(10), dxui.Utils.LAYER.MAIN)
    root.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)

    const imgA = dxui.Image.build('slideshow_img_a', root)
    imgA.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    imgA.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const imgB = dxui.Image.build('slideshow_img_b', root)
    imgB.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    imgB.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    // put the back image to the right outside of the screen, waiting for the next time to enter
    imgB.align(dxui.Utils.ALIGN.CENTER, dxDriver.DISPLAY.HEIGHT, 0)

    let idx = 0
    if (images && images.length > 0) {
        imgA.source(images[0])
    }

    const animCtx = {}
    let front = imgA
    let back = imgB
    let transitioning = false
    const slideMs = 500
    const screenW = dxDriver.DISPLAY.HEIGHT
    const preloadMs = 1200

    std.setInterval(() => {
        if (!images || images.length === 0) return
        if (transitioning) return
        transitioning = true

        const nextIdx = (idx + 1) % images.length

        // first preload the next image (decoding may be stuck), try to put the stuck phase before the animation
        back.source(images[nextIdx])
        back.align(dxui.Utils.ALIGN.CENTER, screenW, 0)

        std.setTimeout(() => {
            animCtx.slideOut = dxui.Utils.anime(front, 0, -screenW, (obj, v) => {
                obj.align(dxui.Utils.ALIGN.CENTER, Math.floor(v), 0)
            }, slideMs, null, null, 'ease_in_out')

            animCtx.slideIn = dxui.Utils.anime(back, screenW, 0, (obj, v) => {
                obj.align(dxui.Utils.ALIGN.CENTER, Math.floor(v), 0)
            }, slideMs, null, null, 'ease_in_out')

            std.setTimeout(() => {
                const tmp = front
                front = back
                back = tmp
                idx = nextIdx
                // put the back image to the right outside of the screen, waiting for the next time to enter
                back.align(dxui.Utils.ALIGN.CENTER, screenW, 0)
                transitioning = false
            }, slideMs + 30)
        }, preloadMs)
    }, 6000, true)

    dxui.loadMain(root)
})();

std.setInterval(() => {
    dxui.handler()
}, 5)
