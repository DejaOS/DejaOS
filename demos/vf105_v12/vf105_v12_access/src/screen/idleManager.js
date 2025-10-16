import std from '../../dxmodules/dxStd.js'
import dxMap from '../../dxmodules/dxMap.js'
import config from '../../dxmodules/dxConfig.js'
import dxUi from '../../dxmodules/dxUi.js'
import ScreenManager from './screenManager.js'

let screenManager
let enterIdleTimer

function idleTimerStart(screen, idleView, mainView, topView, viewUtils) {
  // Create instance with callbacks
  screenManager = new ScreenManager({
    onScreenSaverStart: () => {
      screen.enterIdle()
    },
    onScreenSaverEnd: () => {
      screen.exitIdle(true)
    },
    onScreenOff: () => {
      dxMap.get("screenOff").put("status", 1)
      screen.screenNow.hide()
      topView.screenMain.hide()
    },
    onScreenOn: () => {
      screen.exitIdle(true)
      dxMap.get("screenOff").put("status", 0)
      screen.screenNow.show()
      topView.screenMain.show()
    }
  });

  // Configure timings (ms)
  screenManager.configure({
    // screenSaverDelay: 10000,  // Screensaver
    // screenOffDelay: 5000     // Screen off
    screenSaverDelay: config.get("base.screensaver") * 60 * 1000,  // Screensaver
    screenOffDelay: config.get("base.screenOff") * 60 * 1000     // Screen off
  });

  // Detect user touch
  let touchCount = 0
  std.setInterval(() => {
    let count = dxUi.Utils.GG.NativeDisp.lvDispGetInactiveTime()
    if (count < touchCount) {
      screenManager.resetTimers();
    }
    touchCount = count
  }, 100);
}

function screenManagerRefresh() {
  screenManager.configure({
    screenSaverDelay: config.get("base.screensaver") * 60 * 1000,  // Screensaver
    screenOffDelay: config.get("base.screenOff") * 60 * 1000     // Screen off
  });
  screenManager.resetTimers();
}

// Enter screensaver
function enterIdle(screen, idleView, mainView, topView, viewUtils) {
  // Delay 1s to avoid race between enter/exit; if no exit within 1s, enter screensaver
  enterIdleTimer = std.setTimeout(() => {
    if (idleView.screenMain.isHide()) {
      viewUtils.confirmClose()
      dxUi.loadMain(mainView.screenMain)
      idleView.screenMain.show()
      topView.changeTheme(false)
    }
  }, 1000)
}

// Exit screensaver
function exitIdle(isSelf) {
  if (enterIdleTimer) {
    std.clearTimeout(enterIdleTimer)
    enterIdleTimer = null
  }
  if (!isSelf) {
    screenManager.resetTimers();
  }
}

function hideIdle(idleView) {
  if (!idleView.screenMain.isHide()) {
    idleView.screenMain.hide()
  }
}

export { idleTimerStart, screenManagerRefresh, enterIdle, exitIdle, hideIdle, screenManager }

