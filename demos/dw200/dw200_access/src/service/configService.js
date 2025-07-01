import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import common from '../../dxmodules/dxCommon.js'
import dxNtp from '../../dxmodules/dxNtp.js'
import base64 from '../../dxmodules/dxBase64.js'
import bus from '../../dxmodules/dxEventBus.js'
import * as os from "os";

const configService = {}

// 匹配以点分十进制形式表示的 IP 地址，例如：192.168.0.1。
const ipCheck = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
// 匹配 www.baidu.com or www.baidu.com:1883 or 192.168.0.1:8080
const ipOrDomainCheckWithPort = v => /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d{1,5})?$/.test(v);

// 正整数
const regpCheck = v => /^[1-9]\d*$/.test(v)
// 非负整数
const regnCheck = v => /^([1-9]\d*|0{1})$/.test(v)
// base64格式
const base64Check = v => /^data:image\/(png|jpg|jpeg|bmp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)
// 所有支持的配置项的检验规则以及设置成功后的回调

const supported = {
    netInfo: {
        type: { rule: v => [0, 1, 2, 4].includes(v) },
        // 1:动态,0:静态
        dhcp: { rule: v => [0, 1].includes(v) },
        ip: { rule: ipCheck },
        gateway: { rule: ipCheck },
        dns: { rule: v => !v.split(",").some(ip => !ipCheck(ip)) },
        subnetMask: { rule: ipCheck },
        netMac: { rule: v => typeof v == 'string' },
        fixed_macaddr_enable: { rule: v => [0, 2].includes(v) },
        // 0：关闭 2：定时同步
        ntp: { rule: v => [0, 2].includes(v) },
        ntpAddr: { rule: v => typeof v == 'string', callback: v => bus.fire("ntpUpdate") },
        ntpHour: { rule: regpCheck },
        ntpLocaltime: { rule: regnCheck, callback: v => dxNtp.updateGmt(v) },
        //wifi用户名
        ssid: { rule: v => typeof v == 'string' },
        //wifi 密码
        psk: { rule: v => typeof v == 'string' },
    },
    mqttInfo: {
        mqttAddr: { rule: ipOrDomainCheckWithPort },
        clientId: { rule: v => typeof v == 'string' },
        mqttName: { rule: v => typeof v == 'string' },
        password: { rule: v => typeof v == 'string' },
        qos: { rule: v => [0, 1, 2].includes(v) },
        prefix: { rule: v => typeof v == 'string' },
    },
    bleInfo: {
        mac: { rule: v => /^[0-9|a-f|A-F]{12}$/.test(v), callback: v => driver.uartBle.setConfig({ mac: v }) },
        name: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ name: v }) },
    },
    uiInfo: {
        rotation: {
            rule: v => [0, 1, 2, 3].includes(v), callback: v => {
                switch (v) {
                    case 0:
                        v = 1
                        break;
                    case 1:
                        v = 0
                        break;
                    case 2:
                        v = 3
                        break;
                    case 3:
                        v = 2
                        break;
                }
                config.set("uiInfo.rotation", v)
                driver.screen.reload()
            }
        },
        statusBar: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        rotation0BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation1BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation2BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation3BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        horBgImage: {
            rule: base64Check, callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, true)
                } catch (error) {
                    log.error("解码失败", error)
                    config.set("uiInfo.horBgImage", "")
                    return
                }
                // 由于base64太大，查询配置会慢，所以设置完清空此项
                config.set("uiInfo.horBgImage", "")
                if (!suffix) {
                    return
                }
                config.set("uiInfo.rotation1BgImage", "/app/code/resource/image/horBgImage" + suffix)
                config.set("uiInfo.rotation3BgImage", "/app/code/resource/image/horBgImage" + suffix)
                driver.screen.reload()
            }
        },
        verBgImage: {
            rule: base64Check, callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, false)
                } catch (error) {
                    log.error("解码失败", error)
                    config.set("uiInfo.verBgImage", "")
                    return
                }
                // 由于base64太大，所以设置完清空此项
                config.set("uiInfo.verBgImage", "")
                if (!suffix) {
                    return
                }
                config.set("uiInfo.rotation0BgImage", "/app/code/resource/image/verBgImage" + suffix)
                config.set("uiInfo.rotation2BgImage", "/app/code/resource/image/verBgImage" + suffix)
                driver.screen.reload()
            }
        },
        //sn是否隐藏 1 显示 0 隐藏
        sn_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        //ip是否隐藏 1 显示 0 隐藏
        ip_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        buttonText: { rule: v => typeof v == 'string' && v.length <= 6, callback: v => driver.screen.reload() },
        fontPath: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        show_unlocking: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
    },
    doorInfo: {
        openMode: { rule: v => [0, 1, 2, 3].includes(v), callback: openModeCb },
        openTime: { rule: regpCheck },
        openTimeout: { rule: regpCheck },
        onlinecheck: { rule: v => [0, 1].includes(v) },
        timeout: { rule: regpCheck },
        offlineAccessNum: { rule: regpCheck },
    },
    sysInfo: {
        //语音音量
        volume: { rule: regnCheck },
        //按键音量
        volume2: { rule: regnCheck },
        //蜂鸣音量
        volume3: { rule: regnCheck },
        //版本号显示隐藏
        version_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        heart_time: { rule: v => /^(3[0-9]{1,}|[4-9]\d*)$/.test(v) },
        heart_en: { rule: v => [0, 1].includes(v) },
        heart_data: { rule: v => typeof v == 'string' },
        //设备号
        deviceNum: { rule: regnCheck },
        // 设备名称
        deviceName: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        com_passwd: { rule: v => v.length == 16 },
        //语言  0中文1英文
        language: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        status: { rule: v => [1, 2].includes(v) },
        nfc_identity_card_enable: { rule: v => [1, 3].includes(v) },
        //1打开0关闭
        nfc: { rule: v => [0, 1].includes(v) },
        // 设置系统时间，秒级
        time: { rule: v => /^([1-9]\d{0,9}|0)$/.test(v), callback: v => common.systemBrief(`date -s "@${v}"`) },
        //蓝牙名称
        ble_name: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ name: v }) },
        //蓝牙 mac
        ble_mac: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ mac: v }) },
        dateFormat: { rule: v => [1, 2].includes(v), callback: v => driver.screen.timeFormat() },
        timeFormat: { rule: v => [1, 2].includes(v), callback: v => driver.screen.timeFormat() },
        reportCount: { rule: regnCheck },
        reportInterval: { rule: regnCheck },
        //-1 关闭自动重启 0-23 整点重启
        autoRestart: { rule: v => typeof v == 'number' && /^(-1|[0-9]|1[0-9]|2[0-3])$/.test(v.toString()) },
    },
    scanInfo: {
        //码制选择根据比特位来的 全选64511
        de_type: { rule: regnCheck },
        //扫码模式 0是间隔 1是单次
        sMode: { rule: v => [0, 1].includes(v) },
        //间隔生效  间隔时间
        interval: { rule: regnCheck },
    },
    nfcInfo: {
        nfcType: { rule: v => [1, 2, 3].includes(v) },
        sectorNumber: { rule: v => typeof v == 'number' && /^([0-9]|1[0-5])$/.test(v.toString()) },
        blockNumber: { rule: v => [0, 1, 2].includes(v) },
        secretkeyType: { rule: v => [1, 2].includes(v) },
        secretkey: { rule: v => /^[0-9a-fA-F]{12}$/.test(v) }
    }
}
// 需要重启的配置
const needReboot = ["netInfo", "mqttInfo", "sysInfo.volume", "sysInfo.volume2", "sysInfo.volume3", "sysInfo.heart_time", "sysInfo.heart_en", "sysInfo.nfc_identity_card_enable",
    'scanInfo.de_type', 'sysInfo.nfc', 'uiInfo.fontPath', 'sysInfo.autoRestart']

// 统一用户配置校验方法
configService.configVerifyAndSave = function (data) {
    let isReboot = false
    let allPassed = true
    for (const key in data) {
        if (!supported[key]) {
            allPassed = false
            return key + " not supported"
        }
        const item = data[key];
        if (typeof item != 'object') {
            allPassed = false
            // 必须是一个组
            return
        }
        if (needReboot.includes(key)) {
            isReboot = true
        }
        for (const subKey in item) {
            let option = supported[key][subKey]
            if (utils.isEmpty(option)) {
                allPassed = false
                return subKey + " not supported"
            }
            const value = item[subKey];
            if (needReboot.includes(key + "." + subKey)) {
                isReboot = true
            }
            if (option.rule && !option.rule(value)) {
                allPassed = false
                return value + " check failure"
            }
        }
    }
    if (allPassed) {
        for (const key in data) {
            const item = data[key];
            for (const subKey in item) {
                let option = supported[key][subKey]
                const value = item[subKey];
                config.set(key + "." + subKey, value)
                if (option.callback) {
                    log.info("[configService] configVerifyAndSave: 执行配置设置回调")
                    // 执行配置设置回调
                    option.callback(value)
                }
            }
        }
    }

    config.save()
    // 检查需要重启的配置，3秒后重启
    if (isReboot) {
        common.asyncReboot(3)
    }
    return true
}

// 开门模式修改回调
function openModeCb (value) {
    if (value == 1) {
        driver.gpio.open()
    } else {
        driver.gpio.close()
    }
}

// base64图片保存
// data:image/jpg;base64,/data:image/jpeg;base64,
// data:image/png;base64,
// data:image/bmp;base64,
function base64ImageSave (value, isHor) {
    if (value == "") {
        return false
    }
    let suffix = ".png"
    // base64转图片保存
    let jpg_prefix1 = "data:image/jpg;base64,"
    let jpg_prefix2 = "data:image/jpeg;base64,"
    let png_prefix = "data:image/png;base64,"
    let bmp_prefix = "data:image/bmp;base64,"
    if (value.startsWith(jpg_prefix1)) {
        value = value.slice(jpg_prefix1.length)
        suffix = ".jpg"
    } else if (value.startsWith(jpg_prefix2)) {
        value = value.slice(jpg_prefix2.length)
        suffix = ".jpg"
    } else if (value.startsWith(png_prefix)) {
        value = value.slice(png_prefix.length)
        suffix = ".png"
    } else if (value.startsWith(bmp_prefix)) {
        value = value.slice(bmp_prefix.length)
        suffix = ".bmp"
    } else {
        log.error("base64前缀错误")
        return false
    }

    let buf = base64.toUint8Array(value)
    let fd = os.open("/app/code/resource/image/" + (isHor ? "horBgImage" : "verBgImage") + suffix, os.O_RDWR | os.O_CREAT | os.O_TRUNC);
    let len = os.write(fd, buf.buffer, 0, buf.length)

    if (len != buf.length) {
        log.error("base64转图片失败")
        return false
    }
    if (os.close(fd) != 0) {
        log.error("存储文件失败")
        return false
    }
    return suffix
}

export default configService