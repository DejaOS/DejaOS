import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import networkSettingView from './config/menu/networkSettingView.js'
import wechatBindView from "./wechatBindView.js"
import topView from './topView.js'
import screen from '../screen.js'
const wechatNetView = {}
wechatNetView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('wechatNetView', dxui.Utils.LAYER.MAIN)
    wechatNetView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    // 企业微信图标
    const wechatImg = dxui.Image.build('wechatNetImg', screenMain)
    wechatImg.source(screen.resourcePath.imagePath + '/wechat.png')
    wechatImg.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (150 / 1024))

    // 连接网络提示标签
    const netConfigLbl = dxui.Label.build('netConfigLbl', screenMain)
    wechatNetView.netConfigLbl = netConfigLbl
    netConfigLbl.text('请先连接网络')
    netConfigLbl.textFont(viewUtils.font(30))
    netConfigLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (500 / 1024))
    netConfigLbl.dataI18n = 'wechatNetView.netConnect'

    // 网络配置按钮
    const netConfigBtn = viewUtils.bottomBtn(screenMain, 'netConfigBtn', 'wechatNetView.netConfig', () => {
        networkSettingView.screenMain.backScreen = wechatNetView.screenMain
        networkSettingView.screenMain.titleBox.backScreen = wechatNetView.screenMain
        netConfigLbl.text('正在连接网络......')
        dxui.loadMain(networkSettingView.screenMain)
    })
    netConfigBtn.btnLbl.text("网络配置")
    netConfigBtn.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (550 / 1024))

    const wechatNetBox = dxui.View.build('wechatNetBox', screenMain)
    viewUtils._clearStyle(wechatNetBox)
    wechatNetBox.width(screen.screenSize.width)
    wechatNetBox.height(screen.screenSize.height * (70 / 1024))
    wechatNetBox.bgOpa(0)
    wechatNetBox.clickable(false)
    wechatNetBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatNetBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    wechatNetBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    // 企业微信SN标签
    const wechatSnBox = dxui.View.build('wechatNetSnBox', wechatNetBox)
    viewUtils._clearStyle(wechatSnBox)
    wechatSnBox.width(screen.screenSize.width / 2)
    wechatSnBox.height(screen.screenSize.height * (70 / 1024))
    wechatSnBox.padLeft(screen.screenSize.width * (38 / 600))
    wechatSnBox.bgOpa(0)
    wechatSnBox.clickable(false)
    wechatSnBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatSnBox.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const wechatSnLbl = dxui.Label.build('wechatNetSnLbl', wechatSnBox)
    wechatSnLbl.textFont(viewUtils.font(20))
    wechatSnLbl.text("SN: " + screen.getConfig()["sys.sn"])
    wechatSnLbl.textColor(0x2e2e2e)

    // 企业微信IP标签
    const wechatIpBox = dxui.View.build('wechatNetIpBox', wechatNetBox)
    viewUtils._clearStyle(wechatIpBox)
    wechatIpBox.width(screen.screenSize.width / 2)
    wechatIpBox.height(screen.screenSize.height * (70 / 1024))
    wechatIpBox.padRight(screen.screenSize.width * (23 / 600))
    wechatIpBox.bgOpa(0)
    wechatIpBox.clickable(false)
    wechatIpBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    wechatIpBox.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const wechatIpLbl = dxui.Label.build('wechatNetIpLbl', wechatIpBox)
    wechatNetView.wechatIpLbl = wechatIpLbl
    wechatIpLbl.textFont(viewUtils.font(20))
    wechatIpLbl.text("IP: " + screen.getConfig()["net.ip"])
    wechatIpLbl.textColor(0x2e2e2e)

    // 创建定时器
    wechatNetView.timerCreate()

    std.setTimeout(() => {
        topView.changeTheme(true)
    }, 3000)
}

// 创建定时器方法
wechatNetView.timerCreate = function () {
    // 启动一个定时器，在跳转到设备绑定页面后删除该定时器
    if (screen.weCom.isWeCom() && screen.weCom.getStatus() === 0) {
        std.setTimeout(() => {
            screen.faceRecgPause()
        }, 10000)
        wechatNetView.timer = std.setInterval(() => {
            // 获取网络状态
            let netIsConnected = screen.driver.net.isConnected()
            if (netIsConnected) {
                wechatNetView.netConfigLbl.text('网络连接成功, 正在跳转设备绑定页面......')
                // 网络连接成功，跳转到设备绑定页面
                std.clearInterval(wechatNetView.timer)
                wechatNetView.timer = null
                wechatBindView.getQrCode()
                dxui.loadMain(wechatBindView.screenMain)
            }
            topView.changeTheme(true)
        }, 500)
    }
}

export default wechatNetView