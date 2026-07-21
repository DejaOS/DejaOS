import dxui from '../../dxmodules/dxUi.js'
import log from '../../dxmodules/dxLogger.js'
import UI from './UI.js'

let root = null
let numberPanel = null
let textPanel = null
let symbolPanel = null
let activeTextarea = null
let uppercase = false
let letterKeys = []
let caseButton = null

function appendValue(value) {
    if (!activeTextarea) return
    try {
        if (value === '__BACKSPACE__') {
            activeTextarea.lvTextareaDelChar()
        } else if (value === '__CLEAR__') {
            activeTextarea.text('')
        } else {
            activeTextarea.lvTextareaAddText(value)
        }
    } catch (e) {
        log.error('custom keyboard input failed', e)
    }
}

function createKey(parent, id, text, value, x, y, width, height, color, textColor) {
    function handleKey() {
        appendValue(typeof value === 'function' ? value() : value)
    }
    return UI.button(
        'host_keyboard_' + id,
        parent,
        text,
        x,
        y,
        width,
        height,
        color === undefined ? 0xffffff : color,
        textColor === undefined ? UI.Theme.INK : textColor,
        handleKey,
        9,
        13
    )
}

function updateLetterCase() {
    letterKeys.forEach(function updateKey(key) {
        key._label.text(uppercase ? key._letter.toUpperCase() : key._letter)
    })
    if (caseButton) caseButton._label.text(uppercase ? 'abc' : 'ABC')
}

function showLetters() {
    textPanel.show()
    symbolPanel.hide()
}

function showSymbols() {
    textPanel.hide()
    symbolPanel.show()
}

function buildNumberPanel() {
    numberPanel = UI.view('host_keyboard_number_panel', root, 0, 44, 480, 276, 0xe9efee, 0)
    const keys = [
        ['1', '1'], ['2', '2'], ['3', '3'],
        ['4', '4'], ['5', '5'], ['6', '6'],
        ['7', '7'], ['8', '8'], ['9', '9'],
        ['.', '.'], ['0', '0'], ['Back', '__BACKSPACE__']
    ]
    keys.forEach(function buildKey(item, index) {
        const col = index % 3
        const row = Math.floor(index / 3)
        const isBackspace = item[1] === '__BACKSPACE__'
        createKey(
            numberPanel,
            'number_' + index,
            item[0],
            item[1],
            78 + col * 110,
            10 + row * 65,
            102,
            55,
            isBackspace ? 0xffeeee : 0xffffff,
            isBackspace ? UI.Theme.RED : UI.Theme.INK
        )
    })
}

function buildTextPanel() {
    textPanel = UI.view('host_keyboard_text_panel', root, 0, 44, 480, 276, 0xe9efee, 0)
    const rows = [
        { keys: 'qwertyuiop', x: 5, y: 7, width: 43, gap: 4 },
        { keys: 'asdfghjkl', x: 27, y: 61, width: 43, gap: 4 },
        { keys: 'zxcvbnm', x: 71, y: 115, width: 43, gap: 4 }
    ]
    rows.forEach(function buildRow(row, rowIndex) {
        row.keys.split('').forEach(function buildLetter(letter, index) {
            const key = createKey(
                textPanel,
                'text_' + rowIndex + '_' + index,
                letter,
                function letterValue() { return uppercase ? letter.toUpperCase() : letter },
                row.x + index * (row.width + row.gap),
                row.y,
                row.width,
                48
            )
            key._letter = letter
            letterKeys.push(key)
        })
    })
    createKey(textPanel, 'text_backspace', 'Back', '__BACKSPACE__', 401, 115, 74, 48, 0xffeeee, UI.Theme.RED)

    function toggleCase() {
        uppercase = !uppercase
        updateLetterCase()
    }
    caseButton = UI.button('host_keyboard_case', textPanel, 'ABC', 90, 181, 130, 52, 0xd4dfdd, UI.Theme.BRAND_DEEP, toggleCase, 11, 13)
    UI.button('host_keyboard_symbols', textPanel, '123', 260, 181, 130, 52, 0xd4dfdd, UI.Theme.BRAND_DEEP, showSymbols, 11, 14)
}

function buildSymbolPanel() {
    symbolPanel = UI.view('host_keyboard_symbol_panel', root, 0, 44, 480, 276, 0xe9efee, 0)
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '-', '_', '/', ':', '@', '#', '?', '&', '=']
    keys.forEach(function buildSymbol(value, index) {
        const col = index % 5
        const row = Math.floor(index / 5)
        createKey(symbolPanel, 'symbol_' + index, value, value, 19 + col * 90, 7 + row * 52, 82, 44)
    })
    UI.button('host_keyboard_letters', symbolPanel, 'ABC', 90, 219, 130, 48, 0xd4dfdd, UI.Theme.BRAND_DEEP, showLetters, 11, 14)
    createKey(symbolPanel, 'symbol_backspace', 'Back', '__BACKSPACE__', 260, 219, 130, 48, 0xffeeee, UI.Theme.RED)
}

function hide() {
    if (root) root.hide()
    activeTextarea = null
}

function init() {
    if (root) return
    root = UI.view('host_keyboard_overlay', dxui.Utils.LAYER.TOP, 0, 534, 480, 320, UI.Theme.WHITE, 0)
    const bar = UI.view('host_keyboard_bar', root, 0, 0, 480, 44, 0xdfe7e5, 0)
    UI.label('host_keyboard_hint', bar, 'Keyboard', 12, 10, 150, 24, 11, UI.Theme.MUTED, true)

    function inputSpace() {
        appendValue(' ')
    }
    function clearInput() {
        appendValue('__CLEAR__')
    }
    function closeKeyboard() {
        hide()
    }

    UI.button('host_keyboard_space', bar, 'Space', 186, 6, 78, 32, 0xffffff, UI.Theme.INK, inputSpace, 9, 10)
    UI.button('host_keyboard_clear', bar, 'Clear', 272, 6, 78, 32, 0xffeeee, UI.Theme.RED, clearInput, 9, 10)
    UI.button('host_keyboard_close', bar, 'Done', 358, 6, 106, 32, UI.Theme.BRAND, UI.Theme.WHITE, closeKeyboard, 9, 11)

    buildNumberPanel()
    buildTextPanel()
    buildSymbolPanel()
    root.hide()
}

function open(textarea, mode) {
    if (!root) init()
    activeTextarea = textarea
    const numberMode = mode === dxui.Utils.KEYBOARD.NUMBER
    if (numberMode) {
        numberPanel.show()
        textPanel.hide()
        symbolPanel.hide()
    } else {
        uppercase = false
        updateLetterCase()
        numberPanel.hide()
        textPanel.show()
        symbolPanel.hide()
    }
    root.show()
    root.moveForeground()
}

export default { init, open, hide }
