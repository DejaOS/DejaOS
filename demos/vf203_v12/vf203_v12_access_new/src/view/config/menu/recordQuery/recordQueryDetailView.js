import dxui from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import recordQueryView from '../recordQueryView.js'
import i18n from "../../../i18n.js"
import logger from '../../../../../dxmodules/dxLogger.js'
import screen from '../../../../screen.js'
const recordQueryDetailView = {}
recordQueryDetailView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('recordQueryDetailView', dxui.Utils.LAYER.MAIN)
    recordQueryDetailView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        fillInfo()
    })
    const titleBox = viewUtils.title(screenMain, recordQueryView.screenMain, 'recordQueryDetailViewTitle', 'recordQueryDetailView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const box = dxui.View.build(screenMain.id + 'box', screenMain)
    viewUtils._clearStyle(box)
    box.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (150 / 1024))
    box.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (800 / 1024))
    box.bgOpa(0)
    box.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    box.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    box.obj.lvObjSetStylePadGap(screen.screenSize.width * (5 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

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
        key: 'timeStamp',
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
        const itemBox = dxui.View.build(screenMain.id + '.' + index, box)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        itemBox.borderWidth(screen.screenSize.width * (1 / 600))
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        itemBox.setBorderColor(0x767676)

        const titleLbl = dxui.Label.build(screenMain.id + 'titleLbl' + index, itemBox)
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        titleLbl.textFont(viewUtils.font(26))
        titleLbl.dataI18n = item.title

        if ("recordQueryDetailView.face" == item.title) {
            itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (200 / 1024))
            itemBox.scroll(false)
            const faceImg = dxui.Image.build(screenMain.id + 'faceImg' + index, itemBox)
            faceImg.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            item.face = faceImg
            return
        }

        const valueLbl = dxui.Label.build(screenMain.id + 'valueLbl' + index, itemBox)
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
        valueLbl.textFont(viewUtils.font(26))
        valueLbl.textColor(0x333333)
        item.label = valueLbl
    })

}

function fillInfo() {
    let extra
    try {
        extra = JSON.parse(recordQueryView.nowRecord.extra)
    } catch (error) {
        logger.error("没有额外字段跳过")
    }

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
            case 'timeStamp':
                const t = new Date(recordQueryView.nowRecord[item.key] * 1000)
                // 补零函数
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
                    default:
                        break;
                }

                if (recordQueryView.nowRecord.result == 0) {
                    msg += i18n.t('recordQueryView.success')
                } else {
                    msg += i18n.t('recordQueryView.fail')
                }
                item.label.text(msg)
                break;
            case 'code':
                // 人脸抓拍
                if (recordQueryView.nowRecord.type == "300") {
                    let src = `/data/passRecord/${recordQueryView.nowRecord.userId ? recordQueryView.nowRecord.userId : "undefined"}_${recordQueryView.nowRecord.timeStamp}.jpg`
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
