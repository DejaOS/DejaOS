import dxMap from '../../dxmodules/dxMap.js'
import std from '../../dxmodules/dxStd.js'
import utils from '../common/utils/utils.js'

const syncDriver = {
    // Tiny async-to-sync helper
    request: function (topic, timeout) {
        let map = dxMap.get("SYNC")
        let count = 0
        let data = map.get(topic)
        while (utils.isEmpty(data) && count * 10 < timeout) {
            data = map.get(topic)
            std.sleep(10)
            count += 1
        }
        let res = map.get(topic)
        map.del(topic)
        return res
    },
    response: function (topic, data) {
        let map = dxMap.get("SYNC")
        map.put(topic, data)
    }
}

export default syncDriver

