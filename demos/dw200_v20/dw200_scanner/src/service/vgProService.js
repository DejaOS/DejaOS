import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'
import codeService from '../service/codeService.js'
import configService from '../service/configService.js'
import common from '../../dxmodules/dxCommon.js'
import dxMap from '../../dxmodules/dxMap.js'
import std from '../../dxmodules/dxStd.js'
import utils from '../common/utils/utils.js'
import base64 from '../../dxmodules/dxBase64.js'
import net from '../../dxmodules/dxNet.js'
import * as os from "os"
import ota from "../../dxmodules/dxOta.js";
import bus from "../../dxmodules/dxEventBus.js"
import dxstd from '../../dxmodules/dxStd.js'
import safeService from '../service/safeService.js'
const vgProService = {}

vgProService.receiveMsg = function (data) {
    // log.info('[vgProService] receiveMsg:' + JSON.stringify(data))
    if (!data.bcc) {
        log.error("校验字错误")
        return
    }
    // 透传模式和协议模式独立，但是允许透传模式执行个别协议指令，比如：配置工具连接，升级操作
    const specProCmds = ["37", "b0", "54", "58", "56", "5a", "57", "81", "82", "83", "07", "21", "45", "0b"]
    if ((config.get('sysInfo.w_mode') == 2 && config.get("sysInfo.dchannel") == 64) || specProCmds.includes(data.cmd)) {
        let topic = "cmd" + data.cmd
        if (!this[topic]) {
            log.error("未实现此方法", topic)
            return
            // return driver.uart485.sendVg({ "cmd": data.cmd, "result": '90', "length": 0, "data": '' })
        }
        this[topic]({ source: '485', pack: data })
    }
}

//设备状态查询
vgProService.cmd01 = function (data) {
    log.info("{vgPro} [cmd01] req:" + JSON.stringify(data))
    send(data.source, { "cmd": "01", "length": 2, "result": "00", "data": "55AA" })
}

//获取设备ID
vgProService.cmd02 = function (data) {
    log.info("{vgPro} [cmd02] req:" + JSON.stringify(data))
    let devnum = config.get('sysInfo.devnum')
    if (!devnum) {
        send(data.source, { "cmd": "02", "length": 4, "result": "00", "data": "00000000" })
        return
    }
    let data1 = common.decimalToLittleEndianHex(devnum, 4)
    send(data.source, { "cmd": "02", "length": data1.length / 2, "result": "00", "data": data1 })
}

//更新或查询扫码器系统时间
vgProService.cmd03 = function (data) {
    log.info("{vgPro} [cmd03] req:" + JSON.stringify(data))
    let pack = data.pack
    if (pack.length == 0) {
        let data1 = utils.timestampToHexLE(new Date().getTime(), 16)
        send(data.source, { "cmd": "03", "length": data1.length / 2, "result": "00", "data": data1 })
        return
    }
    let data1 = pack.data.substring(0, 2)
    if (data1 == '00') {
        //自动更新时间 DW200设备无反应
        common.asyncReboot(2)
        send(data.source, { "cmd": "03", "length": 0, "result": "00", "data": "" })
    } else if (data1 == '01') {
        //定时更新时间 DW200设备无反应
        send(data.source, { "cmd": "03", "length": 0, "result": "00", "data": "" })
    } else if (data1 == '02') {
        //设置时间 可能会导致看门狗重启
        let time = common.littleEndianToDecimal(pack.data.substring(2))
        common.systemBrief('date  "' + utils.formatUnixTimestamp(time) + '"')
        driver.watchdog.feed("controller", 30)
        driver.watchdog.feed("main", 30)
        driver.watchdog.feed("service", 30)
        send(data.source, { "cmd": "03", "length": 0, "result": "00", "data": "" })
    }
}

//蜂鸣器和 LED 控制
vgProService.cmd04 = function (data) {
    log.info("{vgPro} [cmd04] req:" + JSON.stringify(data))
    let pack = data.pack
    pack.data = common.hexStringToUint8Array(pack.data)
    if ((pack.data[0] >> 3 & 1) === 1) {
        //控制蜂鸣器
        send(data.source, { "cmd": "04", "length": 0, "result": "00", "data": "" })
        driver.pwm.beep(pack.data[2] * 50, pack.data[3] * 50, pack.data[1])
        return
    }
    send(data.source, { "cmd": "04", "length": 0, "result": "00", "data": "" })
}

//开关扫码功能
vgProService.cmd05 = function (data) {
    log.info("{vgPro} [cmd05] req:" + JSON.stringify(data))
    let pack = data.pack
    if (pack.data == '00') {
        //开
        configService.configVerifyAndSave({ "sysInfo": { 'codeSwitch': 1 } })
    } else if (pack.data == '01') {
        configService.configVerifyAndSave({ "sysInfo": { 'codeSwitch': 0 } })
    } else {
        send(data.source, { "cmd": '05', "result": '90', "length": 0, 'data': '' })
        return
    }
    send(data.source, { "cmd": "05", "length": 0, "result": "00", "data": "" })
}

//开关键值上报 dw200没有
vgProService.cmd06 = function (data) {
    log.info("{vgPro} [cmd06] req:" + JSON.stringify(data) + '---DW100功能不实现')
    send(data.source, { "cmd": "06", "length": 0, "result": "00", "data": "" })
}


//获取随机数 安全模块使用
vgProService.cmd07 = function (data) {
    log.info("{vgPro} [cmd07] req:" + JSON.stringify(data))
    driver.sync.response("getRandom", data.pack.data)
}


//开关门磁查询
vgProService.cmd09 = function (data) {
    log.info("{vgPro} [cmd09] req:" + JSON.stringify(data))
    let sensorData = dxMap.get("SENSOR").get("data")
    if (sensorData && sensorData.code == 48) {
        if (sensorData.value) {
            send(data.source, { "cmd": "09", "length": 1, "result": "00", "data": "00" })
        } else {
            send(data.source, { "cmd": "09", "length": 1, "result": "00", "data": "01" })
        }
    } else {
        send(data.source, { "cmd": "09", "length": 0, "result": "0e", "data": "" })
    }
}

//获取设备 SN
vgProService.cmd0a = function (data) {
    log.info("{vgPro} [cmd0a] req:" + JSON.stringify(data))
    let pack = data.pack
    // 获取设备SN
    if (pack.length > 0) {
        let newSn = common.hexToString(pack.data)
        //修改 sn 号改成传入参数
        try {
            let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
            if (!wgetApp.includes('OK')) {
                //没有创建一下
                common.systemBrief("touch /etc/.sn")
            }
            std.saveFile('/etc/.sn', newSn)
        } catch (error) {
            log.info('0A写入 sn 失败原因:', error.stack)
            send(data.source, { "cmd": '0A', "result": '90', "length": 0, 'data': '' })
            return
        }
        //返回串口
        send(data.source, { "cmd": '0A', "result": '00', length: common.stringToHex(newSn).length / 2, 'data': common.stringToHex(newSn) })
        common.asyncReboot(2)
    } else {
        log.info('-----0A查询-----', common.getSn());
        send(data.source, { "cmd": '0A', "result": '00', length: common.stringToHex(common.getSn()).length / 2, "data": common.stringToHex(common.getSn()) })
    }
}

//获取设备 UUID dw200无返回我这里就写成和获取 sn 一样
vgProService.cmd0b = function (data) {
    log.info("{vgPro} [cmd0B] req:" + JSON.stringify(data))
    if (config.get('sysInfo.safe_open') === 1) {
        log.info("安全模块修改秘钥返回值")
        driver.sync.response("updateKey", data.pack.result)

        return;
    }
    send(data.source, { "cmd": '0b', "result": '00', length: common.getSn().length / 2, "data": common.getSn() })
}

//获取主控chipID
vgProService.cmd0c = function (data) {
    log.info("{vgPro} [cmd0C] req:" + JSON.stringify(data))
    send(data.source, { "cmd": '0c', "result": '00', length: common.stringToHex(common.getUuid()).length / 2, "data": common.stringToHex(common.getUuid()) })
}

//获取 mac 
vgProService.cmd10 = function (data) {
    log.info("{vgPro} [cmd10] req:" + JSON.stringify(data))
    send(data.source, { "cmd": '10', "result": '00', length: common.stringToHex(net.getMacaddr(net.TYPE.ETHERNET)).length / 2, "data": common.stringToHex(net.getMacaddr(net.TYPE.ETHERNET)) })
}

//QR、条码、NFC 设置
vgProService.cmd21 = function (data) {
    log.info("{vgPro} [cmd21] req:" + JSON.stringify(data));
    if (config.get('sysInfo.safe_open') === 1) {
        //安全模块开门返回值
        log.info("安全模块开门返回值");
        driver.sync.response("openDoor", data.pack.result)
        return;
    }
    let pack = data.pack;
    // 控制字与码制的映射关系
    //            Bit7	    Bit6	Bit5	Bit4	Bit3	Bit2        Bit1	  Bit0
    // 控制字 1：  CODE39	ISBN13	EAN13	EAN8	NFC     条码启用      DM        QR
    // 码制：      bit4     bit3    bit2    bit1    \           \        \          bit0
    // 控制字 2    UPCE   ISBN10   ITF    PDF417    BAR_EXP  DATABAR   CODE128     CODE93
    // 码制：      bit13   bit12   bit11    bit9      bit8     bit7      bit6       bit5
    let byte_map1 = [0, null, null, null, 1, 2, 3, 4]
    let byte_map2 = [5, 6, 7, 8, 9, 11, 12, 13]

    let firstByte, secondByte
    if (pack.data.length >= 2) {
        // 控制字 1
        firstByte = parseInt(pack.data.substring(0, 2), 16)
    }
    if (pack.data.length >= 4) {
        // 控制字 2
        secondByte = parseInt(pack.data.substring(2, 4), 16)
    }
    let de_type = pack.data == '00' ? 0 : config.get('sysInfo.de_type')

    for (let i = 0; i < 8; i++) {
        // 判断控制字对应位是否为1
        if (firstByte && ((1 << i) & firstByte)) {
            if (typeof byte_map1[i] == 'number') {
                // 取映射值添加到配置
                de_type |= 1 << byte_map1[i]
            } else {
                // if (i != 3 && i != 2 && i != 1) {
                //     send(data.source, { "cmd": '21', "result": '90', 'length': 0, 'data': '' });
                // }
                log.error("不支持修改的码制，bit:", i)
            }
        }
        // 控制字2同理
        if (secondByte && ((1 << i) & secondByte)) {
            if (typeof byte_map2[i] == 'number') {
                de_type |= 1 << byte_map2[i]
            } else {
                log.error("不支持修改的码制，bit:", i)
            }
        }
    }

    let dataInfo = { "sysInfo": { "de_type": de_type } }
    if ((firstByte >> 3) & 1 == 1) {
        dataInfo.sysInfo.nfc = 1
    }
    if ((firstByte >> 2) & 1 == 1) {
        dataInfo.sysInfo.de_type = 64510
    }
    configService.configVerifyAndSave(dataInfo)
    common.asyncReboot(2)
    send(data.source, { "cmd": '21', "result": '00', 'length': 0, 'data': '' });
}

// 扫码工作模式设   
vgProService.cmd22 = function (data) {
    log.info("{vgPro} [cmd22] req:" + JSON.stringify(data));
    let pack = data.pack;
    //配置文件 0是间隔 1是单次
    if (pack.length == 1) {
        if (pack.data == "02") {
            //单次模式
            config.setAndSave('sysInfo.s_mode', 1)
        } else if (pack.data == "01") {
            // 普通模式
            config.setAndSave('sysInfo.s_mode', 2)
        } else {
            return send(data.source, { "cmd": '22', "result": '90', "length": 0, 'data': '' });
        }
    } else {
        //间隔模式
        if (pack.length != 3 || pack.data.substring(0, 2) != "03") {
            return send(data.source, { "cmd": '22', "result": '90', "length": 0, 'data': '' })
        }
        config.setAndSave('sysInfo.s_mode', 0)
        try {
            let interval = common.littleEndianToDecimal(pack.data.substring(2))
            config.setAndSave('sysInfo.interval', interval * 1000)
        } catch (error) {
            send(data.source, { "cmd": '22', "result": '90', "length": 0, 'data': '' })
            return
        }
    }
    send(data.source, { "cmd": '22', "result": '00', "length": 0, 'data': '' });
}

//间隔模式下扫码时间间隔设置
vgProService.cmd23 = function (data) {
    log.info("{vgPro} [cmd23] req:" + JSON.stringify(data));
    if (config.get('sysInfo.safe_open') === 1) {
        //安全模块上报门磁状态
        log.info("安全模块门磁状态上报")
        let sensorData = dxMap.get("SENSOR").g解析配置码et("data")
        if (sensorData && sensorData.code == 48) {
            if (sensorData.value) {
                send(data.source, { "cmd": "09", "length": 1, "result": "00", "data": "01" })
            } else {
                send(data.source, { "cmd": "09", "length": 1, "result": "00", "data": "00" })
            }
        } else {
            send(data.source, { "cmd": "09", "length": 1, "result": "00", "data": "01" })
        }
        return;
    }
    let pack = data.pack;
    let interval = common.littleEndianToDecimal(pack.data)
    if (interval > 6000) {
        send(data.source, { "cmd": '23', "result": '90', "length": 0, 'data': '' })
        return
    }
    config.setAndSave('sysInfo.interval', interval)
    send(data.source, { "cmd": '23', "result": '00', "length": 0, 'data': '' });
}

//背光控制 无
vgProService.cmd24 = function (data) {
    log.info("{vgPro} [cmd24] req:" + JSON.stringify(data));
    send(data.source, { "cmd": '24', "result": '00', "length": 0, 'data': '' });
}

//蜂鸣器响应配置
vgProService.cmd25 = function (data) {
    log.info("{vgPro} [cmd25] req:" + JSON.stringify(data));
    let pack = data.pack
    let ascan = config.get('sysInfo.ascan')
    let anfc = config.get('sysInfo.anfc')
    if (pack.data == '01') {
        //扫码或刷卡后蜂鸣器动作
        config.setAndSave('sysInfo.ascan', ascan |= 1 << 0)
        config.setAndSave('sysInfo.anfc', anfc |= 1 << 0)
    } else if (pack.data == '00') {
        //扫码或刷卡后蜂鸣器不动作
        config.setAndSave('sysInfo.ascan', ascan &= ~(1 << 0))
        config.setAndSave('sysInfo.anfc', anfc &= ~(1 << 0))
    }
    send(data.source, { "cmd": '25', "result": '00', "length": 0, 'data': '' });
}

//GPIO_0 控制  默认只支持(MX86)设备
vgProService.cmd26 = function (data) {
    log.info("{vgPro} [cmd26] req:" + JSON.stringify(data));
    send(data.source, { "cmd": '26', "result": '00', "length": 0, 'data': '' });
}

//GPIO_1 控制  默认只支持(MX86)设备
vgProService.cmd27 = function (data) {
    log.info("{vgPro} [cmd27] req:" + JSON.stringify(data));
    send(data.source, { "cmd": '27', "result": '00', "length": 0, 'data': '' });
}

//GPIO_0 和 GPIO_1 输出高电平电压控制 默认只支持(MX86)设备
vgProService.cmd28 = function (data) {
    log.info("{vgPro} [cmd28] req:" + JSON.stringify(data));
    send(data.source, { "cmd": '28', "result": '00', "length": 0, 'data': '' });
}

//音频控制
vgProService.cmd29 = function (data) {
    log.info("{vgPro} [cmd29] req:" + JSON.stringify(data))
    let pack = data.pack
    let index = parseInt(pack.data, 16)
    let res = common.systemWithRes(`test -e "/app/code/resource/wav/${index}.wav" && echo "OK" || echo "NO"`, 2)
    if (!res.includes('OK')) {
        send(data.source, { "cmd": '63', "result": '90', "length": 0, 'data': '' })
        return
    }
    send(data.source, { "cmd": '29', "result": '00', "length": 0, 'data': '' });
    driver.audio.play(index)

}

//继电器控制
vgProService.cmd2a = function (data) {
    log.info("{vgPro} [cmd2a] req:" + JSON.stringify(data))
    let pack = data.pack
    pack.data = common.hexStringToUint8Array(pack.data)

    if (pack.data[0] != 1 && pack.data[0] != 0) {
        send(data.source, { "cmd": '2A', "result": '90', "length": 0, 'data': '' });
        return;
    }

    if (config.get("sysInfo.safe_open") === 1) {
        if (pack.data[0] == "01") {
            if (pack.length == 1) {
                //常开
                safeService.open();
            } else {
                //安全模块开门
                safeService.openDoorByTime(pack.data[1] * 50);
            }
        }

    } else {
        if (pack.data[0] == 0) {
            //关继电器
            driver.gpio.relay(0)
        } else if (pack.data[0] == 1) {
            if (pack.length == 1) {
                //常开
                driver.gpio.always()
            } else {
                //开指定时长
                driver.gpio.relay(1, pack.data[1] * 50)
            }
        }
    }

    send(data.source, { "cmd": '2A', "result": '00', "length": 0, 'data': '' });
}
/**
 * 心跳使能与心跳上报
 */
vgProService.cmd2b = function (data) {
    log.info("{vgPro} [cmd2b] req:" + JSON.stringify(data))
    let pack = data.pack
    //心跳上报设置
    let dataJson = JSON.parse(common.hexToString(pack.data));
    if (dataJson.heart_en == undefined) {
        send(data.source, { "cmd": '2b', "result": '90', "length": 0, 'data': '' })
        return
    }
    let sysInfo = { "heart_en": dataJson.heart_en, "heart_time": dataJson.heart_time, "heart_data": dataJson.heart_data }
    if (!dataJson.heart_time) {
        delete sysInfo.heart_time;
    }
    if (!dataJson.heart_data) {
        delete sysInfo.heart_data;
    }
    if (data.source == '485') {
        bus.fire('heart485', sysInfo)
        send(data.source, { "cmd": '2b', "result": '00', "length": 0, 'data': '' });
    } else {
        let res = configService.configVerifyAndSave({ "sysInfo": sysInfo })
        if (res == true) {
            send(data.source, { "cmd": '2b', "result": '00', "length": 0, 'data': '' });

        } else {
            send(data.source, { "cmd": '2b', "result": '90', "length": 0, 'data': '' })

        }
    }
}
// 查询版本号
vgProService.cmd37 = function (data) {
    log.info("{vgPro} [cmd37] req:" + JSON.stringify(data))
    let version = common.stringToHex(config.get('sysInfo.version'))
    send(data.source, { "cmd": '37', "result": '00', length: version.length / 2, 'data': version })
}

//结果上报模式设置
vgProService.cmd31 = function (data) {
    log.info("{vgPro} [cmd31] req:" + JSON.stringify(data))
    //0x00 代表 上位机轮询 0X30获取扫码器数据
    //0x01 代表 选用 0x30 指令主动上报数据
    //0x80 代表 上位机轮询 0x33 获取扫描器数据
    //0x81 代表 选用 0x33 指令主动上报数据
    let pack = data.pack
    pack.data = common.hexStringToUint8Array(pack.data)
    //校验
    if (pack.length != 1 && pack.length != 2) {
        //长度错误 直接返回错误
        send(data.source, { "cmd": '31', "result": '90', "length": 0, 'data': '' })
        return
    }
    //内容第一个字节
    let type = pack.data[0].toString(16)
    if (type != '0' && type != '1' && type != '80' && type != '81') {
        //类型错误返回 直接返回错误
        send(data.source, { "cmd": '31', "result": '90', "length": 0, 'data': '' })
        return
    }
    config.setAndSave('sysInfo.report_mode', type)
    if (pack.length == 2) {
        //第二个字节数据有效时间(单位 50MS) 0x00 -> 50 Ms 非零 -> N*50 Ms
        let time = pack.data[1]
        config.setAndSave('sysInfo.report_timeout', time == 0 ? 50 : time * 50)
    } else {
        config.setAndSave('sysInfo.report_timeout', 0)
    }
    send(data.source, { "cmd": '31', "result": '00', "length": 0, 'data': '' })

}

//获取结果1(不区分数据来源)
vgProService.cmd30 = function (data) {
    log.info("{vgPro} [cmd30] req:" + JSON.stringify(data))
    let map = dxMap.get("VGPRO")
    let codeReport = map.get('codeReport')
    if (config.get('sysInfo.report_mode') == '0' && codeReport) {
        //上报模式为 00 上位机轮询0x30获取扫描器数据 才返回数据其他情况默认回复null
        let reportTimeout = config.get('sysInfo.report_timeout') || 2000
        if (reportTimeout == 0 || reportTimeout == undefined || new Date().getTime() - codeReport.time <= reportTimeout) {
            // 数据有效
            let data1 = codeReport.data
            send(data.source, { "cmd": "30", "length": data1.length / 2, "result": "00", "data": data1 })
            return
        } else {
            send(data.source, { "cmd": '30', "result": '00', "length": 0, 'data': '' })
            map.del('codeReport')
        }
    } else {
        send(data.source, { "cmd": '30', "result": '00', "length": 0, 'data': '' })
    }
}

//获取结果2(区分)
vgProService.cmd33 = function (data) {
    log.info("{vgPro} [cmd33] req:" + JSON.stringify(data))
    let map = dxMap.get("VGPRO")
    let codeReport = map.get('codeReport')
    if (config.get('sysInfo.report_mode') == '80' && codeReport) {
        //上报模式为 80上位机轮询0x33获取扫描器数据 才返回数据其他情况默认回复null
        let reportTimeout = config.get('sysInfo.report_timeout')|| 2000
        if (reportTimeout == 0 || reportTimeout == undefined || new Date().getTime() - codeReport.time <= reportTimeout) {
            // 数据有效
            let data1 = codeReport.sourceMark + codeReport.data
            send(data.source, { "cmd": "33", "length": data1.length / 2, "result": "00", "data": data1 })
            return
        } else {
            send(data.source, { "cmd": '33', "result": '00', "length": 0, 'data': '' })
            map.del('codeReport')
        }
    } else {
        send(data.source, { "cmd": '33', "result": '00', "length": 0, 'data': '' })
    }
}

//按键值上报 DW200没有
vgProService.cmd32 = function (data) {
    log.info("{vgPro} [cmd32] req:" + JSON.stringify(data))
    send(data.source, { "cmd": '32', "result": '00', "length": 0, 'data': '' })
}

/**
* 安全模块配置继电器动作时间回复
* @param {*} data 
*/
vgProService.cmd45 = function (data) {
    log.info("{vgPro} [cmd45] req:" + JSON.stringify(data));
    driver.sync.response("updateRelayd", data.pack.result)
}


// 卡号上报开关
vgProService.cmd53 = function (data) {
    log.info("{vgPro} [cmd53] req:" + JSON.stringify(data))
    let pack = data.pack
    if (pack.data == '00') {
        //退出命令模式

    } else if (pack.data == '01') {
        //进入命令模式

    } else if (pack.data == '02') {
        //刷卡上报
        config.setAndSave('sysInfo.nfcReport', 1)
    } else if (pack.data == '03') {
        //关闭上报
        config.setAndSave('sysInfo.nfcReport', 0)
    } else {
        send(data.source, { "cmd": '53', "result": '90', "length": 0, 'data': '' })
        return
    }
    send(data.source, { "cmd": '53', "result": '00', "length": 0, 'data': '' })
}


//读取 M1 卡一块数据
vgProService.cmd51 = function (data) {
    try {
        log.info("{vgPro} [cmd51] req:" + JSON.stringify(data))
        let pack = data.pack
        if (pack.length < 8) {
            send(data.source, { "cmd": '51', "result": '90', "length": 0, 'data': '' })
        }
        pack.data = common.hexStringToUint8Array(pack.data)
        let keyType = pack.data[0]
        if (keyType != 96 && keyType != 97) {
            send(data.source, { "cmd": '51', "result": '90', "length": 0, 'data': '' })
            return
        }

        let blkNum = pack.data[1]
        let key = pack.data.slice(2, 8)
        let hexKey = common.arrToHex(Array.from(key))
        if (keyType == 96 && hexKey != "ffffffffffff") {
            send(data.source, { "cmd": '51', "result": '90', "length": 0, 'data': '' })
            return
        }
        if (blkNum > 59) {
            send(data.source, { "cmd": '51', "result": '90', "length": 0, 'data': '' })
            return
        }

        let taskFlg = 0x00
        if (pack.length == 9) {

            taskFlg = pack.data[8]
        }
        let res = driver.nfc.m1cardReadBlk(taskFlg, blkNum, key, keyType == 96 ? 0X60 : 0X61)
        if (res) {
            let sendData = [0x55, 0xAA, 0x51, 0x00, 0x10, 0x00].concat(res)
            let bcc = common.calculateBcc(sendData)
            send(data.source, sendData.concat([bcc]).map(v => v.toString(16).padStart(2, '0')).join(''))
        } else {
            send(data.source, { "cmd": '51', "result": '90', "length": 0, 'data': '' })
        }
    } catch (error) {
        log.error("{vgPro} [cmd51] :" + error.stack)
        send(data.source, { "cmd": '51', "result": '00', "length": 0, 'data': '' })
    }
}

//写 M1 卡一块数据
vgProService.cmd52 = function (data) {
    try {
        log.info("{vgPro} [cmd52] req:" + JSON.stringify(data))
        let pack = data.pack
        if (data.dlen < 24) {
            send(data.source, { "cmd": '52', "result": '90', "length": 0, 'data': '' })
        }
        pack.data = common.hexStringToUint8Array(pack.data)
        let keyType = pack.data[0]
        let blkNum = pack.data[1]
        let key = pack.data.slice(2, 8)
        let nfcData = pack.data.slice(8, 24)
        let taskFlg = 0x00
        if (pack.length == 25) {
            taskFlg = pack.data[24]
        }
        let res = driver.nfc.m1cardWriteBlk(taskFlg, blkNum, key, keyType, nfcData)
        if (res) {
            send(data.source, { "cmd": '52', "result": '00', "length": 0, 'data': '' })
        } else {
            send(data.source, { "cmd": '52', "result": '90', "length": 0, 'data': '' })
        }
    } catch (error) {
        log.error("{vgPro} [cmd52] :" + error.stack)
        send(data.source, { "cmd": '52', "result": '90', "length": 0, 'data': '' })
    }
}

//读 M1 卡扇区内多个块
vgProService.cmda0 = function (data) {
    try {
        log.info("{vgPro} [cmda0] req:" + JSON.stringify(data))
        let pack = data.pack
        if (data.dlen < 11) {
            send(data.source, { "cmd": 'A0', "result": '90', "length": 0, 'data': '' })
        }
        pack.data = common.hexStringToUint8Array(pack.data)
        let taskFlg = pack.data[0]
        let keyType = pack.data[1]
        let secNum = pack.data[2]
        let logicBlkNum = pack.data[3]
        let blkNums = pack.data[4]
        let key = pack.data.slice(5, 11)
        let res = driver.nfc.m1cardReadSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType)
        if (res) {
            let sendData = [0x55, 0xAA, 0xa0, 0x00, res.length, 0x00].concat(res)
            let bcc = common.calculateBcc(sendData)
            send(data.source, sendData.concat([bcc]).map(v => v.toString(16).padStart(2, '0')).join(''))
        } else {
            send(data.source, { "cmd": 'A0', "result": '90', "length": 0, 'data': '' })
        }
    } catch (error) {
        log.error("{vgPro} [cmda0] :" + error.stack)
        send(data.source, { "cmd": 'A0', "result": '90', "length": 0, 'data': '' })
    }
}

//写 M1 卡扇区内多个块
vgProService.cmda1 = function (data) {
    try {
        log.info("{vgPro} [cmda1] req:" + JSON.stringify(data))
        let pack = data.pack
        if (data.dlen < 11) {
            send(data.source, { "cmd": 'A1', "result": '90', "length": 0, 'data': '' })
        }
        pack.data = common.hexStringToUint8Array(pack.data)
        let taskFlg = pack.data[0]
        let keyType = pack.data[1]
        let secNum = pack.data[2]
        let logicBlkNum = pack.data[3]
        let blkNums = pack.data[4]
        let key = pack.data.slice(5, 11)
        let nfcData = pack.data.slice(11, 11 + blkNums * 16)
        let res = driver.nfc.m1cardWriteSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, nfcData)
        if (res) {
            send(data.source, { "cmd": 'A1', "result": '00', "length": 0, 'data': '' })
        } else {
            send(data.source, { "cmd": 'A1', "result": '90', "length": 0, 'data': '' })
        }
    } catch (error) {
        log.error("{vgPro} [cmda1] :" + error.stack)
        send(data.source, { "cmd": 'A1', "result": '90', "length": 0, 'data': '' })
    }
}

// 发送 APDU 指令 当前不做
vgProService.cmda6 = function (data) {
    log.info("{vgPro} [cmda6] req:" + JSON.stringify(data))
    send(data.source, { "cmd": 'A6', "result": '00', "length": 0, 'data': '' })
}

//响应扫码、刷卡、蓝牙数据
vgProService.cmd61 = function (data) {
    log.info("{vgPro} [cmd61] req:" + JSON.stringify(data))
    let pack = data.pack
    try {
        let dataJson = JSON.parse(common.utf8HexToStr(pack.data));
        driver.screen.customShowMsgAndImg(dataJson.ack + '\n' + dataJson.msg, 2000)
    } catch (error) {
        send(data.source, { "cmd": '61', "result": '90', "length": 0, 'data': '' })
        return
    }
    send(data.source, { "cmd": '61', "result": '00', "length": 0, 'data': '' })
}

//显示自定义数据
vgProService.cmd62 = function (data) {
    log.info("{vgPro} [cmd62] req:" + JSON.stringify(data))
    let pack = data.pack
    let mode = pack.data.substring(0, 2)
    pack.data = pack.data.substring(2)
    let jsonData = JSON.parse(common.utf8HexToStr(pack.data))
    if (mode == "01") {
        // 显示文字
        if (jsonData.page_data) {
            driver.screen.customShowMsgAndImg({ center: jsonData.page_data, bottom_left: jsonData.key_left, bottom_mid: jsonData.key_mid, bottom_right: jsonData.key_right, })
        }
    } else if (mode == "02") {
        // 显示二维码
        driver.screen.customShowMsgAndImg({ dynamic_qr_str: jsonData.dynamic_qr_str })
    }
    send(data.source, { "cmd": '62', "result": '00', "length": 0, 'data': '' })
}

// 显示图片
vgProService.cmd63 = function (data) {
    log.info("{vgPro} [cmd63] req:" + JSON.stringify(data))
    let pack = data.pack
    let index = parseInt(pack.data, 16)
    let res = common.systemWithRes(`test -e "/app/code/resource/image/${index}.png" && echo "OK" || echo "NO"`, 2)
    if (!res.includes('OK')) {
        send(data.source, { "cmd": '63', "result": '90', "length": 0, 'data': '' })
        return
    }
    driver.screen.showPic({ time: 2000, name: index })
    send(data.source, { "cmd": '63', "result": '00', "length": 0, 'data': '' })
}

//进入特定窗口
vgProService.cmd64 = function (data) {
    log.info("{vgPro} [cmd64] req:" + JSON.stringify(data))
    let pack = data.pack
    if (pack.data == "0100") {
        // driver.screen.customShowMsgAndImg(" ", 100)
        driver.screen.showSystemInfo(false)
    } else if (pack.data == "0200") {
        driver.screen.showSystemInfo(true)
    } else {
        send(data.source, { "cmd": '64', "result": '90', "length": 0, 'data': '' })
        return
    }
    send(data.source, { "cmd": '64', "result": '00', "length": 0, 'data': '' })
}

//弹窗显示自定义数据
vgProService.cmd65 = function (data) {
    log.info("{vgPro} [cmd65] req:" + JSON.stringify(data))
    let pack = data.pack
    try {
        let jsonData = JSON.parse(common.utf8HexToStr(pack.data))
        if (utils.isEmpty(jsonData.msg) || utils.isEmpty(jsonData.isCloseEnable) || utils.isEmpty(jsonData.msgTimeoutMs)) {
            send(data.source, { "cmd": '65', "result": '90', "length": 0, 'data': '' })
        } else {
            driver.screen.customPopWin(jsonData.msg, jsonData.msgTimeoutMs, jsonData.isCloseEnable, "waring", true)
            send(data.source, { "cmd": '65', "result": '00', "length": 0, 'data': '' })
        }
    } catch (error) {
        send(data.source, { "cmd": '65', "result": '90', "length": 0, 'data': '' })
    }

}

// 开始传输数据
vgProService.cmd54 = function (data) {
    log.info("{vgPro} [cmd54] req:" + JSON.stringify(data))
    //删除对应压缩包
    common.systemBrief('rm -rf /app/data/upgrades/download.zip')
    send(data.source, { "cmd": '54', "result": '00', "length": 0, 'data': '' })

    dxMap.get("VGPRO").del("updateSize")
    dxMap.get("VGPRO").del("updateProgress")
    dxMap.get("VGPRO").put("updateSize", common.littleEndianToDecimal(data.pack.data))

    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Start Upgrading", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("开始升级", 2000, true, "waring", false)
    }

    // 超时标记
    dxMap.get("VGPRO").put("updateTimeout", new Date().getTime())
    let timer = dxstd.setInterval(() => {
        let updateTimeout = dxMap.get("VGPRO").get("updateTimeout")
        if (!updateTimeout) {
            dxstd.clearInterval(timer)
            return
        }
        if (new Date().getTime() - updateTimeout > 2000) {
            if (config.get("sysInfo.language") == 1) {
                driver.screen.customPopWin("Upgrade interruption", 600000, true, "waring", false)
            } else {
                driver.screen.customPopWin("升级中断", 600000, true, "waring", false)
            }
            dxstd.clearInterval(timer)
            driver.pwm.beep(null, null, 1)
        }
    }, 2000)
}

//传输数据
vgProService.cmd58 = function (data) {
    log.info("{vgPro} [cmd58] req:")
    // log.info("{vgPro} [cmd58] req:" + JSON.stringify(data))
    let pack = data.pack
    let fpath = "/upgrades.zip"
    let fd = os.open(fpath, os.O_RDWR | os.O_CREAT | os.O_APPEND);
    //打开失败
    if (fd < 0) {
        return
    }
    let arraybuffer = common.hexStringToArrayBuffer(pack.data)
    let pngBuffer = new Uint8Array(arraybuffer);
    os.write(fd, pngBuffer.buffer, 0, pngBuffer.length)
    // 关闭文件描述符
    os.close(fd);
    send(data.source, { "cmd": '58', "result": '00', "length": 0, 'data': '' })

    let updateSize = dxMap.get("VGPRO").get("updateSize")
    let updateProgress = dxMap.get("VGPRO").get("updateProgress")
    if (!updateProgress) {
        updateProgress = updateSize
    }

    let lastSize = updateProgress - pack.data.length / 2
    let progress = (1 - (lastSize / updateSize)) * 100;

    dxMap.get("VGPRO").put("updateProgress", lastSize)

    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrading " + Math.floor(progress) + "%", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("正在升级 " + Math.floor(progress) + "%", 2000, true, "waring", false)
    }

    dxMap.get("VGPRO").put("updateTimeout", new Date().getTime())
}

//0x56 / 0x5A 停止传输数据
vgProService.cmd56 = function (data) {
    log.info("{vgPro} [cmd56] req:" + JSON.stringify(data))
    send(data.source, { "cmd": '56', "result": '00', "length": 0, 'data': '' })
}
//0x56 / 0x5A 停止传输数据
vgProService.cmd5a = function (data) {
    log.info("{vgPro} [0x5A] req:" + JSON.stringify(data))
    let pack = data.pack
    let fpath = "/app/data/upgrades/download.zip"
    let res = false
    if (std.exist(fpath) && common.md5HashFile(fpath).map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase() == pack.data.toLowerCase()) {
        res = true
    }
    send(data.source, { "cmd": '5A', "result": res ? '00' : '90', "length": 0, 'data': '' })
}
//覆盖安装
vgProService.cmd57 = function (data) {
    log.info("{vgPro} [cmd57] req:" + JSON.stringify(data))
    send(data.source, { "cmd": '57', "result": '00', "length": 0, 'data': '' })

    dxMap.get("VGPRO").del("updateTimeout")

    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Successfully", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级成功", 2000, true, "waring", false)
    }

    let fpath = "/app/data/upgrades/download.zip"
    const temp = ota.OTA_ROOT + '/temp'
    common.systemBrief(`rm -rf ${ota.OTA_ROOT} && mkdir ${ota.OTA_ROOT} `) //先删除ota根目录
    // 解压
    common.systemBrief(`mkdir ${temp} && unzip -o ${fpath} -d ${temp}`)
    // 构建脚本文件
    let shell = `cp -r ${temp}/* /app/code \n rm -rf ${ota.OTA_ROOT}`

    common.systemBrief(`echo "${shell}" > ${ota.OTA_RUN} && chmod +x ${ota.OTA_RUN}`)
    let fileExist = (os.stat(ota.OTA_RUN)[1] === 0)
    if (!fileExist) {
        throw new Error('Build shell file failed')
    }
    common.systemWithRes(`${ota.OTA_RUN}`)
    common.asyncReboot(2)
}

// 配置/查询设备
vgProService.cmdb0 = function (data) {
    log.info("{vgPro} [cmdb0] req:" + JSON.stringify(data))
    let pack = data.pack
    // 查询/修改设备配置
    let str = pack.data
    if (!str) {
        return
    }
    //数据域第一个字节表示修改还是查询   00 查询 01 修改	
    if (parseInt(str.substring(0, 2)) == 0) {
        //查询配置
        let data1 = common.strToUtf8Hex(utils.jsonObjectToString(config.getAll()))
        // let data1 = common.strToUtf8Hex(utils.jsonObjectToString({ beepd: 500, taddr: "192.168.62.201",show_unlocking:1 }))
        send(data.source, { "cmd": 'B0', "result": '00', "length": data1.length / 2, "data": data1 })
    } else {
        //修改配置
        if (pack.dlen <= 1) {
            return
        }
        // ___VBAR_CONFIG_V1.1.0___{ble_name="11127S"}--lLqHBRnE2bU8D2HJ5RTioQ==
        let toString = common.utf8HexToStr(str.substring(2))
        if (!checkConfigCode(toString)) {
            driver.pwm.fail()
            log.error("配置码校验失败")
            return
        }
        let content = parseString(toString)
        if (content.sn) {
            //修改 sn 号改成传入参数
            try {
                let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
                if (!wgetApp.includes('OK')) {
                    //没有创建一下
                    common.systemBrief("touch /etc/.sn")
                }
                std.saveFile('/etc/.sn', content.sn)
            } catch (error) {
                log.info('写入/etc/.sn文件失败,原因:', error.stack)
                send(data.source, { "cmd": 'B0', "result": '90', "length": 0, "data": '' })
                return
            }
            common.asyncReboot(2)
        }

        //校验
        let res = configService.configVerifyAndSave({ 'sysInfo': content })
        if (typeof res != 'boolean') {
            log.error(res)
            send(data.source, { "cmd": 'B0', "result": '90', "length": 0, "data": '' })
            driver.pwm.fail()
            return
        }
        if (content.ble_name) {
            let config = driver.uartBle.getConfig()
            if (config.name != content.ble_name) {
                res = false
                log.error('蓝牙修改失败')
            }
        }
        if (res) {
            driver.pwm.success()
        } else {
            driver.pwm.fail()
            log.error("配置失败")
            send(data.source, { "cmd": 'B0', "result": '90', "length": 0, "data": '' })
            return
        }
        if (content.reboot === 1) {
            common.asyncReboot(1)
        }
        send(data.source, { "cmd": 'B0', "result": '00', "length": 0, "data": '' })
    }
}


//音频或图片更新 准备
vgProService.cmd81 = function (data) {
    log.info("{vgPro} [cmd81] req:" + JSON.stringify(data))
    let pack = data.pack
    //删除目录
    common.systemBrief(`rm -rf ${ota.OTA_ROOT} && mkdir ${ota.OTA_ROOT} `)
    //记录需要接收的数据大小
    let map = dxMap.get("VGPRO")
    let count = common.littleEndianToDecimal(pack.data.substring(2, 6))
    let size = utils.hexLEToTimestamp(pack.data.substring(6))
    map.put('upgradeInfo', { count: count, size: size })
    send(data.source, { "cmd": '81', "result": '00', "length": 0, 'data': '' })
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Start Upgrading", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("开始升级", 2000, true, "waring", false)
    }

    // 超时标记
    dxMap.get("VGPRO").put("updateTimeout", new Date().getTime())
    let timer = dxstd.setInterval(() => {
        let updateTimeout = dxMap.get("VGPRO").get("updateTimeout")
        if (!updateTimeout) {
            dxstd.clearInterval(timer)
            return
        }
        if (new Date().getTime() - updateTimeout > 2000) {
            if (config.get("sysInfo.language") == 1) {
                driver.screen.customPopWin("Upgrade interruption", 600000, true, "waring", false)
            } else {
                driver.screen.customPopWin("升级中断", 600000, true, "waring", false)
            }
            dxstd.clearInterval(timer)
            driver.pwm.beep(null, null, 1)
        }
    }, 2000)

}

//音频或图片更新 分包传输
vgProService.cmd82 = function (data) {
    // log.info("{vgPro} [cmd82] req:" + JSON.stringify(data))
    let pack = data.pack
    let packNum = common.littleEndianToDecimal(pack.data.substring(0, 4))
    let map = dxMap.get("VGPRO")
    let upgradeInfo = map.get('upgradeInfo')
    if (!upgradeInfo || !upgradeInfo.count || !upgradeInfo.size) {
        send(data.source, { "cmd": '82', "result": '90', "length": 0, 'data': '' })
        return
    }
    let firmware = ota.OTA_ROOT + '/download.zip'
    let fd = os.open(firmware, os.O_RDWR | os.O_CREAT | os.O_APPEND);
    //打开失败
    if (fd < 0) {
        return
    }
    let arraybuffer = common.hexStringToArrayBuffer(pack.data.substring(4))
    let pngBuffer = new Uint8Array(arraybuffer);
    os.write(fd, pngBuffer.buffer, 0, pngBuffer.length)
    os.close(fd)
    send(data.source, { "cmd": '82', "result": '00', "length": 0, 'data': '' })
    let index = utils.hexLEToTimestamp(pack.data.substring(0, 4))
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrading " + Math.floor((index / upgradeInfo.count) * 100) + "%", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("正在升级 " + Math.floor((index / upgradeInfo.count) * 100) + "%", 2000, true, "waring", false)
    }

    dxMap.get("VGPRO").put("updateTimeout", new Date().getTime())
}

//音频或图片更新 结束指令
vgProService.cmd83 = function (data) {
    log.info("{vgPro} [cmd83] req:" + JSON.stringify(data))
    let pack = data.pack
    let md5 = pack.data.substring(4)
    let map = dxMap.get("VGPRO")
    let upgradeInfo = map.get('upgradeInfo')
    //3. 计算并比较md5是否一样
    let firmware = ota.OTA_ROOT + '/download.zip'
    const temp = ota.OTA_ROOT + '/temp'

    let size = parseInt(common.systemWithRes(`file="${firmware}"; [ -e "$file" ] && wc -c "$file" | awk '{print $1}' || echo "0"`, 100).split(/\s/g)[0])
    if (size != upgradeInfo.size) {
        map.del('upgradeInfo')
        send(data.source, { "cmd": '83', "result": '90', "length": 0, 'data': '' })
        return
    }
    let md5Hash = common.md5HashFile(firmware)
    md5Hash = md5Hash.map(v => v.toString(16).padStart(2, 0)).join('')
    if (md5Hash != md5) {
        map.del('upgradeInfo')
        send(data.source, { "cmd": '83', "result": '90', "length": 0, 'data': '' })
        return
    }
    //解压
    common.systemBrief(`mkdir -p ${temp} && unzip -q ${firmware} -d ${temp}`)
    //5. 构建脚本文件
    let shell = codeService.updateResourceShell
    common.systemBrief(`echo "${shell}" > ${ota.OTA_RUN} && chmod +x ${ota.OTA_RUN}`)
    let res = common.systemWithRes(`test -e "${ota.OTA_RUN}" && echo "OK" || echo "NO"`, 2)
    if (!res.includes('OK')) {
        throw new Error('Build shell file failed')
    }
    common.systemWithRes(`${ota.OTA_RUN}`)
    map.del('upgradeInfo')
    send(data.source, { "cmd": '83', "result": '00', "length": 0, 'data': '' })

    dxMap.get("VGPRO").del("updateTimeout")

    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Successfully", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级成功", 2000, true, "waring", false)
    }
}

//音频或图片更新 删除音频文件或者图片
vgProService.cmd8a = function (data) {
    log.info("{vgPro} [cmd8a] req:" + JSON.stringify(data))
    let pack = data.pack
    let type = pack.data.substring(0, 2)
    let index = parseInt(pack.data.substring(2), 16)
    if (type != '01' && type != '02') {
        send(data.source, { "cmd": '8A', "result": '90', "length": 0, 'data': '' })
        return
    }
    if (type == '01') {
        //删除图片
        let res = common.systemWithRes(`test -e "/app/code/resource/image/${index}.png" && echo "OK" || echo "NO"`, 2)
        if (!res.includes('OK')) {
            send(data.source, { "cmd": '8A', "result": '90', "length": 0, 'data': '' })
            return
        }
        common.systemBrief('rm -rf /app/code/resource/image/' + index + '.png')
    } else if (type == '02') {
        let res = common.systemWithRes(`test -e "/app/code/resource/wav/${index}.wav" && echo "OK" || echo "NO"`, 2)
        if (!res.includes('OK')) {
            send(data.source, { "cmd": '8A', "result": '90', "length": 0, 'data': '' })
            return
        }
        //删除音频
        common.systemBrief('rm -rf /app/code/resource/wav/' + index + '.wav')
    }
    send(data.source, { "cmd": '8A', "result": '00', "length": 0, 'data': '' })
}


function send(source, data) {
    switch (source) {
        case '485':
            driver.uart485.sendVg(data)
            break;
        case 'tcp':
            driver.tcp.sendVg(data)
            break;
        // case 'usb':
        //     driver.uartUsb.sendVg(data)
        //     break;
        default:
            break;
    }
}

/**
 * 解析字符串改为 json
 * @param {*} string 
 * @returns 
 */
function parseString(string) {
    const configMatch = string.match(/\{(.+?)\}/);
    if (configMatch && configMatch.length >= 2) {
        const configData = configMatch[1];
        const keyValuePairs = configData.split(',').map(pair => {
            const [key, value] = pair.split('=');
            const trimmedValue = value.trim();
            const parsedValue = trimmedValue.startsWith('"') && trimmedValue.endsWith('"')
                ? trimmedValue.slice(1, -1) // 去除双引号，解析为字符串
                : Number(trimmedValue);     // 解析为数值
            return [key.trim(), parsedValue];
        });
        const jsonObject = Object.fromEntries(keyValuePairs);
        return jsonObject;
    }
    return null;
}

//校验配置码
function checkConfigCode(code) {
    let password = config.get('sysInfo.com_passwd') || '1234567887654321'
    let lastIndex = code.lastIndexOf("--");
    let firstPart = code.substring(0, lastIndex);
    let secondPart = code.substring(lastIndex + 2);
    let res
    try {
        res = base64.fromHexString(common.arrayBufferToHexString(common.hmac(firstPart, password)))
    } catch (error) {
        log.error(error, error.stack)
        return false
    }
    return res == secondPart;
}

export default vgProService