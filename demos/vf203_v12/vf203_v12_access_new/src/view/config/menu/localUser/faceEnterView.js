import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import localUserAddView from './localUserAddView.js'
import screen from '../../../../screen.js'
const faceEnterView = {}
faceEnterView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('faceEnterView', dxui.Utils.LAYER.MAIN)
    faceEnterView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgOpa(0)
    faceEnterView.ccount = 3

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        ccountLbl.show()
        faceEnterView.ccount = 3
        ccountLbl.text(faceEnterView.ccount + "秒后开始注册")
        faceEnterView.ctimer = std.setInterval(() => {
            faceEnterView.ccount--
            ccountLbl.text(faceEnterView.ccount + "秒后开始注册")
            if (faceEnterView.ccount == 0) {
                std.clearInterval(faceEnterView.ctimer)
                faceEnterView.ctimer = null
                faceEnterView.ccount = 3
                ccountLbl.hide()

                screen.faceEnterStart()

                faceEnterView.statusPanel.success("faceEnterView.faceAdd")
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
            }
        }, 1000);
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        faceEnterView.successFlag = false
        if (faceEnterView.backTimer) {
            std.clearTimeout(faceEnterView.backTimer)
            faceEnterView.backTimer = null
        }
        if (faceEnterView.ctimer) {
            std.clearInterval(faceEnterView.ctimer)
            faceEnterView.ctimer = null
        }
    })

    const titleBoxBg = dxui.View.build(screenMain.id + 'titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (70 / 1024))
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, localUserAddView.screenMain, 'faceEnterViewTitle', 'faceEnterView.title', faceEnterView.backCb)
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const faceRec2 = dxui.Image.build('faceRec2', screenMain)
    faceRec2.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    faceRec2.source(screen.resourcePath.imagePath + '/faceRec2.png')

    const ccountLbl = dxui.Label.build('ccountLbl', screenMain)
    ccountLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    ccountLbl.text(faceEnterView.ccount + "秒后开始注册")
    ccountLbl.textFont(viewUtils.font(28))
    ccountLbl.textColor(0xffffff)

    faceEnterView.statusPanel = viewUtils.statusPanel(screenMain)
}


faceEnterView.backCb = function () {
    if (!localUserAddView.nowUser) {
        return
    }
    if (localUserAddView.nowUser.id) {
    }
    localUserAddView.addID(localUserAddView.nowUser.id)
    if (localUserAddView.nowUser.name) {
        localUserAddView.addName(localUserAddView.nowUser.name)
    }
    if (localUserAddView.nowUser.idCard) {
        localUserAddView.addIDCard(localUserAddView.nowUser.idCard)
    }
    if (localUserAddView.nowUser.face) {
        localUserAddView.addFace(localUserAddView.nowUser.face, localUserAddView.nowUser.feature)
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