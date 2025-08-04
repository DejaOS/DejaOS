/**
 * Key Value DB Demo
 * 1. Key Value DB can be used to store and get key/value data
 * 2. Key Value DB can be used to replace sqlite in some scenarios, it's lighter
 */
import log from '../dxmodules/dxLogger.js'
import db from '../dxmodules/dxKeyValueDB.js'
import std from '../dxmodules/dxStd.js'

try {
    //init should be called in main thread and only once
    //init is async, it will return immediately 
    db.init()
    std.setTimeout(() => setandget(), 500)
} catch (e) {
    log.error(e);
}
function setandget() {
    //set and get all can be called in any thread
    db.set('user:id1', { name: 'user1', age: 10 })
    db.set('user:id2', "user2")
    db.set('user:id3', 34)
    db.set('user:id4', 34.5)

    db.set('device:id1', { name: 'device1', sn: '1234567890' })
    db.set('device:id2', { name: 'device2', sn: '1234567891' })
    db.set('device:id3', { name: 'device3', sn: '1234567892' })
    db.del('device:id2')

    db.set('record:data', [{ timesstamp: 1, value: 10 }, { timesstamp: 2, value: 20 }, { timesstamp: 3, value: 30 }])
    //set is async, it will return immediately and the value will be set in the 5+ ms
    std.setTimeout(() => {
        log.info('user1: ', db.get('user:id1'))//user1:  {"name":"user1","age":10}
        log.info('user2: ', db.get('user:id2'))//user2:  user2
        log.info('user3: ', db.get('user:id3'))//user3:  34
        log.info('user4: ', db.get('user:id4'))//user4:  34.5

        log.info('device2: ', db.get('device:id2'))// device2:  undefined

        log.info('device3: ', db.get('device:id3'))//device3:  {"name":"device3","sn":"1234567892"}

        log.info('record: ', db.get('record:data'))//record:  [{"timesstamp":1,"value":10},{"timesstamp":2,"value":20},{"timesstamp":3,"value":30}]
        //list all keys
        let keys = db.keys()
        log.info('all keys: ', keys)//all keys:  ["device:id1","device:id3","record:data","user:id1","user:id2","user:id3"]
        //list keys with prefix 'user:'
        keys = db.keys(1, 10, 'user:')
        log.info('user keys: ', keys)//user keys:  ["user:id1","user:id2","user:id3"]
    }, 10)
}
