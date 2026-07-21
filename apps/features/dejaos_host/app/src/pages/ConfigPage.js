import UI from '../ui/UI.js'

const ConfigPage = {
    init: function init() {
        this.shell = UI.shell(this, 'config', 'System Settings', 'Device & Services', true)
        const content = this.shell.content
        UI.label('config_heading', content, 'Settings', 20, 20, 220, 34, 24, UI.Theme.INK, true)
        UI.label('config_heading_sub', content, 'Manage networking and the Host service address', 20, 57, 400, 22, 11, UI.Theme.MUTED, false)

        this.createEntry(
            'network',
            'Network',
            'Configure Ethernet, Wi-Fi, DHCP, or static IP',
            '/app/code/resource/icon/network.png',
            0x4f89bf,
            104,
            function openNetwork() { ConfigPage.open('network') }
        )
        this.createEntry(
            'app_service',
            'App Service',
            'Set the backend IP, domain, or full URL',
            '/app/code/resource/icon/service.png',
            UI.Theme.PURPLE,
            238,
            function openAppService() { ConfigPage.open('appService') }
        )
        return this.shell.root
    },

    createEntry: function createEntry(id, title, description, iconPath, color, y, onClick) {
        const row = UI.card('config_entry_' + id, this.shell.content, 20, y, 440, 112, 18)
        const icon = UI.view('config_entry_' + id + '_icon', row, 18, 26, 60, 60, color, 18)
        UI.image('config_entry_' + id + '_image', icon, iconPath, 10, 10, 40, 40)
        UI.label('config_entry_' + id + '_title', row, title, 96, 22, 290, 30, 17, UI.Theme.INK, true)
        UI.label('config_entry_' + id + '_desc', row, description, 96, 57, 316, 35, 11, UI.Theme.MUTED, false)
        const hit = UI.hitArea('config_entry_' + id + '_hit', row, 0, 0, 440, 112, onClick, 18)
        hit.moveForeground()
        return row
    },

    onShow: function onShow() {},
    onHide: function onHide() {}
}

export default ConfigPage
