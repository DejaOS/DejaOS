/**
 * @layer    view
 * @module   pinyin
 * @fires    none
 * @listens  none
 * @depends  dxUi,dict,layout,font,assets
 *
 * 屏幕底部拼音/英文/数字/符号软键盘（LVGL）。
 * 设计稿基准 800×300；宽取 layout.width，高夹在逻辑屏高 55% 与最小 140 设计像素之间。
 * scale 取宽高比的较小值，供字号/间距使用；按键图标按原图像素绘制，不随分辨率缩放。
 * 定位贴在 layout 逻辑区底边（与页面同坐标系），勿用物理屏 BOTTOM_MID。
 * show(mode, cb)：mode 0 英文 / 1 拼音 / 2 数字 / 3 符号；cb 收到 string 或 { cmd }。
 * 业务侧请经 components/keyboard.js 绑定 Textarea，勿直接依赖本模块内部结构。
 */
import dxui from '../../../../dxmodules/dxUi.js'
import dxStd from '../../../../dxmodules/dxStd.js'
import dict from './dict.js'
import layout from '../layout.js'
import font from '../font.js'
import { asset } from '../../utils/assets.js'

const pinyin = {}

/************************************************** 常量与模块状态 **************************************************/
const DESIGN_W = 800
const DESIGN_H = 300
/** 退格长按：首次延迟后再进入连续删除（ms） */
const BACKSPACE_REPEAT_DELAY_MS = 400
/** 退格长按：连续删除间隔（ms） */
const BACKSPACE_REPEAT_INTERVAL_MS = 60
/**
 * 人员姓名录入优先级：先覆盖常见姓氏，再覆盖高频姓名用字。
 * 未命中的字继续保持词典原顺序，避免为输入体验引入一份难维护的大词库。
 */
const COMMON_NAME_PRIORITY =
    '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'
    + '戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳唐罗薛伍余'
    + '米贝姚孟顾尹江钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫房裘缪干解应宗'
    + '丁宣贲邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿'
    + '储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾'
    + '暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖'
    + '卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛'
    + '寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习艾鱼容向古易慎戈廖庾终'
    + '暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷'
    + '辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公'
    + '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超平刚桂霞玲丹萍鹏辉梅雪燕晨宇'
    + '浩俊欣怡婷佳倩博慧鑫宁凯峰健亮晶莹琳瑞龙志建国子雨思梦诗嘉涵轩泽航'
    + '天成安乐阳一可心晓新春秋海清玉红光德才智胜华文斌彬豪毅诚康荣';
const COMMON_NAME_RANK = new Map();
for (let i = 0; i < COMMON_NAME_PRIORITY.length; i++) {
    if (!COMMON_NAME_RANK.has(COMMON_NAME_PRIORITY[i])) COMMON_NAME_RANK.set(COMMON_NAME_PRIORITY[i], i);
}
const ICONS = {
    backspace: asset('backspace-outline.png'),
    enter: asset('arrow-left-rounded.png'),
    space: asset('space-bar.png'),
    right: asset('keyboard-arrow-right.png'),
}

/** isLock：锁定后禁止切换键盘模式；enablePinyin：是否允许英文键切到拼音 */
let isLock = false
let enablePinyin = true
/** 点击键盘外（dismissMask）时回调，由 keyboard.js 注册以同步 activeBinding */
let dismissCb = null
/** 退格长按定时器 */
let backspaceDelayTimer = null
let backspaceRepeatTimer = null

/** _ui 收集需 refreshLayout 时批量更新的面板与 BtnMatrix */
pinyin._ui = { panels: [], matrices: [] }

/************************************************** 退格长按连续删除 **************************************************/
/** 停止退格连删（松手 / 隐藏键盘 / 销毁时调用） */
function stopBackspaceRepeat() {
    if (backspaceDelayTimer) {
        dxStd.clearTimeout(backspaceDelayTimer)
        backspaceDelayTimer = null
    }
    if (backspaceRepeatTimer) {
        dxStd.clearInterval(backspaceRepeatTimer)
        backspaceRepeatTimer = null
    }
}

/**
 * 按下退格：立即删一次；按住超过 BACKSPACE_REPEAT_DELAY_MS 后按间隔连续删。
 * @param {Function} onDelete 单次删除动作
 */
function startBackspaceRepeat(onDelete) {
    stopBackspaceRepeat()
    if (typeof onDelete !== 'function') {
        return
    }
    onDelete()
    backspaceDelayTimer = dxStd.setTimeout(function () {
        backspaceDelayTimer = null
        backspaceRepeatTimer = dxStd.setInterval(function () {
            onDelete()
        }, BACKSPACE_REPEAT_INTERVAL_MS)
    }, BACKSPACE_REPEAT_DELAY_MS)
}

/**
 * 为 BtnMatrix 绑定松手/丢失焦点时停止连删。
 * @param {object} matrix
 */
function bindBackspaceRelease(matrix) {
    matrix.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, function () {
        stopBackspaceRepeat()
    })
    // 手指滑出按键区域时也要停，避免松手后仍连删。
    if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
        matrix.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, function () {
            stopBackspaceRepeat()
        })
    }
}

/************************************************** 布局计算 **************************************************/
/** 按当前 layout 分辨率计算键盘宽高与 scale */
function getLayoutMetrics() {
    const screenW = layout.width
    const screenH = layout.height
    let w = screenW
    let h = Math.round((DESIGN_H * w) / DESIGN_W)
    const maxH = Math.round(screenH * 0.55)
    const minH = layout.y(140)
    if (h > maxH) h = maxH
    if (h < minH) h = minH
    // 高度被夹时不能只按宽边缩放，否则字号/间距仍偏大
    const scale = Math.min(w / DESIGN_W, h / DESIGN_H)
    return { w: w, h: h, scale: scale, screenW: screenW, screenH: screenH }
}

/** 写入 pinyin._metrics，并提供 pinyin.s() 设计稿坐标缩放 */
function applyScale(metrics) {
    pinyin._metrics = metrics
    pinyin.s = function (v) {
        return Math.max(1, Math.round(v * metrics.scale))
    }
}

/**
 * 将键盘容器放到 layout 逻辑区底边（页面同坐标系左上原点）。
 * TOP 层父对象是物理全屏，BOTTOM_MID 会贴真屏底，与逻辑布局不一致时错位。
 * @param {{ w: number, h: number }} metrics
 */
function placeKeyboardOnLayoutBottom(metrics) {
    if (!pinyin.container) {
        return
    }
    const x = Math.round((layout.width - metrics.w) / 2)
    const y = layout.height - metrics.h
    pinyin.container.setPos(x, y)
}

/**
 * 在 BtnMatrix 按键区域内居中绘制图标（原图像素，不随分辨率缩放）。
 * 与官方 uiButtons.setBtnIcon / DejaOS pinyin 一致：lvDrawImg 不设 zoom。
 * @param {object} dsc DRAW_PART 描述符
 * @param {string} src 图标路径
 * @param {number} [yOffset=0] 相对键面垂直微调（像素）
 */
function drawKeyIcon(dsc, src, yOffset) {
    const header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(src)
    if (!header || !(header.w > 0) || !(header.h > 0)) {
        return
    }
    const areaW = dsc.draw_area.x2 - dsc.draw_area.x1 + 1
    const areaH = dsc.draw_area.y2 - dsc.draw_area.y1 + 1
    const offsetY = yOffset || 0
    const x1 = dsc.draw_area.x1 + (areaW - header.w) / 2
    const y1 = dsc.draw_area.y1 + (areaH - header.h) / 2 + offsetY
    const area = dxui.Utils.GG.NativeArea.lvAreaSet(x1, y1, x1 + header.w - 1, y1 + header.h - 1)
    const imgDsc = dxui.Utils.GG.NativeDraw.lvDrawImgDscInit()
    dxui.Utils.GG.NativeDraw.lvDrawImg(dsc.dsc, imgDsc, area, src)
}

/**
 * 功能键灰底、回车蓝底着色（DRAW_PART_BEGIN）。
 * @param {object} matrix BtnMatrix
 * @param {number[]} funcIds 加深的功能键 id
 * @param {number|undefined} enterId 回车键 id
 * @param {object} e LVGL 事件，用于判断 PRESSED
 */
function paintFuncKey(dsc, matrix, funcIds, enterId, e) {
    const isPressed = matrix.obj.lvBtnmatrixGetSelectedBtn() == dsc.id
        && e.lvEventGetTarget().hasState(dxui.Utils.ENUM.LV_STATE_PRESSED)
    if (funcIds.indexOf(dsc.id) >= 0) {
        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, {
            bg_color: isPressed ? 0xcdcdcd : 0xdbdbdb,
        })
    }
    if (enterId !== undefined && dsc.id == enterId) {
        dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, {
            bg_color: isPressed ? 0x0C6CE4 : 0x0C78FE,
        })
    }
}


/************************************************** 初始化（init） **************************************************/
/** 首次调用时创建 dismiss 遮罩 + TOP 层键盘容器及英/拼/数/符号面板，默认隐藏 */
pinyin.init = function () {
    if (pinyin.inited) {
        return
    }
    pinyin.inited = true
    const metrics = getLayoutMetrics()
    applyScale(metrics)
    pinyin.font24 = font.get(pinyin.s(24))

    // 全屏透明遮罩：挡在页面之上、键盘之下，点击即关闭键盘。
    const dismissMask = dxui.View.build('global_pinyin_dismiss', dxui.Utils.LAYER.TOP)
    pinyin.dismissMask = dismissMask
    clearStyle(dismissMask)
    dismissMask.setSize(layout.width, layout.height)
    dismissMask.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)
    dismissMask.bgColor(0x000000)
    dismissMask.bgOpa(0)
    dismissMask.clickable(true)
    dismissMask.scroll(false)
    dismissMask.on(dxui.Utils.EVENT.CLICK, function () {
        if (typeof dismissCb === 'function') {
            dismissCb()
        } else {
            pinyin.hide()
        }
    })
    dismissMask.hide()

    let container = dxui.View.build('global_pinyin_keyboard', dxui.Utils.LAYER.TOP)
    pinyin.container = container
    clearStyle(container)
    container.obj.lvObjAddFlag(dxui.Utils.ENUM.LV_OBJ_FLAG_OVERFLOW_VISIBLE)
    container.setSize(metrics.w, metrics.h)
    placeKeyboardOnLayoutBottom(metrics)
    container.textFont(pinyin.font24)
    container.bgOpa(0)
    layout.disableScroll(container)
    container.update()
    container.hide()
    pinyin.englishPanel = createEnglish()
    pinyin.pinyinPanel = createPinyin()
    pinyin.numPanel = createNum()
    pinyin.symbolPanel = createSymbol()
}

/************************************************** 布局刷新（refreshLayout） **************************************************/
/** 屏宽/旋转变化时重算尺寸、字体，并同步 _ui 内各面板与候选条 */
pinyin.refreshLayout = function () {
    if (!pinyin.inited || !pinyin.container) {
        return
    }
    const metrics = getLayoutMetrics()
    applyScale(metrics)
    pinyin.font24 = font.get(pinyin.s(24))
    if (pinyin.dismissMask) {
        pinyin.dismissMask.setSize(layout.width, layout.height)
        pinyin.dismissMask.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)
    }
    pinyin.container.setSize(metrics.w, metrics.h)
    placeKeyboardOnLayoutBottom(metrics)
    pinyin.container.textFont(pinyin.font24)
    layout.disableScroll(pinyin.container)
    if (pinyin.dismissMask) {
        layout.disableScroll(pinyin.dismissMask)
    }
    pinyin._ui.panels.forEach((panel) => {
        panel.setSize(metrics.w, metrics.h)
        layout.disableScroll(panel)
        panel.update()
    })
    pinyin._ui.matrices.forEach((matrix) => {
        matrix.setSize(metrics.w, metrics.h)
        matrix.padAll(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
        matrix.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
        matrix.textFont(pinyin.font24)
        layout.disableScroll(matrix)
    })
    if (pinyin._ui.previewBox) {
        const ph = pinyin.s(70)
        pinyin._ui.previewBox.setSize(metrics.w, ph)
        pinyin._ui.previewBox.padLeft(pinyin.s(20))
        pinyin._ui.previewBox.labels.forEach((label, i) => {
            const box = pinyin._ui.previewLabelBoxes[i]
            if (box) {
                box.setSize(pinyin.s(50), ph)
            }
        })
    }
    if (pinyin._ui.morePreview) {
        const side = pinyin.s(70)
        pinyin._ui.morePreview.setSize(side, side)
    }
    if (pinyin._ui.phrasePreview) {
        pinyin._ui.phrasePreview.setSize(pinyin.s(70), pinyin.s(35))
    }
    if (pinyin._ui.morePreviewKeyboard) {
        pinyin._ui.morePreviewKeyboard.setSize(metrics.w, metrics.h)
    }
}

/************************************************** 模式切换与可见性（show / hide / lock） **************************************************/
/**
 * 显示指定模式键盘并注册回调
 * @param {0|1|2|3} mode 0 英文 1 拼音 2 数字 3 符号
 * @param {Function} cb 按键回调：字符 string 或 { cmd: 'backspace'|'enter' }
 */
pinyin.show = function (mode, cb) {
    if (![0, 1, 2, 3].includes(mode)) {
        return
    }
    pinyin.refreshLayout()
    this.unlock()
    this.hide()
    // 按键内容回调
    pinyin.cb = cb
    if (pinyin.dismissMask) {
        pinyin.dismissMask.show()
        pinyin.dismissMask.moveForeground()
    }
    pinyin.container.show()
    pinyin.container.moveForeground()
    // 0：英文键盘，1：拼音键盘，2：数字键盘，3：符号键盘
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
/**
 * 注册点击键盘外关闭时的回调（由 keyboard 门面设置，用于通知 userCloseCb）。
 * @param {Function|null} cb
 */
pinyin.setDismissCb = function (cb) {
    dismissCb = typeof cb === 'function' ? cb : null
}
/** 隐藏所有面板、遮罩与容器 */
pinyin.hide = function () {
    if (!pinyin.inited) {
        return
    }
    stopBackspaceRepeat()
    if (pinyin.englishPanel) pinyin.englishPanel.hide()
    if (pinyin.pinyinPanel) pinyin.pinyinPanel.hide()
    if (pinyin.numPanel) pinyin.numPanel.hide()
    if (pinyin.symbolPanel) pinyin.symbolPanel.hide()
    if (pinyin.container) pinyin.container.hide()
    if (pinyin.dismissMask) pinyin.dismissMask.hide()
}
/** 锁定键盘，禁止切换英/拼/数/符号模式 */
pinyin.lock = function () {
    isLock = true
}
/** 解除模式锁定 */
pinyin.unlock = function () {
    isLock = false
}
/** 设置是否允许从英文面板切换到拼音（enablePinyin=false 时 EN 键无效） */
pinyin.pinyinSupport = function (bool) {
    enablePinyin = bool
}

/************************************************** 英文键盘面板（mode 0） **************************************************/
/** 创建大小写双 BtnMatrix，默认显示小写 */
function createEnglish() {
    let englishPanel = dxui.View.build(pinyin.container.id + 'englishPanel', pinyin.container)
    clearStyle(englishPanel)
    englishPanel.setSize(pinyin.container.width(), pinyin.container.height())
    englishPanel.update()
    pinyin._ui.panels.push(englishPanel)
    /** 内部工厂：capital=true 为大写布局，false 为小写 */
    function createKeyboard(capital) {
        let englishKeyboard = dxui.Buttons.build(englishPanel.id + 'englishKeyboard' + (capital ? "Big" : "Small"), englishPanel)
        clearStyle(englishKeyboard)
        englishKeyboard.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
        englishKeyboard.padAll(pinyin.s(10))
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
        // 设置按钮宽度
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
                if (dsc.id == 10 || dsc.id == 20) {
                    dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
                }
                paintFuncKey(dsc, englishKeyboard, [21, 29, 30, 31, 35], 36, e)
            }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
        englishKeyboard.obj.addEventCb((e) => {
            let dsc = e.lvEventGetDrawPartDsc()
            if (dsc.class_p == englishKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
                // 删除按钮图案添加
                if (dsc.id == 29) {
                    drawKeyIcon(dsc, ICONS.backspace)
                }
                // 回车按钮图案添加
                if (dsc.id == 36) {
                    drawKeyIcon(dsc, ICONS.enter)
                }
                // 空格按钮图案添加
                if (dsc.id == 33) {
                    drawKeyIcon(dsc, ICONS.space, 10)
                }
            }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
        /************************************************** 英文键：按键处理 **************************************************/
        englishKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            let clickBtn = englishKeyboard.clickedButton()
            let id = clickBtn.id
            let text = clickBtn.text
            switch (id) {
                case 21:
                    // 大小写切换
                    if (englishKeyboardBig.isHide()) {
                        englishKeyboardBig.show()
                        englishKeyboardSmall.hide()
                    } else {
                        englishKeyboardBig.hide()
                        englishKeyboardSmall.show()
                    }
                    break;
                case 29:
                    // 退格（支持长按连删）
                    startBackspaceRepeat(function () {
                        pinyin.cb({ cmd: "backspace" })
                    })
                    break;
                case 30:
                    if (isLock) {
                        break;
                    }
                    // 切换符号键盘
                    pinyin.symbolPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 31:
                    if (isLock) {
                        break;
                    }
                    // 切换数字键盘
                    pinyin.numPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 33:
                    // 空格
                    pinyin.cb(" ")
                    break;
                case 35:
                    if (isLock || !enablePinyin) {
                        break;
                    }
                    // 切换拼音键盘
                    pinyin.pinyinPanel.show()
                    pinyin.englishPanel.hide()
                    break;
                case 36:
                    // 回车
                    pinyin.cb({ cmd: "enter" })
                    break;
                default:
                    break;
            }
            // 打印字符
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
        bindBackspaceRelease(englishKeyboard)
        pinyin._ui.matrices.push(englishKeyboard)
        return englishKeyboard
    }
    // 创建大小写键盘
    let englishKeyboardBig = createKeyboard(true)
    let englishKeyboardSmall = createKeyboard(false)
    // 默认是小写
    englishKeyboardBig.hide()
    englishKeyboardSmall.show()
    englishPanel.hide()
    return englishPanel
}

/************************************************** 拼音键盘面板（mode 1） **************************************************/
/** 含候选条、分词预览、扩展候选页与字母 BtnMatrix */
function createPinyin() {
    let pinyinPanel = dxui.View.build(pinyin.container.id + 'pinyinPanel', pinyin.container)
    clearStyle(pinyinPanel)
    pinyinPanel.setSize(pinyin.container.width(), pinyin.container.height())
    pinyinPanel.obj.lvObjAddFlag(dxui.Utils.ENUM.LV_OBJ_FLAG_OVERFLOW_VISIBLE)
    pinyinPanel.update()
    pinyin._ui.panels.push(pinyinPanel)
    /************************************************** 拼音：候选汉字预览条（最多 8 字） **************************************************/
    // 创建汉字预览框
    let previewBox = dxui.View.build(pinyinPanel.id + 'previewBox', pinyinPanel)
    clearStyle(previewBox)
    previewBox.setSize(pinyinPanel.width(), pinyin.s(70))
    previewBox.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -pinyin.s(70))
    previewBox.padLeft(pinyin.s(20))
    pinyin._ui.previewBox = previewBox
    pinyin._ui.previewLabelBoxes = []
    previewBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    previewBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    previewBox.labels = []
    // 8个预览文字
    for (let i = 0; i < 8; i++) {
        let labelBox = dxui.View.build(previewBox.id + 'labelBox' + i, previewBox)
        clearStyle(labelBox)
        labelBox.setSize(pinyin.s(50), pinyin.s(70))
        pinyin._ui.previewLabelBoxes.push(labelBox)
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
    morePreview.setSize(pinyin.s(70), pinyin.s(70))
    morePreview.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, -pinyin.s(70))
    pinyin._ui.morePreview = morePreview
    morePreview.hide()
    let rightBtn = dxui.Image.build(morePreview.id + 'rightBtn', morePreview)
    rightBtn.source(ICONS.right)
    rightBtn.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pinyin._ui.rightBtn = rightBtn
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
    /************************************************** 拼音：扩展候选页（>8 字时分页） **************************************************/
    // 更多汉字面板
    let morePreviewKeyboard = dxui.Buttons.build(pinyinPanel.id + 'morePreviewKeyboard', pinyinPanel)
    clearStyle(morePreviewKeyboard)
    morePreviewKeyboard.setSize(pinyinPanel.width(), pinyinPanel.height())
    morePreviewKeyboard.hide()
    pinyin._ui.morePreviewKeyboard = morePreviewKeyboard
    morePreviewKeyboard.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    morePreviewKeyboard.padAll(pinyin.s(10))
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
            paintFuncKey(dsc, morePreviewKeyboard, [32, 33, 34], undefined, e)
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
    /************************************************** 拼音：当前音节预览（phrase，支持分词符 '） **************************************************/
    // 词组预览
    let phrasePreview = dxui.View.build(pinyinPanel.id + 'phrasePreview', pinyinPanel)
    clearStyle(phrasePreview)
    phrasePreview.setSize(pinyin.s(70), pinyin.s(35))
    phrasePreview.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -pinyin.s(105))
    pinyin._ui.phrasePreview = phrasePreview
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
        phrasePreview.width(phrase.width() + pinyin.s(40))
    }
    let overwrite1 = pinyinPanel.show
    pinyinPanel.show = () => {
        // 重写显示方法，显示汉字预览框
        previewBox.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -pinyin.s(70))
        morePreview.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, -pinyin.s(70))
        phrasePreview.align(dxui.Utils.ALIGN.TOP_LEFT, 0, -pinyin.s(105))
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
    /************************************************** 拼音：字母 BtnMatrix **************************************************/
    // 创建拼音键盘
    let pinyinKeyboard = dxui.Buttons.build(pinyinPanel.id + 'pinyinKeyboard', pinyinPanel)
    clearStyle(pinyinKeyboard)
    pinyinKeyboard.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    pinyinKeyboard.padAll(pinyin.s(10))
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
            if (dsc.id == 10 || dsc.id == 20) {
                dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
            }
            paintFuncKey(dsc, pinyinKeyboard, [21, 29, 30, 31, 35], 36, e)
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    pinyinKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == pinyinKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 删除按钮图案添加
            if (dsc.id == 29) {
                drawKeyIcon(dsc, ICONS.backspace)
            }
            // 回车按钮图案添加
            if (dsc.id == 36) {
                drawKeyIcon(dsc, ICONS.enter)
            }
            // 空格按钮图案添加
            if (dsc.id == 33) {
                drawKeyIcon(dsc, ICONS.space, 10)
            }
        }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    /** 精确音节优先；只有尚未形成完整音节时才合并前缀候选。 */
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
        let characters = dict[searchStr] || ''
        if (!characters) {
            const keys = Object.keys(dict).filter(v => v.startsWith(searchStr))
            keys.forEach(v => {
                characters += dict[v]
            })
        }
        const seen = new Set()
        const candidates = []
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i]
            if (seen.has(char)) continue
            seen.add(char)
            candidates.push({ char: char, order: i })
        }
        candidates.sort((left, right) => {
            const leftRank = COMMON_NAME_RANK.has(left.char) ? COMMON_NAME_RANK.get(left.char) : Number.MAX_SAFE_INTEGER
            const rightRank = COMMON_NAME_RANK.has(right.char) ? COMMON_NAME_RANK.get(right.char) : Number.MAX_SAFE_INTEGER
            return leftRank === rightRank ? left.order - right.order : leftRank - rightRank
        })
        previewBox.fillData(candidates.map(item => item.char).join(''))
    }
    /************************************************** 拼音键：按键处理 **************************************************/
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
                // 退格：先删拼音预览，再删输入框；支持长按连删
                startBackspaceRepeat(function () {
                    let temp = phrase.text()
                    if (temp.length > 0) {
                        phrase.text(temp.substring(0, temp.length - 1))
                    } else {
                        pinyin.cb({ cmd: "backspace" })
                    }
                    search()
                })
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
    bindBackspaceRelease(pinyinKeyboard)
    pinyin._ui.matrices.push(morePreviewKeyboard, pinyinKeyboard)
    pinyinPanel.hide()
    return pinyinPanel
}

/************************************************** 数字键盘面板（mode 2） **************************************************/
function createNum() {
    let numPanel = dxui.View.build(pinyin.container.id + 'numPanel', pinyin.container)
    clearStyle(numPanel)
    numPanel.setSize(pinyin.container.width(), pinyin.container.height())
    numPanel.update()
    pinyin._ui.panels.push(numPanel)
    // 创建数字键盘
    let numKeyboard = dxui.Buttons.build(numPanel.id + 'numKeyboard', numPanel)
    clearStyle(numKeyboard)
    numKeyboard.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    numKeyboard.padAll(pinyin.s(10))
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
            paintFuncKey(dsc, numKeyboard, [3, 7, 11, 12, 14], 15, e)
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    numKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == numKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            // 删除按钮图案
            if (dsc.id == 3) {
                drawKeyIcon(dsc, ICONS.backspace)
            }
            if (dsc.id == 15) {
                drawKeyIcon(dsc, ICONS.enter)
            }
        }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    /************************************************** 数字键：按键处理 **************************************************/
    numKeyboard.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        let clickBtn = numKeyboard.clickedButton()
        let id = clickBtn.id
        let text = clickBtn.text
        switch (id) {
            case 3:
                // 退格（支持长按连删）
                startBackspaceRepeat(function () {
                    pinyin.cb({ cmd: "backspace" })
                })
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
    bindBackspaceRelease(numKeyboard)
    pinyin._ui.matrices.push(numKeyboard)
    numPanel.hide()
    return numPanel
}

/************************************************** 符号键盘面板（mode 3） **************************************************/
function createSymbol() {
    let symbolPanel = dxui.View.build(pinyin.container.id + 'symbolPanel', pinyin.container)
    clearStyle(symbolPanel)
    symbolPanel.setSize(pinyin.container.width(), pinyin.container.height())
    symbolPanel.update()
    pinyin._ui.panels.push(symbolPanel)
    // 创建符号键盘
    let symbolKeyboard = dxui.Buttons.build(symbolPanel.id + 'symbolKeyboard', symbolPanel)
    clearStyle(symbolKeyboard)
    symbolKeyboard.obj.lvObjSetStylePadGap(pinyin.s(10), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    symbolKeyboard.padAll(pinyin.s(10))
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
            if (dsc.id == 20 || dsc.id == 30) {
                dxui.Utils.GG.NativeDraw.lvDrawRectReset(dsc.rect_dsc, { bg_opa: 0, shadow_opa: 0 })
            }
            paintFuncKey(dsc, symbolKeyboard, [31, 39, 40, 41, 45], 42, e)
        }
    }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_BEGIN)
    symbolKeyboard.obj.addEventCb((e) => {
        let dsc = e.lvEventGetDrawPartDsc()
        if (dsc.class_p == symbolKeyboard.obj.ClassP && dsc.type == dxui.Utils.ENUM.LV_BTNMATRIX_DRAW_PART_BTN) {
            if (dsc.id == 39) {
                drawKeyIcon(dsc, ICONS.backspace)
            }
            if (dsc.id == 42) {
                drawKeyIcon(dsc, ICONS.enter)
            }
            if (dsc.id == 41) {
                drawKeyIcon(dsc, ICONS.space, 10)
            }
        }
        }, dxui.Utils.ENUM.LV_EVENT_DRAW_PART_END)
    /************************************************** 符号键：按键处理 **************************************************/
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
                // 退格（支持长按连删）
                startBackspaceRepeat(function () {
                    pinyin.cb({ cmd: "backspace" })
                })
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
    bindBackspaceRelease(symbolKeyboard)
    pinyin._ui.matrices.push(symbolKeyboard)
    symbolPanel.hide()
    return symbolPanel
}


/************************************************** 销毁 **************************************************/
/** 释放 TOP 层键盘容器；view.destroy 时调用。再次使用前需重新 init。 */
pinyin.destroy = function () {
    if (!pinyin.inited) {
        return
    }
    stopBackspaceRepeat()
    try {
        if (pinyin.container) {
            dxui.del(pinyin.container)
        }
    } catch (_e) {}
    try {
        if (pinyin.dismissMask) {
            dxui.del(pinyin.dismissMask)
        }
    } catch (_e) {}
    pinyin.container = null
    pinyin.dismissMask = null
    pinyin.englishPanel = null
    pinyin.pinyinPanel = null
    pinyin.numPanel = null
    pinyin.symbolPanel = null
    pinyin.cb = null
    pinyin.font24 = null
    pinyin._metrics = null
    pinyin.s = null
    pinyin._ui = { panels: [], matrices: [] }
    dismissCb = null
    isLock = false
    enablePinyin = true
    pinyin.inited = false
}

/************************************************** 工具函数 **************************************************/
/** 清除 LVGL 对象默认圆角/边框/内边距，并禁止滚动（逻辑区超出真屏时也不拖移）。 */
function clearStyle(obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
    layout.disableScroll(obj)
}
export default pinyin
