import std from './dxStd.js'
import dxUart from './dxUart.js'
import dxCommon from './dxCommon.js'
import log from './dxLogger.js'

const dxFingerZaz = {}

let options = {
    id : 'fingerUart',
    total: 5000,
    timeout : 500,
    type : '3',
    path : '/dev/ttySLB1',
    baudrate : '115200-8-N-1'
}


/**
 * 测试指纹模块命令
 * @returns {boolean} 返回true表示测试成功，返回false表示测试失败
 */
dxFingerZaz.test = function () {
    send({prefix: 0x55AA, cmd: 0x0100, data: ''})
    let resp = receive({prefix: 0xAA55, cmd: 0x0100})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.test:", resp)
        return false
    }
}


/**
 * 获取指定编号范围内可注册的首个编号
 * @param {number} startId - 起始编号
 * @param {number} endId - 结束编号
 * @returns {number} 返回空闲的指纹编号，返回false表示获取失败（失败原因可参考ret）
 */
dxFingerZaz.getEmptyId = function (startId, endId) {
    if(startId === undefined || startId === null || startId < 1 || startId > options.total){
        throw new Error("dxFingerZaz.getEmptyId: 'startId' parameter should be between 1 and " + options.total)
    }
    if(endId === undefined || endId === null || endId < 1 || endId > options.total){
        throw new Error("dxFingerZaz.getEmptyId: 'endId' parameter should be between 1 and " + options.total)
    }

    let data = toEndianHexExtended(startId, 2) + toEndianHexExtended(endId, 2)
    send({prefix: 0x55AA, cmd: 0x4500, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4500})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data, 2)
    } else {
        log.error("dxFingerZaz.getEmptyId:", resp)
        return false
    }
}


/**
 * 获取指定编号的模板注册状态
 * @param {number} keyId - 指纹编号
 * @returns {number} 返回0表示未注册，返回1表示已注册，返回false表示获取失败
 */
dxFingerZaz.getStatus = function (keyId) {
    if (keyId === undefined || keyId === null) {
        throw new Error("dxFingerZaz.getStatus: 'keyId' parameter should not be null or empty")
    }

    send({prefix: 0x55AA, cmd: 0x4600, data: toEndianHexExtended(keyId, 2)})
    let resp = receive({prefix: 0xAA55, cmd: 0x4600})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data, 1)
    } else {
        log.error("dxFingerZaz.getStatus:", resp)
        return false
    }
}


/**
 * 采集指纹图像
 * @returns {boolean} 返回true表示采集成功，返回false表示采集失败（失败原因可参考ret）
 */
dxFingerZaz.getImage = function () {
    send({prefix: 0x55AA, cmd: 0x2000, data: ""})
    let resp = receive({prefix: 0xAA55, cmd: 0x2000})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.getImage:", resp)
        return false
    }
}


/**
 * 从暂存在ImageBuffer中的指纹图像产生模板
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @returns {boolean} 返回true表示生成成功，返回false表示生成失败（失败原因可参考ret）
 */
dxFingerZaz.generate = function (bufferNum) {
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.generate: 'bufferNum' parameter should be between 0 and 3")
    }
    send({prefix: 0x55AA, cmd: 0x6000, data: toEndianHexExtended(bufferNum, 2)})
    let resp = receive({prefix: 0xAA55, cmd: 0x6000})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.generate:", resp)
        return false
    }
}


/**
 * 合并指纹模板
 * @param {number} mergeCount - 合并模板数量（2|3） 2:合成 Ram Buffer0 和 Ram Buffer1，3:合成 Ram Buffer0、Ram Buffer1 和 Ram Buffer2
 * @param {number} bufferNum - 指纹合并后模板编号（0-2）
 * @returns {boolean} 返回true表示合并成功，返回false表示合并失败
 */
dxFingerZaz.merge = function (mergeCount, bufferNum) {
    if(mergeCount === undefined || mergeCount === null || mergeCount < 2 || mergeCount > 3){
        throw new Error("dxFingerZaz.merge: 'mergeCount' parameter should be between 2 and 3")
    }
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.merge: 'bufferNum' parameter should be between 0 and 3")
    }

    let data = toEndianHexExtended(bufferNum, 2) + toEndianHexExtended(mergeCount, 1)
    send({prefix: 0x55AA, cmd: 0x6100, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x6100})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.merge:", resp)
        return false
    }
}


/**
 * 保存指纹模板数据到模块指纹库
 * @param {number} keyId - 指纹编号
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @param {boolean} [overwrite=false] - 是否覆盖已存在的指纹
 * @returns {boolean} 返回true表示存储成功，返回false表示存储失败
 */
dxFingerZaz.storeChar = function (keyId, bufferNum, overwrite = false) {
    if(keyId === undefined || keyId === null){
        throw new Error("dxFingerZaz.storeChar: 'keyId' parameter should be between 0 and 255")
    }
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.storeChar: 'bufferNum' parameter should be between 0 and 3")
    }
    if (overwrite) {
        const delRet = dxFingerZaz.delChar(keyId, keyId)
        if (!delRet) {
            log.error("dxFingerZaz.storeChar: failed to delete existing fingerprint for keyId", keyId)
            return false
        }
    }
    let data = toEndianHexExtended(keyId, 2) + toEndianHexExtended(bufferNum, 2)
    send({prefix: 0x55AA, cmd: 0x4000, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4000})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.storeChar:", resp)
        return false
    }
}


/**
 * 读取模块中的指纹并暂存在RamBuffer中
 * @param {number} keyId - 指纹编号
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @returns {boolean} 返回true表示存储成功，返回false表示存储失败
 */
dxFingerZaz.loadChar = function (keyId, bufferNum) {
    if(keyId === undefined || keyId === null){
        throw new Error("dxFingerZaz.loadChar: 'keyId' parameter should be between 0 and 255")
    }
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.loadChar: 'bufferNum' parameter should be between 0 and 3")
    }

    let data = toEndianHexExtended(keyId, 2) + toEndianHexExtended(bufferNum, 2)
    send({prefix: 0x55AA, cmd: 0x4100, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4100})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.loadChar:", resp)
        return false
    }
}


/** 
 * 将保存于指定编号的Ram Buffer 中的 Template 上传至HOST
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @returns {string} 返回设备信息，返回false表示获取失败
 */
dxFingerZaz.upChar = function (bufferNum) {
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.upChar: 'bufferNum' parameter should be between 0 and 3")
    }

    let data = toEndianHexExtended(bufferNum, 2)
    send({prefix: 0x55AA, cmd: 0x4200, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4200})
    if(resp && resp.ret == 0x00){
        log.info("resp.data:", fromEndianHexExtended(resp.data, 2))
        resp = receive({prefix: 0xA55A, cmd: 0x4200, len: fromEndianHexExtended(resp.data, 2)})
        if(resp && resp.ret == 0x00){
            return dxCommon.uint8ArrayToHexString(resp.data)
        } else {
            log.error("dxFingerZaz.upChar:", resp)
            return false
        }
    } else {
        log.error("dxFingerZaz.upChar:", resp)
        return false
    }
}



/** 
 * 从HOST下载 Template到模块指定编号的 Ram Buffer
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @param {string} template - 指纹模板数据
 * @returns {string} 返回设备信息，返回false表示获取失败
 */
dxFingerZaz.downChar = function (bufferNum, template) {
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.downChar: 'bufferNum' parameter should be between 0 and 3")
    }
    if(template === undefined || template === null){
        throw new Error("dxFingerZaz.downChar: 'template' parameter should not be null or empty")
    }
    let data = toEndianHexExtended(bufferNum, 2) + template
    log.info("template.length:", toEndianHexExtended(data.length / 2, 2))
    send({prefix: 0x55AA, cmd: 0x4300, data: toEndianHexExtended(data.length / 2, 2)})
    let resp = receive({prefix: 0xAA55, cmd: 0x4300})
    if(resp && resp.ret == 0x00){
        send({prefix: 0x5AA5, cmd: 0x4300, data: data})
        resp = receive({prefix: 0xA55A, cmd: 0x4300})
        if(resp && resp.ret == 0x00){
            return true
        } else {
            log.error("dxFingerZaz.downChar:", resp)
            return false
        }
    } else {
        log.error("dxFingerZaz.downChar:", resp)
        return false
    }
}


/** 
 * 获取指纹模块设备信息
 * @returns {string} 返回设备信息，返回false表示获取失败
 */
dxFingerZaz.getEnrolledIdList = function () {
    send({prefix: 0x55AA, cmd: 0x4900, data: ""})
    let resp = receive({prefix: 0xAA55, cmd: 0x4900})
    if(resp && resp.ret == 0x00){
        resp = receive({prefix: 0xA55A, cmd: 0x4900, len: fromEndianHexExtended(resp.data, 2)})
        if(resp && resp.ret == 0x00){
            return resp.data
        } else {
            log.error("dxFingerZaz.getDeviceInfo:", resp)
            return false
        }
    } else {
        log.error("dxFingerZaz.getDeviceInfo:", resp)
        return false
    }
}


/**
 * 搜索指纹模板
 * @param {number} bufferNum - 指纹模板编号（0-2）
 * @param {number} startId - 搜索起始编号
 * @param {number} endId - 搜索结束编号
 * @returns {number} 返回搜索到的指纹编号，返回false表示搜索失败
 */
dxFingerZaz.search = function (bufferNum, startId, endId) {
    if(bufferNum === undefined || bufferNum === null || bufferNum < 0 || bufferNum > 2){
        throw new Error("dxFingerZaz.search: 'bufferNum' parameter should be between 0 and 3")
    }
    if(startId === undefined || startId === null || startId < 1 || startId > options.total){
        throw new Error("dxFingerZaz.search: 'startId' parameter should be between 1 and " + options.total)
    }
    if(endId === undefined || endId === null || endId < 1 || endId > options.total){
        throw new Error("dxFingerZaz.search: 'endId' parameter should be between 1 and " + options.total)
    }

    let data = toEndianHexExtended(bufferNum, 2) + toEndianHexExtended(startId, 2) + toEndianHexExtended(endId, 2)
    send({prefix: 0x55AA, cmd: 0x6300, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x6300})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data.slice(0, 2), 2)
    } else {
        log.error("dxFingerZaz.search:", resp)
        return false
    }
}


/**
 * 获取指纹模块参数
 * @param {number} paramType - 参数类型（0-4）[0: 设备Id, 1: 安全等级, 2: 重复检查, 3: 波特率, 4: 自动学习]
 * @returns {number} 返回参数值，返回false表示获取失败
 * 
 * 设备Id：[1-255]
 * 安全等级：[1-5]
 * 重复校验：[0/1]
 * 波特率：[1:9600, 2:19200, 3:38400, 4:57600, 5:115200, 6:230400, 7:460800, 8:921600]
 * 自动学习：[0/1]
 */
dxFingerZaz.getParam = function (paramType) {
    if(paramType === undefined || paramType === null || paramType < 0 || paramType > 4){
        throw new Error("dxFingerZaz.getParam: 'paramType' parameter should be between 0 and 4")
    }

    let data = toEndianHexExtended(paramType, 2) 
    send({prefix: 0x55AA, cmd: 0x0300, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x0300})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data, 4)
    } else {
        log.error("dxFingerZaz.getParam:", resp)
        return false
    }
}


/**
 * 设置指纹模块参数
 * @param {number} paramType - 参数类型（0-4）[0: 设备Id, 1: 安全等级, 2: 重复检查, 3: 波特率, 4: 自动学习]
 * @param {number} paramValue - 参数值
 * @returns {boolean} 返回true表示设置成功，返回false表示设置失败
 * 
 * 设备Id：[1-255]
 * 安全等级：[1-5]
 * 重复校验：[0/1]
 * 波特率：[1:9600, 2:19200, 3:38400, 4:57600, 5:115200, 6:230400, 7:460800, 8:921600]
 * 自动学习：[0/1]
 */
dxFingerZaz.setParam = function (paramType, paramValue) {
    if(paramType === undefined || paramType === null || paramType < 0 || paramType > 4){
        throw new Error("dxFingerZaz.setParam: 'paramType' parameter should be between 0 and 4")
    }
    if(paramValue === undefined || paramValue === null || paramValue < 0 || paramValue > 255){
        throw new Error("dxFingerZaz.setParam: 'paramValue' parameter should be between 0 and 255")
    }

    let data = toEndianHexExtended(paramType, 1) + toEndianHexExtended(paramValue, 4)
    send({prefix: 0x55AA, cmd: 0x0200, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x0200})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.setParam:", resp)
        return false
    }
}


/** 
 * 获取指纹模块设备信息
 * @returns {string} 返回设备信息，返回false表示获取失败
 */
dxFingerZaz.getDeviceInfo = function () {
    send({prefix: 0x55AA, cmd: 0x0400, data: ""})
    let resp = receive({prefix: 0xAA55, cmd: 0x0400})
    if(resp && resp.ret == 0x00){
        resp = receive({prefix: 0xA55A, cmd: 0x0400, len: fromEndianHexExtended(resp.data, 2)})
        if(resp && resp.ret == 0x00){
            return dxCommon.utf8HexToStr(dxCommon.uint8ArrayToHexString(resp.data.slice(0, resp.length - 3)))
        } else {
            log.error("dxFingerZaz.getDeviceInfo:", resp)
            return false
        }
    } else {
        log.error("dxFingerZaz.getDeviceInfo:", resp)
        return false
    }
}


/**
 * 指纹检测
 * @returns {number} 返回1:有指纹输入，0:无指纹输入，返回false表示检测失败
 */
dxFingerZaz.fingerDetect = function () {
    send({prefix: 0x55AA, cmd: 0x2100, data: ""})
    let resp = receive({prefix: 0xAA55, cmd: 0x2100})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data, 1)
    } else {
        log.error("dxFingerZaz.fingerDetect:", resp)
        return false
    }
}


/**
 * 删除指纹模板
 * @param {number} startId - 删除起始编号
 * @param {number} endId - 删除结束编号
 * @returns {boolean} 返回true表示删除成功，返回false表示删除失败
 */
dxFingerZaz.delChar = function (startId, endId) {
    if(startId === undefined || startId === null || startId < 1 || startId > options.total){
        throw new Error("dxFingerZaz.delChar: 'startId' parameter should be between 1 and " + options.total)
    }
    if(endId === undefined || endId === null || endId < 1 || endId > options.total){
        throw new Error("dxFingerZaz.delChar: 'endId' parameter should be between 1 and " + options.total)
    }

    let data = toEndianHexExtended(startId, 2) + toEndianHexExtended(endId, 2)
    send({prefix: 0x55AA, cmd: 0x4400, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4400})
    if(resp && resp.ret == 0x00){
        return true
    } else {
        log.error("dxFingerZaz.delChar:", resp)
        return false
    }
}


/**
 * 获取指定编号范围内已注册的指纹总数
 * @param {number} startId - 起始编号
 * @param {number} endId - 结束编号
 * @returns {number} 返回指定编号范围内已注册的指纹总数，返回false表示获取失败
 */
dxFingerZaz.getEnrollCount = function (startId, endId) {
    if(startId === undefined || startId === null || startId < 1 || startId > options.total){
        throw new Error("dxFingerZaz.getEnrollCount: 'startId' parameter should be between 1 and " + options.total)
    }
    if(endId === undefined || endId === null || endId < 1 || endId > options.total){
        throw new Error("dxFingerZaz.getEnrollCount: 'endId' parameter should be between 1 and " + options.total)
    }

    let data = toEndianHexExtended(startId, 2) + toEndianHexExtended(endId, 2)
    send({prefix: 0x55AA, cmd: 0x4800, data: data})
    let resp = receive({prefix: 0xAA55, cmd: 0x4800})
    if(resp && resp.ret == 0x00){
        return fromEndianHexExtended(resp.data, 2)
    } else {
        log.error("dxFingerZaz.getEnrollCount:", resp)
        return false
    }
}



/**
 * 初始化指纹模块
 * @param {Object} params 
 * @param {string} params.type - 串口类型（默认 3）
 * @param {string} params.path - 串口路径（默认 '/dev/ttySLB1'）
 * @param {number} params.baudrate - 波特率（默认 '115200-8-N-1'）
 * @param {number} params.id - id（默认 'fingerUart'）
 * @param {number} params.total - 指纹总数（默认 5000）
 * @param {number} params.timeout - 超时时间（默认 500）
 */
dxFingerZaz.init = function (params) {
    options.id = params.id ? params.id : options.id
    options.timeout = params.timeout ? params.timeout : options.timeout
    options.total = params.total ? params.total : options.total
    options.type = params.type ? params.type : options.type
    options.path = params.path ? params.path : options.path
    options.baudrate = params.baudrate ? params.baudrate : options.baudrate

    dxUart.open(options.type, options.path, options.id)
    dxUart.ioctl(6, options.baudrate, options.id)
}



/**
 * 将数字转换为指定字节数的十六进制字符串
 * @param {number} number - 要转换的数字
 * @param {number} bytes - 字节数（默认2字节）
 * @param {boolean} isLittleEndian - 是否小端序（默认true）
 * @returns {string} 转换后的十六进制字符串
 */
function toEndianHexExtended(number, bytes, isLittleEndian = true) {
    // 计算所需的十六进制位数（每个字节占2位）
    const hexLength = bytes * 2;
    let hexStr = number.toString(16).padStart(hexLength, '0');
    
    // 分割为字节数组
    const bytesArray = [];
    for (let i = 0; i < hexLength; i += 2) {
        bytesArray.push(hexStr.substr(i, 2));
    }
    
    // 根据字节序反转数组
    if (isLittleEndian) bytesArray.reverse();
    
    return bytesArray.join('');
}

/**
 * 将字节数组转换为数字（支持大小端序）
 * @param {Uint8Array|number[]} bytesArray - 字节数组（如 Uint8Array 或普通数组）
 * @param {number} bytes - 字节数（必须与实际数据长度一致）
 * @param {boolean} isLittleEndian - 是否小端序（默认true）
 * @returns {number} 转换后的数字
 */
function fromEndianHexExtended(bytesArray, bytes, isLittleEndian = true) {
    // 参数校验
    if (!bytesArray || bytesArray.length !== bytes) {
        throw new Error(`Invalid bytes array. Expected length: ${bytes}`);
    }

    // 处理小端序：反转字节顺序
    const adjustedBytes = isLittleEndian 
        ? Array.from(bytesArray).reverse() 
        : Array.from(bytesArray);

    // 转换为十六进制字符串
    const hexStr = adjustedBytes
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

    // 转换为数字（支持大整数）
    return parseInt(hexStr, 16);
}



/**
 * 发送数据
 * @param {Object} params 
 * @param {number} params.prefix 
 * @param {number} params.cmd 
 * @param {string} params.data 
 */
function send(params) { 
    if (!params || typeof params !== 'object') {
        throw new Error("Parameters should be an object containing prefix, cmd and data");
    }

    const { prefix, cmd, data } = params;
    const sid = 0x00;   // 默认源地址 0x00
    const did = 0x00;   // 默认目标地址 0x00

    const hexParts = data.match(/[\da-f]{2}/gi) || [];

    const bytes = new Uint8Array(hexParts.map(h => parseInt(h, 16)));

    let dataBytes
    if (prefix === 0x55AA) {
        dataBytes = new Uint8Array(16);
        dataBytes.set(bytes.subarray(0, 16), 0);

    } else if (prefix === 0x5AA5) { 
        dataBytes = new Uint8Array(500);
        dataBytes.set(bytes.subarray(0, 500), 0);
    }

    // 构造基础数据包
    const packet = new Uint8Array(8 + dataBytes.length + 2); // 包头(8) + 数据 + 校验(2)
    const view = new DataView(packet.buffer);

    // 填充包头
    view.setUint16(0, prefix, false);      // 大端序 PREFIX (2 bytes)
    packet[2] = sid;                       // SID (1 byte)
    packet[3] = did;                       // DID (1 byte)
    view.setUint16(4, cmd, false);         // 大端序 CMD (2 bytes)
    view.setUint16(6, hexParts.length, true); // 大端序 LEN (2 bytes)

    // 填充数据
    packet.set(dataBytes, 8);

    // 计算校验和
    let checksum = 0;
    for (let i = 0; i < 8 + dataBytes.length; i++) {
        checksum += packet[i];
    }
    checksum &= 0xFFFF; // 取低 16 位

    // 填充校验和（大端序）
    packet[8 + dataBytes.length] = checksum & 0xFF;
    packet[8 + dataBytes.length + 1] = (checksum >> 8) & 0xFF;

    // // TODO 临时日志打印 start
    // let str = ''
    // for (let i = 0; i < packet.length; i++) {
    //     str += packet[i].toString(16).padStart(2, '0') + ' '
    // }
    // log.info("send:", str)
    // // TODO 临时日志打印 end

    // 发送数据
    let ret = dxUart.send(packet.buffer, options.id);
    if(!ret){
        throw new Error("fingerZazUart.send fail")
    }
}



/**
 * 接收数据
 * @param {Object} params 
 * @param {number} params.prefix 
 * @param {number} params.cmd 
 * @param {number} params.len
 * @returns {Object} 返回数据
 */
function receive(params) {
    // 重试5次, 避免读取太快模组未响应
    for(let i = 0; i < 5; i++){    
        const prefix1 = dxUart.receive(1, options.timeout, options.id);
        if (!prefix1 || (prefix1[0] !== 0xAA && prefix1[0] !== 0xA5)) {
            std.sleep(50)
            continue
        }

        const prefix2 = dxUart.receive(1, options.timeout, options.id);
        if (!prefix2 || (prefix2[0] !== 0x55 && prefix2[0] !== 0x5A)) {
            std.sleep(50)
            continue
        }

        // 定义通用字段
        let prefix, sid, did, cmd, len, ret, data, checksum;
        
        prefix = (prefix1[0] << 8) | prefix2[0];

        const value1 = dxUart.receive(6, options.timeout, options.id);
        sid = value1[0];
        did = value1[1];
        cmd = (value1[2] << 8) | value1[3];
        len = (value1[5] << 8) | value1[4];
        
        let value2 = dxUart.receive(len, options.timeout, options.id)
        if(value2 && value2.length === len){
            ret = value2[1] << 8 | value2[0];
            data = value2.subarray(2, len)
        } else {
            throw new Error("fingerZazUart.receive fail: data length mismatch")
        }

        
        let value3
        if(prefix1[0] === 0xAA && prefix2[0] === 0x55){
            // 校验字在最后
            value3 = dxUart.receive((26 - 2 - 8 - len + 2), options.timeout, options.id)
            checksum = value3[value3.length - 2] | (value3[value3.length - 1] << 8);
        } else {
            // 校验字在前面
            value3 = dxUart.receive(2, options.timeout, options.id)
            checksum = value3[0] | (value3[1] << 8);
        }

        
        // 计算校验和（从prefix到data）
        let sum = prefix1[0];
        sum += prefix2[0];
        for (let i=0; i < value1.length; i++) sum += value1[i];
        for (let i=0; i < value2.length; i++) sum += value2[i];
        if ((sum & 0xFFFF) !== checksum) throw "Response Packet Checksum mismatch";

        // // TODO 临时日志打印 start
        // let str = prefix1[0].toString(16).padStart(2, '0') + ' ' + prefix2[0].toString(16).padStart(2, '0') + ' '
        // for (let i = 0; i < value1.length; i++) str += value1[i].toString(16).padStart(2, '0') + ' '
        // for (let i = 0; i < value2.length; i++) str += value2[i].toString(16).padStart(2, '0') + ' '
        // for (let i = 0; i < value3.length; i++) str += value3[i].toString(16).padStart(2, '0') + ' '
        // log.info("receive:", str)
        // // TODO 临时日志打印 end

        if (params.prefix == prefix && params.cmd == cmd) {
            return {
                prefix: prefix,
                sid,
                did,
                command: cmd,
                length: len,
                ret: ret,
                data: Array.from(data),
                cks: true
            };
        } else {
            throw new Error("fingerZazUart.receive fail:")
        }
    }
}



export default dxFingerZaz;