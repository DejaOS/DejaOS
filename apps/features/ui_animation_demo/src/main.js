import log from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'
import UIManager from './UIManager.js'
import page1 from './pages/page1.js'
import page2 from './pages/page2.js'
import page3 from './pages/page3.js'

(function () {
    const context = {}

    dxui.init({ orientation: 1 }, context);

    UIManager.init()
    UIManager.register('page1', page1)
    UIManager.register('page2', page2)
    UIManager.register('page3', page3)

    UIManager.open('page1')

    const order = ['page1', 'page2', 'page3']
    let idx = 0
    // open next page every 10 seconds
    std.setTimeout(() => {
        std.setInterval(() => {
            idx = (idx + 1) % order.length
            UIManager.open(order[idx])
        }, 10000, true)
    }, 10000)
})();

std.setInterval(() => {
    dxui.handler()
}, 5)
