// Scan result processing
import logger from '../dxmodules/dxLogger.js'
import driver from './driver.js'
import config from '../dxmodules/dxConfig.js'
import common from '../dxmodules/dxCommon.js'
import std from '../dxmodules/dxStd.js'
import mqtt from './mqtthandler.js'
const vg = {}
vg.invoke = function (pack) {
    let data = Array.from(new Uint8Array(pack))
    if (!data || data.length < 0) {
        return
    }
    data = common.arrToHex(data)
    driver.pwm.press()
    logger.info('code: ', data)
    // Configuration code prefix: 5f5f5f564241525f434f4e4649475f56312e312e305f5f5f
    if (data.startsWith('5f5f5f564241525f434f4e4649475f56312e312e305f5f5f')) {
        try {
            setConfig(common.utf8HexToStr(data))
        } catch (error) {
            logger.error(error)
            driver.pwm.fail()
        }
        return
    }
    driver.pwm.success()
    mqtt.accessOnline('code', data)// Passthrough
}
function setConfig(pack) {// Scan configuration
    const start = '___VBAR_CONFIG_V1.1.0___'.length
    const end = pack.indexOf('--')
    pack = pack.substring(start, end).replaceAll('=', ':')
    const obj = std.parseExtJSON(pack)
    if (obj.hasOwnProperty('update_flag') || obj.hasOwnProperty('update_flg')) {// Upgrade handled in separate thread
        std.setTimeout(function(){
            driver.ota.update(obj)
        },10)
        return
    }
    // Once a reboot is required, it won't change
    const results = []
    results.push(applyConfig(obj, 'net.', ['ip_mode', 'net_type', 'macaddr', 'ip', 'mask', 'gateway', 'dns'], true))
    results.push(applyConfig(obj, 'sys.', ['sn_show', 'ver_show', 'boot_music', 'devname', 'volume', 'net_show','ntpgmt'], true))
    results.push(applyConfig(obj, 'mqtt.', ['mqttaddr', 'mqttusername', 'mqttpassword'], true))
    const reboot = results.reduce((acc, cur) => acc || cur, false)// If any result is true, reboot is required
    driver.pwm.success()
    if (reboot) {
        common.asyncReboot(2)
    }
}
function applyConfig(obj, pre, items, isReboot) {
    let reboot = false;
    for (const item of items) {
        if (obj.hasOwnProperty(item)) {
            config.setAndSave(pre + item, obj[item])
            reboot = true;
        }
    }
    return isReboot ? reboot : false;// Some don't need to consider reboot, directly return false
}
export default vg