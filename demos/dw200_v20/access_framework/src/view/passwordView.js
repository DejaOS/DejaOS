import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtil from './viewUtil.js'
const passwordView = {}
let screen = null
passwordView.init = function (screenRef) {
    screen = screenRef
    /**************************************************create screen*****************************************************/
    let screen_password = dxui.View.build('screen_password', dxui.Utils.LAYER.MAIN)
    passwordView.screen_password = screen_password
    screen_password.scroll(false)
    screen_password.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        screen.screenNow = screen_password
        let uiConfig = screen.uiConfig
        if (viewUtil.isVertical(uiConfig.rotation)) {
            // vertical screen
            linePoints = linePointsVer
            password_btnm.setSize(320, 480)
            // switch between chinese and english, 0 for chinese and 1 for english
            if (uiConfig.language == 1) {
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
            // horizontal screen
            linePoints = linePointsHor
            password_btnm.setSize(480, 320)
            if (uiConfig.language == 1) {
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
        // automatically return after 10 seconds of no operation
        viewUtil.setInactiveTimeout('passwordView', () => {
            screen.backmain()
        }, 10000)
    })
    /**************************************************create button matrix*****************************************************/
    let password_btnm = dxui.Buttons.build('password_btnm', screen_password)
    let font30 = viewUtil.getFont(30)
    password_btnm.textFont(font30)
    viewUtil.clearStyle(password_btnm)
    password_btnm.padAll(5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    password_btnm.obj.lvObjSetStylePadGap(2, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    password_btnm.borderWidth(1, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.radius(9, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.bgColor(0x437fc9, dxui.Utils.STYLE_PART.ITEMS)
    password_btnm.textColor(0xFFFFFF, dxui.Utils.STYLE_PART.ITEMS)
    // register password keyboard events
    password_btnm.on(dxui.Utils.EVENT.CLICK, () => {
        screen.press()
        let txt = password_btnm.clickedButton().text;
        if (txt == "确认" || txt == "OK") {
            if (password == "") {
                screen.backmain()
            } else {
                // password verification
                screen.backmain()
                screen.password(password)
                password = ""
            }

        } else if (txt == "取消" || txt == "BACK") {
            password = ""
            screen.backmain()
        }
        // enter up to 20 digits
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
    /**************************************************create key lines*****************************************************/
    let password_line = dxui.Line.build('password_line', screen_password)
    password_line.lineColor(0xff6600)
    password_line.lineWidth(8)
}

let passwordArray = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
// keyboard password record
let password = ""
// password segment
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