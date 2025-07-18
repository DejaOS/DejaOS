import * as os from "os"
import dxui from '../../dxmodules/dxUi.js'
import dxMap from '../../dxmodules/dxMap.js'
import screen from '../screen.js'
import pinyin from './pinyin/pinyin.js'
// import utils from "../common/utils/utils.js"
import i18n from "./i18n.js"
import std from '../../dxmodules/dxStd.js'

const viewUtils = {}

viewUtils.font = function (size, style) {
    return dxui.Font.build('/app/code/resource/font/AlibabaPuHuiTi-2-65-Medium.ttf', size || 14, style || dxui.Utils.FONT_STYLE.NORMAL)
}

// 语义化颜色
viewUtils.color = {
    // 成功，绿色
    success: 0x00BF8A,
    // 失败，红色
    fail: 0xFF0000,
    // 警告，黄色
    warning: 0xFFA800,
    // 默认：蓝色
    default: 0x00a8ff
}

// 清除样式
viewUtils._clearStyle = function (obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}

// 图片按钮封装，按钮根据图片大小设置，矩形
viewUtils.imageBtn = function (parent, id, src, dataI18n, textColor) {
    const zoom = 1.02

    const imageBox = dxui.View.build(id, parent)
    viewUtils._clearStyle(imageBox)
    imageBox.bgOpa(0)

    const image = dxui.Image.build(id + 'image', imageBox)
    image.source(src)
    image.update()
    const width = image.width()
    const height = image.height()
    imageBox.setSize(width * zoom + 5, height * zoom + 5)
    imageBox.scroll(false)
    image.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    if (dataI18n) {
        const textLbl = dxui.Label.build(id + 'text', image)
        textLbl.textFont(viewUtils.font(Math.round(height / 3)))
        if (textColor !== undefined && textColor !== null) {
            textLbl.textColor(textColor)
        } else {
            textLbl.textColor(0xffffff)
        }
        textLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
        textLbl.dataI18n = dataI18n
    }

    imageBox.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        image.obj.lvImgSetZoom(256 * zoom)
    })

    imageBox.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
        image.obj.lvImgSetZoom(256)
    })

    return imageBox
}

// 创建标题栏
viewUtils.title = function (parent, backScreen, id, dataI18n, backCb) {
    const titleBox = dxui.View.build(id, parent)
    viewUtils._clearStyle(titleBox)
    titleBox.setSize(800, 70)
    titleBox.bgColor(0xffffff)

    if (dataI18n) {
        const titleLbl = dxui.Label.build(id + 'title', titleBox)
        titleLbl.textFont(viewUtils.font(32))
        titleLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
        titleLbl.dataI18n = dataI18n
    }

    const back = viewUtils.imageBtn(titleBox, id + 'back', '/app/code/resource/image/back.png')
    back.setSize(80, 70)
    back.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)

    back.on(dxui.Utils.EVENT.CLICK, () => {
        if (backScreen) {
            dxui.loadMain(backScreen)
        }
        if (backCb) {
            backCb()
        }
    })

    return titleBox
}

// 输入框
viewUtils.input = function (parent, id, mode, enter = () => { }, dataI18n) {
    const input = dxui.Textarea.build(id + 'input', parent)
    viewUtils._clearStyle(input)
    input.align(dxui.Utils.ALIGN.TOP_MID, 0, 100)
    input.textAlign(dxui.Utils.TEXT_ALIGN.LEFT_MID)
    input.setOneLine(true)
    input.borderWidth(2)
    input.setBorderColor(0xE7E7E7)
    const font = viewUtils.font(26)
    const superSetSize = input.setSize
    input.setSize = (width, height) => {
        superSetSize.call(input, width, height)
        input.padAll((height - 4 - font.obj.lvFontGetLineHeight()) / 2)
        input.padLeft(30)
        input.padRight(30)
    }
    input.setSize(650, 100)
    input.radius(13)
    input.textFont(font)
    if (dataI18n) {
        // 只有在dxui.all中，才能使用dataI18n
        dxui.all[id + 'input' + 'obj'] = input.obj
        input.obj.dataI18n = dataI18n
        input.obj.text = (text) => {
            input.obj.lvTextareaSetPlaceholderText(text)
        }
    }

    input.on(dxui.Utils.EVENT.CLICK, () => {
        input.setBorderColor(0x3670f7)
        pinyin.show(mode || pinyin.getMode(), (data) => {
            if (typeof data == 'string') {
                input.lvTextareaAddText(data)
            } else if (typeof data == 'object') {
                switch (data.cmd) {
                    case 'enter':
                        enter()
                        pinyin.hide()
                        break
                    case 'backspace':
                        input.lvTextareaDelChar()
                        break
                }
            }
        })
        if (mode) {
            pinyin.lock()
        }
    })
    input.on(dxui.Utils.EVENT.DEFOCUSED, () => {
        dxMap.get("INPUT_KEYBOARD").put("defocus", "defocus")
    })

    let root = parent
    let rootId = parent.id
    while ((rootId = dxui.all[rootId].parent) != "0") {
        root = dxui.all[rootId]
    }

    root.on(dxui.Utils.EVENT.CLICK, () => {
        input.setBorderColor(0xE7E7E7)
        // pinyin.hide()
    })

    root.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        input.setBorderColor(0xE7E7E7)
        // pinyin.hide()
        input.text('')
    })
    return input
}

// 确认弹窗
viewUtils.confirmInit = function () {
    const confirm = dxui.View.build('confirm', dxui.Utils.LAYER.TOP)
    viewUtils._clearStyle(confirm)
    confirm.setSize(screen.screenSize.width, screen.screenSize.height)
    confirm.bgColor(0x0)
    confirm.bgOpa(50)
    confirm.hide()

    const box = dxui.View.build('confirmBox', confirm)
    viewUtils._clearStyle(box)
    box.setSize(500, 300)
    box.radius(20)
    box.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    box.bgColor(0xffffff)

    const title = dxui.Label.build('confirmTitle', box)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 22)
    title.textFont(viewUtils.font(30))
    title.text("Confirm")

    const close = viewUtils.imageBtn(box, 'confirmClose', '/app/code/resource/image/close_small.png')
    close.align(dxui.Utils.ALIGN.TOP_RIGHT, -28, 18)

    const content = dxui.Label.build('confirmContent', box)
    content.align(dxui.Utils.ALIGN.TOP_MID, 0, 114)
    content.textFont(viewUtils.font(24))
    content.textColor(0x767676)
    content.text("Are you sure you want to exit?")
    content.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)

    const ok = dxui.Button.build('okBtn', box)
    ok.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 69, -31)
    ok.bgColor(0x0)
    ok.radius(10)
    ok.setSize(150, 50)
    const okLbl = dxui.Label.build('okLbl', ok)
    okLbl.textFont(viewUtils.font(26))
    okLbl.dataI18n = 'confirm.ok'
    okLbl.textColor(0xffffff)
    okLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    ok.on(dxui.Utils.EVENT.CLICK, () => {
        confirm.hide()
        if (typeof viewUtils.confirm.okFunc == 'function') {
            viewUtils.confirm.okFunc()
        }
    })

    const no = dxui.Button.build('noBtn', box)
    no.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -69, -31)
    no.bgColor(0xF3F3F3)
    no.radius(10)
    no.setSize(150, 50)
    const noLbl = dxui.Label.build('noLbl', no)
    noLbl.textFont(viewUtils.font(26))
    noLbl.dataI18n = 'confirm.no'
    noLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    noLbl.textColor(0x0)
    no.on(dxui.Utils.EVENT.CLICK, () => {
        confirm.hide()
    })

    close.on(dxui.Utils.EVENT.CLICK, () => {
        confirm.hide()
        if (typeof viewUtils.confirm.noFunc == 'function') {
            viewUtils.confirm.noFunc()
        }
    })
    viewUtils.confirm = { confirm, box, title, close, content, ok, no, okLbl, noLbl }
}

viewUtils.confirmClose = function () {
    viewUtils.confirm.confirm.hide()
}

viewUtils.confirmOpen = function (title, content, ok, no) {
    viewUtils.confirm.confirm.moveForeground()
    viewUtils.confirm.title.dataI18n = title
    viewUtils.confirm.content.dataI18n = content
    if (ok) {
        viewUtils.confirm.ok.show()
        viewUtils.confirm.okFunc = ok
    } else {
        viewUtils.confirm.ok.hide()
    }
    if (no) {
        viewUtils.confirm.no.show()
        viewUtils.confirm.noFunc = no
    } else {
        viewUtils.confirm.no.hide()
    }
    viewUtils.confirm.confirm.show()
    i18n.refreshObj(viewUtils.confirm.title)
    i18n.refreshObj(viewUtils.confirm.content)
    viewUtils.confirm.content.update()
    viewUtils.confirm.box.height(viewUtils.confirm.content.height() + 257)
}


viewUtils.bottomBtn = function (parent, id, dataI18n, click, btnColor = 0x000000, textColor = 0xffffff, fontSize = 28) {
    const btn = dxui.Button.build(id, parent)
    btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -124)
    btn.bgColor(btnColor)
    btn.setSize(620, 100)
    btn.radius(60)
    const btnLbl = dxui.Label.build(id + 'lbl', btn)
    btnLbl.dataI18n = dataI18n
    btnLbl.textFont(viewUtils.font(fontSize))
    btnLbl.textColor(textColor)
    btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    btn.on(dxui.Utils.EVENT.CLICK, click)
    return btn
}

// 循环滚动
viewUtils.cycleList = function (parent, id, size, maxNum, template = () => { }, update = () => { }) {
    const cycleList = dxui.View.build(id, parent)
    viewUtils._clearStyle(cycleList)
    cycleList.setSize(size[0], size[1])
    cycleList.cycleList = []
    cycleList.cycleIndex = 0
    for (let i = -1; i < (maxNum + 1); i++) {
        const cycleItem = dxui.View.build(id + 'item' + i, cycleList)
        viewUtils._clearStyle(cycleItem)
        cycleItem.setSize(size[0], size[1] / maxNum)
        cycleItem.bgOpa(0)
        cycleItem.borderWidth(1)
        cycleItem.setBorderColor(0xDEDEDE)
        cycleItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        cycleItem.userdata = template(cycleItem)
        cycleList.cycleIndex = i
        update(cycleItem.userdata, i)
        if (cycleList.cycleList.length > 0) {
            cycleItem.alignTo(cycleList.cycleList[cycleList.cycleList.length - 1], dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
        } else {
            cycleItem.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
        }
        cycleList.cycleList.push(cycleItem)
    }
    cycleList.scrollToY(size[1] / maxNum, false)

    cycleList.on(dxui.Utils.ENUM.LV_EVENT_SCROLL, () => {
        if (cycleList.scrollTop() >= size[1] / maxNum * 2) {
            const cycleItem = cycleList.cycleList.shift()
            cycleList.cycleList.push(cycleItem)
            for (let i = 0; i < cycleList.cycleList.length; i++) {
                const item = cycleList.cycleList[i]
                if (i == 0) {
                    item.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
                } else {
                    item.alignTo(cycleList.cycleList[i - 1], dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
                }
            }
            cycleList.cycleIndex += 1
            update(cycleItem.userdata, cycleList.cycleIndex)
            cycleList.scrollToY(size[1] / maxNum, false)
        } else if (cycleList.scrollTop() <= 0) {
            const cycleItem = cycleList.cycleList.pop()
            cycleList.cycleList.unshift(cycleItem)
            for (let i = 0; i < cycleList.cycleList.length; i++) {
                const item = cycleList.cycleList[i]
                if (i == 0) {
                    item.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
                } else {
                    item.alignTo(cycleList.cycleList[i - 1], dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
                }
            }
            cycleList.cycleIndex -= 1
            update(cycleItem.userdata, cycleList.cycleIndex)
            cycleList.scrollToY(size[1] / maxNum, false)
        }
    })
    cycleList.refresh = () => {
        cycleList.cycleList.forEach((item, index) => {
            update(item.userdata, index)
        })
    }
    return cycleList
}

viewUtils.statusPanel = function (parent, successI18n, failI18n) {
    const successBg = dxui.Image.build(parent.id + 'successBg', parent)
    successBg.source('/app/code/resource/image/successBg.png')
    successBg.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    successBg.hide()

    const successIcon = dxui.Image.build(parent.id + 'successIcon', successBg)
    successIcon.source('/app/code/resource/image/success_fill.png')
    successIcon.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const successLbl = dxui.Label.build(parent.id + 'successLbl', successBg)
    successLbl.textFont(viewUtils.font(38))
    successLbl.textColor(0xffffff)
    successLbl.dataI18n = successI18n
    successLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 244)

    const failBg = dxui.Image.build(parent.id + 'failBg', parent)
    failBg.source('/app/code/resource/image/failBg.png')
    failBg.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    failBg.hide()

    const failIcon = dxui.Image.build(parent.id + 'failIcon', failBg)
    failIcon.source('/app/code/resource/image/delete_fill.png')
    failIcon.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const failLbl = dxui.Label.build(parent.id + 'failLbl', failBg)
    failLbl.textFont(viewUtils.font(38))
    failLbl.textColor(0xffffff)
    failLbl.dataI18n = failI18n
    failLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 244)

    return {
        success: (dataI18n) => {
            if (dataI18n) {
                successLbl.dataI18n = dataI18n
                i18n.refreshObj(successLbl)
            }
            successBg.show()
            failBg.hide()
            std.setTimeout(() => {
                successBg.hide()
            }, 2000)
        },
        fail: (dataI18n) => {
            if (dataI18n) {
                failLbl.dataI18n = dataI18n
                i18n.refreshObj(failLbl)
            }
            failBg.show()
            successBg.hide()
            std.setTimeout(() => {
                failBg.hide()
            }, 2000)
        },
    }
}

export default viewUtils