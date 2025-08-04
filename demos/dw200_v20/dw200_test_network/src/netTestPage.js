import ui from "../dxmodules/dxUi.js";
import viewUtils from './viewUtils.js'
import fullKeyboard from './fullkeyboard.js'
import log from '../dxmodules/dxLogger.js'
import bus from '../dxmodules/dxEventBus.js'
import net from '../dxmodules/dxNetwork.js'
const netTestPage = {}
let theView;
let logTextArea;
let data = {
    ssid: "vguangYPT",
    password: "vguangypt_o0",
    ip: "192.168.50.88",
    dns: "8.8.8.8",
    gateway: "192.168.50.1",
    netmask: "255.255.255.0",
    dhcp: true
}
function connectEth() {
    if (data.dhcp) {
        logMessage("Connect Ethernet with DHCP")
        net.connectEthWithDHCP()
    } else {
        logMessage("Connect Ethernet with Static IP:" + data.ip + " " + data.netmask + " " + data.dns + " " + data.gateway)
        net.connectEth(data)
    }
}
function connectWifi() {
    if (data.dhcp) {
        logMessage("Connect WiFi with DHCP")
        net.connectWifiWithDHCP(data.ssid, data.password)
    } else {
        logMessage("Connect WiFi with Static IP:" + data.ip + " " + data.netmask + " " + data.dns + " " + data.gateway)
        net.connectWifi(data.ssid, data.password, data)
    }
}
function scanWifi() {
    logMessage("Scan WiFi")
    bus.fire('network_scan_wifi')//Scanning is a time-consuming operation that requires asynchronous processing
}
function pingTest() {
    logMessage("Ping Test")
    bus.fire('ping_test')
}
function getNetStatus() {
    logMessage(`Network Status: ${JSON.stringify(net.getNetParam())}`)
}
netTestPage.init = function () {

    // Create main view
    theView = ui.View.build('netTestMain', ui.Utils.LAYER.MAIN)
    theView.padAll(0)
    theView.borderWidth(0)
    theView.bgColor(0x2c3e50)
    theView.setPos(0, 0)
    theView.setSize(480, 320)

    // Create title bar
    let titleBar = ui.View.build('titleBar', theView)
    titleBar.setSize(480, 40)
    titleBar.setPos(0, 0)
    titleBar.bgColor(0x34495e)
    titleBar.borderWidth(0)
    titleBar.padAll(0)
    titleBar.radius(0)

    // Title text
    let titleLabel = viewUtils.createLabel('main_titleLabel', titleBar, "Network Test Page", 20)
    titleLabel.textColor(0xFFFFFF)
    titleLabel.align(ui.Utils.ALIGN.CENTER, 0, 0)

    // Create main content area
    let mainContent = ui.View.build('mainContent', theView)
    mainContent.setSize(480, 280)
    mainContent.setPos(0, 40)
    mainContent.bgColor(0xecf0f1)
    mainContent.borderWidth(0)
    mainContent.padAll(10)
    mainContent.radius(0)

    // Create left panel (1/3 width)
    let leftPanel = ui.View.build('leftPanel', mainContent)
    leftPanel.setSize(150, 260)
    leftPanel.setPos(0, 0)
    leftPanel.bgColor(0xFFFFFF)
    leftPanel.borderWidth(1)
    leftPanel.setBorderColor(0xbdc3c7)
    leftPanel.radius(8)
    leftPanel.padAll(10)

    // Create right panel (2/3 width)
    let rightPanel = ui.View.build('rightPanel', mainContent)
    rightPanel.setSize(300, 260)
    rightPanel.setPos(160, 0)
    rightPanel.bgColor(0x000000)
    rightPanel.borderWidth(1)
    rightPanel.setBorderColor(0x666666)
    rightPanel.radius(8)
    rightPanel.padAll(10)

    // Create log textarea
    logTextArea = ui.Label.build('logTextArea', rightPanel)
    logTextArea.setSize(280, 240)
    logTextArea.setPos(0, 0)
    logTextArea.bgColor(0x000000)
    logTextArea.textColor(0xFFFFFF)
    logTextArea.borderWidth(0)
    logTextArea.text("Network Test Log ================")
    logTextArea.textFont(viewUtils.font16)

    // Create left panel content
    createLeftPanelContent(leftPanel)

    // Initialize full keyboard
    fullKeyboard.init()
}

function createLeftPanelContent(parent) {
    let yPos = 0;
    let itemHeight = 25;
    let margin = 5;
    log.info("createLeftPanelContent")
    // get network status
    let getNetStatusBtn = viewUtils.createButton('getNetStatusBtn', parent, 'Network Status', 14)
    getNetStatusBtn.setSize(130, itemHeight)
    getNetStatusBtn.setPos(0, yPos)
    getNetStatusBtn.bgColor(0x27ae60)
    getNetStatusBtn.radius(4)
    getNetStatusBtn.on(ui.Utils.EVENT.CLICK, getNetStatus)
    yPos += itemHeight + margin;

    // Connect Ethernet Button
    let connectEthBtn = viewUtils.createButton('connectEthBtn', parent, 'Connect ETH', 14)
    connectEthBtn.setSize(130, itemHeight)
    connectEthBtn.setPos(0, yPos)
    connectEthBtn.bgColor(0x3498db)
    connectEthBtn.radius(4)
    connectEthBtn.on(ui.Utils.EVENT.CLICK, connectEth)
    yPos += itemHeight + margin;

    // Connect WiFi Button
    let connectBtn = viewUtils.createButton('connectBtn', parent, 'Connect WiFi', 14)
    connectBtn.setSize(130, itemHeight)
    connectBtn.setPos(0, yPos)
    connectBtn.bgColor(0x27ae60)
    connectBtn.radius(4)
    connectBtn.on(ui.Utils.EVENT.CLICK, connectWifi)
    yPos += itemHeight + margin;

    // Scan WiFi Button
    let scanWifiBtn = viewUtils.createButton('scanWifiBtn', parent, 'Scan WiFi', 14)
    scanWifiBtn.setSize(130, itemHeight)
    scanWifiBtn.setPos(0, yPos)
    scanWifiBtn.bgColor(0x3498db)
    scanWifiBtn.radius(4)
    scanWifiBtn.on(ui.Utils.EVENT.CLICK, scanWifi)
    yPos += itemHeight + margin;

    // Test Button
    let testBtn = viewUtils.createButton('testBtn', parent, 'Test Network', 14)
    testBtn.setSize(130, itemHeight)
    testBtn.setPos(0, yPos)
    testBtn.bgColor(0xe74c3c)
    testBtn.radius(4)
    testBtn.on(ui.Utils.EVENT.CLICK, pingTest)
    yPos += itemHeight + margin;

    // DHCP/Static Switch Label
    let switchLabel = viewUtils.createLabel('switchLabel', parent, 'DHCP/Static:', 14)
    switchLabel.setPos(0, yPos)
    switchLabel.setSize(130, itemHeight)
    switchLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // DHCP/Static Switch
    let dhcpSwitch = ui.Checkbox.build('dhcpSwitch', parent)
    dhcpSwitch.setPos(0, yPos)
    dhcpSwitch.setSize(130, itemHeight)
    dhcpSwitch.text("DHCP")
    dhcpSwitch.select(data.dhcp) // Initialize with data
    dhcpSwitch.on(ui.Utils.EVENT.CLICK, () => {
        let isDHCP = dhcpSwitch.isSelect()
        updateData('dhcp', isDHCP) // Use helper function to update data
        logMessage("DHCP/Static switched to: " + (isDHCP ? "DHCP" : "Static"))
    })
    yPos += itemHeight + margin * 2;

    // WiFi SSID Label
    let ssidLabel = viewUtils.createLabel('ssidLabel', parent, 'WiFi SSID:', 14)
    ssidLabel.setPos(0, yPos)
    ssidLabel.setSize(130, itemHeight)
    ssidLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // WiFi SSID Input
    let ssidInput = viewUtils.createClickableLabel('ssidInput', parent, data.ssid, 14)
    ssidInput.setSize(130, itemHeight)
    ssidInput.setPos(0, yPos)
    ssidInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(ssidInput, 'ssid', data.ssid)
    })
    yPos += itemHeight + margin;

    // WiFi Password Label
    let passwordLabel = viewUtils.createLabel('passwordLabel', parent, 'WiFi Password:', 14)
    passwordLabel.setPos(0, yPos)
    passwordLabel.setSize(130, itemHeight)
    passwordLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // WiFi Password Input
    let passwordInput = viewUtils.createClickableLabel('passwordInput', parent, data.password, 14)
    passwordInput.setSize(130, itemHeight)
    passwordInput.setPos(0, yPos)
    passwordInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(passwordInput, 'password', data.password)
    })
    yPos += itemHeight + margin * 2;

    // IP Address Label
    let ipLabel = viewUtils.createLabel('ipLabel', parent, 'IP Address:', 14)
    ipLabel.setPos(0, yPos)
    ipLabel.setSize(130, itemHeight)
    ipLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // IP Address Input
    let ipInput = viewUtils.createClickableLabel('ipInput', parent, data.ip, 14)
    ipInput.setSize(130, itemHeight)
    ipInput.setPos(0, yPos)
    ipInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(ipInput, 'ip', data.ip)
    })
    yPos += itemHeight + margin;

    // Netmask Label
    let netmaskLabel = viewUtils.createLabel('netmaskLabel', parent, 'Netmask:', 14)
    netmaskLabel.setPos(0, yPos)
    netmaskLabel.setSize(130, itemHeight)
    netmaskLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // Netmask Input
    let netmaskInput = viewUtils.createClickableLabel('netmaskInput', parent, data.netmask, 14)
    netmaskInput.setSize(130, itemHeight)
    netmaskInput.setPos(0, yPos)
    netmaskInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(netmaskInput, 'netmask', data.netmask)
    })
    yPos += itemHeight + margin;

    // DNS Label
    let dnsLabel = viewUtils.createLabel('dnsLabel', parent, 'DNS:', 14)
    dnsLabel.setPos(0, yPos)
    dnsLabel.setSize(130, itemHeight)
    dnsLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // DNS Input
    let dnsInput = viewUtils.createClickableLabel('dnsInput', parent, data.dns, 14)
    dnsInput.setSize(130, itemHeight)
    dnsInput.setPos(0, yPos)
    dnsInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(dnsInput, 'dns', data.dns)
    })
    yPos += itemHeight + margin;

    // Gateway Label
    let gatewayLabel = viewUtils.createLabel('gatewayLabel', parent, 'Gateway:', 14)
    gatewayLabel.setPos(0, yPos)
    gatewayLabel.setSize(130, itemHeight)
    gatewayLabel.textColor(0x2c3e50)
    yPos += itemHeight + margin;

    // Gateway Input
    let gatewayInput = viewUtils.createClickableLabel('gatewayInput', parent, data.gateway, 14)
    gatewayInput.setSize(130, itemHeight)
    gatewayInput.setPos(0, yPos)
    gatewayInput.on(ui.Utils.EVENT.CLICK, () => {
        openKeyboardForInput(gatewayInput, 'gateway', data.gateway)
    })

}

function logMessage(message) {
    let logEntry = `${message}\n`
    let text = logTextArea.text()
    if (text.length > 200) {
        text = text.substring(text.length - 100)
    }
    logTextArea.text(text + logEntry)
}

// Data binding helper function
function updateData(field, value) {
    data[field] = value
    log.info(`Data updated: ${field} = ${value}`)
}

// open keyboard for input
function openKeyboardForInput(inputElement, fieldName, currentValue) {
    theView.hide()//The resource is limited, closing/hiding the old page each time a new page is opened can improve the ui smoothness
    fullKeyboard.open((text) => {
        if (inputElement.children && inputElement.children[0]) {
            theView.show()
            ui.getUi(inputElement.children[0]).text(text)
            updateData(fieldName, text)
        }
    }, currentValue)
}

function getData(field) {
    return data[field] || ""
}

// Get all current data
function getAllData() {
    return {
        ssid: data.ssid,
        password: data.password,
        ip: data.ip,
        dns: data.dns,
        gateway: data.gateway,
        dhcp: data.dhcp
    }
}

netTestPage.show = function () {
    ui.loadMain(theView)
}

// Export data access functions
netTestPage.getData = getAllData
netTestPage.updateData = updateData
netTestPage.getField = getData
netTestPage.log = logMessage

export default netTestPage 