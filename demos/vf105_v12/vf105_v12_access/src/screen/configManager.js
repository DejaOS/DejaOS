import config from '../../dxmodules/dxConfig.js'
import configService from '../service/configService.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'

// Cloud certificate activation, returns 0 on success, non-zero on failure
function nfcIdentityCardActivation(code) {
  return driver.eid.active(config.get("sys.sn"), config.get("sys.appVersion"), config.get("sys.mac"), code);
}

// Save configuration
function saveConfig(configAll) {
  if (configAll && configAll.net) {
    // Check whether ssid and/or psk are present
    if (configAll.net.ssid || configAll.net.psk) {
      // Add any extra handling here
      bus.fire("setConfig", configAll)
      return true
    }
  }
  return configService.configVerifyAndSave(configAll)
}

// Get configuration
function getConfig() {
  let config1 = config.getAll()
  return config1
}

//  Password access
function pwdAccess(pwd) {
  // TODO improve access logic
  bus.fire("access", { data: { type: "400", code: pwd } })
}

export { nfcIdentityCardActivation, saveConfig, getConfig, pwdAccess }

