//build:20240717
//线程池，里面加载多个worker，线程池接收任务或事务后然后派发给线程池里面空闲的worker来执行任务，用于解决多事务处理的瓶颈
//设备资源有限，线程数量不宜太多，另外也不考虑多个线程池的情况，全局只一个
//组件依赖 dxLogger,dxCommon，dxStd
import std from './dxStd.js'
import logger from './dxLogger.js'
import * as os from "os";
//-------------------------variable--------------------
const pool = {}
const isMain = (os.Worker.parent === undefined)
let queueSize = 100
const queue = []
const all = {}
pool.os = os
/**
 * 初始化线程池，设置worker个数和缓存队列大小，有可能多个worker都没有空闲，缓存队列可以缓存来不及处理的事务
 * 因为worker只能通过主线程创建，所以init函数也只能在主线程里执行
 * 注意: worker对应的文件里不能包含while(true)这种死循环，可以用setInteval来实现循环
 * @param {string} file worker对应的文件名，必填，绝对路径，通常以'/app/code/src'开始
 * @param {Object} bus EventBus对象 必填
 * @param {Array} topics 要订阅的主题组 必填
 * @param {number} count 线程的个数，非必填，不能小于1，缺省2,
 * @param {number} maxsize 事务缓存的大小，非必填，缺省100，如果超过100，最老的事务被抛弃
 */
pool.init = function (file, bus, topics, count = 2, maxsize = 100) {
    if (!file) {
        throw new Error("pool init:'file' should not be empty")
    }
    if (!bus) {
        throw new Error("pool init:'bus' should not be empty")
    }
    if (!topics) {
        throw new Error("pool init:'topics' should not be empty")
    }
    if (!isMain) {
        throw new Error("pool init should be invoked in main thread")
    }
    if (!std.exist(file)) {
        throw new Error("pool init: file not found:" + file)
    }
    queueSize = maxsize
    if (count <= 1) {
        count = 1
    }
    for (let i = 0; i < count; i++) {
        const id = 'pool__id' + i
        let content = std.loadFile(file) + `
import __pool from '/app/code/dxmodules/dxWorkerPool.js'
__pool.id = '${id}'
const __parent = __pool.os.Worker.parent
__parent.onmessage = function (e) {
    if (!e.data) {
        return
    }
    let fun = __pool.callbackFunc
    if (fun) {
        try {
            fun(e.data)
            __parent.postMessage({ id: __pool.id })//通知处理完了idle
        } catch (err) {
            __parent.postMessage({ id: __pool.id, error: err.stack })//通知处理完了idle,但是失败了    
        }
    }
}
            `
        let newfile = file + '_' + id + '.js'
        std.saveFile(newfile, content)
        let worker = new os.Worker(newfile)
        all[id] = { isIdle: true, worker: worker }
        worker.onmessage = function (data) {
            if (!data.data) {
                return
            }
            const id = data.data.id
            if (id) {//通知处理完成的消息
                all[id].isIdle = true
                if (data.data.error) {
                    logger.error(`worker ${id} callback error:${data.data.error}`)
                }
            } else {
                const topic = data.data.topic
                if (topic) {//bus.fire出来的消息
                    bus.fire(topic, data.data.data)
                }
            }
        }
    }
    for (let topic of topics) {
        bus.on(topic, function (d) {
            push({ topic: topic, data: d })
        })
    }

    std.setInterval(function () {
        Object.keys(all).forEach(key => {
            const obj = all[key]
            if (obj.isIdle) {
                let event = take()
                if (event) {
                    obj.isIdle = false
                    obj.worker.postMessage(event)
                }
            }
        });
    }, 5)
}
/**
 * 返回线程的唯一标识id
 * @returns worker唯一标识
 */
pool.getWorkerId = function () {
    if (isMain) {
        return 'main'
    } else {
        return pool.id
    }
}
/**
 * 订阅EventBus 上的事务主题，可以订阅多个主题,这个函数也只能在主线程里执行
 * @param {Object} bus EventBus对象
 * @param {Array} topics 要订阅的主题组
 */
pool.on = function (bus, topics) {
    if (!bus) {
        throw new Error("pool onEventBus:'bus' should not be empty")
    }
    if (!topics) {
        throw new Error("pool onEventBus:'topics' should not be empty")
    }
    if (!isMain) {
        throw new Error("pool onEventBus should be invoked in main thread")
    }

}

pool.callbackFunc = null
/**
 * worker线程订阅线程池的事件，不用选择特定的主题，线程池关注的所有事件都会处理,
 * 这个函数必须在worker线程里执行，不能在主线程执行
 * @param {function} cb 事件处理的回调函数，必填
 */
pool.callback = function (cb) {
    if (!cb || (typeof cb) != 'function') {
        throw new Error("pool on :The 'callback' should be a function");
    }
    if (isMain) {
        throw new Error("pool on should not be invoked in main thread")
    }
    pool.callbackFunc = cb
}

function push(item) {
    if (queue.length >= queueSize) {
        const first = JSON.stringify(queue[0])
        logger.error(`pool queue is full,removing oldest element: ${first}`)
        queue.shift(); // 移除最老的元素
    }
    queue.push(item);
}

function take() {
    if (queue.length === 0) {
        return null; // 队列为空时返回 null
    }
    return queue.shift(); // 移除并返回最早添加的元素
}
export default pool
