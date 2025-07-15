import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import mainView from './mainView.js'
import screen from '../screen.js'
const passwordView = {}
passwordView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    let screen_password = dxui.View.build('screen_password', dxui.Utils.LAYER.MAIN)
    passwordView.screen_password = screen_password
    screen_password.scroll(false)
    screen_password.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        screen.screenNow = screen_password
        let uiConfig = screen.getUIConfig()
        if (uiConfig.rotation == 0 || uiConfig.rotation == 2) {
            // 竖屏
            linePoints = linePointsVer
            password_btnm.setSize(320, 480)
            // 中英文切换，0中文1英文
            if (uiConfig.language == "EN") {
                password_btnm.data([
                    "1", "2", "3", "\n",
                    "4", "5", "6", "\n",
                    "7", "8", "9", "\n",
                    "BACK", "0", "OK", ""
                ]);
            } else {
                password_btnm.data([
                    "1", "2", "3", "\n",
                    "4", "5", "6", "\n",
                    "7", "8", "9", "\n",
                    "取消", "0", "确认", ""
                ]);
            }
        } else {
            // 横屏
            linePoints = linePointsHor
            password_btnm.setSize(480, 320)
            if (uiConfig.language == "EN") {
                password_btnm.data([
                    "1", "2", "3", "0", "\n",
                    "4", "5", "6", "BACK", "\n",
                    "7", "8", "9", "OK", ""
                ]);
            } else {
                password_btnm.data([
                    "1", "2", "3", "0", "\n",
                    "4", "5", "6", "取消", "\n",
                    "7", "8", "9", "确认", ""
                ]);
            }
        }
        // 无操作10秒自动返回
        if (passwordView.timer) {
            std.clearInterval(passwordView.timer)
        }
        passwordView.timer = std.setInterval(() => {
            let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 10 * 1000) {
                std.clearInterval(passwordView.timer)
                passwordView.timer = null
                dxui.loadMain(mainView.screen_main)
            }
        }, 1000)
    })
    /**************************************************创建按钮矩阵*****************************************************/
    let password_btnm = dxui.Buttons.build('password_btnm', screen_password)
    let font30 = dxui.Font.build(screen.fontPath, 30, dxui.Utils.FONT_STYLE.NORMAL)
    password_btnm.textFont(font30)
    clearStyle(password_btnm)
    password_btnm.padAll(5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    password_btnm.obj.lvObjSetStylePadGap(2, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    password_btnm.borderWidth(1, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.radius(9, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.bgColor(0x437fc9, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.textColor(0xFFFFFF, dxui.Utils.STYLE_PART.ITEMS)
    // 注册密码键盘事件
    password_btnm.on(dxui.Utils.EVENT.CLICK, () => {
        screen.press()
        let txt = password_btnm.clickedButton().text;
        if (txt == "确认" || txt == "OK") {
            if (password == "") {
                dxui.loadMain(mainView.screen_main)
            } else {
                // 密码校验
                dxui.loadMain(mainView.screen_main)
                screen.password(password)
                password = ""
            }

        } else if (txt == "取消" || txt == "BACK") {
            password = ""
            dxui.loadMain(mainView.screen_main)
        }
        // 最多输入20位
        if (password.length >= 20) {
            password = ""
        }
        if (passwordArray.includes(txt)) {
            password += txt
        }
        let passwordLen = password.length
        if (passwordLen == 0) {
            password_line.hide()
        } else {
            password_line.show()
        }
        password_line.setPoints(linePoints, passwordLen + 1);
    })
    /**************************************************创建按键线条*****************************************************/
    let password_line = dxui.Line.build('password_line', screen_password)
    password_line.lineColor(0xff6600)
    password_line.lineWidth(8)
}

function clearStyle(obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}

let passwordArray = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
// 键盘密码记录
let password = ""
// 密码线段
let linePoints = [[0, 0]]
let linePointsHor = (function () {
    let arr = [[0, 0]]
    for (let i = 1; i <= 20; i++) {
        if (i <= 6) {
            arr.push([480 / 6 * i, 0])
        } else if (i <= 10) {
            arr.push([480, 320 / 4 * (i - 6)])
        } else if (i <= 16) {
            arr.push([480 - 480 / 6 * (i - 10), 320])
        } else if (i <= 20) {
            arr.push([0, 320 - 320 / 4 * (i - 16)])
        }
    }
    return arr
})();
let linePointsVer = (function () {
    let arr = [[0, 0]]
    for (let i = 1; i <= 20; i++) {
        if (i <= 4) {
            arr.push([320 / 4 * i, 0])
        } else if (i <= 10) {
            arr.push([320, 480 / 6 * (i - 4)])
        } else if (i <= 14) {
            arr.push([320 - 320 / 4 * (i - 10), 480])
        } else if (i <= 20) {
            arr.push([0, 480 - 480 / 6 * (i - 14)])
        }
    }
    return arr
})();
export default passwordView