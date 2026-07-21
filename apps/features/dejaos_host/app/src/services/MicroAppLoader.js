import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'
import UI from '../ui/UI.js'
import Toast from '../ui/Toast.js'
import UIManager from '../UIManager.js'
import KeyboardOverlay from '../ui/KeyboardOverlay.js'
import bus from '../../dxmodules/dxEventBus.js'

const instances = {}
const STORAGE_ROOT = '/app/data/dejaos_host/mini-storage'

function scopedId(appId, localId) {
    return 'mini_' + String(appId).replace(/[^a-zA-Z0-9_]/g, '_') + '_' + String(localId).replace(/[^a-zA-Z0-9_]/g, '_')
}

function createUiFacade(app) {
    function id(localId) { return scopedId(app.id, localId) }
    return {
        Theme: UI.Theme,
        ALIGN: { CENTER: dxui.Utils.TEXT_ALIGN.CENTER, LEFT: dxui.Utils.TEXT_ALIGN.LEFT, RIGHT: dxui.Utils.TEXT_ALIGN.RIGHT },
        EVENT: { CLICK: dxui.Utils.EVENT.CLICK, FOCUSED: dxui.Utils.EVENT.FOCUSED },
        view: function view(localId, parent, x, y, width, height, color, radius) { return UI.view(id(localId), parent, x, y, width, height, color, radius) },
        label: function label(localId, parent, text, x, y, width, height, size, color, bold, align) { return UI.label(id(localId), parent, text, x, y, width, height, size, color, bold, align) },
        image: function image(localId, parent, path, x, y, width, height) { return UI.image(id(localId), parent, path, x, y, width, height) },
        button: function button(localId, parent, text, x, y, width, height, color, textColor, onClick, radius, fontSize) { return UI.button(id(localId), parent, text, x, y, width, height, color, textColor, onClick, radius, fontSize) },
        card: function card(localId, parent, x, y, width, height, radius) { return UI.card(id(localId), parent, x, y, width, height, radius) },
        textarea: function textarea(localId, parent, x, y, width, height, maxLength) {
            const item = dxui.Textarea.build(id(localId), parent)
            item.setSize(width, height)
            item.setPos(x, y)
            item.radius(18)
            item.borderWidth(1)
            item.borderColor(UI.Theme.LINE)
            item.bgColor(UI.Theme.WHITE)
            item.textColor(UI.Theme.INK)
            item.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL))
            item.setMaxLength(maxLength || 1000)
            item.setCursorClickPos(true)
            return item
        }
    }
}

function storagePath(appId, key) {
    const safeAppId = String(appId).replace(/[^a-zA-Z0-9._-]/g, '_')
    const safeKey = String(key).replace(/[^a-zA-Z0-9._-]/g, '_')
    return STORAGE_ROOT + '/' + safeAppId + '/' + safeKey + '.txt'
}

function createContext(app, container, options) {
    return {
        app,
        root: container,
        ui: createUiFacade(app),
        toast: function toast(message) { Toast.show(String(message || '')) },
        close: options && options.close ? options.close : function close() {},
        keyboard: {
            open: function open(textarea) { KeyboardOverlay.open(textarea, dxui.Utils.KEYBOARD.K26) },
            hide: function hide() { KeyboardOverlay.hide() }
        },
        http: {
            getServiceJson: function getServiceJson(path, timeout) {
                const requestTimeout = Math.max(1000, Math.min(Number(timeout) || 10000, 15000))
                if (!bus.rpc) return Promise.reject(new Error('network rpc is not ready'))
                return bus.rpc.call('networkWorker', 'miniAppServiceGetJson', {
                    path: String(path || ''),
                    timeout: requestTimeout
                }, requestTimeout + 3000)
            }
        },
        storage: {
            loadText: function loadText(key, fallback) {
                const file = storagePath(app.id, key)
                try { return std.exist(file) ? std.loadFile(file) : String(fallback || '') }
                catch (e) { log.error('mini app storage read failed', app.id, key, e); return String(fallback || '') }
            },
            saveText: function saveText(key, value) {
                try { std.saveFile(storagePath(app.id, key), String(value || '')); return true }
                catch (e) { log.error('mini app storage write failed', app.id, key, e); throw e }
            }
        },
        logger: {
            info: function info(message) { log.info('mini app', app.id, message) },
            error: function error(message, errorObject) { log.error('mini app', app.id, message, errorObject || '') }
        }
    }
}

function invoke(instance, method) {
    if (!instance || !instance.runtime || typeof instance.runtime[method] !== 'function') return
    instance.runtime[method]()
}

function unload(id) {
    const instance = instances[id]
    if (!instance) return
    try {
        invoke(instance, 'hide')
    } catch (e) {
        log.error('mini app hide before unload failed', id, e)
    }
    try {
        invoke(instance, 'unmount')
    } catch (e) {
        log.error('mini app unmount failed', id, e)
    }
    try {
        dxui.del(instance.container)
    } catch (e) {
        log.error('delete mini app ui tree failed', id, e)
    }
    delete instances[id]
    log.info('mini app runtime unloaded', id)
}

function load(app, parent, options) {
    if (!app || !app.id || !app.entryPath) throw new Error('installed mini app metadata is invalid')
    const existing = instances[app.id]
    if (existing && existing.version === app.version) return existing
    if (existing) unload(app.id)
    if (!std.exist(app.entryPath)) throw new Error('mini app entry not found: ' + app.entryPath)

    const container = UI.view(scopedId(app.id, 'host_container'), parent, 0, 0, 480, 764, UI.Theme.PAGE, 0)
    container.hide()
    try {
        const runtime = std.loadScript(app.entryPath)
        if (!runtime || typeof runtime.mount !== 'function') {
            throw new Error('loadScript must return an object with mount(context)')
        }
        const context = createContext(app, container, options)
        runtime.mount(context)
        const instance = { app, version: app.version, runtime, context, container }
        instances[app.id] = instance
        log.info('mini app loaded by dxStd.loadScript', app.id, app.version, app.entryPath)
        return instance
    } catch (e) {
        try { dxui.del(container) } catch (deleteError) { log.error('cleanup failed mini app container failed', app.id, deleteError) }
        log.error('load mini app script failed', app.id, e)
        throw e
    }
}

function show(app, parent, options) {
    const instance = load(app, parent, options)
    instance.container.show()
    invoke(instance, 'show')
    return instance
}

function hide(id) {
    const instance = instances[id]
    if (!instance) return
    invoke(instance, 'hide')
    instance.container.hide()
}

function isLoaded(id) {
    return !!instances[id]
}

export default { load, show, hide, unload, isLoaded }
