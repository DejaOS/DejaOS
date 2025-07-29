/**
 * @description 事件处理的队列，要处理的事件数据存储到队列里，再由其它线程从队列里获取数据异步处理，数据包括topic和data，相同topic的数据不会同时处理
 * The data processing queue stores event data, and other threads fetch the data from the queue for asynchronous processing. 
 * Each data item includes a topic and data. Data with the same topic will not be processed simultaneously.
 * 
 * @author xianglong
 */
import dxQueue from '../dxmodules/dxQueue.js'
import dxMap from '../dxmodules/dxMap.js'
import log from '../dxmodules/dxLogger.js'

const center = {}
// 获取服务线程队列，队列内容是形如{ topic: topic, data: data }的JSON字符串
// Get the service thread queue. The queue contains JSON strings in the form { topic: topic, data: data }
const queue = dxQueue.get("__SERVICE_THREAD_QUEUE");
// map中key为事件类型，即topic，value是"Y"  The map's key is the event type, i.e., topic, and the value is "Y"
const map = dxMap.get("__SERVICE_THREAD_MAP");

/**
 * 向队列添加事件 Add an event to the queue
 * @param {*} topic 事件类型，用于标记事件，防止线程同时执行一种类型事件 Event type, i.e., to prevent threads from executing the same type of event simultaneously.
 * @param {*} data 事件数据  Event data
 */
center.push = function (topic, data) {
    queue.push(JSON.stringify({ topic: topic, data: data }))
}

/**
 * 从队列取出事件，同类型（topic）事件同步处理，非同类型事件异步处理
 * Remove an event from the queue. Events of the same type (topic) are processed synchronously, while events of different types are processed asynchronously.
 * @returns event
 */
center.pop = function () {
    try {
        let raw = queue.pop()
        if (raw === null || raw === undefined) {
            return
        }
        let rawJson = JSON.parse(raw)
        if (map.get(rawJson.topic) == "Y") {
            // 如果取出的事件正在别的服务线程中运行，则再push回队列 If the event taken out is currently running in another service thread, push it back to the queue.
            queue.push(raw)
            return
        } else {
            map.put(rawJson.topic, "Y")
            return rawJson
        }
    } catch (error) {
        log.error(error)
    }
    return
}

/**
 * 事件完成需要通知queueCenter，使得同类型事件下次可以继续执行 Notify queueCenter when an event is finished so that events of the same type can be executed next time.
 * @param {string} topic 
 */
center.finish = function (topic) {
    map.del(topic)
}

center.log = function () {
    log.info("Tasks currently running:", map.keys())
    log.info("Number of tasks in the queue yet to be executed:", queue.size())
}

export default center
