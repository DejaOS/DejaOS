import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import viewUtils from "./viewUtils.js"
import mainView from './mainView.js'
import wechatNetView from './wechatNetView.js'
import networkSettingView from './config/menu/networkSettingView.js'
import configView from './config/configView.js'
import common from '../../dxmodules/dxCommon.js'
import topView from './topView.js'
import screen from '../screen.js'
const wechatBindView = {}

// 全局标志-判断二维码是否获取成功
let qrCodeGetSuccess = false

wechatBindView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('wechatBindView', dxui.Utils.LAYER.MAIN)
    wechatBindView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    // 企业微信图标
    const wechatImg = dxui.Image.build('wechatBindImg', screenMain)
    wechatImg.source(screen.resourcePath.imagePath + '/wechat.png')
    wechatImg.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (150 / 1024))

    // 绑定设备提示标签
    const bindDeviceLbl = dxui.Label.build('bindDeviceLbl', screenMain)
    wechatBindView.bindDeviceLbl = bindDeviceLbl
    bindDeviceLbl.text('正在获取企微绑定二维码')
    bindDeviceLbl.textFont(viewUtils.font(30))
    bindDeviceLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (500 / 1024))
    bindDeviceLbl.dataI18n = 'wechatBindView.getQrCode'

    wechatBindView.statusPanel = viewUtils.statusPanel(screenMain, 'wechatBindView.success', 'wechatBindView.fail')

    const wechatBindBox = dxui.View.build('wechatBindBox', screenMain)
    viewUtils._clearStyle(wechatBindBox)
    wechatBindBox.width(screen.screenSize.width)
    wechatBindBox.height(screen.screenSize.height * (70 / 1024))
    wechatBindBox.bgOpa(0)
    wechatBindBox.clickable(false)
    wechatBindBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatBindBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    wechatBindBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    // 企业微信SN标签
    const wechatSnBox = dxui.View.build('wechatBindSnBox', wechatBindBox)
    viewUtils._clearStyle(wechatSnBox)
    wechatSnBox.width(screen.screenSize.width / 2)
    wechatSnBox.height(screen.screenSize.height * (70 / 1024))
    wechatSnBox.padLeft(screen.screenSize.width * (38 / 600))
    wechatSnBox.bgOpa(0)
    wechatSnBox.clickable(false)
    wechatSnBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatSnBox.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const wechatSnLbl = dxui.Label.build('wechatBindSnLbl', wechatSnBox)
    wechatSnLbl.textFont(viewUtils.font(20))
    wechatSnLbl.text("SN: " + screen.getConfig()["sys.sn"])
    wechatSnLbl.textColor(0x2e2e2e)

    // 企业微信IP标签
    const wechatIpBox = dxui.View.build('wechatBindIpBox', wechatBindBox)
    viewUtils._clearStyle(wechatIpBox)
    wechatIpBox.width(screen.screenSize.width / 2)
    wechatIpBox.height(screen.screenSize.height * (70 / 1024))
    wechatIpBox.padRight(screen.screenSize.width * (23 / 600))
    wechatIpBox.bgOpa(0)
    wechatIpBox.clickable(false)
    wechatIpBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatIpBox.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const wechatIpLbl = dxui.Label.build('wechatBindIpLbl', wechatIpBox)
    wechatBindView.wechatIpLbl = wechatIpLbl
    wechatIpLbl.textFont(viewUtils.font(20))
    wechatIpLbl.text("IP: " + screen.getConfig()["net.ip"])
    wechatIpLbl.textColor(0x2e2e2e)

    bus.on("showQrCode", wechatBindView.showQrCode)
    bus.on("weComIsBind", wechatBindView.weComIsBind)
}

wechatBindView.getQrCode = function () {
    wechatBindView.timer = std.setInterval(() => {
        let netIsConnected = screen.driver.net.isConnected()
        if (netIsConnected && !qrCodeGetSuccess) {
            let payload = screen.mqttReply(std.genRandomStr(10), { type: 0 }, screen.MQTT_CODE.S_000)
            payload.uuid = payload.uuid.toUpperCase()
            screen.driver.mqtt.send("access_device/v2/event/wecom", JSON.stringify(payload))
        }else if(!netIsConnected){
            // 网络连接失败, MQTT连接失败, 请检查网络连接, 跳转到企业微信网络配置页面
            wechatNetView.netConfigLbl.text('请先连接网络')
            wechatNetView.timerCreate()
            std.clearInterval(wechatBindView.timer)
            wechatBindView.timer = null
            dxui.loadMain(wechatNetView.screenMain)
        }
    }, 1000)
}

// 企业微信
wechatBindView.showQrCode = function (data) {
    if (data) {

        // 如果企微绑定状态不一致，则更新企微绑定状态
        if(screen.weCom.getStatus() !== data.status){
            if(data.status === 0){
                // 说明设备已解绑
                // 删除凭证、人员、权限、人脸
                screen.deleteAll()
                screen.driver.face.clean()

                wechatNetView.timerCreate()
                // 跳转到企业微信网络配置页面
                dxui.loadMain(wechatNetView.screenMain)
            }else{
                // 说明设备已经绑定(这个时候因为是状态对齐，因此就不需要播报绑定成功语音了)
                wechatBindView.success()
            }
            screen.saveConfig({ sys: { weComStatus: data.status } })
            return
        }

        wechatBindView.bindDeviceLbl.text('请使用企业微信扫码绑定设备')
        wechatBindView.bindDeviceLbl.dataI18n = 'wechatBindView.bindDevice'

        // 设备绑定二维码
        if (!wechatBindView.qrcode) {
            const qrcode = dxui.View.build('wechatQrCode', wechatBindView.screenMain)
            wechatBindView.qrcode = qrcode
            viewUtils._clearStyle(qrcode)
            qrcode.setSize(screen.screenSize.width * (255 / 600), screen.screenSize.height * (255 / 1024))
            qrcode.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (550 / 1024));
            const qrcodeObj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, screen.screenSize.width * (255 / 600), 0x000000, 0xffffff)
            wechatBindView.qrcodeObj = qrcodeObj
            dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(wechatBindView.qrcodeObj, data.bindQr)
            qrCodeGetSuccess = true
        }

        // 保存绑定状态
        screen.saveConfig(
            {
                sys: {
                    weComStatus: data.status
                }
            }
        )

        if (data.status == 1) {
            wechatBindView.success()
        }
    }
}

// 远程控制-接收企业微信绑定状态通知
wechatBindView.weComIsBind = function (event) {
    if (event) {
        let data = event.data.extra
        let payload = screen.mqttReply(event.serialNo, null, screen.MQTT_CODE.S_000)
        payload.uuid = payload.uuid.toUpperCase()
        payload.message = "success"

        if (screen.weCom.isWeCom() && screen.weCom.getStatus() === 1 && data.weComStatus === 1) {
            // 如果设备当前是绑定状态，且通知是绑定，则跳转到人脸识别页面
            wechatBindView.success()
        } else if (screen.weCom.isWeCom() && screen.weCom.getStatus() === 1 && data.weComStatus === 0) {
            // 如果设备当前是绑定状态，且通知是解绑，则删除凭证、人脸，然后跳转到企业微信网络配置页面
            screen.saveConfig({ sys: { weComStatus: data.weComStatus } })
            // 删除凭证、人员、权限、人脸
            screen.deleteAll()
            screen.driver.face.clean()

            wechatNetView.timerCreate()
            // 跳转到企业微信网络配置页面
            dxui.loadMain(wechatNetView.screenMain)
        }
        else if (screen.weCom.isWeCom() && screen.weCom.getStatus() === 0 && data.weComStatus === 0) {
            // 如果设备当前是未绑定状态，且通知是未绑定，则跳转到企微绑定页面
            screen.saveConfig({ sys: { weComStatus: data.weComStatus } })
            wechatNetView.timerCreate()
            dxui.loadMain(wechatNetView.screenMain)
        } else if (screen.weCom.isWeCom() && screen.weCom.getStatus() === 0 && data.weComStatus === 1) {
            screen.saveConfig({ sys: { weComStatus: data.weComStatus } })
            wechatBindView.success()
        }else{
            payload.code = screen.MQTT_CODE.E_100
            payload.message = "failed"
        }
        
        screen.driver.mqtt.send("access_device/v2/cmd/control_reply", JSON.stringify(payload))
    }
}

wechatBindView.success = function () {
    screen.driver.audio.ttsPlay("绑定成功")
    wechatBindView.statusPanel.success()
    std.clearInterval(wechatBindView.timer)
    wechatBindView.timer = null
    networkSettingView.screenMain.backScreen = configView.screenMain
    networkSettingView.screenMain.titleBox.backScreen = configView.screenMain
    std.setTimeout(() => {
        // 如果设备当前是未绑定状态，且通知是绑定，则跳转到人脸识别页面
        dxui.loadMain(mainView.screenMain)
    }, 3000)
}

export default wechatBindView