import dxui from '../../dxmodules/dxUi.js'
import bus from '../../dxmodules/dxEventBus.js'
import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import ConfirmOverlay from '../ui/ConfirmOverlay.js'
import AppRegistry from '../services/AppRegistry.js'
import MicroAppLoader from '../services/MicroAppLoader.js'
import EventTopics from '../constants/EventTopics.js'

const AppManagerPage = {
    mode: 'available',
    rows: [],
    loadingCatalog: false,
    pendingInstallId: null,
    catalogError: '',

    init: function init() {
        this.shell = UI.shell(this, 'app_manager', 'App Manager', 'Server Micro Apps', true)
        const content = this.shell.content
        UI.label('app_manager_heading', content, 'App Manager', 20, 18, 220, 30, 22, UI.Theme.INK, true)
        UI.label('app_manager_heading_sub', content, 'Browse and download apps through dxHttpClient', 20, 49, 390, 20, 10, UI.Theme.MUTED, false)

        function showAvailable() { AppManagerPage.setMode('available') }
        function showInstalled() { AppManagerPage.setMode('installed') }
        this.availableTab = UI.button('app_manager_available_tab', content, 'Available', 20, 78, 215, 42, UI.Theme.WHITE, UI.Theme.BRAND_DEEP, showAvailable, 13, 12)
        this.installedTab = UI.button('app_manager_installed_tab', content, 'Installed', 245, 78, 215, 42, 0xe8eeed, UI.Theme.MUTED, showInstalled, 13, 12)
        this.caption = UI.label('app_manager_caption', content, '', 22, 132, 420, 22, 11, UI.Theme.MUTED, false)
        this.setMode('available')
        return this.shell.root
    },

    clearRows: function clearRows() {
        this.rows.forEach(function removeRow(row) {
            try { dxui.del(row) } catch (e) {}
        })
        this.rows = []
    },

    createBaseRow: function createBaseRow(prefix, app, index) {
        const row = UI.card(prefix + '_' + app.id, this.shell.content, 20, 164 + index * 116, 440, 106, 17)
        const icon = UI.view(prefix + '_' + app.id + '_icon', row, 14, 18, 56, 56, app.color, 16)
        UI.image(prefix + '_' + app.id + '_image', icon, app.icon, 8, 8, 40, 40)
        UI.label(prefix + '_' + app.id + '_name', row, app.name, 84, 14, 210, 25, 14, UI.Theme.INK, true)
        UI.label(prefix + '_' + app.id + '_desc', row, app.desc, 84, 40, 250, 20, 9, UI.Theme.MUTED, false)
        UI.label(prefix + '_' + app.id + '_meta', row, app.owner + ' · v' + app.version, 84, 66, 240, 18, 8, 0x8b979f, false)
        this.rows.push(row)
        return row
    },

    createAvailableRow: function createAvailableRow(app, index) {
        const row = this.createBaseRow('available_row', app, index)
        const isPending = this.pendingInstallId === app.id
        function installApp() {
            if (AppManagerPage.pendingInstallId) return
            AppManagerPage.pendingInstallId = app.id
            AppManagerPage.rebuildRows()
            Toast.show('Downloading ' + app.name)
            bus.fire(EventTopics.APP_INSTALL_REQUEST, { id: app.id, downloadUrl: app.downloadUrl })
        }
        UI.button('available_row_' + app.id + '_install', row, isPending ? 'Wait...' : 'Install', 340, 34, 82, 36, isPending ? 0x9ba8a5 : 0xe7f5ef, isPending ? UI.Theme.WHITE : UI.Theme.BRAND, installApp, 18, 11)
    },

    createInstalledRow: function createInstalledRow(app, index) {
        const row = this.createBaseRow('installed_row', app, index)
        function openApp() { AppManagerPage.open('microApp', app) }
        function uninstallApp() {
            function confirmUninstall() {
                try {
                    MicroAppLoader.unload(app.id)
                    AppRegistry.uninstall(app.id)
                    AppManagerPage.rebuildRows()
                    Toast.show(app.name + ' uninstalled without restart')
                } catch (e) {
                    Toast.show('Uninstall failed: ' + (e.message || String(e)))
                }
            }
            ConfirmOverlay.show('Uninstall ' + app.name + '?', 'The running instance and installed files under /app/data will be removed.', confirmUninstall)
        }
        UI.button('installed_row_' + app.id + '_open', row, 'Open', 348, 18, 74, 32, UI.Theme.BRAND, UI.Theme.WHITE, openApp, 16, 10)
        UI.button('installed_row_' + app.id + '_remove', row, 'Remove', 348, 57, 74, 32, 0xffeeee, UI.Theme.RED, uninstallApp, 16, 10)
    },

    setMode: function setMode(mode) {
        this.mode = mode
        if (mode === 'available') {
            this.availableTab.bgColor(UI.Theme.WHITE)
            this.availableTab._label.textColor(UI.Theme.BRAND_DEEP)
            this.installedTab.bgColor(0xe8eeed)
            this.installedTab._label.textColor(UI.Theme.MUTED)
        } else {
            this.availableTab.bgColor(0xe8eeed)
            this.availableTab._label.textColor(UI.Theme.MUTED)
            this.installedTab.bgColor(UI.Theme.WHITE)
            this.installedTab._label.textColor(UI.Theme.BRAND_DEEP)
        }
        this.rebuildRows()
    },

    requestCatalog: function requestCatalog() {
        this.loadingCatalog = true
        this.catalogError = ''
        this.rebuildRows()
        bus.fire(EventTopics.APP_CATALOG_REQUEST, {})
    },

    handleCatalogUpdated: function handleCatalogUpdated(payload) {
        AppRegistry.setRemoteCatalog(payload && payload.items)
        this.loadingCatalog = false
        this.catalogError = ''
        if (this.shell) this.rebuildRows()
    },

    handleCatalogFailed: function handleCatalogFailed(payload) {
        this.loadingCatalog = false
        this.catalogError = payload && payload.message ? payload.message : 'Failed to load the app catalog'
        if (this.shell) this.rebuildRows()
        Toast.show(this.catalogError)
    },

    handleInstallResult: function handleInstallResult(payload) {
        if (!payload || payload.id !== this.pendingInstallId) return
        this.pendingInstallId = null
        if (payload.ok) {
            AppRegistry.refresh()
            Toast.show('App installed. No restart required.')
        } else {
            Toast.show('Install failed: ' + (payload.message || 'Unknown error'))
        }
        if (this.shell) this.rebuildRows()
    },

    rebuildRows: function rebuildRows() {
        AppRegistry.refresh()
        this.clearRows()
        const apps = this.mode === 'available' ? AppRegistry.availableList() : AppRegistry.installedList()
        apps.forEach(function buildRow(app, index) {
            if (AppManagerPage.mode === 'available') AppManagerPage.createAvailableRow(app, index)
            else AppManagerPage.createInstalledRow(app, index)
        })
        if (this.mode === 'available') {
            if (this.loadingCatalog) this.caption.text('Loading apps from the service...')
            else if (this.catalogError) this.caption.text('Load failed. Check App Service settings.')
            else this.caption.text('Available from server (' + apps.length + ')')
        } else {
            this.caption.text('Installed under /app/data (' + apps.length + ')')
        }
    },

    onShow: function onShow() {
        this.rebuildRows()
        this.requestCatalog()
    },

    onHide: function onHide() {}
}

export default AppManagerPage
