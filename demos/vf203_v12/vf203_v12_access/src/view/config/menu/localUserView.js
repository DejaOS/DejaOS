import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import pinyin from '../../pinyin/pinyin.js'
import localUserAddView from './localUser/localUserAddView.js'
import faceEnterView from './localUser/faceEnterView.js'
import screen from '../../../screen.js'
const localUserView = {}
localUserView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('localUserView', dxui.Utils.LAYER.MAIN)
    localUserView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        localUserView.nowPage = localUserView.nowPage ? localUserView.nowPage : 0
        let users = screen.getUsers(localUserView.nowPage, 6)
        while (users.data.length == 0 && localUserView.nowPage > 0) {
            localUserView.nowPage -= 1
            users = screen.getUsers(localUserView.nowPage, 6)
        }
        if (users.data.length > 0) {
            // localUserView.initData([{ id: "1", name: '张三' }, { id: "2", name: '李四' }, { id: "3", name: '王五' }, { id: "4", name: '赵六' }, { id: "5", name: '孙七' }, { id: "6", name: '周八' }, { id: "7", name: '吴九' }, { id: "8", name: '郑十' }, { id: "9", name: '陈十一' }, { id: "10", name: '赵十二' }, { id: "11", name: '孙十三' }, { id: "12", name: '周十四' }, { id: "13", name: '吴十五' }, { id: "14", name: '郑十六' }, { id: "15", name: '陈十七' }, { id: "16", name: '赵十八' }, { id: "17", name: '孙十九' }, { id: "20", name: '周二十' },])
            localUserView.initData(users.data)
        } else {
            localUserView.initData()
        }
        // 刷新分页信息
        refreshPageInfo(users)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'localUserViewTitle', 'localUserView.title', () => { localUserView.nowPage = 0 })
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const empty = dxui.Image.build('empty', screenMain)
    localUserView.empty = empty
    empty.align(dxui.Utils.ALIGN.TOP_MID, 0, 218)
    empty.source('/app/code/resource/image/empty.png')

    const emptyLbl = dxui.Label.build('emptyLbl', screenMain)
    localUserView.emptyLbl = emptyLbl
    emptyLbl.textFont(viewUtils.font(26))
    emptyLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 479)
    emptyLbl.dataI18n = 'localUserView.empty'
    emptyLbl.textColor(0x888888)

    const userList = dxui.View.build('userList', screenMain)
    viewUtils._clearStyle(userList)
    localUserView.userList = userList
    userList.setSize(600, 570)
    userList.align(dxui.Utils.ALIGN.TOP_MID, 0, 142)
    userList.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    userList.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    userList.obj.lvObjSetStylePadGap(5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    userList.hide()

    const searchBox = dxui.View.build('searchBox', userList)
    viewUtils._clearStyle(searchBox)
    searchBox.setSize(600, 76)
    searchBox.bgOpa(0)
    searchBox.borderWidth(1)
    searchBox.setBorderColor(0xDEDEDE)
    searchBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const searchInput = viewUtils.input(searchBox, 'searchBoxInput', undefined, () => {
    }, 'localUserView.search')
    searchInput.setSize(300, 60)
    searchInput.align(dxui.Utils.ALIGN.LEFT_MID, 28, 0)

    const searchBtn = dxui.Button.build('searchBtn', searchBox)
    searchBtn.setSize(126, 44)
    searchBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -29, 0)
    searchBtn.bgColor(0xF6FAFA)
    searchBtn.radius(10)

    searchBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const users = screen.getUsers(0, 6, searchInput.text(), searchInput.text())
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        // pinyin.hide()
    })

    const searchBtnLbl = dxui.Label.build('searchBtnLbl', searchBtn)
    searchBtnLbl.dataI18n = 'localUserView.searchBtn'
    searchBtnLbl.textFont(viewUtils.font(26))
    searchBtnLbl.textColor(0x05AA8D)
    searchBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    localUserView.userItemList = []
    for (let i = 0; i < 6; i++) {
        const userItem = dxui.View.build('userItem' + i, userList)
        viewUtils._clearStyle(userItem)
        userItem.setSize(600, 76)
        userItem.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
        userItem.bgOpa(0)
        userItem.borderWidth(1)
        userItem.setBorderColor(0xDEDEDE)
        userItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        userItem.hide()

        const userItemId0 = dxui.Label.build('userItemId0' + i, userItem)
        userItemId0.text('ID：')
        userItemId0.textFont(viewUtils.font(26))
        userItemId0.align(dxui.Utils.ALIGN.LEFT_MID, 28, 0)

        const userItemId = dxui.Label.build('userItemId' + i, userItem)
        userItemId.text(i + '')
        userItemId.textFont(viewUtils.font(26))
        userItemId.align(dxui.Utils.ALIGN.LEFT_MID, 80, 0)
        userItemId.width(100)
        userItemId.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        const userItemName = dxui.Label.build('userItemName' + i, userItem)
        userItemName.text(' ')
        userItemName.textFont(viewUtils.font(26))
        userItemName.align(dxui.Utils.ALIGN.LEFT_MID, 220, 0)
        userItemName.width(200)
        userItemName.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        const userItemEdit = dxui.Button.build('userItemEdit' + i, userItem)
        userItemEdit.setSize(126, 44)
        userItemEdit.align(dxui.Utils.ALIGN.RIGHT_MID, -29, 0)
        userItemEdit.bgColor(0xF6FAFA)
        userItemEdit.radius(10)

        userItemEdit.on(dxui.Utils.EVENT.CLICK, () => {
            localUserAddView.isEdit(true)
            dxui.loadMain(localUserAddView.screenMain)

            let item = localUserView.userData.filter(item => {
                return item.id === userItemId.text().replace('ID：', '')
            })
            if (item) {
                item = item[0]
                const voucher = screen.getVoucher(item.id)
                Object.assign(item, voucher);

                localUserAddView.nowUser = item

                if (item.id) {
                    localUserAddView.addID(item.id)
                }
                if (item.name) {
                    localUserAddView.addName(item.name)
                }
                if (item.idCard) {
                    localUserAddView.addIDCard(item.idCard)
                }
                if (item.face) {
                    localUserAddView.addFace(item.face)
                }
                if (item.pwd) {
                    localUserAddView.addPwd(item.pwd)
                }
                if (item.card) {
                    localUserAddView.addCard(item.card)
                }
                localUserAddView.addType(item.type)
            }
        })

        const userItemEditLbl = dxui.Label.build('userItemEditLbl' + i, userItemEdit)
        userItemEditLbl.dataI18n = 'localUserView.edit'
        userItemEditLbl.textFont(viewUtils.font(26))
        userItemEditLbl.textColor(0x05AA8D)
        userItemEditLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

        localUserView.userItemList.push({ userItem, userItemId, userItemName })
    }

    const pageNextBtn = dxui.Button.build('pageNextBtn', screenMain)
    pageNextBtn.bgColor(0x000000)
    localUserView.pageNextBtn = pageNextBtn
    const pageNextLbl = dxui.Label.build('pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -20, -270)
    pageNextBtn.textFont(viewUtils.font(20))
    const pagePrevBtn = dxui.Button.build('pagePrevBtn', screenMain)
    pagePrevBtn.bgColor(0x000000)
    localUserView.pagePrevBtn = pagePrevBtn
    const pagePrevLbl = dxui.Label.build('pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 20, -270)
    pagePrevBtn.textFont(viewUtils.font(20))

    pageNextBtn.on(dxui.Utils.EVENT.CLICK, () => {
        if (!localUserView.nowPage) {
            localUserView.nowPage = 0
        }
        localUserView.nowPage += 1
        const users = screen.getUsers(localUserView.nowPage, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })
    pagePrevBtn.on(dxui.Utils.EVENT.CLICK, () => {
        if (!localUserView.nowPage) {
            localUserView.nowPage = 0
        }
        localUserView.nowPage -= 1
        const users = screen.getUsers(localUserView.nowPage, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })

    const pageSelect = dxui.Dropdown.build('pageSelect', screenMain)
    localUserView.pageSelect = pageSelect
    pageSelect.align(dxui.Utils.ALIGN.BOTTOM_MID, -50, -260)
    pageSelect.textFont(viewUtils.font(22))
    pageSelect.getList().textFont(viewUtils.font(22))
    pageSelect.setSize(150, 55)
    pageSelect.setSymbol('/app/code/resource/image/down.png')
    pageSelect.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        localUserView.nowPage = pageSelect.getSelected()
        const users = screen.getUsers(localUserView.nowPage, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })
    const pageTotal = viewUtils.input(screenMain, screenMain.id + 'pageInput')
    localUserView.pageTotal = pageTotal
    pageTotal.setSize(100, 55)
    pageTotal.alignTo(pageSelect, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0,0)
    pageTotal.text(" ")
    pageTotal.disable(true)

    const syncBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'syncBtn', 'localUserView.sync', () => {
    }, 0xEAEAEA, 0x000000)
    syncBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -184)
    localUserView.syncBtn = syncBtn
    syncBtn.hide()

    syncBtn.on(dxui.Utils.EVENT.CLICK, () => {
        viewUtils.confirmOpen('localUserView.attention', 'localUserView.attentionContent', () => {
            viewUtils.confirmOpen('localUserView.tip', 'localUserView.tipContent')
        })
    })

    const addBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'addBtn', 'localUserView.add', () => {
        localUserAddView.isEdit(false)
        dxui.loadMain(localUserAddView.screenMain)
    })
    addBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)
}

localUserView.initData = function (data) {
    // 当前页的人员信息
    localUserView.userData = data
    localUserView.refresh(data)
}

localUserView.refresh = function (data) {
    if (data === undefined || data === null) {
        localUserView.empty.show()
        localUserView.emptyLbl.show()
        localUserView.syncBtn.hide()
        localUserView.userList.hide()
        return
    }

    localUserView.userItemList.forEach(item => {
        item.userItem.hide()
    })

    // 渲染人员列表
    data.forEach((item, index) => {
        if (index >= localUserView.userItemList.length) {
            return
        }
        localUserView.userItemList[index].userItemId.text(item.id)
        localUserView.userItemList[index].userItemName.text(item.name)
        localUserView.userItemList[index].userItem.show()
    })

    localUserView.empty.hide()
    localUserView.emptyLbl.hide()
    // localUserView.syncBtn.show()
    localUserView.userList.show()
}

function refreshPageInfo(users) {
    if (users.currentPage == 1) {
        localUserView.pagePrevBtn.disable(true)
        localUserView.pagePrevBtn.hide()
    } else {
        localUserView.pagePrevBtn.disable(false)
        localUserView.pagePrevBtn.show()
    }
    if (users.currentPage == users.totalPage || users.totalPage == 0) {
        localUserView.pageNextBtn.disable(true)
        localUserView.pageNextBtn.hide()
    } else {
        localUserView.pageNextBtn.disable(false)
        localUserView.pageNextBtn.show()
    }
    if (users.totalPage == 0 || users.totalPage == 1) {
        localUserView.pageSelect.hide()
        localUserView.pageTotal.hide()
    } else {
        localUserView.pageSelect.show()
        localUserView.pageTotal.show()
    }
    localUserView.pageSelect.setOptions(Array.from({ length: users.totalPage }, (_, index) => String(index + 1)))
    localUserView.pageSelect.setSelected(users.currentPage - 1)
    localUserView.pageTotal.text("/ " + users.totalPage)
}
export default localUserView
