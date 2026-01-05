/**
 * Connection view module
 * Handles the call connection interface with status display and hang up functionality
 * Manages call timer and connection status updates
 */

import dxUi from '../../dxmodules/dxUi.js'
import dxStd from '../../dxmodules/dxStd.js'
import mainView from './mainView.js'

const connectionView = {}

// UI component variables
let connectionNum  // Connection number display
let connectTips    // Connection status text
let hangUp         // Hang up button

/**
 * Initialize connection view UI components
 * Creates background, call photo, hang up button, and status displays
 */
connectionView.init = function () {
    // Create main screen view
    const screenMain = dxUi.View.build('connectionView', dxUi.Utils.LAYER.MAIN)
    connectionView.screenMain = screenMain
    screenMain.bgColor(0x000000)

    // Set background image
    const bg2 = dxUi.Image.build('bg3', screenMain)
    bg2.source('/app/code/resource/image/bg3.png')

    // Call photo/avatar
    const callPhoto = dxUi.Image.build('callPhoto', screenMain)
    callPhoto.source('/app/code/resource/image/call_photo.png')
    callPhoto.setPos(158, 365)

    // Hang up button
    hangUp = dxUi.Image.build('hangUp', screenMain)
    hangUp.source('/app/code/resource/image/hangUp.png')
    hangUp.setPos(340, 1000)
    const hangUpPressed = dxUi.Image.build('hangUpPressed', screenMain)
    hangUpPressed.source('/app/code/resource/image/hangUp_Pressed.png')
    hangUpPressed.setPos(340, 1000)
    hangUpPressed.hide()

    hangUp.clickable(true)
    hangUp.on(dxUi.Utils.EVENT.CLICK, () => {
        hangUp.show()
        hangUpPressed.hide()
        dxUi.loadMain(mainView.screenMain)
        connectTips.text("Connecting...")
        // Clear call timer
        if (timer) {
            dxStd.clearInterval(timer)
            timer = null
        }
    })
    hangUp.on(dxUi.Utils.EVENT.PRESSING, () => {
        hangUp.hide()
        hangUpPressed.show()
    })

    // Create fonts for text display
    const font70 = dxUi.Font.build('/app/code/resource/font/font.ttf', 70, dxUi.Utils.FONT_STYLE.NORMAL)
    const font30 = dxUi.Font.build('/app/code/resource/font/font.ttf', 30, dxUi.Utils.FONT_STYLE.NORMAL)

    // Connection number display
    connectionNum = dxUi.Label.build('connectionNum', screenMain)
    connectionNum.text(" ")
    connectionNum.textFont(font70)
    connectionNum.textColor(0xffffff)
    connectionNum.align(dxUi.Utils.ALIGN.TOP_MID, 0, 120)

    // Connection status text
    connectTips = dxUi.Label.build('connectTips', screenMain)
    connectTips.text("Connecting...")
    connectTips.textFont(font30)
    connectTips.textColor(0xffffff)
    connectTips.align(dxUi.Utils.ALIGN.TOP_MID, 0, 226)
}

/**
 * Set the connection number display
 * @param {string} num - The apartment number to display
 */
connectionView.setConnectionNum = function (num) {
    connectionNum.text(num)
}

// Call timer variable
let timer

/**
 * Start call connection and timer
 * Begins the call timer and updates the status display
 * @param {string} num - The apartment number being called
 */
connectionView.connect = function (num) {
    console.log(num);

    let count = 0
    let minutes = 0
    timer = dxStd.setInterval(function () {
        count++
        if (count >= 60) {
            // Auto-hang up after 59 minutes
            if (minutes >= 59) {
                hangUp.send(dxUi.Utils.EVENT.CLICK)
            }
            count = 0
            minutes++
        }
        // Update call duration display (MM:SS format)
        connectTips.text(minutes.toString().padStart(2, '0') + ":" + count.toString().padStart(2, '0'))
    }, 1000)
}

export default connectionView