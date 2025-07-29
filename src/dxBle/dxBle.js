// build: 20240808
// 蓝牙数据通信通道
// 依赖组件:dxDriver，dxStd，dxLogger，dxMap，dxEventBus,dxCommon
import dxMap from './dxMap.js'
import common from './dxCommon.js'
import std from './dxStd.js'
import bus from './dxEventBus.js'
import uart from './dxUart.js'
import gpio from './dxGpio.js'
import * as os from "os"
import * as qStd from "std"
import log from './dxLogger.js'
const map = dxMap.get('default')
const ble = {}


ble.VG = {
	RECEIVE_MSG: '__ble__MsgReceive',
}

/**
 * 简化微光蓝牙通信协议的使用，
 * 1. 接受数据：把TLV的二进制的数据接受到后解析成对象，并以eventbus的event发送出去(uart.VG.RECEIVE_MSG+options.id)
 * 返回的对象格式：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32",bcc:true}
 * cmd: 1个字节的命令字，16进制字符串
 * result:1个字节的标识字，表示数据处理的结果，成功或失败或其他状态。只有反馈数据才有标识字，16进制字符串
 * length：数据的长度，在TLV里用2个字节来定义，这里直接转成10进制的数字
 * data：多个字节的数据域，16进制字符串
 * bcc: bcc校验成功或失败
 * 2. 发送数据：把对象转成TLV格式的二进制数据再发送出去，可以通过uart.sendVg('要发送的数据',id)，数据格式如下
 * 发送的数据格式有二种 1.对象格式 ：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32"} 2. 完整的16进制字符串'55AA09000000F6'
 * 3. 同样的id，多次调用runvg也只会执行一次
 * 
 * @param {object} options 启动的参数
 *			@param {number} options.type 通道类型，参考枚举 TYPE，必填  （兼容USBHID块传输，默认1024每块）
 *			@param {string} options.path 不同的设备或同一设备的不同类型通道对应的path不一样，比如DW200的485对应的值是"/dev/ttyS2"，必填
 *			@param {number} options.result 0和1(缺省是0)，标识是接收的数据还是发送的数据包含标识字节，0表示接受的数据不包括标识字，发送的数据包括，1是反之
 *			@param {number} options.passThrough passThrough为true则接收的数据使用透传模式，非必填
 *          @param {string} options.id  句柄id，非必填（若初始化多个实例需要传入唯一id）
 * 			@param {number} options.bleName 要设置的蓝牙名称 非必填
 *          @param {string} options.broadcast 要设置的广播标识 非必填
 */
ble.run = function (options) {
	if (options === undefined || options.length === 0) {
		throw new Error("dxuart.runvg:'options' parameter should not be null or empty")
	}
	if (options.id === undefined || options.id === null || typeof options.id !== 'string') {
        // 句柄id
        options.id = ""
    }
	if (options.type === undefined || options.type === null) {
		throw new Error("dxuart.runvg:'type' should not be null or empty")
	}
	if (options.path === undefined || options.path === null) {
		throw new Error("dxuart.runvg:'path' should not be null or empty")
	}
	let oldfilepre = '/app/code/dxmodules/vgBleWorker'
	let content = std.loadFile(oldfilepre + '.js').replace("{{id}}", options.id)
	let newfile = oldfilepre + options.id + '.js'
	std.saveFile(newfile, content)
	let init = map.get("__vgble__run_init" + options.id)
	if (!init) {//确保只初始化一次
		map.put("__vgble__run_init" + options.id, options)
		bus.newWorker(options.id || "__ble",newfile)
	}
}

/**
 * 蓝牙复位(复位前须确保GPIO和蓝牙已经初始化)
 */
ble.reset = function () {
    gpio.setFuncGpio(75, 0x04)
    os.sleep(10)
    gpio.setFuncGpio(75, 0x05)
    os.sleep(10)
}

/**
 * 发送蓝牙数据
 * @param {*} data 例如：55AA31010001CE 或 55 AA 31 01 00 01 CE
 * @returns 
 */
ble.send = function(data, id) {
    data = data.replaceAll("\"", "")
    uart.send(common.hexStringToArrayBuffer(data), id)
}

/**
 * 查询蓝牙配置信息
 * @param {*} 
 * @returns 
 */
ble.getBleConfig = function(id) {
    let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": 6, "data": [0x7e, 0x01, 0x00, 0x02, 0x00, 0xfe] }
    pack.crc = ble.genCrc(pack)
    let data = pack.head + pack.cmd + pack.result + common.decimalToLittleEndianHex(pack.dlen, 2) + pack.data.map(v => v.toString(16).padStart(2, '0')).join("") + pack.crc.toString(16).padStart(2, '0')
    ble.send(data, id)
    for (let index = 0; index < 20; index++) {
        let res = map.get("__ble__config")
        if(res){
            return res
        }
        os.sleep(50)
    }
    return null
}

/**
 * 设置蓝牙配置信息
 * @param {*} param param.name蓝牙名称 param.mac蓝牙mac param.broadcastSnTlv蓝牙广播SN param.broadcastStatusTlv蓝牙广播状态标识
 * @returns 
 */
ble.setBleConfig = function(param, id) {
    if (!param || !param.name) {
        return
    }
    let nameTlv = ""
    let macTlv = ""
    let broadcastSnTlv = ""
    let broadcastStatusTlv = ""

    let name = param.name
    if (name !== undefined) {
        if (name && !/[\u4E00-\u9FA5]/g.test(name) && name.length <= 10) {
            nameTlv = "10" + common.decimalToLittleEndianHex(name.length, 1) + common.stringToHex(name)
        } else {
            log.error("蓝牙名称不能为中文且长度不能超过10个字符");
            return
        }
    }

    // 内部方法，mac校验
    let VBAR_M_BLE_MACLEN = 6
    function bleMacIsValid(mac) {
        if (mac.length != VBAR_M_BLE_MACLEN) {
            return false;
        }
        if (!mac.some(v => v !== "00") || mac[VBAR_M_BLE_MACLEN - 1] & 0xc0 !== 0xc0) {
            return false;
        }
        return true;
    }

    let mac = param.mac
    if (mac !== undefined) {
        if (mac && mac.length === 12 && /^[a-zA-Z0-9]*$/.test(mac) && bleMacIsValid(mac.match(/.{2}/g))) {
            macTlv = "11" + "06" + mac
        } else {
            log.error("蓝牙mac地址格式错误");
            return
        }
    }

    let broadcastSn = param.broadcastSn
    if (broadcastSn !== undefined) {
        if (broadcastSn && broadcastSn.length === 12 && /^[a-zA-Z0-9]*$/.test(broadcastSn)) {
            macTlv = "12" + "06" + mac
        } else {
            log.error("蓝牙广播SN格式错误");
            return
        }
    }

    let broadcastStatus = param.broadcastStatus
    if (broadcastStatus !== undefined) {
        if (broadcastStatus) {
            macTlv = "15" + "01" + broadcastStatus
        } else {
            log.error("蓝牙广播状态标识格式错误");
            return
        }
    }

    let content = "7a00" + nameTlv + macTlv + broadcastSnTlv + broadcastStatusTlv + "fe"

    let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": content.length / 2, "data": content.match(/.{2}/g).map(v => parseInt(v, 16)) }
    pack.crc = ble.genCrc(pack)
    let data = pack.head + pack.cmd + pack.result + common.decimalToLittleEndianHex(pack.dlen, 2) + pack.data.map(v => v.toString(16).padStart(2, '0')).join("") + pack.crc.toString(16).padStart(2, '0')
    ble.send(data, id)
}

/**
 * 主控开关蓝牙广播
 * @param {*} 
 * @returns 
 */
ble.ctrlBroadcast = function(id) {

    let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": 7, "data": [0x7e, 0x01, 0x00, 0x03, 0x01, 0x01, 0xfe] }
    pack.crc = ble.genCrc(pack)
    let data = pack.head + pack.cmd + pack.result + common.decimalToLittleEndianHex(pack.dlen, 2) + pack.data.map(v => v.toString(16).padStart(2, '0')).join("") + pack.crc.toString(16).padStart(2, '0')
    ble.send(data, id)
    for (let index = 0; index < 20; index++) {
        let res = map.get("__ble__config")
        if(res){
            return res
        }
        os.sleep(50)
    }
    return null
}


/**
 * 扫描设备
 * 默认发送的指令: 55aa600010000a0000010a34210000030060006000fe66
 * 55aa6000                 协议头
 * 1000                     长度字
 * 0a0000                   P1-P3
 * 010a                     T=01 L=0a
 * 3421000003               V 扫描持续时间(4Byte)	扫描广播类型(1Byte)
 * 0060006000               V 扫描类型(1Byte)	扫描间隔(2Byte)     扫描窗口(2Byte)
 * fe                       CONN_ID
 * 66                       校验字
 * 默认收到的应答: 55aa6007000a0000010100fe
 * 默认收到的异步回复: 0a80010000cc01d0000c059ec0020106030356470dff01af0a00313131324651007bfe
 * 0a8001                                           P1-P3
 * 00                                               事件状态 00:扫描中 01: 扫描结束
 * 00                                               广播类型
 * cc                                               RSSI
 * 01                                               MAC Type
 * d0000c059ec0                                     MAC地址
 * 020106030356470dff01af0a00313131324651007b       ADV Struct
 * fe                                               conn_id
 */
ble.scanDevice = function(id, config = {}){
    // 扫描持续时间(4Byte)
    let scanTime = config.scanTime || 0x03e8
    // 扫描广播类型(1Byte)
    let broadcastType = config.broadcastType || 0x03
    // 扫描类型(1Byte)
    let scanType = config.scanType || 0x00
    // 扫描间隔
    let scanInterval = config.scanInterval || 0x60
    // 扫描窗口
    let scanWindow = config.scanWindow || 0x60

    let cmd = "55aa600010000a0000010a" +
        ble.toLittleEndianHex(scanTime, 4) +
        broadcastType.toString(16).padStart(2, '0') +
        scanType.toString(16).padStart(2, '0') +
        ble.toLittleEndianHex(scanInterval, 2) +
        ble.toLittleEndianHex(scanWindow, 2) + 
        "fe";
    
    cmd = cmd + ble.genStrCrc(cmd).toString(16).padStart(2, '0')

    print("scanDevice 发送扫描设备命令: ", cmd)
    ble.send(cmd, id)
}

/**
 * 停止扫描设备
 * 默认发送的指令: 55aa600006000a00000200fe6f
 * 55aa6000     协议头
 * 0600         长度字
 * 0a0000       P1-P3
 * 0200         T=02 L=00 V=null
 * fe           CONN_ID
 * 6f           CRC校验字
 * 默认收到的应答: 55aa6007000a0000020100fe6e
 */
ble.stopScanning = function(id){
    let cmd = "55aa600006000a00000200fe6f"
    print("stopScanning 发送停止扫描设备命令: ", cmd)
    ble.send(cmd, id)
}

/**
 * 请求连接设备
 * 默认发送的指令: 55aa600015000a0000030f01d0000c059ec018001a0000002800fede
 * 55aa6000                             协议头
 * 1500                                 长度字
 * 0a0000                               P1-P3
 * 030f                                 T=03 L=0f
 * 01                                   V: MAC Type
 * d0000c059ec0                         V: MAC地址
 * 1800                                 V: interval_min
 * 1a00                                 V: interval_max
 * 0000                                 V: latency
 * 2800                                 V: timeout
 * fe                                   CONN_ID
 * 0a                                   CRC校验字
 * 默认收到的应答: 55aa6007000a0000030100fe
 * 
 * 默认收到的异步回复: 55aa600b000a800202d0000c059ec005
 * 55aa60           协议头
 * 0b00             长度字
 * 0a8002           P1-P3
 * 02               事件状态
 * d0000c059ec0     MAC地址
 * 05               CONN_ID(返回的真实的连接ID，之前未连接之前默认为0xFE)
 */
ble.connect = function(id, config = {}){

    let macType = config.macType || 0x01
    let macAddr = config.macAddr || "c09e050c00d0"
    let intervalMin = config.intervalMin || 0x18
    let intervalMax = config.intervalMax || 0x1a
    let latency = config.latency || 0x00
    let timeout = config.timeout || 0x28
    let conTimeout = config.conTimeout || 0x01f4

    let cmd = "55aa600015000a0000030f" +
        macType.toString(16).padStart(2, '0') +
        ble.toLittleEndianString(macAddr) +
        ble.toLittleEndianHex(intervalMin, 2) + 
        ble.toLittleEndianHex(intervalMax, 2) +
        ble.toLittleEndianHex(latency, 2) + 
        ble.toLittleEndianHex(timeout, 2) +
        ble.toLittleEndianHex(conTimeout, 2) +
        "fe";
    
    let crc = ble.genStrCrc(cmd)
    cmd = cmd + crc.toString(16).padStart(2, '0')

    print("connect 发送请求连接设备命令: ", cmd)
    ble.send(cmd, id)
}

/**
 * 断开连接设备
 * 默认发送的指令: 55aa600006000a000004000295 (断开连接号为2的设备)
 * 55aa6000         协议头
 * 0600             长度字
 * 0a0000           P1-P3
 * 0400             T=04 L=00
 * 02               CONN_ID
 * 95               CRC校验字
 * 默认收到的应答: 55aa6007000a000004010009
 */
ble.disConnect = function(id, connect_id){
    let cmd = "55aa600006000a00000400" + connect_id.toString(16).padStart(2, '0');
    cmd = cmd + ble.genStrCrc(cmd).toString(16).padStart(2, '0')
    print("disConnect: ", cmd)
    ble.send(cmd, id)
}

/**
 * 扫描特定的服务
 * UUID: 00010000-e985-b7e8-b186-e5a49ae5bca6 DW200设备蓝牙的UUID是固定的
 * 默认发送的指令: 55aa600018000a000005120010a6bce59aa4e586b1e8b785e9000001000ca7 (连接号为0c的设备)
 * 55aa6000                             协议头
 * 1800                                 长度字
 * 0a0000                               P1-P3
 * 0512                                 T=05 L=12
 * 00                                   FLAG
 * 10                                   UUID_LEN
 * a6bce59aa4e586b1e8b785e900000100     UUID
 * 0c                                   CONN_ID
 * a7                                   CRC校验字
 * 默认收到的应答: 55aa6007000a00000501000c
 * 默认收到的异步回复: 该异步回复多种，详细请看方法调用处
 */
ble.scanService = function(id, connect_id, config = {}){
    let flag = config.flag || 0x00
    let uuid = config.UUID || "00010000e985b7e8b186e5a49ae5bca6"
    if(!connect_id) throw new Error("connect_id 不能为空!");
    if(!config.uuidLen) throw new Error("uuidLen 不能为空!");
    let uuidLen =  config.uuidLen
    let tlvLen = uuidLen + 2
    let cmdLen = uuidLen + 8

    let cmd = "55aa6000" +
        ble.toLittleEndianHex(cmdLen, 2) + 
        "0a0000" + 
        "05" + 
        tlvLen.toString(16).padStart(2, '0') + 
        flag.toString(16).padStart(2, '0') +
        uuidLen.toString(16).padStart(2, '0') +
        ble.toLittleEndianString(uuid) +
        connect_id.toString(16).padStart(2, '0');

    cmd = cmd + ble.genStrCrc(cmd).toString(16).padStart(2, '0')
    print("scanService 发送扫描特定服务命令: ", cmd)
    ble.send(cmd, id)
}

/**
 * 订阅特征notify/Indication
 * 默认发送的指令: 55aa60000b000a000009051200130000099a (连接号为09的设备)
 * 55aa6000                             协议头
 * 0b00                                 长度字
 * 0a0000                               P1-P3
 * 0905                                 T=09 L=05
 * 1200                                 特征Handle
 * 1300                                 CCC handle(一般是特征Handle索引 + 1)
 * 00                                   FLAG
 * 09                                   CONN_ID
 * 9a                                   CRC校验字
 * 默认收到的应答: 55aa6007000a000009010009
 * 默认收到的异步回复：TODO
 */
ble.subCharacter = function(id, connect_id, config = {}){
    if(!connect_id) throw new Error("connect_id 不能为空!");
    let characterHandle =  config.characterHandle || "1200"
    let CCCHandle =  config.CCCHandle || "1300"
    let flag =  config.flag || 0x00

    let cmd = "55aa60000b000a00000905" +
        characterHandle + 
        CCCHandle + 
        flag.toString(16).padStart(2, '0') +
        connect_id.toString(16).padStart(2, '0');

    cmd = cmd + ble.genStrCrc(cmd).toString(16).padStart(2, '0')
    print("subCharacter 发送订阅特征命令: ", cmd)
    ble.send(cmd, id)
}

/**
 * 特征写
 * 默认发送的指令: 55aa600010000a0000080a15000155aa07010010e9fe6d
 * 55aa6000                             协议头
 * 1000                                 长度字
 * 0a0000                               P1-P3
 * 080a                                 T=09 L=0a
 * 1500                                 特征Handle
 * 01                                   FLAG
 * 55aa07010010e9                       userData
 * fe                                   conn_id
 * 6d                                   CRC校验字
 * 默认收到的应答: 55aa6007000a0000080300150006
 * 55aa60       协议头
 * 0700         长度字
 * 0a0000       P1-P3
 * 0803         T=08 L=03
 * 00           
 * 1500         特征Handle
 * 06           conn_id
 */
ble.write = function(id, connect_id, config){
    // write_without_response  handle 1200; flag 0x00
    // write_with_response  handle 1500; flag 0x01
    if(!connect_id) throw new Error("connect_id 不能为空!");
    let flag =  config.flag || 0x01
    let characterHandle =  config.characterHandle || "1500"
    let userDataLen =  config.userDataLen || 0x07
    let userData =  config.userData || "55aa07010010e9"

    let tlvLen = userDataLen + 3
    let cmdLen = userDataLen + 9

    let cmd = "55aa6000" +
        ble.toLittleEndianHex(cmdLen, 2) + 
        "0a0000" + 
        "08" + 
        tlvLen.toString(16).padStart(2, '0') + 
        characterHandle +
        flag.toString(16).padStart(2, '0') +
        userData+
        connect_id.toString(16).padStart(2, '0');

    cmd = cmd + ble.genStrCrc(cmd).toString(16).padStart(2, '0')
    print("write 特征写: ", cmd)
    ble.send(cmd, id)
}

/**
 * 蓝牙升级
 */
ble.upgrade = function(id, sourceFile, fileSha256){
    // 55aa600006000301000100fe
    // 55aa6000     协议头
    // 0600         长度字
    // 030100       P1-P3
    // 0100         TLV数据
    // fe
    let cmd01_1 = "55aa600006000301000100fe"
    let crc = ble.genStrCrc(cmd01_1)
    let cmd01_2 = "55aa600006000301000100fe" + crc.toString(16)

    print("发送升级命令: ", cmd01_2)
    ble.send(cmd01_2, id)
    os.sleep(1000)
    ble.send(cmd01_2, id)

    let fileSize = ble.getFileSize(sourceFile);
    print("fileSize: ", fileSize)
    let littleEndianHex = ble.toLittleEndianHex(fileSize, 4)
    // 93408 
    // 182次 余224
    let chunkSize = 512
    let totality = parseInt(fileSize / 512)
    let remainder = fileSize % 512

    // 55aa6000     包头
    // 2a00         长度字 
    // 030100       48字节数据
    // 0224         T=02  L=0x24
    // e06c0100     4字节的文件大小小端长度字
    // bde2c44d8246a1d7ee18e7a9b2b6c3c008a076a52669c53d8c0aefab245806ad 32字节sha256
    // fe           1字节
    // fb
    let cmd02_1 = "55aa6000" + "2a00" + "030100" + "0224" + littleEndianHex + fileSha256 + "fe"
    crc = ble.genStrCrc(cmd02_1)
    let cmd02_2 = cmd02_1 + crc.toString(16)

    print("即将要发送的升级包描述指令: ", cmd02_2)
    ble.send(cmd02_2, id)


    // 打开源文件（只读模式）
    const srcFd = os.open(sourceFile, os.O_RDONLY);
    if (srcFd < 0) {
        throw new Error(`无法打开源文件: ${sourceFile}`);
    }
    // 创建缓冲区（例如 4096 字节）
    let bufferSize = fileSize;
    let buffer = new Uint8Array(bufferSize);
    try {
        // 从源文件读取数据到缓冲区
        const bytesRead = os.read(srcFd, buffer.buffer, 0, bufferSize);
        if (bytesRead <= 0) {
            console.log("文件复制失败!");
        }else{
            console.log("文件复制成功!");
        }
    } finally {
        // 确保关闭文件描述符
        os.close(srcFd);
    }

    // 分包发送升级包
    // 55aa6000     包头
    // 0602         长度字 518
    // 030100       48字节数据
    // 0300         T=03  L=0x0200
    // xxxxx        512字节数据
    // fe           1字节
    // fb
    os.sleep(200)
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
            print("最后一字节数据: ", sendBuffer.byteLength)
            print("最后一字节数据: ", common.arrayBufferToHexString(sendBuffer))
        }

        let cmd03_1 = "55aa6000" + "0602" + "030100" + "0300" + common.arrayBufferToHexString(sendBuffer) + "fe"
        crc = ble.genStrCrc(cmd03_1)
        let cmd03_2 = cmd03_1 + crc.toString(16)
        // print("即将要发送的分包信息: ", cmd03_2)
        ble.send(cmd03_2, id)
        os.sleep(60)
        totalCount++
        if(totalCount == totality + 1){
            print("升级包传输完毕,totalCount: ", totalCount)
        }else{
            print("原数据信息已同步,正在分包传输,totalCount: ", totalCount)
        }
    }

    // 55aa600006000301000100fe
    // 55aa6000
    // 0600
    // 030100
    // 0400fe       TLV
    let cmd04_1 = "55aa600006000301000400fe"
    crc = ble.genStrCrc(cmd04_1)
    let cmd04_2 = "55aa600006000301000400fe" + crc.toString(16)
    print("发送升级结束命令: ", cmd04_2)
    ble.send(cmd04_2, id)
    os.sleep(50)

    // 55aa600006000301000100fe
    // 55aa6000
    // 0600
    // 030100
    // 0500fe       TLV
    let cmd05_1 = "55aa600006000301000500fe"
    crc = ble.genStrCrc(cmd05_1)
    let cmd05_2 = "55aa600006000301000500fe" + crc.toString(16)
    print("发送安装升级包命令: ", cmd05_2)
    ble.send(cmd05_2, id)
}

ble.genCrc =  function(pack) {
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
    return bcc;
}

ble.toHexadecimal =  function(data) {
    return parseInt(data).toString(16).padStart(2, '0')
}

ble.getUrandom = function(len) {
    return common.systemWithRes(`dd if=/dev/urandom bs=1 count="${len}" 2>/dev/null | xxd -p`, 100).split(/\s/g)[0]
}

ble.genStrCrc = function(pack) {
    let buffer = common.hexStringToUint8Array(pack)
    print("buffer.length: " + buffer.length)
    let bcc = 0;
    for (let i = 0; i < buffer.length; i++) {
        bcc ^= buffer[i];
    }
    print("crc: ", bcc)
    return bcc;
}

ble.toLittleEndianHex = function(number, byteLength) {
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

ble.toLittleEndianString = function(hexStr) {
    // 按 1 字节（2 个字符）分组
    let bytes = hexStr.match(/.{2}/g);
    
    // 反转数组，拼接成小端格式
    return bytes.reverse().join('');
}

ble.getFileSize = function(filename) {
    let file = qStd.open(filename, "r");
    if (!file) {
        throw new Error("Failed to open file");
    }
    
    file.seek(0, qStd.SEEK_END);  // 移动到文件末尾
    let size = file.tell();      // 获取当前位置（即文件大小）
    
    file.close();
    return size;
}


export default ble;