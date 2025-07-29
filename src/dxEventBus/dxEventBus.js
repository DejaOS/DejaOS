//build:20240628
//事件总线，利用quickjs的worker间数据通信来实现线程之间发送事件通知。
//worker和worker之间不能直接通信，需要通过parent(主线程)来转发，所以需要实现5种可能性的事件通知
//1. worker1--->parent--->worker2
//2. worker3--->parent
//3. parent--->worker4
//4. parent<-->parent 
//5. worker5<--->worker5,也会通过parent转
//组件依赖 dxLogger,dxCommon
import std from './dxStd.js'
import logger from './dxLogger.js'
import * as os from "os";
//-------------------------variable--------------------
const bus = {}
const all = {}
const subs = {}
const isMain = (os.Worker.parent === undefined)
bus.id = isMain ? '__main' : null
/**
 * 在总线上启动一个worker，给它定义一个唯一的id标识
 * 因为worker只能通过主线程创建，所以newWorker函数也只能在主线程里执行
 * 注意: worker对应的文件里不能包含while(true)这种死循环，否则就收不到message，可以用setInteval来实现循环
 * @param {string} id worker的唯一标识，不能为空
 * @param {object} file worker对应的文件名，绝对路径，通常以'/app/code/src'开始
 */
bus.newWorker = function (id, file) {
    if (!id) {
        throw new Error("eventbus newWorker:'id' should not be empty")
    } if (!file) {
        throw new Error("eventbus newWorker:'file' should not be empty")
    }
    if (!isMain) {
        throw new Error("evnetbus newWorker should be invoke in main thread")
    }
    if (!std.exist(file)) {
        throw new Error("eventbus newWorker: file not found:" + file)
    }
    let content = std.loadFile(file) + `
import __bus from '/app/code/dxmodules/dxEventBus.js'
__bus.id='${id}'
Object.keys(__bus.handlers).forEach(key => {
    __bus.os.Worker.parent.postMessage({ __sub: key, id: __bus.id })
})
__bus.os.Worker.parent.onmessage = function (e) {
    if(!e.data){
        return
    }
    e = e.data
    if (!e || !e.topic) {
        return
    }
    let fun = __bus.handlers[e.topic]
    if (fun) {
        fun(e.data)
    }
}
    `
    let newfile = file + '_' + id + '.js'
    std.saveFile(newfile, content)
    let worker = new os.Worker(newfile)
    all[id] = worker
    worker.onmessage = function (data) {
        if (data.data) {
            if (data.data.__sub) {
                sub(data.data.__sub, data.data.id)
                return
            }
            //worker发送过来的数据再调用一次主线程的fire，要么主线程自己消费，要么转发到其它worker
            bus.fire(data.data.topic, data.data.data)
        }
    }
}
/**
 * 根据id删除对应的worker，这样worker线程就能正常结束
 * @param {string} id 
 */
bus.delWorker = function (id) {
    delete all[id]
}
/**
 * 触发一个事件，这个事件会立刻发送结束，接收到消息的处理如果比较耗时不会影响事件发送的顺序或出现事件丢失
 * 同样一个事件可以有多个订阅者，可以同时通知多个订阅者，同一个topic单位时间内只处理一个事件，
 * 只有当前topic被所有的订阅者处理完之后才允许处理同一topic下一个事件
 * 
 * @param {string} topic 事件的标识、主题 
 * @param {*} data 事件附带的数据
 */
bus.fire = function (topic, data) {
    if (!topic || (typeof topic) != 'string') {
        throw new Error("eventbus :'topic' should not be null");
    }
    if (isMain) {
        if (subs[topic] && subs[topic].length > 0) {
            for (let i = 0; i < subs[topic].length; i++) {
                const id = subs[topic][i]
                if (id === '__main' && bus.handlers[topic]) {
                    bus.handlers[topic](data)
                } else {
                    const worker = all[id]
                    if (worker) {
                        worker.postMessage({ topic: topic, data: data })
                    }
                }
            }
        }
    } else {
        os.Worker.parent.postMessage({ topic: topic, data: data })
    }
}


bus.handlers = {}
/**
 * 订阅一个事件
 * @param {string} topic 事件的标识、主题 ，必填
 * @param {function} callback 事件处理的回调函数，必填
 */
bus.on = function (topic, callback) {
    if (!topic || (typeof topic) != 'string') {
        throw new Error("The 'topic' should not be null");
    }
    if (!callback || (typeof callback) != 'function') {
        throw new Error("The 'callback' should be a function");
    }
    sub(topic, bus.id)
    this.handlers[topic] = callback
}
function sub(topic, id) {
    if (isMain) {
        if (!subs[topic]) {
            subs[topic] = []
        }
        if (!subs[topic].includes(id)) {
            subs[topic].push(id)
        }
    } else {
        if (id != null) {
            os.Worker.parent.postMessage({ __sub: topic, id: id })
        }
    }
}
bus.os = os
export default bus
