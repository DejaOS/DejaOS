import * as os from "os";
import dxQueue from '../dxmodules/dxQueue.js'
import net from '../dxmodules/dxNet.js'
import common from '../dxmodules/dxCommon.js'
import bus from '../dxmodules/dxEventBus.js'
const queue = dxQueue.get("log_pipe")
let type = 1 //eth
let dhcp = net.DHCP.DYNAMIC//dhcp
let macAddr = common.getUuid2mac()//mac
let options = {
    type: type,
    dhcp: dhcp,
    macAddr: macAddr
}
bus.on(net.STATUS_CHANGE, function (d) {
    if (d.connected) {
        //net connected and start log
        run()
    }
}, 'main')
net.run(options)

function run() {
    new os.Worker("/app/code/src/log_httpserver.js")//new a worker to run the http server
    os.sleep(1000)
    const queue = dxQueue.get("log_pipe")
    let count = 0
    while (true) {
        os.sleep(200)
        // Simulate the operation of writing logs to the pipeline
        count++
        logcat("log_producer0 number: ", count)
        logcat("log_producer1 string: ", 'hello')
        logcat("log_producer2 : object", { a: 1, b: 2, c: count })
        logcat("log_producer3 array: ", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        logcat("log_producer4 error: ", new Error("test error"))
        logcat("log_producer5 undefined: ", undefined)
        logcat("log_producer6 null: ", null)
    }
}
function logcat(...messages) {
    let message = messages.map(msg => getContent(msg)).join(' ');
    let content = `[${getTime()}]: ${message}`
    print("logcat: ", content)
    if (queue.size() < 1000) {
        queue.push(content)
    }
}
function getContent(message) {
    if (message === undefined) {
        return 'undefined'
    } else if (message === null) {
        return 'null'
    }
    if ((typeof message) == 'object') {
        if (Object.prototype.toString.call(message) === '[object Error]') {
            return message.message + '\n' + message.stack
        }
        return JSON.stringify(message)
    }
    return message
}
function getTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);
    const milliseconds = ('0' + now.getMilliseconds()).slice(-3);
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
}