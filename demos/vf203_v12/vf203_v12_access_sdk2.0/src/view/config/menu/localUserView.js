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
            localUserView.initData(users.data)
        } else {
            localUserView.initData()
        }
        if (screen.isInternationalVersion()) {
            localUserView.searchInput.setKeyboardMode(0)
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

    const searchInput = viewUtils.input(searchBox, 'searchBoxInput', 1, () => {
    }, 'localUserView.search')
    localUserView.searchInput = searchInput
    searchInput.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (60 / 1024))
    searchInput.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (28 / 600), 0)

    const searchBtn = dxui.Button.build('searchBtn', searchBox)
    searchBtn.setSize(screen.screenSize.width * (126 / 600), screen.screenSize.height * (44 / 1024))
    searchBtn.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (29 / 600), 0)
    searchBtn.bgColor(0xF6FAFA)
    searchBtn.radius(screen.screenSize.width * (10 / 600))

    searchBtn.on(dxui.Utils.EVENT.CLICK, () => {
        localUserView.nowPage = 0
        const users = screen.getUsers(0, 6, searchInput.text())
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
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
                if (item.fingerId) {
                    localUserAddView.addFinger(item.fingerId)
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

    const pageNextBtn = dxui.Button.build(screenMain.id + 'pageNextBtn', screenMain)
    localUserView.pageNextBtn = pageNextBtn
    pageNextBtn.bgColor(0x000000)
    pageNextBtn.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.height * (80 / 1024))
    pageNextBtn.radius(screen.screenSize.width * (10 / 600))
    const pageNextLbl = dxui.Label.build(screenMain.id + 'pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextLbl.textFont(viewUtils.font(32))
    pageNextLbl.textColor(0xffffff)
    pageNextLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pageNextBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -screen.screenSize.width * (20 / 600), -screen.screenSize.height * (230 / 1024))

    const pagePrevBtn = dxui.Button.build(screenMain.id + 'pagePrevBtn', screenMain)
    localUserView.pagePrevBtn = pagePrevBtn
    pagePrevBtn.bgColor(0x000000)
    pagePrevBtn.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.height * (80 / 1024))
    pagePrevBtn.radius(screen.screenSize.width * (10 / 600))
    const pagePrevLbl = dxui.Label.build(screenMain.id + 'pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevLbl.textFont(viewUtils.font(32))
    pagePrevLbl.textColor(0xffffff)
    pagePrevLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pagePrevBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, screen.screenSize.width * (20 / 600), -screen.screenSize.height * (230 / 1024))

    const pageMidCont = dxui.View.build(screenMain.id + 'pageMidCont', screenMain)
    const originalY = -screen.screenSize.height * (230 / 1024)
    const keyboardUpY = -screen.screenSize.height * (320 / 1024)
    viewUtils._clearStyle(pageMidCont)
    pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, originalY)
    pageMidCont.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (60 / 1024))
    pageMidCont.bgOpa(0)
    pageMidCont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    pageMidCont.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const pageSelect = viewUtils.input(pageMidCont, screenMain.id + 'pageSelect', 2, () => {
        let pageNum = Number(pageSelect.text())
        const totalPage = localUserView.lastUsers ? localUserView.lastUsers.totalPage : 1
        if (pageNum < 1) {
            pageNum = 1
        }
        if (pageNum > totalPage) {
            pageNum = totalPage
        }
        const pageIndex = pageNum - 1
        const users = screen.getUsers(pageIndex, 6)
        localUserView.nowPage = pageIndex
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
        pageSelect.text(String(pageNum))
        pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, originalY)
    })
    localUserView.pageSelect = pageSelect
    pageSelect.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))

    pageSelect.on(dxui.Utils.EVENT.CLICK, () => {
        pageMidCont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, keyboardUpY)
    })

    pageNextBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const nextPage = (localUserView.nowPage || 0) + 1
        const users = screen.getUsers(nextPage, 6)
        localUserView.nowPage = nextPage
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })
    pagePrevBtn.on(dxui.Utils.EVENT.CLICK, () => {
        const prevPage = (localUserView.nowPage || 0) - 1
        const users = screen.getUsers(prevPage, 6)
        localUserView.nowPage = prevPage
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })

    const pageTotal = dxui.Label.build(screenMain.id + 'pageTotal', pageMidCont)
    localUserView.pageTotal = pageTotal
    pageTotal.text(" / 1")
    pageTotal.textFont(viewUtils.font(22))
    pageTotal.padLeft(screen.screenSize.width * (10 / 600))

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
    localUserView.lastUsers = users
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
    localUserView.pageSelect.text(String(users.currentPage))
    localUserView.pageTotal.text("/ " + users.totalPage)
}
export default localUserView
