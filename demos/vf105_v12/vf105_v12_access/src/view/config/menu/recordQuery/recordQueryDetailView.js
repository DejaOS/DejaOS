import dxUi from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import recordQueryView from '../recordQueryView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
import logger from '../../../../../dxmodules/dxLogger.js'
const recordQueryDetailView = {}
recordQueryDetailView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('recordQueryDetailView', dxUi.Utils.LAYER.MAIN)
    recordQueryDetailView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        fillInfo()
    })
    const titleBox = viewUtils.title(screenMain, recordQueryView.screenMain, 'recordQueryDetailViewTitle', 'recordQueryDetailView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const box = dxUi.View.build(screenMain.id + 'box', screenMain)
    viewUtils._clearStyle(box)
    box.align(dxUi.Utils.ALIGN.TOP_MID, 0, 150)
    box.setSize(screen.screenSize.width, 800)
    box.bgOpa(0)
    box.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    box.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    box.obj.lvObjSetStylePadGap(5, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    recordQueryDetailView.info = [{
        title: 'recordQueryDetailView.id',
        key: 'userId',
        label: null
    }, {
        title: 'recordQueryDetailView.name',
        key: 'name',
        label: null
    }, {
        title: 'recordQueryDetailView.idCard',
        key: 'idCard',
        label: null
    }, {
        title: 'recordQueryDetailView.time',
        key: 'time',
        label: null
    }, {
        title: 'recordQueryDetailView.result',
        key: 'result',
        label: null
    }, {
        title: 'recordQueryDetailView.face',
        key: 'code',
        label: null
    }]

    recordQueryDetailView.info.forEach((item, index) => {
        const itemBox = dxUi.View.build(screenMain.id + '.' + index, box)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        itemBox.setBorderColor(0x767676)

        const titleLbl = dxUi.Label.build(screenMain.id + 'titleLbl' + index, itemBox)
        titleLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        titleLbl.textFont(viewUtils.font(26))
        titleLbl.dataI18n = item.title

        if ("recordQueryDetailView.face" == item.title) {
            itemBox.setSize(760, 260)
            itemBox.scroll(false)
            const faceImg = dxUi.Image.build(screenMain.id + 'faceImg' + index, itemBox)
            faceImg.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            item.face = faceImg
            return
        }

        const valueLbl = dxUi.Label.build(screenMain.id + 'valueLbl' + index, itemBox)
        valueLbl.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
        valueLbl.textFont(viewUtils.font(26))
        valueLbl.textColor(0x333333)
        item.label = valueLbl
    })

}

function fillInfo () {
    let extra
    try {
        extra = JSON.parse(recordQueryView.nowRecord.extra)
    } catch (error) {
        logger.error("No extra fields, skip")
    }
    const language = screen.getConfig(["base.language"])
    recordQueryDetailView.info.forEach((item, index) => {
        switch (item.key) {
            case 'userId':
                item.label.text((recordQueryView.nowRecord.userId || ' '))
                break;
            case 'name':
                if (extra && extra.name) {
                    item.label.text(extra.name)
                } else {
                    item.label.text(" ")
                }
                break;
            case 'idCard':
                if (extra && extra.idCard) {
                    item.label.text(extra.idCard)
                } else {
                    item.label.text(" ")
                }
                break;
            case 'time':
                const t = new Date(recordQueryView.nowRecord[item.key] * 1000)
                // Pad zero function
                const pad = (n) => n < 10 ? `0${n}` : n;
                item.label.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
                break;
            case 'result':
                let msg = ""
                switch (recordQueryView.nowRecord.type) {
                    case "200":
                        msg = i18n.t('recordQueryView.card')
                        break;
                    case "300":
                        msg = i18n.t('recordQueryView.face')
                        break;
                    case "400":
                        msg = i18n.t('recordQueryView.password')
                        break;
                    case "100":
                        msg = i18n.t('recordQueryView.qrcode')
                        break;
                    case "101":
                        msg = i18n.t('recordQueryView.qrcode')
                        break;
                    case "103":
                        msg = i18n.t('recordQueryView.qrcode')
                        break;
                    default:
                        break;
                }
                msg += language === 'CN' ? "" : " "
                if (recordQueryView.nowRecord.result == 0) {
                    msg += i18n.t('recordQueryView.success')
                } else {
                    msg += i18n.t('recordQueryView.fail')
                }
                item.label.text(msg)
                break;
            case 'code':
                // Face capture
                if (recordQueryView.nowRecord.type == "300") {
                    let src = `/app/data/passRecord/${recordQueryView.nowRecord.userId ? recordQueryView.nowRecord.userId : "undefined"}_${recordQueryView.nowRecord.time}.jpg`
                    item.face.show()
                    item.face.source(src)
                } else {
                    item.face.hide()
                }
                break;
            default:
                break;
        }
    })
}

export default recordQueryDetailView
