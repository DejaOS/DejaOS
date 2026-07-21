import dxui from '../../dxmodules/dxUi.js'
import UIManager from '../UIManager.js'
import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import KeyboardOverlay from '../ui/KeyboardOverlay.js'
import ServiceConfig from '../services/ServiceConfig.js'

const AppServicePage = {
    init: function init() {
        this.shell = UI.shell(this, 'app_service', 'App Service', 'Host Backend', true)
        const content = this.shell.content
        UI.label('app_service_heading', content, 'Backend Address', 20, 20, 300, 34, 24, UI.Theme.INK, true)
        UI.label('app_service_heading_sub', content, 'Used to browse and download this device\'s micro apps', 20, 57, 420, 22, 11, UI.Theme.MUTED, false)

        const card = UI.card('app_service_card', content, 20, 105, 440, 268, 20)
        const icon = UI.view('app_service_icon', card, 20, 20, 60, 60, UI.Theme.PURPLE, 18)
        UI.image('app_service_icon_image', icon, '/app/code/resource/icon/service.png', 10, 10, 40, 40)
        UI.label('app_service_card_title', card, 'DejaOS Host App Service', 98, 22, 310, 30, 17, UI.Theme.INK, true)
        UI.label('app_service_card_desc', card, 'Enter an IP, domain, or full URL with port', 98, 56, 310, 35, 11, UI.Theme.MUTED, false)

        UI.label('app_service_address_label', card, 'Service Address', 20, 108, 180, 22, 12, UI.Theme.MUTED, true)
        this.addressInput = dxui.Textarea.build('app_service_address_input', card)
        this.addressInput.setSize(400, 48)
        this.addressInput.setPos(20, 136)
        this.addressInput.setOneLine(true)
        this.addressInput.setMaxLength(160)
        this.addressInput.setCursorClickPos(true)
        this.addressInput.radius(11)
        this.addressInput.borderWidth(1)
        this.addressInput.borderColor(0xdbe3e1)
        this.addressInput.bgColor(0xf9fbfa)
        this.addressInput.textColor(UI.Theme.INK)
        this.addressInput.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL))
        this.addressInput.text(ServiceConfig.load().address)
        function openKeyboard() {
            KeyboardOverlay.open(AppServicePage.addressInput, dxui.Utils.KEYBOARD.K26)
        }
        this.addressInput.on(dxui.Utils.EVENT.FOCUSED, openKeyboard)
        this.addressInput.on(dxui.Utils.EVENT.CLICK, openKeyboard)

        function saveAddress() {
            const address = AppServicePage.addressInput.text().trim()
            if (!address) {
                Toast.show('Enter the backend service address')
                return
            }
            if (ServiceConfig.save({ address })) {
                Toast.show('App service settings saved')
                KeyboardOverlay.hide()
            } else {
                Toast.show('Failed to save app service settings')
            }
        }
        UI.button('app_service_save', card, 'Save App Service', 20, 206, 400, 44, UI.Theme.BRAND, UI.Theme.WHITE, saveAddress, 12, 13)

        const note = UI.view('app_service_note', content, 20, 398, 440, 86, UI.Theme.MINT, 16)
        UI.label('app_service_note_title', note, 'Prototype Note', 18, 13, 180, 24, 13, UI.Theme.BRAND_DEEP, true)
        UI.label('app_service_note_text', note, 'This prototype only stores the address. Device binding, authentication, and certificates come later.', 18, 42, 402, 34, 11, UI.Theme.BRAND_DEEP, false)
        return this.shell.root
    },

    onShow: function onShow() {},
    onHide: function onHide() {
        KeyboardOverlay.hide()
    }
}

export default AppServicePage
