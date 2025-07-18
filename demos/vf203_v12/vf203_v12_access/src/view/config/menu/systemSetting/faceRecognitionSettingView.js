import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import i18n from "../../../i18n.js"
import systemSettingView from '../systemSettingView.js'
import screen from '../../../../screen.js'
const faceRecognitionSettingView = {}
faceRecognitionSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('faceRecognitionSettingView', dxui.Utils.LAYER.MAIN)
    faceRecognitionSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        // 人脸相似度阈值
        faceRecognitionSettingView.info[0].slider.value(configAll['face.similarity'] * 100)
        faceRecognitionSettingView.info[0].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 活体检测开关
        faceRecognitionSettingView.info[1].switch.select(configAll['face.livenessOff'] == 1)
        // 活体检测阈值
        faceRecognitionSettingView.info[2].slider.value(configAll['face.livenessVal'])
        faceRecognitionSettingView.info[2].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 红外图像显示
        faceRecognitionSettingView.info[3].switch.select(configAll['face.showNir'] == 1)
        // // 口罩检测开关
        // faceRecognitionSettingView.info[4].switch.select(configAll['face.detectMask'] == 1)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'faceRecognitionSettingViewTitle', 'systemSettingView.faceRecognitionSetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)


    faceRecognitionSettingView.info = [
        {
            title: "systemSettingView.faceSimilarityThreshold",
            type: 'slider',
            unit: '%'
        },
        {
            title: "systemSettingView.livenessDetectionFunction",
            type: 'switch',
        },
        {
            title: "systemSettingView.livenessDetectionThreshold",
            type: 'slider',
            unit: ''
        },
        {
            title: "systemSettingView.infraredImageDisplay",
            type: 'switch',
        },
        // {
        //     title: "systemSettingView.maskRecognition",
        //     type: 'switch',
        // },
        // {
        //     title: "systemSettingView.maskRecognitionThreshold",
        //     type: 'slider',
        //     unit: '%'
        // },
        // {
        //     title: "systemSettingView.recognitionDistance",
        //     type: 'input',
        //     unit: 'cm'
        // }
    ]

    const faceSettingBox = dxui.View.build('faceSettingBox', screenMain)
    viewUtils._clearStyle(faceSettingBox)
    faceSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    faceSettingBox.setSize(600, 600)
    faceSettingBox.bgOpa(0)
    faceSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    faceSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    faceSettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    faceSettingBox.borderWidth(1)
    faceSettingBox.setBorderColor(0xDEDEDE)
    faceSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)


    faceRecognitionSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, faceSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(560, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))
        itemLabel.width(280)
        itemLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        if (item.unit) {
            const unitLabel = dxui.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.text(item.unit)
            unitLabel.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'switch':
                const __switch = dxui.Switch.build(item.title + 'switch', itemBox)
                __switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                __switch.setSize(70, 35)
                item.switch = __switch
                break;
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, -45, 0)
                input.setSize(100, 55)
                item.input = input
                break;
            case 'slider':
                const sliderLabel = dxui.Label.build(item.title + 'sliderLabel', itemBox)
                sliderLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -20, 0)
                sliderLabel.width(50)
                sliderLabel.text('0')
                sliderLabel.textFont(viewUtils.font(26))
                sliderLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

                const slider = dxui.Slider.build(item.title + 'slider', itemBox)
                slider.align(dxui.Utils.ALIGN.RIGHT_MID, -80, 0)
                slider.width(150)
                slider.range(0, 100)

                slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                    sliderLabel.text(slider.value() + '')
                })
                item.slider = slider
                break;
        }
    })

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            face: {
                similarity: faceRecognitionSettingView.info[0].slider.value() / 100,
                livenessOff: faceRecognitionSettingView.info[1].switch.isSelect() ? 1 : 0,
                livenessVal: faceRecognitionSettingView.info[2].slider.value(),
                showNir: faceRecognitionSettingView.info[3].switch.isSelect() ? 1 : 0,
                // detectMask: faceRecognitionSettingView.info[4].switch.isSelect() ? 1 : 0
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            faceRecognitionSettingView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            faceRecognitionSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    faceRecognitionSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default faceRecognitionSettingView
