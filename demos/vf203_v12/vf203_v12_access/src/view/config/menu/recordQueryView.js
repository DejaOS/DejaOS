import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
import recordQueryDetailView from './recordQuery/recordQueryDetailView.js'
const recordQueryView = {}
recordQueryView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('recordQueryView', dxui.Utils.LAYER.MAIN)
    recordQueryView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        refreshRecordList(recordQueryView.nowPage ? recordQueryView.nowPage : 0, 6)
    })

    const empty = dxui.Image.build(screenMain.id + 'empty', screenMain)
    recordQueryView.empty = empty
    empty.source('/app/code/resource/image/empty.png')
    empty.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    empty.hide()

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'recordQueryViewTitle', 'recordQueryView.title', () => { recordQueryView.nowPage = 0 })
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const box = dxui.View.build(screenMain.id + 'box', screenMain)
    viewUtils._clearStyle(box)
    box.align(dxui.Utils.ALIGN.TOP_MID, 0, 150)
    box.setSize(600, 800)
    box.bgOpa(0)
    box.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    box.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    box.obj.lvObjSetStylePadGap(5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    // box.hide()


    recordQueryView.items = []
    for (let i = 0; i < 6; i++) {
        const item = dxui.View.build(box.id + 'item' + i, box)
        viewUtils._clearStyle(item)
        item.setSize(560, 120)
        item.bgOpa(0)
        item.borderWidth(1)
        item.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        item.setBorderColor(0x767676)
        // item.bgColor(0xf7f7f7)

        const name = dxui.Label.build(item.id + 'name' + i, item)
        name.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 5)
        name.textFont(viewUtils.font(22))

        const code = dxui.Label.build(item.id + 'code' + i, item)
        code.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 30)
        code.textFont(viewUtils.font(22))
        code.dataI18n = 'recordQueryView.code'

        const codeValue = dxui.Label.build(item.id + 'codeValue' + i, item)
        codeValue.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 30)
        codeValue.textFont(viewUtils.font(22))
        codeValue.dataI18n = 'recordQueryView.codeValue'

        const time = dxui.Label.build(item.id + 'time' + i, item)
        time.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 55)
        time.textFont(viewUtils.font(22))
        time.dataI18n = 'recordQueryView.time'

        const timeValue = dxui.Label.build(item.id + 'timeValue' + i, item)
        timeValue.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 55)
        timeValue.textFont(viewUtils.font(22))
        timeValue.dataI18n = 'recordQueryView.timeValue'

        const result = dxui.Label.build(item.id + 'result' + i, item)
        result.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 80)
        result.textFont(viewUtils.font(22))
        result.dataI18n = 'recordQueryView.result'

        const resultValue = dxui.Label.build(item.id + 'resultValue' + i, item)
        resultValue.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 80)
        resultValue.textFont(viewUtils.font(22))
        resultValue.dataI18n = 'recordQueryView.resultValue'

        const moreBtn = dxui.Button.build(item.id + 'btn' + i, item)
        moreBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 10)
        const moreBtnLbl = dxui.Label.build(item.id + 'btnLbl' + i, moreBtn)
        moreBtnLbl.textFont(viewUtils.font(22))
        moreBtnLbl.text('More+')

        moreBtn.on(dxui.Utils.EVENT.CLICK, () => {
            recordQueryView.nowRecord = recordQueryView.recordData.data[i]
            dxui.loadMain(recordQueryDetailView.screenMain)
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

    const pageNextBtn = dxui.Button.build(screenMain.id + 'pageNextBtn', screenMain)
    recordQueryView.pageNextBtn = pageNextBtn
    pageNextBtn.bgColor(0x000000)
    const pageNextLbl = dxui.Label.build(screenMain.id + 'pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -20, -50)
    pageNextBtn.textFont(viewUtils.font(20))
    const pagePrevBtn = dxui.Button.build(screenMain.id + 'pagePrevBtn', screenMain)
    recordQueryView.pagePrevBtn = pagePrevBtn
    pagePrevBtn.bgColor(0x000000)
    const pagePrevLbl = dxui.Label.build(screenMain.id + 'pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 20, -50)
    pagePrevBtn.textFont(viewUtils.font(20))
    const pageSelect = dxui.Dropdown.build(screenMain.id + 'pageSelect', screenMain)
    recordQueryView.pageSelect = pageSelect
    pageSelect.align(dxui.Utils.ALIGN.BOTTOM_MID, -50, -42)
    pageSelect.textFont(viewUtils.font(22))
    pageSelect.getList().textFont(viewUtils.font(22))
    pageSelect.setSize(150, 55)
    pageSelect.setSymbol('/app/code/resource/image/down.png')
    pageSelect.setOptions([])
    pageSelect.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        refreshRecordList(pageSelect.getSelected(), 6)
        recordQueryView.nowPage = pageSelect.getSelected()
    })
    pageNextBtn.on(dxui.Utils.EVENT.CLICK, () => {
        refreshRecordList(pageSelect.getSelected() + 1, 6)
        if (!recordQueryView.nowPage) {
            recordQueryView.nowPage = 0
        }
        recordQueryView.nowPage += 1
    })
    pagePrevBtn.on(dxui.Utils.EVENT.CLICK, () => {
        refreshRecordList(pageSelect.getSelected() - 1, 6)
        if (!recordQueryView.nowPage) {
            recordQueryView.nowPage = 0
        }
        recordQueryView.nowPage -= 1
    })
    const pageTotal = viewUtils.input(screenMain, screenMain.id + 'pageInput')
    recordQueryView.pageTotal = pageTotal
    pageTotal.setSize(100, 55)
    pageTotal.alignTo(pageSelect, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0,0)
    pageTotal.text(" ")
    pageTotal.disable(true)
}

// 刷新列表
function refreshRecordList(page, size) {
    const recordData = screen.getPassRecord(page, size)
    recordQueryView.recordData = recordData

    const data = recordData.data
    const totalPage = recordData.totalPage
    const totalSize = recordData.totalSize
    const currentPage = recordData.currentPage


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
        recordQueryView.pageTotal.hide()
    } else {
        recordQueryView.pageSelect.show()
        recordQueryView.pageTotal.show()
    }

    recordQueryView.pageSelect.setOptions(Array.from({ length: totalPage }, (_, index) => String(index + 1)))
    recordQueryView.pageSelect.setSelected(currentPage - 1)
    recordQueryView.pageTotal.text("/ " + recordData.totalPage)
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
            item.id.alignTo(item.idLbl, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)

            const t = new Date(data[index].time * 1000)


            // 补零函数
            const pad = (n) => n < 10 ? `0${n}` : n;

            item.time.text(":" + `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
            // item.time.text(":" + data[index].time)
            item.time.alignTo(item.timeLbl, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)

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
                default:
                    break;
            }

            if (data[index].result == 0) {
                msg += i18n.t('recordQueryView.success')
            } else {
                msg += i18n.t('recordQueryView.fail')
            }
            item.result.text(":" + msg)
            item.result.alignTo(item.resultLbl, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0, 0)
        }
    })
}
export default recordQueryView
