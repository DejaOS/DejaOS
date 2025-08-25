import dxui from '../../../dxmodules/dxUi.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from '../util/viewUtils.js'
import common from '../../../dxmodules/dxCommon.js'
import log from '../../../dxmodules/dxLogger.js'

const mainView = {}

mainView.init = function () {
    let main = dxui.View.build('mainView', dxui.Utils.LAYER.MAIN)
    mainView.main = main
    mainView.main.scroll(false)
    mainView.main.setPos(480, 100)
    mainView.main.setSize(480, 360)
    mainView.main.bgColor(0x1e40af)

    // Beautify icon layout - increase spacing and position
    const wifiItemImg = dxui.Image.build('wifiIcon', mainView.main)
    wifiItemImg.align(dxui.Utils.ALIGN.TOP_LEFT, 60, 0)
    wifiItemImg.source('/app/code/resource/image/wifi.png')
    wifiItemImg.clickable(false)
    wifiItemImg.hide()
    mainView.wifiItemImg = wifiItemImg

    const ethItemImg = dxui.Image.build('ethIcon', mainView.main)
    ethItemImg.align(dxui.Utils.ALIGN.TOP_LEFT, 120, 0)
    ethItemImg.source('/app/code/resource/image/eth_enable.png')
    ethItemImg.clickable(false)
    ethItemImg.hide()
    mainView.ethItemImg = ethItemImg

    const mqttShow = dxui.Image.build('mqttIcon', mainView.main)
    mqttShow.align(dxui.Utils.ALIGN.TOP_LEFT, 180, 0)
    mqttShow.source('/app/code/resource/image/mqtt.png')
    mqttShow.clickable(false)
    mqttShow.hide()
    mainView.mqttShow = mqttShow

    // Beautify network setting container - use modern card style
    const networkSettingBox = dxui.View.build('networkSettingBox', mainView.main)
    viewUtils._clearStyle(networkSettingBox)

    networkSettingBox.setSize(460, 240)
    // Use white background and blue border card style
    networkSettingBox.bgColor(0xffffff)
    networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 30)
    networkSettingBox.borderWidth(2)
    networkSettingBox.setBorderColor(0x3b82f6)
    networkSettingBox.bgOpa(0.95)
    networkSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    networkSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    networkSettingBox.obj.lvObjSetStylePadGap(8, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
   
    mainView.networkSettingBox = networkSettingBox
    
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
        networkSettingItem.setSize(440, 45)
        networkSettingItem.bgColor(0xf8fafc)
        networkSettingItem.borderWidth(1)
        networkSettingItem.setBorderColor(0xe2e8f0)
        networkSettingItem.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
        
        const title = dxui.Label.build(item.title, networkSettingItem)
        title.textFont(viewUtils.font(18))
        title.align(dxui.Utils.ALIGN.LEFT_MID, 15, 0)
        title.dataI18n = item.title
        title.text(item.title)
        // Dark gray text
        title.textColor(0x374151) 
        
        if (item.type === 'input') {
            const input = viewUtils.input(mainView,networkSettingItem, item.title + 'input', undefined, undefined, 'mainView.input')
            input.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
            input.setSize(200, 35)
            // Beautify input box style
            input.bgColor(0xffffff)
            input.borderWidth(1)
            input.setBorderColor(0xd1d5db)
            item.input = input
        }

        if (item.type === 'switch') {
            const __switch = dxui.Switch.build(item.title + 'switch', networkSettingItem)
            __switch.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
            __switch.setSize(200, 35)
            item.switch = __switch
        }

        if (item.type === 'dropdown') {
            const dropdown = dxui.Dropdown.build(item.title + 'dropdown', networkSettingItem)
            dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
            dropdown.setSize(200, 35)
            dropdown.textFont(viewUtils.font(16))
            dropdown.getList().textFont(viewUtils.font(16))
            dropdown.setSymbol('/app/code/resource/image/down.png')
            dropdown.setOptions(item.value)
            // Beautify dropdown style
            dropdown.bgColor(0xffffff)
            dropdown.borderWidth(1)
            dropdown.setBorderColor(0xd1d5db)
            item.dropdown = dropdown            
        }

        if (item.type === 'label') {
            const label = dxui.Label.build(item.title + 'label', networkSettingItem)
            label.textFont(viewUtils.font(16))
            label.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
            label.text(item.value)
            // Medium gray text
            label.textColor(0x6b7280) 
            item.label = label
        }

    })


    // Read configuration data from JSON config file
    let type = 1
    let dhcp = 1
    let ssid = ""
    let psk = ""
    let mqttAddr = ""
    let username = ""
    let password = ""
    let ip = ""
    let mask = ""
    let gateway = ""
    let dns = ""
    
    try {
        if (std.exist('/app/code/src/config.json')) {
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            log.info("[mainView] Reading config file:", configData)
            type = configData.type || 1
            dhcp = configData.dhcp || 2
            ssid = configData.ssid || ""
            psk = configData.psk || ""
            mqttAddr = configData.mqttAddr || ""
            username = configData.username || ""
            password = configData.password || ""
            ip = configData.ip || ""
            mask = configData.mask || ""
            gateway = configData.gateway || ""
            dns = configData.dns || ""
        }
    } catch (error) {
        log.error("[mainView] Failed to read config file:", error)
    }
    
    mainView.netInfo[0].dropdown.setSelected(type - 1)
    mainView.netInfo[1].input.text(ssid)
    mainView.netInfo[2].input.text(psk)
    mainView.netInfo[3].dropdown.setSelected(dhcp - 1)
    mainView.netInfo[4].input.text(mqttAddr)
    mainView.netInfo[5].input.text(username)
    mainView.netInfo[6].input.text(password)
    mainView.netInfo[7].input.text(ip)
    mainView.netInfo[8].input.text(mask)
    mainView.netInfo[9].input.text(gateway)
    mainView.netInfo[10].input.text(dns)
    
    // Add type dropdown change event listener
    mainView.netInfo[0].dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        const selectedType = mainView.netInfo[0].dropdown.getSelected()
        const wifiNameItem = mainView.netInfo[1].obj
        const wifiPwdItem = mainView.netInfo[2].obj
        
        if (selectedType === 0) { // Ethernet
            wifiNameItem.hide()
            wifiPwdItem.hide()
        } else { // Wifi
            wifiNameItem.show()
            wifiPwdItem.show()
        }
    })
    
    // Add dhcp dropdown change event listener
    mainView.netInfo[3].dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        const selectedDhcp = mainView.netInfo[3].dropdown.getSelected()
        const ipItem = mainView.netInfo[7].obj
        const maskItem = mainView.netInfo[8].obj
        const gatewayItem = mainView.netInfo[9].obj
        const dnsItem = mainView.netInfo[10].obj
        
        if (selectedDhcp === 1) { // yes (DHCP auto get)
            ipItem.hide()
            maskItem.hide()
            gatewayItem.hide()
            dnsItem.hide()
        } else { // no (Static IP)
            ipItem.show()
            maskItem.show()
            gatewayItem.show()
            dnsItem.show()
        }
    })
    
    // Set display state based on current selection during initialization
    const currentType = mainView.netInfo[0].dropdown.getSelected()
    const wifiNameItem = mainView.netInfo[1].obj
    const wifiPwdItem = mainView.netInfo[2].obj
    
    if (currentType === 0) { // Ethernet
        wifiNameItem.hide()
        wifiPwdItem.hide()
    } else { // Wifi
        wifiNameItem.show()
        wifiPwdItem.show()
    }
    
    // Set display state based on dhcp selection during initialization
    const currentDhcp = mainView.netInfo[3].dropdown.getSelected()
    const ipItem = mainView.netInfo[7].obj
    const maskItem = mainView.netInfo[8].obj
    const gatewayItem = mainView.netInfo[9].obj
    const dnsItem = mainView.netInfo[10].obj
    
    if (currentDhcp === 1) { // yes (DHCP auto get)
        ipItem.hide()
        maskItem.hide()
        gatewayItem.hide()
        dnsItem.hide()
    } else { // no (Static IP)
        ipItem.show()
        maskItem.show()
        gatewayItem.show()
        dnsItem.show()
    }
    



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

    }, '0x10b981') // Use green theme
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    // Adjust button size
    saveBtn.setSize(120, 40)

}

export default mainView