import bus from '../../dxmodules/dxEventBus.js'
import driver from '../driver.js'
import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'

// Switch network type
function switchNetworkType(data) {
  bus.fire("switchNetworkType", data)
}

// Get Wi‑Fi list
function netGetWifiSsidList() {
  bus.fire("netGetWifiSsidList")
}

function netWifiSsidList(data, networkSettingView, screen) {
  if (data.length == 0 && config.get("net.type") == 2) {
    // Wi‑Fi
    std.setTimeout(() => {
      screen.netGetWifiSsidList()
    }, 1000)
    return
  }
  networkSettingView.wifiListData = data
  networkSettingView.wifiList.refresh()
}

// Connect to Wi‑Fi
function netConnectWifiSsid(ssid, psk) {
  return driver.net.netConnectWifiSsid(ssid, psk)
}

// Get card number
function getCard(card, localUserAddView) {
  localUserAddView.cardBoxInput.text(card)
}

export { switchNetworkType, netGetWifiSsidList, netWifiSsidList, netConnectWifiSsid, getCard }

