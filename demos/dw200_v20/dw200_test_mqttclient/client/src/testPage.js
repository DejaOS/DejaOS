import ui from "../dxmodules/dxUi.js";
import viewUtils from './viewUtils.js'
import log from '../dxmodules/dxLogger.js'
const testPage = {}
let theView;
let logTextArea;
let buttonConfigs = []; // Store button configurations

testPage.init = function (configs) {
    // Save button configurations
    buttonConfigs = configs;

    // Create main view
    theView = ui.View.build('testMain', ui.Utils.LAYER.MAIN)
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
    let titleLabel = viewUtils.createLabel('main_titleLabel', titleBar, "Test Page", 20)
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
    logTextArea.text("Test Log: ================\n")
    logTextArea.textFont(viewUtils.font12)

    // Create left panel content
    createLeftPanelContent(leftPanel)
}

function createLeftPanelContent(parent) {
    let yPos = 0;
    let itemHeight = 50;
    let margin = 5;
    log.info("createLeftPanelContent")

    // Dynamically create buttons
    buttonConfigs.forEach((config, index) => {
        let button = viewUtils.createButton(`button_${index}`, parent, config.text, 14)
        button.setSize(130, itemHeight)
        button.setPos(0, yPos)
        button.bgColor(config.color || 0x3498db) // Default blue color
        button.radius(4)
        button.on(ui.Utils.EVENT.CLICK, () => {
            logMessage(`${config.text}:`);
            if (config.action) {
                config.action();
            }
        })
        yPos += itemHeight + margin;
    });
}

function logMessage(message) {
    let logEntry = `${message}\n`
    let text = logTextArea.text()
    if (text.length > 300) {
        text = text.substring(text.length - 100)
    }
    logTextArea.text(text + logEntry)
}

testPage.show = function () {
    ui.loadMain(theView)
}

testPage.log = logMessage

export default testPage 