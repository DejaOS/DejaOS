import dxui from '../../../dxmodules/dxUi.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from '../util/viewUtils.js'
import common from '../../../dxmodules/dxCommon.js'
import driver from '../../driver.js'

const mainView = {}

mainView.init = function () {
    let main = dxui.View.build('mainView', dxui.Utils.LAYER.MAIN)
    mainView.main = main
    mainView.main.scroll(false)
    mainView.main.setPos(800, 1280)
    mainView.main.bgColor(0x3e3e3e)

    const wifiItemImg = dxui.Image.build('wifiIcon', mainView.main)
    wifiItemImg.align(dxui.Utils.ALIGN.TOP_LEFT, 700, 0)
    wifiItemImg.source('/app/code/resource/image/wifi.png')
    wifiItemImg.clickable(false)
    wifiItemImg.hide()
    mainView.wifiItemImg = wifiItemImg

    const ethItemImg = dxui.Image.build('ethIcon', mainView.main)
    ethItemImg.align(dxui.Utils.ALIGN.TOP_LEFT, 700, 0)
    ethItemImg.source('/app/code/resource/image/eth_enable.png')
    ethItemImg.clickable(false)
    ethItemImg.hide()
    mainView.ethItemImg = ethItemImg

    const mqttShow = dxui.Image.build('mqttIcon', mainView.main)
    mqttShow.align(dxui.Utils.ALIGN.TOP_LEFT, 750, 0)
    mqttShow.source('/app/code/resource/image/mqtt.png')
    mqttShow.clickable(false)
    mqttShow.hide()
    mainView.mqttShow = mqttShow


    const networkSettingBox = dxui.View.build('networkSettingBox', mainView.main)
    viewUtils._clearStyle(networkSettingBox)

    networkSettingBox.setSize(800, 1200)
    networkSettingBox.bgColor(0xeeeeee)
    networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 42)
    networkSettingBox.borderWidth(1)
    networkSettingBox.setBorderColor(0xDEDEDE)
    networkSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)
    networkSettingBox.bgOpa(0)
    networkSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    networkSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    networkSettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    mainView.netInfo = [
        {
            title: 'type',
            value: ['Ethernet', 'Wifi'],
            type: 'dropdown',
            obj: null,
            dropdown: null
        },
        {
            title: 'wifiName',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'wifiPwd',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'dhcp',
            value: ['no', 'yes'],
            type: 'dropdown',
            obj: null
        },
        {
            title: 'mqttAddr',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'username',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'password',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'ip',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'mask',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'gateway',
            value: null,
            type: 'input',
            obj: null
        },
        {
            title: 'dns',
            value: null,
            type: 'input',
            obj: null
        }
    ]

    mainView.netInfo.forEach((item, index) => {

        const networkSettingItem = dxui.View.build(networkSettingBox.id + item.title, networkSettingBox)
        viewUtils._clearStyle(networkSettingItem)
        item.obj = networkSettingItem
        networkSettingItem.setSize(760, 90)
        networkSettingItem.bgColor(0x959191)
        networkSettingItem.borderWidth(1)
        networkSettingItem.setBorderColor(0xDEDEDE)
        networkSettingItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        
        const title = dxui.Label.build(item.title, networkSettingItem)
        title.textFont(viewUtils.font(26))
        title.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        title.dataI18n = item.title
        title.text(item.title)
        
        
        if (item.type === 'input') {
            const input = viewUtils.input(networkSettingItem, item.title + 'input', undefined, undefined, 'mainView.input')
            input.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            input.setSize(400, 60)
            item.input = input
        }

        if (item.type === 'switch') {
            const __switch = dxui.Switch.build(item.title + 'switch', networkSettingItem)
            __switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            __switch.setSize(70, 35)
            item.switch = __switch
        }

        if (item.type === 'dropdown') {
            const dropdown = dxui.Dropdown.build(item.title + 'dropdown', networkSettingItem)
            dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            dropdown.setSize(200, 60)
            dropdown.textFont(viewUtils.font(26))
            dropdown.getList().textFont(viewUtils.font(26))
            dropdown.setSymbol('/app/code/resource/image/down.png')
            dropdown.setOptions(item.value)
            item.dropdown = dropdown            
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


    let type = driver.config.options.type
    let dhcp = driver.config.options.dhcp
    let ssid = driver.config.options.ssid
    let psk = driver.config.options.psk
    let mqttAddr = driver.config.options.mqttAddr
    let username = driver.config.options.username
    let password = driver.config.options.password
    
    mainView.netInfo[0].dropdown.setSelected(type - 1)
    mainView.netInfo[1].input.text(ssid)
    mainView.netInfo[2].input.text(psk)
    mainView.netInfo[3].dropdown.setSelected(dhcp - 1)
    mainView.netInfo[4].input.text(mqttAddr)
    mainView.netInfo[5].input.text(username)
    mainView.netInfo[6].input.text(password)
    



    const saveBtn = viewUtils.bottomBtn(mainView.main, mainView.main.id + 'saveBtn', 'save', () => {
        let saveConfigData = {
            "type": mainView.netInfo[0].dropdown.getSelected() + 1,
            "ssid": mainView.netInfo[1].input.text(),
            "psk": mainView.netInfo[2].input.text(),
            "dhcp": mainView.netInfo[3].dropdown.getSelected() + 1,
            "mqttAddr": mainView.netInfo[4].input.text(),
            "username": mainView.netInfo[5].input.text(),
            "password": mainView.netInfo[6].input.text(),
            "ip": mainView.netInfo[7].input.text(),
            "mask": mainView.netInfo[8].input.text(),
            "gateway": mainView.netInfo[9].input.text(),
            "dns": mainView.netInfo[10].input.text(),
        }
        
        std.saveFile("/app/code/src/config.json", JSON.stringify(saveConfigData))
        common.asyncReboot(2)

    }, '0x959191')
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -60)

}


export default mainView