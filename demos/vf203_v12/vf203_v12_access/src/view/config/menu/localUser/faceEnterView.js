import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import i18n from "../../../i18n.js"
import localUserAddView from './localUserAddView.js'
import screen from '../../../../screen.js'
const faceEnterView = {}
faceEnterView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('faceEnterView', dxui.Utils.LAYER.MAIN)
    faceEnterView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgOpa(0)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(false)
        screen.faceEnterStart(localUserAddView.nowUser.id)

        faceEnterView.statusPanel.success("faceEnterView.faceAdd")
        // faceEnterView.faceAdd.show()
        // faceEnterView.faceError.hide()
        // 注册10秒超时
        faceEnterView.backTimer = std.setTimeout(() => {
            if (!faceEnterView.successFlag) {
                faceEnterView.statusPanel.fail("faceEnterView.faceError")
                std.setTimeout(() => {
                    faceEnterView.backCb()
                    dxui.loadMain(localUserAddView.screenMain)
                }, 500);
            }
        }, 10000);
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        faceEnterView.successFlag = false
        screen.faceEnterEnd()
        if (faceEnterView.backTimer) {
            std.clearTimeout(faceEnterView.backTimer)
            faceEnterView.backTimer = null
        }
    })

    const titleBoxBg = dxui.View.build(screenMain.id + 'titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(600, 70)
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, localUserAddView.screenMain, 'faceEnterViewTitle', 'faceEnterView.title', faceEnterView.backCb)
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const faceRec2 = dxui.Image.build('faceRec2', screenMain)
    faceRec2.align(dxui.Utils.ALIGN.TOP_MID, 0, -111)
    faceRec2.source('/app/code/resource/image/faceRec2.png')

    // const faceAdd = dxui.Image.build('faceAdd', screenMain)
    // faceEnterView.faceAdd = faceAdd
    // faceAdd.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -90)
    // faceAdd.source('/app/code/resource/image/faceAdd.png')

    // const faceAddLbl = dxui.Label.build('faceAddLbl', faceAdd)
    // faceAddLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    // faceAddLbl.textFont(viewUtils.font(30))
    // faceAddLbl.textColor(0xffffff)
    // faceAddLbl.dataI18n = 'faceEnterView.faceAdd'
    // faceAddLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)


    faceEnterView.statusPanel = viewUtils.statusPanel(screenMain)
    // const faceError = dxui.Image.build('faceError', screenMain)
    // faceEnterView.faceError = faceError
    // faceError.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -90)
    // faceError.source('/app/code/resource/image/faceError.png')
    // faceError.hide()

    // const faceErrorLbl = dxui.Label.build('faceErrorLbl', faceError)
    // faceErrorLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    // faceErrorLbl.textFont(viewUtils.font(30))
    // faceErrorLbl.textColor(0xffffff)
    // faceErrorLbl.dataI18n = 'faceEnterView.faceError'
    // faceErrorLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)

    // faceEnterView.timeout()
}

faceEnterView.timeout = function () {
    // faceEnterView.statusPanel.fail("faceEnterView.faceError")
    // faceEnterView.faceAdd.hide()
    // faceEnterView.faceError.show()
}

faceEnterView.backCb = function () {
    if (!localUserAddView.nowUser) {
        return
    }
    if (localUserAddView.nowUser.id) {
        localUserAddView.addID(localUserAddView.nowUser.id)
    }
    if (localUserAddView.nowUser.name) {
        localUserAddView.addName(localUserAddView.nowUser.name)
    }
    if (localUserAddView.nowUser.idCard) {
        localUserAddView.addIDCard(localUserAddView.nowUser.idCard)
    }
    if (localUserAddView.nowUser.face) {
        localUserAddView.addFace(localUserAddView.nowUser.face)
    }
    if (localUserAddView.nowUser.pwd) {
        localUserAddView.addPwd(localUserAddView.nowUser.pwd)
    }
    if (localUserAddView.nowUser.card) {
        localUserAddView.addCard(localUserAddView.nowUser.card)
    }
    localUserAddView.addType(localUserAddView.nowUser.type)
}

export default faceEnterView