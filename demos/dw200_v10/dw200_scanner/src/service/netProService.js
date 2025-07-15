import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import ota from "../../dxmodules/dxOta.js";
import driver from '../driver.js'
import utils from '../common/utils/utils.js';
import codeService from './codeService.js';
import std from '../../dxmodules/dxStd.js'
import dxMap from '../../dxmodules/dxMap.js'
import vgProService from './vgProService.js'

const netProService = {}

netProService.receiveMsg = function (data) {
    log.info('[netProService]  receiveMsg:' + JSON.stringify(data))
    if (config.get("sysInfo.owifi") == 8) {
        // 协议TCP 模式
        let map = dxMap.get("NETPRO")
        let waitResponse = map.get("waitResponse")
        if (!waitResponse) {
            log.error("请先请求")
            return
        }
        if (new Date().getTime() - waitResponse > config.get("sysInfo.touttime") * 1000) {
            log.error("回复超时")
            map.del("waitResponse")
            return
        }
        map.del("waitResponse")
        return this.netRes({ source: 'tcp', data: common.utf8HexToStr(common.arrToHex(data)) })
    }
    if (!data.bcc) {
        log.error("校验字错误")
        return
    }
    const specProCmds = ["37", "b0", "54", "58", "56", "5A", "57"]
    if ((config.get('sysInfo.w_mode') == 2 && config.get("sysInfo.dchannel") == 64) || specProCmds.includes(data.cmd)) {
        let topic = "cmd" + data.cmd
        if (!vgProService[topic]) {
            log.error("未实现此方法", topic)
            // driver.tcp.sendVg({ "cmd": data.cmd, "result": '90', "length": 0, "data": '' })
            return
        }
        vgProService[topic]({ source: 'tcp', pack: data })
    }
}

netProService.netRes = function (data) {
    log.info('[netProService]  netRes:' + JSON.stringify(data))
    // let beepFlag = config.get('sysInfo.ascan') & 1 == 1 || config.get('sysInfo.anfc') & 1 == 1
    let content = data.data.split("&&")
    let language = config.get('sysInfo.language') || 0
    if (!content[0].startsWith("code=")) {
        log.error("http/tcp协议格式错误")
        // 失败
        let awifi_f = config.get("sysInfo.awifi_f")
        if (awifi_f & 1 == 1 ) {
            std.setTimeout(() => {
                // 为解决音画同步，蜂鸣晚一点执行，否则蜂鸣会阻塞ui
                driver.pwm.beep(config.get("sysInfo.beepd"), null, 1)
            }, 100)
        }
        if ((awifi_f >> 11) & 1 == 1) {
            if (language == 1) {
                driver.audio.play("f_eng")
            } else {
                driver.audio.play("f")
            }
        }
        if ((awifi_f >> 13) & 1 == 1) {
            driver.screen.customPopWin(language == 1 ? "fail" : "失败", 2000, false, false)
        }
        return
    }
    let code = parseInt(content[0].substring(5), 16)

    // 成功的ui展示
    if (code == 0) {
        let wavFileName
        let resultCode
        // 显示文字了就不显示弹窗
        let flag = true
        if (content[1] == "desc=json" && content[2]) {
            let uiInfo = JSON.parse(content[2])
            let msg = uiInfo.msg
            let msgTimeout = uiInfo.msgTimeout
            let img = uiInfo.img
            let imgTimeout = uiInfo.imgTimeout
            wavFileName = uiInfo.wavFileName
            resultCode = uiInfo.resultCode
            if (img) {
                driver.screen.customShowMsgAndImg(undefined, undefined, img, imgTimeout)
                flag = false
            }
            if (msg) {
                driver.screen.customPopWin(msg, msgTimeout, false, true)
                flag = false
            }
        }
        // 成功
        let awifi_s = config.get("sysInfo.awifi_s")
        if (awifi_s & 1 == 1 ) {
            std.setTimeout(() => {
                driver.pwm.beep(config.get("sysInfo.beepd"), null, 1)
            }, 100)
        }
        if ((resultCode == "0000" || utils.isEmpty(resultCode)) && (awifi_s >> 6) & 1 == 1) {
            driver.gpio.relay(1)
        }
        // 如果有自定义语音则播放自定义语音，否则播放默认
        if (wavFileName) {
            driver.audio.play(wavFileName)
        } else if ((awifi_s >> 10) & 1 == 1) {
            if (language == 1) {
                driver.audio.play("s_eng")
            } else {
                driver.audio.play("s")
            }
        }
        if ((awifi_s >> 12) & 1 == 1 && flag) {
            driver.screen.customPopWin(language == 1 ? "success" : "成功", 2000, false, true)
        }
    }

    // 传输动作行为
    if (code >= 1 && code <= 8) {
        // 成功
        let awifi_s = config.get("sysInfo.awifi_s")
        if (awifi_s & 1 == 1 ) {
            std.setTimeout(() => {
                driver.pwm.beep(config.get("sysInfo.beepd"), null, 1)
            }, 100)
        }
        if ((awifi_s >> 6) & 1 == 1) {
            driver.gpio.relay(1)
        }
        // 播放音频
        driver.audio.play(code + 8)
        if ((awifi_s >> 10) & 1 == 1) {
            if (language == 1) {
                driver.audio.play("s_eng")
            } else {
                driver.audio.play("s")
            }
        }
        if ((awifi_s >> 12) & 1 == 1) {
            driver.screen.customPopWin(language == 1 ? "success" : "成功", 2000, false, true)
        }

    } else if (code > 8) {
        // 失败
        let awifi_f = config.get("sysInfo.awifi_f")
        if (awifi_f & 1 == 1 ) {
            std.setTimeout(() => {
                // 为解决音画同步，蜂鸣晚一点执行，否则蜂鸣会阻塞ui
                driver.pwm.beep(config.get("sysInfo.beepd"), null, 1)
            }, 100)
        }
        if ((awifi_f >> 11) & 1 == 1) {
            if (language == 1) {
                driver.audio.play("f_eng")
            } else {
                driver.audio.play("f")
            }
        }
        if ((awifi_f >> 13) & 1 == 1 && !(code == 0x02ff && content[1].startsWith("msg="))) {
            driver.screen.customPopWin(language == 1 ? "fail" : "失败", 2000, false, false)
        }
    }

    // 获取配置信息
    if (code == 0x01ff) {
        let configAll = config.getAll()
        let bleInfo = driver.uartBle.getConfig()
        if (bleInfo && typeof bleInfo == 'object') {
            configAll['sysInfo.ble_name'] = bleInfo.name
            configAll['sysInfo.ble_mac'] = bleInfo.mac
        }
        let res = "vgdevicecfginforesult=" + utils.jsonObjectToString(configAll)
        if (data.source == "http") {
            driver.http.sendVg(common.strToUtf8Hex(res))
        } else if (data.source == "tcp") {
            driver.tcp.sendVg(common.strToUtf8Hex(res))
        }
    }
    // 展示文字内容
    if (code == 0x02ff && content[1].startsWith("msg=")) {
        let msg = content[1].substring(4).replaceAll("\"", "")
        driver.screen.customPopWin(msg, 2000, false, false)
    }

    // http升级静态资源
    if (code == 0x03ff && content[1].startsWith("url=") && content[2].startsWith("md5=")) {
        let url = content[1].substring(4)
        let md5 = content[2].substring(4)
        let reboot = content[3] == 'reboot=1'
        try {
            updateBegin()
            ota.updateResource(url, md5, utils.getUrlFileSize(url) / 1024, codeService.updateResourceShell)
            updateEnd()
            if (reboot) {
                common.asyncReboot(1)
            }
        } catch (error) {
            updateFailed(error.message)
        }
    }
    // http升级应用升级
    if (code == 0x00ff && content[1].startsWith("url=") && content[2].startsWith("md5=")) {
        let url = content[1].substring(4)
        let md5 = content[2].substring(4)
        let reboot = content[3] == 'reboot=1'
        try {
            updateBegin()
            ota.updateHttp(url, md5, 300)
            updateEnd()
            if (reboot) {
                common.asyncReboot(1)
            }
        } catch (error) {
            updateFailed(error.message)
        }
    }
}

function updateFailed(errorMsg) {
    if (errorMsg.includes("Download failed, please check the url")) {
        errorMsg = 'Upgrade package download failed'
    }
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Failed: " + (errorMsg ? errorMsg : "Upgrade package download failed"), 600000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级失败: " + (codeService.errorMsgMap[errorMsg] ? codeService.errorMsgMap[errorMsg] : "下载失败，请检查网址"), 600000, true, "waring", false)
    }
}
function updateBegin() {
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Start Upgrading", 600000, true, "waring", false)
    } else {
        driver.screen.customPopWin("开始升级", 600000, true, "waring", false)
    }
}

function updateEnd() {
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Successfully", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级成功", 2000, true, "waring", false)
    }
}

export default netProService
