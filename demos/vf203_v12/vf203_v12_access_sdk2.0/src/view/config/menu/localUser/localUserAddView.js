import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import localUserView from '../localUserView.js'
import faceEnterView from './faceEnterView.js'
import fingerEnterView from './fingerEnterView.js'
import pinyin from '../../../pinyin/pinyin.js'
import screen from '../../../../screen.js'
import i18n from '../../../i18n.js'
import logger from '../../../../../dxmodules/dxLogger.js'
import sqliteService from '../../../../service/sqliteService.js'

const localUserAddView = {}

localUserAddView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('localUserAddView', dxui.Utils.LAYER.MAIN)
    localUserAddView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        refreshType()
        if (!localUserAddView.deleteBtn.isHide()) {
            //修改用户不允许改id
            localUserAddView.userInfo.id.input.disable(true)
        } else {
            localUserAddView.userInfo.id.input.disable(false)
            localUserAddView.userInfo.id.input.text(std.genRandomStr(10))
        }
        if (screen.driver.device.finger) {
            localUserAddView.finger.show()
        } else {
            localUserAddView.finger.hide()
        }
        if (screen.isInternationalVersion()) {
            localUserAddView.nameInput.setKeyboardMode(0)
        }
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        localUserAddView.userInfo.face.facePreview.hide()
        pwdBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
        cardBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
        // 检查录入指纹后是否保存，没有保存则删除指纹模块对应指纹
        if (screen.driver.device.finger && localUserAddView.nowUser && localUserAddView.nowUser.fingerId) {
            let fingerData = sqliteService.d1_voucher.findByCodeAndType(localUserAddView.nowUser.fingerId, "500")
            if (!fingerData.length) {
                screen.deleteFinger(localUserAddView.nowUser.fingerId)
            }
        }
    })

    const titleBox = viewUtils.title(screenMain, localUserView.screenMain, 'localUserAddViewTitle', 'localUserAddView.title', localUserAddView.titleBack)
    localUserAddView.titleBox = titleBox
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const titleBox2 = viewUtils.title(screenMain, localUserView.screenMain, 'localUserAddViewTitle2', 'localUserAddView.title2', localUserAddView.titleBack)
    localUserAddView.titleBox2 = titleBox2
    titleBox2.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))
    titleBox2.hide()

    const addUserBox = dxui.View.build('addUserBox', screenMain)
    viewUtils._clearStyle(addUserBox)
    addUserBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (700 / 1024))
    addUserBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (142 / 1024))
    addUserBox.borderWidth(1)
    addUserBox.setBorderColor(0xDEDEDE)
    addUserBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)
    addUserBox.bgOpa(0)

    addUserBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    addUserBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START)
    addUserBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    localUserAddView.userInfo = {
        id: {
            title: 'localUserAddView.id',
            value: null,
            required: true,
            type: 'input',
            input: null
        },
        name: {
            title: 'localUserAddView.name',
            value: null,
            required: true,
            type: 'input',
            input: null
        },
        idCard: {
            title: 'localUserAddView.idCard',
            value: null,
            type: 'input',
            input: null
        },
        face: {
            title: 'localUserAddView.face',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            faceImg: null,
            deleteBtn: null
        },
        pwd: {
            title: 'localUserAddView.pwd',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            pwdLbl: null,
            deleteBtn: null
        },
        card: {
            title: 'localUserAddView.card',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            cardLbl: null,
            deleteBtn: null
        },
        finger: {
            title: 'localUserAddView.finger',
            value: null,
            type: 'button',
            btn: null,
            btnEdit: null,
            fingerLbl: null,
            deleteBtn: null
        },
        type: {
            title: 'localUserAddView.type',
            value: null,
            type: 'dropdown'
        }
    }

    const userInfoOrder = ['id', 'name', 'idCard', 'face', 'pwd', 'card', 'finger', 'type']

    userInfoOrder.forEach((key, index) => {
        const item = localUserAddView.userInfo[key]
        const userBox = dxui.View.build('userInfo' + index, addUserBox)
        viewUtils._clearStyle(userBox)
        userBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
        userBox.borderWidth(1)
        userBox.setBorderColor(0xDEDEDE)
        userBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        userBox.bgOpa(0)
        if (key == "id") {
            userBox.hide()
        }
        if (key == "finger") {
            localUserAddView.finger = userBox
        }
        if (item.required) {
            const titleLbl = dxui.Label.build('titleLblRequired' + index, userBox)
            titleLbl.textFont(viewUtils.font(26))
            titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
            titleLbl.text('*')
            titleLbl.textColor(0xFD5353)
        }

        const titleLbl = dxui.Label.build('titleLbl' + index, userBox)
        titleLbl.textFont(viewUtils.font(26))
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (10 / 600), 0)
        titleLbl.dataI18n = item.title

        if (item.type === 'input') {
            let input = viewUtils.input(userBox, item.title, 1, undefined, "localUserAddView.input")
            if (key === 'name') {
                localUserAddView.nameInput = input
            }
            input.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            let font26 = viewUtils.font(26)
            input.textFont(font26)
            input.setSize(screen.screenSize.width * (220 / 600), screen.screenSize.height * (50 / 1024))
            input.padTop((screen.screenSize.height * (50 / 1024) - font26.obj.lvFontGetLineHeight()) / 2)
            input.padBottom(0)
            input.radius(30)
            item.input = input

            input.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
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
            const btn = dxui.Button.build(item.title, userBox)
            item.btn = btn
            btn.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (50 / 1024))
            btn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            btn.bgColor(0x000000)
            btn.radius(30)
            const btnLbl = dxui.Label.build(item.title + 'btnLbl', btn)
            btnLbl.textFont(viewUtils.font(26))
            btnLbl.textColor(0xffffff)
            btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

            const btnEdit = dxui.Button.build(item.title + 'edit', userBox)
            item.btnEdit = btnEdit
            btnEdit.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (50 / 1024))
            btnEdit.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (60 / 600), 0)
            btnEdit.bgColor(0x000000)
            btnEdit.radius(30)
            btnEdit.hide()
            const btnEditLbl = dxui.Label.build(item.title + 'btnEditLbl', btnEdit)
            btnEditLbl.textFont(viewUtils.font(26))
            btnEditLbl.textColor(0xffffff)
            btnEditLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

            const deleteBtn = viewUtils.imageBtn(userBox, item.title + 'deleteBtn', screen.resourcePath.imagePath + '/delete.png')
            item.deleteBtn = deleteBtn
            deleteBtn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            deleteBtn.hide()

            if (item.title === 'localUserAddView.pwd') {
                btnLbl.dataI18n = 'localUserAddView.generate'
                btnEditLbl.dataI18n = 'localUserAddView.reset'

                // 密码
                const pwdLbl = dxui.Label.build(userBox.id + 'pwdLbl', userBox)
                item.pwdLbl = pwdLbl
                pwdLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (180 / 600), 0)
                pwdLbl.textColor(0x666666)
                pwdLbl.textFont(viewUtils.font(26))
                pwdLbl.hide()

                btn.on(dxui.Utils.EVENT.CLICK, () => {
                    pwdBoxBg.show()
                    pwdBoxBg.moveForeground()
                    topView.changeTheme(false)
                    localUserAddView.changePwd()
                })

                btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                    btn.send(dxui.Utils.EVENT.CLICK)
                })

                deleteBtn.on(dxui.Utils.EVENT.CLICK, () => {
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmPwd', () => {
                        localUserAddView.removePwd()
                    }, () => { })
                })

            } else {
                btnLbl.dataI18n = 'localUserAddView.enter'
                btnEditLbl.dataI18n = 'localUserAddView.edit'
            }

            if (item.title === 'localUserAddView.card') {
                // 卡
                const cardLbl = dxui.Label.build(userBox.id + 'cardLbl', userBox)
                item.cardLbl = cardLbl
                cardLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (180 / 600), 0)
                cardLbl.textColor(0x666666)
                cardLbl.textFont(viewUtils.font(26))
                cardLbl.hide()
                cardLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                cardLbl.width(screen.screenSize.width * (140 / 600))

                btn.on(dxui.Utils.EVENT.CLICK, () => {
                    cardBoxBg.show()
                    cardBoxBg.moveForeground()
                    topView.changeTheme(false)
                    // 开启刷卡识别
                    screen.getCardStart()
                })

                btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                    btn.send(dxui.Utils.EVENT.CLICK)
                })

                deleteBtn.on(dxui.Utils.EVENT.CLICK, () => {
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmCard', () => {
                        localUserAddView.removeCard()
                    }, () => { })
                })
            }

            if (item.title === 'localUserAddView.face') {
                // userBox.height(220)
                btn.on(dxui.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    dxui.loadMain(faceEnterView.screenMain)
                })

                btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    dxui.loadMain(faceEnterView.screenMain)
                })

                // 人脸图片
                const facePreview = dxui.Button.build('facePreview', userBox)
                item.facePreview = facePreview
                facePreview.bgColor(0x000000)
                facePreview.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (50 / 1024))
                facePreview.radius(30)
                facePreview.hide()
                facePreview.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (160 / 600), 0)
                const facePreviewLbl = dxui.Label.build('facePreviewLbl', facePreview)
                facePreviewLbl.textFont(viewUtils.font(26))
                facePreviewLbl.dataI18n = "localUserAddView.preview"
                facePreviewLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
                facePreview.on(dxui.Utils.EVENT.CLICK, () => {
                    facePreviewBox.show()
                    facePreviewBox.moveForeground()
                })

                const facePreviewBox = dxui.View.build('facePreviewBox', screenMain)
                viewUtils._clearStyle(facePreviewBox)
                facePreviewBox.hide()
                facePreviewBox.setSize(screenMain.width(), screenMain.height())
                facePreviewBox.on(dxui.Utils.EVENT.CLICK, () => {
                    facePreviewBox.hide()
                })

                const faceImg = dxui.Image.build('faceImg', facePreviewBox)
                faceImg.align(dxui.Utils.ALIGN.CENTER, 0, 0)
                item.faceImg = faceImg


                deleteBtn.on(dxui.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmFace', () => {
                        localUserAddView.removeFace()
                        facePreview.hide()
                    }, () => { })
                })
            }
            if (item.title === 'localUserAddView.finger') {

                // 指纹
                const fingerLbl = dxui.Label.build(userBox.id + 'fingerLbl', userBox)
                item.fingerLbl = fingerLbl
                fingerLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (180 / 600), 0)
                fingerLbl.textColor(0x666666)
                fingerLbl.textFont(viewUtils.font(26))
                fingerLbl.hide()
                fingerLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                fingerLbl.width(screen.screenSize.width * (140 / 600))

                btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    fingerEnterView.isRemote = false
                    dxui.loadMain(fingerEnterView.screenMain)
                    localUserAddView.fingerUpdate = true
                    localUserAddView.oldFingerId = parseInt(localUserAddView.nowUser.fingerId)
                })

                deleteBtn.on(dxui.Utils.EVENT.CLICK, () => {
                    viewUtils.confirmOpen('localUserAddView.confirm', 'localUserAddView.confirmFinger', () => {
                        // 删除指纹凭证
                        screen.deleteFinger(parseInt(localUserAddView.nowUser.fingerId))
                        screen.delUserVoucher(localUserAddView.nowUser.userId, "500")
                        logger.info("要删除的指纹索引ID: ", localUserAddView.nowUser.fingerId)
                        localUserAddView.removeFinger()
                    }, () => { })
                })

                btn.on(dxui.Utils.EVENT.CLICK, () => {
                    if (!checkRequired()) {
                        return
                    }
                    localUserAddView.fingerInsert = true
                    fingerEnterView.isRemote = false
                    dxui.loadMain(fingerEnterView.screenMain)
                })
            }
        } else if (item.type === 'dropdown') {
            const dropdown = dxui.Dropdown.build(item.title, userBox)
            item.dropdown = dropdown
            dropdown.setSize(screen.screenSize.width * (250 / 600), screen.screenSize.height * (50 / 1024))
            dropdown.padTop((screen.screenSize.height * (50 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
            dropdown.padBottom(0)
            dropdown.radius(30)
            dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            dropdown.textFont(viewUtils.font(26))
            dropdown.getList().textFont(viewUtils.font(26))
            dropdown.setSymbol(screen.dropdownSymbol)
            dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                localUserAddView.nowUser.type = dropdown.getSelected()
            })
        }
    })

    // 密码生成页
    const pwdBoxBg = dxui.View.build('pwdBoxBg', screenMain)
    viewUtils._clearStyle(pwdBoxBg)
    pwdBoxBg.bgColor(0x000000)
    pwdBoxBg.bgOpa(50)
    pwdBoxBg.setSize(screen.screenSize.width, screen.screenSize.height)
    pwdBoxBg.scroll(false)
    pwdBoxBg.hide()
    pwdBoxBg.on(dxui.Utils.EVENT.CLICK, () => {
        pwdBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
    })

    const pwdBox = dxui.View.build('pwdBox', pwdBoxBg)
    viewUtils._clearStyle(pwdBox)
    pwdBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (534 / 1024))
    pwdBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, screen.screenSize.height * (50 / 1024))
    pwdBox.bgColor(0xffffff)
    pwdBox.radius(50)

    const pwdBoxLbl = dxui.Label.build('pwdBoxLbl', pwdBox)
    pwdBoxLbl.dataI18n = 'localUserAddView.pwdBoxLbl'
    pwdBoxLbl.textFont(viewUtils.font(36))
    pwdBoxLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (39 / 1024))

    const pwdBoxCloseBtn = viewUtils.imageBtn(pwdBox, 'pwdBoxCloseBtn', screen.resourcePath.imagePath + '/close_small.png')
    pwdBoxCloseBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (55 / 600), screen.screenSize.height * (18 / 1024))
    pwdBoxCloseBtn.on(dxui.Utils.EVENT.CLICK, () => {
        pwdBoxBg.hide()
        topView.changeTheme(true)
    })

    const pwdBoxContent = dxui.View.build('pwdBoxContent', pwdBox)
    viewUtils._clearStyle(pwdBoxContent)
    pwdBoxContent.setSize(screen.screenSize.width * (450 / 600), screen.screenSize.height * (80 / 1024))
    pwdBoxContent.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (172 / 1024))
    pwdBoxContent.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    pwdBoxContent.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    localUserAddView.pwdBoxContentItem = []
    for (let i = 0; i < 6; i++) {
        const pwdBoxContentItem = dxui.View.build('pwdBoxContentItem' + i, pwdBoxContent)
        pwdBoxContentItem.setSize(screen.screenSize.width * (60 / 600), screen.screenSize.height * (70 / 1024))
        pwdBoxContentItem.radius(10)
        pwdBoxContentItem.borderWidth(1)
        pwdBoxContentItem.setBorderColor(0xEAEAEA)
        pwdBoxContentItem.scroll(false)


        const pwdBoxContentItemLbl = dxui.Label.build('pwdBoxContentItemLbl' + i, pwdBoxContentItem)
        pwdBoxContentItemLbl.textFont(viewUtils.font(30))
        pwdBoxContentItemLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
        pwdBoxContentItemLbl.text('0')
        localUserAddView.pwdBoxContentItem.push(pwdBoxContentItemLbl)
    }

    // 换一个密码按钮
    const pwdBoxSaveBtn = dxui.Button.build('pwdBoxSaveBtn', pwdBox)
    pwdBoxSaveBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    pwdBoxSaveBtn.align(dxui.Utils.ALIGN.TOP_LEFT, screen.screenSize.width * (87 / 600), screen.screenSize.height * (340 / 1024))
    pwdBoxSaveBtn.bgColor(0xEAEAEA)
    pwdBoxSaveBtn.radius(30)
    pwdBoxSaveBtn.on(dxui.Utils.EVENT.CLICK, () => {
        localUserAddView.changePwd()
    })

    const pwdBoxSaveBtnLbl = dxui.Label.build('pwdBoxSaveBtnLbl', pwdBoxSaveBtn)
    pwdBoxSaveBtnLbl.dataI18n = 'localUserAddView.pwdBoxSaveBtnLbl'
    pwdBoxSaveBtnLbl.textFont(viewUtils.font(26))
    pwdBoxSaveBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pwdBoxSaveBtnLbl.textColor(0x000000)

    // 确认密码按钮
    const pwdBoxConfirmBtn = dxui.Button.build('pwdBoxConfirmBtn', pwdBox)
    pwdBoxConfirmBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    pwdBoxConfirmBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (76 / 600), screen.screenSize.height * (340 / 1024))
    pwdBoxConfirmBtn.bgColor(0x000000)
    pwdBoxConfirmBtn.radius(30)
    pwdBoxConfirmBtn.on(dxui.Utils.EVENT.CLICK, () => {
        localUserAddView.addPwd(localUserAddView.pwdBoxContentFin)
        pwdBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
    })

    const pwdBoxConfirmBtnLbl = dxui.Label.build('pwdBoxConfirmBtnLbl', pwdBoxConfirmBtn)
    pwdBoxConfirmBtnLbl.dataI18n = 'localUserAddView.pwdBoxConfirmBtnLbl'
    pwdBoxConfirmBtnLbl.textFont(viewUtils.font(26))
    pwdBoxConfirmBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // 读取卡片中
    const cardBoxBg = dxui.View.build('cardBoxBg', screenMain)
    viewUtils._clearStyle(cardBoxBg)
    cardBoxBg.setSize(screen.screenSize.width, screen.screenSize.height)
    cardBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    cardBoxBg.bgColor(0x000000)
    cardBoxBg.bgOpa(50)
    cardBoxBg.scroll(false)
    cardBoxBg.hide()
    cardBoxBg.on(dxui.Utils.EVENT.CLICK, () => {
        cardBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
    })

    const cardBox = dxui.View.build('cardBox', cardBoxBg)
    viewUtils._clearStyle(cardBox)
    cardBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (534 / 1024))
    cardBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, screen.screenSize.height * (50 / 1024))
    cardBox.bgColor(0xffffff)
    cardBox.radius(50)

    const cardBoxLbl = dxui.Label.build('cardBoxLbl', cardBox)
    cardBoxLbl.dataI18n = 'localUserAddView.cardBoxLbl'
    cardBoxLbl.textFont(viewUtils.font(36))
    cardBoxLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (39 / 1024))

    const cardBoxCloseBtn = viewUtils.imageBtn(cardBox, 'cardBoxCloseBtn', screen.resourcePath.imagePath + '/close_small.png')
    cardBoxCloseBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (55 / 600), screen.screenSize.height * (18 / 1024))
    cardBoxCloseBtn.on(dxui.Utils.EVENT.CLICK, () => {
        cardBoxBg.hide()
        topView.changeTheme(true)
        // 关闭刷卡识别
        screen.endCardEnd()
    })

    const cardBoxInput = viewUtils.input(cardBox, 'localUserAddView.cardBoxInput', undefined, undefined, 'localUserAddView.cardBoxInput')
    localUserAddView.cardBoxInput = cardBoxInput
    cardBoxInput.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (183 / 1024))
    cardBoxInput.setSize(screen.screenSize.width * (484 / 600), screen.screenSize.height * (75 / 1024))
    cardBoxInput.on(dxui.Utils.EVENT.CLICK, () => {
        cardBoxInput.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (90 / 1024))
        pinyin.hideCb(() => {
            cardBoxInput.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (183 / 1024))
        })
    })

    const cardBoxResetBtn = dxui.Button.build('cardBoxResetBtn', cardBox)
    cardBoxResetBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    cardBoxResetBtn.align(dxui.Utils.ALIGN.TOP_LEFT, screen.screenSize.width * (87 / 600), screen.screenSize.height * (340 / 1024))
    cardBoxResetBtn.bgColor(0xEAEAEA)
    cardBoxResetBtn.radius(30)
    cardBoxResetBtn.on(dxui.Utils.EVENT.CLICK, () => {
        cardBoxInput.text('')
    })

    const cardBoxResetBtnLbl = dxui.Label.build('cardBoxResetBtnLbl', cardBoxResetBtn)
    cardBoxResetBtnLbl.dataI18n = 'localUserAddView.cardBoxResetBtnLbl'
    cardBoxResetBtnLbl.textFont(viewUtils.font(26))
    cardBoxResetBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    cardBoxResetBtnLbl.textColor(0x000000)

    const cardBoxSaveBtn = dxui.Button.build('cardBoxSaveBtn', cardBox)
    cardBoxSaveBtn.setSize(screen.screenSize.width * (210 / 600), screen.screenSize.height * (50 / 1024))
    cardBoxSaveBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (76 / 600), screen.screenSize.height * (340 / 1024))
    cardBoxSaveBtn.bgColor(0x000000)
    cardBoxSaveBtn.radius(30)
    cardBoxSaveBtn.on(dxui.Utils.EVENT.CLICK, () => {
        cardBoxCloseBtn.send(dxui.Utils.EVENT.CLICK)
        if (cardBoxInput.text()) {
            localUserAddView.addCard(cardBoxInput.text())
        }
    })

    const cardBoxSaveBtnLbl = dxui.Label.build('cardBoxSaveBtnLbl', cardBoxSaveBtn)
    cardBoxSaveBtnLbl.dataI18n = 'localUserAddView.cardBoxSaveBtnLbl'
    cardBoxSaveBtnLbl.textFont(viewUtils.font(26))
    cardBoxSaveBtnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const deleteBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'deleteBtn', 'localUserAddView.delete', () => {
        if (!checkRequired()) {
            return
        }

        viewUtils.confirmOpen('localUserAddView.confirmDelete', 'localUserAddView.confirmDeleteContent', () => {
            // 删除用户
            const res = screen.deleteUser(localUserAddView.nowUser)
            if (res) {
                dxui.loadMain(localUserView.screenMain)
            } else {
                localUserAddView.statusPanel.fail()
            }
        }, () => { })

    }, 0xEAEAEA, 0xEA0000)
    deleteBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (154 / 1024))
    localUserAddView.deleteBtn = deleteBtn
    deleteBtn.hide()

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'localUserAddView.save', async () => {
        if (!checkRequired()) {
            return
        }
        let res = false
        if (localUserAddView.deleteBtn.isHide()) {
            // 新增用户
            res = await screen.insertUser(localUserAddView.nowUser)
            if(res !== true){
                if (screen.driver.device.finger) {
                    screen.deleteFinger(localUserAddView.nowUser.fingerId)
                }
            }
        } else {
            // 修改用户
            // 先根据用户获取旧的指纹凭证
            let vouchers = sqliteService.d1_voucher.findByUserId(localUserAddView.nowUser.userId)
            let oldFingerId = null
            vouchers.forEach(voucher => {
                if(voucher.type == "500" && screen.driver.device.finger){
                    oldFingerId = parseInt(voucher.code)
                }
            })

            res = screen.updateUser(localUserAddView.nowUser)

            if(res === true && oldFingerId != null && screen.driver.device.finger &&
                typeof localUserAddView.nowUser.fingerId === "number" && oldFingerId != localUserAddView.nowUser.fingerId){
                // 表明有录入新指纹，需要删除旧指纹
                screen.deleteFinger(oldFingerId)
            }
        }

        if (res === true) {
            localUserAddView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(localUserView.screenMain)
            }, 500)
        } else {
            if (typeof res === "string") {
                localUserAddView.statusPanel.fail(res)
            } else {
                localUserAddView.statusPanel.fail()
            }
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
    localUserAddView.saveBtn = saveBtn

    localUserAddView.statusPanel = viewUtils.statusPanel(screenMain, 'localUserAddView.success', 'localUserAddView.fail')
}

localUserAddView.addID = function (id) {
    localUserAddView.userInfo.id.input.text(id)
    localUserAddView.nowUser.id = id
}

localUserAddView.removeID = function () {
    localUserAddView.userInfo.id.input.text('')
}

localUserAddView.addName = function (name) {
    localUserAddView.userInfo.name.input.text(name)
    localUserAddView.nowUser.name = name
}

localUserAddView.removeName = function () {
    localUserAddView.userInfo.name.input.text('')
}

localUserAddView.addIDCard = function (idCard) {
    localUserAddView.userInfo.idCard.input.text(idCard)
    localUserAddView.nowUser.idCard = idCard
}

localUserAddView.removeIDCard = function () {
    localUserAddView.userInfo.idCard.input.text('')
}
localUserAddView.addFace = function (face, feature) {
    localUserAddView.userInfo.face.facePreview.show()
    localUserAddView.userInfo.face.btnEdit.show()
    localUserAddView.userInfo.face.btn.hide()

    const faceImg = localUserAddView.userInfo.face.faceImg
    faceImg.source(face)
    faceImg.show()

    localUserAddView.userInfo.face.deleteBtn.show()
    localUserAddView.nowUser.face = face
    localUserAddView.nowUser.feature = feature
}

localUserAddView.removeFace = function () {
    localUserAddView.userInfo.face.btn.show()
    localUserAddView.userInfo.face.btnEdit.hide()
    localUserAddView.userInfo.face.deleteBtn.hide()
    localUserAddView.userInfo.face.faceImg.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.face) {
        delete localUserAddView.nowUser.face
        delete localUserAddView.nowUser.feature
    }
}

localUserAddView.addPwd = function (pwd) {
    localUserAddView.userInfo.pwd.btn.hide()
    localUserAddView.userInfo.pwd.btnEdit.show()
    localUserAddView.userInfo.pwd.deleteBtn.show()
    localUserAddView.userInfo.pwd.pwdLbl.show()
    localUserAddView.userInfo.pwd.pwdLbl.text(pwd)
    localUserAddView.nowUser.pwd = pwd
}

localUserAddView.removePwd = function () {
    localUserAddView.userInfo.pwd.btn.show()
    localUserAddView.userInfo.pwd.btnEdit.hide()
    localUserAddView.userInfo.pwd.deleteBtn.hide()
    localUserAddView.userInfo.pwd.pwdLbl.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.pwd) {
        delete localUserAddView.nowUser.pwd
    }
}

localUserAddView.addCard = function (card) {
    localUserAddView.userInfo.card.btn.hide()
    localUserAddView.userInfo.card.btnEdit.show()
    localUserAddView.userInfo.card.deleteBtn.show()
    localUserAddView.userInfo.card.cardLbl.show()
    localUserAddView.userInfo.card.cardLbl.text(card)
    localUserAddView.nowUser.card = card
}

localUserAddView.removeCard = function () {
    localUserAddView.userInfo.card.btn.show()
    localUserAddView.userInfo.card.btnEdit.hide()
    localUserAddView.userInfo.card.deleteBtn.hide()
    localUserAddView.userInfo.card.cardLbl.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.card) {
        delete localUserAddView.nowUser.card
    }
}

// 新增指纹(指纹已经录入)，隐藏之前的录入按钮，显示修改和删除按钮还有显示指纹的索引ID
localUserAddView.addFinger = function (fingerId) {
    if(!screen.driver.device.finger){
        return
    }
    localUserAddView.userInfo.finger.btn.hide()
    localUserAddView.userInfo.finger.btnEdit.show()
    localUserAddView.userInfo.finger.deleteBtn.show()
    localUserAddView.userInfo.finger.fingerLbl.text("ID: " + fingerId)
    localUserAddView.userInfo.finger.fingerLbl.show()
    localUserAddView.nowUser.fingerId = fingerId
}

localUserAddView.removeFinger = function () {
    if(!screen.driver.device.finger) {
        return
    }
    localUserAddView.userInfo.finger.btn.show()
    localUserAddView.userInfo.finger.btnEdit.hide()
    localUserAddView.userInfo.finger.deleteBtn.hide()
    localUserAddView.userInfo.finger.fingerLbl.hide()
    if (localUserAddView.nowUser && localUserAddView.nowUser.fingerId != null) {
        delete localUserAddView.nowUser.fingerId
    }
}

localUserAddView.addType = function (type) {
    localUserAddView.userInfo.type.dropdown.setSelected(type)
}

localUserAddView.changePwd = function () {
    const randomPwd = Math.floor(Math.random() * 900000 + 100000).toString()
    localUserAddView.pwdBoxContentFin = randomPwd
    localUserAddView.pwdBoxContentItem.forEach((item, index) => {
        item.text(randomPwd[index])
    })
}

localUserAddView.isEdit = function (flag) {
    localUserAddView.removeFinger()
    localUserAddView.removeFace()
    localUserAddView.removePwd()
    localUserAddView.removeCard()
    localUserAddView.removeID()
    localUserAddView.removeName()
    localUserAddView.removeIDCard()
    if (flag) {
        localUserAddView.saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
        localUserAddView.deleteBtn.show()
        localUserAddView.titleBox2.show()
    } else {
        localUserAddView.saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
        localUserAddView.deleteBtn.hide()
        localUserAddView.titleBox2.hide()
        localUserAddView.nowUser = {}
    }
}

localUserAddView.titleBack = function () {
    if(screen.driver.device.finger){
         // 在录入指纹后、未保存，则需要删除刚才录入的指纹
        if(localUserAddView.fingerInsert && typeof localUserAddView.nowUser.fingerId === "number"){
            screen.deleteFinger(parseInt(localUserAddView.nowUser.fingerId))
        }else if(localUserAddView.fingerUpdate && typeof localUserAddView.oldFingerId === "number" && typeof localUserAddView.nowUser.fingerId === "number" &&
            localUserAddView.oldFingerId != localUserAddView.nowUser.fingerId){
            screen.deleteFinger(parseInt(localUserAddView.oldFingerId))
        }
        
        localUserAddView.fingerInsert = false
        localUserAddView.fingerUpdate = false
        localUserAddView.oldFingerId = null
    }
}

// 检查必填项
function checkRequired() {
    if (!localUserAddView.userInfo.id.input.text()) {
        localUserAddView.statusPanel.fail("localUserAddView.requiredInfo")
        return false
    }
    if (!localUserAddView.userInfo.name.input.text()) {
        localUserAddView.statusPanel.fail("localUserAddView.requiredInfo")
        return false
    }
    return true
}
function refreshType() {
    if (!localUserAddView.userInfo || !localUserAddView.userInfo.type?.dropdown) return
    const opts = i18n.t('localUserAddView.typeOptions') || ['User', 'Administrator']
    if (typeof localUserAddView.userInfo.type.dropdown.setOptions === 'function') {
        localUserAddView.userInfo.type.dropdown.setOptions(opts)
    }
}
export default localUserAddView
