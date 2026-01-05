/**
 * Main view module
 * Handles the main screen UI with time display, location, and navigation buttons
 * Manages QR code scanning and door opening functionality
 */

import dxUi from '../../dxmodules/dxUi.js'
import dxStd from '../../dxmodules/dxStd.js'
import callView from './callView.js'
import pinView from './pinView.js'

const mainView = {}

// UI component variables
let mask        // Door opening overlay
let mask2       // QR code scanning overlay
let time        // Time display label
let date        // Date display label

/**
 * Initialize main view UI components
 * Creates background, time/date display, location, logo, and navigation buttons
 */
mainView.init = function () {
    // Create main screen view
    const screenMain = dxUi.View.build('mainView', dxUi.Utils.LAYER.MAIN)
    mainView.screenMain = screenMain
    screenMain.bgOpa(0)

    // Set background image
    const bg1 = dxUi.Image.build('bg1', screenMain)
    bg1.source('/app/code/resource/image/bg1.png')

    // Add decorative frame
    const Frame1 = dxUi.Image.build('Frame1', screenMain)
    Frame1.source('/app/code/resource/image/Frame1.png')
    Frame1.setPos(24, 60)

    // Create fonts for text display
    const font60 = dxUi.Font.build('/app/code/resource/font/font.ttf', 60, dxUi.Utils.FONT_STYLE.NORMAL)

    // Create time display label
    time = dxUi.Label.build('time', screenMain)
    time.setPos(50, 90)
    time.textFont(font60)
    time.textColor(0xffffff)

    const font24 = dxUi.Font.build('/app/code/resource/font/font.ttf', 24, dxUi.Utils.FONT_STYLE.NORMAL)

    // Create date display label
    date = dxUi.Label.build('date', screenMain)
    date.textFont(font24)
    date.textColor(0xffffff)
    date.alignTo(time, dxUi.Utils.ALIGN.OUT_RIGHT_BOTTOM, 15, -13)

    // Initialize time display
    mainView.updateTime()

    // Set up timer to update time every second
    timeInterval = dxStd.setInterval(() => {
        mainView.updateTime()
    }, 1000)

    // Add location icon
    const location = dxUi.Image.build('location', screenMain)
    location.source('/app/code/resource/image/location.png')
    location.alignTo(time, dxUi.Utils.ALIGN.OUT_BOTTOM_LEFT, 0, 18)

    // Add location text
    const locationLbl = dxUi.Label.build('locationLbl', screenMain)
    locationLbl.text("RC \"Solnechny\", 15 Lenin Street")
    locationLbl.textFont(font24)
    locationLbl.textColor(0xCAB186)
    locationLbl.alignTo(location, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 15, 0)

    // Add company logo
    const logo = dxUi.Image.build('logo', screenMain)
    logo.source('/app/code/resource/image/Logo.png')
    logo.setPos(546, 120)

    // const Frame2 = dxUi.View.build('Frame2', screenMain)
    // Frame2.setSize(720, 405)
    // Frame2.radius(40)
    // Frame2.setPos(40, 260)
    // Frame2.bgOpa(0)
    // Frame2.borderWidth(0)
    // Frame2.scroll(false)

    // const Frame2Img = dxUi.Image.build('Frame2Img', Frame2)
    // Frame2Img.source('/app/code/resource/image/photo.png')
    // Frame2Img.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    // Navigation Button 1 - Call button
    const Button1 = dxUi.Image.build('Button1', screenMain)
    Button1.source('/app/code/resource/image/Button.png')
    Button1.setPos(40, 721)
    Button1.clickable(true)
    Button1.on(dxUi.Utils.EVENT.CLICK, () => {
        dxUi.loadMain(callView.screenMain)
        Button1.show()
        Button1Pressed.hide()
    })
    const Button1Pressed = dxUi.Image.build('Button1Pressed', screenMain)
    Button1Pressed.source('/app/code/resource/image/Button_Pressed.png')
    Button1Pressed.setPos(40, 721)
    Button1Pressed.hide()
    Button1.on(dxUi.Utils.EVENT.PRESSING, () => {
        Button1.hide()
        Button1Pressed.show()
    })
    // Navigation Button 2 - QR code button
    const Button2 = dxUi.Image.build('Button2', screenMain)
    Button2.source('/app/code/resource/image/Button.png')
    Button2.setPos(410, 721)
    Button2.clickable(true)
    Button2.on(dxUi.Utils.EVENT.CLICK, () => {
        mainView.scanQRCode()
        Button2.show()
        Button2Pressed.hide()
    })
    const Button2Pressed = dxUi.Image.build('Button2Pressed', screenMain)
    Button2Pressed.source('/app/code/resource/image/Button_Pressed.png')
    Button2Pressed.setPos(410, 721)
    Button2Pressed.hide()
    Button2.on(dxUi.Utils.EVENT.PRESSING, () => {
        Button2.hide()
        Button2Pressed.show()
    })

    // Navigation Button 3 - PIN code button
    const Button3 = dxUi.Image.build('Button3', screenMain)
    Button3.source('/app/code/resource/image/Button.png')
    Button3.setPos(40, 981)
    Button3.clickable(true)
    Button3.on(dxUi.Utils.EVENT.CLICK, () => {
        dxUi.loadMain(pinView.screenMain)
        Button3.show()
        Button3Pressed.hide()
    })
    const Button3Pressed = dxUi.Image.build('Button3Pressed', screenMain)
    Button3Pressed.source('/app/code/resource/image/Button_Pressed.png')
    Button3Pressed.setPos(40, 981)
    Button3Pressed.hide()
    Button3.on(dxUi.Utils.EVENT.PRESSING, () => {
        Button3.hide()
        Button3Pressed.show()
    })

    // Navigation Button 4 - Settings button
    const Button4 = dxUi.Image.build('Button4', screenMain)
    Button4.source('/app/code/resource/image/Button.png')
    Button4.setPos(410, 981)
    Button4.clickable(true)
    Button4.on(dxUi.Utils.EVENT.CLICK, () => {
        Button4.show()
        Button4Pressed.hide()
    })
    const Button4Pressed = dxUi.Image.build('Button4Pressed', screenMain)
    Button4Pressed.source('/app/code/resource/image/Button_Pressed.png')
    Button4Pressed.setPos(410, 981)
    Button4Pressed.hide()
    Button4.on(dxUi.Utils.EVENT.PRESSING, () => {
        Button4.hide()
        Button4Pressed.show()
    })

    // Button icons
    const Call = dxUi.Image.build('Call', screenMain)
    Call.source('/app/code/resource/image/Call.png')
    Call.setPos(166, 765)
    const QR_code = dxUi.Image.build('QR_code', screenMain)
    QR_code.source('/app/code/resource/image/QR_code.png')
    QR_code.setPos(536, 765)
    const PIN_code = dxUi.Image.build('PIN_code', screenMain)
    PIN_code.source('/app/code/resource/image/PIN_code.png')
    PIN_code.setPos(166, 1025)
    const Settings = dxUi.Image.build('Settings', screenMain)
    Settings.source('/app/code/resource/image/Settings.png')
    Settings.setPos(536, 1025)

    // Create fonts for button labels
    const font30_B = dxUi.Font.build('/app/code/resource/font/font.ttf', 30, dxUi.Utils.FONT_STYLE.BOLD)
    const font30 = dxUi.Font.build('/app/code/resource/font/font.ttf', 30, dxUi.Utils.FONT_STYLE.NORMAL)

    // Button labels
    const callLbl = dxUi.Label.build('callLbl', screenMain)
    callLbl.textFont(font30_B)
    callLbl.textColor(0xffffff)
    callLbl.text('Call')
    callLbl.setPos(188, 875)
    const QRCodeLbl = dxUi.Label.build('QRCodeLbl', screenMain)
    QRCodeLbl.textFont(font30_B)
    QRCodeLbl.textColor(0xffffff)
    QRCodeLbl.text('QR code')
    QRCodeLbl.setPos(526, 875)
    const PINCodeLbl = dxUi.Label.build('PINCodeLbl', screenMain)
    PINCodeLbl.textFont(font30_B)
    PINCodeLbl.textColor(0xffffff)
    PINCodeLbl.text('PIN code')
    PINCodeLbl.setPos(152, 1135)
    const settingsLbl = dxUi.Label.build('settingsLbl', screenMain)
    settingsLbl.textFont(font30_B)
    settingsLbl.textColor(0xffffff)
    settingsLbl.text('Settings')
    settingsLbl.setPos(528, 1135)

    // Door opening overlay mask
    mask = dxUi.View.build('mask', screenMain)
    mask.padAll(0)
    mask.borderWidth(0)
    mask.radius(0)
    mask.setSize(800, 1280)
    mask.bgColor(0x000000)
    mask.bgOpa(50)
    mask.hide()
    const doorOpen = dxUi.Image.build('doorOpen', mask)
    doorOpen.source('/app/code/resource/image/door_open.png')
    doorOpen.setPos(147, 379)

    // QR code scanning overlay mask
    mask2 = dxUi.View.build('mask2', screenMain)
    mask2.padAll(0)
    mask2.borderWidth(0)
    mask2.radius(0)
    mask2.setSize(800, 1280)
    mask2.bgColor(0x000000)
    mask2.bgOpa(50)
    mask2.hide()

    // Avatar border for QR scanning
    const avatarBorder = dxUi.Image.build('avatarBorder', mask2)
    avatarBorder.source('/app/code/resource/image/avatar_border.png')
    avatarBorder.setPos(225, 284)
    const avatarContent = dxUi.View.build('avatarContent', avatarBorder)
    avatarContent.setSize(320, 320)
    avatarContent.radius(24)
    avatarContent.borderWidth(0)
    avatarContent.padAll(0)
    avatarContent.scroll(false)
    avatarContent.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    const avatarContentImg = dxUi.Image.build('avatarContentImg', avatarContent)
    avatarContentImg.source('/app/code/resource/image/avatar.png')
    avatarContentImg.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    // QR scanning instruction text
    const tipLbl = dxUi.Label.build('tipLbl', mask2)
    tipLbl.textFont(font30)
    tipLbl.textColor(0xffffff)
    tipLbl.text('Place the QR code opposite the camera')
    tipLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 790)

    // Close button for QR scanning overlay
    const mask2Close = dxUi.Image.build('mask2Close', mask2)
    mask2Close.source('/app/code/resource/image/close.png')
    mask2Close.setPos(688, 80)
    mask2Close.clickable(true)
    mask2Close.on(dxUi.Utils.EVENT.CLICK, () => {
        mask2.hide()
    })
}

// Timer variables
let timer
let timeInterval

/**
 * Update time and date display
 * Formats current time and date, then updates the UI labels
 */
mainView.updateTime = function () {
    const now = new Date()

    // Format time (HH:MM)
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const timeString = `${hours}:${minutes}`

    // Format date (Day DD-MM-YYYY)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = days[now.getDay()]
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    const dateString = `${dayName} ${day}-${month}-${year}`

    // Update display labels
    if (mainView.screenMain) {
        const timeLabel = time
        const dateLabel = date

        if (timeLabel) {
            timeLabel.text(timeString)
            dateLabel.alignTo(timeLabel, dxUi.Utils.ALIGN.OUT_RIGHT_BOTTOM, 15, -13)
        }
        if (dateLabel) {
            dateLabel.text(dateString)
            dateLabel.alignTo(timeLabel, dxUi.Utils.ALIGN.OUT_RIGHT_BOTTOM, 15, -13)
        }
    }
}

/**
 * Show door opening animation
 * Displays the door opening overlay for 1 second
 */
mainView.doorOpen = function () {
    if (timer) {
        dxStd.clearTimeout(timer)
        timer = null
    }
    mask.show()
    timer = dxStd.setTimeout(() => {
        mask.hide()
        dxStd.clearTimeout(timer)
        timer = null
    }, 1000)
}

/**
 * Show QR code scanning interface
 * Displays the QR scanning overlay with camera view
 */
mainView.scanQRCode = function () {
    mask2.show()
}

/**
 * Cleanup function to clear timers
 * Clears the time update interval when view is destroyed
 */
mainView.cleanup = function () {
    if (timeInterval) {
        dxStd.clearInterval(timeInterval)
        timeInterval = null
    }
}

export default mainView