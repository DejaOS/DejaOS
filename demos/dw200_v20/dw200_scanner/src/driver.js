import dxPwm from '../dxmodules/dxPwm.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import dxGpio from '../dxmodules/dxGpio.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxAlsaplay from '../dxmodules/dxAlsaplay.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxNtp from '../dxmodules/dxNtp.js'
import dxMap from '../dxmodules/dxMap.js'
import config from '../dxmodules/dxConfig.js'
import common from '../dxmodules/dxCommon.js'
import dxUart from '../dxmodules/dxUart.js'
import watchdog from '../dxmodules/dxWatchdog.js'
import utils from './common/utils/utils.js'
import uartBleService from './service/uartBleService.js'
import dxTcp from '../dxmodules/dxTcp.js'
import log from '../dxmodules/dxLogger.js'
import bus from '../dxmodules/dxEventBus.js'
import http from '../dxmodules/dxHttp.js'
import netProService from './service/netProService.js'
import safeService from './service/safeService.js'
const driver = {}

driver.pwm = {
    init: function () {
        // 初始化蜂鸣
        dxPwm.request(4);
        dxPwm.setPeriodByChannel(4, 366166)
        dxPwm.enable(4, true)
    },
    // 按键音
    press: function () {
        dxPwm.beep({ channel: 4, time: 30, volume: config.get("sysInfo.volume1"), interval: 0 })
    },
    //失败音
    fail: function () {
        dxPwm.beep({ channel: 4, time: 500, volume: utils.getVolume1(config.get("sysInfo.volume1")), interval: 0 })
    },
    //成功音
    success: function () {
        dxPwm.beep({ channel: 4, time: 30, count: 2, volume: utils.getVolume1(config.get("sysInfo.volume1")) })
    },
    //警告音
    warning: function () {
        dxPwm.beep({ channel: 4, volume: utils.getVolume1(config.get("sysInfo.volume1")), interval: 0 })
    },
    //自定义蜂鸣
    beep: function (time, interval, count) {
        dxPwm.beep({ channel: 4, time: time ? time : config.get('sysInfo.beepd'), volume: utils.getVolume1(config.get("sysInfo.volume1")), interval: interval ? interval : config.get('sysInfo.beepd'), count: count })
    },
}
driver.net = {
    init: function () {
        if (!config.get('sysInfo.net_type')) {
            log.debug("网络已关闭")
            return
        }
        std.setTimeout(() => {
            dxNet.worker.beforeLoop(getNetOptions())
            if (config.get("sysInfo.net_type") == 2) {
                dxNet.netConnectWifiSsid(config.get("sysInfo.ssid"), config.get("sysInfo.psk"), "")
            }
        }, 3000)
    },
    loop: function () {
        if (!config.get('sysInfo.net_type')) {
            log.debug("网络已关闭")
            this.loop = () => { }
        } else {
            this.loop = () => dxNet.worker.loop()
        }
    },
    getStatus: function () {
        let status = dxNet.getStatus()
        if (status.connected == true && status.status == 4) {
            return true
        } else {
            return false
        }

    },
}

// 获取net连接配置
function getNetOptions () {
    let dhcp = config.get("sysInfo.ip_mode")
    dhcp = utils.isEmpty(dhcp) ? dxNet.DHCP.DYNAMIC : (dhcp == 0 ? 2 : 1)
    let dns = config.get("sysInfo.dns")
    dns = utils.isEmpty(dns) ? [null, null] : dns.split(",")
    let ip = config.get("sysInfo.ip")
    let type = config.get("sysInfo.net_type")
    let fixed_macaddr_enable = config.get('sysInfo.fixed_macaddr_enable') || 0
    let macaddr = config.get('sysInfo.macaddr') || common.getUuid2mac()

    if (utils.isEmpty(ip)) {
        // 如果ip未设置，则使用动态ip
        dhcp = dxNet.DHCP.DYNAMIC
    }
    let options = {
        type: type,
        dhcp: dhcp,
        ip: ip,
        gateway: config.get("sysInfo.gateway"),
        netmask: config.get("sysInfo.mask"),
        dns0: dns[0],
        dns1: dns[1],
        macAddr: fixed_macaddr_enable == 2 ? macaddr : common.getUuid2mac(),
    }
    return options
}

driver.gpio = {
    init: function () {
        dxGpio.init()
        // 继电器
        dxGpio.request(35)
    },
    relay: function (status, time) {
        //判断是否开启安全模块
        if (config.get('sysInfo.safe_open') === 1) {
            safeService.open();
        } else {
            dxGpio.setValue(35, status)
            if (status) {
                // 定时关继电器
                std.setTimeout(() => dxGpio.setValue(35, 0), !utils.isEmpty(time) ? time : config.get('sysInfo.relayd'))
            }
        }
    },
    always: function () {
        if (config.get('sysInfo.safe_open') === 1) {
            safeService.open();
        } else {
            dxGpio.setValue(35, 1)
        }

    }
}

driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11', capturerDogId: "watchdog"  },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        if (!config.get('sysInfo.codeSwitch')) {
            log.debug("扫码已关闭")
            return
        }
        dxCode.worker.beforeLoop(this.options1, this.options2)
        dxCode.decoderUpdateConfig({ deType: config.get('sysInfo.de_type') })
    },
    loop: function () {
        if (!config.get('sysInfo.codeSwitch')) {
            log.debug("扫码已关闭")
            this.loop = () => { }
        } else {
            this.loop = () => dxCode.worker.loop(config.get('sysInfo.s_mode'), config.get('sysInfo.interval'))
        }
    }
}

driver.nfc = {
    options: { id: 'nfc1', m1: true, psam: false },
    init: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("刷卡已关闭")
            return
        }
        dxNfc.worker.beforeLoop(this.options)
    },
    loop: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("刷卡已关闭")
            this.loop = () => { }
        } else {
            this.loop = () => dxNfc.worker.loop(this.options)
        }
    },
    //读M1  卡一块数据
    m1cardReadBlk: function (taskFlg, blkNum, key, keyType) {
        return dxNfc.m1cardReadBlk(taskFlg, blkNum, key, keyType, this.options.id)
        // return dxNfc.m1cardReadBlk(0, 0,[0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x60,this.options.id)
    },
    //写M1  卡一块数据
    m1cardWriteBlk: function (taskFlg, blkNum, key, keyType, data) {
        return dxNfc.m1cardWriteBlk(taskFlg, blkNum, key, keyType, data, this.options.id)
        // return dxNfc.m1cardWriteBlk(0, 1, [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x61, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff], this.options.id)

    },
    //读M1  卡多块数据
    m1cardReadSector: function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType) {
        return dxNfc.m1cardReadSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, this.options.id)
        //2 删除 0 块 读4 块
        // return dxNfc.m1cardReadSector(0, 2, 0, 4,[0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x60,this.options.id)
    },
    //写M1  卡多块数据
    m1cardWriteSector: function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data) {
        return dxNfc.m1cardWriteSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, data, this.options.id)
        //5删除 0 块写 2 块 数据不足随机填写
        // return dxNfc.m1cardWriteBlk(0, 5, 0, 2,[0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], 0x61, [0x11, 0x22, 0x33], this.options.id)
    },
}

driver.audio = {
    init: function () {
        dxAlsaplay.init()
        // 语音播报音量
        let volume = Math.floor(config.get("sysInfo.volume") / 10)
        dxAlsaplay.setVolume(volume)
        if (config.get('sysInfo.boot_music') == 1) {
            if (config.get('sysInfo.language') == 1) {
                this.play("0_eng")
            } else {
                this.play("0")
            }
        }
    },
    // 获取/设置音量，范围（[0,6]），配置是0-60，超过6效果是一样的
    volume: function (volume) {
        if (utils.isEmpty(volume)) {
            return dxAlsaplay.getVolume()
        } else {
            dxAlsaplay.setVolume(volume)
        }
    },
    play: function (index) {
        dxAlsaplay.play('/app/code/resource/wav/' + index + '.wav')
    }
}

driver.gpiokey = {
    init: function () {
        dxGpioKey.worker.beforeLoop()
    },
    loop: function () {
        dxGpioKey.worker.loop()
    },
}

driver.ntp = {
    loop: function () {
        if (!config.get('sysInfo.ntp_en')) {
            log.debug("自动对时已关闭")
            this.loop = () => { }
        } else {
            dxNtp.beforeLoop(config.get('sysInfo.ntp_addr'), config.get('sysInfo.ntp_interval'))
            this.ntp_hour = config.get('sysInfo.ntp_hour')
            this.flag = true
            this.loop = () => {
                dxNtp.loop()
                if (new Date().getHours() == this.ntp_hour && this.flag) {
                    // 定时同步，立即同步一次时间
                    dxNtp.syncnow = true
                    this.flag = false
                }
                if (new Date().getHours() != this.ntp_hour) {
                    // 等过了这个小时再次允许对时
                    this.flag = true
                }
            }
        }
    },
}

driver.screen = {
    // 成功
    success: function (msg, beep) {
        bus.fire('success', { msg, beep })
    },
    // 失败
    fail: function (msg, beep) {
        bus.fire('fail', { msg, beep })
    },
    // 自定义弹窗
    customPopWin: function (msg, time, hasBtn, res, hasTitle) {
        bus.fire('customPopWin', { msg, time, hasBtn, res, hasTitle })
    },
    // 展示文字/图片
    customShowMsgAndImg: function (msg, msgTimeout, img, imgTimeout, flag) {
        bus.fire('customShowMsgAndImg', { msg, msgTimeout, img, imgTimeout, flag })
    },
    // 重新加载ui
    reload: function () {
        bus.fire('reload', null)
    },
    tcpConnectedChange: function (data) {
        bus.fire('tcpConnectedChange', data)
    },
    netStatusChange: function (data) {
        bus.fire('netStatusChange', data)
    },
    showPic: function (data) {
        bus.fire('customShowMsgAndImg', { msg: null, msgTimeout: null, img: data.name, imgTimeout: data.time })
    },
    showSystemInfo: function (data) {
        bus.fire('showSystemInfo', data)
    },
    timeFormat: function () {
        bus.fire('timeFormat', null)
    }
}

driver.uart485 = {
    id: 'uart485',
    init: function () {
        //判断是否开启安全模式(开启情况下作为服务端使用)
        if (config.get('sysInfo.safe_open') === 1) {
            dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS3', result: 1 })
        } else {
            dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS3', result: 0 })
        }
        std.setTimeout(() => {
            dxUart.ioctl(6, config.get("sysInfo.p_uart1"), this.id)
        }, 1000)
    },
    // 可以发协议json或透传字符串
    sendVg: function (data) {
        // log.debug("[485 send]:", JSON.stringify(data))
        dxUart.sendVg(data, this.id)
    },
    lastHeartbeat: 0,
    heart_en: 0,
    heart_time: "www.vguang.cn",
    heart_data: undefined,
    heartbeat: function () {
        bus.on("heart485", (data) => {
            this.heart_en = utils.isEmpty(data.heart_en) ? this.heart_en : data.heart_en
            this.heart_time = utils.isEmpty(data.heart_time) ? this.heart_time : (data.heart_time < 30 ? 30 : data.heart_time)
            this.heart_data = utils.isEmpty(data.heart_data) ? this.heart_data : data.heart_data
        })
        if (this.heart_en == 1) {
            // 心跳最小为30
            if (this.heart_time < 30) {
                this.heart_time = 30
            }
            this.heartbeat = () => {
                if (this.heart_en && new Date().getTime() - this.lastHeartbeat >= (this.heart_time * 1000)) {
                    this.lastHeartbeat = new Date().getTime()
                    let res = common.strToUtf8Hex(this.heart_data)
                    driver.uart485.sendVg(config.get('sysInfo.w_mode') == 1 ? res : { "cmd": "2b", "length": res.length / 2, "result": "00", "data": res })
                }
            }
        }
    }
}

// driver.uartUsb = {
//     id: 'uartUsb',
//     init: function () {
//         dxUart.runvg({ id: this.id, type: dxUart.TYPE.USBHID, path: '/dev/hidg1', result: 0 })
//     },
//     // 可以发协议json或透传字符串
//     sendVg: function (data) {
//         usbSend(data, this.id)
//     },
// }

// driver.uartUSBKBW = {
//     id: 'uartUSBKBW',
//     init: function () {
//         dxUart.open(dxUart.TYPE.USBKBW, '/dev/hidg0', this.id)
//     },
//     // 可以发协议json或透传字符串
//     sendVg: function (data) {
//         usbSend(data, this.id)
//     },
// }

// // usb分包发送，1024字节一包，仅限字符串格式
// function usbSend(data, id) {
//     if (typeof data === 'object') {
//         data.length = data.length ? data.length : (data.data ? data.data.length / 2 : 0)
//         let sendData = '55aa' + data.cmd + data.result + common.decimalToLittleEndianHex(data.length, 2) + data.data
//         sendData += common.calculateBcc(sendData.match(/.{2}/g)).toString(16).padStart(2, '0')
//         data = sendData
//     }
//     const t_len = Math.ceil(data.length / 2048) * 2048;
//     const pad_len = t_len - data.length;
//     const pad = '0'.repeat(pad_len);
//     data += pad;
//     log.debug("[usb send]:", data)
//     if (data.length <= 2048) {
//         dxUart.send(common.hexStringToArrayBuffer(data), id)
//     } else {
//         // 发送数据太长，分段发送
//         for (let i = 0; i < Math.ceil(data.length / 2048); i++) {
//             let sendData = data.substring(i * 2048, (i + 1) * 2048)
//             dxUart.send(common.hexStringToArrayBuffer(sendData), id)
//         }
//     }
// }

driver.uartBle = {
    id: 'uartBle',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS5', result: 0 })
        std.sleep(1000)
        dxUart.ioctl(6, '921600-8-N-1', this.id)
    },
    sendVg: function (data) {
        log.debug("[ble send]:", JSON.stringify(data))
        dxUart.sendVg(data, this.id)
    },
    /**
     * 获取蓝牙配置信息
     * @returns  param.name蓝牙名称 param.mac蓝牙mac
     */
    getConfig: function () {
        let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": 6, "data": "7e01000200fe" }
        this.sendVg("55aa6000" + common.decimalToLittleEndianHex(pack.dlen, 2) + pack.data + this.genCrc(pack))
        return driver.sync.request("uartBle.getConfig", 2000)
    },
    setConfig: function (param) {
        uartBleService.setBleConfig(param)
    },
    /**
       * 生成蓝牙串口的校验字，和一般校验字计算不一样
       * @param {*} pack eg:{ "head": "55aa", "cmd": "0f", "result": "90", "dlen": 1, "data": "01" }
       * @returns 
       */
    genCrc: function (pack) {
        let bcc = 0;
        let dlen = pack.dlen - 1;//去掉index
        bcc ^= 0x55;
        bcc ^= 0xaa;
        bcc ^= parseInt(pack.cmd, 16);
        bcc ^= pack.result ? parseInt(pack.result, 16) : 0;
        bcc ^= (dlen & 0xff);
        bcc ^= (dlen & 0xff00) >> 8;
        for (let i = 0; i < pack.dlen; i++) {
            bcc ^= pack.data[i];
        }
        return bcc.toString(16).padStart(2, '0');
    }
}

driver.tcp = {
    id: 'tcp',
    init: function () {
        let owifi = config.get("sysInfo.owifi")
        if ((owifi == 4 || owifi == 8) && checkTcp()) {
            dxTcp.runvg({ id: this.id, ip: config.get('sysInfo.taddr'), port: config.get('sysInfo.port') + '', timeout: config.get('sysInfo.touttime') * 1000, result: 0, passThrough: config.get("sysInfo.owifi") == 8 })
        }
    },
    // 可以发协议json或透传字符串
    sendVg: function (data) {
        log.debug("[tcp send]:", JSON.stringify(data))
        dxTcp.sendVg(data, this.id)
    },
    // 网络协议
    sendNetPro: function (data, isHeartbeat) {
        if (!dxTcp.isConnect(this.id) && !isHeartbeat) {
            let awifi_f = config.get("sysInfo.awifi_f")
            if ((awifi_f >> 13) & 1 == 1) {
                driver.screen.customPopWin(config.get('sysInfo.language') == 1 ? "fail" : "失败", 2000, false, false)
            }
            if ((awifi_f >> 11) & 1 == 1) {
                if (config.get('sysInfo.language') == 1) {
                    driver.audio.play('f_eng')
                } else {
                    driver.audio.play('f')
                }
            }
            return
        }
        data = common.stringToHex(`vgdecoderesult=`) + data + common.stringToHex(`&&devicenumber=${config.get("sysInfo.devnum")}&&otherparams=`)
        this.sendVg(data)
        if (!isHeartbeat) {
            // 心跳上报不接收返回
            let map = dxMap.get("NETPRO")
            map.put("waitResponse", new Date().getTime())
            std.setTimeout(() => {
                // 超时
                let waitResponse = map.get("waitResponse")
                if (waitResponse) {
                    // 有等待的请求，回复失败
                    map.del("waitResponse")
                    netProService.netRes({ source: 'tcp', data: "" })
                }
            }, config.get("sysInfo.touttime") * 1000)
        }
    }
}

driver.http = {
    // 可以发协议json或透传字符串
    sendVg: function (data) {
        // 转为字符串
        if (typeof data === 'object') {
            let pack = '55aa' + data.cmd
            if (data.hasOwnProperty('result')) {
                pack += data.result
            }
            pack += (data.length % 256).toString(16).padStart(2, '0')
            pack += (Math.floor(data.length / 256)).toString(16).padStart(2, '0')
            pack += data.data
            let all = common.hexToArr(pack)
            let bcc = common.calculateBcc(all)
            all.push(bcc)
            data = all.map(v => v.toString(16).padStart(2, '0')).join('')
        }
        data = common.utf8HexToStr(data)
        // log.debug("[http post]:", JSON.stringify(data))
        let headers = []
        headers[0] = "Accept-Charset:utf-8"
        headers[1] = "Content-Type:text/html;charset=UTF-8"
        headers[2] = "Connection:close"
        return http.post(config.get('sysInfo.haddr'), data, headers, (config.get('sysInfo.houttime') || 2) * 1000)
    },
    // 网络协议
    sendNetPro: function (data, isHeartbeat) {
        // 网络协议模式
        data = common.stringToHex("vgdecoderesult=") + data + common.stringToHex("&&devicenumber=" + config.get("sysInfo.devnum")) + common.stringToHex("&&otherparams=")
        let res = this.sendVg(data)
        log.debug("[http response]:", res)
        if (!res) {
            log.error("http请求返回为空")
            driver.screen.customPopWin("失败", 2000, false, false)
            driver.pwm.beep()
            driver.pwm.beep(500, null, 1)
        }
        if (!isHeartbeat) {
            // 心跳上报不接收返回
            netProService.netRes({ source: 'http', data: JSON.parse(res).body })
        }
    }
}

// 注意，只能在service线程中使用
driver.sync = {
    // 异步转同步小实现
    request: function (topic, timeout) {
        let map = dxMap.get("SYNC")
        let count = 0
        let data = map.get(topic)
        while ((utils.isEmpty(data) || data == "") && count * 100 < timeout) {
            data = map.get(topic)
            std.sleep(100)
            count += 1
        }
        let res = map.get(topic)
        map.del(topic)
        return res
    },
    response: function (topic, data) {
        let map = dxMap.get("SYNC")
        map.put(topic, data)
    }
}

driver.config = {
    init: function () {
        config.init()
        let uuid = common.getSn(19)
        if (!config.get('sysInfo.uuid') && uuid) {
            config.set('sysInfo.uuid', uuid)
        }
        //如果 sn 为空先用设备 uuid
        if (!config.get('sysInfo.sn') && uuid) {
            config.set('sysInfo.sn', uuid)
        }
        config.save()
    }
}

driver.heartbeat = {
    lastHeartbeat: 0,
    heart_en: config.get('sysInfo.heart_en'),
    heart_time: config.get('sysInfo.heart_time'),
    heart_data: config.get('sysInfo.heart_data'),
    loop: function () {
        bus.on("heartbeat", (data) => {
            this.heart_en = utils.isEmpty(data.heart_en) ? this.heart_en : data.heart_en
            this.heart_time = utils.isEmpty(data.heart_time) ? this.heart_time : (data.heart_time < 30 ? 30 : data.heart_time)
            this.heart_data = utils.isEmpty(data.heart_data) ? this.heart_data : data.heart_data
        })
        if (this.heart_en) {
            // 心跳最小为30
            if (this.heart_time < 30) {
                this.heart_time = 30
            }
            this.loop = () => {
                if (this.heart_en && new Date().getTime() - this.lastHeartbeat >= (this.heart_time * 1000)) {
                    this.lastHeartbeat = new Date().getTime()
                    let res = common.strToUtf8Hex(config.get('sysInfo.heart_data'))
                    driver.passage.report({ source: 'heartbeat', data: { "cmd": "2b", "length": res.length / 2, "result": "00", "data": res } })
                }
            }
        }
    }
}

driver.watchdog = {
    id: "watchdog",
    init: function () {
        watchdog.open(1 | 2, this.id)
        watchdog.enable(1, this.id)
        watchdog.enable(2, this.id)
        watchdog.start(20000, this.id)
    },
    loop: function () {
        watchdog.loop(1, this.id)
    },
    feed: function (flag, timeout) {
        watchdog.feed(flag, timeout)
    }
}

//统一上报并且区分是否透传还是微光协议(刷卡 扫码 蓝牙 心跳)开通了的通道都要上报一遍
driver.passage = {
    // 根据配置选择上报通道
    report: function (data) {
        switch (data.source) {
            case 'code':
            case 'heartbeat':
            case 'password':
                //输出通道
                let ochannel = config.get('sysInfo.ochannel')
                //协议
                let dchannel = config.get('sysInfo.dchannel')
                driver.passage.send(ochannel, dchannel, data.data, data.source == 'heartbeat')
                break;
            case 'nfc':
                //输出通道
                let nochannel = config.get('sysInfo.nochannel')
                //协议
                let ndchannel = config.get('sysInfo.ndchannel')
                driver.passage.send(nochannel, ndchannel, data.data)
                break;
            case 'ble':
                //输出通道
                let blochannel = config.get('sysInfo.blochannel')
                //协议
                let bldchannel = config.get('sysInfo.bldchannel')
                driver.passage.send(blochannel, bldchannel, data.data)
                break;
            default:
                return
        }
    },
    // 输出协议判断，上报对应通道
    send: function (ochannel, dchannel, data, isHeartbeat) {
        let w_mode = config.get('sysInfo.w_mode')
        if (w_mode == 1) {
            // 透传模式，发送的时候不用带55aa格式
            data = data.data
        }
        // // USB每次都要输出
        // driver.uartUsb.sendVg(data)
        // if (w_mode == 1 && ochannel & 0x01) {
        //     // 只有透传模式输出键盘
        //     // 调换回车换行顺序，根据c版来，只有有回车的时候换行
        //     if (data.length >= 2) {
        //         let last2w = data.substring(data.length - 2)
        //         if (last2w == '0a') {
        //             data = data.substring(0, data.length - 2) + '0d'
        //         } else if (last2w == '0d') {
        //             data = data.substring(0, data.length - 2) + '0a'
        //         }
        //     }
        //     if (data.length >= 4 && data.substring(data.length - 4, data.length - 2) == '0d') {
        //         data = data.substring(0, data.length - 4) + '0a' + data.substring(data.length - 2)
        //     }
        //     driver.uartUSBKBW.sendVg(data)
        // }
        if ((ochannel >> 1) & 0x01 && !isHeartbeat) {
            // 485输出
            driver.uart485.sendVg(data)
        }
        if ((ochannel >> 6) & 0x01) {
            // 有线网络输出，tcp/http
            // 协议判断，单选
            let owifi = config.get("sysInfo.owifi")
            switch (owifi) {
                case 1:
                    // 普通HTTP 模式
                    if (w_mode == 2) {
                        // 协议模式下，仅485、tcp支持输出，http、http协议、tcp协议都不输出内容
                        break
                    }
                    driver.http.sendVg(data)
                    break;
                case 2:
                    // 协议HTTP 模式
                    if (w_mode == 2) {
                        // 协议模式下，仅485、tcp支持输出，http、http协议、tcp协议都不输出内容
                        break
                    }
                    driver.http.sendNetPro(typeof data == 'object' ? data.data : data, isHeartbeat, w_mode)
                    break;
                case 4:
                    // 普通TCP 模式
                    driver.tcp.sendVg(data)
                    break;
                case 8:
                    // 协议TCP 模式
                    if (w_mode == 2) {
                        // 协议模式下，仅485、tcp支持输出，http、http协议、tcp协议都不输出内容
                        break
                    }
                    driver.tcp.sendNetPro(typeof data == 'object' ? data.data : data, isHeartbeat, w_mode)
                    break;
                default:
                    break;
            }
        }
    },
    // 扫码，刷卡，密码，蓝牙，通过30/33接口操作
    beforeReport: function (data) {
        let sourceMap = {
            'code': "11",
            'password': "a0",
            'nfc': "42",
            'ble': "80",
        }
        switch (config.get('sysInfo.report_mode')) {
            case '0'://不区分来源
            case '80'://区分来源
                //上位机轮询 0x33 获取扫描器数据
                //存入缓存中扫码数据等待上位机主动请求获取
                if (config.get('sysInfo.w_mode') == 1) {
                    driver.passage.report({ source: data.source, data: { "cmd": "30", "length": data.data.length / 2, "result": "00", "data": data.data } })
                } else {
                    let map = dxMap.get("VGPRO")
                    map.put('codeReport', { sourceMark: sourceMap[data.source], data: data.data, time: new Date().getTime() })
                }
                break;
            case '1':
                //选用 0x30 指令主动上报数据  不区分来源
                driver.passage.report({ source: data.source, data: { "cmd": "30", "length": data.data.length / 2, "result": "00", "data": data.data } })
                break;
            case '81':
                // 选用 0x33 指令主动上报数据  区分来源  代表二维码的标识
                driver.passage.report({ source: data.source, data: { "cmd": "33", "length": data.data.length / 2 + 1, "result": "00", "data": config.get('sysInfo.w_mode') == 1 ? data.data : sourceMap[data.source] + data.data } })
                break;
            default:
                return
        }
    }
}
function checkTcp () {
    // 需要检查的通道名称
    const channels = ["sysInfo.ochannel", "sysInfo.nochannel", "sysInfo.blochannel"];
    // 要与通道值进行按位与运算的掩码
    const masks = [3, 6, 9];

    // 检查每个通道和每个掩码
    return channels.some(channel =>
        masks.some(mask =>
            (config.get(channel) >> mask) & 1 === 1
        )
    );
}

driver.autoRestart = {
    lastRestartCheck: new Date().getHours(),  // 初始化为当前小时数，而不是0
    init: function () {
        std.setInterval(() => {        // 检查是否需要整点重启
            const now = new Date()
            const currentHour = now.getHours()
            // 只有当小时数等于设定值，且不是上次检查过的小时时才执行
            let autoRestart = utils.isEmpty(config.get("sysInfo.autoRestart")) ? 3 : config.get("sysInfo.autoRestart")
            if (currentHour === autoRestart && currentHour !== this.lastRestartCheck && now.getMinutes() === 0) {
                common.systemBrief('reboot')
            }
            // 更新上次检查的小时数
            this.lastRestartCheck = currentHour
        }, 60000)
    }
}
export default driver
