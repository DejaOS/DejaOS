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
import dxHttp from '../dxmodules/dxHttpClient.js'
import CryptoES from '../dxmodules/crypto-es/index.js';
import * as qStd from "std"
let lockMap = dxMap.get("ble_lock")
const driver = {}
driver.pwm = {
    init: function () {
        // Initialize buzzer
        dxPwm.request(4);
        dxPwm.setPeriodByChannel(4, 366166)
        dxPwm.enable(4, true)
    },
    // Key press sound
    press: function () {
        dxPwm.beep({ channel: 4, time: 30, volume: this.getVolume2(), interval: 0 })
    },
    // Failure sound
    fail: function () {
        dxPwm.beep({ channel: 4, time: 500, volume: this.getVolume3(), interval: 0 })
    },
    // Success sound
    success: function () {
        dxPwm.beep({ channel: 4, time: 30, count: 2, volume: this.getVolume3() })
    },
    // Warning sound
    warning: function () {
        dxPwm.beep({ channel: 4, volume: this.getVolume3(), interval: 0 })
    },
    // Key press volume
    getVolume2: function () {
        if (utils.isEmpty(this.volume2)) {
            let volume2 = config.get("sysInfo.volume2")
            this.volume2 = utils.isEmpty(volume2) ? 50 : volume2
        }
        return this.volume2
    },
    // Buzzer alert volume
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
            // Disable network
            return
        }
        dxNet.worker.beforeLoop(mqttService.getNetOptions())
    },
    loop: function () {
        if (config.get("netInfo.type") == 0) {
            // Disable network
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
        dxGpio.request(105)
    },
    open: function () {
        // Determine door opening mode
        let openMode = config.get("doorInfo.openMode")
        if (utils.isEmpty(openMode)) {
            openMode = 0
        }
        // Normally closed mode does not allow opening
        if (openMode != 2) {
            dxGpio.setValue(105, 1)
        }
        if (openMode == 0) {
            // Normal mode: record relay closing time
            // Timed relay closing
            let openTime = config.get("doorInfo.openTime")
            openTime = utils.isEmpty(openTime) ? 2000 : openTime
            let map = dxMap.get("GPIO")
            std.setTimeout(() => {
                dxGpio.setValue(105, 0)
                map.del("relayCloseTime")
            }, openTime)
            map.put("relayCloseTime", new Date().getTime() + openTime)
        }
    },
    close: function () {
        let openMode = config.get("doorInfo.openMode")
        // Determine door opening mode
        // Normally open mode does not allow closing
        if (openMode != 1) {
            dxGpio.setValue(105, 0)
        }
    },
}
driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11' },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.options1, this.options2)
        dxCode.decoderUpdateConfig({ deType: config.get('scanInfo.deType') })
    },
    loop: function () {
        // dxCode.worker.loop(config.get('scanInfo.sMode'), config.get('scanInfo.interval'))
        dxCode.worker.loop(0, 2000)
    }
}
driver.nfc = {
    options: { id: 'nfc1', m1: true, psam: false },
    init: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("NFC card reading is disabled")
            return
        }
        this.options.useEid = config.get("sysInfo.nfc_identity_card_enable") == 3
        dxNfc.worker.beforeLoop(this.options)
    },
    eidInit: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("NFC card reading is disabled")
            return
        }
        if (config.get("sysInfo.nfc_identity_card_enable") == 3) {
            dxNfc.eidUpdateConfig({ appid: "1621503", sn: config.get("sysInfo.sn"), device_model: config.get("sysInfo.appVersion") })
        }
    },
    loop: function () {
        if (!config.get('sysInfo.nfc')) {
            log.debug("NFC card reading is disabled")
            this.loop = () => { }
        } else {
            this.loop = () => dxNfc.worker.loop(this.options)
        }
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
        dxAlsaplay.play(config.get("sysInfo.language") == "EN" ? '/app/code/resource/wav/mj_f_eng.wav' : '/app/code/resource/wav/mj_f.wav')
    },
    success: function () {
        dxAlsaplay.play(config.get("sysInfo.language") == "EN" ? '/app/code/resource/wav/mj_s_eng.wav' : '/app/code/resource/wav/mj_s.wav')
    },
    doPlay: function (fileName) {
        dxAlsaplay.play('/app/code/resource/wav/' + fileName + '.wav')
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
            // GPIO closed but door sensor opened indicates illegal door opening alarm
            // driver.mqtt.alarm(2, value)
        }
        driver.mqtt.alarm(0, value)
        let map1 = dxMap.get("GPIOKEY")
        if (value == 0) {
            map1.del("alarmOpenTimeoutTime")
        } else if (value == 1) {
            // Record door opening timeout time
            let openTimeout = config.get("doorInfo.openTimeout") * 1000
            openTimeout = utils.isEmpty(openTimeout) ? 10000 : openTimeout
            map1.put("alarmOpenTimeoutTime", new Date().getTime() + openTimeout)
        }
    },
    loop: function () {
        dxGpioKey.worker.loop()
        if (utils.isEmpty(this.checkTime) || new Date().getTime() - this.checkTime > 200) {
            // Reduce check frequency, check every 200ms
            this.checkTime = new Date().getTime()
            let map = dxMap.get("GPIOKEY")
            let alarmOpenTimeoutTime = map.get("alarmOpenTimeoutTime")
            if (typeof alarmOpenTimeoutTime == 'number' && new Date().getTime() >= alarmOpenTimeoutTime) {
                driver.mqtt.alarm(0, 0)
                map.del("alarmOpenTimeoutTime")
            }
        }
    },
}
driver.ntp = {
    loop: function () {
        if (!config.get('netInfo.ntp')) {
            log.debug("Auto time synchronization is disabled")
            this.loop = () => { }
            let time = config.get('sysInfo.time')
            if (time) {
                common.systemBrief(`date -s "@${time}"`)
            }
        } else {
            let interval = config.get('netInfo.ntpInterval')
            dxNtp.beforeLoop(config.get('netInfo.ntpAddr'), utils.isEmpty(interval) ? undefined : interval)
            this.ntpHour = config.get('netInfo.ntpHour')
            this.flag = true
            this.loop = () => {
                dxNtp.loop()
                if (new Date().getHours() == this.ntpHour && this.flag) {
                    // Scheduled sync, immediately sync time once
                    dxNtp.syncnow = true
                    this.flag = false
                }
                if (new Date().getHours() != this.ntpHour) {
                    // Allow time sync again after this hour passes
                    this.flag = true
                }
            }
        }
    },
}
driver.screen = {
    accessFail: function (type, msg) {
        bus.fire('displayResults', { type: type, flag: false, msg: msg })
    },
    accessSuccess: function (type) {
        bus.fire('displayResults', { type: type, flag: true })
    },
    // Reload screen for UI configuration changes to take effect
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
    fail: function (param) {
        bus.fire('fail', param)
    },
    success: function (param) {
        bus.fire('success', param)
    },

}
driver.system = {
    init: function () {
    }
}
driver.uartBle = {
    id: 'uartBle',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS5', result: 0 })
        std.sleep(1000)
        dxUart.ioctl(1, '921600-8-N-1', this.id)
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
        // Returns true if setting is successful
        return driver.sync.request("uartBle.setConfig", 2000)
    },
    setConfigReply: function (data) {
        driver.sync.response("uartBle.setConfig", data)
    },
    /**
     * Generate Bluetooth serial port checksum, calculation differs from general checksum
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
        // 创建临时目录
        const tempDir = "/app/data/.temp"
        const sourceFile = "/app/data/.temp/file"
        // Ensure temporary directory exists
        if (!std.exist(tempDir)) {
            common.systemBrief(`mkdir -p ${tempDir}`)
        }
        // Download file to temporary directory
        let downloadRet = dxHttp.download(data.url, sourceFile, 60000)
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
                throw new Error(`Failed to open source file: ${sourceFile}`)
            }
            let buffer = new Uint8Array(fileSize)
            try {
                const bytesRead = std.read(srcFd, buffer.buffer, 0, fileSize)
                if (bytesRead <= 0) {
                    log.info("File copy failed!")
                    return false
                } else {
                    log.info("File copy successful!")
                }
            } finally {
                std.close(srcFd)
            }
            let hash = CryptoES.SHA256(CryptoES.lib.WordArray.create(buffer))
            let fileSha256 = hash.toString(CryptoES.enc.Hex)
            let cmd01 = "55aa600006000301000100fe"
            this.send(cmd01 + this.genStrCrc(cmd01).toString(16))
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
                console.log("Already in upgrade mode, can start upgrade")
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
                console.log("Upgrade package description sent successfully, please send upgrade package")
                log.info("Upgrade package description sent successfully, please send upgrade package")
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
            // Create ArrayBuffer for current sub-package data (critical step)
            let sendBuffer = buffer.slice(start, end);
            if (index == totality) {
                // Last sub-package, need to pad remaining bytes
                let padding = new Uint8Array(chunkSize - remainder);
                sendBuffer = new Uint8Array([...sendBuffer, ...padding]);
                console.log("Last byte data: ", sendBuffer.byteLength, common.arrayBufferToHexString(sendBuffer))
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
                console.log("Upgrade package transmission completed, totalCount: ", totalCount)
            } else {
                console.log("Original data synchronized, transmitting sub-packages, totalCount: ", totalCount)
            }
        }
        this.sendUpgradeFinishCommand()
    },
    handleCmd03Response: function (pack) {
        if (pack[0] == 0x03 && pack[1] == 0x01 && pack[2] == 0x80 && pack[3] == 0x03) {
            if (pack[5] == 0x00) {
                console.log("Upgrade package transmission successful")
            } else {
                driver.screen.warning({ msg: "Upgrade package transmission failed", beep: false })
                return false
            }
            return true
        }
        return false
    },
    // 4. Send upgrade finish command
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
                console.log("Upgrade finish command successful")
            } else {
                driver.screen.warning({ msg: "Upgrade finish command failed", beep: false })
                return false
            }
            return true
        }
        return false
    },
    // 5. Send install command
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
        let size = file.tell();      // Get current position (i.e., file size)
        file.close();
        return size;
    },
    toLittleEndianHex: function (number, byteLength) {
        const bigNum = BigInt(number);
        // Parameter validation
        if (!Number.isInteger(byteLength)) throw new Error("byteLength must be an integer");
        if (byteLength < 1) throw new Error("byteLength must be greater than 0");
        if (byteLength > 64) throw new Error("Processing of more than 8 bytes is not supported");
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
    // Small implementation of async to sync conversion
    request: function (topic, timeout) {
        let map = dxMap.get("SYNC");
        map.put(topic + "__request__", topic);
        let count = 0;
        let data = map.get(topic);
        while (utils.isEmpty(data) && count * 10 < timeout) {
            data = map.get(topic);
            std.sleep(10);
            count += 1;
        }
        let res = map.get(topic);
        map.del(topic);
        map.del(topic + "__request__");
        return res;
    },
    response: function (topic, data) {
        let map = dxMap.get("SYNC");
        if (map.get(topic + "__request__") == topic) {
            map.put(topic, data);
        }
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
        log.info("[driver.mqtt] send:", JSON.stringify(data))
        dxMqtt.send(data.topic, data.payload, this.id)
    },
    alarm: function (type, value) {
        this.send({ topic: "access_device/v1/event/alarm", payload: JSON.stringify(mqttService.mqttReply(utils.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)) })
    },
    getOnlinecheck: function () {
        let timeout = config.get("doorInfo.timeout")
        timeout = utils.isEmpty(timeout) ? 2000 : timeout
        let language = config.get('sysInfo.language')
        let warningInfo = {
            msg: language == "EN" ? 'Online checking' : '在线核验中',
        }
        driver.screen.warning(warningInfo)
        return driver.sync.request("mqtt.getOnlinecheck", timeout)
    },
    getOnlinecheckReply: function (data) {
        driver.sync.response("mqtt.getOnlinecheck", data)
    },
    getStatus: function () {
        return dxMqtt.isConnected(this.id)
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
    init: function () {
        // watchdog.open(1 | 2)
        // watchdog.enable(1)
        // watchdog.start(20000)
    },
    loop: function () {
        // watchdog.loop(1)
    },
    feed: function (flag, timeout) {
        // if (utils.isEmpty(this.feedTime) || new Date().getTime() - this.feedTime > 2000) {
        //     // Reduce watchdog feed frequency, feed every 2 seconds
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
        std.setInterval(() => {        // Check if restart is needed at the hour
            console.log('--Check started--');

            const now = new Date()
            const currentHour = now.getHours()
            // Only execute when hour equals set value and is not the last checked hour
            let autoRestart = utils.isEmpty(config.get("sysInfo.autoRestart")) ? 3 : config.get("sysInfo.autoRestart")
            if (currentHour === autoRestart && currentHour !== this.lastRestartCheck && now.getMinutes() === 0) {
                common.systemBrief('reboot')
            }
            // Update last checked hour
            this.lastRestartCheck = currentHour
        }, 60000)
    }
}

export default driver
