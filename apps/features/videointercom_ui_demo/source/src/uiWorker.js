import dxUi from '../dxmodules/dxUi.js'
import dxStd from '../dxmodules/dxStd.js'
import log from '../dxmodules/dxLogger.js'
import dxDriver from '../dxmodules/dxDriver.js'

import UIManager from './UIManager.js'
import mainPage from './view/mainView.js'
import callPage from './view/callView.js'
import pinPage from './view/pinView.js'
import connectionPage from './view/connectionView.js'

try {
  // UI 初始化：保持与现有 screen.js 一致
  dxUi.init({ orientation: dxDriver.DISPLAY.ROTATION }, {})

  // 初始化 UIManager 并注册页面
  UIManager.init()
  UIManager.register('main', mainPage)
  UIManager.register('call', callPage)
  UIManager.register('pin', pinPage)
  UIManager.register('connection', connectionPage)

  // 打开首页
  UIManager.open('main')

  // UI 事件循环
  dxStd.setInterval(() => {
    dxUi.handler()
  }, 20)
} catch (e) {
  log.error(e)
}


