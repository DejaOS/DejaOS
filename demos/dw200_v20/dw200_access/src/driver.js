import log from '../dxmodules/dxLogger.js'
import dxPwm from '../dxmodules/dxPwm.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import dxGpio from '../dxmodules/dxGpio.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxAlsaplay from '../dxmodules/dxAudio.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
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
import dxmqttclient from '../dxmodules/dxMqttClient.js'
let lockMap = dxMap.get("ble_lock")

const driver = {}
driver.pwm = {
    init: function () {
        // Initialize buzzer
        dxPwm.request(4);
        dxPwm.setPeriodByChannel(4, 366166)
        dxPwm.enable(4, true)
    },
    // Button sound
    press: function () {
        dxPwm.beep({ channel: 4, time: 30, volume: utils.getVolume1(this.getVolume2()), interval: 0 })
    },
    // Failure sound
    fail: function () {
        dxPwm.beep({ channel: 4, time: 500, volume: utils.getVolume1(this.getVolume3()), interval: 0 })
    },
    // Success sound
    success: function () {
        dxPwm.beep({ channel: 4, time: 30, count: 2, volume: utils.getVolume1(this.getVolume3()) })
    },
    // Warning sound
    warning: function () {
        dxPwm.beep({ channel: 4, volume: utils.getVolume1(this.getVolume3()), interval: 0 })
    },
    // Button volume
    getVolume2: function () {
        if (utils.isEmpty(this.volume2)) {
            let volume2 = config.get("sysInfo.volume2")
            this.volume2 = utils.isEmpty(volume2) ? 50 : volume2
        }
        return this.volume2
    },
    // Buzzer prompt volume
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
            // Close network
            return
        }
        dxNet.worker.beforeLoop(mqttService.getNetOptions())
        if (config.get("netInfo.type") == 2) {
            dxNet.netConnectWifiSsid(config.get("netInfo.ssid"), config.get("netInfo.psk"), "")
        }
    },
    loop: function () {
        if (config.get("netInfo.type") == 0) {
            // Close network
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
        let openMode = config.get("doorInfo.openMode")
        if(openMode == 1) {
            dxGpio.setValue(35, 1)
        }
    },
    open: function () {
        // Determine door opening mode
        let openMode = config.get("doorInfo.openMode")
        if (utils.isEmpty(openMode)) {
            openMode = 0
        }
        // Normally closed does not allow opening
        if (openMode != 2) {
            dxGpio.setValue(35, 1)
        }
        if (openMode == 0) {
            // Normal mode records relay close time
            // Timed relay close
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
        // Determine door opening mode
        // Normally open does not allow closing
        if (openMode != 1) {
            dxGpio.setValue(35, 0)
        }
    },
}
driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11', capturerDogId: "watchdog" },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        try {
            dxCode.worker.beforeLoop(this.options1, this.options2)
            let deType = config.get('scanInfo.de_type')
            // Special handling: Even if all code systems or QR codes are disabled, also allow config codes (QR codes)
            deType = deType | 1;
            dxCode.decoderUpdateConfig({ deType })
        } catch (error) {
            common.asyncReboot(1)
        }
    },
    loop: function () {
        dxCode.worker.loop(config.get('scanInfo.sMode'), config.get('scanInfo.interval'))
    }
}
driver.nfc = {
    options: { id: 'nfc1', m1: true, psam: false },
    nfcEnable: utils.isEmpty(config.get("nfcInfo.nfc")) ? 1 : config.get("nfcInfo.nfc"),
    init: function () {
        if (!this.nfcEnable) {
            log.debug("刷卡已关闭")
            return
        }
        this.options.useEid = config.get("nfcInfo.nfc_identity_card_enable") == 3 ? 1 : 0
        dxNfc.worker.beforeLoop(this.options)
    },
    eidInit: function () {
        if (!this.nfcEnable) {
            log.debug("刷卡已关闭")
            return
        }
        if (config.get("nfcInfo.nfc_identity_card_enable") == 3) {
            dxNfc.eidUpdateConfig({ appid: "1621503", sn: config.get("sysInfo.sn"), device_model: config.get("sysInfo.appVersion") })
        }
    },
    loop: function () {
        if (!this.nfcEnable) {
            log.debug("刷卡已关闭")
            this.loop = () => { }
        } else {
            this.loop = () => dxNfc.worker.loop(this.options)
        }
    },
    // Read M1 card multi-block data
    m1cardReadSector: function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType) {
        return dxNfc.m1cardReadSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, this.options.id)
    }
}
driver.audio = {
    init: function () {
        dxAlsaplay.init()
        // Voice broadcast volume
        let volume = Math.ceil(config.get("sysInfo.volume") / 10)
        if (utils.isEmpty(volume)) {
            volume = 6
        }
        dxAlsaplay.setVolume(volume)
    },
    // Get/set volume, range ([0,6])
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
            // When GPIO is off and door sensor opens, it represents illegal door opening report
            // driver.mqtt.alarm(2, value)
        }
        driver.mqtt.alarm(0, value)
        let map1 = dxMap.get("GPIOKEY")
        if (value == 0) {
            map1.del("alarmOpenTimeoutTime")
        } else if (value == 1) {
            // Record door open timeout time
            let openTimeout = config.get("doorInfo.openTimeout") * 1000
            openTimeout = utils.isEmpty(openTimeout) ? 10000 : openTimeout
            map1.put("alarmOpenTimeoutTime", new Date().getTime() + openTimeout)
        }
    },
    loop: function () {
        dxGpioKey.worker.loop()
        if (utils.isEmpty(this.checkTime) || new Date().getTime() - this.checkTime > 200) {
            // Reduce check frequency, check once every 200ms
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
    init: function () {
        if (!config.get('netInfo.ntp')) {
            log.debug("自动对时已关闭")
            let time = config.get('sysInfo.time')
            if (time) {
                common.systemBrief(`date -s "@${time}"`)
            }
        } else {
            bus.on("ntpUpdate", driver.ntp.syncNow)
            driver.ntp.syncNow()

            let ntpHour = config.get('netInfo.ntpHour')
            let flag = true
            std.setInterval(() => {
                // Scheduled sync
                if (new Date().getHours() == ntpHour && flag) {
                    // Scheduled sync, sync time immediately
                    driver.ntp.syncNow()
                    flag = false
                }
                if (new Date().getHours() != ntpHour) {
                    // After this hour, allow time sync again
                    flag = true
                }
            }, 1000)
        }
    },
    syncNow: function () {
        dxNtp.startSync(config.get('netInfo.ntpAddr'), 9999999999999)
    }
}
driver.screen = {
    accessFail: function (type) {
        bus.fire('displayResults', { type: type, flag: false })
    },
    accessSuccess: function (type) {
        bus.fire('displayResults', { type: type, flag: true })
    },
    // Custom popup
    customPopWin: function (msg, time) {
        bus.fire('customPopWin', { msg, time })
    },
    // Reload screen, for UI config modifications to take effect
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
        driver.watchdog.feed("controller", 300)
        driver.watchdog.feed('main', 10)
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
        // Return true on successful configuration
        return driver.sync.request("uartBle.setConfig", 2000)
    },
    setConfigReply: function (data) {
        driver.sync.response("uartBle.setConfig", data)
    },
    /**
     * Generate Bluetooth serial checksum, different from general checksum calculation
     * @param {*} pack eg:{ "head": "55aa", "cmd": "0f", "result": "90", "dlen": 1, "data": "01" }
     * @returns 
     */
    genCrc: function (pack) {
        let bcc = 0;
        let dlen = pack.dlen - 1;// Remove index
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
    // 1. Start upgrade
    upgrade: function (data) {
        driver.screen.warning({ msg: "升级包下载中...", beep: false })
        // Create temporary directory
        const tempDir = "/app/data/.temp"
        const sourceFile = "/app/data/.temp/file"
        // Ensure temporary directory exists
        if (!std.exist(tempDir)) {
            common.systemBrief(`mkdir -p ${tempDir}`)
        }
        // Download file to temporary directory
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
    handleCmd01Response(pack) {
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
    // 2. Send upgrade package description information
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
    // 3. Send upgrade package
    sendSubPackage: function (fileSize, buffer) {
        let chunkSize = 512
        let totality = Math.floor(fileSize / chunkSize)
        let remainder = fileSize % chunkSize
        let totalCount = 0
        for (let index = 0; index < totality + 1; index++) {
            // Calculate start and end positions of current sub-package
            let start = index * chunkSize;
            let end = Math.min(start + chunkSize, buffer.byteLength); // Prevent out of bounds
            // Create ArrayBuffer for current sub-package data (key step)
            let sendBuffer = buffer.slice(start, end);
            if (index == totality) {
                // Last sub-package, need to fill remaining bytes
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
    // 4. Send upgrade end command
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
    // 5. Send installation command
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
        file.seek(0, qStd.SEEK_END);  // Move to end of file
        let size = file.tell();      // Get current position (i.e. file size)
        file.close();
        return size;
    },
    toLittleEndianHex: function (number, byteLength) {
        const bigNum = BigInt(number);
        // Parameter validation
        if (!Number.isInteger(byteLength)) throw new Error("byteLength must be an integer");
        if (byteLength < 1) throw new Error("byteLength must be greater than 0");
        if (byteLength > 64) throw new Error("Processing over 8 bytes not supported yet");
        // Value range check
        const bitWidth = BigInt(byteLength * 8);
        const maxValue = (1n << bitWidth) - 1n;
        if (bigNum < 0n || bigNum > maxValue) {
            throw new Error(`Value exceeds ${byteLength} byte range`);
        }
        // Little-endian byte extraction
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < byteLength; i++) {
            const shift = BigInt(i * 8);
            bytes[i] = Number((bigNum >> shift) & 0xFFn); // Ensure using BigInt mask
        }
        // Format conversion
        return Array.from(bytes, b =>
            b.toString(16).padStart(2, '0')
        ).join('');
    }
}
driver.sync = {
    // Async to sync mini implementation
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
    REINIT: "__MQTT_REINIT__",
    SEND_MSG: "__MQTT_SEND_MSG__",
    RECEIVE_MSG: "__MQTT_RECEIVE_MSG__",
    CONNECTED_CHANGED: "__MQTT_CONNECTED_CHANGED__",
    RESTART_HEARTBEAT: "__MQTT_RESTART_HEARTBEAT__",
    UNSUBSCRIBE: "__MQTT_UNSUBSCRIBE__",
    init: function () {
        bus.newWorker('mqttWorker', '/app/code/src/worker/mqttWorker.js')
    },
    reinit: () => {
        // Reconnect MQTT, needs to be executed when MQTT connection info is changed, no need to reconnect if not changed
        bus.fire(driver.mqtt.REINIT)
    },
    send: function (topic, payload) {
        log.info("[driver.mqtt] send:", topic, payload)
        bus.fire(driver.mqtt.SEND_MSG, {
            topic, payload
        })
    },
    // Modified heartbeat related config, need to restart heartbeat timer, call this
    restartHeartbeat: () => {
        bus.fire(driver.mqtt.RESTART_HEARTBEAT)
    },
    isConnected: () => {
        return dxmqttclient.getNative() && dxmqttclient.isConnected()
    },
    alarm: function (type, value) {
        let prefix = config.get("mqttInfo.prefix") || ''
        driver.mqtt.send(prefix + "access_device/v1/event/alarm", JSON.stringify(mqttService.mqttReply(utils.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)))
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
        // If sn is empty, use device uuid first
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
        // watchdog.open(1 | 2, this.id)
        // watchdog.enable(1, this.id)
        // watchdog.enable(2, this.id)
        // watchdog.start(20000, this.id)
    },
    loop: function () {
        // watchdog.loop(1, this.id)
    },
    feed: function (flag, timeout) {
        // if (utils.isEmpty(this.feedTime) || new Date().getTime() - this.feedTime > 2000) {
        //     // Reduce watchdog feed frequency, feed once every 2 seconds
        //     this.feedTime = new Date().getTime()
        //     watchdog.feed(flag, timeout)
        // }
    }
}

driver.eid = {
    id: "eid",
    active: function (sn, version, mac, codeMsg) {
        return eid.active(sn, version, mac, codeMsg)
    }
}

driver.autoRestart = {
    lastRestartCheck: new Date().getHours(),  // Initialize to current hour, not 0
    init: function () {
        std.setInterval(() => {        // Check if restart at specific hour is needed
            const now = new Date()
            const currentHour = now.getHours()
            // Only execute when hour equals set value and not the hour checked last time
            let autoRestart = utils.isEmpty(config.get("sysInfo.autoRestart")) ? 3 : config.get("sysInfo.autoRestart")
            if (currentHour === autoRestart && currentHour !== this.lastRestartCheck && now.getMinutes() === 0) {
                log.info("[driver.autoRestart] 自动重启")
                common.systemBrief('reboot')
            }
            // Update last check hour
            this.lastRestartCheck = currentHour
        }, 60000)
    }
}

export default driver