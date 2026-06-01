import dxui from '../../dxmodules/dxUi.js'
import viewUtils from './viewUtils.js'
import std from '../../dxmodules/dxStd.js'
import i18n from './i18n.js'
import screen from '../screen.js'
const idleView = {}
idleView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('idleView', dxui.Utils.LAYER.SYS)
    idleView.screenMain = screenMain
    viewUtils._clearStyle(screenMain)
    screenMain.hide()
    screenMain.scroll(false)
    screenMain.width(screen.screenSize.width)
    screenMain.height(screen.screenSize.height)

    const idleImage = dxui.Image.build('idleImage', screenMain)
    // 屏保图片
    idleImage.source(screen.resourcePath.imagePath + '/idleImage.png')

    const dateBox = dxui.View.build('dateBox', screenMain)
    viewUtils._clearStyle(dateBox)
    dateBox.width(screen.screenSize.width * (600 / 600))
    dateBox.height(screen.screenSize.height * (200 / 1024))
    dateBox.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    dateBox.bgOpa(0)

    const timeLbl = dxui.Label.build(dateBox.id + 'timeLbl', dateBox)
    timeLbl.textFont(viewUtils.font(80, dxui.Utils.FONT_STYLE.BOLD))
    timeLbl.text("10:00:00")
    timeLbl.textColor(0xffffff)
    timeLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)

    const dateLbl = dxui.Label.build(dateBox.id + 'dateLbl', dateBox)
    dateLbl.textFont(viewUtils.font(40))
    dateLbl.text("2025-01-17 周五")
    dateLbl.textColor(0xffffff)
    dateLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    std.setInterval(() => {
        const t = new Date();
        // 补零函数
        const pad = (n) => n < 10 ? `0${n}` : n;
        // 获取星期的国际化文本
        const weekDay = i18n.t(`idleView.week.${t.getDay()}`);

        timeLbl.text(`${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
        dateLbl.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${weekDay}`)
    }, 1000, true)

}


export default idleView