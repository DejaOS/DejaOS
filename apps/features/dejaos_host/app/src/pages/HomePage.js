import dxui from '../../dxmodules/dxUi.js'
import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import ConfirmOverlay from '../ui/ConfirmOverlay.js'
import AppRegistry from '../services/AppRegistry.js'
import MicroAppLoader from '../services/MicroAppLoader.js'

const HomePage = {
    tiles: {},
    longPressedAt: 0,

    init: function init() {
        this.shell = UI.shell(this, 'home', 'DejaOS Host', '', false)
        const content = this.shell.content
        UI.label('home_welcome', content, 'Welcome', 20, 20, 180, 34, 24, UI.Theme.INK, true)
        UI.label('home_welcome_sub', content, 'Select an app to get started', 20, 56, 240, 20, 11, UI.Theme.MUTED, false)
        const netPill = UI.view('home_net_pill', content, 350, 27, 110, 30, UI.Theme.MINT, 15)
        UI.label('home_net_pill_text', netPill, '● Online', 0, 0, 110, 30, 10, UI.Theme.BRAND_DEEP, true, dxui.Utils.TEXT_ALIGN.CENTER)

        this.createSystemTile('config', 'Settings', '/app/code/resource/icon/config.png', 0x4f89bf, function openConfig() {
            HomePage.open('config')
        })
        this.createSystemTile('appManager', 'App Manager', '/app/code/resource/icon/apps.png', 0x249781, function openAppManager() {
            HomePage.open('appManager')
        })

        const hint = UI.view('home_hint', content, 20, 660, 440, 42, 0xffffff, 13)
        hint.borderWidth(1)
        hint.borderColor(UI.Theme.LINE)
        UI.label('home_hint_text', hint, 'Press and hold an installed app to uninstall', 0, 7, 440, 28, 12, UI.Theme.MUTED, true, dxui.Utils.TEXT_ALIGN.CENTER)
        this.refreshApps()
        return this.shell.root
    },

    createTile: function createTile(id, name, iconPath, color, onClick) {
        const tile = dxui.Button.build('home_tile_' + id, this.shell.content)
        tile.setSize(132, 132)
        tile.padAll(0)
        tile.borderWidth(1)
        tile.borderColor(UI.Theme.LINE)
        tile.radius(22)
        tile.bgColor(UI.Theme.WHITE)
        tile.shadow(14, 0, 5, 0, 0x243b39, 8)
        const icon = UI.view('home_tile_' + id + '_icon', tile, 37, 18, 58, 58, color, 18)
        UI.image('home_tile_' + id + '_image', icon, iconPath, 9, 9, 40, 40)
        UI.label('home_tile_' + id + '_name', tile, name, 6, 86, 120, 25, 14, UI.Theme.INK, true, dxui.Utils.TEXT_ALIGN.CENTER)
        tile._hit = UI.hitArea('home_tile_' + id + '_hit', tile, 0, 0, 132, 132, onClick, 22)
        this.tiles[id] = tile
        return tile
    },

    createSystemTile: function createSystemTile(id, name, iconPath, color, callback) {
        const tile = this.createTile(id, name, iconPath, color, callback)
        UI.label('home_tile_' + id + '_system', tile, 'SYS', 91, 7, 34, 18, 8, UI.Theme.MUTED, false, dxui.Utils.TEXT_ALIGN.CENTER)
        tile._hit.moveForeground()
    },

    createAppTile: function createAppTile(app) {
        function openApp() {
            if (Date.now() - HomePage.longPressedAt < 700) return
            HomePage.open('microApp', app)
        }
        const tile = this.createTile(app.id, app.name, app.icon, app.color, openApp)
        UI.label('home_tile_' + app.id + '_version', tile, 'v' + app.version, 6, 111, 120, 14, 8, 0x94a0aa, false, dxui.Utils.TEXT_ALIGN.CENTER)
        function handleLongPressed() {
            HomePage.longPressedAt = Date.now()
            function confirmUninstall() {
                try {
                    MicroAppLoader.unload(app.id)
                    AppRegistry.uninstall(app.id)
                    HomePage.refreshApps()
                    Toast.show(app.name + ' uninstalled. No restart required.')
                } catch (e) {
                    Toast.show('Uninstall failed: ' + (e.message || String(e)))
                }
            }
            ConfirmOverlay.show('Uninstall ' + app.name + '?', 'The running instance and installed files under /app/data will be removed.', confirmUninstall)
        }
        tile._hit.on(dxui.Utils.EVENT.LONG_PRESSED, handleLongPressed)
        tile._hit.moveForeground()
        return tile
    },

    removeMissingTiles: function removeMissingTiles(installedIds) {
        Object.keys(this.tiles).forEach(function removeTile(id) {
            if (id === 'config' || id === 'appManager' || installedIds[id]) return
            dxui.del(HomePage.tiles[id])
            delete HomePage.tiles[id]
        })
    },

    refreshApps: function refreshApps() {
        AppRegistry.refresh()
        const apps = AppRegistry.installedList()
        const installedIds = {}
        apps.forEach(function ensureTile(app) {
            installedIds[app.id] = true
            if (!HomePage.tiles[app.id]) HomePage.createAppTile(app)
        })
        this.removeMissingTiles(installedIds)

        const visible = [this.tiles.config, this.tiles.appManager]
        apps.forEach(function collectTile(app) {
            if (HomePage.tiles[app.id]) visible.push(HomePage.tiles[app.id])
        })
        visible.forEach(function placeTile(tile, index) {
            const col = index % 3
            const row = Math.floor(index / 3)
            tile.setPos(20 + col * 147, 96 + row * 148)
            tile.show()
        })
    },

    onShow: function onShow() {
        this.refreshApps()
    },

    onHide: function onHide() {}
}

export default HomePage
