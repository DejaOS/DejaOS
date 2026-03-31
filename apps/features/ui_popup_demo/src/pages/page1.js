import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import UIManager from '../UIManager.js'
import dxDriver from '../../dxmodules/dxDriver.js'

function dividerH(id, parent, w) {
  const d = dxui.View.build(id, parent)
  d.setSize(w, 1)
  d.radius(0)
  d.borderWidth(0)
  d.padAll(0)
  d.bgColor(0xe6e6e6)
  return d
}

function dividerV(id, parent, h) {
  const d = dxui.View.build(id, parent)
  d.setSize(1, h)
  d.radius(0)
  d.borderWidth(0)
  d.padAll(0)
  d.bgColor(0xe6e6e6)
  return d
}

function dimLayer(id, parent) {
  const dim = dxui.View.build(id, parent)
  dim.setSize(parent.width(), parent.height())
  dim.align(dxui.Utils.ALIGN.CENTER, 0, 0)
  dim.radius(0)
  dim.borderWidth(0)
  dim.padAll(0)
  dim.bgColor(0x000000)
  dim.bgOpa(35)
  return dim
}

const page1 = {
  init: function () {
    const parent = UIManager.getRoot()
    const W = dxDriver.DISPLAY.HEIGHT
    const H = dxDriver.DISPLAY.WIDTH

    const root = dxui.View.build('page1_root', parent)
    root.setSize(W, H)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.bgColor(0x0f172a)

    const title = dxui.Label.build('p1_title', root)
    title.text('Popup Showcase (1)')
    title.textFont(UIManager.font(26, dxui.Utils.FONT_STYLE.BOLD))
    title.textColor(0xffffff)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 24)

    const marginX = 26
    const marginTop = 88
    const gapY = 22
    const stageW = W - marginX * 2
    const stageH = Math.floor((H - marginTop - gapY * 2 - 18) / 3)

    function stage(id, y, bg) {
      const s = dxui.View.build(id, root)
      s.setSize(stageW, stageH)
      s.setPos(marginX, y)
      s.radius(18)
      s.borderWidth(0)
      s.padAll(0)
      s.scroll(false)
      s.bgColor(bg)
      return s
    }

    // Popup 1: iOS confirm
    const s1 = stage('p1_stage1', marginTop, 0xd9dde4)
    dimLayer('p1_dim1', s1)

    const p1W = stageW - 80
    const p1 = dxui.View.build('p1_popup1', s1)
    p1.setSize(p1W, Math.min(220, stageH - 40))
    p1.radius(14)
    p1.borderWidth(0)
    p1.padAll(18)
    p1.bgColor(0xffffff)
    p1.scroll(false)
    p1.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p1Text = dxui.Label.build('p1_popup1_text', p1)
    p1Text.setSize(p1W - 12, 84)
    p1Text.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
    p1Text.text('Log in for 28 days to become a QQ expert. If you exit QQ now, your records may reset. Are you sure you want to exit?')
    p1Text.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.BOLD))
    p1Text.textColor(0x111111)
    p1Text.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)

    const p1Div = dividerH('p1_popup1_div', p1, p1.width())
    p1Div.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -52)
    const p1V = dividerV('p1_popup1_v', p1, 52)
    p1V.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    const p1BtnW = 140
    const p1BtnH = 44
    const p1BtnL = dxui.View.build('p1_popup1_btn_l', p1)
    p1BtnL.setSize(p1BtnW, p1BtnH)
    p1BtnL.radius(10)
    p1BtnL.borderWidth(2)
    p1BtnL.setBorderColor(0xe5e7eb)
    p1BtnL.bgColor(0xffffff)
    p1BtnL.scroll(false)
    p1BtnL.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 0, -4)
    const p1BtnLT = dxui.Label.build('p1_popup1_btn_l_t', p1BtnL)
    p1BtnLT.text('Cancel')
    p1BtnLT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p1BtnLT.textColor(0x111111)
    p1BtnLT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p1BtnR = dxui.View.build('p1_popup1_btn_r', p1)
    p1BtnR.setSize(p1BtnW, p1BtnH)
    p1BtnR.radius(10)
    p1BtnR.borderWidth(0)
    p1BtnR.bgColor(0x111111)
    p1BtnR.scroll(false)
    p1BtnR.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, 0, -4)
    const p1BtnRT = dxui.Label.build('p1_popup1_btn_r_t', p1BtnR)
    p1BtnRT.text('Exit')
    p1BtnRT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p1BtnRT.textColor(0xffffff)
    p1BtnRT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // Popup 2: permission + checkbox
    const s2 = stage('p1_stage2', marginTop + stageH + gapY, 0xd7d7d7)

    const p2W = stageW - 80
    const p2 = dxui.View.build('p1_popup2', s2)
    p2.setSize(p2W, Math.min(240, stageH - 40))
    p2.radius(18)
    p2.borderWidth(0)
    p2.padAll(18)
    p2.bgColor(0xffffff)
    p2.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p2Title = dxui.Label.build('p1_popup2_title', p2)
    p2Title.text('Allow Contacts to access device information?')
    p2Title.textFont(UIManager.font(19, dxui.Utils.FONT_STYLE.BOLD))
    p2Title.textColor(0x111111)
    p2Title.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)

    const p2Desc = dxui.Label.build('p1_popup2_desc', p2)
    p2Desc.text('Includes call status and device identifier.')
    p2Desc.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL))
    p2Desc.textColor(0x333333)
    p2Desc.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 30)

    const chk = dxui.View.build('p1_popup2_chk', p2)
    chk.setSize(22, 22)
    chk.radius(6)
    chk.borderWidth(0)
    chk.bgColor(0x2563eb)
    chk.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 62)
    const chkMark = dxui.Label.build('p1_popup2_chk_mark', chk)
    chkMark.text('✓')
    chkMark.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.BOLD))
    chkMark.textColor(0xffffff)
    chkMark.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    const chkText = dxui.Label.build('p1_popup2_chk_text', p2)
    chkText.text('Do not show again')
    chkText.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL))
    chkText.textColor(0x111111)
    chkText.align(dxui.Utils.ALIGN.TOP_LEFT, 30, 64)

    const p2Div = dividerH('p1_popup2_div', p2, p2.width())
    p2Div.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -52)
    const p2V = dividerV('p1_popup2_v', p2, 52)
    p2V.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    const p2BtnW = 140
    const p2BtnH = 44
    const p2BtnL = dxui.View.build('p1_popup2_btn_l', p2)
    p2BtnL.setSize(p2BtnW, p2BtnH)
    p2BtnL.radius(10)
    p2BtnL.borderWidth(2)
    p2BtnL.setBorderColor(0xe5e7eb)
    p2BtnL.bgColor(0xffffff)
    p2BtnL.scroll(false)
    p2BtnL.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 0, -4)
    const p2BtnLT = dxui.Label.build('p1_popup2_btn_l_t', p2BtnL)
    p2BtnLT.text('Deny')
    p2BtnLT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p2BtnLT.textColor(0x2563eb)
    p2BtnLT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p2BtnR = dxui.View.build('p1_popup2_btn_r', p2)
    p2BtnR.setSize(p2BtnW, p2BtnH)
    p2BtnR.radius(10)
    p2BtnR.borderWidth(0)
    p2BtnR.bgColor(0x2563eb)
    p2BtnR.scroll(false)
    p2BtnR.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, 0, -4)
    const p2BtnRT = dxui.Label.build('p1_popup2_btn_r_t', p2BtnR)
    p2BtnRT.text('Allow')
    p2BtnRT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p2BtnRT.textColor(0xffffff)
    p2BtnRT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // Popup 3: bluetooth/car (icons are placeholders)
    const s3 = stage('p1_stage3', marginTop + (stageH + gapY) * 2, 0x0b0b0b)

    const p3W = stageW - 60
    const p3 = dxui.View.build('p1_popup3', s3)
    p3.setSize(p3W, Math.min(280, stageH - 30))
    p3.radius(26)
    p3.borderWidth(6)
    p3.setBorderColor(0x111111)
    p3.padAll(18)
    p3.bgColor(0xffffff)
    p3.scroll(false)
    p3.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p3Title = dxui.Label.build('p1_popup3_title', p3)
    p3Title.setSize(p3W - 12, 56)
    p3Title.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
    p3Title.text('Bluetooth device \"A:r PodsjekTactic\" detected. Set it as car Bluetooth?')
    p3Title.textFont(UIManager.font(17, dxui.Utils.FONT_STYLE.BOLD))
    p3Title.textColor(0x111111)
    p3Title.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)

    const bt = dxui.View.build('p1_popup3_bt', p3)
    bt.setSize(64, 64)
    bt.radius(32)
    bt.borderWidth(0)
    bt.bgColor(0x22c55e)
    bt.align(dxui.Utils.ALIGN.CENTER, -90, 4)
    const btImg = dxui.Image.build('p1_popup3_bt_img', bt)
    btImg.setSize(32, 32)
    btImg.source('/app/code/resource/image/popup/icon_bluetooth_white_32.png')
    btImg.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const dots = dxui.Label.build('p1_popup3_dots', p3)
    dots.text('•••')
    dots.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD))
    dots.textColor(0x86efac)
    dots.align(dxui.Utils.ALIGN.CENTER, 0, 18)
    const dotFrames = ['•', '••', '•••', '••', '•']
    let dotIdx = 0
    std.setInterval(() => {
      dotIdx = (dotIdx + 1) % dotFrames.length
      dots.text(dotFrames[dotIdx])
    }, 240, true)

    const car = dxui.View.build('p1_popup3_car', p3)
    car.setSize(72, 52)
    car.radius(10)
    car.borderWidth(0)
    car.bgColor(0xffffff)
    car.scroll(false)
    car.align(dxui.Utils.ALIGN.CENTER, 100, 4)
    const carImg = dxui.Image.build('p1_popup3_car_img', car)
    carImg.setSize(72, 48)
    carImg.source('/app/code/resource/image/popup/icon_car_green.png')
    carImg.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const btnW = 132
    const btnH = 46

    const p3BtnL = dxui.View.build('p1_popup3_btn_l', p3)
    p3BtnL.setSize(btnW, btnH)
    p3BtnL.radius(23)
    p3BtnL.borderWidth(2)
    p3BtnL.setBorderColor(0xd1d5db)
    p3BtnL.bgColor(0xffffff)
    p3BtnL.scroll(false)
    p3BtnL.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 0, 0)
    const p3BtnLT = dxui.Label.build('p1_popup3_btn_l_t', p3BtnL)
    p3BtnLT.text('No')
    p3BtnLT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p3BtnLT.textColor(0x111111)
    p3BtnLT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p3BtnR = dxui.View.build('p1_popup3_btn_r', p3)
    p3BtnR.setSize(btnW, btnH)
    p3BtnR.radius(23)
    p3BtnR.borderWidth(0)
    p3BtnR.bgColor(0x22c55e)
    p3BtnR.scroll(false)
    p3BtnR.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, 0, 0)
    const p3BtnRT = dxui.Label.build('p1_popup3_btn_r_t', p3BtnR)
    p3BtnRT.text('Yes')
    p3BtnRT.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD))
    p3BtnRT.textColor(0xffffff)
    p3BtnRT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const popups = [p1, p2, p3]
    function shuffledIndices() {
      const arr = [0, 1, 2]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = arr[i]
        arr[i] = arr[j]
        arr[j] = t
      }
      return arr
    }
    let pickQueue = shuffledIndices()
    let hiding = false
    std.setInterval(() => {
      if (hiding) return
      hiding = true
      if (pickQueue.length === 0) pickQueue = shuffledIndices()
      const idx = pickQueue.pop()
      const target = popups[idx]
      target.hide()
      std.setTimeout(() => {
        target.show()
        hiding = false
      }, 3000)
    }, 5000)

    root.hide()
    return root
  }
}

export default page1
