import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import screen from '../screen.js'
const popWin = {}
popWin.init = function () {

    /**************************************************创建顶层控件*****************************************************/
    let center_background = dxui.View.build('center_background', dxui.Utils.LAYER.TOP)
    popWin.center_background = center_background
    center_background.scroll(false)
    clearStyle(center_background)
    center_background.setSize(480, 320)
    center_background.bgColor(0x000000)
    center_background.bgOpa(50)
    center_background.hide()
    let overwrite = center_background.show
    center_background.show = () => {
        let uiConfig = screen.getUIConfig()
        if (uiConfig.rotation == 0 || uiConfig.rotation == 2) {
            // 竖屏
            center_background.setSize(320, 480)
            center_background.setSize(320, 480)
            center_cont.setSize(192, 192)
            center_bottom_view.setSize(192 - 10, 20)
        } else {
            // 横屏
            center_background.setSize(480, 320)
            center_cont.setSize(320, 192)
            center_bottom_view.setSize(320 - 10, 20)
        }
        center_cont.update()
        center_label.width(center_cont.width())
        center_img.alignTo(center_cont, dxui.Utils.ALIGN.OUT_TOP_MID, 0, 60)
        overwrite.call(center_background)


        center_background.update()
        showMsg.width(center_background.width())
        showMsg.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    }


    /**************************************************展示图片*****************************************************/
    let showPic = dxui.Image.build('showPic', center_background)
    popWin.showPic = showPic
    showPic.source('/app/code/resource/image/pic0.png')
    showPic.hide()
    /**************************************************弹窗*****************************************************/
    let center_cont = dxui.View.build('center_cont', center_background)
    popWin.center_cont = center_cont
    clearStyle(center_cont)
    center_cont.setSize(320, 192);
    center_cont.radius(25)
    center_cont.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    /**************************************************弹窗标题*****************************************************/
    let center_title = buildLabel('center_title', center_cont, 25, "—— 温馨提示 ——")
    popWin.center_title = center_title
    center_cont.update()
    center_title.width(center_cont.width())
    center_title.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    center_title.align(dxui.Utils.ALIGN.CENTER, 0, -25);
    /**************************************************弹窗label*****************************************************/
    let center_label = buildLabel('center_label', center_cont, 25, "这是一个弹窗--这是一个弹窗--这是一个弹窗--")
    popWin.center_label = center_label
    center_cont.update()
    center_label.width(center_cont.width())
    center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    center_label.align(dxui.Utils.ALIGN.CENTER, 0, 5);
    center_label.textColor(0x46DE8D)
    /**************************************************弹窗上部图片*****************************************************/
    let center_img = dxui.Image.build('center_img', center_background)
    popWin.center_img = center_img
    center_img.source('/app/code/resource/image/hint_true.png')
    center_img.alignTo(center_cont, dxui.Utils.ALIGN.OUT_TOP_MID, 0, 60);
    /**************************************************弹窗下部图片*****************************************************/
    let center_bottom_view = dxui.View.build('center_bottom_view', center_cont)
    popWin.center_bottom_view = center_bottom_view
    clearStyle(center_bottom_view)
    center_bottom_view.bgColor(0x46DE8D)
    center_bottom_view.radius(10)
    center_bottom_view.setSize(278, 20);
    center_bottom_view.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -20);
    /**************************************************弹窗关闭按钮*****************************************************/
    let center_close_btn = dxui.Button.build('center_close_btn', center_cont)
    popWin.center_close_btn = center_close_btn
    center_close_btn.setSize(100, 40);
    center_close_btn.bgColor(0xfbbc1a)
    center_close_btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -20);
    center_close_btn.hide()
    center_close_btn.on(dxui.Utils.EVENT.CLICK, () => {
        std.clearTimeout(screen.customPopWinTimer)
        center_background.hide()
        screen.press()
    })
    /**************************************************弹窗关闭文本*****************************************************/
    let center_close_label = buildLabel("center_close_label", center_close_btn, 20, "好的")
    popWin.center_close_label = center_close_label
    center_close_label.textColor(0xffffff)
    center_close_label.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    /**************************************************展示文字*****************************************************/
    let showMsg = dxui.Label.build('showMsg', center_background)
    popWin.showMsg = showMsg
    let font32 = dxui.Font.build('/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf', 32, dxui.Utils.FONT_STYLE.NORMAL)
    showMsg.textFont(font32)
    showMsg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    showMsg.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsg.textColor(0xffffff)
    showMsg.hide()

    /**************************************************展示文字左下*****************************************************/
    let showMsgBL = dxui.Label.build('showMsgBL', center_background)
    popWin.showMsgBL = showMsgBL
    showMsgBL.textFont(font32)
    showMsgBL.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 62, -12);
    showMsgBL.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsgBL.textColor(0xffffff)
    showMsgBL.hide()
    /**************************************************展示文字中上*****************************************************/
    let showMsgBU = dxui.Label.build('showMsgBU', center_background)
    popWin.showMsgBU = showMsgBU
    showMsgBU.textFont(font32)
    showMsgBU.align(dxui.Utils.ALIGN.TOP_MID, 0, 62);
    showMsgBU.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsgBU.textColor(0xffffff)
    showMsgBU.hide()
    /**************************************************展示文字中下*****************************************************/
    let showMsgBM = dxui.Label.build('showMsgBM', center_background)
    popWin.showMsgBM = showMsgBM
    showMsgBM.textFont(font32)
    showMsgBM.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -12);
    showMsgBM.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsgBM.textColor(0xffffff)
    showMsgBM.hide()

    /**************************************************展示文字右下*****************************************************/
    let showMsgBR = dxui.Label.build('showMsgBR', center_background)
    popWin.showMsgBR = showMsgBR
    showMsgBR.textFont(font32)
    showMsgBR.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -62, -12);
    showMsgBR.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    showMsgBR.textColor(0xffffff)
    showMsgBR.hide()
    /**************************************************二维码*****************************************************/
    let qrcode = dxui.View.build('qrcode', center_background)
    popWin.qrcode = qrcode
    clearStyle(qrcode)
    qrcode.setSize(240, 240)
    qrcode.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    popWin.helpQr = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 240, 0x000000, 0xffffff)
    qrcode.update = (data) => {
        dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(popWin.helpQr, data)
    }
    qrcode.hide()



    //设备信息层
    let sysInfo = dxui.View.build('sysInfo', dxui.Utils.LAYER.TOP)
    // sysInfo.padBottom(50)
    // sysInfo.padTop(50)
    sysInfo.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    sysInfo.scroll(false)
    clearStyle(sysInfo)
    sysInfo.setSize(320, 400)
    sysInfo.bgOpa(0)
    sysInfo.hide()
    sysInfo.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    sysInfo.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    let sysInfoOverwrite = sysInfo.show
    sysInfo.show = () => {
        let uiConfig = screen.getUIConfig()
        if (uiConfig.rotation == 0 || uiConfig.rotation == 2) {
            // 竖屏
            sysInfo.setSize(320, 400)
            versionInfo.width(320)
            versionInfo.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
            info.width(320)
            disk.width(320)
            memory.width(320)
            cpu.width(320)
            cpu.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
        } else {
            // 横屏
            sysInfo.setSize(480, 280)
            versionInfo.width(480)
            versionInfo.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
            info.width(480)
            disk.width(480)
            memory.width(480)
            cpu.width(480)
            cpu.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        }
        sysInfoOverwrite.call(sysInfo)
    }
    popWin.sysInfo = sysInfo
    // sysInfo.obj.lvObjSetStylePadGap(-5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    /**************************************************设备信息*****************************************************/
    let info = dxui.Label.build('info', sysInfo)
    popWin.info = info
    info.textFont(font32)
    info.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    info.textColor(0xffffff)
    /**************************************************版本号*****************************************************/
    let versionInfo = dxui.Label.build('versionInfo', sysInfo)
    popWin.versionInfo = versionInfo
    versionInfo.textFont(font32)
    versionInfo.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    versionInfo.textColor(0xffffff)
    versionInfo.text('fdskjfhsdkjfhksdjfhksgisdhflsdhfglshdgljsdflkgjlfdkgjhldfkjgldfkjgldfg')
    versionInfo.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    /**************************************************剩余存储*****************************************************/
    let disk = dxui.Label.build('disk', sysInfo)
    popWin.disk = disk
    disk.textFont(font32)
    disk.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    disk.textColor(0xffffff)

    /**************************************************剩余内存*****************************************************/
    let memory = dxui.Label.build('memory', sysInfo)
    popWin.memory = memory
    memory.textFont(font32)
    memory.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    memory.textColor(0xffffff)
    /************************************************** CPU占用率*****************************************************/
    let cpu = dxui.Label.build('cpu', sysInfo)
    popWin.cpu = cpu
    cpu.textFont(font32)
    cpu.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    cpu.textColor(0xffffff)
    cpu.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
}
function clearStyle(obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}
function buildLabel(id, parent, size, text) {
    let label = dxui.Label.build(id, parent)
    let font60 = dxui.Font.build('/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf', size, dxui.Utils.FONT_STYLE.NORMAL)
    label.textFont(font60)
    label.textColor(0x000000)
    label.text(text)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)

    return label
}

export default popWin