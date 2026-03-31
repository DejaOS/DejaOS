import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import UIManager from '../UIManager.js'
import dxDriver from '../../dxmodules/dxDriver.js'

function setCenter(obj, x, y) {
  obj.align(dxui.Utils.ALIGN.CENTER, x || 0, y || 0)
}

const page2 = {
  init: function () {
    const root = dxui.View.build(std.genRandomStr(10), UIManager.getRoot())
    root.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.bgColor(0x0f172a)

    const bg = dxui.Image.build('page2_bg', root)
    bg.source('/app/code/resource/image/anim/bg_scenic_600x1024.jpg')
    bg.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    bg.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // Title
    const title = dxui.Label.build('page2_title', root)
    title.text('Character & Stars')
    title.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    title.textColor(0xffffff)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 18)

    // ===== Area 1: Cloud drift (images) =====
    const cloudWrap = dxui.View.build('page2_cloud_wrap', root)
    cloudWrap.setSize(580, 250)
    cloudWrap.align(dxui.Utils.ALIGN.TOP_MID, 0, 90)
    cloudWrap.bgOpa(0)
    cloudWrap.borderWidth(0)
    cloudWrap.padAll(0)

    function createCloud(id, source, w, h, x, y) {
      const c = dxui.Image.build(id, cloudWrap)
      c.source(source)
      c.setSize(w, h)
      setCenter(c, x, y)
      return c
    }

    const cloud1 = createCloud('page2_cloud1', '/app/code/resource/image/anim/cloud_pick_1_220.png', 210, 110, -150, 0)
    const cloud2 = createCloud('page2_cloud2', '/app/code/resource/image/anim/cloud_pick_6_260.png', 230, 115, 145, 8)

    // ===== Area 2: Star twinkle (images, near clouds) =====
    const starWrap = dxui.View.build('page2_star_wrap', root)
    starWrap.setSize(560, 240)
    starWrap.align(dxui.Utils.ALIGN.TOP_MID, 0, 280)
    starWrap.bgOpa(0)
    starWrap.borderWidth(0)
    starWrap.padAll(0)

    function createStar(id, source, w, h, x, y) {
      const star = dxui.Image.build(id, starWrap)
      star.source(source)
      star.setSize(w, h)
      setCenter(star, x, y)
      return star
    }

    const star1 = createStar('page2_star1', '/app/code/resource/image/anim/star_pick_1_96.png', 76, 76, -190, -65)
    const star2 = createStar('page2_star2', '/app/code/resource/image/anim/star_pick_5_72.png', 58, 58, 0, -10)
    const star3 = createStar('page2_star3', '/app/code/resource/image/anim/star_pick_9_84.png', 66, 66, 190, -55)

    // ===== Area 3: Character (bottom) =====
    const charWrap = dxui.View.build('page2_char_wrap', root)
    charWrap.setSize(300, 280)
    charWrap.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -80)
    charWrap.bgOpa(0)
    charWrap.borderWidth(0)
    charWrap.padAll(0)

    const girlFace = dxui.Image.build('page2_girl_face', charWrap)
    girlFace.source('/app/code/resource/image/anim/eye_anim_4.png')
    girlFace.setSize(240, 120)
    setCenter(girlFace, 0, 8)

    // Keep animation handles to prevent garbage collection
    const animCtx = {}

    // 6-frame eye expression cycle (insert neutral frames to avoid a robotic feel)
    const eyeFrames = [
      '/app/code/resource/image/anim/eye_anim_4.png', // neutral
      '/app/code/resource/image/anim/eye_anim_2.png',
      '/app/code/resource/image/anim/eye_anim_4.png',
      '/app/code/resource/image/anim/eye_anim_1.png',
      '/app/code/resource/image/anim/eye_anim_4.png',
      '/app/code/resource/image/anim/eye_anim_6.png', // close
      '/app/code/resource/image/anim/eye_anim_4.png',
      '/app/code/resource/image/anim/eye_anim_3.png',
      '/app/code/resource/image/anim/eye_anim_5.png',
      '/app/code/resource/image/anim/eye_anim_4.png'
    ]
    let eyeIdx = 0
    const baseEyeMs = 700
    const randomEyeMs = 900
    function playEyeFrame() {
      girlFace.source(eyeFrames[eyeIdx])
      eyeIdx = (eyeIdx + 1) % eyeFrames.length

      // After the closed-eye frame (eye_anim_6), return quickly to neutral;
      // use base + random timing for other frames
      const curr = eyeFrames[(eyeIdx - 1 + eyeFrames.length) % eyeFrames.length]
      const delay = curr.indexOf('eye_anim_6.png') >= 0
        ? 180
        : (baseEyeMs + Math.floor(Math.random() * randomEyeMs))
      std.setTimeout(playEyeFrame, delay)
    }
    playEyeFrame()

    // Star twinkle (show/hide + slight movement)
    std.setInterval(() => {
      animCtx.starTwinkle = dxui.Utils.anime(null, 0, 100, (obj, v) => {
        const p = v / 100
        if (p > 0.5) star1.show()
        else star1.hide()
        if (p > 0.3) star2.show()
        else star2.hide()
        if (p > 0.7) star3.show()
        else star3.hide()
        setCenter(star2, 0, -10 + Math.sin(Math.PI * p) * 4)
      }, 900, null, null, 'ease_in_out')
    }, 900, true)

    // Slow cloud drift (continuous loop without snapping back to start)
    const cloud1Base = { x: -150, y: 0 }
    const cloud2Base = { x: 145, y: 8 }
    std.setInterval(() => {
      animCtx.cloudDrift = dxui.Utils.anime(null, 0, 360, (obj, deg) => {
        const rad = Math.PI / 180 * deg

        // cloud1: horizontal oscillation + slight vertical movement
        const c1x = cloud1Base.x + Math.sin(rad) * 18
        const c1y = cloud1Base.y + Math.sin(rad * 1.3) * 4
        setCenter(cloud1, Math.floor(c1x), Math.floor(c1y))

        // cloud2: different phase/amplitude for a layered effect
        const c2x = cloud2Base.x + Math.sin(rad + Math.PI / 2) * 22
        const c2y = cloud2Base.y + Math.sin(rad * 1.1 + Math.PI / 3) * 3
        setCenter(cloud2, Math.floor(c2x), Math.floor(c2y))
      }, 4200, null, null, 'linear')
    }, 4200, true)

    root.hide()
    return root
  }
}

export default page2
