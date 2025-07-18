import dxui from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import factoryTestView from '../factoryTestView.js'
import i18n from "../../../i18n.js"
import cameraCalibration from '../../../../../dxmodules/dxCameraCalibration.js'
import bus from '../../../../../dxmodules/dxEventBus.js'

const calibrationView = {}
calibrationView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('calibrationView', dxui.Utils.LAYER.MAIN)
    calibrationView.screenMain = screenMain
    screenMain.scroll(false)
    // screenMain.bgColor(0xffffff)
    screenMain.bgOpa(0);
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        bus.fire("calibrationStatus", "start")
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        bus.fire("calibrationStatus", "stop")
    })

    const titleBox = viewUtils.title(screenMain, factoryTestView.screenMain, 'calibrationViewTitle', 'factoryTestView.calibration')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const titleBoxBg = dxui.View.build(screenMain.id + 'titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(600, 70)
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const box1 = cameraCalibration.getBox(0, 1)
    const box2 = cameraCalibration.getBox(1, 1)

    const cameraCalibrationBox1 = dxui.View.build('cameraCalibrationBox1', screenMain)
    cameraCalibrationBox1.bgOpa(0)
    cameraCalibrationBox1.borderWidth(5)
    cameraCalibrationBox1.setSize(box1.w, box1.h)
    cameraCalibrationBox1.setPos(box1.x, box1.y)

    const cameraCalibrationBoxLabel1 = dxui.Label.build('cameraCalibrationBoxLabel1', cameraCalibrationBox1)
    cameraCalibrationBoxLabel1.dataI18n = "calibrationView.firstCalibration"
    cameraCalibrationBoxLabel1.textFont(viewUtils.font(22))
    cameraCalibrationBoxLabel1.textColor(0xffffff)

    const cameraCalibrationBox2 = dxui.View.build('cameraCalibrationBox2', screenMain)
    cameraCalibrationBox2.bgOpa(0)
    cameraCalibrationBox2.borderWidth(5)
    cameraCalibrationBox2.setSize(box2.w, box2.h)
    cameraCalibrationBox2.setPos(box2.x, box2.y)

    const cameraCalibrationBoxLabel2 = dxui.Label.build('cameraCalibrationBoxLabel2', cameraCalibrationBox2)
    cameraCalibrationBoxLabel2.dataI18n = "calibrationView.secondCalibration"
    cameraCalibrationBoxLabel2.textFont(viewUtils.font(22))
    cameraCalibrationBoxLabel2.textColor(0xffffff)

}

export default calibrationView
