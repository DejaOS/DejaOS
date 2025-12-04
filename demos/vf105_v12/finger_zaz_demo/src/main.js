import std from '../dxmodules/dxStd.js'
import screen from './screen.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import pool from '../dxmodules/dxWorkerPool.js'

let topics = ["merge"]

run()

function run() {
    driver.fingerZaz.init()
    screen.init()
    pool.init('/app/code/src/services.js', bus, topics, 2, 100)
}

std.setInterval(() => {
    screen.loop()
}, 5)




