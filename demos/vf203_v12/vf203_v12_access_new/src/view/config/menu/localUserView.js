import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import localUserAddView from './localUser/localUserAddView.js'
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
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const empty = dxui.Image.build('empty', screenMain)
    localUserView.empty = empty
    empty.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (218 / 1024))
    empty.source(screen.resourcePath.imagePath + '/empty.png')

    const emptyLbl = dxui.Label.build('emptyLbl', screenMain)
    localUserView.emptyLbl = emptyLbl
    emptyLbl.textFont(viewUtils.font(26))
    emptyLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (479 / 1024))
    emptyLbl.dataI18n = 'localUserView.empty'
    emptyLbl.textColor(0x888888)

    const userList = dxui.View.build('userList', screenMain)
    viewUtils._clearStyle(userList)
    localUserView.userList = userList
    userList.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (570 / 1024))
    userList.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (142 / 1024))
    userList.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    userList.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    userList.obj.lvObjSetStylePadGap(screen.screenSize.width * (5 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    userList.hide()

    const searchBox = dxui.View.build('searchBox', userList)
    viewUtils._clearStyle(searchBox)
    searchBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (76 / 1024))
    searchBox.bgOpa(0)
    searchBox.borderWidth(1)
    searchBox.setBorderColor(0xDEDEDE)
    searchBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const searchInput = viewUtils.input(searchBox, 'searchBoxInput', undefined, () => {
    }, 'localUserView.search')
    searchInput.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (60 / 1024))
    searchInput.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (28 / 600), 0)

    const searchBtn = dxui.Button.build('searchBtn', searchBox)
    searchBtn.setSize(screen.screenSize.width * (126 / 600), screen.screenSize.height * (44 / 1024))
    searchBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (29 / 600), 0)
    searchBtn.bgColor(0xF6FAFA)
    searchBtn.radius(screen.screenSize.width * (10 / 600))

    searchBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const users = screen.getUsers(0, 6, searchInput.text())
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
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
        userItem.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (76 / 1024))
        userItem.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
        userItem.bgOpa(0)
        userItem.borderWidth(1)
        userItem.setBorderColor(0xDEDEDE)
        userItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        userItem.hide()

        const userItemId = dxui.Label.build('userItemId' + i, userItem)
        userItemId.text(i + '')
        userItemId.textFont(viewUtils.font(26))
        userItemId.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (80 / 600), 0)
        userItemId.width(screen.screenSize.width * (100 / 600))
        userItemId.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
        userItemId.hide()

        const userItemName = dxui.Label.build('userItemName' + i, userItem)
        userItemName.text(' ')
        userItemName.textFont(viewUtils.font(26))
        userItemName.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (28 / 600), 0)
        userItemName.width(screen.screenSize.width * (200 / 600))
        userItemName.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        const userItemEdit = dxui.Button.build('userItemEdit' + i, userItem)
        userItemEdit.setSize(screen.screenSize.width * (126 / 600), screen.screenSize.height * (44 / 1024))
        userItemEdit.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (29 / 600), 0)
        userItemEdit.bgColor(0xF6FAFA)
        userItemEdit.radius(screen.screenSize.width * (10 / 600))

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
                    localUserAddView.addFace(item.face,item.feature)
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
    pageNextBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -screen.screenSize.width * (20 / 600), -screen.screenSize.height * (270 / 1024))
    pageNextBtn.textFont(viewUtils.font(20))
    const pagePrevBtn = dxui.Button.build('pagePrevBtn', screenMain)
    pagePrevBtn.bgColor(0x000000)
    localUserView.pagePrevBtn = pagePrevBtn
    const pagePrevLbl = dxui.Label.build('pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, screen.screenSize.width * (20 / 600), -screen.screenSize.height * (270 / 1024))
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
    pageSelect.align(dxui.Utils.ALIGN.BOTTOM_MID, -screen.screenSize.width * (50 / 600), -screen.screenSize.height * (260 / 1024))
    pageSelect.textFont(viewUtils.font(22))
    pageSelect.getList().textFont(viewUtils.font(22))
    pageSelect.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))
    pageSelect.setSymbol(screen.dropdownSymbol)
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
    pageTotal.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))
    pageTotal.alignTo(pageSelect, dxui.Utils.ALIGN.OUT_RIGHT_MID, 0,0)
    pageTotal.text(" ")
    pageTotal.disable(true)

    const addBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'addBtn', 'localUserView.add', () => {
        localUserAddView.isEdit(false)
        dxui.loadMain(localUserAddView.screenMain)
    })
    addBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
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
