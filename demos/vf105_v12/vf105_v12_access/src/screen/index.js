import dxUi from '../../dxmodules/dxUi.js'
import dxMap from '../../dxmodules/dxMap.js'
import viewUtils from '../view/viewUtils.js'
import i18n from '../view/i18n.js'
import pinyin from '../view/pinyin/pinyin.js'
import mainView from '../view/mainView.js'
import idleView from '../view/idleView.js'
import topView from '../view/topView.js'
import appView from '../view/appView.js'
import pwdView from '../view/pwdView.js'
import newPwdView from '../view/config/newPwdView.js'
import identityVerificationView from '../view/config/identityVerificationView.js'
import configView from '../view/config/configView.js'
import cloudCertView from '../view/config/menu/cloudCertView.js'
import doorControlView from '../view/config/menu/doorControlView.js'
import helpView from '../view/config/menu/helpView.js'
import networkSettingView from '../view/config/menu/networkSettingView.js'
import systemSettingView from '../view/config/menu/systemSettingView.js'
import deviceInfoView from '../view/config/menu/deviceInfoView.js'
import factoryTestView from '../view/config/menu/factoryTestView.js'
import localUserView from '../view/config/menu/localUserView.js'
import recordQueryView from '../view/config/menu/recordQueryView.js'
import voiceBroadcastView from '../view/config/menu/voiceBroadcastView.js'
import localUserAddView from '../view/config/menu/localUser/localUserAddView.js'
import faceEnterView from '../view/config/menu/localUser/faceEnterView.js'
import displaySettingView from '../view/config/menu/systemSetting/displaySettingView.js'
import faceRecognitionSettingView from '../view/config/menu/systemSetting/faceRecognitionSettingView.js'
import swipeCardRecognitionSettingView from '../view/config/menu/systemSetting/swipeCardRecognitionSettingView.js'
import passLogSettingView from '../view/config/menu/systemSetting/passLogSettingView.js'
import passwordOpenDoorSettingView from '../view/config/menu/systemSetting/passwordOpenDoorSettingView.js'
import passwordManagementView from '../view/config/menu/systemSetting/passwordManagementView.js'
import timeSettingView from '../view/config/menu/systemSetting/timeSettingView.js'
import systemInfoView from '../view/config/menu/deviceInfo/systemInfoView.js'
import dataCapacityInfoView from '../view/config/menu/deviceInfo/dataCapacityInfoView.js'
import recordQueryDetailView from '../view/config/menu/recordQuery/recordQueryDetailView.js'
import { getCurrentLanguage } from '../common/utils/i18n.js'

// Import managers
import { idleTimerStart, screenManagerRefresh, enterIdle, exitIdle, hideIdle } from './idleManager.js'
import { deleteUser, updateUser, insertUser, getVoucher, getUsers, getPassRecord } from './userManager.js'
import * as faceManager from './faceManager.js'
import * as configManager from './configManager.js'
import * as networkManager from './networkManager.js'
import * as uiHelpers from './uiHelpers.js'
import busEvents from './busEvents.js'

const screen = {}

screen.screenSize = {
  width: 800,
  height: 1280
}

// UI context
const context = {}

// Initialization method, called in main.js, only allowed once
screen.init = function () {
  const loadMethod = dxUi.loadMain
  dxUi.loadMain = function (view) {
    if (screen.screenNow && screen.screenNow.id == view.id) {
      return
    }
    screen.screenNow = view
    pinyin.hide(true)
    loadMethod.call(dxUi, view)
  }

  dxUi.init({ orientation: 0 }, context);
  // Initialize all components
  pinyin.init(800, 400)

  viewUtils.confirmInit()

  mainView.init()
  idleView.init()
  topView.init()
  appView.init()
  pwdView.init()
  newPwdView.init()
  identityVerificationView.init()
  configView.init()

  cloudCertView.init()
  doorControlView.init()
  helpView.init()
  networkSettingView.init()
  systemSettingView.init()
  deviceInfoView.init()
  factoryTestView.init()
  localUserView.init()
  recordQueryView.init()
  voiceBroadcastView.init()

  localUserAddView.init()
  faceEnterView.init()

  displaySettingView.init()
  faceRecognitionSettingView.init()
  swipeCardRecognitionSettingView.init()
  passLogSettingView.init()
  passwordOpenDoorSettingView.init()
  passwordManagementView.init()
  timeSettingView.init()

  systemInfoView.init()
  dataCapacityInfoView.init()
  recordQueryDetailView.init()

  // Set language
  i18n.setLanguage(getCurrentLanguage())

  dxUi.loadMain(mainView.screenMain)

  // Start screensaver timers
  idleTimerStart(screen, idleView, mainView, topView, viewUtils)

  // Bus events
  busEvents(screen, mainView, topView, networkSettingView)

  // Get touch coordinates in real time
  uiHelpers.getClickPoint()

  // Hide keyboard
  uiHelpers.hidePinyin(pinyin)

  // Face tracking boxes
  uiHelpers.faceTrackingBox(screen)
}

screen.loop = function () {
  return dxUi.handler()
}

// Idle management
screen.enterIdle = function () {
  enterIdle(screen, idleView, mainView, topView, viewUtils)
}

screen.exitIdle = function (isSelf) {
  exitIdle(isSelf)
  hideIdle(idleView)
}

screen.screenManagerRefresh = function () {
  screenManagerRefresh()
}

// User management
screen.deleteUser = deleteUser
screen.updateUser = updateUser
screen.insertUser = insertUser
screen.getVoucher = getVoucher
screen.getUsers = getUsers
screen.getPassRecord = getPassRecord

// Face management
screen.faceEnterStart = faceManager.faceEnterStart
screen.faceEnterEnd = faceManager.faceEnterEnd
screen.getCardStart = faceManager.getCardStart
screen.endCardEnd = faceManager.endCardEnd
screen.faceRecgStart = faceManager.faceRecgStart
screen.faceRecgPause = faceManager.faceRecgPause
screen.faceEnterResult = function (facePic) {
  faceManager.faceEnterResult(facePic, faceEnterView, localUserAddView)
}
screen.faceAuthStart = faceManager.faceAuthStart
screen.faceAuthEnd = faceManager.faceAuthEnd
screen.faceAuthResult = function (bool) {
  faceManager.faceAuthResult(bool, configView, identityVerificationView)
}

// Config management
screen.nfcIdentityCardActivation = configManager.nfcIdentityCardActivation
screen.saveConfig = configManager.saveConfig
screen.getConfig = configManager.getConfig
screen.pwdAccess = configManager.pwdAccess

// Network management
screen.switchNetworkType = networkManager.switchNetworkType
screen.netGetWifiSsidList = networkManager.netGetWifiSsidList
screen.netWifiSsidList = function (data) {
  networkManager.netWifiSsidList(data, networkSettingView, screen)
}
screen.netConnectWifiSsid = networkManager.netConnectWifiSsid
screen.getCard = function (card) {
  networkManager.getCard(card, localUserAddView)
}

// UI helpers
screen.trackUpdate = function (data, id, isLiving) {
  uiHelpers.trackUpdate(data, id, isLiving, mainView)
}
screen.trackResult = function (data) {
  uiHelpers.trackResult(data, mainView)
}
screen.hideSn = function (bool) {
  uiHelpers.hideSn(bool, mainView)
}
screen.hideIp = function (bool) {
  uiHelpers.hideIp(bool, mainView)
}
screen.hideBottomBox = function (bool) {
  uiHelpers.hideBottomBox(bool, mainView)
}
screen.appMode = function (mode) {
  uiHelpers.appMode(mode, mainView, deviceInfoView, configManager.getConfig())
}
screen.accessRes = function (bool) {
  uiHelpers.accessRes(bool, mainView)
}
screen.beginAddFace = function (data) {
  uiHelpers.beginAddFace(data, screen, faceEnterView)
}
screen.upgrade = function (data) {
  uiHelpers.upgrade(data, viewUtils)
}
screen.cardReset = uiHelpers.cardReset
screen.changeLanguage = function () {
  i18n.setLanguage(screen.getConfig()['base.language'])
}

export default screen

