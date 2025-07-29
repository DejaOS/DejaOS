/**
 * @description 针对物模型属性相关的操作,初始化属性列表后，然后可以根据get和set方法来读写属性值
 * get会优先从内存获取，如果没有则获取默认值，set会先修改内存，然后保存到data下的property.json
 * For things model property operations, after initializing the property list, 
 * use 'get' and 'set' methods to read and write values. 
 * 'get' from memory or returns the default value if not found. set updates memory and saves to 'property.json' under '/app/data/config/'.
 * @author buter
 */

import dxMap from './dxMap.js'
import common from './dxCommon.js'
import logger from './dxLogger.js'
import std from './dxStd.js'

const property = {}
const map = dxMap.get('property')
const savePath = '/app/data/config/property.json'
property.all = map.get('all') || {}

/**
 * 初始化只需要一次，初始化所有物模型的属性及属性的默认值，如下示例：
 * Initialization is required only once. init all things model properties and their default values, data sample as shown below:
 * {
 *  "ui.showver":1,
 *  "sys.version":"version1.0.0"
 * }
 * @param {string} file 所有属性及属性的初始默认值所在的json文件路径 json file which include all propertied and its default value
 * @returns 
 */
property.init = function (file) {
    if (map.get('___inited')) { // 只初始化一次
        return
    }
    let all = std.parseExtJSON(std.loadFile('/app/code/' + file))
    all['sys.uuid'] = common.getUuid()
    property.all = all
    map.put('all', all)
    if (!std.exist(savePath)) {
        std.saveFile(savePath, '{}')
    }
    let content = std.parseExtJSON(std.loadFile(savePath))
    for (let [key, value] of Object.entries(content)) {
        map.put(key, value)
    }
    map.put('___inited', 'ok')
}

/**
 * 根据groupid和id来获取属性值，也可以获取一组属性
 * Get the property value based on groupid and id, or get a group of properties. 
 * @param {string} groupId 属性组id，必填 The property group id, required.
 * @param {string} id 属性id，不必填，如果不填则返回属性组下所有属性 The property id, optional. If not provided, all properties under the group will be returned.
 * @returns 返回一个对象，key是'groupid.id',value是对应的属性值 Returns an object which the key is 'groupid.id' and the value is the corresponding property value.
 * */
property.getValues = function (groupId, id) {
    if (!groupId) {
        throw new Error("property.getValues: 'groupId' should not be empty")
    }
    let res = {}
    if (!id) {
        let keys = Object.keys(property.all).filter(k => k.startsWith(groupId + '.'))//先取默认值
        keys.forEach(k => {
            res[k] = property.all[k];
        })
        keys = map.keys().filter(k => k.startsWith('property.' + groupId + '.'))//再用实际值覆盖
        keys.forEach(k => {
            res[k.slice(9)] = map.get(k)
        })
    } else {
        const key = groupId + '.' + id
        res[key] = property.get(key)
    }
    return res
}
/**
 * 根据'groupid.id'获取对应的属性值  get the corresponding property value based on 'groupid.id'
 * @param {string} key 'groupid.id'
 * @returns 
 */
property.get = function (key) {
    if (map.keys().includes('property.' + key)) {
        return map.get('property.' + key)
    }
    return property.all[key]
}
/**
 * 设置一个或多个属性值 set one or more property values.
 * @param {object} properties {groupId.id:value} 格式，支持一次设置多个属性 The properties in the format {groupId.id: value}, supporting setting multiple properties at once.
 */
property.setValues = function (properties) {
    if (!properties || typeof properties !== 'object') {
        throw new Error("property.setValues: 'properties' should not be empty and must be an object")
    }
    const keys = Object.keys(properties)
    if (keys.length <= 0) {
        return
    }
    keys.forEach(key => {
        map.put('property.' + key, properties[key])
    })
    save()
}
/**
 * key/value方式设置一个属性的值 set a property value with key/value
 * @param {string} key 'groupid.id'
 * @param {string} value  属性值 property value
 */
property.set = function (key, value) {
    if (!key) {
        throw new Error("property.set: 'key' should not be empty")
    }
    map.put('property.' + key, value)
    save()
}
/**
 * 恢复出厂设置，把所有属性恢复为默认值
 * Restore factory settings, resetting all properties to their default values.
 */
property.reset = function () {
    common.systemBrief('rm -rf ' + savePath)
}

function save() {
    let configInfo = {}
    let keys = map.keys().filter(k => k.startsWith('property.'))
    keys.forEach(k => {
        let val = map.get(k)
        configInfo[k] = val
    })
    std.saveFile(savePath, JSON.stringify(configInfo))
}

export default property
