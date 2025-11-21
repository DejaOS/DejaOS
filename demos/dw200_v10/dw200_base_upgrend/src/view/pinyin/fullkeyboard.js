import dxui from "../../../dxmodules/dxUi.js";
import viewUtils from '../util/viewUtils.js'

const fullKeyboard = {}
let keyboardView;
let currentInput = "";
let currentKeyboardType = "english";
let keyMapping = {}; // Store key mapping: key is "row_col", value is character
let onConfirmCallback = null;

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

fullKeyboard.init = function () {
    console.log('Initializing fullkeyboard...')  // Add debug info
    createKeyboardView()
    console.log('Fullkeyboard initialized')  // Add debug info
}

// Create keyboard view
function createKeyboardView() {
    console.log('Creating keyboard view...')  // Add debug info
    keyboardView = dxui.View.build('keyboardView', dxui.Utils.LAYER.TOP)
    keyboardView.padAll(0)
    keyboardView.borderWidth(0)
    keyboardView.bgColor(0x1e3a8a)
    keyboardView.setPos(0, 240)  // Adjust position to show keyboard in lower half of screen
    keyboardView.setSize(320, 240)  // Adjust to fit 320x480 screen size
    keyboardView.hide()
    console.log('Keyboard view properties set:', {
        pos: [0, 240],
        size: [320, 240],
        layer: dxui.Utils.LAYER.TOP
    })  // Add debug info

    // Input display area
    let keyboardInputDisplay = dxui.View.build('keyboardInputDisplay', keyboardView)
    keyboardInputDisplay.setSize(300, 40)
    keyboardInputDisplay.setPos(10, 10)
    keyboardInputDisplay.bgColor(0xFFFFFF)
    keyboardInputDisplay.borderWidth(2)
    keyboardInputDisplay.setBorderColor(0xbdc3c7)
    keyboardInputDisplay.radius(8)
    keyboardInputDisplay.padAll(10)

    // Keyboard input label
    let keyboardInputLabel = viewUtils.createLabel('keyboardInputLabel', keyboardInputDisplay, "Please enter content...", 14)
    keyboardInputLabel.textColor(0x7f8c8d)
    keyboardInputLabel.setPos(0, 0)
    keyboardInputLabel.setSize(280, 20)
    fullKeyboard.keyboardInputLabel = keyboardInputLabel

    // Keyboard area
    let keyboardArea = dxui.View.build('keyboardArea', keyboardView)
    keyboardArea.setSize(300, 180)
    keyboardArea.setPos(10, 60)
    keyboardArea.bgColor(0x3b82f6)
    keyboardArea.borderWidth(0)
    keyboardArea.padAll(5)
    keyboardArea.radius(8)
    fullKeyboard.keyboardArea = keyboardArea

    buildKeyboard()
    updateKeyMapping()
    console.log('Keyboard view created successfully')  // Add debug info
}

// Build keyboard keys
function buildKeyboard() {
    let layout = keyboardLayouts[currentKeyboardType]
    let keys = layout.keys
    let keyWidth = 25  // Adjust key width
    let keyHeight = 25  // Adjust key height
    let keyMarginX = 2  // Left-right spacing
    let keyMarginY = 4  // Top-bottom spacing
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
                    actualKeyWidth = keyWidth * 3
                } else if (key === 'SWITCH' || key === 'CLEAR') {
                    actualKeyWidth = keyWidth * 1.5
                } else if (key === 'CONFIRM') {
                    actualKeyWidth = keyWidth * 2
                }

                createKeyButton(key, fullKeyboard.keyboardArea, currentX, rowY, actualKeyWidth, keyHeight, row, col)
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
                    actualKeyWidth = keyWidth * 2
                }

                createKeyButton(key, fullKeyboard.keyboardArea, keyX, rowY, actualKeyWidth, keyHeight, row, col)
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
        button.bgColor(0x60a5fa)
    }
}

// Create key button
function createKeyButton(key, parent, x, y, w, h, row, col) {
    let btn = dxui.Button.build('key_' + row + '_' + col, parent)
    btn.setPos(x, y)
    btn.setSize(w, h)
    btn.radius(5)

    // Set key color
    setButtonColor(btn, key)

    // Create label
    let label = dxui.Label.build(btn.id + 'label', btn)
    label.text(key)
    label.textFont(viewUtils.getFont14())  // Adjust font size
    label.textColor(0xFFFFFF)
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    // Bind click event - use row and column index
    btn.on(dxui.Utils.EVENT.CLICK, () => {
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
            let label = dxui.getUi(buttonId + 'label')
            if (label) {
                label.text(key)
            }

            // Update button color
            let button = dxui.getUi(buttonId)
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
    if (fullKeyboard.keyboardInputLabel) {
        if (currentInput.length > 0) {
            fullKeyboard.keyboardInputLabel.text(currentInput)
            fullKeyboard.keyboardInputLabel.textColor(0x2c3e50)
        } else {
            fullKeyboard.keyboardInputLabel.text("Please enter content...")
            fullKeyboard.keyboardInputLabel.textColor(0x7f8c8d)
        }
    }
}

// Open keyboard
fullKeyboard.open = function (callback, initText) {
    onConfirmCallback = callback
    // Initialize current input to initial text
    currentInput = initText || ""
    keyboardView.show()
    updateKeyboardDisplay()
    console.log('Keyboard opened with text:', currentInput)  // Add debug info
}

// Close keyboard
fullKeyboard.close = function () {
    keyboardView.hide()
    currentInput = ""
    onConfirmCallback = null
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
    if (onConfirmCallback) {
        onConfirmCallback(currentInput)
    }
    fullKeyboard.close()
}

// Add a method to handle text appending
fullKeyboard.appendText = function(text) {
    currentInput += text
    updateKeyboardDisplay()
}

// Get current input
fullKeyboard.getCurrentInput = function () {
    return currentInput
}

// Set current input
fullKeyboard.setCurrentInput = function (input) {
    currentInput = input
    updateKeyboardDisplay()
}

export default fullKeyboard 