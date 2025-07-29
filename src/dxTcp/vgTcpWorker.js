//build:20240716
//用于简化tcp组件微光通信协议的使用，封装在这个worker里，使用者只需要订阅EventBus的事件就可以监听tcp数据
import log from './dxLogger.js'
import tcp from './dxTcp.js'
import common from './dxCommon.js'
import std from './dxStd.js'
import dxMap from './dxMap.js'
import net from './dxNet.js'
import * as os from "os"
const map = dxMap.get('default')
const id = "{{id}}"
const options = map.get("__vgtcp__run_init" + id)
const timeout = 100
const longTimeout = 500
let connected = false

function run() {
    tcp.create(options.ip, options.port, options.timeout, options.heartEn, options.heartTime, options.id)
    log.info('vg tcp start......,id =', id)
    os.sleep(1000)
    std.setInterval(() => {
        try {
            if (tcp.isConnect(options.id) && net.getStatus().connected) {
                if (!connected) {
                    _fireChange(true)
                }
            } else {
                if (connected) {
                    _fireChange(false)
                }
                os.sleep(1000)
            }
        } catch (error) {
            log.error(error)
        }
    }, 3000)
    std.setInterval(() => {
        if (connected) {
            // 接收数据模式
            if (options.passThrough) {
                // 透传模式
                passThrough()
            } else {
                // 微光通信协议模式
                receive()
            }
        }
    }, 10)
}

// 透传模式
function passThrough() {
    let pack = [];
    let buffer = readOne()
    while (buffer !== null) {
        pack.push(buffer)
        os.sleep(10)
        buffer = readOne()
    }
    if (pack.length !== 0) {
        __bus.fire(tcp.VG.RECEIVE_MSG + options.id, pack)
    }
}

function receive() {
    //前2个字节必须是55aa
    let buffer = readOne()
    if (buffer === null) {
        return;
    }
    if (buffer == 85) {//0x55
        buffer = readOne()
        if (buffer != 170) {//0xaa
            return;
        }
    } else {
        return;
    }
    let pack = {};
    // 读取命令字（占用1Byte）
    buffer = readOne()
    if (buffer === null) {
        return;
    }
    pack.cmd = buffer
    if (options.result) {
        // 读取结果字（占用1Byte）
        buffer = readOne()
        if (buffer === null) {
            return;
        }
        pack.result = buffer;
    } else {
        pack.result = 0//0不影响bcc的计算结果
    }
    // 命令头已解析完，读取长度字（占用2Byte）
    let len1 = readOne()
    if (len1 === null) {
        return;
    }
    let len2 = readOne()
    if (len2 === null) {
        return;
    }
    // 解析长度字，获取数据域长度
    let len = len1 + len2 * 256
    // 根据长度字读取指定数据长度
    pack.length = len
    if (len > 0) {
        buffer = tcp.receive(len, longTimeout, options.id)
        if (buffer === null) {
            return;
        }
        pack.data = Array.from(buffer);
    } else {
        pack.data = 0
    }
    // 读取1Byte的校验位
    buffer = readOne()
    if (buffer === null) {
        return;
    }
    let bcc = valid(pack, buffer)
    let res = { cmd: int2hex(pack.cmd), length: pack.length, bcc: bcc }
    if (pack.length > 0) {
        res.data = common.arrToHex(pack.data)
    }
    if (options.result) {
        res.result = int2hex(pack.result)
    }
    __bus.fire(tcp.VG.RECEIVE_MSG + options.id, res)
}
function valid(pack, bcc) {
    let temp = common.calculateBcc([0x55, 0xaa, pack.cmd, pack.result, pack.length % 256, Math.floor(pack.length / 256)].concat(pack.data))
    return temp === bcc
}
function readOne() {
    let buffer = tcp.receive(1, timeout, options.id)
    if (buffer) {
        return parseInt(buffer);
    }
    return null
}
function int2hex(num) {
    return num.toString(16).padStart(2, '0')
}
function _fireChange(status) {
    __bus.fire(tcp.VG.CONNECTED_CHANGED + options.id, status ? 'connected' : 'disconnected')//bus.newworker的时候会import eventbus as __bus
    connected = status
}
run()