import dxui from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
import map from '../../../../dxmodules/dxMap.js'
const net_map = map.get("NET")
const networkSettingView = {}
// let devType
networkSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('networkSettingView', dxui.Utils.LAYER.MAIN)
    // 默认返回的上级界面是配置页面，在企业微信模式下，返回的上级界面是企业微信网络配置页面
    screenMain.backScreen = configView.screenMain
    networkSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        // devType = screen.getConfig()["sys.devType"]
        // let netTypes = []
        // if (devType == 0) {
        //     netTypes = [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView.wifi')]
        // } else if (devType == 1) {
        //     netTypes = [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView._4G')]
        // } else {
        //     netTypes = [i18n.t('networkSettingView.ethernet')]
        // }
        // networkSettingView.netInfo[0].value = netTypes
        // networkSettingView.netInfo[0].dropdown.setOptions(networkSettingView.netInfo[0].value)

        // networkSettingView.netInfo[10].value = i18n.t('networkSettingView.networkUnconnected')
        // networkSettingView.netInfo[10].label.text(networkSettingView.netInfo[10].value)

        const configAll = screen.getConfig()

        // Store initial state for comparison on save
        networkSettingView.initialConfig = {
            type: configAll["net.type"],
            dhcp: configAll["net.dhcp"],
            ip: configAll["net.ip"],
            mask: configAll["net.mask"],
            gateway: configAll["net.gateway"],
            dns: configAll["net.dns"].split(",")[0] ? configAll["net.dns"].split(",")[0] : "",
            ssid: configAll["net.ssid"],
            psk: configAll["net.psk"]
        }

        networkSettingView.changeNetType(configAll["net.type"])
        networkSettingView.netInfo[0].value = screen.dxDriver.DRIVER.MODEL == "vf203" ? [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView.wifi'), i18n.t('networkSettingView._4G')] : [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView._4G')]
        networkSettingView.netInfo[0].dropdown.setOptions(networkSettingView.netInfo[0].value)
        networkSettingView.refresh()
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        wifiListBoxClose.send(dxui.Utils.EVENT.CLICK)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'networkSettingViewTitle', 'networkSettingView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))
    screenMain.titleBox = titleBox
    screenMain.titleBox.backScreen = screenMain.backScreen


    const networkSettingBox = dxui.View.build('networkSettingBox', screenMain)
    viewUtils._clearStyle(networkSettingBox)
    networkSettingBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (700 / 1024))
    networkSettingBox.bgColor(0xeeeeee)
    networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (142 / 1024))
    networkSettingBox.borderWidth(1)
    networkSettingBox.setBorderColor(0xDEDEDE)
    networkSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)
    networkSettingBox.bgOpa(0)
    networkSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    networkSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    networkSettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    networkSettingView.netInfo = [
        {
            title: 'networkSettingView.type',
            value: screen.dxDriver.DRIVER.MODEL == "vf203" ? [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView.wifi'), i18n.t('networkSettingView._4G')] : [i18n.t('networkSettingView.ethernet'), i18n.t('networkSettingView._4G')],
            type: 'dropdown',
            obj: null,
            dropdown: null
        },
        {
            title: 'networkSettingView.wifiName',
            value: null,
            type: 'input',
            obj: null,
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
            value: " ",
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
        const networkSettingItem = dxui.View.build(networkSettingBox.id + item.title, networkSettingBox)
        if (item.title === 'networkSettingView.dns2') {
            networkSettingItem.hide()
        }
        viewUtils._clearStyle(networkSettingItem)
        item.obj = networkSettingItem
        networkSettingItem.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        networkSettingItem.bgColor(0xffffff)
        networkSettingItem.borderWidth(1)
        networkSettingItem.setBorderColor(0xDEDEDE)
        networkSettingItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const title = dxui.Label.build(item.title, networkSettingItem)
        title.textFont(viewUtils.font(26))
        title.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        title.dataI18n = item.title


        if (item.type === 'input') {
            const input = viewUtils.input(networkSettingItem, item.title + 'input', undefined, undefined, 'networkSettingView.input')
            input.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            input.setSize(screen.screenSize.width * (310 / 600), screen.screenSize.height * (45 / 1024))
            item.input = input

            if (item.title === 'networkSettingView.wifiName') {
                input.setSize(screen.screenSize.width * (200 / 600), screen.screenSize.height * (45 / 1024))
                input.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (110 / 600), 0)

                const searchBtn = dxui.Button.build('wifiSearchBtn', networkSettingItem)
                searchBtn.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (45 / 1024))
                searchBtn.radius(screen.screenSize.width * (10 / 600))
                searchBtn.bgColor(0xEAEAEA)
                searchBtn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)

                const searchBtnLabel = dxui.Label.build('wifiSearchBtnLabel', searchBtn)
                searchBtnLabel.dataI18n = 'networkSettingView.search'
                searchBtnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0)
                searchBtnLabel.textFont(viewUtils.font(24))
                searchBtnLabel.textColor(0x000000)

                searchBtn.on(dxui.Utils.EVENT.CLICK, () => {
                    if (networkSettingView.wifiScanTimer) {
                        std.clearInterval(networkSettingView.wifiScanTimer);
                        networkSettingView.wifiScanTimer = null;
                    }
                    // Initial scan
                    screen.netGetWifiSsidList()
                    wifiList.refresh()
                    wifiListBoxbg.moveForeground()
                    wifiListBoxbg.show()
                    // Start new polling
                    networkSettingView.wifiScanTimer = std.setInterval(() => {
                        screen.netGetWifiSsidList()
                    }, 3000)
                })
            }
        }

        if (item.type === 'switch') {
            const __switch = dxui.Switch.build(item.title + 'switch', networkSettingItem)
            __switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            __switch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
            __switch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)
            item.switch = __switch
        }

        if (item.type === 'dropdown') {
            const dropdown = dxui.Dropdown.build(item.title + 'dropdown', networkSettingItem)
            dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            dropdown.setSize(screen.screenSize.width * (200 / 600), screen.screenSize.height * (45 / 1024))
            dropdown.padTop((screen.screenSize.height * (45 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
            dropdown.padBottom(0)
            dropdown.textFont(viewUtils.font(26))
            dropdown.getList().textFont(viewUtils.font(26))
            dropdown.setSymbol(screen.dropdownSymbol)
            dropdown.setOptions(item.value)
            item.dropdown = dropdown

            if (item.title === 'networkSettingView.type') {
                dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                    switch (dropdown.getSelected()) {
                        case 0:
                            networkSettingView.changeNetType(1)
                            // 以太网
                            screen.saveConfig({
                                net: {
                                    type: 1
                                }
                            })
                            break;
                        case 1:
                            networkSettingView.changeNetType(2)
                            // 切换为WiFi/vf202是切换为4g
                            screen.saveConfig({
                                net: {
                                    type: screen.dxDriver.DRIVER.MODEL == "vf203" ? 2 : 4
                                }
                            })
                            break;
                        case 2:
                            networkSettingView.changeNetType(4)
                            // 切换为4g
                            screen.saveConfig({
                                net: {
                                    type: 4
                                }
                            })
                            break;
                        default:
                            break;
                    }
                    screen.netReconnect()
                })
            }
        }

        if (item.type === 'label') {
            const label = dxui.Label.build(item.title + 'label', networkSettingItem)
            label.textFont(viewUtils.font(26))
            label.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            label.text(item.value)
            label.textColor(0x333333)
            item.label = label
        }

    })

    // wifi列表
    const wifiListBoxbg = dxui.View.build('wifiListBoxbg', screenMain)
    viewUtils._clearStyle(wifiListBoxbg)
    wifiListBoxbg.setSize(screen.screenSize.width, screen.screenSize.height)
    wifiListBoxbg.bgColor(0x000000)
    wifiListBoxbg.bgOpa(50)
    wifiListBoxbg.hide()
    wifiListBoxbg.on(dxui.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxui.Utils.EVENT.CLICK)
    })

    const wifiListBox = dxui.View.build('wifiListBox', wifiListBoxbg)
    viewUtils._clearStyle(wifiListBox)
    wifiListBox.setSize(screen.screenSize.width * (520 / 600), screen.screenSize.height * (800 / 1024))
    wifiListBox.bgColor(0xffffff)
    wifiListBox.radius(screen.screenSize.width * (20 / 600))
    wifiListBox.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    const wifiListBoxTitle = dxui.Label.build('wifiListBoxTitle', wifiListBox)
    wifiListBoxTitle.textFont(viewUtils.font(28))
    wifiListBoxTitle.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (32 / 1024))
    wifiListBoxTitle.dataI18n = 'networkSettingView.wifiList'

    const wifiListBoxClose = viewUtils.imageBtn(wifiListBox, 'wifiListBoxClose', screen.resourcePath.imagePath + '/close_small.png')
    wifiListBoxClose.align(dxui.Utils.ALIGN.TOP_RIGHT, -screen.screenSize.width * (36 / 600), screen.screenSize.height * (30 / 1024))
    wifiListBoxClose.on(dxui.Utils.EVENT.CLICK, () => {
        wifiListBoxbg.hide()
        if (networkSettingView.wifiScanTimer) {
            std.clearInterval(networkSettingView.wifiScanTimer)
            networkSettingView.wifiScanTimer = null
        }
        networkSettingView.wifiListData = []
    })

    const closeBtn = dxui.Button.build('closeBtn', wifiListBox)
    closeBtn.setSize(screen.screenSize.width * (172 / 600), screen.screenSize.height * (50 / 1024))
    closeBtn.radius(screen.screenSize.width * (10 / 600))
    closeBtn.bgColor(0xEAEAEA)
    closeBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, screen.screenSize.width * (69 / 600), -screen.screenSize.height * (53 / 1024))
    closeBtn.on(dxui.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxui.Utils.EVENT.CLICK)
    })

    const closeBtnText = dxui.Label.build('closeBtnText', closeBtn)
    closeBtnText.textFont(viewUtils.font(24))
    closeBtnText.dataI18n = 'networkSettingView.close'
    closeBtnText.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    closeBtnText.textColor(0x000000)

    const confirmBtn = dxui.Button.build('confirmBtn', wifiListBox)
    confirmBtn.setSize(screen.screenSize.width * (172 / 600), screen.screenSize.height * (50 / 1024))
    confirmBtn.radius(screen.screenSize.width * (10 / 600))
    confirmBtn.bgColor(0x000000)
    confirmBtn.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -screen.screenSize.width * (69 / 600), -screen.screenSize.height * (53 / 1024))
    confirmBtn.on(dxui.Utils.EVENT.CLICK, () => {
        wifiListBoxClose.send(dxui.Utils.EVENT.CLICK)
        networkSettingView.netInfo[1].input.text(networkSettingView.selectedValue)
    })

    const confirmBtnText = dxui.Label.build('confirmBtnText', confirmBtn)
    confirmBtnText.textFont(viewUtils.font(24))
    confirmBtnText.dataI18n = 'networkSettingView.confirm'
    confirmBtnText.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    confirmBtnText.textColor(0xffffff)

    // const wifiListData = ['办公区无线网络']
    // const wifiListData = ['办公区无线网络', '生产区无线网络', '测试区无线网络', '访客区无线网络', '开发区无线网络']
    networkSettingView.wifiListData = []

    networkSettingView.selectedValue = screen.getConfig()["net.ssid"]
    networkSettingView.selectedItem = null

    const wifiList = dxui.View.build('wifiList', wifiListBox)
    viewUtils._clearStyle(wifiList)
    const itemCount = 10
    const itemHeight = screen.screenSize.height * (60 / 1024)
    wifiList.setSize(screen.screenSize.width * (440 / 600), itemHeight * itemCount)
    wifiList.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    wifiList.obj.lvObjSetStylePadAll(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    wifiList.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    const listItems = []

    for (let i = 0; i < itemCount; i++) {
        const item = dxui.View.build(`wifiListItem${i}`, wifiList)
        viewUtils._clearStyle(item)
        item.setSize(screen.screenSize.width * (440 / 600), itemHeight)
        item.bgOpa(0)
        item.borderWidth(1)
        item.setBorderColor(0xDEDEDE)
        item.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const wifiItemLbl = dxui.Label.build(item.id + 'wifiItemLbl', item)
        wifiItemLbl.align(dxui.Utils.ALIGN.LEFT_MID, screen.screenSize.width * (25 / 600), 0)
        wifiItemLbl.textFont(viewUtils.font(24))
        wifiItemLbl.textColor(0x888888)
        wifiItemLbl.width(screen.screenSize.width * (300 / 600))
        wifiItemLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

        item.radius(10)
        item.on(dxui.Utils.EVENT.CLICK, () => {
            if (networkSettingView.selectedItem) {
                networkSettingView.selectedItem.bgOpa(0)
            }
            networkSettingView.selectedItem = item
            networkSettingView.selectedValue = wifiItemLbl.text()
            item.bgColor(0xEAEAEA)
            item.bgOpa(100)
        })

        const wifiItemImg = dxui.Image.build(item.id + 'wifi', item)
        wifiItemImg.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (24 / 600), 0)
        wifiItemImg.source(screen.resourcePath.imagePath + '/wifi.png')

        const lockItemImg = dxui.Image.build(item.id + 'lock', item)
        lockItemImg.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (55 / 600), 0)
        lockItemImg.source(screen.resourcePath.imagePath + '/lock.png')

        listItems.push({ container: item, label: wifiItemLbl, wifiImg: wifiItemImg, lockImg: lockItemImg })
        item.hide()
    }

    wifiList.refresh = () => {
        const data = networkSettingView.wifiListData.slice(0, itemCount)
        listItems.forEach((item, index) => {
            if (data[index]) {
                item.label.text(data[index])
                item.wifiImg.show()
                item.lockImg.show()
                item.container.show()
            } else {
                item.container.hide()
            }
        })
    }
    wifiList.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (80 / 1024))
    wifiList.bgOpa(0)
    networkSettingView.wifiList = wifiList

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'networkSettingView.save', () => {
        if (!networkSettingView._isConfigChanged()) {
            // No changes, just go back
            dxui.loadMain(screenMain.backScreen)
            return
        }

        let netType = 1
        switch (networkSettingView.netInfo[0].dropdown.getSelected()) {
            case 0:
                netType = 1
                break;
            case 1:
                netType = screen.dxDriver.DRIVER.MODEL == "vf203" ? 2 : 4
                break;
            case 2:
                netType = 4
                break;
            default:
                break;
        }

        let saveConfigData = {
            "net": {
                "type": netType,
                "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                "ip": networkSettingView.netInfo[4].input.text(),
                "mask": networkSettingView.netInfo[5].input.text(),
                "gateway": networkSettingView.netInfo[6].input.text(),
                "dns": networkSettingView.netInfo[7].input.text(),
                "psk": networkSettingView.netInfo[2].input.text(),
                "ssid": networkSettingView.netInfo[1].input.text()
            }
        }
        if (!networkSettingView.netInfo[3].switch.isSelect()) {
            switch (networkSettingView.netInfo[0].dropdown.getSelected()) {
                case 0:
                    // 以太网
                    saveConfigData = {
                        "net": {
                            "type": netType,
                            "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                            "ip": networkSettingView.netInfo[4].input.text(),
                            "mask": networkSettingView.netInfo[5].input.text(),
                            "gateway": networkSettingView.netInfo[6].input.text(),
                            "dns": networkSettingView.netInfo[7].input.text(),
                        }
                    }
                    break;
                case 1:
                    // WIFI/4G
                    saveConfigData = screen.dxDriver.DRIVER.MODEL == "vf203" ? {
                        "net": {
                            "type": netType,
                            "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                            "psk": networkSettingView.netInfo[2].input.text(),
                            "ssid": networkSettingView.netInfo[1].input.text(),
                            "ip": networkSettingView.netInfo[4].input.text(),
                            "mask": networkSettingView.netInfo[5].input.text(),
                            "gateway": networkSettingView.netInfo[6].input.text(),
                        }
                    } : {
                        "net": {
                            "type": netType,
                        }
                    }
                    break;
                case 2:
                    // 4G
                    saveConfigData = {
                        "net": {
                            "type": netType,
                        }
                    }
                    break;
                default:
                    break;
            }
        } else {
            switch (networkSettingView.netInfo[0].dropdown.getSelected()) {
                case 0:
                    // 以太网
                    saveConfigData = {
                        "net": {
                            "type": netType,
                            "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                        }
                    }
                    break;
                case 1:
                    // WIFI
                    saveConfigData = screen.dxDriver.DRIVER.MODEL == "vf203" ? {
                        "net": {
                            "type": netType,
                            "dhcp": networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
                            "psk": networkSettingView.netInfo[2].input.text(),
                            "ssid": networkSettingView.netInfo[1].input.text()
                        }
                    } : {
                        "net": {
                            "type": netType,
                        }
                    }
                    break;
                case 2:
                    //4G
                    saveConfigData = {
                        "net": {
                            "type": netType,
                        }
                    }
                    break;
                default:
                    break;
            }
        }

        const res = screen.saveConfig(saveConfigData)

        if (res === true) {
            // 保存成功
            networkSettingView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(screenMain.backScreen)
            }, 500)
        } else {
            networkSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))

    networkSettingView.changeNetType(1)

    networkSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'networkSettingView.success', 'networkSettingView.fail')

    screen.updateNetStatus(net_map.get("NET_STATUS"))//有可能执行到这里的时候网络已经连接完成
}

networkSettingView._isConfigChanged = function () {
    //如果打开界面时的数据和点击保存按钮时的数据前后没有发生变化，就不触发重连和数据保存
    if (net_map.get("NET_STATUS") != "connected") {
        return true //但是假如网络没连上，就一定要触发重连和数据保存
    }
    const selectedTypeIndex = networkSettingView.netInfo[0].dropdown.getSelected()
    let currentType
    switch (selectedTypeIndex) {
        case 0:
            currentType = 1 // Ethernet
            break;
        case 1:
            currentType = screen.dxDriver.DRIVER.MODEL == "vf203" ? 2 : 4 // WiFi/4G
            break;
        case 2:
            currentType = 4 // 4G
            break;
        default:
            break;
    }

    const currentConfig = {
        type: currentType,
        dhcp: networkSettingView.netInfo[3].switch.isSelect() ? 2 : 1,
        ip: networkSettingView.netInfo[4].input.text(),
        mask: networkSettingView.netInfo[5].input.text(),
        gateway: networkSettingView.netInfo[6].input.text(),
        dns: networkSettingView.netInfo[7].input.text(),
        psk: networkSettingView.netInfo[2].input.text(),
        ssid: networkSettingView.netInfo[1].input.text()
    }

    const initial = networkSettingView.initialConfig
    if (initial.type !== currentConfig.type ||
        initial.dhcp !== currentConfig.dhcp ||
        initial.ssid !== currentConfig.ssid ||
        initial.psk !== currentConfig.psk) {
        return true
    }

    if (currentConfig.dhcp === 1) { // Static IP checks only if DHCP is off
        if (initial.ip !== currentConfig.ip ||
            initial.mask !== currentConfig.mask ||
            initial.gateway !== currentConfig.gateway ||
            (currentConfig.type === 1 && initial.dns !== currentConfig.dns)) {
            return true
        }
    }

    return false
}

// 1:以太网 2:wifi 4:4G
networkSettingView.changeNetType = function (type) {
    if (type === 1) {
        // 以太网
        networkSettingView.netInfo[1].obj.hide()
        networkSettingView.netInfo[2].obj.hide()
        networkSettingView.netInfo[3].obj.show()
        networkSettingView.netInfo[4].obj.show()
        networkSettingView.netInfo[5].obj.show()
        networkSettingView.netInfo[6].obj.show()
        networkSettingView.netInfo[7].obj.show()
        // networkSettingView.netInfo[8].obj.show()
    } else if (type === 2) {
        // wifi
        networkSettingView.netInfo[1].obj.show()
        networkSettingView.netInfo[2].obj.show()
        networkSettingView.netInfo[3].obj.show()
        networkSettingView.netInfo[4].obj.show()
        networkSettingView.netInfo[5].obj.show()
        networkSettingView.netInfo[6].obj.show()
        networkSettingView.netInfo[7].obj.hide()
        // networkSettingView.netInfo[8].obj.show()
    } else if (type === 4) {
        networkSettingView.netInfo[1].obj.hide()
        networkSettingView.netInfo[2].obj.hide()
        networkSettingView.netInfo[3].obj.hide()
        networkSettingView.netInfo[4].obj.hide()
        networkSettingView.netInfo[5].obj.hide()
        networkSettingView.netInfo[6].obj.hide()
        networkSettingView.netInfo[7].obj.hide()
        // networkSettingView.netInfo[8].obj.hide()
    }
    // networkSettingView.netInfo[9].obj.hide()
}

networkSettingView.refresh = function () {
    const configAll = screen.getConfig()

    let selectNum = 0
    switch (configAll["net.type"]) {
        case 1:
            selectNum = 0
            break;
        case 2:
            selectNum = 1
            break;
        case 4:
            selectNum = screen.dxDriver.DRIVER.MODEL == "vf203" ? 2 : 1
            break;
        default:
            break;
    }
    networkSettingView.netInfo[0].dropdown.setSelected(selectNum)
    networkSettingView.netInfo[1].input.text(configAll["net.ssid"])
    networkSettingView.netInfo[2].input.text(configAll["net.psk"])
    networkSettingView.netInfo[3].switch.select(configAll["net.dhcp"] == 2)
    networkSettingView.netInfo[4].input.text(configAll["net.ip"])
    networkSettingView.netInfo[5].input.text(configAll["net.mask"])
    networkSettingView.netInfo[6].input.text(configAll["net.gateway"])
    networkSettingView.netInfo[7].input.text(configAll["net.dns"].split(",")[0] ? configAll["net.dns"].split(",")[0] : "")
    // networkSettingView.netInfo[8].input.text(configAll["net.dns"].split(",")[1] ? configAll["net.dns"].split(",")[1] : "")
    networkSettingView.netInfo[9].label.text(configAll["net.mac"] ? configAll["net.mac"] : " ")
}

export default networkSettingView
