import dxui from '../../../dxmodules/dxUi.js'
import pinyin from '../pinyin/pinyin.js'
import screen from '../../screen.js'
import log from '../../../dxmodules/dxLogger.js'

const viewUtils = {}

viewUtils.font = function (size, style) {
    return dxui.Font.build(screen.fontPath, size || 14, style || dxui.Utils.FONT_STYLE.NORMAL)
}

// Predefined font sizes - lazy initialization
viewUtils.font14 = null
viewUtils.font16 = null
viewUtils.font18 = null
viewUtils.font20 = null
viewUtils.font24 = null
viewUtils.font28 = null

// Function to get font
viewUtils.getFont14 = function() {
    if (!viewUtils.font14) {
        viewUtils.font14 = viewUtils.font(14)
    }
    return viewUtils.font14
}

viewUtils.getFont16 = function() {
    if (!viewUtils.font16) {
        viewUtils.font16 = viewUtils.font(16)
    }
    return viewUtils.font16
}

viewUtils.getFont18 = function() {
    if (!viewUtils.font18) {
        viewUtils.font18 = viewUtils.font(18)
    }
    return viewUtils.font18
}

viewUtils.getFont20 = function() {
    if (!viewUtils.font20) {
        viewUtils.font20 = viewUtils.font(20)
    }
    return viewUtils.font20
}

viewUtils.getFont24 = function() {
    if (!viewUtils.font24) {
        viewUtils.font24 = viewUtils.font(24)
    }
    return viewUtils.font24
}

viewUtils.getFont28 = function() {
    if (!viewUtils.font28) {
        viewUtils.font28 = viewUtils.font(28)
    }
    return viewUtils.font28
}

viewUtils.color = {
    // Success, green
    success: 0x00BF8A,
    // Failure, red
    fail: 0xFF0000,
    // Warning, yellow
    warning: 0xFFA800,
    // Default: blue
    default: 0x00a8ff
}

// Clear style
viewUtils._clearStyle = function (obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}

// Create label
viewUtils.createLabel = function (id, parent, text, fontSize) {
    const label = dxui.Label.build(id, parent)
    label.text(text || '')
    if (fontSize) {
        label.textFont(viewUtils.font(fontSize))
    }
    return label
}

// Input box
viewUtils.input = function (mainView,parent, id, mode, enter = () => { }, dataI18n) {
   
    const input = dxui.Textarea.build(id + 'input', parent)
    viewUtils._clearStyle(input)
    input.align(dxui.Utils.ALIGN.TOP_MID, 0, 100)
    input.textAlign(dxui.Utils.TEXT_ALIGN.LEFT_MID)
    input.setOneLine(true)
    input.borderWidth(2)
    input.setBorderColor(0xE7E7E7)
    const font = viewUtils.font(18)
    const superSetSize = input.setSize
    input.setSize = (width, height) => {
        superSetSize.call(input, width, height)
        input.padAll((height - 4 - 20) / 2)
        input.padLeft(30)
        input.padRight(30)
    }
    input.setSize(480, 100)
    input.radius(13)
    input.textFont(font)
    if (dataI18n) {
        // Only in dxui.all can dataI18n be used
        dxui.all[id + 'input' + 'obj'] = input.obj
        input.obj.dataI18n = dataI18n
        input.obj.text = (text) => {
            input.obj.lvTextareaSetPlaceholderText(text)
        }
    }

    input.on(dxui.Utils.EVENT.CLICK, () => {
        log.info('Keyboard show'+id)
        
        // Get current DHCP status
        const dhcpSelected = mainView.netInfo[3].dropdown.getSelected()
        const isDhcpEnabled = (dhcpSelected === 1) // 1 means yes
        
        mainView.networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, -65)
        
        input.setBorderColor(0x3670f7)
        
        pinyin.show(mode || pinyin.getMode(), (data) => {
            
            if (typeof data == 'string') {
                input.lvTextareaAddText(data)
            } else if (typeof data == 'object') {
                switch (data.cmd) {
                    case 'enter':
                        enter()
                        pinyin.hide()
                        log.info('Keyboard hide')
                        mainView.networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 30)
                        break
                    case 'backspace':
                        input.lvTextareaDelChar()
                        break
                }
            }
        })
        if (mode) {
            pinyin.lock()
        }
    })

    let root = parent
    let rootId = parent.id
    while ((rootId = dxui.all[rootId].parent) != "0") {
        root = dxui.all[rootId]
    }
    

    root.on(dxui.Utils.EVENT.CLICK, () => {
        input.setBorderColor(0xE7E7E7)
        pinyin.hide()
        // Restore network setting box to original position
        mainView.networkSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 30)
    })

    root.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        input.setBorderColor(0xE7E7E7)
        pinyin.hide()
        input.text('')
    })
    return input
}


viewUtils.bottomBtn = function (parent, id, text, click, btnColor = 0x000000, textColor = 0xffffff, fontSize = 28) {
    const btn = dxui.Button.build(id, parent)
    btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -124)
    btn.bgColor(btnColor)
    btn.setSize(280, 60)
    btn.radius(50)
    const btnLbl = dxui.Label.build(id + 'lbl', btn)
    btnLbl.text(text)
    btnLbl.textFont(viewUtils.font(fontSize))
    btnLbl.textColor(textColor)
    btnLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    btn.on(dxui.Utils.EVENT.CLICK, click)
    return btn
}

export default viewUtils