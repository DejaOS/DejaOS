import dxCommon from '../dxmodules/dxCommon.js';
import logger from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'


function main() {
    dxui.init({ orientation: 1 });
    let screen_main = dxui.View.build('screen_main', dxui.Utils.LAYER.MAIN)

    let qrcode = dxui.View.build(screen_main.id + 'qrcode', screen_main)
    _clearStyle(qrcode)
    qrcode.setSize(320, 320)
    qrcode.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    let qrcodeObj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 320, 0x000000, 0xffffff)
    dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, "I am a QR code Ich bin ein QR-Code 我是二维码 私はQRコードです")

    dxui.loadMain(screen_main)
}

// clear style
function _clearStyle(obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}

main()

std.setInterval(() => {
    dxui.handler()
}, 5)

