import bus from '../../dxmodules/dxEventBus.js'
import net from '../../dxmodules/dxNet.js'
import config from '../../dxmodules/dxConfig.js'
import i18n from '../view/i18n.js'

// Bus events
function busEvents(screen, mainView, topView, networkSettingView) {
  // Network status
  bus.on('netStatus', (data) => {
    console.log(JSON.stringify(data));
    let type = config.get("net.type")
    if (data.connected) {
      let ip = net.getModeByCard(type).param.ip
      mainView.ipLbl.text("IP:" + ip)
      config.setAndSave("net.ip", ip)
      config.setAndSave("net.mac", net.getMacaddr(type))
      topView.ethConnectState(true, type)
      networkSettingView.netInfo[10].label.dataI18n = "networkSettingView.networkConnected"
    } else {
      topView.ethConnectState(false, type)
      networkSettingView.netInfo[10].label.dataI18n = "networkSettingView.networkUnconnected"
    }
    i18n.refreshObj(networkSettingView.netInfo[10].label)
  })
  // MQTT connection status
  bus.on('mqttStatus', (data) => {
    if (data == "connected") {
      topView.mqttConnectState(true)
    } else {
      topView.mqttConnectState(false)
    }
  })
  bus.on("beginAddFace", screen.beginAddFace)
  bus.on("faceEnterResult", screen.faceEnterResult)
  bus.on("exitIdle", screen.exitIdle)
  bus.on("netGetWifiSsidList", screen.netGetWifiSsidList)
  bus.on("getCard", screen.getCard)
  bus.on("faceAuthResult", screen.faceAuthResult)
  bus.on("accessRes", screen.accessRes)
  // bus.on("trackUpdate", screen.trackUpdate)
  bus.on("hideSn", screen.hideSn)
  bus.on("changeLanguage", screen.changeLanguage)
  bus.on("hideIp", screen.hideIp)
  bus.on("screenManagerRefresh", screen.screenManagerRefresh)
  bus.on("netWifiSsidList", screen.netWifiSsidList)
  bus.on("appMode", screen.appMode)
  bus.on("upgrade", screen.upgrade)
  // bus.on("cardReset", screen.cardReset)
  bus.on("trackResult", screen.trackResult)
}

export default busEvents

