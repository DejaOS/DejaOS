import dxUi from "../../../../dxmodules/dxUi.js";
import viewUtils from "../../viewUtils.js";
import topView from "../../topView.js";
import configView from "../configView.js";
import i18n from "../../i18n.js";
import screen from "../../../screen.js";
const factoryTestView = {};
factoryTestView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build("factoryTestView", dxUi.Utils.LAYER.MAIN);
    factoryTestView.screenMain = screenMain;
    screenMain.scroll(false);
    screenMain.bgColor(0xffffff);
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true);
    });

    const titleBox = viewUtils.title(
        screenMain,
        configView.screenMain,
        "factoryTestViewTitle",
        "factoryTestView.title"
    );
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70);

    const factoryTestBox = dxUi.View.build("factoryTestBox", screenMain);
    viewUtils._clearStyle(factoryTestBox);
    factoryTestBox.setSize(
        screen.screenSize.width,
        screen.screenSize.height - 140
    );
    factoryTestBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140);
    factoryTestBox.bgColor(0xf7f7f7);
    factoryTestBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP);
    factoryTestBox.flexAlign(
        dxUi.Utils.FLEX_ALIGN.CENTER,
        dxUi.Utils.FLEX_ALIGN.START,
        dxUi.Utils.FLEX_ALIGN.START
    );
    factoryTestBox.obj.lvObjSetStylePadGap(
        10,
        dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
    );
    factoryTestBox.padTop(10);
    factoryTestBox.padBottom(10);

    const calibrationBox = dxUi.View.build("calibrationBox", factoryTestBox);
    viewUtils._clearStyle(calibrationBox);
    // calibrationBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 150);
    calibrationBox.setSize(560, 76);
    // calibrationBox.bgColor(0xf7f7f7);
    calibrationBox.bgColor(0xffffff);
    calibrationBox.radius(10);
    calibrationBox.on(dxUi.Utils.ENUM.LV_EVENT_PRESSED, () => {
        calibrationBox.bgColor(0xeaeaea);
    });
    calibrationBox.on(dxUi.Utils.ENUM.LV_EVENT_RELEASED, () => {
        calibrationBox.bgColor(0xffffff);
    });

    const titleLbl = dxUi.Label.build("calibrationBox" + "Label", calibrationBox);
    titleLbl.dataI18n = "factoryTestView.calibration";
    titleLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 20, 0);
    titleLbl.textFont(viewUtils.font(26));

    const image = dxUi.Image.build(calibrationBox.id + "Image", calibrationBox);
    image.align(dxUi.Utils.ALIGN.RIGHT_MID, -15, 0);
    image.source("/app/code/resource/image/right.png");

    calibrationBox.on(dxUi.Utils.EVENT.CLICK, () => {
        // dxui.loadMain(item.view.screenMain);
        console.log(123);
        
    });
};

export default factoryTestView;
