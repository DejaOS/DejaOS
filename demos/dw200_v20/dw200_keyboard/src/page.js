import ui from "../dxmodules/dxUi.js";
import viewUtils from './viewUtils.js'

const pageView = {}
let theView;
let keyboardView;
let currentInput = "";
let currentKeyboardType = "english";
let keyMapping = {}; // Store key mapping: key is "row_col", value is character

// Keyboard layout definition
const keyboardLayouts = {
    english: {
        name: "English Keyboard",
        keys: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACKSPACE'],
            ['SWITCH', 'SPACE', 'CLEAR', 'CONFIRM']
        ]
    },
    english_upper: {
        name: "English Uppercase Keyboard",
        keys: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
            ['SWITCH', 'SPACE', 'CLEAR', 'CONFIRM']
        ]
    },
    symbol: {
        name: "Symbol Keyboard",
        keys: [
            ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
            ['~', '`', '!', '.', '?', '/', '<', '>', ',', "'"],
            ['(', ')', '-', '_', '=', '+', '[', ']', '{', '}'],
            ['|', '\\', ';', ':', '"', '.', '?', 'BACKSPACE'],
            ['SWITCH', 'SPACE', 'CLEAR', 'CONFIRM']
        ]
    }
};

pageView.init = function () {
    // Create main view
    theView = ui.View.build('pageMain', ui.Utils.LAYER.MAIN)
    theView.padAll(0)
    theView.borderWidth(0)
    theView.bgColor(0x2c3e50)
    theView.setPos(0, 0)
    theView.setSize(480, 320)

    // Create title bar
    let titleBar = ui.View.build('titleBar', theView)
    titleBar.setSize(480, 60)
    titleBar.setPos(0, 0)
    titleBar.bgColor(0x34495e)
    titleBar.borderWidth(0)
    titleBar.padAll(0)
    titleBar.radius(0)

    // Title text
    let titleLabel = viewUtils.createLabel('titleLabel', titleBar, "DW200 Full Keyboard Demo", 24)
    titleLabel.textColor(0xFFFFFF)
    titleLabel.align(ui.Utils.ALIGN.CENTER, 0, 0)

    // Create main content area
    let mainContent = ui.View.build('mainContent', theView)
    mainContent.setSize(480, 260)
    mainContent.setPos(0, 60)
    mainContent.bgColor(0xecf0f1)
    mainContent.borderWidth(0)
    mainContent.padAll(20)
    mainContent.radius(0)

    // Create description text
    let descLabel = viewUtils.createLabel('descLabel', mainContent, "Click the button to open the full keyboard for input", 16)
    descLabel.textColor(0x2c3e50)
    descLabel.setPos(0, 20)
    descLabel.setSize(440, 30)

    // Create input display area
    let inputDisplay = ui.View.build('inputDisplay', mainContent)
    inputDisplay.setSize(440, 80)
    inputDisplay.setPos(0, 60)
    inputDisplay.bgColor(0xFFFFFF)
    inputDisplay.borderWidth(2)
    inputDisplay.setBorderColor(0xbdc3c7)
    inputDisplay.radius(8)
    inputDisplay.padAll(10)

    // Input content label
    let inputLabel = viewUtils.createLabel('inputLabel', inputDisplay, "Input content will be displayed here...", 16)
    inputLabel.textColor(0x7f8c8d)
    inputLabel.setPos(0, 0)
    inputLabel.setSize(420, 60)
    pageView.inputLabel = inputLabel

    // Create button area
    let buttonArea = ui.View.build('buttonArea', mainContent)
    buttonArea.setSize(440, 80)
    buttonArea.setPos(0, 160)
    buttonArea.bgColor(0xecf0f1)
    buttonArea.borderWidth(0)
    buttonArea.padAll(0)
    buttonArea.radius(0)

    // Open keyboard button
    let openKeyboardBtn = viewUtils.createButton('openKeyboardBtn', buttonArea, "Open Full Keyboard", 20)
    openKeyboardBtn.setSize(200, 50)
    openKeyboardBtn.setPos(120, 15)
    openKeyboardBtn.bgColor(0x3498db)
    openKeyboardBtn.textColor(0xFFFFFF)
    openKeyboardBtn.radius(10)
    openKeyboardBtn.on(ui.Utils.EVENT.CLICK, openKeyboard)

    // Create keyboard view (hidden)
    createKeyboardView()
}

// Create keyboard view
function createKeyboardView() {
    keyboardView = ui.View.build('keyboardView', ui.Utils.LAYER.TOP)
    keyboardView.padAll(0)
    keyboardView.borderWidth(0)
    keyboardView.bgColor(0x2c3e50)
    keyboardView.setPos(0, 0)
    keyboardView.setSize(480, 320)
    keyboardView.hide()

    // Input display area
    let keyboardInputDisplay = ui.View.build('keyboardInputDisplay', keyboardView)
    keyboardInputDisplay.setSize(460, 60)
    keyboardInputDisplay.setPos(10, 10)
    keyboardInputDisplay.bgColor(0xFFFFFF)
    keyboardInputDisplay.borderWidth(2)
    keyboardInputDisplay.setBorderColor(0xbdc3c7)
    keyboardInputDisplay.radius(8)
    keyboardInputDisplay.padAll(10)

    // Keyboard input label
    let keyboardInputLabel = viewUtils.createLabel('keyboardInputLabel', keyboardInputDisplay, "Please enter content...", 16)
    keyboardInputLabel.textColor(0x7f8c8d)
    keyboardInputLabel.setPos(0, 0)
    keyboardInputLabel.setSize(440, 40)
    pageView.keyboardInputLabel = keyboardInputLabel

    // Keyboard area
    let keyboardArea = ui.View.build('keyboardArea', keyboardView)
    keyboardArea.setSize(460, 240)
    keyboardArea.setPos(10, 80)
    keyboardArea.bgColor(0x34495e)
    keyboardArea.borderWidth(0)
    keyboardArea.padAll(5)
    keyboardArea.radius(8)
    pageView.keyboardArea = keyboardArea

    buildKeyboard()
    updateKeyMapping()
}

// Build keyboard keys
function buildKeyboard() {
    let layout = keyboardLayouts[currentKeyboardType]
    let keys = layout.keys
    let keyWidth = 41  // Increase key width
    let keyHeight = 38  // Increase key height
    let keyMarginX = 3  // Left-right spacing
    let keyMarginY = 6  // Up-down spacing, set larger
    let startX = 5
    let startY = 5

    for (let row = 0; row < keys.length; row++) {
        let rowKeys = keys[row]
        let rowY = startY + row * (keyHeight + keyMarginY)

        // If it's the last row (containing function buttons), need special position calculation
        if (row === keys.length - 1) {
            let currentX = startX
            for (let col = 0; col < rowKeys.length; col++) {
                let key = rowKeys[col]

                // Special key width adjustment
                let actualKeyWidth = keyWidth
                if (key === 'SPACE') {
                    actualKeyWidth = keyWidth * 4.2
                } else if (key === 'SWITCH' || key === 'CLEAR') {
                    actualKeyWidth = keyWidth * 1.8
                } else if (key === 'CONFIRM') {
                    actualKeyWidth = keyWidth * 2.5
                }

                createKeyButton(key, pageView.keyboardArea, currentX, rowY, actualKeyWidth, keyHeight, row, col)
                currentX += actualKeyWidth + keyMarginX  // Use actual width to calculate next position
            }
        } else {
            // Other rows use original logic
            for (let col = 0; col < rowKeys.length; col++) {
                let key = rowKeys[col]
                let keyX = startX + col * (keyWidth + keyMarginX)

                // Special key width adjustment
                let actualKeyWidth = keyWidth
                if (key === 'BACKSPACE') {
                    actualKeyWidth = keyWidth * 3
                }

                createKeyButton(key, pageView.keyboardArea, keyX, rowY, actualKeyWidth, keyHeight, row, col)
            }
        }
    }
}

// Set button color based on key type
function setButtonColor(button, key) {
    if (key === 'BACKSPACE') {
        button.bgColor(0xe74c3c)
    } else if (key === 'SPACE') {
        button.bgColor(0x95a5a6)
    } else if (key === 'SWITCH') {
        button.bgColor(0x3498db)
    } else if (key === 'CLEAR') {
        button.bgColor(0xf39c12)
    } else if (key === 'CONFIRM') {
        button.bgColor(0x27ae60)
    } else {
        button.bgColor(0x34495e)
    }
}

// Create key button
function createKeyButton(key, parent, x, y, w, h, row, col) {
    let btn = ui.Button.build('key_' + row + '_' + col, parent)
    btn.setPos(x, y)
    btn.setSize(w, h)
    btn.radius(5)

    // Set key color
    setButtonColor(btn, key)

    // Create label
    let label = ui.Label.build(btn.id + 'label', btn)
    label.text(key)
    label.textFont(viewUtils.font16)  // Increase font size
    label.textColor(0xFFFFFF)
    label.align(ui.Utils.ALIGN.CENTER, 0, 0)

    // Bind click event - use row and column index
    btn.on(ui.Utils.EVENT.CLICK, () => {
        handleKeyPressByPosition(row, col)
    })

    return btn
}



// Handle key press by row and column position
function handleKeyPressByPosition(row, col) {
    let key = keyMapping[row + '_' + col]
    if (key) {
        handleKeyPress(key)
    }
}

// Update keyboard mapping
function updateKeyMapping() {
    keyMapping = {}
    let layout = keyboardLayouts[currentKeyboardType]
    let keys = layout.keys

    for (let row = 0; row < keys.length; row++) {
        let rowKeys = keys[row]
        for (let col = 0; col < rowKeys.length; col++) {
            let key = rowKeys[col]
            keyMapping[row + '_' + col] = key

            // Update button label
            let buttonId = 'key_' + row + '_' + col
            let label = ui.getUi(buttonId + 'label')
            if (label) {
                label.text(key)
            }

            // Update button color
            let button = ui.getUi(buttonId)
            if (button) {
                setButtonColor(button, key)
            }
        }
    }
}

// Handle key press
function handleKeyPress(key) {
    switch (key) {
        case 'BACKSPACE':
            if (currentInput.length > 0) {
                currentInput = currentInput.slice(0, -1)
            }
            break
        case 'SPACE':
            currentInput += ' '
            break
        case 'SWITCH':
            switchKeyboard()
            break
        case 'CLEAR':
            clearInput()
            break
        case 'CONFIRM':
            confirmInput()
            break
        default:
            currentInput += key
    }

    updateKeyboardDisplay()
}

// Update keyboard display
function updateKeyboardDisplay() {
    if (pageView.keyboardInputLabel) {
        if (currentInput.length > 0) {
            pageView.keyboardInputLabel.text(currentInput)
            pageView.keyboardInputLabel.textColor(0x2c3e50)
        } else {
            pageView.keyboardInputLabel.text("Please enter content...")
            pageView.keyboardInputLabel.textColor(0x7f8c8d)
        }
    }
}

// Open keyboard
function openKeyboard() {
    keyboardView.show()
    theView.hide()
    updateKeyboardDisplay()
}

// Close keyboard
function closeKeyboard() {
    keyboardView.hide()
    theView.show()
    updateMainDisplay()
}

// Switch keyboard
function switchKeyboard() {
    switch (currentKeyboardType) {
        case 'english':
            currentKeyboardType = 'english_upper'
            break
        case 'english_upper':
            currentKeyboardType = 'symbol'
            break
        case 'symbol':
            currentKeyboardType = 'english'
            break
    }
    updateKeyMapping()
    updateKeyboardDisplay()
}

// Clear input
function clearInput() {
    currentInput = ""
    updateKeyboardDisplay()
}

// Confirm input
function confirmInput() {
    closeKeyboard()
}

// Update main interface display
function updateMainDisplay() {
    if (pageView.inputLabel) {
        if (currentInput.length > 0) {
            pageView.inputLabel.text(currentInput)
            pageView.inputLabel.textColor(0x2c3e50)
        } else {
            pageView.inputLabel.text("Input content will be displayed here...")
            pageView.inputLabel.textColor(0x7f8c8d)
        }
    }
}

pageView.load = function () {
    ui.loadMain(theView)
}

export default pageView 