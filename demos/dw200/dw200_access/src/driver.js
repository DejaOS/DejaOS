import log from '../dxmodules/dxLogger.js'
import dxPwm from '../dxmodules/dxPwm.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import dxGpio from '../dxmodules/dxGpio.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxAlsaplay from '../dxmodules/dxAlsaplay.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxMqtt from '../dxmodules/dxMqtt.js'
import dxNtp from '../dxmodules/dxNtp.js'
import dxMap from '../dxmodules/dxMap.js'
import config from '../dxmodules/dxConfig.js'
import common from '../dxmodules/dxCommon.js'
import dxUart from '../dxmodules/dxUart.js'
import watchdog from '../dxmodules/dxWatchdog.js'
import bus from '../dxmodules/dxEventBus.js'
import mqttService from './service/mqttService.js'
import utils from './common/utils/utils.js'
import uartBleService from './service/uartBleService.js'
import eid from '../dxmodules/dxEid.js'
import dxHttp from '../dxmodules/dxHttp.js'
import CryptoES from '../dxmodules/crypto-es/index.js';
import * as qStd from "std"
let lockMap = dxMap.get("ble_lock")

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
        dxPwm.beep({ channel: 4, time: 30, volume: utils.getVolume1(this.getVolume2()), interval: 0 })
    },
    //失败音
    fail: function () {
        dxPwm.beep({ channel: 4, time: 500, volume: utils.getVolume1(this.getVolume3()), interval: 0 })
    },
    //成功音
    success: function () {
        dxPwm.beep({ channel: 4, time: 30, count: 2, volume: utils.getVolume1(this.getVolume3()) })
    },
    //警告音
    warning: function () {
        dxPwm.beep({ channel: 4, volume: utils.getVolume1(this.getVolume3()), interval: 0 })
    },
    // 按键音量
    getVolume2: function () {
        if (utils.isEmpty(this.volume2)) {
            let volume2 = config.get("sysInfo.volume2")
            this.volume2 = utils.isEmpty(volume2) ? 50 : volume2
        }
        return this.volume2
    },
    // 蜂鸣提示音量
    getVolume3: function () {
        if (utils.isEmpty(this.volume3)) {
            let volume3 = config.get("sysInfo.volume3")
            this.volume3 = utils.isEmpty(volume3) ? 50 : volume3
        }
        return this.volume3
    }
}
driver.net = {
    init: function () {
        if (config.get("netInfo.type") == 0) {
            // 关闭网络
            return
        }
        dxNet.worker.beforeLoop(mqttService.getNetOptions())
        if (config.get("netInfo.type") == 2) {
            dxNet.netConnectWifiSsid(config.get("netInfo.ssid"), config.get("netInfo.psk"), "")
        }
    },
    loop: function () {
        if (config.get("netInfo.type") == 0) {
            // 关闭网络
            this.loop = () => { }
            return
        }
        dxNet.worker.loop()
    },
    getStatus: function () {
        if (config.get("netInfo.type") == 0) {
            return false
        }
        let status = dxNet.getStatus()
        if (status.connected == true && status.status == 4) {
            return true
        } else {
            return false
        }

    },
}
driver.gpio = {
    init: function () {
        dxGpio.init()
        dxGpio.request(35)
    },
    open: function () {
        // 判断开门模式
        let openMode = config.get("doorInfo.openMode")
        if (utils.isEmpty(openMode)) {
            openMode = 0
        }
        // 常闭不允许开
        if (openMode != 2) {
            dxGpio.setValue(35, 1)
        }
        if (openMode == 0) {
            // 正常模式记录关继电器的时间
            // 定时关继电器
            let openTime = config.get("doorInfo.openTime")
            openTime = utils.isEmpty(openTime) ? 2000 : openTime
            let map = dxMap.get("GPIO")
            std.setTimeout(() => {
                dxGpio.setValue(35, 0)
                map.del("relayCloseTime")
            }, openTime)
            map.put("relayCloseTime", new Date().getTime() + openTime)
        }
    },
    close: function () {
        let openMode = config.get("doorInfo.openMode")
        // 判断开门模式
        // 常开不允许关
        if (openMode != 1) {
            dxGpio.setValue(35, 0)
        }
    },
}
driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11', capturerDogId: "watchdog" },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.options1, this.options2)
        dxCode.decoderUpdateConfig({ de_type: config.get('scanInfo.de_type') })
    },
    loop: function () {
        dxCode.worker.loop(config.get('scanInfo.sMode'), config.get('scanInfo.interval'))
    }
}
driver.nfc = {
    options: { id: 'nfc1', m1: true, psam: false },
    init: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("刷卡已关闭")
            return
        }
        this.options.useEid = config.get("sysInfo.nfc_identity_card_enable") == 3 ? 1 : 0
        dxNfc.worker.beforeLoop(this.options)
    },
    eidInit: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("刷卡已关闭")
            return
        }
        if (config.get("sysInfo.nfc_identity_card_enable") == 3) {
            dxNfc.eidUpdateConfig({ appid: "1621503", sn: config.get("sysInfo.sn"), device_model: config.get("sysInfo.appVersion") })
        }
    },
    loop: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("刷卡已关闭")
            this.loop = () => { }
        } else {
            this.loop = () => dxNfc.worker.loop(this.options)
        }
    },
    //读M1  卡多块数据
    m1cardReadSector: function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType) {
        return dxNfc.m1cardReadSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, this.options.id)
    }
}
driver.audio = {
    init: function () {
        dxAlsaplay.init()
        // 语音播报音量
        let volume = Math.ceil(config.get("sysInfo.volume") / 10)
        if (utils.isEmpty(volume)) {
            volume = 6
        }
        dxAlsaplay.setVolume(volume)
    },
    // 获取/设置音量，范围（[0,6]）
    volume: function (volume) {
        if (volume && typeof volume == 'number') {
            dxAlsaplay.setVolume(volume)
        } else {
            return dxAlsaplay.getVolume()
        }
    },
    fail: function () {
        dxAlsaplay.play(config.get("sysInfo.language") == 1 ? '/app/code/resource/wav/mj_f_eng.wav' : '/app/code/resource/wav/mj_f.wav')
    },
    success: function () {
        dxAlsaplay.play(config.get("sysInfo.language") == 1 ? '/app/code/resource/wav/mj_s_eng.wav' : '/app/code/resource/wav/mj_s.wav')
    },
    doPlay: function (fileName) {
        let res = common.systemWithRes(`test -e "/app/code/resource/wav/${fileName}.wav" && echo "OK" || echo "NO"`, 2)
        if (res.includes('OK')) {
            dxAlsaplay.play('/app/code/resource/wav/' + fileName + '.wav')
        } else {
            dxAlsaplay.play(config.get("sysInfo.language") == 1 ? '/app/code/resource/wav/s_eng.wav' : '/app/code/resource/wav/s.wav')
        }
    }
}
driver.gpiokey = {
    init: function () {
        dxGpioKey.worker.beforeLoop()
    },
    sensorChanged: function (value) {
        let map = dxMap.get("GPIO")
        let relayCloseTime = map.get("relayCloseTime") || 0
        if (value == 1 && new Date().getTime() > parseInt(relayCloseTime)) {
            // gpio 在关的情况在打开门磁代表非法开门上报
            // driver.mqtt.alarm(2, value)
        }
        driver.mqtt.alarm(0, value)
        let map1 = dxMap.get("GPIOKEY")
        if (value == 0) {
            map1.del("alarmOpenTimeoutTime")
        } else if (value == 1) {
            // 记录开门超时时间
            let openTimeout = config.get("doorInfo.openTimeout") * 1000
            openTimeout = utils.isEmpty(openTimeout) ? 10000 : openTimeout
            map1.put("alarmOpenTimeoutTime", new Date().getTime() + openTimeout)
        }
    },
    loop: function () {
        dxGpioKey.worker.loop()
        if (utils.isEmpty(this.checkTime) || new Date().getTime() - this.checkTime > 200) {
            // 降低检查频率，间隔200毫秒检查一次
            this.checkTime = new Date().getTime()
            let map = dxMap.get("GPIOKEY")
            let alarmOpenTimeoutTime = map.get("alarmOpenTimeoutTime")
            if (typeof alarmOpenTimeoutTime == 'number' && new Date().getTime() >= alarmOpenTimeoutTime) {
                driver.mqtt.alarm(3, 0)
                map.del("alarmOpenTimeoutTime")
            }
        }
    },
}
driver.ntp = {
    loop: function () {
        if (!config.get('netInfo.ntp')) {
            log.debug("自动对时已关闭")
            this.loop = () => { }
            let time = config.get('sysInfo.time')
            if (time) {
                common.systemBrief(`date -s "@${time}"`)
            }
        } else {
            bus.on("ntpUpdate", () => {
                dxNtp.beforeLoop(config.get("netInfo.ntpAddr"), 9999999999999)
            })
            dxNtp.beforeLoop(config.get('netInfo.ntpAddr'), 9999999999999)
            this.ntpHour = config.get('netInfo.ntpHour')
            this.flag = true
            this.loop = () => {
                dxNtp.loop()
                //定时同步
                if (new Date().getHours() == this.ntpHour && this.flag) {
                    // 定时同步，立即同步一次时间
                    dxNtp.syncnow = true
                    this.flag = false
                }
                if (new Date().getHours() != this.ntpHour) {
                    // 等过了这个小时再次允许对时
                    this.flag = true
                }
            }
        }
    },
}
driver.screen = {
    accessFail: function (type) {
        bus.fire('displayResults', { type: type, flag: false })
    },
    accessSuccess: function (type) {
        bus.fire('displayResults', { type: type, flag: true })
    },
    // 自定义弹窗
    customPopWin: function (msg, time) {
        bus.fire('customPopWin', { msg, time })
    },
    // 重新加载屏幕，对于ui配置生效的修改
    reload: function () {
        bus.fire('reload')
    },
    netStatusChange: function (data) {
        bus.fire('netStatusChange', data)
    },
    mqttConnectedChange: function (data) {
        bus.fire('mqttConnectedChange', data)
    },
    // eg:{msg:'',time:1000}
    showMsg: function (param) {
        bus.fire('showMsg', param)
    },
    // eg:{img:'a',time:1000}
    showPic: function (param) {
        bus.fire('showPic', param)
    },
    // eg:{msg:''}
    warning: function (param) {
        bus.fire('warning', param)
    },
    timeFormat: function () {
        bus.fire('timeFormat')
    }
}
driver.system = {
    init: function () {
    },
    setTime: function (time) {
        common.systemBrief('date  "' + utils.formatUnixTimestamp(time) + '"')
        let map = dxMap.get('workerId')
        let workerIds = map.get('workerId')
        driver.watchdog.feed("controller", 300)
        driver.watchdog.feed('main', 10)
        for (let element of workerIds) {
            driver.watchdog.feed(element, 300)
        }
    },
}
driver.uartBle = {
    id: 'uartBle',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS5', result: 0 })
        std.sleep(1000)
        dxUart.ioctl(6, '921600-8-N-1', this.id)
    },
    send: function (data) {
        log.debug('[uartBle] send :' + JSON.stringify(data))
        dxUart.sendVg(data, this.id)
    },
    accessSuccess: function (index) {
        let pack = { "head": "55aa", "cmd": "0f", "result": "00", "dlen": 1, "data": index.toString(16).padStart(2, '0') }
        this.send("55aa0f000100" + index.toString(16).padStart(2, '0') + this.genCrc(pack))
    },
    accessFail: function (index) {
        let pack = { "head": "55aa", "cmd": "0f", "result": "90", "dlen": 1, "data": index.toString(16).padStart(2, '0') }
        this.send("55aa0f900100" + index.toString(16).padStart(2, '0') + this.genCrc(pack))
    },
    accessControl: function (index) {
        let command = "55AA0F0009000000300600000006" + index.toString(16).padStart(2, '0')
        this.send(command + this.genStrCrc(command).toString(16).padStart(2, '0'))
    },
    getConfig: function () {
        let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": 6, "data": "7e01000200fe" }
        this.send("55aa6000" + common.decimalToLittleEndianHex(pack.dlen, 2) + pack.data + this.genCrc(pack))
        return driver.sync.request("uartBle.getConfig", 2000)
    },
    getConfigReply: function (data) {
        driver.sync.response("uartBle.getConfig", data)
    },
    setConfig: function (param) {
        uartBleService.setBleConfig(param)
        // 设置成功返回true
        return driver.sync.request("uartBle.setConfig", 2000)
    },
    setConfigReply: function (data) {
        driver.sync.response("uartBle.setConfig", data)
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
    },
    genStrCrc: function (cmd) {
        let buffer = common.hexStringToUint8Array(cmd)
        let bcc = 0;
        for (let i = 0; i < buffer.length; i++) {
            bcc ^= buffer[i];
        }
        return bcc;
    },
    // 1、开始升级
    upgrade: function (data) {
        driver.screen.warning({ msg: "升级包下载中...", beep: false })
        // 创建临时目录
        const tempDir = "/app/data/.temp"
        const sourceFile = "/app/data/.temp/file"
        // 确保临时目录存在
        if (!std.exist(tempDir)) {
            common.systemBrief(`mkdir -p ${tempDir}`)
        }
        // 下载文件到临时目录
        let downloadRet = dxHttp.download(data.url, sourceFile, null, 60000)
        let fileExist = (std.stat(sourceFile)[1] === 0)
        if (!fileExist) {
            common.systemBrief(`rm -rf ${tempDir} && rm -rf ${sourceFile} `)
            driver.screen.warning({ msg: "升级包下载失败", beep: false })
            lockMap.del("ble_lock")
            throw new Error('Download failed, please check the url:' + data.url)
        } else {
            driver.screen.warning({ msg: "升级包下载成功", beep: false })
            let fileSize = this.getFileSize(sourceFile)
            const srcFd = std.open(sourceFile, std.O_RDONLY)
            if (srcFd < 0) {
                throw new Error(`无法打开源文件: ${sourceFile}`)
            }
            let buffer = new Uint8Array(fileSize)
            try {
                const bytesRead = std.read(srcFd, buffer.buffer, 0, fileSize)
                if (bytesRead <= 0) {
                    log.info("文件复制失败!")
                    return false
                } else {
                    log.info("文件复制成功!")
                }
            } finally {
                std.close(srcFd)
            }
            let hash = CryptoES.SHA256(CryptoES.lib.WordArray.create(buffer))
            let fileSha256 = hash.toString(CryptoES.enc.Hex)
            let cmd01 = "55aa600006000301000100fe"
            this.send(cmd01 + this.genStrCrc(cmd01))
            let cmd01res = driver.sync.request("uartBle.upgradeCmd1", 2000)
            if (!cmd01res) {
                return false
            }
            if (this.handleCmd01Response(cmd01res)) {
                this.sendDiscCommand(sourceFile, fileSha256, buffer)
            }
        }
    },
    handleCmd01Response (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x01) {
            if (pack[5] == 0x00) {
                driver.screen.warning({ msg: "蓝牙升级中...", beep: false })
            } else if (pack[5] == 0x03) {
                console.log("已经进入升级模式，可以开始进行升级")
            } else {
                driver.screen.warning({ msg: "进入升级模式失败", beep: false })
                return false
            }
            return true
        }
        return false
    },
    // 2、发送升级包描述信息
    sendDiscCommand: function (sourceFile, fileSha256, buffer) {
        let fileSize = this.getFileSize(sourceFile)
        let littleEndianHex = this.toLittleEndianHex(fileSize, 4)
        let cmd02_1 = "55aa6000" + "2a00" + "030100" + "0224" + littleEndianHex + fileSha256 + "fe"
        let cmd02_2 = cmd02_1 + this.genStrCrc(cmd02_1).toString(16)
        this.send(cmd02_2)
        let cmd02res = driver.sync.request("uartBle.upgradeCmd2", 2000)
        if (!cmd02res) {
            return
        }
        if (this.handleCmd02Response(cmd02res)) {
            this.sendSubPackage(fileSize, buffer)
        }
    },
    handleCmd02Response: function (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x02) {
            if (pack[5] == 0x00) {
                console.log("发送升级包描述信息成功，请发送升级包")
                log.info("发送升级包描述信息成功，请发送升级包")
            } else {
                return false
            }
            return true
        }
        return false
    },
    // 3、发送升级包
    sendSubPackage: function (fileSize, buffer) {
        let chunkSize = 512
        let totality = Math.floor(fileSize / chunkSize)
        let remainder = fileSize % chunkSize
        let totalCount = 0
        for (let index = 0; index < totality + 1; index++) {
            // 计算当前分包的起始和结束位置
            let start = index * chunkSize;
            let end = Math.min(start + chunkSize, buffer.byteLength); // 防止越界
            // 创建当前分包数据的 ArrayBuffer (关键步骤)
            let sendBuffer = buffer.slice(start, end);
            if (index == totality) {
                // 最后一个分包，需要填充剩余字节
                let padding = new Uint8Array(chunkSize - remainder);
                sendBuffer = new Uint8Array([...sendBuffer, ...padding]);
                console.log("最后一字节数据: ", sendBuffer.byteLength, common.arrayBufferToHexString(sendBuffer))
            }
            let cmd03_1 = "55aa6000" + "0602" + "030100" + "0300" + common.arrayBufferToHexString(sendBuffer) + "fe"
            let cmd03_2 = cmd03_1 + this.genStrCrc(cmd03_1).toString(16)
            if (index == 0) {
                this.send(cmd03_2)
            } else {
                let cmd03res = driver.sync.request(`uartBle.upgradeCmd3_${index}`, 2000)
                if (cmd03res && this.handleCmd03Response(cmd03res)) {
                    this.send(cmd03_2)
                }
            }
            totalCount++
            if (totalCount == totality + 1) {
                console.log("升级包传输完毕,totalCount: ", totalCount)
            } else {
                console.log("原数据信息已同步,正在分包传输,totalCount: ", totalCount)
            }
        }
        this.sendUpgradeFinishCommand()
    },
    handleCmd03Response: function (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x03) {
            if (pack[5] == 0x00) {
                console.log("升级包传输成功")
            } else {
                driver.screen.warning({ msg: "升级包传输失败", beep: false })
                return false
            }
            return true
        }
        return false
    },
    // 4、发送升级结束指令
    sendUpgradeFinishCommand: function () {
        let cmd04_1 = "55aa600006000301000400fe"
        let cmd04_2 = cmd04_1 + this.genStrCrc(cmd04_1).toString(16)
        this.send(cmd04_2)
        let cmd04res = driver.sync.request("uartBle.upgradeCmd4", 2000)
        if (cmd04res && this.handleCmd04Response(cmd04res)) {
            this.sendInstallCommand()
        }
    },
    handleCmd04Response: function (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x04) {
            if (pack[5] == 0x00) {
                console.log("升级结束指令成功")
            } else {
                driver.screen.warning({ msg: "升级结束指令失败", beep: false })
                return false
            }
            return true
        }
        return false
    },
    // 5、发送安装指令
    sendInstallCommand: function () {
        let cmd05_1 = "55aa600006000301000500fe"
        let cmd05_2 = cmd05_1 + this.genStrCrc(cmd05_1).toString(16)
        this.send(cmd05_2)
        let cmd05res = driver.sync.request("uartBle.upgradeCmd5", 2000)
        if (cmd05res) {
            this.handleCmd05Response(cmd05res)
        }
    },
    handleCmd05Response: function (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x05) {
            if (pack[5] == 0x00) {
                driver.screen.warning({ msg: "升级成功", beep: false })
                driver.pwm.success()
            } else {
                driver.screen.warning({ msg: "升级失败", beep: false })
            }
            common.systemBrief("rm -rf /app/data/.temp && rm -rf /app/data/.temp/file")
            lockMap.del("ble_lock")
        }
    },
    getFileSize: function (filename) {
        let file = qStd.open(filename, "r");
        if (!file) {
            throw new Error("Failed to open file");
        }
        file.seek(0, qStd.SEEK_END);  // 移动到文件末尾
        let size = file.tell();      // 获取当前位置（即文件大小）
        file.close();
        return size;
    },
    toLittleEndianHex: function (number, byteLength) {
        const bigNum = BigInt(number);
        // 参数验证
        if (!Number.isInteger(byteLength)) throw new Error("byteLength必须是整数");
        if (byteLength < 1) throw new Error("byteLength必须大于0");
        if (byteLength > 64) throw new Error("暂不支持超过8字节的处理");
        // 数值范围检查
        const bitWidth = BigInt(byteLength * 8);
        const maxValue = (1n << bitWidth) - 1n;
        if (bigNum < 0n || bigNum > maxValue) {
            throw new Error(`数值超出${byteLength}字节范围`);
        }
        // 小端字节提取
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < byteLength; i++) {
            const shift = BigInt(i * 8);
            bytes[i] = Number((bigNum >> shift) & 0xFFn); // 确保使用BigInt掩码
        }
        // 格式转换
        return Array.from(bytes, b =>
            b.toString(16).padStart(2, '0')
        ).join('');
    }
}
driver.sync = {
    // 异步转同步小实现
    request: function (topic, timeout) {
        let map = dxMap.get("SYNC")
        let count = 0
        let data = map.get(topic)
        while (utils.isEmpty(data) && count * 10 < timeout) {
            data = map.get(topic)
            std.sleep(10)
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
driver.mqtt = {
    id: "mqtt1",
    init: function () {
        let options = mqttService.getOptions()
        options.id = this.id
        dxMqtt.run(options)
    },
    send: function (data) {
        if (driver.net.getStatus() && driver.mqtt.isConnected()) {
            dxMqtt.send(data.topic, data.payload, this.id)
            log.info("[driver.mqtt] send:", JSON.stringify(data))
        } else {
            log.info('[driver.mqtt] send: 未连接网络或mqtt本次发送跳过')
        }

    },
    isConnected: function () {
        return dxMqtt.isConnected(this.id)
    },
    alarm: function (type, value) {
        this.send({ topic: "access_device/v1/event/alarm", payload: JSON.stringify(mqttService.mqttReply(utils.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)) })
    },
    getOnlinecheck: function () {
        let timeout = config.get("doorInfo.timeout")
        timeout = utils.isEmpty(timeout) ? 2000 : timeout
        let language = config.get('sysInfo.language')
        let warningInfo = {
            msg: language == 1 ? 'Online checking' : '在线核验中',
        }
        driver.screen.warning(warningInfo)
        return driver.sync.request("mqtt.getOnlinecheck", timeout)
    },
    getOnlinecheckReply: function (data) {
        driver.sync.response("mqtt.getOnlinecheck", data)
    },
    heartbeat: function () {
        if (utils.isEmpty(this.heart_en)) {
            let heart_en = config.get('sysInfo.heart_en')
            this.heart_en = utils.isEmpty(heart_en) ? 0 : heart_en
            let heart_time = config.get('sysInfo.heart_time')
            this.heart_time = utils.isEmpty(heart_time) ? 30 : heart_time < 30 ? 30 : heart_time
        }
        if (utils.isEmpty(this.lastHeartbeat)) {
            this.lastHeartbeat = 0
        }
        if (this.heart_en === 1 && (new Date().getTime() - this.lastHeartbeat >= (this.heart_time * 1000))) {
            this.lastHeartbeat = new Date().getTime()
            this.send({ topic: "access_device/v1/event/heartbeat", payload: JSON.stringify(mqttService.mqttReply(utils.genRandomStr(10), config.get('sysInfo.heart_data'), mqttService.CODE.S_000)) })
        }
    }

}
driver.config = {
    init: function () {
        config.init()
        let mac = common.getUuid2mac(19)
        let uuid = common.getSn(19)
        if (!config.get('sysInfo.mac') && mac) {
            config.set('sysInfo.mac', mac)
        }
        if (!config.get('sysInfo.uuid') && uuid) {
            config.set('sysInfo.uuid', uuid)
        }
        //如果 sn 为空先用设备 uuid
        if (!config.get('sysInfo.sn') && uuid) {
            config.set('sysInfo.sn', uuid)
        }
        if (!config.get('mqttInfo.clientId') && uuid) {
            config.set('mqttInfo.clientId', uuid)
        }
        config.save()
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
        if (utils.isEmpty(this.feedTime) || new Date().getTime() - this.feedTime > 2000) {
            // 降低喂狗频率，间隔2秒喂一次
            this.feedTime = new Date().getTime()
            watchdog.feed(flag, timeout)
        }
    }
}

driver.eid = {
    id: "eid",
    active: function (sn, version, mac, codeMsg) {
        return eid.active(sn, version, mac, codeMsg)
    }
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
