/**
 * PIN view module
 * Handles the PIN code input interface with numeric keypad
 * Manages PIN entry, validation, and door opening functionality
 */

import dxUi from '../../dxmodules/dxUi.js'
import mainView from './mainView.js'

const pinView = {}

// PIN code storage
let pin = ""

/**
 * Initialize PIN view UI components
 * Creates background, back button, title, PIN dots display, and numeric keypad
 */
pinView.init = function () {
    // Create main screen view
    const screenMain = dxUi.View.build('pinView', dxUi.Utils.LAYER.MAIN)
    pinView.screenMain = screenMain
    screenMain.bgColor(0x000000)

    // Set background image
    const bg2 = dxUi.Image.build('pinView_bg2', screenMain)
    bg2.source('/app/code/resource/image/bg2.png')

    // Back button
    const back = dxUi.Image.build('pinView_back', screenMain)
    back.source('/app/code/resource/image/back.png')
    back.setPos(40, 80)
    back.clickable(true)
    back.on(dxUi.Utils.EVENT.CLICK, () => {
        dxUi.loadMain(mainView.screenMain)
        back.show()
        backPressed.hide()
        // Clear PIN dots and reset PIN
        for (let i = 0; i < 6; i++) {
            pinDots[i].bgOpa(0)
        }
        pin = ""
    })
    back.on(dxUi.Utils.EVENT.PRESSING, () => {
        back.hide()
        backPressed.show()
    })

    const backPressed = dxUi.Image.build('pinView_backPressed', screenMain)
    backPressed.source('/app/code/resource/image/back_Pressed.png')
    backPressed.setPos(40, 80)
    backPressed.hide()

    // Create fonts for text display
    const font30 = dxUi.Font.build('/app/code/resource/font/font.ttf', 30, dxUi.Utils.FONT_STYLE.NORMAL)
    const font60 = dxUi.Font.build('/app/code/resource/font/font.ttf', 60, dxUi.Utils.FONT_STYLE.NORMAL)

    // Title label
    const title = dxUi.Label.build('pinView_title', screenMain)
    title.text("Enter PIN-code")
    title.textFont(font30)
    title.textColor(0xffffff)
    title.align(dxUi.Utils.ALIGN.TOP_MID, 0, 198)

    // Create PIN dots display (6 dots for PIN input)
    const pinDots = []
    for (let i = 0; i < 6; i++) {
        const pinDot = dxUi.View.build('pinDot' + i, screenMain)
        pinDot.setSize(26, 26)
        pinDot.radius(13)
        pinDot.borderWidth(1)
        pinDot.padAll(0)
        pinDot.setBorderColor(0xffffff)
        pinDot.bgColor(0xffffff)
        pinDot.bgOpa(0x0)
        pinDot.align(dxUi.Utils.ALIGN.TOP_MID, (i - 2.5) * 68, 303)
        pinDots.push(pinDot)
    }


    // Create numeric keypad (12 buttons: 0-9, backspace, lock/unlock)
    for (let i = 0; i < 12; i++) {
        if (i == 11) {
            // Lock/unlock button (last button)
            const phone = dxUi.Image.build('pinView_phone' + i, screenMain)
            phone.source('/app/code/resource/image/lock.png')
            phone.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
            phone.clickable(true)
            phone.on(dxUi.Utils.EVENT.CLICK, () => {
                phone.show()
                phonePressed.hide()
                back.send(dxUi.Utils.EVENT.CLICK)
                mainView.doorOpen()
                // Get PIN code here
                console.log(pin);
            })
            phone.on(dxUi.Utils.EVENT.PRESSING, () => {
                phone.hide()
                phonePressed.show()
            })
            const phonePressed = dxUi.Image.build('pinView_phonePressed' + i, screenMain)
            phonePressed.source('/app/code/resource/image/lock_Pressed.png')
            phonePressed.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
            phonePressed.hide()
            continue
        }
        // Number button (0-9) or backspace button
        const pinBtn = dxUi.View.build('pinView_pinBtn' + i, screenMain)
        pinBtn.setSize(120, 120)
        pinBtn.radius(60)
        pinBtn.borderWidth(0)
        pinBtn.bgColor(0x383631)
        pinBtn.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
        pinBtn.scroll(false)
        pinBtn.on(dxUi.Utils.EVENT.CLICK, () => {
            pinBtn.bgColor(0x383631)
            if (i == 9) {
                // Backspace - remove last digit
                if (pin.length > 0) {
                    pinDots[pin.length - 1].bgOpa(0)
                    pin = pin.slice(0, -1)
                }
                return
            }
            let num = i + 1
            if (i == 10) {
                num = 0
            }
            // If PIN is full (6 digits), clear and start over
            if (pin.length >= 6) {
                pin = ""
                for (let j = 0; j < 6; j++) {
                    pinDots[j].bgOpa(0)
                }
            }
            // Add digit to PIN and show corresponding dot
            pin += num
            pinDots[pin.length - 1].bgOpa(100)
            console.log(pin);
        })
        pinBtn.on(dxUi.Utils.EVENT.PRESSING, () => {
            pinBtn.bgColor(0x736E65)
        })

        if (i == 9) {
            // Backspace button icon
            const backspace = dxUi.Image.build('pinView_backspace' + i, pinBtn)
            backspace.source('/app/code/resource/image/backspace.png')
            backspace.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
        } else {
            // Number button label
            const pinLbl = dxUi.Label.build('pinView_pinLbl' + i, pinBtn)
            pinLbl.text(i == 10 ? "0" : i + 1 + "")
            pinLbl.textFont(font60)
            pinLbl.textColor(0xffffff)
            pinLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
        }
    }


}

export default pinView