//build: 20240716
//TCP Client
//依赖组件:dxStd,dxLogger,dxMap,dxEventBus,dxCommon,dxUart,dxNet
import { tcpClientClass } from './libvbar-m-dxtcp.so'
import std from './dxStd.js'
import * as os from "os"
import dxMap from './dxMap.js'
import dxCommon from './dxCommon.js'
import bus from './dxEventBus.js'
const map = dxMap.get("default")
const tcpObj = new tcpClientClass();
const tcp = {}

/**
 * 创建客户端连接
 * @param {string} ip 服务端ip 必填
 * @param {string} port 服务端端口 必填
 * @param {number} timeout 超时，缺省是5000
 * @param {number} heartEn 心跳（1开启，0关闭）缺省是1
 * @param {number} heartTime 心跳间隔/s，缺省是60秒
 * @param {string} id 句柄id，非必填（若创建多个实例需要传入唯一id）
 */
tcp.create = function (ip, port, timeout = 5000, heartEn = 1, heartTime = 1, id) {
    if (!ip) {
        throw new Error("create:ip should not be null or empty")
    }
    if (!port) {
        throw new Error("create:port should not be null or empty")
    }
    let pointer = tcpObj.tcpClientCreate(1, ip, port, timeout, heartEn, heartTime)
    if (!pointer) {
        throw new Error("tcp.create: create failed")
    }
    dxCommon.handleId("tcp", id, pointer)

}
/**
 * 接收数据 返回Uint8Array
 * @param {number} len 数据长度,必填
 * @param {number} timeout_ms 超时时间,必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns array数据
 */
tcp.receive = function (len, timeout_ms, id) {
    if (!len) {
        throw new Error("receive:len should not be null or empty")
    }
    if (!timeout_ms) {
        throw new Error("receive:timeout_ms should not be null or empty")
    }
    let pointer = dxCommon.handleId("tcp", id)
    let res = tcpObj.tcpClientRecv(pointer, len, timeout_ms)
    if (res == null) {
        return null
    }
    return new Uint8Array(res)
}

/**
 * 发送数据
 * @param {string} data 发送内容（字符串）,必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.send = function (data, id) {
    if (!data) {
        throw new Error("data should not be null or empty")
    }
    let pointer = dxCommon.handleId("tcp", id)
    return tcpObj.tcpClientSend(pointer, data)
}

/**
 * 发送数据，使用微光通信协议格式
 * @param {string} data 发送内容（字符串）,必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.sendVg = function (data, id) {
    if (typeof data === 'string') {
        return tcp.sendBuffer(dxCommon.hexStringToArrayBuffer(data), id)
    }
    let pack = '55aa' + data.cmd
    if (data.hasOwnProperty('result')) {
        pack += data.result
    }
    pack += (data.length % 256).toString(16).padStart(2, '0')
    pack += (Math.floor(data.length / 256)).toString(16).padStart(2, '0')
    pack += data.data
    let all = dxCommon.hexToArr(pack)
    let bcc = dxCommon.calculateBcc(all)
    all.push(bcc)
    return tcp.sendBuffer(new Uint8Array(all).buffer, id)
}

/**
 * 发送ArrayBuffer
 * @param {ArrayBuffer} data 发送内容（ArrayBuffer）,必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.sendBuffer = function (data, id) {
    if (!data) {
        throw new Error("data should not be null or empty")
    }
    let pointer = dxCommon.handleId("tcp", id)
    return tcpObj.tcpClientSendBuffer(pointer, data)
}

/**
 * 判断tcp是否连接
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.isConnect = function (id) {
    let pointer = dxCommon.handleId("tcp", id)
    return tcpObj.tcpClientIsConnect(pointer)
}

/**
 * 刷新信道
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.flush = function (id) {
    let pointer = dxCommon.handleId("tcp", id)
    return tcpObj.tcpClientFlush(pointer)
}

/**
 * 销毁
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
tcp.destory = function (id) {
    let pointer = dxCommon.handleId("tcp", id)
    return tcpObj.tcpClientDestory(pointer)
}

tcp.VG = {
    RECEIVE_MSG: '__tcpvg__MsgReceive',
    CONNECTED_CHANGED: '__tcp__Connect_changed',
}
/**
 * 简化微光通信协议的使用，
 * 1. 接受数据：把TLV的二进制的数据接受到后解析成对象，并以eventcenter的event发送出去(tcp.VG.RECEIVE_MSG)
 * 返回的对象格式：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32",bcc:true}
 * cmd: 1个字节的命令字，16进制字符串
 * result:1个字节的标识字，表示数据处理的结果，成功或失败或其他状态。只有反馈数据才有标识字，16进制字符串
 * length：数据的长度，在TLV里用2个字节来定义，这里直接转成10进制的数字
 * data：多个字节的数据域，16进制字符串
 * bcc: bcc校验成功或失败
 * 2. 发送数据：把对象转成TLV格式的二进制数据再发送出去，可以通过tcp.send方法，数据格式如下
 * 发送的数据格式有二种 1.对象格式 ：{cmd:"2a",result:"01",length:7,data:"0a1acc320fee32"} 2. 完整的16进制字符串'55AA09000000F6'
 * 3. 同样的id，多次调用runvg也只会执行一次
 * 
 * @param {object} options 启动的参数
 *          @param {string} options.ip 服务端ip 必填
 *          @param {string} options.port 服务端端口 必填
 *          @param {number} options.timeout 超时，缺省是5000
 *          @param {number} options.heartEn 心跳（1开启，0关闭）缺省是1
 *          @param {number} options.heartTime 心跳间隔/s，缺省是60秒
 *          @param {number} options.result 0和1(缺省是0)，标识是接收的数据还是发送的数据包含标识字节，0表示接受的数据不包括标识字，发送的数据包括，1是反之
 *          @param {number} options.passThrough passThrough为true则接收的数据使用透传模式，非必填
 *          @param {string} options.id  句柄id，非必填（若初始化多个实例需要传入唯一id）
 */
tcp.runvg = function (options) {
    if (options === undefined || options.length === 0) {
        throw new Error("dxtcp.runvg:'options' parameter should not be null or empty")
    }
    if (options.id === undefined || options.id === null || typeof options.id !== 'string') {
        // 句柄id
        options.id = ""
    }
    if (options.ip === undefined || options.ip === null) {
        throw new Error("dxtcp.runvg:'ip' should not be null or empty")
    }
    if (options.port === undefined || options.port === null) {
        throw new Error("dxtcp.runvg:'port' should not be null or empty")
    }
    let oldfilepre = '/app/code/dxmodules/vgTcpWorker'
    let content = std.loadFile(oldfilepre + '.js').replace("{{id}}", options.id)
    let newfile = oldfilepre + options.id + '.js'
    std.saveFile(newfile, content)
    let init = map.get("__vgtcp__run_init" + options.id)
    if (!init) {//确保只初始化一次
        map.put("__vgtcp__run_init" + options.id, options)
        bus.newWorker(options.id || "__vgtcp", newfile)
    }
}
/**
 * 获取当前tcp连接的状态
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 'connected' 或者 'disconnected'
 */
tcp.getConnected = function (id) {
    if (id == undefined || id == null) {
        id = ""
    }
    return tcp.isConnect(id) ? "connected" : "disconnected"
}
export default tcp;