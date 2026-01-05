/**
 * Call view module
 * Handles the apartment number input interface with numeric keypad
 * Manages call initiation and navigation back to main view
 */

import dxUi from '../../dxmodules/dxUi.js'
import mainView from './mainView.js'
import connectionView from './connectionView.js'

const callView = {}

/**
 * Initialize call view UI components
 * Creates background, back button, title, number display, and numeric keypad
 */
callView.init = function () {
    // Create main screen view
    const screenMain = dxUi.View.build('callView', dxUi.Utils.LAYER.MAIN)
    callView.screenMain = screenMain
    screenMain.bgColor(0x000000)

    // Set background image
    const bg2 = dxUi.Image.build('bg2', screenMain)
    bg2.source('/app/code/resource/image/bg2.png')

    // Back button
    const back = dxUi.Image.build('back', screenMain)
    back.source('/app/code/resource/image/back.png')
    back.setPos(40, 80)
    back.clickable(true)
    back.on(dxUi.Utils.EVENT.CLICK, () => {
        dxUi.loadMain(mainView.screenMain)
        back.show()
        backPressed.hide()
    })
    back.on(dxUi.Utils.EVENT.PRESSING, () => {
        back.hide()
        backPressed.show()
        num.text(" ")
        cursor.alignTo(num, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 10, 0)
    })

    const backPressed = dxUi.Image.build('backPressed', screenMain)
    backPressed.source('/app/code/resource/image/back_Pressed.png')
    backPressed.setPos(40, 80)
    backPressed.hide()

    // Create fonts for different text sizes
    const font30 = dxUi.Font.build('/app/code/resource/font/font.ttf', 30, dxUi.Utils.FONT_STYLE.NORMAL)
    const font60 = dxUi.Font.build('/app/code/resource/font/font.ttf', 60, dxUi.Utils.FONT_STYLE.NORMAL)
    const font70 = dxUi.Font.build('/app/code/resource/font/font.ttf', 70, dxUi.Utils.FONT_STYLE.NORMAL)

    // Title label
    const title = dxUi.Label.build('title', screenMain)
    title.text("Enter apartment number")
    title.textFont(font30)
    title.textColor(0xffffff)
    title.align(dxUi.Utils.ALIGN.TOP_MID, 0, 198)

    // Number display label
    const num = dxUi.Label.build('num', screenMain)
    num.text(" ")
    num.textFont(font70)
    num.textColor(0xffffff)
    num.align(dxUi.Utils.ALIGN.TOP_MID, 0, 280)

    // Text cursor
    const cursor = dxUi.View.build('cursor', screenMain)
    cursor.setSize(4, 82)
    cursor.radius(2)
    cursor.borderWidth(2)
    cursor.setBorderColor(0xcab186)
    cursor.alignTo(num, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 10, 0)


    // Create numeric keypad (12 buttons: 0-9, backspace, call)
    for (let i = 0; i < 12; i++) {
        if (i == 11) {
            // Call button (last button)
            const phone = dxUi.Image.build('phone' + i, screenMain)
            phone.source('/app/code/resource/image/phone.png')
            phone.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
            phone.clickable(true)
            phone.on(dxUi.Utils.EVENT.CLICK, () => {
                phone.show()
                phonePressed.hide()
                // Initiate call
                let phoneNum = num.text().substring(1)
                console.log(phoneNum); // Log the number being called
                if (phoneNum.length > 0) {
                    dxUi.loadMain(connectionView.screenMain)
                    connectionView.setConnectionNum(phoneNum)
                    connectionView.connect(phoneNum)
                }
                num.text(" ")
                cursor.alignTo(num, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 10, 0)
            })
            phone.on(dxUi.Utils.EVENT.PRESSING, () => {
                phone.hide()
                phonePressed.show()
            })
            const phonePressed = dxUi.Image.build('phonePressed' + i, screenMain)
            phonePressed.source('/app/code/resource/image/phone_Pressed.png')
            phonePressed.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
            phonePressed.hide()
            continue
        }
        // Number button (0-9) or backspace button
        const callBtn = dxUi.View.build('callBtn' + i, screenMain)
        callBtn.setSize(120, 120)
        callBtn.radius(60)
        callBtn.borderWidth(0)
        callBtn.bgColor(0x383631)
        callBtn.setPos(180 + (i % 3) * 160, 486 + Math.floor(i / 3) * 158)
        callBtn.scroll(false)
        callBtn.on(dxUi.Utils.EVENT.CLICK, () => {
            callBtn.bgColor(0x383631)
            if (i == 9) {
                // Backspace button - remove last character
                num.text(num.text().slice(0, -1))
                cursor.alignTo(num, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 10, 0)
                return
            }
            // Limit input to 16 characters
            if (num.text().length - 1 >= 16) {
                return
            }
            // Add number to display (0 for index 10, otherwise i+1)
            num.text(num.text() + (i == 10 ? "0" : i + 1 + ""))
            cursor.alignTo(num, dxUi.Utils.ALIGN.OUT_RIGHT_MID, 10, 0)
            console.log(num.text().substring(1));
        })
        callBtn.on(dxUi.Utils.EVENT.PRESSING, () => {
            callBtn.bgColor(0x736E65)
        })

        if (i == 9) {
            // Backspace button icon
            const backspace = dxUi.Image.build('backspace' + i, callBtn)
            backspace.source('/app/code/resource/image/backspace.png')
            backspace.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
        } else {
            // Number button label
            const callLbl = dxUi.Label.build('callLbl' + i, callBtn)
            callLbl.text(i == 10 ? "0" : i + 1 + "")
            callLbl.textFont(font60)
            callLbl.textColor(0xffffff)
            callLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
        }
    }


}

export default callView