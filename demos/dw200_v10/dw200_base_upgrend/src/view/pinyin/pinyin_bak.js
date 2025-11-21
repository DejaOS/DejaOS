import dxui from '../../../dxmodules/dxUi.js'
import dict from './dict.js'
const pinyin = {}

// Keyboard size
let width = 800
let height = 400
// Whether keyboard is locked
let isLock = false
// Whether pinyin input is supported
let enablePinyin = true
// Initialize container
pinyin.init = function (w, h) {
    width = w
    height = h

    // Only allow initialization once
    if (pinyin.inited) {
        return
    }
    pinyin.inited = true
    // Global font
    pinyin.font24 = dxui.Font.build('/app/code/resource/font/AlibabaPuHuiTi-2-65-Medium.ttf', 24, dxui.Utils.FONT_STYLE.NORMAL)
    let container = dxui.View.build('container', dxui.Utils.LAYER.TOP)
    pinyin.container = container
    clearStyle(container)
    container.obj.lvObjAddFlag(dxui.Utils.ENUM.LV_OBJ_FLAG_OVERFLOW_VISIBLE)
    container.setSize(width, height)
    container.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    container.textFont(pinyin.font24)
    // Container initialization
    container.bgOpa(0)
    container.update()
    container.hide()
    // Create three keyboard modes
    pinyin.englishPanel = createEnglish()
    pinyin.pinyinPanel = createPinyin()
    pinyin.numPanel = createNum()
    pinyin.symbolPanel = createSymbol()
}
pinyin.getSize = function () {
    return { width: width, height: height }
}
/**
 * Show keyboard, must initialize first
 * @param {number} mode Keyboard mode, 0: English keyboard, 1: Pinyin keyboard, 2: Number keyboard, 3: Symbol keyboard
 * @param {function} cb Key press content callback
 */
pinyin.show = function (mode, cb) {
    if (![0, 1, 2, 3].includes(mode)) {
        return
    }
    this.unlock()
    this.hide()
    // Key press content callback
    pinyin.cb = cb
    pinyin.container.show()
    pinyin.container.moveForeground()
    switch (mode) {
        case 0:
            pinyin.englishPanel.show()
            break;
        case 1:
            pinyin.pinyinPanel.show()
            break;
        case 2:
            pinyin.numPanel.show()
            break;
        case 3:
            pinyin.symbolPanel.show()
            break;
        default:
            break;
    }
}
// Get current keyboard mode
pinyin.getMode = function () {
    if (!pinyin.englishPanel.isHide()) {
        return 0
    } else if (!pinyin.pinyinPanel.isHide()) {
        return 1
    } else if (!pinyin.numPanel.isHide()) {
        return 2
    } else if (!pinyin.symbolPanel.isHide()) {
        return 3
    } else {
        return 0
    }
}
// Hide keyboard
pinyin.hide = function () {
    pinyin.englishPanel.hide()
    pinyin.pinyinPanel.hide()
    pinyin.numPanel.hide()
    pinyin.symbolPanel.hide()
    pinyin.container.hide()
    if (pinyin.callback) {
        pinyin.callback()
        pinyin.callback = null
    }
}
// Hide callback, single use only
pinyin.hideCb = function (cb) {
    pinyin.callback = cb
}
// Lock keyboard, mode switching not allowed
pinyin.lock = function () {
    isLock = true
}
// Unlock keyboard
pinyin.unlock = function () {
    isLock = false
}
pinyin.pinyinSupport = function (bool) {
    enablePinyin = bool
}

// English keyboard
function createEnglish() {
    let englishPanel = dxui.View.build(pinyin.container.id + 'englishPanel', pinyin.container)
    clearStyle(englishPanel)
    englishPanel.setSize(pinyin.container.width(), pinyin.container.height())
    englishPanel.update()
    // Create uppercase and lowercase English keyboard
    function createKeyboard(capital) {
        let englishKeyboard = dxui.Buttons.build(englishPanel.id + 'englishKeyboard' + (capital ? "Big" : "Small"), englishPanel)
        clearStyle(englishKeyboard)
        englishKeyboard.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
        englishKeyboard.padAll(10)
        englishKeyboard.bgColor(0xffffff, dxui.Utils.STYLE_PART.ITEMS)
        englishKeyboard.bgColor(0xe6e6e6)
        englishKeyboard.setSize(englishPanel.width(), englishPanel.height())
        englishKeyboard.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
        if (capital) {
            englishKeyboard.data([
                "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\n",
                " ", "A", "S", "D", "F", "G", "H", "J", "K", "L", " ", "\n",
                "↓", "Z", "X", "C", "V", "B", "N", "M", " ", "\n",
                "!?#", "123", ",", " ", ".", "EN", " ",
                ""])
        } else {
            englishKeyboard.data([
                "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "\n",
                " ", "a", "s", "d", "f", "g", "h", "j", "k", "l", " ", "\n",
                "↑", "z", "x", "c", "v", "b", "n", "m", " ", "\n",
                "!?#", "123", ",", " ", ".", "EN", " ",
                ""])
        }
        // Set button width
        englishKeyboard.setBtnWidth(10, 1)
        for (let i = 11; i < 20; i++) {
            englishKeyboard.setBtnWidth(i, 2)
        }
        englishKeyboard.setBtnWidth(20, 1)
        englishKeyboard.setBtnWidth(21, 3)
        for (let i = 22; i < 29; i++) {
            englishKeyboard.setBtnWidth(i, 2)
        }
        englishKeyboard.setBtnWidth(29, 3)
        englishKeyboard.obj.addEventCb((e) => {
            let dsc = e.lvEventGetDrawPartDsc()
            if (dsc.class_p == englishKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
                // Hide unused buttons
                if (dsc.id == 10 || dsc.id == 20) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
                }
                // Darken some function buttons
                if (dsc.id == 21 || dsc.id == 29 || dsc.id == 30 || dsc.id == 31 || dsc.id == 35) {
                    if (englishKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xcdcdcd })
                    } else {
                        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xdbdbdb })
                    }
                }
                // Enter button blue
                if (dsc.id == 36) {
                    if (englishKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C6CE4 })
                    } else {
                        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C78FE })
                    }
                }
            }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
        englishKeyboard.obj.addEventCb((e) => {
            let dsc = e.lvEventGetDrawPartDsc()
            if (dsc.class_p == englishKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
                // Add delete button icon
                if (dsc.id == 29) {
                    let src = '/app/code/resource/image/key/backspace.png'
                    // Get image information
                    let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                    // Define an area, center display, note: size to area needs -1, area to size needs +1
                    let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                    let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                    let x2 = x1 + header.w - 1;
                    let y2 = y1 + header.h - 1;
                    let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                    // Draw image information
                    let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                    // Draw image
                    dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
                }
                // Add enter button icon
                if (dsc.id == 36) {
                    let src = '/app/code/resource/image/key/enter.png'
                    // Get image information
                    let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                    // Define an area, center display, note: size to area needs -1, area to size needs +1
                    let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                    let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                    let x2 = x1 + header.w - 1;
                    let y2 = y1 + header.h - 1;
                    let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                    // Draw image information
                    let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                    // Draw image
                    dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
                }
                // Add space button icon
                if (dsc.id == 33) {
                    let src = '/app/code/resource/image/key/space.png'
                    // Get image information
                    let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                    // Define an area, center display, note: size to area needs -1, area to size needs +1
                    let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                    let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                    let x2 = x1 + header.w - 1;
                    let y2 = y1 + header.h - 1;
                    y1 += 10
                    y2 += 10
                    let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                    // Draw image information
                    let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                    // Draw image
                    dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
                }
            }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
        englishKeyboard.on(dxui.Utils.ENUM.LV_EVENT_LONG_PRESSED_REPEAT, () => {
            let clickBtn = englishKeyboard.clickedButton()
            let id = clickBtn.id
            switch (id) {
                case 29:
                    // Backspace
                    pinyin.cb({ cmd: "backspace" })
                    break;
            }
        })
        englishKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            let clickBtn = englishKeyboard.clickedButton()
            let id = clickBtn.id
            let text = clickBtn.text
            switch (id) {
                case 21:
                    // Case toggle
                    if (englishKeyboardBig.isHide()) {
                        englishKeyboardBig.show()
                        englishKeyboardSmall.hide()
                    } else {
                        englishKeyboardBig.hide()
                        englishKeyboardSmall.show()
                    }
                    break;
                case 29:
                    // Backspace
                    pinyin.cb({ cmd: "backspace" })
                    break;
                case 30:
                    if (isLock) {
                        break;
                    }
                    // Switch to symbol keyboard
                    pinyin.symbolPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 31:
                    if (isLock) {
                        break;
                    }
                    // Switch to number keyboard
                    pinyin.numPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 33:
                    // Space
                    pinyin.cb(" ")
                    break;
                case 35:
                    if (isLock || !enablePinyin) {
                        break;
                    }
                    // Switch to pinyin keyboard
                    pinyin.pinyinPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 36:
                    // Enter
                    pinyin.cb({ cmd: "enter" })
                    break;
                default:
                    break;
            }
            // Print character
            if (["q", "w", "e", "r", "t", "y", "u", "i", "o", "p",
                "a", "s", "d", "f", "g", "h", "j", "k", "l",
                "z", "x", "c", "v", "b", "n", "m",
                ",", "."].includes(text) || [
                    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
                    "A", "S", "D", "F", "G", "H", "J", "K", "L",
                    "Z", "X", "C", "V", "B", "N", "M",
                    ",", "."].includes(text)) {
                pinyin.cb(text)
            }
        })
        return englishKeyboard
    }
    // Create uppercase and lowercase keyboard
    let englishKeyboardBig = createKeyboard(true)
    let englishKeyboardSmall = createKeyboard(false)
    // Default is lowercase
    englishKeyboardBig.hide()
    englishKeyboardSmall.show()
    englishPanel.hide()
    return englishPanel
}

// Pinyin keyboard
function createPinyin() {
    let pinyinPanel = dxui.View.build(pinyin.container.id + 'pinyinPanel', pinyin.container)
    clearStyle(pinyinPanel)
    pinyinPanel.setSize(pinyin.container.width(), pinyin.container.height())
    pinyinPanel.obj.lvObjAddFlag(dxui.Utils.ENUM.LV_OBJ_FLAG_OVERFLOW_VISIBLE)
    pinyinPanel.update()
    // Create Chinese character preview box
    let previewBox = dxui.View.build(pinyinPanel.id + 'previewBox', pinyinPanel)
    clearStyle(previewBox)
    previewBox.setSize(pinyinPanel.width(), 70)
    previewBox.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -70)
    previewBox.padLeft(20)
    previewBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    previewBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    previewBox.labels = []
    // 8 preview characters
    for (let i = 0; i < 8; i++) {
        let labelBox = dxui.View.build(previewBox.id + 'labelBox' + i, previewBox)
        clearStyle(labelBox)
        labelBox.setSize(50, 70)
        labelBox.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            if (label.text() != " ") {
                labelBox.bgColor(0xe6e6e6)
            }
        })
        labelBox.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
            if (label.text() != " ") {
                labelBox.bgColor(0xffffff)
                pinyin.cb(label.text())
                // 清空拼音，还原状态
                phrase.text("")
                previewBox.fillData()
            }
        })
        let label = dxui.Label.build(labelBox.id + 'label' + i, labelBox)
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
        label.text(" ")
        previewBox.labels.push(label)
    }
    // 填充预览文字
    previewBox.fillData = (str) => {
        if (!str) {
            // str = "微光互联"
            str = ""
        }
        previewBox.characters = str
        for (let i = 0; i < 8; i++) {
            if (str.charAt(i)) {
                previewBox.labels[i].text(str.charAt(i))
            } else {
                previewBox.labels[i].text(" ")
            }
        }
        if (str.length > 8) {
            // 文字多于8个，展示更多文字按钮
            morePreview.show()
        } else {
            morePreview.hide()
        }
    }
    // 更多汉字预览按钮
    let morePreview = dxui.View.build(pinyinPanel.id + 'morePreview', pinyinPanel)
    clearStyle(morePreview)
    morePreview.setSize(70, 70)
    morePreview.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, -70)
    morePreview.hide()
    let rightBtn = dxui.Image.build(morePreview.id + 'rightBtn', morePreview)
    rightBtn.source('/app/code/resource/image/key/right.png')
    rightBtn.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    morePreview.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        morePreview.bgColor(0xe6e6e6)
    })
    morePreview.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
        morePreview.bgColor(0xffffff)
        morePreviewKeyboard.moveForeground()
        morePreviewKeyboard.fillData(0)
        morePreviewKeyboard.show()
    })
    // 初始状态
    previewBox.fillData()
    // 更多汉字面板
    let morePreviewKeyboard = dxui.Buttons.build(pinyinPanel.id + 'morePreviewKeyboard', pinyinPanel)
    clearStyle(morePreviewKeyboard)
    morePreviewKeyboard.setSize(pinyinPanel.width(), pinyinPanel.height())
    morePreviewKeyboard.hide()
    morePreviewKeyboard.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    morePreviewKeyboard.padAll(10)
    morePreviewKeyboard.bgColor(0xffffff, dxui.Utils.STYLE_PART.ITEMS)
    morePreviewKeyboard.bgColor(0xe6e6e6)
    morePreviewKeyboard.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    morePreviewKeyboard.data([
        " ", " ", " ", " ", " ", " ", " ", " ", "\n",
        " ", " ", " ", " ", " ", " ", " ", " ", "\n",
        " ", " ", " ", " ", " ", " ", " ", " ", "\n",
        " ", " ", " ", " ", " ", " ", " ", " ", "\n",
        "上一页", "返回", "下一页",
        ""])
    morePreviewKeyboard.index = 0
    // index:0第一页，1下一页，-1上一页
    morePreviewKeyboard.fillData = (index) => {
        if (index == 1 && previewBox.characters.charAt((morePreviewKeyboard.index + 1) * 32)) {
            morePreviewKeyboard.index += 1
        } else if (index == -1 && morePreviewKeyboard.index > 0) {
            morePreviewKeyboard.index -= 1
        } else {
            morePreviewKeyboard.index = 0
        }
        let temp = []
        for (let i = 0; i < 32; i++) {
            let character = previewBox.characters.charAt(i + morePreviewKeyboard.index * 32)
            if (character) {
                temp.push(character)
            } else {
                if (i == 0) {
                    // 无数据
                    return
                }
                temp.push(" ")
            }
            if ((i + 1) % 8 == 0) {
                temp.push("\n")
            }
        }
        temp.push("上一页")
        temp.push("返回")
        temp.push("下一页")
        temp.push("")
        morePreviewKeyboard.data(temp)
    }
    morePreviewKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == morePreviewKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 加深两个功能按钮
            if ([32, 33, 34].includes(dsc.id)) {
                if (morePreviewKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xcdcdcd })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xdbdbdb })
                }
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    morePreviewKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        let clickBtn = morePreviewKeyboard.clickedButton()
        let id = clickBtn.id
        let text = clickBtn.text
        if (text == "返回") {
            morePreviewKeyboard.hide()
        } else if (text == "上一页") {
            morePreviewKeyboard.fillData(-1)
        } else if (text == "下一页") {
            morePreviewKeyboard.fillData(1)
        } else if (text != " ") {
            pinyin.cb(text)
            // 清空拼音，还原状态
            phrase.text("")
            previewBox.fillData()
            morePreviewKeyboard.hide()
        }
    })
    // 词组预览
    let phrasePreview = dxui.View.build(pinyinPanel.id + 'phrasePreview', pinyinPanel)
    clearStyle(phrasePreview)
    phrasePreview.setSize(70, 35)
    phrasePreview.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -105)
    phrasePreview.bgColor(0xe6e6e6)
    phrasePreview.hide()
    let phrase = dxui.Label.build(phrasePreview.id + 'phrase', phrasePreview)
    phrase.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    let overwrite = phrase.text
    phrase.text = (v) => {
        if (typeof v != 'string') {
            // 获取词组
            let temp = overwrite.call(phrase, v)
            temp = temp == "Text" ? "" : temp
            return temp
        }
        if (v.length == 0) {
            // 词组长度为0就隐藏
            overwrite.call(phrase, "Text")
            return phrasePreview.hide()
        }
        if (v.length > 10) {
            // 词组预览长度不超过10字符
            return
        }
        phrasePreview.show()
        overwrite.call(phrase, v)
        phrase.update()
        phrasePreview.width(phrase.width() + 40)
    }
    let overwrite1 = pinyinPanel.show
    pinyinPanel.show = () => {
        // 重写显示方法，显示汉字预览框
        previewBox.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -70)
        morePreview.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, -70)
        phrasePreview.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -105)
        overwrite1.call(pinyinPanel)
    }
    let overwrite2 = pinyinPanel.hide
    pinyinPanel.hide = () => {
        // 重写隐藏方法，隐藏汉字预览框
        previewBox.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)
        morePreview.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 0)
        phrasePreview.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)
        overwrite2.call(pinyinPanel)
    }
    // 创建拼音键盘
    let pinyinKeyboard = dxui.Buttons.build(pinyinPanel.id + 'pinyinKeyboard', pinyinPanel)
    clearStyle(pinyinKeyboard)
    pinyinKeyboard.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    pinyinKeyboard.padAll(10)
    pinyinKeyboard.bgColor(0xffffff, dxui.Utils.STYLE_PART.ITEMS)
    pinyinKeyboard.bgColor(0xe6e6e6)
    pinyinKeyboard.setSize(pinyinPanel.width(), pinyinPanel.height())
    pinyinKeyboard.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    pinyinKeyboard.data([
        "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "\n",
        " ", "a", "s", "d", "f", "g", "h", "j", "k", "l", " ", "\n",
        "分词", "z", "x", "c", "v", "b", "n", "m", " ", "\n",
        "!?#", "123", "，", " ", "。", "中", " ",
        ""])
    // 设置按钮宽度
    pinyinKeyboard.setBtnWidth(10, 1)
    for (let i = 11; i < 20; i++) {
        pinyinKeyboard.setBtnWidth(i, 2)
    }
    pinyinKeyboard.setBtnWidth(20, 1)
    pinyinKeyboard.setBtnWidth(21, 3)
    for (let i = 22; i < 29; i++) {
        pinyinKeyboard.setBtnWidth(i, 2)
    }
    pinyinKeyboard.setBtnWidth(29, 3)
    pinyinKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == pinyinKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 隐藏无用按钮
            if (dsc.id == 10 || dsc.id == 20) {
                dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
            }
            // 加深一些功能按钮
            if (dsc.id == 21 || dsc.id == 29 || dsc.id == 30 || dsc.id == 31 || dsc.id == 35) {
                if (pinyinKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xcdcdcd })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xdbdbdb })
                }
            }
            // 回车按钮蓝色
            if (dsc.id == 36) {
                if (pinyinKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C6CE4 })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C78FE })
                }
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    pinyinKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == pinyinKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 删除按钮图案添加
            if (dsc.id == 29) {
                let src = '/app/code/resource/image/key/backspace.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
            // 回车按钮图案添加
            if (dsc.id == 36) {
                let src = '/app/code/resource/image/key/enter.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
            // 空格按钮图案添加
            if (dsc.id == 33) {
                let src = '/app/code/resource/image/key/space.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                y1 += 10
                y2 += 10
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    // 查字典，根据输入内容查找
    function search() {
        // 输入的拼音
        let searchStr = phrase.text()
        if (searchStr.indexOf("'") >= 0) {
            searchStr = searchStr.substring(0, searchStr.indexOf("'"))
        }
        if (searchStr.length <= 0) {
            // 输入的拼音为空
            previewBox.fillData()
            return
        }
        let characters = ""
        let res = Object.keys(dict).filter(v => v.startsWith(searchStr))
        if (res.length > 0) {
            res.forEach(v => {
                characters += dict[v]
            })
        }
        previewBox.fillData(characters)
    }
    pinyinKeyboard.on(dxui.Utils.ENUM.LV_EVENT_LONG_PRESSED_REPEAT, () => {
        let clickBtn = pinyinKeyboard.clickedButton()
        let id = clickBtn.id
        switch (id) {
            case 29:
                // 退格，有词组先删除词组
                let temp = phrase.text()
                if (temp.length > 0) {
                    phrase.text(temp.substring(0, temp.length - 1))
                } else {
                    pinyin.cb({ cmd: "backspace" })
                }
                break;
        }
    })
    pinyinKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        let clickBtn = pinyinKeyboard.clickedButton()
        let id = clickBtn.id
        let text = clickBtn.text
        switch (id) {
            case 21:
                // 分词
                if (phrase.text().length != 0 && phrase.text().indexOf("'") < 0) {
                    phrase.text(phrase.text() + "'")
                }
                break;
            case 29:
                // 退格，有词组先删除词组
                let temp = phrase.text()
                if (temp.length > 0) {
                    phrase.text(temp.substring(0, temp.length - 1))
                } else {
                    pinyin.cb({ cmd: "backspace" })
                }
                break;
            case 30:
                if (isLock) {
                    break;
                }
                // 切换符号键盘
                pinyin.symbolPanel.show()
                pinyin.pinyinPanel.hide()
                break;
            case 31:
                if (isLock) {
                    break;
                }
                // 切换数字键盘
                pinyin.numPanel.show()
                pinyin.pinyinPanel.hide()
                break;
            case 33:
                // 空格
                pinyin.cb(" ")
                break;
            case 35:
                if (isLock) {
                    break;
                }
                // 切换英文键盘
                pinyin.englishPanel.show()
                pinyin.pinyinPanel.hide()
                break;
            case 36:
                if (phrase.text().length > 0) {
                    pinyin.cb(phrase.text())
                    phrase.text("")
                    previewBox.fillData()
                    break;
                }
                // 回车
                pinyin.cb({ cmd: "enter" })
                break;
            default:
                break;
        }
        // 打印字符
        if (["，", "。"].includes(text)) {
            pinyin.cb(text)
        }
        if (["q", "w", "e", "r", "t", "y", "u", "i", "o", "p",
            "a", "s", "d", "f", "g", "h", "j", "k", "l",
            "z", "x", "c", "v", "b", "n", "m"].includes(text) && phrase.text().indexOf("'") < 0) {
            phrase.text(phrase.text() + text)
        }
        search()
    })
    pinyinPanel.hide()
    return pinyinPanel
}

// 数字键盘
function createNum() {
    let numPanel = dxui.View.build(pinyin.container.id + 'numPanel', pinyin.container)
    clearStyle(numPanel)
    numPanel.setSize(pinyin.container.width(), pinyin.container.height())
    numPanel.update()
    // 创建数字键盘
    let numKeyboard = dxui.Buttons.build(numPanel.id + 'numKeyboard', numPanel)
    clearStyle(numKeyboard)
    numKeyboard.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    numKeyboard.padAll(10)
    numKeyboard.bgColor(0xffffff, dxui.Utils.STYLE_PART.ITEMS)
    numKeyboard.bgColor(0xe6e6e6)
    numKeyboard.setSize(numPanel.width(), numPanel.height())
    numKeyboard.data([
        "1", "2", "3", " ", "\n",
        "4", "5", "6", "+", "\n",
        "7", "8", "9", "-", "\n",
        "ABC", "0", ".", " ", "",
    ])
    numKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == numKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 加深两个功能按钮
            if ([3, 7, 11, 12, 14].includes(dsc.id)) {
                if (numKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xcdcdcd })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xdbdbdb })
                }
            }
            // 回车按钮蓝色
            if (dsc.id == 15) {
                if (numKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C6CE4 })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C78FE })
                }
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    numKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == numKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 删除按钮图案
            if (dsc.id == 3) {
                let src = '/app/code/resource/image/key/backspace.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
            if (dsc.id == 15) {
                let src = '/app/code/resource/image/key/enter.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    numKeyboard.on(dxui.Utils.ENUM.LV_EVENT_LONG_PRESSED_REPEAT, () => {
        let clickBtn = numKeyboard.clickedButton()
        let id = clickBtn.id
        switch (id) {
            case 3:
                // 退格
                pinyin.cb({ cmd: "backspace" })
                break;
        }
    })
    numKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        let clickBtn = numKeyboard.clickedButton()
        let id = clickBtn.id
        let text = clickBtn.text
        switch (id) {
            case 3:
                // 退格
                pinyin.cb({ cmd: "backspace" })
                break;
            case 12:
                if (isLock) {
                    break;
                }
                // 切换英文键盘
                pinyin.englishPanel.show()
                pinyin.numPanel.hide()
                break;
            case 15:
                // 回车
                pinyin.cb({ cmd: "enter" })
                break;
            default:
                break;
        }
        // 打印字符
        if (["1", "2", "3",
            "4", "5", "6", "+",
            "7", "8", "9", "-",
            "0", "."].includes(text)) {
            pinyin.cb(text)
        }
    })
    numPanel.hide()
    return numPanel
}

// 符号键盘
function createSymbol() {
    let symbolPanel = dxui.View.build(pinyin.container.id + 'symbolPanel', pinyin.container)
    clearStyle(symbolPanel)
    symbolPanel.setSize(pinyin.container.width(), pinyin.container.height())
    symbolPanel.update()
    // 创建符号键盘
    let symbolKeyboard = dxui.Buttons.build(symbolPanel.id + 'symbolKeyboard', symbolPanel)
    clearStyle(symbolKeyboard)
    symbolKeyboard.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    symbolKeyboard.padAll(10)
    symbolKeyboard.bgColor(0xffffff, dxui.Utils.STYLE_PART.ITEMS)
    symbolKeyboard.bgColor(0xe6e6e6)
    symbolKeyboard.setSize(symbolPanel.width(), symbolPanel.height())
    symbolKeyboard.data([
        "^", "\\", "|", "<", ">", "¢", "£", "€", "¥", "₱", "\n",
        "[", "]", "{", "}", "#", "%", "+", "=", "~", "_", "\n",
        " ", "-", "/", ":", ";", "(", ")", "$", "&", "\"", " ", "\n",
        "123", "`", "?", "!", "*", "@", ",", "'", " ", "\n",
        "ABC", " ", " ", ""
    ])
    symbolKeyboard.setBtnWidth(20, 1)
    for (let i = 21; i < 30; i++) {
        symbolKeyboard.setBtnWidth(i, 2)
    }
    symbolKeyboard.setBtnWidth(30, 1)
    symbolKeyboard.setBtnWidth(31, 3)
    for (let i = 32; i < 39; i++) {
        symbolKeyboard.setBtnWidth(i, 2)
    }
    symbolKeyboard.setBtnWidth(39, 3)
    symbolKeyboard.setBtnWidth(41, 2)
    symbolKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == symbolKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 隐藏无用按钮
            if (dsc.id == 20 || dsc.id == 30) {
                dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
            }
            // 加深一些功能按钮
            if (dsc.id == 31 || dsc.id == 39 || dsc.id == 40 || dsc.id == 41 || dsc.id == 45) {
                if (symbolKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xcdcdcd })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0xdbdbdb })
                }
            }
            // 回车按钮蓝色
            if (dsc.id == 42) {
                if (symbolKeyboard.obj.lvBtnmatrixGetSelectedBtn() == dsc.id && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C6CE4 })
                } else {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_color: 0x0C78FE })
                }
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    symbolKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == symbolKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            if (dsc.id == 39) {
                let src = '/app/code/resource/image/key/backspace.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
            if (dsc.id == 42) {
                let src = '/app/code/resource/image/key/enter.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
            if (dsc.id == 41) {
                let src = '/app/code/resource/image/key/space.png'
                // 获取图片信息
                let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
                // 定义一块区域，居中显示，注意：尺寸转area需要-1，area转尺寸需要+1
                let x1 = dsc.draw_area.x1 + (dsc.draw_area.x2 - dsc.draw_area.x1 + 1 - header.w) / 2;
                let y1 = dsc.draw_area.y1 + (dsc.draw_area.y2 - dsc.draw_area.y1 + 1 - header.h) / 2;
                let x2 = x1 + header.w - 1;
                let y2 = y1 + header.h - 1;
                y1 += 10
                y2 += 10
                let area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x2, y2)
                // 绘制图片信息
                let img_draw_dsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
                // 绘制图片
                dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, img_draw_dsc, area, src)
            }
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    symbolKeyboard.on(dxui.Utils.ENUM.LV_EVENT_LONG_PRESSED_REPEAT, () => {
        let clickBtn = symbolKeyboard.clickedButton()
        let id = clickBtn.id
        switch (id) {
            case 39:
                // 退格
                pinyin.cb({ cmd: "backspace" })
                break;
        }
    })
    symbolKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        let clickBtn = symbolKeyboard.clickedButton()
        let id = clickBtn.id
        let text = clickBtn.text
        switch (id) {
            case 31:
                if (isLock) {
                    break;
                }
                // 切换数字键盘
                pinyin.numPanel.show()
                pinyin.symbolPanel.hide()
                break;
            case 39:
                // 退格
                pinyin.cb({ cmd: "backspace" })
                break;
            case 40:
                if (isLock) {
                    break;
                }
                // 切换英文键盘
                pinyin.englishPanel.show()
                pinyin.symbolPanel.hide()
                break;
            case 41:
                // 空格
                pinyin.cb(" ")
                break;
            case 42:
                // 回车
                pinyin.cb({ cmd: "enter" })
                break;
            default:
                break;
        }
        // 打印字符
        if (["^", "\\", "|", "<", ">", "¢", "£", "€", "¥", "₱",
            "[", "]", "{", "}", "#", "%", "+", "=", "~", "_",
            "-", "/", ":", ";", "(", ")", "$", "&", "\"",
            "`", "?", "!", "*", "@", ",", "'"].includes(text)) {
            pinyin.cb(text)
        }
    })
    symbolPanel.hide()
    return symbolPanel
}
// 清除样式
function clearStyle(obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}
export default pinyin
