import dxUi from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import log from '../../../../../dxmodules/dxLogger.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import localUserView from '../localUserView.js'
import faceEnterView from './faceEnterView.js'
import i18n from "../../../i18n.js"
import pinyin from '../../../pinyin/pinyin.js'
import screen from '../../../../screen.js'
import { getCurrentLanguage } from '../../../../common/utils/i18n.js'

const localUserAddView = {}
const dropdownDataCn = ['普通用户', '管理员']
const dropdownDataEn = ['User', 'Administrator']
const dropdownDataRu = ['Житель', 'Администратор']


localUserAddView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('localUserAddView', dxUi.Utils.LAYER.MAIN)
    localUserAddView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        refreshType()
        if (!localUserAddView.deleteBtn.isHide()) {
            // Editing user, ID cannot be changed
            localUserAddView.userInfo[0].input.disable(true)
        } else {
            localUserAddView.userInfo[0].input.disable(false)
        }
    })

    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
    })

    const titleBox = viewUtils.title(screenMain, localUserView.screenMain, 'localUserAddViewTitle', 'localUserAddView.title', undefined)
    localUserAddView.titleBox = titleBox
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const titleBox2 = viewUtils.title(screenMain, localUserView.screenMain, 'localUserAddViewTitle2', 'localUserAddView.title2', undefined)
    localUserAddView.titleBox2 = titleBox2
    titleBox2.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)
    titleBox2.hide()

    const addUserBox = dxUi.View.build('addUserBox', screenMain)
    viewUtils._clearStyle(addUserBox)
    addUserBox.setSize(screen.screenSize.width, 700)
    addUserBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 142)
    addUserBox.borderWidth(1)
    addUserBox.setBorderColor(0xDEDEDE)
    addUserBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)
    addUserBox.bgOpa(0)

    addUserBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    addUserBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START)
    addUserBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    localUserAddView.userInfo = [
        {
            title: 'localUserAddView.id',
            value: null,
            required: true,
            type: 'input',
            input: null
        },
        {
            title: 'localUserAddView.name',
            value: null,
            required: true,
            type: 'input',
            input: null
        },
        {
            title: 'localUserAddView.idCard',
            value: null,
            type: 'input',
            input: null
        },
        {
            title: 'localUserAddView.face',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            faceImg: null,
            deleteBtn: null
        },
        {
            title: 'localUserAddView.pwd',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            pwdLbl: null,
            deleteBtn: null
        },
        {
            title: 'localUserAddView.card',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            cardLbl: null,
            deleteBtn: null
        },
        {
            title: 'localUserAddView.type',
            value: null,
            type: 'dropdown'
        }
    ]

    localUserAddView.userInfo.forEach((item, index) => {
        const userBox = dxUi.View.build('userInfo' + index, addUserBox)
        viewUtils._clearStyle(userBox)
        userBox.setSize(700, 65)
        userBox.borderWidth(1)
        userBox.setBorderColor(0xDEDEDE)
        userBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        userBox.bgOpa(0)

        if (item.required) {
            const titleLbl = dxUi.Label.build('titleLblRequired' + index, userBox)
            titleLbl.textFont(viewUtils.font(22))
            titleLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
            titleLbl.text('*')
            titleLbl.textColor(0xFD5353)
        }

        const titleLbl = dxUi.Label.build('titleLbl' + index, userBox)
        titleLbl.textFont(viewUtils.font(22))
        titleLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 10, 0)
        titleLbl.dataI18n = item.title

        if (item.type === 'input') {
            const input = viewUtils.input(userBox, item.title, item.mode, undefined, "localUserAddView.input")
            input.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            input.textFont(viewUtils.font(22))
            input.setSize(260, 50)
            item.input = input

            input.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
                if (input.text() === "") {
                    return
                }
                switch (item.title) {
                    case 'localUserAddView.id':
                        localUserAddView.nowUser.id = input.text()
                        localUserAddView.nowUser.userId = input.text()
                        break;
                    case 'localUserAddView.name':
                        localUserAddView.nowUser.name = input.text()
                        break;
                    case 'localUserAddView.idCard':
                        localUserAddView.nowUser.idCard = input.text()
                        break;
                    default:
                        break;
                }
            })
        } else if (item.type === 'button') {
            const btn = dxUi.Button.build(item.title, userBox)
            item.btn = btn
            btn.setSize(150, 50)
            btn.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            btn.bgColor(0xEEEEEE)
            btn.radius(10)
            const btnLbl = dxUi.Label.build(item.title + 'btnLbl', btn)
            btnLbl.textFont(viewUtils.font(22))
            btnLbl.textColor(0x05AA8D)
            btnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

            const btnEdit = dxUi.Button.build(item.title + 'edit', userBox)
            item.btnEdit = btnEdit
            btnEdit.setSize(150, 50)
            btnEdit.align(dxUi.Utils.ALIGN.RIGHT_MID, -60, 0)
            btnEdit.bgColor(0xEEEEEE)
            btnEdit.radius(10)
            btnEdit.hide()
            const btnEditLbl = dxUi.Label.build(item.title + 'btnEditLbl', btnEdit)
            btnEditLbl.textFont(viewUtils.font(22))
            btnEditLbl.textColor(0x05AA8D)
            btnEditLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

            const deleteBtn = viewUtils.imageBtn(userBox, item.title + 'deleteBtn', '/app/code/resource/image/delete.png')
            item.deleteBtn = deleteBtn
            deleteBtn.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            deleteBtn.hide()

            if (item.title === 'localUserAddView.pwd') {
                btnLbl.dataI18n = 'localUserAddView.generate'
                btnEditLbl.dataI18n = 'localUserAddView.reset'

                // Password
                const pwdLbl = dxUi.Label.build(userBox.id + 'pwdLbl', userBox)
                item.pwdLbl = pwdLbl
                pwdLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 180, 0)
                pwdLbl.textColor(0x767676)
                pwdLbl.textFont(viewUtils.font(26))
                pwdLbl.hide()

                btn.on(dxUi.Utils.EVENT.CLICK, () => {
                    pwdBoxBg.show()
                    pwdBoxBg.moveForeground()
                    topView.changeTheme(false)
                    localUserAddView.changePwd()
                })

                btnEdit.on(dxUi.Utils.EVENT.CLICK, () => {
                    btn.send(dxUi.Utils.EVENT.CLICK)
                })

                deleteBtn.on(dxUi.Utils.EVENT.CLICK, () => {
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmPwd', () => {
                        localUserAddView.removePwd()
                    }, () => { })
                })

            } else {
                btnLbl.dataI18n = 'localUserAddView.enter'
                btnEditLbl.dataI18n = 'localUserAddView.edit'
            }

            if (item.title === 'localUserAddView.card') {
                // Card
                const cardLbl = dxUi.Label.build(userBox.id + 'cardLbl', userBox)
                item.cardLbl = cardLbl
                cardLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 180, 0)
                cardLbl.textColor(0x767676)
                cardLbl.textFont(viewUtils.font(26))
                cardLbl.hide()
                cardLbl.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                cardLbl.width(150)

                btn.on(dxUi.Utils.EVENT.CLICK, () => {
                    cardBoxBg.show()
                    cardBoxBg.moveForeground()
                    topView.changeTheme(false)
                    // Start card reading recognition
                    screen.getCardStart()
                })

                btnEdit.on(dxUi.Utils.EVENT.CLICK, () => {
                    btn.send(dxUi.Utils.EVENT.CLICK)
                })

                deleteBtn.on(dxUi.Utils.EVENT.CLICK, () => {
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmCard', () => {
                        localUserAddView.removeCard()
                    }, () => { })
                })
            }

            if (item.title === 'localUserAddView.face') {
                // userBox.height(220)
                btn.on(dxUi.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    dxUi.loadMain(faceEnterView.screenMain)
                })

                btnEdit.on(dxUi.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    dxUi.loadMain(faceEnterView.screenMain)
                })

                // Face image
                const facePreview = dxUi.Button.build('facePreview', userBox)
                item.facePreview = facePreview
                facePreview.bgColor(0x000000)
                facePreview.align(dxUi.Utils.ALIGN.LEFT_MID, 180, 0)
                const facePreviewLbl = dxUi.Label.build('facePreviewLbl', facePreview)
                facePreviewLbl.textFont(viewUtils.font(22))
                facePreviewLbl.dataI18n = "localUserAddView.preview"
                facePreview.on(dxUi.Utils.EVENT.CLICK, () => {
                    facePreviewBox.show()
                    facePreviewBox.moveForeground()
                })

                const facePreviewBox = dxUi.View.build('facePreviewBox', screenMain)
                viewUtils._clearStyle(facePreviewBox)
                facePreviewBox.hide()
                facePreviewBox.setSize(screenMain.width(), screenMain.height())
                facePreviewBox.on(dxUi.Utils.EVENT.CLICK, () => {
                    facePreviewBox.hide()
                })

                const faceImg = dxUi.Image.build('faceImg', facePreviewBox)
                faceImg.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
                item.faceImg = faceImg


                deleteBtn.on(dxUi.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmFace', () => {
                        localUserAddView.removeFace()
                    }, () => { })
                })
            }
        } else if (item.type === 'dropdown') {
            const dropdown = dxUi.Dropdown.build(item.title, userBox)
            item.dropdown = dropdown
            dropdown.setSize(260, 50)
            dropdown.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            dropdown.textFont(viewUtils.font(22))
            dropdown.getList().textFont(viewUtils.font(22))
            dropdown.setSymbol('/app/code/resource/image/down.png')
            dropdown.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
                localUserAddView.nowUser.type = dropdown.getSelected()
            })
        }
    })

    // Password generation page
    const pwdBoxBg = dxUi.View.build('pwdBoxBg', screenMain)
    viewUtils._clearStyle(pwdBoxBg)
    pwdBoxBg.bgColor(0x000000)
    pwdBoxBg.bgOpa(50)
    pwdBoxBg.setSize(screen.screenSize.width, screen.screenSize.height)
    pwdBoxBg.scroll(false)
    pwdBoxBg.hide()
    pwdBoxBg.on(dxUi.Utils.EVENT.CLICK, () => {
        pwdBoxCloseBtn.send(dxUi.Utils.EVENT.CLICK)
    })

    const pwdBox = dxUi.View.build('pwdBox', pwdBoxBg)
    viewUtils._clearStyle(pwdBox)
    pwdBox.setSize(screen.screenSize.width, 694)
    pwdBox.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 50)
    pwdBox.bgColor(0xffffff)
    pwdBox.radius(50)

    const pwdBoxLbl = dxUi.Label.build('pwdBoxLbl', pwdBox)
    pwdBoxLbl.dataI18n = 'localUserAddView.pwdBoxLbl'
    pwdBoxLbl.textFont(viewUtils.font(36))
    pwdBoxLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 39)

    const pwdBoxCloseBtn = viewUtils.imageBtn(pwdBox, 'pwdBoxCloseBtn', '/app/code/resource/image/close_small.png')
    pwdBoxCloseBtn.align(dxUi.Utils.ALIGN.TOP_RIGHT, -55, 18)
    pwdBoxCloseBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        pwdBoxBg.hide()
        topView.changeTheme(true)
    })

    const pwdBoxContent = dxUi.View.build('pwdBoxContent', pwdBox)
    viewUtils._clearStyle(pwdBoxContent)
    pwdBoxContent.setSize(650, 100)
    pwdBoxContent.align(dxUi.Utils.ALIGN.TOP_MID, 0, 172)
    pwdBoxContent.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    pwdBoxContent.flexAlign(dxUi.Utils.FLEX_ALIGN.SPACE_AROUND, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)

    localUserAddView.pwdBoxContentItem = []
    for (let i = 0; i < 6; i++) {
        const pwdBoxContentItem = dxUi.View.build('pwdBoxContentItem' + i, pwdBoxContent)
        pwdBoxContentItem.setSize(78, 90)
        pwdBoxContentItem.radius(13)
        pwdBoxContentItem.borderWidth(1)
        pwdBoxContentItem.setBorderColor(0xEAEAEA)

        const pwdBoxContentItemLbl = dxUi.Label.build('pwdBoxContentItemLbl' + i, pwdBoxContentItem)
        pwdBoxContentItemLbl.textFont(viewUtils.font(30))
        pwdBoxContentItemLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
        pwdBoxContentItemLbl.text('0')
        localUserAddView.pwdBoxContentItem.push(pwdBoxContentItemLbl)
    }

    const pwdBoxSaveBtn = dxUi.Button.build('pwdBoxSaveBtn', pwdBox)
    pwdBoxSaveBtn.setSize(210, 60)
    pwdBoxSaveBtn.align(dxUi.Utils.ALIGN.TOP_LEFT, 87, 340)
    pwdBoxSaveBtn.bgColor(0xEAEAEA)
    pwdBoxSaveBtn.radius(10)
    pwdBoxSaveBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        localUserAddView.changePwd()
    })

    const pwdBoxSaveBtnLbl = dxUi.Label.build('pwdBoxSaveBtnLbl', pwdBoxSaveBtn)
    pwdBoxSaveBtnLbl.dataI18n = 'localUserAddView.pwdBoxSaveBtnLbl'
    pwdBoxSaveBtnLbl.textFont(viewUtils.font(24))
    pwdBoxSaveBtnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    pwdBoxSaveBtnLbl.textColor(0x000000)

    const pwdBoxConfirmBtn = dxUi.Button.build('pwdBoxConfirmBtn', pwdBox)
    pwdBoxConfirmBtn.setSize(210, 60)
    pwdBoxConfirmBtn.align(dxUi.Utils.ALIGN.TOP_RIGHT, -76, 340)
    pwdBoxConfirmBtn.bgColor(0x000000)
    pwdBoxConfirmBtn.radius(10)
    pwdBoxConfirmBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        localUserAddView.addPwd(localUserAddView.pwdBoxContentFin)
        pwdBoxCloseBtn.send(dxUi.Utils.EVENT.CLICK)
    })

    const pwdBoxConfirmBtnLbl = dxUi.Label.build('pwdBoxConfirmBtnLbl', pwdBoxConfirmBtn)
    pwdBoxConfirmBtnLbl.dataI18n = 'localUserAddView.pwdBoxConfirmBtnLbl'
    pwdBoxConfirmBtnLbl.textFont(viewUtils.font(24))
    pwdBoxConfirmBtnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    // Reading card
    const cardBoxBg = dxUi.View.build('cardBoxBg', screenMain)
    viewUtils._clearStyle(cardBoxBg)
    cardBoxBg.setSize(screen.screenSize.width, screen.screenSize.height)
    cardBoxBg.align(dxUi.Utils.ALIGN.TOP_MID, 0, 0)
    cardBoxBg.bgColor(0x000000)
    cardBoxBg.bgOpa(50)
    cardBoxBg.scroll(false)
    cardBoxBg.hide()
    cardBoxBg.on(dxUi.Utils.EVENT.CLICK, () => {
        cardBoxCloseBtn.send(dxUi.Utils.EVENT.CLICK)
    })

    const cardBox = dxUi.View.build('cardBox', cardBoxBg)
    viewUtils._clearStyle(cardBox)
    cardBox.setSize(screen.screenSize.width, 694)
    cardBox.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, 50)
    cardBox.bgColor(0xffffff)
    cardBox.radius(50)
    cardBox.on(dxUi.Utils.EVENT.CLICK, () => {
    })

    const cardBoxLbl = dxUi.Label.build('cardBoxLbl', cardBox)
    cardBoxLbl.dataI18n = 'localUserAddView.cardBoxLbl'
    cardBoxLbl.textFont(viewUtils.font(36))
    cardBoxLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 39)

    const cardBoxCloseBtn = viewUtils.imageBtn(cardBox, 'cardBoxCloseBtn', '/app/code/resource/image/close_small.png')
    cardBoxCloseBtn.align(dxUi.Utils.ALIGN.TOP_RIGHT, -55, 18)
    cardBoxCloseBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        cardBoxBg.hide()
        topView.changeTheme(true)
        // Stop card reading recognition
        screen.endCardEnd()
    })

    const cardBoxInput = viewUtils.input(cardBox, 'localUserAddView.cardBoxInput', undefined, undefined, 'localUserAddView.cardBoxInput')
    localUserAddView.cardBoxInput = cardBoxInput
    cardBoxInput.align(dxUi.Utils.ALIGN.TOP_MID, 0, 183)
    cardBoxInput.setSize(630, 75)
    cardBoxInput.on(dxUi.Utils.EVENT.CLICK, () => {
        cardBoxInput.align(dxUi.Utils.ALIGN.TOP_MID, 0, 90)
        pinyin.hideCb(() => {
            cardBoxInput.align(dxUi.Utils.ALIGN.TOP_MID, 0, 183)
        })
    })

    const cardBoxResetBtn = dxUi.Button.build('cardBoxResetBtn', cardBox)
    cardBoxResetBtn.setSize(210, 60)
    cardBoxResetBtn.align(dxUi.Utils.ALIGN.TOP_LEFT, 87, 340)
    cardBoxResetBtn.bgColor(0xEAEAEA)
    cardBoxResetBtn.radius(10)
    cardBoxResetBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        cardBoxInput.text('')
    })

    const cardBoxResetBtnLbl = dxUi.Label.build('cardBoxResetBtnLbl', cardBoxResetBtn)
    cardBoxResetBtnLbl.dataI18n = 'localUserAddView.cardBoxResetBtnLbl'
    cardBoxResetBtnLbl.textFont(viewUtils.font(24))
    cardBoxResetBtnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    cardBoxResetBtnLbl.textColor(0x000000)

    const cardBoxSaveBtn = dxUi.Button.build('cardBoxSaveBtn', cardBox)
    cardBoxSaveBtn.setSize(210, 60)
    cardBoxSaveBtn.align(dxUi.Utils.ALIGN.TOP_RIGHT, -76, 340)
    cardBoxSaveBtn.bgColor(0x000000)
    cardBoxSaveBtn.radius(10)
    cardBoxSaveBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        cardBoxCloseBtn.send(dxUi.Utils.EVENT.CLICK)
        if (cardBoxInput.text()) {
            localUserAddView.addCard(cardBoxInput.text())
        }
    })

    const cardBoxSaveBtnLbl = dxUi.Label.build('cardBoxSaveBtnLbl', cardBoxSaveBtn)
    cardBoxSaveBtnLbl.dataI18n = 'localUserAddView.cardBoxSaveBtnLbl'
    cardBoxSaveBtnLbl.textFont(viewUtils.font(24))
    cardBoxSaveBtnLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    const deleteBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'deleteBtn', 'localUserAddView.delete', () => {
        if (!checkRequired()) {
            return
        }

        viewUtils.confirmOpen('localUserAddView.confirmDelete', 'localUserAddView.confirmDeleteContent', () => {
            // Delete user
            const res = screen.deleteUser(localUserAddView.nowUser)
            if (res) {
                dxUi.loadMain(localUserView.screenMain)
            } else {
                localUserAddView.statusPanel.fail()
            }
        }, () => { })

    }, 0xEAEAEA, 0xEA0000)
    deleteBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -200)
    localUserAddView.deleteBtn = deleteBtn
    deleteBtn.hide()

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'localUserAddView.save', async () => {
        if (!checkRequired()) {
            return
        }
        let res = false
        if (localUserAddView.deleteBtn.isHide()) {
            // Add new user
            res = await screen.insertUser(localUserAddView.nowUser)
        } else {
            // Update user
            res = screen.updateUser(localUserAddView.nowUser)
        }

        if (res === true) {
            localUserAddView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(localUserView.screenMain)
            }, 500)
        } else {
            if (typeof res === "string") {
                localUserAddView.statusPanel.fail(res)
            } else {
                localUserAddView.statusPanel.fail()
            }
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
    localUserAddView.saveBtn = saveBtn

    localUserAddView.statusPanel = viewUtils.statusPanel(screenMain, 'localUserAddView.success', 'localUserAddView.fail')
}

localUserAddView.addID = function (id) {
    localUserAddView.userInfo[0].input.text(id)
    localUserAddView.nowUser.id = id
}

localUserAddView.removeID = function () {
    localUserAddView.userInfo[0].input.text('')
}

localUserAddView.addName = function (name) {
    localUserAddView.userInfo[1].input.text(name)
    localUserAddView.nowUser.name = name
}

localUserAddView.removeName = function () {
    localUserAddView.userInfo[1].input.text('')
}

localUserAddView.addIDCard = function (idCard) {
    localUserAddView.userInfo[2].input.text(idCard)
    localUserAddView.nowUser.idCard = idCard
}

localUserAddView.removeIDCard = function () {
    localUserAddView.userInfo[2].input.text('')
}

localUserAddView.addFace = function (face) {
    localUserAddView.userInfo[3].btnEdit.show()
    localUserAddView.userInfo[3].btn.hide()

    const faceImg = localUserAddView.userInfo[3].faceImg
    faceImg.source(face)
    faceImg.show()

    // let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(face)
    // let zoom = 60 / header.h * 256
    // faceImg.obj.lvImgSetZoom(zoom)
    // faceImg.obj.lvImgSetSizeMode(dxui.Utils.ENUM.LV_IMG_SIZE_MODE_REAL)
    // faceImg.setSize(Math.ceil(zoom / 256 * header.w), 60)

    localUserAddView.userInfo[3].deleteBtn.show()
    localUserAddView.nowUser.face = face
}

localUserAddView.removeFace = function () {
    localUserAddView.userInfo[3].btn.show()
    localUserAddView.userInfo[3].btnEdit.hide()
    localUserAddView.userInfo[3].deleteBtn.hide()
    localUserAddView.userInfo[3].faceImg.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.face) {
        delete localUserAddView.nowUser.face
    }
}

localUserAddView.addPwd = function (pwd) {
    localUserAddView.userInfo[4].btn.hide()
    localUserAddView.userInfo[4].btnEdit.show()
    localUserAddView.userInfo[4].deleteBtn.show()
    localUserAddView.userInfo[4].pwdLbl.show()
    localUserAddView.userInfo[4].pwdLbl.text(pwd)
    localUserAddView.nowUser.pwd = pwd
}

localUserAddView.removePwd = function () {
    localUserAddView.userInfo[4].btn.show()
    localUserAddView.userInfo[4].btnEdit.hide()
    localUserAddView.userInfo[4].deleteBtn.hide()
    localUserAddView.userInfo[4].pwdLbl.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.pwd) {
        delete localUserAddView.nowUser.pwd
    }
}

localUserAddView.addCard = function (card) {
    localUserAddView.userInfo[5].btn.hide()
    localUserAddView.userInfo[5].btnEdit.show()
    localUserAddView.userInfo[5].deleteBtn.show()
    localUserAddView.userInfo[5].cardLbl.show()
    localUserAddView.userInfo[5].cardLbl.text(card)
    localUserAddView.nowUser.card = card
}

localUserAddView.removeCard = function () {
    localUserAddView.userInfo[5].btn.show()
    localUserAddView.userInfo[5].btnEdit.hide()
    localUserAddView.userInfo[5].deleteBtn.hide()
    localUserAddView.userInfo[5].cardLbl.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.card) {
        delete localUserAddView.nowUser.card
    }
}

localUserAddView.addType = function (type) {
    localUserAddView.userInfo[6].dropdown.setSelected(type)
}

localUserAddView.changePwd = function () {
    const randomPwd = Math.floor(Math.random() * 900000 + 100000).toString()
    localUserAddView.pwdBoxContentFin = randomPwd
    localUserAddView.pwdBoxContentItem.forEach((item, index) => {
        item.text(randomPwd[index])
    })
}

localUserAddView.isEdit = function (flag) {
    localUserAddView.removeFace()
    localUserAddView.removePwd()
    localUserAddView.removeCard()
    localUserAddView.removeID()
    localUserAddView.removeName()
    localUserAddView.removeIDCard()
    if (flag) {
        localUserAddView.saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -53)
        localUserAddView.deleteBtn.show()
        localUserAddView.titleBox2.show()
    } else {
        localUserAddView.saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
        localUserAddView.deleteBtn.hide()
        localUserAddView.titleBox2.hide()
        localUserAddView.nowUser = {}
    }
}

// Check required fields
function checkRequired() {
    if (!localUserAddView.userInfo[0].input.text()) {
        localUserAddView.statusPanel.fail("localUserAddView.requiredInfo")
        return false
    }
    if (!localUserAddView.userInfo[1].input.text()) {
        localUserAddView.statusPanel.fail("localUserAddView.requiredInfo")
        return false
    }
    return true
}

function refreshType() {
    const screenLanguage = screen.getConfig()['base.language']
    const configLanguage = getCurrentLanguage()

    log.info(`screenLanguage: ${screenLanguage}\n, configLanguage: ${configLanguage}`)
    switch (screenLanguage) {
        case 'CN':
            localUserAddView.userInfo[6].dropdown.setOptions(dropdownDataCn)
            break;
        case 'EN':
            localUserAddView.userInfo[6].dropdown.setOptions(dropdownDataEn)
            break;
        case 'RU':
            localUserAddView.userInfo[6].dropdown.setOptions(dropdownDataRu)
            break;
        default:
            localUserAddView.userInfo[6].dropdown.setOptions(dropdownDataEn)
            break;
    }
}

export default localUserAddView
