import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import AppRegistry from '../services/AppRegistry.js'
import MicroAppLoader from '../services/MicroAppLoader.js'

const MicroAppHostPage = {
    currentId: null,

    init: function init() {
        this.shell = UI.shell(this, 'micro_app_host', 'Micro App', '', true)
        return this.shell.root
    },

    onShow: function onShow(app) {
        if (!app || !app.id || !AppRegistry.isInstalled(app.id)) {
            Toast.show('Micro app is not installed')
            return
        }
        const installedApp = AppRegistry.get(app.id)
        this.currentId = installedApp.id
        UI.setTitle(this.shell, installedApp.name, '')
        UI.setHeaderRight(this.shell, 'v' + installedApp.version)
        try {
            MicroAppLoader.show(installedApp, this.shell.content, {
                close: function closeApp() { MicroAppHostPage.close() }
            })
        } catch (e) {
            Toast.show('Failed to load micro app: ' + (e.message || String(e)))
        }
    },

    onHide: function onHide() {
        if (this.currentId) MicroAppLoader.hide(this.currentId)
        UI.setHeaderRight(this.shell, '')
        this.currentId = null
    }
}

export default MicroAppHostPage
