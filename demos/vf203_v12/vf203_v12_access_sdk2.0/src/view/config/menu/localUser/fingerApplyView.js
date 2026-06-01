import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import screen from '../../../../screen.js'
import log from '../../../../../dxmodules/dxLogger.js'
import fingerEnterView from './fingerEnterView.js'
import mainView from '../../../mainView.js'

const fingerApplyView = {}

fingerApplyView.payload = null

fingerApplyView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('fingerApplyView', dxui.Utils.LAYER.MAIN)
    fingerApplyView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        screen.driver.finger.stop()
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        if(fingerApplyView.timeOut){
            std.clearTimeout(fingerApplyView.timeOut)
        }
        fingerApplyView.timeOut = null
    })

    const titleBox = viewUtils.title(screenMain, mainView.screenMain, 'fingerApplyViewTitle', 'fingerApplyView.title', fingerApplyView.backCb)
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    // 指纹录入申请Label
    const fingerApplyLbl = dxui.Label.build('fingerApplyLbl', screenMain)
    fingerApplyLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (240 / 1024))
    fingerApplyLbl.textFont(viewUtils.font(28))
    fingerApplyLbl.dataI18n = "fingerApplyView.apply"

    // 申请人姓名Label
    const fingerNameLbl = dxui.Label.build('fingerNameLbl', screenMain)
    fingerNameLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (380 / 1024))
    fingerNameLbl.textFont(viewUtils.font(28))
    fingerNameLbl.text("")
    fingerApplyView.fingerNameLbl = fingerNameLbl

    // 申请时间Label
    const fingerTimeLbl = dxui.Label.build('fingerTimeLbl', screenMain)
    fingerTimeLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (460 / 1024))
    fingerTimeLbl.textFont(viewUtils.font(20))
    fingerTimeLbl.text("")
    fingerApplyView.fingerTimeLbl = fingerTimeLbl

    // 重复录入情况下-重新录入按钮 默认隐藏
    const fingerInputBtn = dxui.Button.build('fingerInputBtn', screenMain)
    fingerInputBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    fingerInputBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (195 / 600), screen.screenSize.height * (700 / 1024))
    fingerInputBtn.bgColor(0x000000)
    fingerInputBtn.radius(30)
    fingerInputBtn.on(dxui.Utils.EVENT.CLICK, () => {
        log.info("开始远程录入")

        fingerEnterView.enrollFinger(fingerApplyView.payload)
        dxui.loadMain(fingerEnterView.screenMain)
        // fingerApplyView.screenMain.hide()
    })
    fingerApplyView.fingerInputBtn = fingerInputBtn

    const fingerResetBtnLbl = dxui.Label.build('fingerInputBtnLbl', fingerInputBtn)
    fingerResetBtnLbl.dataI18n = 'fingerApplyView.input'
    fingerResetBtnLbl.textFont(viewUtils.font(26))
    fingerResetBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
}

fingerApplyView.applyFinger = function(payload){
    // fingerApplyView.screenMain.show()
    fingerApplyView.payload = payload
    if(payload.data.extra && payload.data.extra.userId){
        fingerEnterView.userId = payload.data.extra.userId
        let user = screen.getUserById(fingerEnterView.userId)
        fingerApplyView.fingerNameLbl.text((user && user.name) ? user.name : "welcome")
    } else {
        fingerApplyView.fingerNameLbl.text("welcome")
    }

    // 更新名称、更新时间
    const t = new Date();
    // 补零函数
    const pad = (n) => n < 10 ? `0${n}` : n;
    fingerApplyView.fingerTimeLbl.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)

    // 自动超时 60秒后回退到主页面
    fingerApplyView.timeOut = std.setTimeout(() => {
        dxui.loadMain(mainView.screenMain)
    }, 60000)
}

// 中断指纹采集
fingerApplyView.interruptFinger = function () {
    fingerApplyView.backCb()
    fingerEnterView.backCb()
    dxui.loadMain(mainView.screenMain)
}

fingerApplyView.backCb = function () {
    // fingerApplyView.screenMain.hide()
    // 如果退出指纹远程录入页面，返回录入失败
    if(fingerEnterView.userId){
        screen.cacheFingerChar(fingerEnterView.userId, null)
        fingerEnterView.userId = null
    }
    // 更新名称、更新时间
    fingerApplyView.fingerNameLbl.text("welcome")
    fingerApplyView.fingerTimeLbl.text("1970-01-01 00:00:00")

    if(fingerApplyView.timeOut){
        std.clearTimeout(fingerApplyView.timeOut)
    }
    fingerApplyView.timeOut = null
}

export default fingerApplyView