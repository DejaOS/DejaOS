import dxui from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import dxCommon from '../../../../dxmodules/dxCommon.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import displaySettingView from './systemSetting/displaySettingView.js'
import faceRecognitionSettingView from './systemSetting/faceRecognitionSettingView.js'
import swipeCardRecognitionSettingView from './systemSetting/swipeCardRecognitionSettingView.js'
import passLogSettingView from './systemSetting/passLogSettingView.js'
import passwordOpenDoorSettingView from './systemSetting/passwordOpenDoorSettingView.js'
import passwordManagementView from './systemSetting/passwordManagementView.js'
import timeSettingView from './systemSetting/timeSettingView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'

const systemSettingView = {}
systemSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('systemSettingView', dxui.Utils.LAYER.MAIN)
    systemSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'systemSettingViewTitle', 'systemSettingView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    systemSettingView.sysInfo = [
        {
            title: 'systemSettingView.displaySetting',
            type: 'menu',
            view: displaySettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.faceRecognitionSetting',
            type: 'menu',
            view: faceRecognitionSettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.swipeCardRecognitionSetting',
            type: 'menu',
            view: swipeCardRecognitionSettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.passLogSetting',
            type: 'menu',
            view: passLogSettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.passwordOpenDoorSetting',
            type: 'menu',
            view: passwordOpenDoorSettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.passwordManagement',
            type: 'menu',
            view: passwordManagementView,
            obj: null,
        },
        {
            title: 'systemSettingView.timeSetting',
            type: 'menu',
            view: timeSettingView,
            obj: null,
        },
        {
            title: 'systemSettingView.restartDevice',
            type: 'button',
            obj: null,
        },
        {
            title: 'systemSettingView.restoreDefaultConfig',
            type: 'button',
            obj: null,
        },
        {
            title: 'systemSettingView.resetDevice',
            type: 'button',
            obj: null,
        },
    ]


    const settingBox = dxui.View.build('settingBox', screenMain)
    viewUtils._clearStyle(settingBox)
    settingBox.setSize(screen.screenSize.width, screen.screenSize.height - 140)
    settingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    settingBox.bgColor(0xf7f7f7)
    settingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    settingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    settingBox.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    settingBox.padTop(10)
    settingBox.padBottom(10)

    systemSettingView.sysInfo.forEach(item => {
        item.obj = dxui.View.build(item.title, settingBox)
        viewUtils._clearStyle(item.obj)
        item.obj.setSize(760, 76)
        item.obj.bgColor(0xffffff)
        item.obj.radius(10)
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            item.obj.bgColor(0xEAEAEA)
        })
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
            item.obj.bgColor(0xffffff)
        })

        const titleLbl = dxui.Label.build(item.title + 'Label', item.obj)
        titleLbl.dataI18n = item.title
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, 20, 0)
        titleLbl.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'menu':
                const image = dxui.Image.build(item.title + 'Image', item.obj)
                image.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
                image.source('/app/code/resource/image/right.png')
                item.obj.on(dxui.Utils.EVENT.CLICK, () => {
                    dxui.loadMain(item.view.screenMain)
                })
                break
            case 'button':
                const btn = dxui.Button.build(item.title + 'Button', item.obj)
                btn.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
                btn.setSize(200, 44)
                btn.radius(10)
                btn.bgColor(0xEAEAEA)

                const btnLbl = dxui.Label.build(btn.id + 'Label', btn)
                btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
                btnLbl.textFont(viewUtils.font(24))
                btnLbl.textColor(0x767676)

                if (item.title == 'systemSettingView.restartDevice') {
                    btnLbl.dataI18n = 'systemSettingView.restart'
                    btn.on(dxui.Utils.EVENT.CLICK, () => {
                        viewUtils.confirmOpen('systemSettingView.confirmation', 'systemSettingView.confirmRestart', () => {
                            std.setTimeout(() => {
                                dxCommon.systemBrief("reboot -f")
                            }, 1000)
                        }, () => { })
                    })
                } else if (item.title == 'systemSettingView.restoreDefaultConfig') {
                    btnLbl.dataI18n = 'systemSettingView.restoreDefault'
                    btn.on(dxui.Utils.EVENT.CLICK, () => {
                        viewUtils.confirmOpen('systemSettingView.confirmation', 'systemSettingView.confirmRecoveryConfiguration', () => {
                            dxCommon.systemBrief("rm -rf /app/data/config/*")
                            std.setTimeout(() => {
                                dxCommon.systemBrief("reboot -f")
                            }, 1000)
                        }, () => { })
                    })
                } else if (item.title == 'systemSettingView.resetDevice') {
                    btnLbl.dataI18n = 'systemSettingView.reset'
                    btn.bgColor(0xffdddd)
                    btnLbl.textColor(0xFD5353)
                    btn.on(dxui.Utils.EVENT.CLICK, () => {
                        viewUtils.confirmOpen('systemSettingView.confirmation', 'systemSettingView.confirmReset', () => {
                            dxCommon.systemBrief("rm -rf /app/data/config/*")
                            dxCommon.systemBrief("rm -rf /app/data/db/*")
                            dxCommon.systemBrief("rm -rf /app/data/user/*")
                            dxCommon.systemBrief("rm -rf /vgmj.db")
                            std.setTimeout(() => {
                                dxCommon.systemBrief("reboot -f")
                            }, 1000)
                        }, () => { })
                    })
                }

                break
        }
    })

}

export default systemSettingView
