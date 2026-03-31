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
  d.bgColor(0xe5e7eb)
  return d
}

function card(id, parent, w, h, x, y) {
  const c = dxui.View.build(id, parent)
  c.setSize(w, h)
  c.setPos(x, y)
  c.radius(14)
  c.borderWidth(0)
  c.padAll(16)
  c.scroll(false)
  c.bgColor(0xffffff)
  return c
}

function imageBox(id, parent, w, h, x, y, source) {
  const box = dxui.View.build(id, parent)
  box.setSize(w, h)
  box.setPos(x, y)
  box.radius(0)
  box.borderWidth(0)
  box.padAll(0)
  box.scroll(false)
  box.bgOpa(0)

  const img = dxui.Image.build(id + '_img', box)
  img.setSize(w, h)
  img.source(source)
  img.align(dxui.Utils.ALIGN.CENTER, 0, 0)
  return box
}

const page2 = {
  init: function () {
    const parent = UIManager.getRoot()
    const W = dxDriver.DISPLAY.HEIGHT
    const H = dxDriver.DISPLAY.WIDTH

    const root = dxui.View.build('page2_root', parent)
    root.setSize(W, H)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.bgColor(0x6b778a)

    const marginX = 26
    const topY = 88
    const gapY = 22
    const cardW = W - marginX * 2
    const firstH = 390
    const secondH = 500

    const title = dxui.Label.build('p2_title', root)
    title.text('Popup Showcase (2)')
    title.textFont(UIManager.font(26, dxui.Utils.FONT_STYLE.BOLD))
    title.textColor(0xffffff)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 24)

    // Popup 1 (old Popup 2): invite team
    const p1 = card('p2_popup1', root, cardW, firstH, marginX, topY)

    imageBox('p2_av1', p1, 52, 52, Math.floor(cardW / 2) - 76, 0, '/app/code/resource/image/avator-04.png')
    imageBox('p2_av2', p1, 56, 56, Math.floor(cardW / 2) - 28, -2, '/app/code/resource/image/avator-09.png')
    imageBox('p2_av3', p1, 52, 52, Math.floor(cardW / 2) + 24, 0, '/app/code/resource/image/avator-10.png')

    const p1Title = dxui.Label.build('p2_popup1_title', p1)
    p1Title.text('Invite your team')
    p1Title.textFont(UIManager.font(34, dxui.Utils.FONT_STYLE.BOLD))
    p1Title.textColor(0x111827)
    p1Title.align(dxui.Utils.ALIGN.TOP_MID, 0, 62)

    const p1Desc = dxui.Label.build('p2_popup1_desc', p1)
    p1Desc.setSize(cardW - 42, 58)
    p1Desc.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
    p1Desc.text('You\'ve created a new project! Invite colleagues to collaborate on this project.')
    p1Desc.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.NORMAL))
    p1Desc.textColor(0x6b7280)
    p1Desc.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 104)

    const p1LinkLabel = dxui.Label.build('p2_popup1_link_label', p1)
    p1LinkLabel.text('Share link')
    p1LinkLabel.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.BOLD))
    p1LinkLabel.textColor(0x374151)
    p1LinkLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 166)

    const p1Input = dxui.View.build('p2_popup1_input', p1)
    p1Input.setSize(cardW - 88, 52)
    p1Input.radius(10)
    p1Input.borderWidth(2)
    p1Input.setBorderColor(0xe5e7eb)
    p1Input.bgColor(0xf9fafb)
    p1Input.scroll(false)
    p1Input.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 196)
    const p1InputText = dxui.Label.build('p2_popup1_input_text', p1Input)
    p1InputText.text('join.untitledui.com/project')
    p1InputText.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL))
    p1InputText.textColor(0x4b5563)
    p1InputText.align(dxui.Utils.ALIGN.CENTER, -20, 0)

    const p1Copy = dxui.Label.build('p2_popup1_copy', p1)
    p1Copy.text('⧉')
    p1Copy.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.NORMAL))
    p1Copy.textColor(0x9ca3af)
    p1Copy.align(dxui.Utils.ALIGN.TOP_RIGHT, -8, 206)

    const p1Div = dividerH('p2_popup1_div', p1, cardW)
    p1Div.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -64)

    const p1BtnW = 180
    const p1BtnGap = 14
    const p1BtnStartX = Math.floor((cardW - (p1BtnW * 2 + p1BtnGap)) / 2)
    const p1BtnY = firstH - 68
    const p1BtnL = dxui.View.build('p2_popup1_btn_l', p1)
    p1BtnL.setSize(p1BtnW, 44)
    p1BtnL.radius(10)
    p1BtnL.borderWidth(2)
    p1BtnL.setBorderColor(0xe5e7eb)
    p1BtnL.bgColor(0xffffff)
    p1BtnL.scroll(false)
    p1BtnL.setPos(p1BtnStartX, p1BtnY)
    const p1BtnLT = dxui.Label.build('p2_popup1_btn_l_t', p1BtnL)
    p1BtnLT.text('Cancel')
    p1BtnLT.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    p1BtnLT.textColor(0x4b5563)
    p1BtnLT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p1BtnR = dxui.View.build('p2_popup1_btn_r', p1)
    p1BtnR.setSize(p1BtnW, 44)
    p1BtnR.radius(10)
    p1BtnR.borderWidth(0)
    p1BtnR.bgColor(0x7c3aed)
    p1BtnR.scroll(false)
    p1BtnR.setPos(p1BtnStartX + p1BtnW + p1BtnGap, p1BtnY)
    const p1BtnRT = dxui.Label.build('p2_popup1_btn_r_t', p1BtnR)
    p1BtnRT.text('Confirm')
    p1BtnRT.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    p1BtnRT.textColor(0xffffff)
    p1BtnRT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // Popup 2 (old Popup 3): verification code
    const p2Y = topY + firstH + gapY
    const p2 = card('p2_popup2', root, cardW, secondH, marginX, p2Y)

    const p2IconBg = dxui.View.build('p2_popup2_icon_bg', p2)
    p2IconBg.setSize(56, 56)
    p2IconBg.radius(28)
    p2IconBg.borderWidth(0)
    p2IconBg.bgColor(0xf3e8ff)
    p2IconBg.scroll(false)
    p2IconBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    const p2IconWrap = dxui.View.build('p2_popup2_icon_wrap', p2IconBg)
    p2IconWrap.setSize(24, 24)
    p2IconWrap.radius(0)
    p2IconWrap.borderWidth(0)
    p2IconWrap.padAll(0)
    p2IconWrap.scroll(false)
    p2IconWrap.bgOpa(0)
    p2IconWrap.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    const p2Icon = dxui.Image.build('p2_popup2_icon', p2IconWrap)
    p2Icon.setSize(24, 24)
    p2Icon.source('/app/code/resource/image/email.png')
    p2Icon.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p2Close = dxui.Label.build('p2_popup2_close', p2)
    p2Close.text('×')
    p2Close.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.NORMAL))
    p2Close.textColor(0x9ca3af)
    p2Close.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, -4)

    const p2Title = dxui.Label.build('p2_popup2_title', p2)
    p2Title.text('Please check your email.')
    p2Title.textFont(UIManager.font(34, dxui.Utils.FONT_STYLE.BOLD))
    p2Title.textColor(0x111827)
    p2Title.align(dxui.Utils.ALIGN.TOP_MID, 0, 64)

    const p2Desc = dxui.Label.build('p2_popup2_desc', p2)
    p2Desc.setSize(cardW - 32, 52)
    p2Desc.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
    p2Desc.text('We\'ve sent a code to olivia@untitledui.com')
    p2Desc.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.NORMAL))
    p2Desc.textColor(0x6b7280)
    p2Desc.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 106)

    function codeBox(id, parentObj, x, txt) {
      const b = dxui.View.build(id, parentObj)
      b.setSize(66, 66)
      b.radius(10)
      b.borderWidth(3)
      b.setBorderColor(0x8b5cf6)
      b.bgColor(0xffffff)
      b.scroll(false)
      b.setPos(x, 168)
      const t = dxui.Label.build(id + '_t', b)
      t.text(txt)
      t.textFont(UIManager.font(50, dxui.Utils.FONT_STYLE.BOLD))
      t.textColor(0x7c3aed)
      t.align(dxui.Utils.ALIGN.CENTER, 0, -4)
      return { box: b, label: t, flipping: false }
    }

    const codeGap = 12
    const codeW = 66
    const codeGroupW = codeW * 4 + codeGap * 3
    const codeStartX = Math.floor((cardW - codeGroupW) / 2)
    const codeItems = [
      codeBox('p2_popup2_code1', p2, codeStartX + (codeW + codeGap) * 0, '3'),
      codeBox('p2_popup2_code2', p2, codeStartX + (codeW + codeGap) * 1, '0'),
      codeBox('p2_popup2_code3', p2, codeStartX + (codeW + codeGap) * 2, '6'),
      codeBox('p2_popup2_code4', p2, codeStartX + (codeW + codeGap) * 3, '6')
    ]
    const animCtx = {}
    function flipDigit(item, idx) {
      if (item.flipping) return
      item.flipping = true
      const next = String(Math.floor(Math.random() * 10))
      animCtx['codeOut' + idx] = dxui.Utils.anime(item.label, -4, -26, (obj, v) => {
        obj.align(dxui.Utils.ALIGN.CENTER, 0, Math.floor(v))
      }, 150, null, null, 'ease_in')
      std.setTimeout(() => {
        item.label.text(next)
        animCtx['codeIn' + idx] = dxui.Utils.anime(item.label, 24, -4, (obj, v) => {
          obj.align(dxui.Utils.ALIGN.CENTER, 0, Math.floor(v))
        }, 170, null, null, 'ease_out')
        std.setTimeout(() => {
          item.label.align(dxui.Utils.ALIGN.CENTER, 0, -4)
          item.flipping = false
        }, 180)
      }, 150)
    }
    std.setInterval(() => {
      const idx = Math.floor(Math.random() * codeItems.length)
      flipDigit(codeItems[idx], idx)
    }, 1000, true)

    const p2Resend = dxui.Label.build('p2_popup2_resend', p2)
    p2Resend.text('Didn\'t get a code? Click to resend.')
    p2Resend.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.NORMAL))
    p2Resend.textColor(0x6b7280)
    p2Resend.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 246)

    const p2Confirm = dxui.View.build('p2_popup2_btn_confirm', p2)
    p2Confirm.setSize(cardW - 130, 48)
    p2Confirm.radius(12)
    p2Confirm.borderWidth(0)
    p2Confirm.bgColor(0x7c3aed)
    p2Confirm.scroll(false)
    p2Confirm.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -72)
    const p2ConfirmT = dxui.Label.build('p2_popup2_btn_confirm_t', p2Confirm)
    p2ConfirmT.text('Confirm')
    p2ConfirmT.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    p2ConfirmT.textColor(0xffffff)
    p2ConfirmT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const p2Cancel = dxui.View.build('p2_popup2_btn_cancel', p2)
    p2Cancel.setSize(cardW - 130, 46)
    p2Cancel.radius(12)
    p2Cancel.borderWidth(2)
    p2Cancel.setBorderColor(0xe5e7eb)
    p2Cancel.bgColor(0xffffff)
    p2Cancel.scroll(false)
    p2Cancel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -14)
    const p2CancelT = dxui.Label.build('p2_popup2_btn_cancel_t', p2Cancel)
    p2CancelT.text('Cancel')
    p2CancelT.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    p2CancelT.textColor(0x4b5563)
    p2CancelT.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const popupOrder = [p1, p2]
    let popupIdx = 0
    let hiding = false
    std.setInterval(() => {
      if (hiding) return
      hiding = true
      const target = popupOrder[popupIdx]
      popupIdx = (popupIdx + 1) % popupOrder.length
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

export default page2
