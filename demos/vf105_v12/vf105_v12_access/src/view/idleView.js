import dxUi from '../../dxmodules/dxUi.js'
import viewUtils from './viewUtils.js'
import std from '../../dxmodules/dxStd.js'
import i18n from './i18n.js'
import screen from '../screen.js'
const idleView = {}
idleView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('idleView', dxUi.Utils.LAYER.SYS)
    idleView.screenMain = screenMain
    viewUtils._clearStyle(screenMain)
    screenMain.hide()
    screenMain.scroll(false)
    screenMain.width(screen.screenSize.width)
    screenMain.height(screen.screenSize.height)

    const idleImage = dxUi.Image.build('idleImage', screenMain)
    // Screensaver image
    idleImage.source('/app/code/resource/image/idleImage.jpg')

    const dateBox = dxUi.View.build('dateBox', screenMain)
    viewUtils._clearStyle(dateBox)
    dateBox.width(600)
    dateBox.height(200)
    dateBox.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    dateBox.bgOpa(0)

    const timeLbl = dxUi.Label.build(dateBox.id + 'timeLbl', dateBox)
    timeLbl.textFont(viewUtils.font(80, dxUi.Utils.FONT_STYLE.BOLD))
    timeLbl.text("10:00:00")
    timeLbl.textColor(0xffffff)
    timeLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 0)

    const dateLbl = dxUi.Label.build(dateBox.id + 'dateLbl', dateBox)
    dateLbl.textFont(viewUtils.font(40))
    dateLbl.text("2025-01-17 Fri")
    dateLbl.textColor(0xffffff)
    dateLbl.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 0)

    std.setInterval(() => {
        const t = new Date();
        // Pad zero function
        const pad = (n) => n < 10 ? `0${n}` : n;
        // Get internationalized text for weekday
        const weekDay = i18n.t(`idleView.week.${t.getDay()}`);

        timeLbl.text(`${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
        dateLbl.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${weekDay}`)
    }, 1000, true)

}


export default idleView