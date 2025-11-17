import dxui from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import configView from '../../configView.js'
import screen from '../../../../screen.js'
import developerView from '../developerView.js'
import std from '../../../../../dxmodules/dxStd.js'

const capcalView = {}
capcalView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('capcalView', dxui.Utils.LAYER.MAIN)
    capcalView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    capcalView.isRunning = false

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        capcalView.timeout = new Date().getTime()
        capcalView.isRunning = true
        topView.changeTheme(true)
        screen.getCapcal().init()
        capcalView1.show()
        capcalView2.hide()

        if (capcalView.timer) {
            std.clearInterval(capcalView.timer)
        }
        let cnt = 0
        capcalView.timer = std.setInterval(() => {
            // 执行标定
            let flag = screen.getCapcal().calculate(cnt)
            if (flag) {
                if (cnt >= 1) {
                    // 标定成功
                    screen.updateFaceConfig({ capcal_path: "/etc/.cameraCalibration" })
                    dxui.loadMain(developerView.screenMain)
                    screen.driver.audio.play(`/app/code/resource/${screen.getConfig()["base.language"] == "CN" ? "CN" : "EN"}/wav/calibration_2s.wav`)
                }
                capcalView1.hide()
                capcalView2.show()
                cnt++
                screen.driver.audio.play(`/app/code/resource/${screen.getConfig()["base.language"] == "CN" ? "CN" : "EN"}/wav/calibration_1s.wav`)
            }
            if (new Date().getTime() - capcalView.timeout > 30000) {
                // 超时退出
                dxui.loadMain(developerView.screenMain)
            }
            capcaltimeout.text((30 - Math.floor((new Date().getTime() - capcalView.timeout) / 1000)) + "秒后超时退出")
        }, 500)
        capcaltimeout.text("30秒后超时退出")
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        capcalView.isRunning = false
        screen.getCapcal().deinit()
        if (capcalView.timer) {
            std.clearInterval(capcalView.timer)
            capcalView.timer = null
        }
    })

    const topMask = dxui.View.build('topMask', screenMain)
    viewUtils._clearStyle(topMask)
    topMask.setSize(screen.screenSize.width, screen.screenSize.height * (70 / 1024))
    topMask.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'capcalViewTitle', 'developerView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const capcalBox = dxui.View.build('capcalBox', screenMain)
    viewUtils._clearStyle(capcalBox)
    capcalBox.setSize(screen.screenSize.width, screen.screenSize.height - screen.screenSize.height * (140 / 1024))
    capcalBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    capcalBox.bgColor(0xf7f737)
    capcalBox.bgOpa(0)

    let box1 = screen.getCapcal().getBox(0)
    let box2 = screen.getCapcal().getBox(1)

    const capcalView1 = dxui.View.build('capcalView1', capcalBox)
    capcalView1.bgOpa(0)
    capcalView1.borderWidth(screen.screenSize.width * (5 / 600))
    capcalView1.setSize(box1.w, box1.h)
    capcalView1.setPos(box1.x, box1.y - screen.screenSize.height * (140 / 1024))
    // capcalView1.hide()

    const capcalViewLab1 = dxui.Label.build('capcalViewLab1', capcalView1)
    capcalViewLab1.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    capcalViewLab1.textFont(viewUtils.font(26))
    capcalViewLab1.text("第一次标定")
    capcalViewLab1.textColor(0xffffff)

    const capcalView2 = dxui.View.build('capcalView2', capcalBox)
    capcalView2.bgOpa(0)
    capcalView2.borderWidth(screen.screenSize.width * (5 / 600))
    capcalView2.setSize(box2.w, box2.h)
    capcalView2.setPos(box2.x, box2.y - screen.screenSize.height * (140 / 1024))
    capcalView2.hide()

    const capcalViewLab2 = dxui.Label.build('capcalViewLab2', capcalView2)
    capcalViewLab2.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    capcalViewLab2.textFont(viewUtils.font(26))
    capcalViewLab2.text("第二次标定")
    capcalViewLab2.textColor(0xffffff)

    const capcaltimeout = dxui.Label.build('capcaltimeout', screenMain)
    capcaltimeout.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    capcaltimeout.textFont(viewUtils.font(26))
    capcaltimeout.text("30秒后超时退出")
    capcaltimeout.textColor(0xffffff)
}


export default capcalView
