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
        faceRecognitionSettingView.info[2].slider.value(configAll['face.livenessVal'] * 10)
        faceRecognitionSettingView.info[2].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 红外图像显示
        faceRecognitionSettingView.info[3].switch.select(configAll['face.showNir'] == 1)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'faceRecognitionSettingViewTitle', 'systemSettingView.faceRecognitionSetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))


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
    faceSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    faceSettingBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (600 / 1024))
    faceSettingBox.bgOpa(0)
    faceSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    faceSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    faceSettingBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (0 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    faceSettingBox.borderWidth(screen.screenSize.width * (1 / 600))
    faceSettingBox.setBorderColor(0xDEDEDE)
    faceSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)


    faceRecognitionSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, faceSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        itemBox.borderWidth(screen.screenSize.width * (1 / 600))
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))
        itemLabel.width(screen.screenSize.width * (280 / 600))
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
                __switch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
                __switch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)
                item.switch = __switch
                break;
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (45 / 600), 0)
                input.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (55 / 1024))
                item.input = input
                break;
            case 'slider':
                const sliderLabel = dxui.Label.build(item.title + 'sliderLabel', itemBox)
                sliderLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (20 / 600), 0)
                sliderLabel.width(screen.screenSize.width * (50 / 600))
                sliderLabel.text('0')
                sliderLabel.textFont(viewUtils.font(26))
                sliderLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

                const slider = dxui.Slider.build(item.title + 'slider', itemBox)
                slider.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (80 / 600), 0)
                slider.width(screen.screenSize.width * (150 / 600))
                slider.range(0, 100)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_KNOB)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR)

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
                livenessVal: Math.floor(faceRecognitionSettingView.info[2].slider.value() / 10),
                showNir: faceRecognitionSettingView.info[3].switch.isSelect() ? 1 : 0,
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
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))

    faceRecognitionSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default faceRecognitionSettingView
