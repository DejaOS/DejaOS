import dxUi from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
import recordQueryDetailView from './recordQuery/recordQueryDetailView.js'
const recordQueryView = {}
recordQueryView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('recordQueryView', dxUi.Utils.LAYER.MAIN)
    recordQueryView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        refreshRecordList(recordQueryView.nowPage ? recordQueryView.nowPage : 0, 6)
    })

    const empty = dxUi.Image.build(screenMain.id + 'empty', screenMain)
    recordQueryView.empty = empty
    empty.source('/app/code/resource/image/empty.png')
    empty.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    empty.hide()

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'recordQueryViewTitle', 'recordQueryView.title', () => { recordQueryView.nowPage = 0 })
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const box = dxUi.View.build(screenMain.id + 'box', screenMain)
    viewUtils._clearStyle(box)
    box.align(dxUi.Utils.ALIGN.TOP_MID, 0, 150)
    box.setSize(screen.screenSize.width, 1000)
    box.bgOpa(0)
    box.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    box.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    box.obj.lvObjSetStylePadGap(5, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    recordQueryView.items = []
    for (let i = 0; i < 6; i++) {
        const item = dxUi.View.build(box.id + 'item' + i, box)
        viewUtils._clearStyle(item)
        item.setSize(760, 160)
        item.bgOpa(0)
        item.borderWidth(1)
        item.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        item.setBorderColor(0x767676)

        const name = dxUi.Label.build(item.id + 'name' + i, item)
        name.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 5)
        name.textFont(viewUtils.font(24))

        const code = dxUi.Label.build(item.id + 'code' + i, item)
        code.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 40)
        code.textFont(viewUtils.font(24))
        code.dataI18n = 'recordQueryView.code'

        const codeValue = dxUi.Label.build(item.id + 'codeValue' + i, item)
        codeValue.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 40)
        codeValue.textFont(viewUtils.font(24))
        codeValue.dataI18n = 'recordQueryView.codeValue'

        const time = dxUi.Label.build(item.id + 'time' + i, item)
        time.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 75)
        time.textFont(viewUtils.font(24))
        time.dataI18n = 'recordQueryView.time'

        const timeValue = dxUi.Label.build(item.id + 'timeValue' + i, item)
        timeValue.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 75)
        timeValue.textFont(viewUtils.font(24))
        timeValue.dataI18n = 'recordQueryView.timeValue'

        const result = dxUi.Label.build(item.id + 'result' + i, item)
        result.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 110)
        result.textFont(viewUtils.font(24))
        result.dataI18n = 'recordQueryView.result'

        const resultValue = dxUi.Label.build(item.id + 'resultValue' + i, item)
        resultValue.align(dxUi.Utils.ALIGN.TOP_LEFT, 0, 110)
        resultValue.textFont(viewUtils.font(24))
        resultValue.dataI18n = 'recordQueryView.resultValue'

        const moreBtn = dxUi.Button.build(item.id + 'btn' + i, item)
        moreBtn.align(dxUi.Utils.ALIGN.TOP_RIGHT, 0, 10)
        const moreBtnLbl = dxUi.Label.build(item.id + 'btnLbl' + i, moreBtn)
        moreBtnLbl.textFont(viewUtils.font(24))
        moreBtnLbl.text('More+')

        moreBtn.on(dxUi.Utils.EVENT.CLICK, () => {
            recordQueryView.nowRecord = recordQueryView.recordData.data[i]
            dxUi.loadMain(recordQueryDetailView.screenMain)
        })

        recordQueryView.items.push({
            item,
            name,
            id: codeValue,
            idLbl: code,
            time: timeValue,
            timeLbl: time,
            result: resultValue,
            resultLbl: result
        })
    }

    const pageNextBtn = dxUi.Button.build(screenMain.id + 'pageNextBtn', screenMain)
    recordQueryView.pageNextBtn = pageNextBtn
    pageNextBtn.bgColor(0x000000)
    const pageNextLbl = dxUi.Label.build(screenMain.id + 'pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextBtn.align(dxUi.Utils.ALIGN.BOTTOM_RIGHT, -20, -52)
    pageNextBtn.textFont(viewUtils.font(20))
    const pagePrevBtn = dxUi.Button.build(screenMain.id + 'pagePrevBtn', screenMain)
    recordQueryView.pagePrevBtn = pagePrevBtn
    pagePrevBtn.bgColor(0x000000)
    const pagePrevLbl = dxUi.Label.build(screenMain.id + 'pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevBtn.align(dxUi.Utils.ALIGN.BOTTOM_LEFT, 20, -52)
    pagePrevBtn.textFont(viewUtils.font(20))
    const pageSelect = dxUi.Dropdown.build(screenMain.id + 'pageSelect', screenMain)
    recordQueryView.pageSelect = pageSelect
    pageSelect.textFont(viewUtils.font(22))
    pageSelect.getList().textFont(viewUtils.font(22))
    pageSelect.setSize(150, 55)
    pageSelect.setSymbol('/app/code/resource/image/down.png')
    pageSelect.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -50)
    pageSelect.setOptions([])
    pageSelect.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
        refreshRecordList(pageSelect.getSelected(), 6)
        recordQueryView.nowPage = pageSelect.getSelected()
    })
    pageNextBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        refreshRecordList(pageSelect.getSelected() + 1, 6)
        if (!recordQueryView.nowPage) {
            recordQueryView.nowPage = 0
        }
        recordQueryView.nowPage += 1
    })
    pagePrevBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        refreshRecordList(pageSelect.getSelected() - 1, 6)
        if (!recordQueryView.nowPage) {
            recordQueryView.nowPage = 0
        }
        recordQueryView.nowPage -= 1
    })
}

// Refresh list
function refreshRecordList (page, size) {
    const recordData = screen.getPassRecord(page, size)
    recordQueryView.recordData = recordData

    const data = recordData.data
    const totalPage = recordData.totalPage
    const totalSize = recordData.totalSize
    const currentPage = recordData.currentPage
    const language = screen.getConfig()['base.language']

    if (currentPage == 1) {
        recordQueryView.pagePrevBtn.disable(true)
        recordQueryView.pagePrevBtn.hide()
    } else {
        recordQueryView.pagePrevBtn.disable(false)
        recordQueryView.pagePrevBtn.show()
    }
    if (currentPage == totalPage || totalPage == 0) {
        recordQueryView.pageNextBtn.disable(true)
        recordQueryView.pageNextBtn.hide()
    } else {
        recordQueryView.pageNextBtn.disable(false)
        recordQueryView.pageNextBtn.show()
    }
    if (totalPage == 0 || totalPage == 1) {
        recordQueryView.pageSelect.hide()
    } else {
        recordQueryView.pageSelect.show()
    }

    recordQueryView.pageSelect.setOptions(Array.from({ length: totalPage }, (_, index) => String(index + 1)))
    recordQueryView.pageSelect.setSelected(currentPage - 1)

    if (!data || data.length == 0) {
        recordQueryView.items.forEach(item => {
            item.item.hide()
        })
        recordQueryView.empty.show()
        return
    } else {
        recordQueryView.empty.hide()
    }

    recordQueryView.items.forEach((item, index) => {
        if (!data[index]) {
            item.item.hide()
        } else {
            item.item.show()
            let extra
            try {
                extra = JSON.parse(data[index].extra)
            } catch (error) {
            }
            if (extra && extra.name) {
                item.name.text(extra.name)
            } else {
                item.name.text(i18n.t('recordQueryView.stranger'))
            }
            item.id.text(":" + data[index].userId)
            item.id.alignTo(item.idLbl, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)

            const t = new Date(data[index].time * 1000)


            // Pad zero function
            const pad = (n) => n < 10 ? `0${n}` : n;

            item.time.text(":" + `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
            // item.time.text(":" + data[index].time)
            item.time.alignTo(item.timeLbl, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)

            let msg = ""
            switch (data[index].type) {
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
            if (data[index].result == 0) {
                msg += i18n.t('recordQueryView.success')
            } else {
                msg += i18n.t('recordQueryView.fail')
            }
            item.result.text(":" + msg)
            item.result.alignTo(item.resultLbl, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)
        }
    })
}
export default recordQueryView
