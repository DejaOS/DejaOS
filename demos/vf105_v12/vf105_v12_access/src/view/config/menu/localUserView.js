import dxUi from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import pinyin from '../../pinyin/pinyin.js'
import localUserAddView from './localUser/localUserAddView.js'
import faceEnterView from './localUser/faceEnterView.js'
import screen from '../../../screen.js'
const localUserView = {}
localUserView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('localUserView', dxUi.Utils.LAYER.MAIN)
    localUserView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        localUserView.nowPage = localUserView.nowPage ? localUserView.nowPage : 0
        let users = screen.getUsers(localUserView.nowPage, 6)
        while (users.data.length == 0 && localUserView.nowPage > 0) {
            localUserView.nowPage -= 1
            users = screen.getUsers(localUserView.nowPage, 6)
        }
        if (users.data.length > 0) {
            // localUserView.initData([{ id: "1", name: 'Zhang San' }, { id: "2", name: 'Li Si' }, { id: "3", name: 'Wang Wu' }, { id: "4", name: 'Zhao Liu' }, { id: "5", name: 'Sun Qi' }, { id: "6", name: 'Zhou Ba' }, { id: "7", name: 'Wu Jiu' }, { id: "8", name: 'Zheng Shi' }, { id: "9", name: 'Chen Shiyi' }, { id: "10", name: 'Zhao Shier' }, { id: "11", name: 'Sun Shisan' }, { id: "12", name: 'Zhou Shisi' }, { id: "13", name: 'Wu Shiwu' }, { id: "14", name: 'Zheng Shiliu' }, { id: "15", name: 'Chen Shiqi' }, { id: "16", name: 'Zhao Shiba' }, { id: "17", name: 'Sun Shijiu' }, { id: "20", name: 'Zhou Ershi' },])
            localUserView.initData(users.data)
        } else {
            localUserView.initData()
        }
        // Refresh pagination information
        refreshPageInfo(users)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'localUserViewTitle', 'localUserView.title', () => { localUserView.nowPage = 0 })
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const empty = dxUi.Image.build('empty', screenMain)
    localUserView.empty = empty
    empty.align(dxUi.Utils.ALIGN.TOP_MID, 0, 218)
    empty.source('/app/code/resource/image/empty.png')

    const emptyLbl = dxUi.Label.build('emptyLbl', screenMain)
    localUserView.emptyLbl = emptyLbl
    emptyLbl.textFont(viewUtils.font(26))
    emptyLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 479)
    emptyLbl.dataI18n = 'localUserView.empty'
    emptyLbl.textColor(0x888888)

    const userList = dxUi.View.build('userList', screenMain)
    viewUtils._clearStyle(userList)
    localUserView.userList = userList
    userList.setSize(screen.screenSize.width, 570)
    userList.align(dxUi.Utils.ALIGN.TOP_MID, 0, 142)
    userList.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    userList.flexAlign(dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    userList.obj.lvObjSetStylePadGap(5, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    userList.hide()

    const searchBox = dxUi.View.build('searchBox', userList)
    viewUtils._clearStyle(searchBox)
    searchBox.setSize(screen.screenSize.width, 76)
    searchBox.bgOpa(0)
    searchBox.borderWidth(1)
    searchBox.setBorderColor(0xDEDEDE)
    searchBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const searchInput = viewUtils.input(searchBox, 'searchBoxInput', undefined, () => {
    }, 'localUserView.search')
    searchInput.setSize(screen.screenSize.width / 2, 60)
    searchInput.align(dxUi.Utils.ALIGN.LEFT_MID, 28, 0)

    const searchBtn = dxUi.Button.build('searchBtn', searchBox)
    searchBtn.setSize(126, 44)
    searchBtn.align(dxUi.Utils.ALIGN.RIGHT_MID, -29, 0)
    searchBtn.bgColor(0xF6FAFA)
    searchBtn.radius(10)

    searchBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        const users = screen.getUsers(0, 6, searchInput.text(), searchInput.text())
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        // pinyin.hide()
    })

    const searchBtnLbl = dxUi.Label.build('searchBtnLbl', searchBtn)
    searchBtnLbl.dataI18n = 'localUserView.searchBtn'
    searchBtnLbl.textFont(viewUtils.font(26))
    searchBtnLbl.textColor(0x05AA8D)
    searchBtnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    localUserView.userItemList = []
    for (let i = 0; i < 6; i++) {
        const userItem = dxUi.View.build('userItem' + i, userList)
        viewUtils._clearStyle(userItem)
        userItem.setSize(screen.screenSize.width, 76)
        userItem.align(dxUi.Utils.ALIGN.TOP_MID, 0, 0)
        userItem.bgOpa(0)
        userItem.borderWidth(1)
        userItem.setBorderColor(0xDEDEDE)
        userItem.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        userItem.hide()

        const userItemId0 = dxUi.Label.build('userItemId0' + i, userItem)
        userItemId0.text('ID：')
        userItemId0.textFont(viewUtils.font(26))
        userItemId0.align(dxUi.Utils.ALIGN.LEFT_MID, 28, 0)

        const userItemId = dxUi.Label.build('userItemId' + i, userItem)
        userItemId.text(i + '')
        userItemId.textFont(viewUtils.font(26))
        userItemId.align(dxUi.Utils.ALIGN.LEFT_MID, 80, 0)
        userItemId.width(100)
        userItemId.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        const userItemName = dxUi.Label.build('userItemName' + i, userItem)
        userItemName.text('')
        userItemName.textFont(viewUtils.font(26))
        userItemName.align(dxUi.Utils.ALIGN.LEFT_MID, 220, 0)
        userItemName.width(200)
        userItemName.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        const userItemEdit = dxUi.Button.build('userItemEdit' + i, userItem)
        userItemEdit.setSize(126, 44)
        userItemEdit.align(dxUi.Utils.ALIGN.RIGHT_MID, -29, 0)
        userItemEdit.bgColor(0xF6FAFA)
        userItemEdit.radius(10)

        userItemEdit.on(dxUi.Utils.EVENT.CLICK, () => {
            localUserAddView.isEdit(true)
            dxUi.loadMain(localUserAddView.screenMain)

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

        const userItemEditLbl = dxUi.Label.build('userItemEditLbl' + i, userItemEdit)
        userItemEditLbl.dataI18n = 'localUserView.edit'
        userItemEditLbl.textFont(viewUtils.font(26))
        userItemEditLbl.textColor(0x05AA8D)
        userItemEditLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

        localUserView.userItemList.push({ userItem, userItemId, userItemName })
    }

    const pageNextBtn = dxUi.Button.build('pageNextBtn', screenMain)
    pageNextBtn.bgColor(0x000000)
    localUserView.pageNextBtn = pageNextBtn
    const pageNextLbl = dxUi.Label.build('pageNextLbl', pageNextBtn)
    pageNextLbl.text("→")
    pageNextBtn.align(dxUi.Utils.ALIGN.BOTTOM_RIGHT, -20, -372)
    pageNextBtn.textFont(viewUtils.font(20))
    const pagePrevBtn = dxUi.Button.build('pagePrevBtn', screenMain)
    pagePrevBtn.bgColor(0x000000)
    localUserView.pagePrevBtn = pagePrevBtn
    const pagePrevLbl = dxUi.Label.build('pagePrevLbl', pagePrevBtn)
    pagePrevLbl.text("←")
    pagePrevBtn.align(dxUi.Utils.ALIGN.BOTTOM_LEFT, 20, -372)
    pagePrevBtn.textFont(viewUtils.font(20))

    pageNextBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        if (!localUserView.nowPage) {
            localUserView.nowPage = 0
        }
        localUserView.pageNum += 1
        const users = screen.getUsers(localUserView.pageNum, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })
    pagePrevBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        if (!localUserView.nowPage) {
            localUserView.nowPage = 0
        }
        localUserView.pageNum -= 1
        const users = screen.getUsers(localUserView.pageNum, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })

    const pageSelect = dxUi.Dropdown.build('pageSelect', screenMain)
    localUserView.pageSelect = pageSelect
    pageSelect.textFont(viewUtils.font(22))
    pageSelect.getList().textFont(viewUtils.font(22))
    pageSelect.setSize(150, 55)
    pageSelect.setSymbol('/app/code/resource/image/down.png')
    pageSelect.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -370)
    pageSelect.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
        localUserView.pageNum = pageSelect.getSelected()
        const users = screen.getUsers(localUserView.pageNum, 6)
        if (users.data) {
            localUserView.initData(users.data)
        } else {
            localUserView.initData([])
        }
        refreshPageInfo(users)
    })

    const syncBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'syncBtn', 'localUserView.sync', () => {
    }, 0xEAEAEA, 0x000000)
    syncBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -204)
    localUserView.syncBtn = syncBtn
    syncBtn.hide()

    syncBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        viewUtils.confirmOpen('localUserView.attention', 'localUserView.attentionContent', () => {
            viewUtils.confirmOpen('localUserView.tip', 'localUserView.tipContent')
        })
    })

    const addBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'addBtn', 'localUserView.add', () => {
        localUserAddView.isEdit(false)
        dxUi.loadMain(localUserAddView.screenMain)
    })
    addBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
}

localUserView.initData = function (data) {
    // Current page user information
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

    // Render user list
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
    } else {
        localUserView.pageSelect.show()
    }
    localUserView.pageSelect.setOptions(Array.from({ length: users.totalPage }, (_, index) => String(index + 1)))
    localUserView.pageSelect.setSelected(users.currentPage - 1)
}
export default localUserView
