import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import UIManager from '../UIManager.js'
import dxDriver from '../../dxmodules/dxDriver.js'

function calculateCircleCoordinate(angleInDegrees, radius) {
  const angleInRadians = angleInDegrees * (Math.PI / 180)
  const x = radius * Math.cos(angleInRadians)
  const y = radius * Math.sin(angleInRadians)
  return { x, y }
}

function setCenter(obj, x, y) {
  obj.align(dxui.Utils.ALIGN.CENTER, x || 0, y || 0)
}

const page1 = {
  init: function () {
    const parent = UIManager.getRoot()

    const root = dxui.View.build('page1_root', parent)
    root.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.bgColor(0x0)

    // =============================
    // 1. UI Layout Setup
    // =============================
    const simpleLoader = dxui.Label.build('page1_simple_loader', root)
    simpleLoader.text('Simple Loader')
    simpleLoader.textFont(UIManager.font(30, dxui.Utils.FONT_STYLE.NORMAL))
    simpleLoader.textColor(0xffffff)
    simpleLoader.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)

    const box1 = dxui.View.build('page1_box1', root)
    box1.radius(20)
    box1.borderWidth(0)
    box1.padAll(0)
    box1.setSize(500, 1024 / 3 - 50)
    box1.alignTo(simpleLoader, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    box1.bgColor(0x616990)

    const creativeLoader = dxui.Label.build('page1_creative_loader', root)
    creativeLoader.text('Creative Loader')
    creativeLoader.textFont(UIManager.font(30, dxui.Utils.FONT_STYLE.NORMAL))
    creativeLoader.textColor(0xffffff)
    creativeLoader.align(dxui.Utils.ALIGN.TOP_MID, 0, 1024 / 3)

    const box2 = dxui.View.build('page1_box2', root)
    box2.radius(20)
    box2.borderWidth(0)
    box2.padAll(0)
    box2.setSize(500, 1024 / 3 - 50)
    box2.alignTo(creativeLoader, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    box2.bgColor(0x616990)

    const advancedLoader = dxui.Label.build('page1_advanced_loader', root)
    advancedLoader.text('Advanced Loader')
    advancedLoader.textFont(UIManager.font(30, dxui.Utils.FONT_STYLE.NORMAL))
    advancedLoader.textColor(0xffffff)
    advancedLoader.align(dxui.Utils.ALIGN.TOP_MID, 0, 1024 / 3 * 2)

    const box3 = dxui.View.build('page1_box3', root)
    box3.radius(20)
    box3.borderWidth(0)
    box3.padAll(0)
    box3.setSize(500, 1024 / 3 - 50)
    box3.alignTo(advancedLoader, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    box3.bgColor(0x616990)

    // =============================
    // 2. Component Initialization
    // =============================
    const cir1 = dxui.View.build('page1_cir1', box1)
    cir1.bgColor(0xb1f5ff)
    cir1.borderWidth(0)
    cir1.scroll(false)
    cir1.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    cir1.hide()

    const mask1 = dxui.View.build('page1_mask1', cir1)
    mask1.setSize(144, 144)
    mask1.radius(72)
    mask1.bgColor(0x616990)
    mask1.borderWidth(0)
    mask1.align(dxui.Utils.ALIGN.CENTER, -5, 0)
    mask1.hide()

    const cir2 = dxui.View.build('page1_cir2', box1)
    cir2.bgColor(0xe16e7a)
    cir2.borderWidth(0)
    cir2.scroll(false)
    cir2.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    cir2.hide()

    const mask2 = dxui.View.build('page1_mask2', cir2)
    mask2.setSize(114, 114)
    mask2.radius(57)
    mask2.bgColor(0x616990)
    mask2.borderWidth(0)
    mask2.align(dxui.Utils.ALIGN.CENTER, 3, 0)
    mask2.hide()

    const size = 30
    const side = 40
    const offset = 20

    const dot1 = dxui.View.build('page1_dot1', box2)
    dot1.bgColor(0xffffff)
    dot1.borderWidth(0)
    dot1.padAll(0)
    dot1.radius(0)
    dot1.align(dxui.Utils.ALIGN.CENTER, -side * 2, 0)
    dot1.hide()

    const dot1Mask = dxui.View.build('page1_dot1_mask', dot1)
    dot1Mask.bgColor(0xe16e7a)
    dot1Mask.bgOpa(0)
    dot1Mask.borderWidth(0)
    dot1Mask.padAll(0)
    dot1Mask.setSize(size, size)
    dot1Mask.radius(size / 2)

    const dot2 = dxui.View.build('page1_dot2', box2)
    dot2.bgColor(0xffffff)
    dot2.borderWidth(0)
    dot2.padAll(0)
    dot2.radius(0)
    dot2.align(dxui.Utils.ALIGN.CENTER, -side, 0)
    dot2.hide()

    const dot2Mask = dxui.View.build('page1_dot2_mask', dot2)
    dot2Mask.bgColor(0xe16e7a)
    dot2Mask.bgOpa(0)
    dot2Mask.borderWidth(0)
    dot2Mask.padAll(0)
    dot2Mask.setSize(size, size)
    dot2Mask.radius(size / 2)

    const dot3 = dxui.View.build('page1_dot3', box2)
    dot3.bgColor(0xffffff)
    dot3.borderWidth(0)
    dot3.padAll(0)
    dot3.radius(0)
    dot3.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    dot3.hide()

    const dot3Mask = dxui.View.build('page1_dot3_mask', dot3)
    dot3Mask.bgColor(0xe16e7a)
    dot3Mask.bgOpa(0)
    dot3Mask.borderWidth(0)
    dot3Mask.padAll(0)
    dot3Mask.setSize(size, size)
    dot3Mask.radius(size / 2)

    const dot4 = dxui.View.build('page1_dot4', box2)
    dot4.bgColor(0xffffff)
    dot4.borderWidth(0)
    dot4.padAll(0)
    dot4.radius(0)
    dot4.align(dxui.Utils.ALIGN.CENTER, side, 0)
    dot4.hide()

    const dot4Mask = dxui.View.build('page1_dot4_mask', dot4)
    dot4Mask.bgColor(0xe16e7a)
    dot4Mask.bgOpa(0)
    dot4Mask.borderWidth(0)
    dot4Mask.padAll(0)
    dot4Mask.setSize(size, size)
    dot4Mask.radius(size / 2)

    const dot5 = dxui.View.build('page1_dot5', box2)
    dot5.bgColor(0xffffff)
    dot5.borderWidth(0)
    dot5.padAll(0)
    dot5.radius(0)
    dot5.align(dxui.Utils.ALIGN.CENTER, side * 2, 0)
    dot5.hide()

    const dot5Mask = dxui.View.build('page1_dot5_mask', dot5)
    dot5Mask.bgColor(0xe16e7a)
    dot5Mask.bgOpa(0)
    dot5Mask.borderWidth(0)
    dot5Mask.padAll(0)
    dot5Mask.setSize(size, size)
    dot5Mask.radius(size / 2)

    const rect1 = dxui.View.build('page1_rect1', box3)
    rect1.bgColor(0x8c839e)
    rect1.setBorderColor(0xffffff)
    rect1.setSize(45, 120)
    rect1.padAll(0)
    rect1.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    rect1.hide()

    const rect2 = dxui.View.build('page1_rect2', box3)
    rect2.bgColor(0x8c839e)
    rect2.setBorderColor(0xffffff)
    rect2.padAll(0)
    rect2.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    rect2.hide()

    const rect3 = dxui.View.build('page1_rect3', box3)
    rect3.bgColor(0xffffff)
    rect3.padAll(0)
    rect3.align(dxui.Utils.ALIGN.CENTER, 40, 0)
    rect3.moveBackground()
    rect3.hide()

    const rect4 = dxui.View.build('page1_rect4', box3)
    rect4.bgColor(0xffffff)
    rect4.padAll(0)
    rect4.setSize(0, 0)
    rect4.align(dxui.Utils.ALIGN.CENTER, 0, 60)
    rect4.moveBackground()
    rect4.hide()

    const rect5 = dxui.View.build('page1_rect5', box3)
    rect5.bgColor(0xffffff)
    rect5.padAll(0)
    rect5.radius(8)
    rect5.setSize(0, 0)
    rect5.align(dxui.Utils.ALIGN.CENTER, 0, 70)
    rect5.hide()

    let anime1 = false
    let anime2 = false
    let anime3 = false

    // 关键：保留动画返回对象，避免被回收后不执行
    const animCtx = {}

    // =============================
    // 3. Initial State Setup
    // =============================
    cir1.show()
    cir1.setSize(150, 150)
    cir1.radius(75)
    mask1.show()
    cir2.show()
    cir2.setSize(120, 120)
    cir2.radius(60)
    mask2.show()
    anime1 = true

    dot1.show()
    dot1.setSize(size, size)
    dot1.radius(size / 2)
    dot2.show()
    dot2.setSize(size, size)
    dot2.radius(size / 2)
    dot3.show()
    dot3.setSize(size, size)
    dot3.radius(size / 2)
    dot4.show()
    dot4.setSize(size, size)
    dot4.radius(size / 2)
    dot5.show()
    dot5.setSize(size, size)
    dot5.radius(size / 2)
    anime2 = true

    rect1.show()
    rect1.borderWidth(5)
    rect1.radius(8)
    rect2.show()
    rect2.borderWidth(5)
    rect2.radius(8)
    rect2.setSize(60, 60)
    rect3.show()
    rect3.radius(8)
    rect3.setSize(5, 20)
    rect4.show()
    rect5.show()
    anime3 = true

    // =============================
    // 4. Animation Logic
    // =============================
    function getValue(x, startValue = side * 2, mask) {
      let modX = x % (side * 5 + offset)
      let resX = startValue - modX

      let resY = 0
      let over = 0
      if (resX < -side * 2) {
        over = -resX - side * 2
        if (over >= side) {
          resX = side * 2 - over + side
        } else {
          if (over <= side / 6) {
            resX = -side * 2
            resY = -over * 6
          } else if (over <= side / 6 * 5) {
            resY = -side
            resX = -side * 2 + (over - side / 6) * 6
            mask.bgOpa(100)
          } else if (over < side) {
            resX = side * 2
            resY = -(side - over) * 6
          }
        }
      }
      if (resY == 0) mask.bgOpa(0)
      return { x: resX, y: resY }
    }

    std.setInterval(() => {
      if (!anime1) return
      animCtx.anime1 = dxui.Utils.anime(mask1, 0, 360, (obj, v) => {
        let { x, y } = calculateCircleCoordinate(v, 5)
        x *= -1
        y *= -1
        setCenter(obj, Math.floor(x), Math.floor(y))
      }, 500, null, null, 'ease_in_out')

      animCtx.anime2 = dxui.Utils.anime(mask2, 360, 0, (obj, v) => {
        let { x, y } = calculateCircleCoordinate(v, 5)
        setCenter(obj, Math.floor(x), Math.floor(y))
      }, 500, null, null, 'ease_in_out')
    }, 500, true)

    std.setInterval(() => {
      if (!anime2) return
      animCtx.anime3 = dxui.Utils.anime(null, 0, side * 5 + offset, (obj, v) => {
        let move1 = getValue(v, -side * 2, dot1Mask)
        setCenter(dot1, move1.x, move1.y)
        let move2 = getValue(v, -side, dot2Mask)
        setCenter(dot2, move2.x, move2.y)
        let move3 = getValue(v, 0, dot3Mask)
        setCenter(dot3, move3.x, move3.y)
        let move4 = getValue(v, side, dot4Mask)
        setCenter(dot4, move4.x, move4.y)
        let move5 = getValue(v, side * 2, dot5Mask)
        setCenter(dot5, move5.x, move5.y)
      }, 2000, null, null, 'linear')
    }, 2000, true)

    let offsetYRect5 = 0
    let offsetYRect4 = 0
    std.setInterval(() => {
      if (!anime3) return
      animCtx.anime4 = dxui.Utils.anime(null, 0, 360, (obj, v) => {
        let sin = Math.sin(Math.PI / 180 * v)
        setCenter(rect1, 0, sin * 20)
        setCenter(rect2, 0, sin * 20)
        setCenter(rect3, 40, sin * 20)
        setCenter(rect4, 0, sin * 20 + 60 + offsetYRect4)
        setCenter(rect5, 0, sin * 20 + 70 + offsetYRect5)
      }, 1000, null, null, 'linear')
    }, 1000, true)

    std.setInterval(() => {
      if (!anime3) return
      offsetYRect5 = 0
      offsetYRect4 = 0

      animCtx.anime5 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
        rect1.setSize(45 - v / 3, 120 - v / 3)
        rect2.setSize(60 + v, 60 + v / 2)
        rect3.setSize(5 - v / 20, 20 - v / 5)
        rect4.setSize(v / 100 * 5, v / 100 * 25)
        rect5.setSize(v / 100 * 70, v / 100 * 5)
      }, 1000, null, null, 'ease_in_out')

      std.setTimeout(() => {
        let flag = false
        let w, h, w1
        animCtx.anime6 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
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
        }, 1000, null, null, 'ease_in_out')
      }, 1000)

      std.setTimeout(() => {
        if (!anime3) return
        let flag = false
        let w, h, w1, offsetYRect5_
        animCtx.anime7 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
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
        }, 1000, null, null, 'ease_in_out')
      }, 2000)

      std.setTimeout(() => {
        if (!anime3) return
        let flag = false
        let w1, h1, w2, h2, w3, h3, offsetYRect5_, offsetYRect4_
        animCtx.anime8 = dxui.Utils.anime(null, 0, 100, (obj, v) => {
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
        }, 1000, null, null, 'ease_in_out')
      }, 3000)
    }, 4000, true)

    root.hide()
    return root
  }
}

export default page1
