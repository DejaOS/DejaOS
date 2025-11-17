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
        refreshRecordList(recordQueryView.nowPage ? recordQueryView.nowPage : 0, 3)
    })

    const empty = dxui.Image.build(screenMain.id + 'empty', screenMain)
    recordQueryView.empty = empty
    empty.source(screen.resourcePath.imagePath + '/empty.png')
    empty.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    empty.hide()

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'recordQueryViewTitle', 'recordQueryView.title', () => { recordQueryView.nowPage = 0 })
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const box = dxui.View.build(screenMain.id + 'box', screenMain)
    viewUtils._clearStyle(box)
    box.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (150 / 1024))
    box.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (800 / 1024))
    box.bgOpa(0)
    box.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    box.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    box.obj.lvObjSetStylePadGap(screen.screenSize.width * (15 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    // box.hide()


    recordQueryView.items = []
    for (let i = 0; i < 3; i++) {
        // 创建主容器，每个项目占更大空间
        const item = dxui.View.build(box.id + 'item' + i, box)
        viewUtils._clearStyle(item)
        item.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (240 / 1024)) // 高度从120增加到240，正好是原来的2倍
        item.bgColor(0xf5f5f5) // 灰色背景
        item.radius(screen.screenSize.width * (8 / 600)) // 圆角
        item.padAll(screen.screenSize.height * (15 / 1024)) // 内边距

        // 创建内容容器
        const content = dxui.View.build(item.id + 'content' + i, item)
        viewUtils._clearStyle(content)
        content.setSize(screen.screenSize.width * (530 / 600), screen.screenSize.height * (210 / 1024))
        content.bgOpa(0)
        content.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)

        // 姓名标签 - 更大字体
        const name = dxui.Label.build(content.id + 'name' + i, content)
        name.align(dxui.Utils.ALIGN.TOP_LEFT, 0, screen.screenSize.height * (5 / 1024))
        name.textFont(viewUtils.font(28)) // 从22增加到28
        name.textColor(0x333333)

        // ID标签和值
        const code = dxui.Label.build(content.id + 'code' + i, content)
        code.setPos(0, screen.screenSize.height * (50 / 1024))
        code.setSize(screen.screenSize.width * (120 / 600), screen.screenSize.height * (30 / 1024))
        code.textFont(viewUtils.font(24)) // 从22增加到24
        code.dataI18n = 'recordQueryView.code'
        code.textColor(0x666666)

        const codeValue = dxui.Label.build(content.id + 'codeValue' + i, content)
        codeValue.setPos(screen.screenSize.width * (120 / 600), screen.screenSize.height * (50 / 1024))
        codeValue.setSize(screen.screenSize.width * (200 / 600), screen.screenSize.height * (30 / 1024))
        codeValue.textFont(viewUtils.font(24)) // 从22增加到24
        codeValue.textColor(0x333333)

        // 时间标签和值
        const time = dxui.Label.build(content.id + 'time' + i, content)
        time.setPos(0, screen.screenSize.height * (90 / 1024))
        time.setSize(screen.screenSize.width * (120 / 600), screen.screenSize.height * (30 / 1024))
        time.textFont(viewUtils.font(24)) // 从22增加到24
        time.dataI18n = 'recordQueryView.time'
        time.textColor(0x666666)

        const timeValue = dxui.Label.build(content.id + 'timeValue' + i, content)
        timeValue.setPos(screen.screenSize.width * (120 / 600), screen.screenSize.height * (90 / 1024))
        timeValue.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (30 / 1024))
        timeValue.textFont(viewUtils.font(24)) // 从22增加到24
        timeValue.textColor(0x333333)

        // 结果标签和值
        const result = dxui.Label.build(content.id + 'result' + i, content)
        result.setPos(0, screen.screenSize.height * (130 / 1024))
        result.setSize(screen.screenSize.width * (120 / 600), screen.screenSize.height * (30 / 1024))
        result.textFont(viewUtils.font(24)) // 从22增加到24
        result.dataI18n = 'recordQueryView.result'
        result.textColor(0x666666)

        const resultValue = dxui.Label.build(content.id + 'resultValue' + i, content)
        resultValue.setPos(screen.screenSize.width * (120 / 600), screen.screenSize.height * (130 / 1024))
        resultValue.setSize(screen.screenSize.width * (200 / 600), screen.screenSize.height * (30 / 1024))
        resultValue.textFont(viewUtils.font(24)) // 从22增加到24
        resultValue.textColor(0x333333)

        // More按钮
        const moreBtn = dxui.Button.build(content.id + 'btn' + i, content)
        moreBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, screen.screenSize.height * (10 / 1024))
        moreBtn.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (50 / 1024))
        moreBtn.bgColor(0x007bff)
        moreBtn.radius(screen.screenSize.width * (6 / 600))
        const moreBtnLbl = dxui.Label.build(content.id + 'btnLbl' + i, moreBtn)
        moreBtnLbl.textFont(viewUtils.font(22))
        moreBtnLbl.text('More+')
        moreBtnLbl.textColor(0xffffff)

        moreBtn.on(dxui.Utils.EVENT.CLICK, () => {
            recordQueryView.nowRecord = recordQueryView.recordData.data[i]
            dxui.loadMain(recordQueryDetailView.screenMain)
        })

        recordQueryView.items.push({
            item,
            name,
            id: codeValue,
            idLbl: code,
            timeStamp: timeValue,
            timeLbl: time,
            result: resultValue,
            resultLbl: result
        })
    }

    const pageNextBtn = dxui.Button.build(screenMain.id + 'pageNextBtn', screenMain)
    recordQueryView.pageNextBtn = pageNextBtn
    pageNextBtn.bgColor(0x000000)
    pageNextBtn.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.height * (80 / 1024)) // 进一步增加按钮尺寸
    pageNextBtn.radius(screen.screenSize.width * (10 / 600)) // 增加圆角
    const pageNextLbl = dxui.Label.build(screenMain.id + 'pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextLbl.textFont(viewUtils.font(32)) // 进一步增大字体
    pageNextLbl.textColor(0xffffff) // 白色文字
    pageNextLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pageNextBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -screen.screenSize.width * (20 / 600), -screen.screenSize.height * (30 / 1024)) // 往下移动20px

    const pagePrevBtn = dxui.Button.build(screenMain.id + 'pagePrevBtn', screenMain)
    recordQueryView.pagePrevBtn = pagePrevBtn
    pagePrevBtn.bgColor(0x000000)
    pagePrevBtn.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.height * (80 / 1024)) // 进一步增加按钮尺寸
    pagePrevBtn.radius(screen.screenSize.width * (10 / 600)) // 增加圆角
    const pagePrevLbl = dxui.Label.build(screenMain.id + 'pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevLbl.textFont(viewUtils.font(32)) // 进一步增大字体
    pagePrevLbl.textColor(0xffffff) // 白色文字
    pagePrevLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pagePrevBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, screen.screenSize.width * (20 / 600), -screen.screenSize.height * (30 / 1024)) // 往下移动20px

    const pageMidCont = dxui.View.build(screenMain.id + 'pageMidCont', screenMain)
    const originalY = -screen.screenSize.height * (42 / 1024)
    const keyboardUpY = -screen.screenSize.height * (300 / 1024) // Assumes keyboard height is around 400px
    viewUtils._clearStyle(pageMidCont)
    pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, originalY)
    pageMidCont.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (60 / 1024)) // Increase width and set a fixed height
    pageMidCont.bgOpa(0)
    pageMidCont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    pageMidCont.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const pageSelect = viewUtils.input(pageMidCont, screenMain.id + 'pageSelect', 2, () => {
        let pageNum = Number(pageSelect.text())
        const totalPage = recordQueryView.recordData.totalPage

        // Auto-correct input value
        if (pageNum < 1) {
            pageNum = 1
        }
        if (pageNum > totalPage) {
            pageNum = totalPage
        }

        const pageIndex = pageNum - 1
        refreshRecordList(pageIndex, 3)
        recordQueryView.nowPage = pageIndex
        // Update input text with the corrected value
        pageSelect.text(String(pageNum))

        // After input is handled, move the container back to its original position
        pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, originalY)
    })
    recordQueryView.pageSelect = pageSelect
    pageSelect.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))

    // Handle container movement when keyboard appears/disappears
    pageSelect.on(dxui.Utils.EVENT.CLICK, () => {
        pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, keyboardUpY)
    });

    pageNextBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const nextPage = (recordQueryView.nowPage || 0) + 1
        refreshRecordList(nextPage, 3)
        recordQueryView.nowPage = nextPage
    })
    pagePrevBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const prevPage = (recordQueryView.nowPage || 0) - 1
        refreshRecordList(prevPage, 3)
        recordQueryView.nowPage = prevPage
    })
    const pageTotal = dxui.Label.build(screenMain.id + 'pageTotal', pageMidCont)
    recordQueryView.pageTotal = pageTotal
    pageTotal.text(" / 1")
    pageTotal.textFont(viewUtils.font(22))
    pageTotal.padLeft(screen.screenSize.width * (10 / 600))
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

    // Update the input field with the current page number
    recordQueryView.pageSelect.text(String(currentPage))
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
            item.id.text(": " + data[index].userId)

            const t = new Date(data[index].timeStamp * 1000)


            // 补零函数
            const pad = (n) => n < 10 ? `0${n}` : n;

            item.timeStamp.text(": " + `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)

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
                item.result.textColor(0x00ff00)
            } else {
                msg += i18n.t('recordQueryView.fail')
                item.result.textColor(0xff0000)
            }
            item.result.text(": " + msg)
        }
    })
}
export default recordQueryView
