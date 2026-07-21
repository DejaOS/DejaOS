import dxui from '../dxmodules/dxUi.js'
import bus from '../dxmodules/dxEventBus.js'
import std from '../dxmodules/dxStd.js'
import log from '../dxmodules/dxLogger.js'
import UIManager from './UIManager.js'
import UI from './ui/UI.js'
import Toast from './ui/Toast.js'
import ConfirmOverlay from './ui/ConfirmOverlay.js'
import AppRegistry from './services/AppRegistry.js'
import HomePage from './pages/HomePage.js'
import ConfigPage from './pages/ConfigPage.js'
import NetworkPage from './pages/NetworkPage.js'
import AppServicePage from './pages/AppServicePage.js'
import AppManagerPage from './pages/AppManagerPage.js'
import MicroAppHostPage from './pages/MicroAppHostPage.js'
import EventTopics from './constants/EventTopics.js'

try {
    const context = {}
    dxui.init({ orientation: 0 }, context)
    UIManager.init()
    Toast.init()
    ConfirmOverlay.init()
    AppRegistry.init()

    bus.on(EventTopics.SYSTEM_TIME_UPDATED, function handleSystemTime(payload) {
        if (payload && payload.displayTime) UI.setClock(payload.displayTime)
    })
    bus.on(EventTopics.APP_CATALOG_UPDATED, function handleAppCatalog(payload) {
        AppManagerPage.handleCatalogUpdated(payload)
    })
    bus.on(EventTopics.APP_CATALOG_FAILED, function handleAppCatalogError(payload) {
        AppManagerPage.handleCatalogFailed(payload)
    })
    bus.on(EventTopics.APP_INSTALL_RESULT, function handleAppInstall(payload) {
        AppManagerPage.handleInstallResult(payload)
    })

    UIManager.register('home', HomePage)
    UIManager.register('config', ConfigPage)
    UIManager.register('network', NetworkPage)
    UIManager.register('appService', AppServicePage)
    UIManager.register('appManager', AppManagerPage)
    UIManager.register('microApp', MicroAppHostPage)
    UIManager.open('home')

    std.setTimeout(function requestInitialNetworkStatus() {
        try {
            bus.fire(EventTopics.NETWORK_STATUS_REQUEST, {})
        } catch (e) {
            log.error('initial network status request failed', e)
        }
    }, 500)

    std.setInterval(function uiLoop() {
        try {
            dxui.handler()
        } catch (e) {
            log.error('dxui handler failed', e)
        }
    }, 20)

    log.info('dejaos_host UI initialized')
} catch (e) {
    log.error('dejaos_host UI initialization failed', e)
}
