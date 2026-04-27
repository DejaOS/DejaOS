import std from '../dxmodules/dxStd.js'
import dxFacialBarcode from '../dxmodules/dxFacialBarcode.js'
import dxFacial from '../dxmodules/dxFacial.js'
import logger from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import dxAudio from '../dxmodules/dxAudio.js'

let facialConfig = {
    detection_max_num: 1,
    liv_threshold: 5,
    detection_repeat_ms: 5000
}

let barcodeConfig = {
    scanInterval: 3000,
    scanTimeout: 1500,
    // ROI: scannable region; size 200x200
    roiX: 140,
    roiY: 327
};

dxAudio.init();
dxAudio.setVolume(8);
dxFacial.init(facialConfig);
dxFacial.setStatus(2);

dxFacialBarcode.init();
dxFacialBarcode.setStatus(2);
dxFacialBarcode.setConfig(barcodeConfig);
dxui.init({ orientation: 0 }, {});

dxFacialBarcode.setCallbacks({
    onEvent: (data) => {
        dxAudio.playTxt('Scan successful', 0);
        logger.info(JSON.stringify(data));
    }
});

dxFacial.setCallbacks({
    onRecognition: (event) => {
        dxAudio.playTxt('Face recognition successful', 0);
        logger.info(JSON.stringify(event));
    }
})


let screenMain = dxui.View.build('screenMain', dxui.Utils.LAYER.MAIN)
screenMain.bgOpa(0)
screenMain.bgColor(0x3ABCF5)
screenMain.setSize(480, 854)

let roiView = dxui.View.build('roiView', screenMain)
roiView.bgOpa(0)
roiView.setPos(barcodeConfig.roiX, barcodeConfig.roiY)
roiView.setSize(200, 200)
roiView.borderWidth(2)
roiView.setBorderColor(0xFFFFFF)

let qcView = dxui.View.build('qcView', screenMain)
qcView.bgOpa(0)
qcView.setPos(180, 367)
qcView.setSize(120, 120)
qcView.borderWidth(4)
qcView.setBorderColor(0xE53E31)

dxui.loadMain(screenMain)



std.setInterval(() => {
    dxFacialBarcode.loop();
    dxFacial.loop();
    dxui.handler()
}, 30)
