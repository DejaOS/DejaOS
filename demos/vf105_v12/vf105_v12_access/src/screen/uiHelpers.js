import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'
import driver from '../driver.js'
import config from '../../dxmodules/dxConfig.js'
import viewUtils from '../view/viewUtils.js'
import dxMap from '../../dxmodules/dxMap.js'
import common from '../../dxmodules/dxCommon.js'
import sqliteService from '../service/sqliteService.js'
import { getCurrentLanguage } from '../common/utils/i18n.js'

// Face tracking boxes
function faceTrackingBox(screen) {
  let emptyDataCounter = 0
  let isHideLuminance = true
  std.setInterval(() => {
    let data = driver.face.getTrackingBox()
    const hideLuminance = () => {
      if (emptyDataCounter >= 10 && !isHideLuminance) {
        driver.pwm.luminanceWhite(0)
        driver.pwm.luminanceNir(0)
        emptyDataCounter = 0
        isHideLuminance = true
      }
    }
    const showLuminance = () => {
      if (isHideLuminance) {
        driver.pwm.luminanceWhite(config.get("base.luminanceWhite"))
        driver.pwm.luminanceNir(config.get("base.luminanceNir"))
        isHideLuminance = false
      }
    }
    try {
      emptyDataCounter++
      if (data) {
        data = JSON.parse(data)
        // Up to 10 faces
        if (data.type == "track" && data.faces.length <= 10) {
          emptyDataCounter = 0
          showLuminance()
          for (let i = 0; i < data.faces.length; i++) {
            let item = data.faces[i]
            screen.trackUpdate({ w: item.rect_render[2] - item.rect_render[0], h: item.rect_render[3] - item.rect_render[1], x: item.rect_render[0], y: item.rect_render[1] }, item.id, item.is_living)
          }
        } else {
          hideLuminance()
        }
      } else {
        hideLuminance()
      }
    } catch (error) {
      log.info('screen.faceTrackingBox:', data);
      log.error("screen.faceTrackingBox:", error)
    }
  }, 110)
}

let changedClickPoint
let lastClickPoint = { x: 0, y: 0 }
let clickPoint
// Get touch coordinates in real time
function getClickPoint() {
  const indev = NativeObject.APP.NativeComponents.NativeIndev
  std.setInterval(() => {
    clickPoint = {
      x: Math.abs(800 - indev.lvIndevGetPointVg().x),
      y: indev.lvIndevGetPointVg().y
    }

    if (lastClickPoint.x != clickPoint.x || lastClickPoint.y != clickPoint.y) {
      changedClickPoint = clickPoint
    } else {
      changedClickPoint = null
    }

    lastClickPoint = clickPoint
  }, 5)
}

function hidePinyin(pinyin) {
  let showPoint
  const hideMethod = pinyin.hide
  const showMethod = pinyin.show
  // Mutex lock
  let lock = false
  pinyin.hide = function (isForce) {
    if (isForce) {
      hideMethod.call(pinyin)
      lock = false
      return
    }
    if (lock) {
      return
    }
    lock = true
    hideMethod.call(pinyin)
    lock = false
  }
  pinyin.show = function (...args) {
    if (lock) {
      return
    }
    lock = true
    showMethod.call(pinyin, ...args)
    showPoint = clickPoint
    lock = false
  }
  std.setInterval(() => {
    if (showPoint && (Math.abs(showPoint.x - clickPoint.x) > 5 && Math.abs(showPoint.y - clickPoint.y) > 5)) {
      if (clickPoint.y < (1280 - (pinyin.getMode() == 1 ? 400 + 70 : 400))) {
        let defocus = dxMap.get("INPUT_KEYBOARD").get("defocus")
        if (defocus == "defocus") {
          dxMap.get("INPUT_KEYBOARD").del("defocus")
          showPoint = null
          pinyin.hide()
        }
      }
    }
  }, 5)
}

/**
 * 
 * @param {object} data Coordinate info
 * @param {number} id face_id, used to associate recognized name
 * @param {bool} isLiving Liveness flag
 */
function trackUpdate(data, id, isLiving, mainView) {
  let item = mainView.trackFaces[0]
  for (let i = 0; i < 10; i++) {
    let ele = mainView.trackFaces[i]
    if (ele.face_id == id) {
      item = ele
      break
    }
  }
  item.face_id = id

  if (item && item.timer) {
    std.clearTimeout(item.timer)
    item.timer = null
  }

  item.timer = std.setTimeout(() => {
    item.trackFace.hide()
    // item.trackFaceName.hide()
    if (item.timer) {
      std.clearTimeout(item.timer)
      item.timer = null
    }
  }, 300)

  let edge = data.w > data.h ? data.w : data.h
  let offset = Math.abs(data.w - data.h) / 2

  item.trackFace.show()

  item.trackFace.setSize(edge, edge)
  item.trackFace.radius(edge / 2)
  if (data.w > data.h) {
    item.trackFace.setPos(data.x, data.y - offset)
  } else {
    item.trackFace.setPos(data.x - offset, data.y)
  }

  item.trackFaceName.text(" ")

  if (item.result && item.result.result === true && item.result.id == id) {
    item.trackFace.setBorderColor(viewUtils.color.success)
    let user = sqliteService.d1_person.findByUserId(item.result.userId)[0]
    item.trackFaceName.text(user ? user.name : "")
  } else if (item.result && item.result.result === false && item.result.id == id) {
    item.trackFace.setBorderColor(viewUtils.color.fail)
  } else if (isLiving) {
    item.trackFace.setBorderColor(0xf3e139)
  } else {
    item.trackFace.setBorderColor(0xffffff)
  }
}

// Authentication result
function trackResult(data, mainView) {
  for (let i = 0; i < 10; i++) {
    let ele = mainView.trackFaces[i]
    if (ele.face_id == data.id) {
      ele.result = data
      return
    }
  }
}

function hideSn(bool, mainView) {
  if (bool) {
    mainView.bottomSnBtn.show()
  } else {
    mainView.bottomSnBtn.hide()

  }
}

function hideIp(bool, mainView) {
  if (bool) {
    mainView.ipLbl.show()
  } else {
    mainView.ipLbl.hide()
  }
}

function hideBottomBox(bool, mainView) {
  if (bool) {
    mainView.bottomBox.hide()
  } else {
    mainView.bottomBox.show()
  }
}

// Switch app mode
function appMode(mode, mainView, deviceInfoView, config) {
  if (mode == 0) {
    // Switch to Standard
    mainView.menuBtnBox.show()
    if (config.get("base.showProgramCode") == 1) {
      mainView.appBtnBox.show()
      deviceInfoView.sysInfo[3].obj.show()
    } else {
      mainView.appBtnBox.hide()
      deviceInfoView.sysInfo[3].obj.hide()
    }
    if (config.get("sys.pwd") == 1) {
      mainView.pwdBtnBox.show()
    } else {
      mainView.pwdBtnBox.hide()
    }
    mainView.miniBkgBox.hide()
  } else if (mode == 1) {
    // Switch to Simple mode
    mainView.miniBkgBox.show()
    if (config.get("base.showProgramCode") == 1) {
      mainView.minAppBtnImg.show()
      deviceInfoView.sysInfo[3].obj.show()
    } else {
      mainView.minAppBtnImg.hide()
      deviceInfoView.sysInfo[3].obj.hide()
    }
    if (config.get("sys.pwd") == 1) {
      mainView.minPwdBtnImg.show()
    } else {
      mainView.minPwdBtnImg.hide()
    }
    mainView.menuBtnBox.hide()
  }
}

// Access result (success/fail)
function accessRes(bool, mainView) {
  if (bool) {
    mainView.statusPanel.success()
  } else {
    mainView.statusPanel.fail()
  }
}

// Start face registration
function beginAddFace(data, screen, faceEnterView) {
  log.info('screen.beginAddFace', JSON.stringify(data));

  if (!data.fileName) {
    return screen.faceEnterResult()
  }

  driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/recognition_s.wav`)
  faceEnterView.statusPanel.success("faceEnterView.recogSuccess")
  // Save image locally
  let src = `/app/data/user/register.jpg`
  common.systemBrief(`mv ${data.fileName} ${src}`)
  common.systemBrief(`rm -rf /app/data/user/temp/*`)

  screen.faceEnterResult(src)
}

function upgrade(data, viewUtils) {
  const { title, content } = data
  viewUtils.confirmOpen(title, content)
}

let setTimeout
function cardReset(msg, driver) {
  if (msg.type == 2 && msg.status == 3) {
    setTimeout = std.setTimeout(() => {
      driver.net.cardReset()
    }, 30 * 1000);
  } else {
    if (setTimeout) {
      std.clearTimeout(setTimeout)
    }
  }
}

export {
  faceTrackingBox,
  getClickPoint,
  hidePinyin,
  trackUpdate,
  trackResult,
  hideSn,
  hideIp,
  hideBottomBox,
  appMode,
  accessRes,
  beginAddFace,
  upgrade,
  cardReset
}

