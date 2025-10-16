import dxUi from '../../dxmodules/dxUi.js'
import viewUtils from "./viewUtils.js"
import appView from './appView.js'
import topView from './topView.js'
import pwdView from './pwdView.js'
import newPwdView from './config/newPwdView.js'
import screen from '../screen.js'
import logger from '../../dxmodules/dxLogger.js'

const mainView = {}
mainView.init = function () {
  /************************************************** Create Screen *****************************************************/
  const screenMain = dxUi.View.build('mainView', dxUi.Utils.LAYER.MAIN)
  mainView.screenMain = screenMain
  screenMain.scroll(false)
  screenMain.bgOpa(0)

  screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
    topView.changeTheme(false)

    screen.faceRecgStart()
    let config = screen.getConfig()
    snLbl.text("SN:" + config["sys.sn"])
    logger.info("IP:" + config["net.ip"])
    if (config["net.ip"] && config["net.ip"] != "") {
      ipLbl.text("IP:" + config["net.ip"])
    } else {
      ipLbl.text(" ")
    }
    dxUi.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, snLbl.text())
    let showSn = config["base.showSn"]
    let showIp = config["base.showIp"]
    screen.hideSn(showSn == 1)
    screen.hideIp(showIp == 1)
    screen.hideBottomBox(showSn == 0 && showIp == 0)

    // screen.trackUpdate()
    screen.appMode(screen.getConfig()["base.appMode"])
  })

  screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
    screen.faceRecgPause()
  })

  mainView.trackFaces = []
  for (let i = 0; i < 10; i++) {
    let item = {}
    const trackFace = dxUi.View.build('trackFace' + i, screenMain)
    item.trackFace = trackFace
    viewUtils._clearStyle(trackFace)
    trackFace.setSize(200, 200)
    trackFace.borderWidth(5)
    trackFace.setBorderColor('#C0A069')
    trackFace.bgOpa(0)
    trackFace.hide()

    const trackFaceName = dxUi.Label.build('trackFaceName' + i, trackFace)
    item.trackFaceName = trackFaceName
    // trackFaceName.textFont(viewUtils.font(30))
    // trackFaceName.textColor('#C0A069')
    trackFaceName.text(" ")
    trackFaceName.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 0)
    // trackFaceName.hide()


    mainView.trackFaces.push(item)
  }

  // const trackFace = dxui.View.build('trackFace', screenMain)
  // mainView.trackFace = trackFace
  // viewUtils._clearStyle(trackFace)
  // trackFace.setSize(200, 200)
  // trackFace.borderWidth(5)
  // trackFace.bgOpa(0)
  // trackFace.hide()

  // const trackFaceName = dxui.Label.build('trackFaceName', trackFace)
  // mainView.trackFaceName = trackFaceName
  // trackFaceName.textFont(viewUtils.font(30))
  // trackFaceName.textColor(0xffffff)
  // trackFaceName.text(" ")
  // trackFaceName.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

  const bottomBox = dxUi.Image.build('bottomBox', screenMain)
  mainView.bottomBox = bottomBox
  bottomBox.source('/app/code/resource/image/rectangle.png')
  bottomBox.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 0)
  const bottomSnBtn = dxUi.Button.build('bottomSnBtn', bottomBox)
  mainView.bottomSnBtn = bottomSnBtn
  bottomSnBtn.bgColor(0xffffff)
  bottomSnBtn.bgOpa(20)
  bottomSnBtn.setSize(204, 36)
  bottomSnBtn.shadow(0, 0, 0, 0, 0xffffff, 100)
  bottomSnBtn.align(dxUi.Utils.ALIGN.BOTTOM_LEFT, 13, -18)
  bottomSnBtn.on(dxUi.Utils.EVENT.CLICK, () => {
    showSnQrcode.show()
  })
  bottomSnBtn.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
  bottomSnBtn.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)
  bottomSnBtn.obj.lvObjSetStylePadGap(5, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

  const bottomQrcode = dxUi.Image.build('bottomQrcode', bottomSnBtn)
  bottomQrcode.source('/app/code/resource/image/qrcode_small.png')

  const snLbl = dxUi.Label.build('snLbl', bottomSnBtn)
  snLbl.text("SN:")
  snLbl.textFont(viewUtils.font(15))
  snLbl.textColor(0xffffff)
  snLbl.width(156)
  snLbl.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

  const ipLbl = dxUi.Label.build('ipLbl', bottomBox)
  mainView.ipLbl = ipLbl
  // ipLbl.text("IP:")
  ipLbl.textFont(viewUtils.font(15))
    ipLbl.textColor(0xffffff)
    ipLbl.align(dxUi.Utils.ALIGN.BOTTOM_RIGHT, -20, -16)

    // Menu button
    const menuBtnBox = dxUi.View.build('menuBtnBox', screenMain)
  mainView.menuBtnBox = menuBtnBox
  viewUtils._clearStyle(menuBtnBox)
  menuBtnBox.setSize(750, 180)
  menuBtnBox.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -100)
  menuBtnBox.bgOpa(0)
    menuBtnBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
    menuBtnBox.flexAlign(dxUi.Utils.FLEX_ALIGN.SPACE_AROUND, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)
    /****************************************** App and Standard UI ******************************************/
    // Config button
    const configBtnBox = viewUtils.imageBtn(menuBtnBox, 'configBtnBox', '/app/code/resource/image/menu_btn.png')
  mainView.configBtnBox = configBtnBox
  configBtnBox.on(dxUi.Utils.EVENT.CLICK, () => {
    dxUi.loadMain(newPwdView.screenMain)
  })
  const configLbl = dxUi.Label.build('configLbl', configBtnBox)

  configLbl.text("Settings")
  configLbl.dataI18n = 'mainView.config'
  configLbl.textFont(viewUtils.font(18))
  configLbl.textColor(0xffffff)
  configLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 40)
    const configBtnImg = dxUi.Image.build('configBtnImg', configBtnBox)
    configBtnImg.source('/app/code/resource/image/config_btn.png')
    configBtnImg.align(dxUi.Utils.ALIGN.CENTER, 0, -10)
    // Password button
    const pwdBtnBox = viewUtils.imageBtn(menuBtnBox, 'pwdBtnBox', '/app/code/resource/image/menu_btn.png')
  mainView.pwdBtnBox = pwdBtnBox
  pwdBtnBox.on(dxUi.Utils.EVENT.CLICK, () => {
    let passwordAccess = screen.getConfig()["sys.pwd"]
    if (!passwordAccess) {
      return mainView.statusPanel.fail("mainView.passwordDisabled")
    }
    dxUi.loadMain(pwdView.screenMain)
  })
  const pwdLbl = dxUi.Label.build('pwdLbl', pwdBtnBox)
  pwdLbl.text("Password")
  pwdLbl.dataI18n = 'mainView.pwd'
  pwdLbl.textFont(viewUtils.font(18))
  pwdLbl.textColor(0xffffff)
  pwdLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 40)
    const pwdBtnImg = dxUi.Image.build('pwdBtnImg', pwdBtnBox)
    pwdBtnImg.source('/app/code/resource/image/pwd_btn.png')
    pwdBtnImg.align(dxUi.Utils.ALIGN.CENTER, 0, -10)
    // Mini program code button
    const appBtnBox = viewUtils.imageBtn(menuBtnBox, 'appBtnBox', '/app/code/resource/image/menu_btn.png')
  mainView.appBtnBox = appBtnBox
  appBtnBox.on(dxUi.Utils.EVENT.CLICK, () => {
    dxUi.loadMain(appView.screenMain)
  })
  const appLbl = dxUi.Label.build('appLbl', appBtnBox)
  appLbl.text("Mini Program Code")
  appLbl.dataI18n = 'mainView.app'
  appLbl.textFont(viewUtils.font(18))
  appLbl.textColor(0xffffff)
  appLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 40)
  const appBtnImg = dxUi.Image.build('appBtnImg', appBtnBox)
  appBtnImg.source('/app/code/resource/image/app_btn.png')
  appBtnImg.align(dxUi.Utils.ALIGN.CENTER, 0, -10)

  // QR code
  const showSnQrcode = dxUi.View.build('showSnQrcode', screenMain)
  showSnQrcode.moveForeground()
  showSnQrcode.setSize(screen.screenSize.width, 880)
  showSnQrcode.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 40)
  showSnQrcode.bgColor(0xffffff)
  showSnQrcode.bgOpa(50)

  showSnQrcode.radius(40)
  showSnQrcode.hide()

  const closeSnQrcodeBox = dxUi.View.build('closeSnQrcodeBox', showSnQrcode)
  closeSnQrcodeBox.setSize(60, 60)
  viewUtils._clearStyle(closeSnQrcodeBox)
  closeSnQrcodeBox.align(dxUi.Utils.ALIGN.TOP_RIGHT, 0, 0)
  closeSnQrcodeBox.bgOpa(0)
  closeSnQrcodeBox.on(dxUi.Utils.EVENT.CLICK, () => {
    showSnQrcode.hide()
  })
  const closeSnQrcode = dxUi.Image.build('closeSnQrcode', closeSnQrcodeBox)
  closeSnQrcode.source('/app/code/resource/image/close.png')

  const qrcode = dxUi.View.build(showSnQrcode.id + 'qrcode', showSnQrcode)
  viewUtils._clearStyle(qrcode)
  qrcode.setSize(520, 520)
  qrcode.align(dxUi.Utils.ALIGN.CENTER, 0, 0);
  const qrcodeObj = dxUi.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 520, 0x000000, 0xffffff)
  dxUi.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, snLbl.text())
  /****************************************** Minimal UI ******************************************/
  const miniBkgBox = dxUi.Image.build('miniBkgBox', screenMain)
  miniBkgBox.moveBackground()
  mainView.miniBkgBox = miniBkgBox
  viewUtils._clearStyle(miniBkgBox)
  miniBkgBox.setSize(120, 320)
  miniBkgBox.source('/app/code/resource/image/mini_background.png')
  miniBkgBox.hide()
  miniBkgBox.bgOpa(0)
  miniBkgBox.align(dxUi.Utils.ALIGN.CENTER, 280, 0)
  miniBkgBox.flexFlow(dxUi.Utils.FLEX_FLOW.COLUMN)
  miniBkgBox.flexAlign(dxUi.Utils.FLEX_ALIGN.SPACE_AROUND, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)
  const minConfigBtnImg = viewUtils.imageBtn(miniBkgBox, 'minConfigBtnImg', '/app/code/resource/image/mini_config.png')
  mainView.minConfigBtnImg = minConfigBtnImg
  minConfigBtnImg.setSize(60, 60)
  minConfigBtnImg.on(dxUi.Utils.EVENT.CLICK, () => {
    dxUi.loadMain(newPwdView.screenMain)
  })

  const minPwdBtnImg = viewUtils.imageBtn(miniBkgBox, 'minPwdBtnImg', '/app/code/resource/image/mini_password.png')
  mainView.minPwdBtnImg = minPwdBtnImg
  minPwdBtnImg.setSize(60, 60)
  minPwdBtnImg.on(dxUi.Utils.EVENT.CLICK, () => {
    let passwordAccess = screen.getConfig()["sys.pwd"]
    if (!passwordAccess) {
      return mainView.statusPanel.fail("mainView.passwordDisabled")
    }
    dxUi.loadMain(pwdView.screenMain)
  })


  const minAppBtnImg = viewUtils.imageBtn(miniBkgBox, 'minAppBtnImg', '/app/code/resource/image/mini_app.png')
  mainView.minAppBtnImg = minAppBtnImg
  minAppBtnImg.setSize(60, 60)
  minAppBtnImg.on(dxUi.Utils.EVENT.CLICK, () => {
    dxUi.loadMain(appView.screenMain)
  })

  mainView.statusPanel = viewUtils.statusPanel(screenMain, 'mainView.success', 'mainView.fail')

}

export default mainView
