import dxMap from '../../dxmodules/dxMap.js'
import dxUi from '../../dxmodules/dxUi.js'
import driver from '../driver.js'
import { getCurrentLanguage } from '../common/utils/i18n.js'

// Face enrollment start (UI control)
function faceEnterStart(userId) {
  dxMap.get("UI").put("faceEnterStart", userId)
  driver.face.status(1)
  driver.face.mode(1)
}

// Face enrollment end (UI control)
function faceEnterEnd() {
  dxMap.get("UI").del("faceEnterStart")
  driver.face.status(0)
  // driver.face.mode(0)
}

// Get card number (UI control)
function getCardStart() {
  dxMap.get("UI").put("getCardStart", true)
}

// End get card number (UI control)
function endCardEnd() {
  dxMap.get("UI").del("getCardStart")
}

// Start face recognition
function faceRecgStart() {
  driver.face.status(1)
  driver.face.mode(0)
}

// Pause face recognition
function faceRecgPause() {
  driver.face.status(0)
}

// Face enrollment result
function faceEnterResult(facePic, faceEnterView, localUserAddView) {
  if (facePic) {
    faceEnterView.successFlag = true
    // Success: show face photo
    localUserAddView.addFace(facePic)
    dxUi.loadMain(localUserAddView.screenMain)
    faceEnterView.backCb()
  } else {
    // Failure: show error
    faceEnterView.timeout()
  }
}

// Face auth start on non-recognition pages (UI control)
function faceAuthStart() {
  dxMap.get("UI").put("faceAuthStart", "Y")
  driver.face.status(1)
  driver.face.mode(0)
}

// Face auth end on non-recognition pages (UI control)
function faceAuthEnd() {
  dxMap.get("UI").del("faceAuthStart")
  driver.face.status(0)
}

// Face auth result on non-recognition pages
function faceAuthResult(bool, configView, identityVerificationView) {
  if (bool) {
    // Success: enter settings menu
    driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/recg_s.wav`)
    dxUi.loadMain(configView.screenMain)
  } else {
    // Failure: show error
    driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/recg_f.wav`)
    identityVerificationView.statusPanel.fail()
  }
}

export {
  faceEnterStart,
  faceEnterEnd,
  getCardStart,
  endCardEnd,
  faceRecgStart,
  faceRecgPause,
  faceEnterResult,
  faceAuthStart,
  faceAuthEnd,
  faceAuthResult
}

