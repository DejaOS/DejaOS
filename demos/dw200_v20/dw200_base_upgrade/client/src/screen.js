import bus from '../dxmodules/dxEventBus.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/page/mainView.js'
import logger from '../dxmodules/dxLogger.js'
import pinyin from './view/keyboard/pinyin.js'
import std from '../dxmodules/dxStd.js'
import common from '../dxmodules/dxCommon.js'
import ntp from '../dxmodules/dxNtp.js'

const screen = {}
let mqttStatus = 0
let context = {}

let upgradeDialog = null
let upgradeStatusLabel = null


screen.init = function () {
    dxui.init({ orientation: 1 }, context);
    pinyin.init(480, 150)
    pinyin.hide(true)
    mainView.init()
    dxui.loadMain(mainView.main)
    subscribe()
}

function subscribe() {
    bus.on("network_status_change", screen.netStatusChange)
    bus.on("mqtt_connected", screen.mqttStatusChange)
    bus.on("show_upgrade_dialog", screen.showUpgradeDialog)
    bus.on("hide_upgrade_dialog", hideUpgradeDialog)
}

screen.netStatusChange = function (data) {
    logger.info('net status change:' + JSON.stringify(data))
    if (data.net_status >= 4) {
        if (data.net_type == 1) {
            mainView.ethItemImg.show()
        } else {
            mainView.wifiItemImg.show()
        }
        // After network connection success, send mqtt connection request
        bus.fire('mqtt_to_connect', 0)
        // Correct time
        ntp.startSync()


    } else {
        mainView.ethItemImg.hide()
        mainView.wifiItemImg.hide()
    }
}

screen.mqttStatusChange = function (data) {
    logger.info('mqtt status change:' + JSON.stringify(data))
    if (data == "0") {
        mainView.mqttShow.show()
        mqttStatus = 1
        run()
    } else {
        mqttStatus = 0
        mainView.mqttShow.hide()
    }
}


function run() {
    std.setInterval(() => {
        try {
            mqttHeartBeat()
        } catch (error) {
            logger.error(error)
        }
    }, 10000)
}

function mqttHeartBeat() {
    if (mqttStatus == 1) {
        let msg = { uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000) }
        logger.info('Send heart beat:', msg)
        bus.fire("mqtt_publish", { topic: "base_upgrade/v1/event/heart", payload: JSON.stringify(msg) })
    }
}

// Show upgrade dialog
screen.showUpgradeDialog = function (data) {
    logger.info("[screen] Show upgrade dialog", data)
    
    // Create dialog container
    upgradeDialog = dxui.View.build('upgradeDialog', dxui.Utils.LAYER.TOP)
    upgradeDialog.setSize(400, 250)
    upgradeDialog.setPos(40, 35)
    upgradeDialog.bgColor(0x1e293b)
    upgradeDialog.borderWidth(0)
    upgradeDialog.radius(15)
    upgradeDialog.padAll(30)
    
    // Create title
    const titleLabel = dxui.Label.build('upgradeTitle', upgradeDialog)
    titleLabel.text('System Upgrading')
    titleLabel.textColor(0xffffff)
    titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 20)
    
    // Create status label
    upgradeStatusLabel = dxui.Label.build('upgradeStatus', upgradeDialog)
    upgradeStatusLabel.text('Updating...')
    upgradeStatusLabel.textColor(0x94a3b8)
    upgradeStatusLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 80)
    
    // Create URL label
    const urlLabel = dxui.Label.build('urlLabel', upgradeDialog)
    urlLabel.text(`URL: ${data.url}`)
    urlLabel.textColor(0x64748b)
    urlLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 120)
    
    // Create MD5 label
    const md5Label = dxui.Label.build('md5Label', upgradeDialog)
    md5Label.text(`MD5: ${data.md5}`)
    md5Label.textColor(0x64748b)
    md5Label.align(dxui.Utils.ALIGN.TOP_MID, 0, 150)
    
    // Create close button
    const closeButton = dxui.Button.build('closeButton', upgradeDialog)
    closeButton.setSize(30, 30)
    closeButton.align(dxui.Utils.ALIGN.TOP_RIGHT, -10, 10)
    closeButton.bgColor(0x1e293b)
    closeButton.borderWidth(0)
    closeButton.radius(15)
    
    // Create button text
    const closeLabel = dxui.Label.build('closeLabel', closeButton)
    closeLabel.text('X')
    closeLabel.textColor(0x94a3b8)
    closeLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    
    // Add click event
    closeButton.on(dxui.Utils.EVENT.CLICK, () => {
        logger.info("[screen] Close button clicked")
        hideUpgradeDialog()
    })
    
    // Show dialog
    upgradeDialog.show()
    upgradeDialog.moveForeground()
}



// Hide upgrade dialog
function hideUpgradeDialog() {
    if (upgradeDialog) {
        upgradeDialog.hide()
        upgradeDialog = null
        upgradeStatusLabel = null
    }
}

screen.loop = function () {
    return dxui.handler()
}

export default screen
