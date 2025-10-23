import dxUi from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'

const networkSettingView = {}
networkSettingView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('networkSettingView', dxUi.Utils.LAYER.MAIN)
    networkSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        let devType = screen.getConfig()["sys.devType"]
        let netTypes = []
        netTypes = devType == 1 ? [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView._4G')] : [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView.wifi'), i18n.t('networkSettingView._4G')]
        networkSettingView.netInfo[0].value = netTypes
        networkSettingView.netInfo[0].dropdown.setOptions(networkSettingView.netInfo[0].value)
        const configAll = screen.getConfig()
        networkSettingView.changeNetType(configAll["net.type"] - 1)
        networkSettingView.netInfo[0].dropdown.setSelected(configAll["net.type"] - 1)
        networkSettingView.netInfo[1].dropdown.setOptions([configAll["net.ssid"]])
        networkSettingView.netInfo[1].dropdown.setSelected(0)
        networkSettingView.netInfo[2].input.text(configAll["net.psk"])
        networkSettingView.netInfo[3].switch.select(configAll["net.dhcp"] == 2)
        networkSettingView.netInfo[4].input.text(configAll["net.ip"])
        networkSettingView.netInfo[5].input.text(configAll["net.mask"])
        networkSettingView.netInfo[6].input.text(configAll["net.gateway"])
        networkSettingView.netInfo[7].input.text(configAll["net.dns"].split(",")[0])
        networkSettingView.netInfo[8].input.text(configAll["net.dns"].split(",")[1])
        networkSettingView.netInfo[9].label.text(configAll["net.mac"])
    })

    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        wifiListBoxClose.send(dxUi.Utils.EVENT.CLICK)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'networkSettingViewTitle', 'networkSettingView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)


    const networkSettingBox = dxUi.View.build('networkSettingBox', screenMain)
    viewUtils._clearStyle(networkSettingBox)
    networkSettingBox.setSize(screen.screenSize.width, 830)
    networkSettingBox.bgColor(0xeeeeee)
    networkSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 142)
    networkSettingBox.borderWidth(1)
    networkSettingBox.setBorderColor(0xDEDEDE)
    networkSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)
    networkSettingBox.bgOpa(0)
    networkSettingBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    networkSettingBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    networkSettingBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    networkSettingView.netInfo = [
        {
            title: 'networkSettingView.type',
            value: [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView.wifi'), i18n.t('networkSettingView._4G')],
            type: 'dropdown',
            obj: null,
            dropdown: null
        },
        {
            title: 'networkSettingView.wifiName',
            value: [],
            type: 'dropdown',
            obj: null,
            dropdown: null
        },
        {
            title: 'networkSettingView.wifiPwd',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.dhcp',
            value: null,
            type: 'switch',
            obj: null
        },
        {
            title: 'networkSettingView.ip',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.mask',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.gateway',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.dns',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.dns2',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'networkSettingView.mac',
            value: 'DC-87-F2-97-3B-26',
            type: 'label',
            obj: null,
            label: null
        },
        {
            title: 'networkSettingView.status',
            value: i18n.t('networkSettingView.networkUnconnected'),
            type: 'label',
            obj: null,
            label: null
        }
    ]

    networkSettingView.netInfo.forEach((item, index) => {
        const networkSettingItem = dxUi.View.build(networkSettingBox.id + item.title, networkSettingBox)
        viewUtils._clearStyle(networkSettingItem)
        item.obj = networkSettingItem
        networkSettingItem.setSize(760, 76)
        networkSettingItem.bgColor(0xffffff)
        networkSettingItem.borderWidth(1)
        networkSettingItem.setBorderColor(0xDEDEDE)
        networkSettingItem.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const title = dxUi.Label.build(item.title, networkSettingItem)
        title.textFont(viewUtils.font(26))
        title.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        title.dataI18n = item.title


        if (item.type === 'input') {
            const input = viewUtils.input(networkSettingItem, item.title + 'input', undefined, undefined, 'networkSettingView.input')
            input.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            input.setSize(400, 60)
            item.input = input
        }

        if (item.type === 'switch') {
            const __switch = dxUi.Switch.build(item.title + 'switch', networkSettingItem)
            __switch.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            __switch.setSize(70, 35)
            item.switch = __switch
        }

        if (item.type === 'dropdown') {
            const dropdown = dxUi.Dropdown.build(item.title + 'dropdown', networkSettingItem)
            dropdown.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            dropdown.setSize(200, 60)
            dropdown.textFont(viewUtils.font(26))
            dropdown.getList().textFont(viewUtils.font(26))
            dropdown.setSymbol('/app/code/resource/image/down.png')
            dropdown.setOptions(item.value)
            item.dropdown = dropdown

            if (item.title === 'networkSettingView.type') {
                dropdown.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
                    networkSettingView.changeNetType(dropdown.getSelected())
                    if(dropdown.getSelected() == 2) {
                        // screen.switchNetworkType(dropdown.getSelected() + 2)
                    } else {
                        screen.switchNetworkType(dropdown.getSelected() + 1)
                    }
                })
            }

            if (item.title === 'networkSettingView.wifiName') {
                dropdown.on(dxUi.Utils.EVENT.CLICK, () => {
                    screen.netGetWifiSsidList()
                    wifiList.refresh()
                    wifiListBoxbg.moveForeground()
                    wifiListBoxbg.show()
                })
            }
        }

        if (item.type === 'label') {
            const label = dxUi.Label.build(item.title + 'label', networkSettingItem)
            label.textFont(viewUtils.font(26))
            label.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            label.text(item.value)
            label.textColor(0x333333)
            item.label = label
        }

    })

    // WiFi list
    const wifiListBoxbg = dxUi.View.build('wifiListBoxbg', screenMain)
    viewUtils._clearStyle(wifiListBoxbg)
    wifiListBoxbg.setSize(screen.screenSize.width, screen.screenSize.height)
    wifiListBoxbg.bgColor(0x000000)
    wifiListBoxbg.bgOpa(50)
    wifiListBoxbg.hide()
    wifiListBoxbg.on(dxUi.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxUi.Utils.EVENT.CLICK)
    })

    const wifiListBox = dxUi.View.build('wifiListBox', wifiListBoxbg)
    viewUtils._clearStyle(wifiListBox)
    wifiListBox.setSize(520, 560)
    wifiListBox.bgColor(0xffffff)
    wifiListBox.radius(20)
    wifiListBox.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    const wifiListBoxTitle = dxUi.Label.build('wifiListBoxTitle', wifiListBox)
    wifiListBoxTitle.textFont(viewUtils.font(28))
    wifiListBoxTitle.align(dxUi.Utils.ALIGN.TOP_MID, 0, 32)
    wifiListBoxTitle.dataI18n = 'networkSettingView.wifiList'

    const wifiListBoxClose = viewUtils.imageBtn(wifiListBox, 'wifiListBoxClose', '/app/code/resource/image/close_small.png')
    wifiListBoxClose.align(dxUi.Utils.ALIGN.TOP_RIGHT, -36, 30)
    wifiListBoxClose.on(dxUi.Utils.EVENT.CLICK, () => {
        wifiListBoxbg.hide()
    })

    const closeBtn = dxUi.Button.build('closeBtn', wifiListBox)
    closeBtn.setSize(172, 50)
    closeBtn.radius(10)
    closeBtn.bgColor(0xEAEAEA)
    closeBtn.align(dxUi.Utils.ALIGN.BOTTOM_LEFT, 69, -53)
    closeBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxUi.Utils.EVENT.CLICK)
    })

    const closeBtnText = dxUi.Label.build('closeBtnText', closeBtn)
    closeBtnText.textFont(viewUtils.font(24))
    closeBtnText.dataI18n = 'networkSettingView.close'
    closeBtnText.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    closeBtnText.textColor(0x000000)

    const confirmBtn = dxUi.Button.build('confirmBtn', wifiListBox)
    confirmBtn.setSize(172, 50)
    confirmBtn.radius(10)
    confirmBtn.bgColor(0x000000)
    confirmBtn.align(dxUi.Utils.ALIGN.BOTTOM_RIGHT, -69, -53)
    confirmBtn.on(dxUi.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxUi.Utils.EVENT.CLICK)
        networkSettingView.netInfo[1].dropdown.setOptions([networkSettingView.selectedValue])
    })

    const confirmBtnText = dxUi.Label.build('confirmBtnText', confirmBtn)
    confirmBtnText.textFont(viewUtils.font(24))
    confirmBtnText.dataI18n = 'networkSettingView.confirm'
    confirmBtnText.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    confirmBtnText.textColor(0xffffff)
    networkSettingView.wifiListData = []
    networkSettingView.selectedValue = ''
    networkSettingView.selectedItem = 0

    const wifiList = viewUtils.cycleList(wifiListBox, 'wifiList', [440, 300], 5, (item) => {
        const wifiItemLbl = dxUi.Label.build(item.id + 'wifiItemLbl', item)
        wifiItemLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 25, 0)
        wifiItemLbl.textFont(viewUtils.font(26))
        wifiItemLbl.textColor(0x888888)
        wifiItemLbl.width(300)
        wifiItemLbl.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
        item.radius(10)
        item.on(dxUi.Utils.EVENT.CLICK, () => {
            if (networkSettingView.selectedItem) {
                networkSettingView.selectedItem.bgOpa(0)
            }
            networkSettingView.selectedItem = item
            networkSettingView.selectedValue = wifiItemLbl.text()
            item.bgColor(0xEAEAEA)
            item.bgOpa(100)
        })

        const wifiItemImg = dxUi.Image.build(item.id + 'wifi', item)
        wifiItemImg.align(dxUi.Utils.ALIGN.RIGHT_MID, -24, 0)
        wifiItemImg.source('/app/code/resource/image/wifi.png')

        const lockItemImg = dxUi.Image.build(item.id + 'lock', item)
        lockItemImg.align(dxUi.Utils.ALIGN.RIGHT_MID, -55, 0)
        lockItemImg.source('/app/code/resource/image/lock.png')

        return { wifiItemLbl, wifiItemImg, lockItemImg }
    }, (userdata, index) => {
        const txt = networkSettingView.wifiListData[Math.abs((index % 5))]
        if (txt) {
            userdata.wifiItemLbl.text(txt)
            userdata.wifiItemImg.show()
            userdata.lockItemImg.show()
        } else {
            userdata.wifiItemLbl.text(' ')
            userdata.wifiItemImg.hide()
            userdata.lockItemImg.hide()
        }
    })
    wifiList.align(dxUi.Utils.ALIGN.TOP_MID, 0, 110)
    wifiList.bgOpa(0)
    networkSettingView.wifiList = wifiList

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'networkSettingView.save', () => {
        let saveConfigData = {
            "net": {
                "type": networkSettingView.netInfo[0].dropdown.getSelected() + 1,
                "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                "ip": networkSettingView.netInfo[4].input.text(),
                "mask": networkSettingView.netInfo[5].input.text(),
                "gateway": networkSettingView.netInfo[6].input.text(),
                "dns": networkSettingView.netInfo[7].input.text() + ',' + networkSettingView.netInfo[8].input.text(),
                "psk": networkSettingView.netInfo[2].input.text(),
                "ssid": networkSettingView.selectedValue
            }
        }
        if (!networkSettingView.netInfo[3].switch.isSelect()) {
            // Static IP
            if (networkSettingView.netInfo[0].dropdown.getSelected() + 1 == 1) {
                // Ethernet
                saveConfigData = {
                    "net": {
                        "type": networkSettingView.netInfo[0].dropdown.getSelected() + 1,
                        "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                        "ip": networkSettingView.netInfo[4].input.text(),
                        "mask": networkSettingView.netInfo[5].input.text(),
                        "gateway": networkSettingView.netInfo[6].input.text(),
                        "dns": networkSettingView.netInfo[7].input.text() + ',' + networkSettingView.netInfo[8].input.text(),
                    }
                }
            } else if (networkSettingView.netInfo[0].dropdown.getSelected() + 1 == 2) {
                // WIFI
                saveConfigData = {
                    "net": {
                        "type": networkSettingView.netInfo[0].dropdown.getSelected() + 1,
                        "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                        "ip": networkSettingView.netInfo[4].input.text(),
                    }
                }
            } else {
                //4G
                saveConfigData = {
                    "net": {
                        "type": 4,
                    }
                }
            }
        } else {
            // Dynamic IP
            if (networkSettingView.netInfo[0].dropdown.getSelected() + 1 == 1) {
                // Ethernet
                saveConfigData = {
                    "net": {
                        "type": networkSettingView.netInfo[0].dropdown.getSelected() + 1,
                        "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                    }
                }
            } else if (networkSettingView.netInfo[0].dropdown.getSelected() + 1 == 2) {
                // WIFI
                saveConfigData = {
                    "net": {
                        "type": networkSettingView.netInfo[0].dropdown.getSelected() + 1,
                        "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                        "psk": networkSettingView.netInfo[2].input.text(),
                        "ssid": networkSettingView.selectedValue
                    }
                }
            } else {
                //4G
                saveConfigData = {
                    "net": {
                        "type": 4,
                    }
                }
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            networkSettingView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(configView.screenMain)
            }, 500)
        } else {
            networkSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    networkSettingView.changeNetType(0)

    networkSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'networkSettingView.success', 'networkSettingView.fail')
}

// 0: Ethernet 1: WiFi 3: 4G
networkSettingView.changeNetType = function (type) {
    if (type === 0) {
        networkSettingView.netInfo[1].obj.hide()
        networkSettingView.netInfo[2].obj.hide()
        networkSettingView.netInfo[3].obj.show()
        networkSettingView.netInfo[4].obj.show()
        networkSettingView.netInfo[5].obj.show()
        networkSettingView.netInfo[6].obj.show()
        networkSettingView.netInfo[7].obj.show()
        networkSettingView.netInfo[8].obj.show()
    } else if (type === 1) {
        networkSettingView.netInfo[1].obj.show()
        networkSettingView.netInfo[2].obj.show()
        networkSettingView.netInfo[3].obj.show()
        networkSettingView.netInfo[4].obj.show()
        networkSettingView.netInfo[5].obj.show()
        networkSettingView.netInfo[6].obj.show()
        networkSettingView.netInfo[7].obj.show()
        networkSettingView.netInfo[8].obj.show()
    } else {
        networkSettingView.netInfo[1].obj.hide()
        networkSettingView.netInfo[2].obj.hide()
        networkSettingView.netInfo[3].obj.hide()
        networkSettingView.netInfo[4].obj.hide()
        networkSettingView.netInfo[5].obj.hide()
        networkSettingView.netInfo[6].obj.hide()
        networkSettingView.netInfo[7].obj.hide()
        networkSettingView.netInfo[8].obj.hide()
    }
}

export default networkSettingView
