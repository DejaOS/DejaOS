import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import topView from "./topView.js"
import screen from '../screen.js'
import mainView from './mainView.js'
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js'
const wechatFaceView = {}

let option = {}

wechatFaceView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('wechatFaceView', dxui.Utils.LAYER.MAIN)
    wechatFaceView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgOpa(0)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        faceTackLbl.show()
        wechatFaceView.ccount = 4
        faceTackLbl.text("3秒后开始抓拍")
        wechatFaceView.ctimer = std.setInterval(() => {
            wechatFaceView.ccount--
            faceTackLbl.text((wechatFaceView.ccount -1) + "秒后开始抓拍")
            if(wechatFaceView.ccount == 1){
                faceTackLbl.hide()
            }else if (wechatFaceView.ccount == 0) {
                std.clearInterval(wechatFaceView.ctimer)
                wechatFaceView.ctimer = null

                let faceData = null, faceBase64 = null, code = screen.MQTT_CODE.E_100
                try {
                    // 人脸抓拍，超时时间是10秒，10秒内没有抓拍到人脸，则mqtt返回失败
                    faceData = screen.tackFace()
                    faceBase64 = dxCommonUtils.fs.fileToBase64(faceData.picPath)
                    wechatFaceView.statusPanel.success("wechatFaceView.tackSuccess")
                } catch (error) {
                    wechatFaceView.statusPanel.fail("wechatFaceView.tackError")
                }
                if(faceBase64){
                    code = screen.MQTT_CODE.S_000
                }
                let payload = screen.mqttReply(option.serialNo, { keyId: option.keyId, faceBase64: faceBase64 }, code)
                option = {}
                payload.uuid = payload.uuid.toUpperCase()
                screen.driver.mqtt.send("access_device/v2/cmd/control_reply", JSON.stringify(payload))
                std.setTimeout(() => {
                    dxui.loadMain(mainView.screenMain)
                }, 1000);
            }
        }, 1000);
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        if (wechatFaceView.ctimer) {
            std.clearInterval(wechatFaceView.ctimer)
            wechatFaceView.ctimer = null
        }
    })

    const titleBoxBg = dxui.View.build(screenMain.id + 'titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (70 / 1024))
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)    

    // 远程抓拍标题
    const titleBox = dxui.View.build("wechatFaceViewTitle", screenMain)
    viewUtils._clearStyle(titleBox)
    titleBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (70 / 1024))
    titleBox.bgColor(0xffffff)

    // 远程抓拍标题文字
    const titleLbl = dxui.Label.build('wechatFaceViewTitle' + 'title', titleBox)
    titleLbl.textFont(viewUtils.font(32))
    titleLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    titleLbl.dataI18n = 'wechatFaceView.title'
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const faceTack = dxui.Image.build('faceTack', screenMain)
    faceTack.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    faceTack.source(screen.resourcePath.imagePath + '/faceRec2.png')

    const faceTackLbl = dxui.Label.build('faceTackLbl', screenMain)
    faceTackLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    faceTackLbl.text(wechatFaceView.ccount + "秒后开始抓拍")
    faceTackLbl.textFont(viewUtils.font(28))
    faceTackLbl.textColor(0xffffff)

    wechatFaceView.statusPanel = viewUtils.statusPanel(screenMain)    
}

// 抓拍人脸
wechatFaceView.weComTackFace = function (data) {
    option.keyId = data.data.extra.keyId
    option.serialNo = data.serialNo

}


export default wechatFaceView