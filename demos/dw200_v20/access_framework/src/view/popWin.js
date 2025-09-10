import dxui from '../../dxmodules/dxUi.js'
import viewUtil from './viewUtil.js'
const popWin = {}
let screen = null
popWin.init = function (screenRef) {
    screen = screenRef
    /**************************************************create top-level controls*****************************************************/
    let center_background = dxui.View.build('center_background', dxui.Utils.LAYER.TOP)
    popWin.center_background = center_background
    center_background.scroll(false)
    viewUtil.clearStyle(center_background)
    center_background.setSize(480, 320)
    center_background.bgColor(0x000000)
    center_background.bgOpa(50)
    center_background.hide()
    let overwrite = center_background.show
    center_background.show = () => {
        let uiConfig = screen.uiConfig
        if (viewUtil.isVertical(uiConfig.rotation)) {
            // vertical screen
            center_background.setSize(320, 480)
            center_cont.setSize(192, 192)
            center_bottom_view.setSize(192 - 10, 20)
        } else {
            // horizontal screen
            center_background.setSize(480, 320)
            center_cont.setSize(288, 192)
            center_bottom_view.setSize(288 - 10, 20)
        }
        center_cont.update()
        center_label.width(center_cont.width() - 20)
        center_img.alignTo(center_cont, dxui.Utils.ALIGN.OUT_TOP_MID, 0, 60)
        overwrite.call(center_background)

        center_background.update()
        showMsg.width(center_background.width())
        showMsg.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    }
    /**************************************************pop-up window*****************************************************/
    let center_cont = dxui.View.build('center_cont', center_background)
    popWin.center_cont = center_cont
    viewUtil.clearStyle(center_cont)
    center_cont.setSize(288, 192);
    center_cont.radius(25)
    center_cont.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    /**************************************************pop-up label*****************************************************/
    let center_label = viewUtil.buildLabel('center_label', center_cont, 30, "这是一个弹窗--这是一个弹窗--这是一个弹窗--")
    popWin.center_label = center_label
    center_cont.update()
    center_label.width(center_cont.width() - 20)
    center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    center_label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    center_label.textColor(0x46DE8D)
    /**************************************************pop-up top image*****************************************************/
    let center_img = dxui.Image.build('center_img', center_background)
    popWin.center_img = center_img
    center_img.source('/app/code/resource/image/hint_true.png')
    center_img.alignTo(center_cont, dxui.Utils.ALIGN.OUT_TOP_MID, 0, 60);
    /**************************************************pop-up bottom image*****************************************************/
    let center_bottom_view = dxui.View.build('center_bottom_view', center_cont)
    popWin.center_bottom_view = center_bottom_view
    viewUtil.clearStyle(center_bottom_view)
    center_bottom_view.bgColor(0x46DE8D)
    center_bottom_view.radius(10)
    center_bottom_view.setSize(278, 20);
    center_bottom_view.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -20);
    /**************************************************display picture*****************************************************/
    let showPic = dxui.Image.build('showPic', center_background)
    popWin.showPic = showPic
    showPic.source('/app/code/resource/image/pic0.png')
    showPic.hide()
    /**************************************************display text*****************************************************/
    let showMsg = dxui.Label.build('showMsg', center_background)
    popWin.showMsg = showMsg
    let font32 = viewUtil.getFont(32)
    popWin.font32 = font32
    showMsg.textFont(font32)
    showMsg.align(dxui.Utils.ALIGN.CENTER, 0, 70);
    showMsg.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsg.textColor(0xffffff)
    showMsg.hide()
}

let popTimer
// success
popWin.success = function (msg, beep) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/hint_true.png')
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0x46DE8D)
    popWin.center_bottom_view.bgColor(0x46DE8D)

    const time = viewUtil.getScrollTime(msg, popWin.font32, popWin.center_label.width())

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, time)

    if (beep !== false) {
        std.setTimeout(() => {
            screen.success()
        }, 100)
    }
}

// fail
popWin.fail = function (msg, beep) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/hint_false.png')
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0xF35F5F)
    popWin.center_bottom_view.bgColor(0xF35F5F)

    const time = viewUtil.getScrollTime(msg, popWin.font32, popWin.center_label.width())

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, time)
    if (beep !== false) {
        std.setTimeout(() => {
            screen.fail()
        }, 100)
    }
}
// warning
popWin.warning = function (data) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/bell.png')
    popWin.center_label.text(data.msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0xfbbc1a)
    popWin.center_bottom_view.bgColor(0xfbbc1a)

    const time = viewUtil.getScrollTime(data.msg, popWin.font32, popWin.center_label.width())

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, data.timeout ? data.timeout : time)
    if (data.beep !== false) {
        std.setTimeout(() => {
            screen.warning()
        }, 100)
    }
}

// custom pop-up content
popWin.customPopWin = function (msg, time) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.hide()
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0)
    popWin.center_bottom_view.bgColor(0)

    const time1 = viewUtil.getScrollTime(msg, popWin.font32, popWin.center_label.width())

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
        popWin.center_img.show()
        popWin.center_label.text("这是一个弹窗--这是一个弹窗--这是一个弹窗--")
    }, time ? time : time1)
}

// show text and pictures directly
popWin.customShowMsgAndImg = function (msg, msgTimeout, img, imgTimeout) {
    if (msg || img) {
        popWin.center_background.show()
        popWin.center_cont.hide()
        popWin.center_img.hide()
        screen.mainView.date_box.hide()
        screen.mainView.screen_btn_unlocking.hide()
        popWin.center_background.bgOpa(0)
        msgTimeout = msgTimeout ? msgTimeout : 0
        imgTimeout = imgTimeout ? imgTimeout : 0
        std.setTimeout(() => {
            popWin.center_background.hide()
            popWin.center_cont.show()
            popWin.center_img.show()
            screen.mainView.date_box.show()
            screen.mainView.screen_btn_unlocking.show()
            popWin.center_background.bgOpa(50)
        }, msgTimeout > imgTimeout ? msgTimeout : imgTimeout)
    }

    if (msg) {
        popWin.showMsg.text(msg)
        popWin.showMsg.show()
        std.setTimeout(() => {
            popWin.showMsg.hide()
        }, msgTimeout ? msgTimeout : 0)
    }

    if (img) {
        popWin.showPic.source('/app/code/resource/image/' + img + '.png')
        popWin.showPic.show()
        std.setTimeout(() => {
            popWin.showPic.hide()
        }, imgTimeout ? imgTimeout : 0)
    }
}



/**
 * display pop-up window
 * @param {*} param param.flag:true|false success|fail; param.type: type
 * @returns 
 */
popWin.displayResults = function (param) {
    if (!param) {
        return
    }
    let res = "失败"
    // default to chinese unless language is 1
    let isEn = screen.uiConfig.language == 1
    if (isEn) {
        res = param.flag ? "success!" : "fail!"
    } else {
        res = param.flag ? "成功！" : "失败！"
    }
    let msg = ""
    switch (parseInt(param.type)) {
        case 100:
        case 101:
        case 103:
            msg = (isEn ? "qr code verify " : "扫码验证")
            break;
        case 200:
        case 203:
            msg = (isEn ? "card verify " : "刷卡验证")
            break;
        case 400:
            msg = (isEn ? "password verify " : "密码验证")
            break;
        case 500:
            msg = (isEn ? "online verify" : "在线验证")
            break;
        case 600:
            msg = (isEn ? "bluetooth verify " : "蓝牙验证")
            break;
        case 800:
            msg = (isEn ? "open by press button " : "按键开门")
            break;
        case 900:
            msg = (isEn ? "remote open " : "远程开门")
            break;
        default:
            break;
    }
    if (msg === "" && param.type == "disable") {
        msg = isEn ? "Device disabled" : "设备已禁用"
    } else {
        msg += res
    }
    if (param.flag) {
        screen.success(msg)
    } else {
        screen.fail(msg)
    }
}

// display text
// eg:{msg:'',time:1000}
popWin.showPopMsg = function (param) {
    popWin.customPopWin(param.msg, param.time)
}

// display picture
// eg:{time:1000,img:'a'}
popWin.showPopPic = function (param) {
    popWin.customShowMsgAndImg(null, null, param.img, param.time)
}

export default popWin