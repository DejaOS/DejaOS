import dxui from '../../dxmodules/dxUi.js'
import bus from '../../dxmodules/dxEventBus.js'
import log from '../../dxmodules/dxLogger.js'
import UIManager from '../UIManager.js'
import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import KeyboardOverlay from '../ui/KeyboardOverlay.js'
import NetworkLoadingOverlay from '../ui/NetworkLoadingOverlay.js'
import EventTopics from '../constants/EventTopics.js'

const NetworkPage = {
    mode: 'ethernet',
    pendingType: null,

    init: function init() {
        this.shell = UI.shell(this, 'network', 'System Settings', 'Ethernet & Wi-Fi', true)
        const content = this.shell.content
        UI.label('network_heading', content, 'Network', 20, 16, 220, 31, 22, UI.Theme.INK, true)
        UI.label('network_heading_sub', content, 'DHCP and static IP are supported', 20, 47, 300, 18, 10, UI.Theme.MUTED, false)
        this.statusLabel = UI.label('network_connection_status', content, '● Checking', 330, 25, 130, 24, 10, UI.Theme.BRAND, true, dxui.Utils.TEXT_ALIGN.RIGHT)

        function showEthernet() {
            NetworkPage.setMode('ethernet')
        }
        function showWifi() {
            NetworkPage.setMode('wifi')
        }
        this.ethTab = UI.button('network_eth_tab', content, 'Ethernet', 20, 74, 215, 42, UI.Theme.WHITE, UI.Theme.BRAND_DEEP, showEthernet, 13, 12)
        this.wifiTab = UI.button('network_wifi_tab', content, 'Wi-Fi', 245, 74, 215, 42, 0xe8eeed, UI.Theme.MUTED, showWifi, 13, 12)

        this.ethPanel = UI.view('network_eth_panel', content, 0, 126, 480, 638, UI.Theme.PAGE, 0)
        this.wifiPanel = UI.view('network_wifi_panel', content, 0, 126, 480, 638, UI.Theme.PAGE, 0)
        this.wifiPanel.scroll(true)
        this.buildEthernetPanel()
        this.buildWifiPanel()
        this.setMode('ethernet')
        return this.shell.root
    },

    buildEthernetPanel: function buildEthernetPanel() {
        const card = UI.card('network_eth_card', this.ethPanel, 20, 10, 440, 244, 18)
        this.ethConfig = { card, staticControls: [], dhcp: true }
        UI.label('network_eth_title', card, 'Ethernet', 18, 15, 210, 26, 15, UI.Theme.INK, true)
        UI.label('network_eth_desc', card, 'Save settings and connect immediately', 18, 43, 320, 18, 9, UI.Theme.MUTED, false)
        UI.label('network_eth_dhcp_label', card, 'Use DHCP', 18, 78, 180, 24, 11, UI.Theme.MUTED, false)
        this.ethConfig.dhcpSwitch = dxui.Switch.build('network_eth_dhcp', card)
        this.ethConfig.dhcpSwitch.setSize(44, 24)
        this.ethConfig.dhcpSwitch.setPos(374, 76)
        this.ethConfig.dhcpSwitch.select(true)
        this.ethConfig.modeLabel = UI.label('network_eth_mode', card, 'Mode: DHCP', 18, 114, 250, 22, 10, UI.Theme.BRAND_DEEP, true)
        this.ethConfig.fields = this.buildStaticFields('network_eth', card, 18, 152)
        this.ethConfig.fields.forEach(function collect(control) {
            NetworkPage.ethConfig.staticControls.push(control.label, control.input)
        })

        function toggleEthDhcp() {
            NetworkPage.ethConfig.dhcp = NetworkPage.ethConfig.dhcpSwitch.isSelect()
            NetworkPage.layoutIpConfig(NetworkPage.ethConfig)
        }
        this.ethConfig.dhcpSwitch.on(dxui.Utils.EVENT.VALUE_CHANGED, toggleEthDhcp)
        function saveEthernet() {
            NetworkPage.connectEthernet()
        }
        this.ethConfig.saveButton = UI.button('network_eth_save', card, 'Save & Connect', 18, 154, 404, 42, UI.Theme.BRAND, UI.Theme.WHITE, saveEthernet, 12, 13)
        this.layoutIpConfig(this.ethConfig)
    },

    buildWifiPanel: function buildWifiPanel() {
        const card = UI.card('network_wifi_card', this.wifiPanel, 20, 10, 440, 330, 18)
        this.wifiConfig = { card, staticControls: [], dhcp: true }
        UI.label('network_wifi_title', card, 'Wi-Fi', 18, 14, 210, 26, 15, UI.Theme.INK, true)
        this.wifiConfig.ssid = this.buildInput('network_wifi_ssid', card, 'SSID', 18, 52, '', dxui.Utils.KEYBOARD.K26, 404)
        this.wifiConfig.password = this.buildInput('network_wifi_password', card, 'Wi-Fi Password', 18, 122, '', dxui.Utils.KEYBOARD.K26, 404)
        UI.label('network_wifi_dhcp_label', card, 'Use DHCP', 18, 196, 180, 24, 11, UI.Theme.MUTED, false)
        this.wifiConfig.dhcpSwitch = dxui.Switch.build('network_wifi_dhcp', card)
        this.wifiConfig.dhcpSwitch.setSize(44, 24)
        this.wifiConfig.dhcpSwitch.setPos(374, 194)
        this.wifiConfig.dhcpSwitch.select(true)
        this.wifiConfig.modeLabel = UI.label('network_wifi_mode', card, 'Mode: DHCP', 18, 232, 250, 22, 10, UI.Theme.BRAND_DEEP, true)
        this.wifiConfig.fields = this.buildStaticFields('network_wifi', card, 18, 268)
        this.wifiConfig.fields.forEach(function collect(control) {
            NetworkPage.wifiConfig.staticControls.push(control.label, control.input)
        })

        function toggleWifiDhcp() {
            NetworkPage.wifiConfig.dhcp = NetworkPage.wifiConfig.dhcpSwitch.isSelect()
            NetworkPage.layoutWifi()
        }
        this.wifiConfig.dhcpSwitch.on(dxui.Utils.EVENT.VALUE_CHANGED, toggleWifiDhcp)
        function saveWifi() {
            NetworkPage.connectWifi()
        }
        this.wifiConfig.saveButton = UI.button('network_wifi_save', card, 'Save & Connect', 18, 268, 404, 42, UI.Theme.BRAND, UI.Theme.WHITE, saveWifi, 12, 13)
        this.layoutWifi()
    },

    buildInput: function buildInput(id, parent, labelText, x, y, value, keyboardMode, width) {
        const fieldLabel = UI.label(id + '_label', parent, labelText, x, y, width || 185, 18, 9, UI.Theme.MUTED, true)
        const input = dxui.Textarea.build(id + '_input', parent)
        input.setSize(width || 185, 38)
        input.setPos(x, y + 20)
        input.setOneLine(true)
        input.setMaxLength(64)
        input.setCursorClickPos(true)
        input.radius(9)
        input.borderWidth(1)
        input.borderColor(0xdbe3e1)
        input.bgColor(0xf9fbfa)
        input.textColor(UI.Theme.INK)
        input.textFont(UIManager.font(12, dxui.Utils.FONT_STYLE.NORMAL))
        input.text(value || '')
        function focusInput() {
            KeyboardOverlay.open(input, keyboardMode)
        }
        input.on(dxui.Utils.EVENT.FOCUSED, focusInput)
        input.on(dxui.Utils.EVENT.CLICK, focusInput)
        return { label: fieldLabel, input }
    },

    buildStaticFields: function buildStaticFields(prefix, parent, x, y) {
        return [
            this.buildInput(prefix + '_ip', parent, 'IP Address', x, y, '192.168.10.86', dxui.Utils.KEYBOARD.NUMBER, 194),
            this.buildInput(prefix + '_mask', parent, 'Subnet Mask', x + 210, y, '255.255.255.0', dxui.Utils.KEYBOARD.NUMBER, 194),
            this.buildInput(prefix + '_gateway', parent, 'Gateway', x, y + 70, '192.168.10.1', dxui.Utils.KEYBOARD.NUMBER, 194),
            this.buildInput(prefix + '_dns', parent, 'DNS', x + 210, y + 70, '223.5.5.5', dxui.Utils.KEYBOARD.NUMBER, 194)
        ]
    },

    layoutIpConfig: function layoutIpConfig(config) {
        const showStatic = !config.dhcp
        config.staticControls.forEach(function toggle(control) {
            if (showStatic) control.show()
            else control.hide()
        })
        config.modeLabel.text(showStatic ? 'Mode: Static IP' : 'Mode: DHCP')
        config.saveButton.setPos(18, showStatic ? 306 : 154)
        config.card.setSize(440, showStatic ? 370 : 218)
    },

    layoutWifi: function layoutWifi() {
        const showStatic = !this.wifiConfig.dhcp
        this.wifiConfig.staticControls.forEach(function toggle(control) {
            if (showStatic) control.show()
            else control.hide()
        })
        this.wifiConfig.modeLabel.text(showStatic ? 'Mode: Static IP' : 'Mode: DHCP')
        this.wifiConfig.saveButton.setPos(18, showStatic ? 422 : 268)
        this.wifiConfig.card.setSize(440, showStatic ? 480 : 330)
    },

    setMode: function setMode(mode) {
        this.mode = mode
        if (mode === 'ethernet') {
            this.ethPanel.show()
            this.wifiPanel.hide()
            this.ethTab.bgColor(UI.Theme.WHITE)
            this.ethTab._label.textColor(UI.Theme.BRAND_DEEP)
            this.wifiTab.bgColor(0xe8eeed)
            this.wifiTab._label.textColor(UI.Theme.MUTED)
        } else {
            this.ethPanel.hide()
            this.wifiPanel.show()
            this.ethTab.bgColor(0xe8eeed)
            this.ethTab._label.textColor(UI.Theme.MUTED)
            this.wifiTab.bgColor(UI.Theme.WHITE)
            this.wifiTab._label.textColor(UI.Theme.BRAND_DEEP)
        }
        KeyboardOverlay.hide()
    },

    staticConfig: function staticConfig(fields) {
        return {
            ip: fields[0].input.text(),
            netmask: fields[1].input.text(),
            gateway: fields[2].input.text(),
            dns: fields[3].input.text()
        }
    },

    connectEthernet: function connectEthernet() {
        try {
            this.beginConnection('ethernet', 'Ethernet')
            bus.fire(EventTopics.NETWORK_CONNECT, {
                type: 'ethernet',
                dhcp: this.ethConfig.dhcp,
                staticConfig: this.staticConfig(this.ethConfig.fields)
            })
            KeyboardOverlay.hide()
        } catch (e) {
            log.error('submit ethernet config failed', e)
            this.cancelConnection()
            Toast.show('Failed to apply Ethernet settings')
        }
    },

    connectWifi: function connectWifi() {
        const ssid = this.wifiConfig.ssid.input.text().trim()
        if (!ssid) {
            Toast.show('Enter the Wi-Fi SSID')
            return
        }
        try {
            this.beginConnection('wifi', 'Wi-Fi')
            bus.fire(EventTopics.NETWORK_CONNECT, {
                type: 'wifi',
                ssid,
                psk: this.wifiConfig.password.input.text(),
                dhcp: this.wifiConfig.dhcp,
                staticConfig: this.staticConfig(this.wifiConfig.fields)
            })
            KeyboardOverlay.hide()
        } catch (e) {
            log.error('submit wifi config failed', e)
            this.cancelConnection()
            Toast.show('Failed to apply Wi-Fi settings')
        }
    },

    beginConnection: function beginConnection(type, displayName) {
        this.pendingType = type
        NetworkLoadingOverlay.show('Connecting to ' + displayName, function connectionTimeout() {
            if (NetworkPage.pendingType !== type) return
            NetworkPage.pendingType = null
            NetworkPage.statusLabel.text('● Timed out')
            NetworkPage.statusLabel.textColor(UI.Theme.RED)
            Toast.show(displayName + ' connection timed out. Check settings.')
        })
    },

    cancelConnection: function cancelConnection() {
        this.pendingType = null
        NetworkLoadingOverlay.hide()
    },

    onShow: function onShow() {
        bus.fire(EventTopics.NETWORK_STATUS_REQUEST, {})
    },

    onHide: function onHide() {
        KeyboardOverlay.hide()
    }
}

function handleNetworkStatus(status) {
    if (!NetworkPage.statusLabel) return
    if (status && status.connected) {
        NetworkPage.statusLabel.text('● Online')
        NetworkPage.statusLabel.textColor(UI.Theme.BRAND)
        const expectedType = NetworkPage.pendingType === 'ethernet' ? 1 : (NetworkPage.pendingType === 'wifi' ? 2 : 0)
        if (expectedType && status.type === expectedType) {
            const displayName = NetworkPage.pendingType === 'ethernet' ? 'Ethernet' : 'Wi-Fi'
            NetworkPage.pendingType = null
            NetworkLoadingOverlay.hide()
            Toast.show(displayName + ' connected')
        }
    } else {
        NetworkPage.statusLabel.text('● Offline')
        NetworkPage.statusLabel.textColor(UI.Theme.RED)
    }
}

function handleConnectResult(result) {
    if (!result || !result.ok) {
        NetworkPage.cancelConnection()
        Toast.show('Connection failed: ' + ((result && result.message) || 'Unknown error'))
    }
}

bus.on(EventTopics.NETWORK_STATUS_CHANGED, handleNetworkStatus)
bus.on(EventTopics.NETWORK_CONNECT_RESULT, handleConnectResult)

export default NetworkPage
