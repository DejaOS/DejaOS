import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import mainView from './mainView.js'
import topView from './topView.js'
import screen from '../screen.js'

const pwdView = {}
pwdView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('pwdView', dxui.Utils.LAYER.MAIN)
    pwdView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.topBox.hide()
    })
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        topView.topBox.show()
    })

    // 按钮容器
    let keyBtns = []
    // 圆点容器
    let dots = []
    // 输入的密码
    let pwd = []
    let input_len = 0

    const back = viewUtils.imageBtn(pwdView.screenMain, 'pwdViewBackBtn', screen.resourcePath.imagePath + '/back.png')
    back.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.height * (70 / 1024))
    back.align(dxui.Utils.ALIGN.TOP_LEFT, 0, screen.screenSize.height * (30 / 1024))
    back.on(dxui.Utils.EVENT.CLICK, () => {
        mainView.load()
        for (let i = 0; i < 6; i++) {
            if (dots[i]) {
                dots[i].bgOpa(0)
            }
        }
        input_len = 0;
        pwd.length = 0
        std.clearInterval(pwdView.timer)
        pwdView.timer = null
        pwdView.countdown.text("60s")
    })

    // 顶部标题
    const pwdTitle = dxui.Label.build('pwdTitle', screenMain)
    pwdTitle.text("密码通行")
    pwdTitle.textFont(viewUtils.font(28))
    pwdTitle.textColor(0x000000)
    pwdTitle.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (46 / 1024))

    // 倒计时(右上角)
    const countdown = dxui.Label.build('pwdCountdown', screenMain)
    pwdView.countdown = countdown
    countdown.text("60s")
    countdown.textFont(viewUtils.font(28))
    countdown.textColor(0x000000)
    countdown.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (20 / 600), screen.screenSize.height * (46 / 1024))

    // 圆点容器
    const dotcont = dxui.View.build('pwdDotcont', screenMain)
    dotcont.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (40 / 1024))
    dotcont.bgOpa(0)
    dotcont.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (150 / 1024))
    dotcont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    dotcont.obj.lvObjSetStylePadGap(screen.screenSize.width * (20 / 600), 0)
    dotcont.borderWidth(0, 0)
    dotcont.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    dotcont.obj.lvObjClearFlag(16)
    for (let i = 0; i < 6; i++) {
        dots[i] = dxui.View.build('pwdDot' + i, dotcont)
        dots[i].setSize(screen.screenSize.width * (30 / 600), screen.screenSize.height * (30 / 1024))
        dots[i].radius(0x7FFF, 0)
        dots[i].setBorderColor(0x000000, 0)
        dots[i].borderWidth(2, 0)
        dots[i].bgOpa(0)
        dots[i].obj.lvObjClearFlag(16)
    }

    // 键盘容器
    const kbcont = dxui.View.build('kbcont', screenMain)
    kbcont.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (700 / 1024))
    kbcont.bgOpa(0)
    kbcont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (20 / 1024))
    kbcont.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    kbcont.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    kbcont.obj.lvObjSetStylePadGap(screen.screenSize.width * (12 / 600), 0)
    kbcont.obj.lvObjClearFlag(16)

    // 创建数字键盘
    let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"]
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        keyBtns[i] = dxui.Button.build('keyBtn' + key + i, kbcont)
        keyBtns[i].setSize(screen.screenSize.width * (160 / 600), screen.screenSize.height * (160 / 1024))
        keyBtns[i].bgColor(0xffffff)
        keyBtns[i].setBorderColor(0xdddddd, 0)
        keyBtns[i].borderWidth(2, 0)
        keyBtns[i].radius(8, 0)
        keyBtns[i].obj.lvObjSetStyleShadowWidth(4, 0)
        keyBtns[i].obj.setStyleShadowColor(0x999999, 0)

        if (keys[i].length > 0) {
            const keyBtnLbl = dxui.Label.build('keyBtnLbl' + key, keyBtns[i])
            keyBtnLbl.text(key)
            keyBtnLbl.textColor(0x000000)
            keyBtnLbl.textFont(viewUtils.font(28))
            keyBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
            // 按钮事件回调
            keyBtns[i].obj.addEventCb((e) => {

                if ("clr" == keyBtnLbl.obj.lvLabelGetText()) {
                    input_len = 0
                    pwd.length = 0
                    for (let i = 0; i < 6; i++) {
                        dots[i].bgOpa(0)
                    }
                    return
                }
                if ("del" == keyBtnLbl.obj.lvLabelGetText() && input_len >= 0) {
                    if (input_len == 0) {
                        return
                    } else if (--input_len >= 0) {
                        pwd.pop()
                        dots[input_len].bgOpa(0)
                    }
                    return
                }

                if (++input_len < 6) {
                    pwd.push(Number(keyBtnLbl.obj.lvLabelGetText()))
                } else {
                    pwd.push(Number(keyBtnLbl.obj.lvLabelGetText()))
                    input_len = 0;
                    screen.pwdAccess(pwd.join(''))
                    mainView.load()
                    pwd.length = 0
                    std.clearInterval(pwdView.timer)
                    pwdView.timer = null
                    pwdView.countdown.text("60s")
                }

                for (let i = 0; i < 6; i++) {
                    if (i < input_len && i < 5) {
                        dots[i].bgColor(0x000000)
                        dots[i].bgOpa(255)
                    } else {
                        dots[i].bgOpa(0)
                    }
                }

            }, dxui.Utils.ENUM.LV_EVENT_CLICKED)
        }
    }
}

pwdView.startCountdown = function () {
    pwdView.count = 60
    pwdView.timer = std.setInterval(() => {
        pwdView.countdown.text(pwdView.count + "s")
        pwdView.count--
        if (pwdView.count < 0) {
            std.clearInterval(pwdView.timer)
            pwdView.timer = null
            mainView.load()
        }
    }, 1000)
}

export default pwdView