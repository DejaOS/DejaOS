import dxui from '../dxmodules/dxUi.js'
import driver from '../dxmodules/dxDriver.js'
import log from '../dxmodules/dxLogger.js'

const FONT_PATH = '/app/code/resource/font/font.ttf'
const fonts = {}

const UIManager = {
    _root: null,
    _views: {},
    _current: null,

    init: function init() {
        if (this._root) return
        this._root = dxui.View.build('host_root_screen', dxui.Utils.LAYER.MAIN)
        this._root.setSize(driver.DISPLAY.WIDTH, driver.DISPLAY.HEIGHT)
        this._root.setPos(0, 0)
        this._root.radius(0)
        this._root.borderWidth(0)
        this._root.padAll(0)
        this._root.scroll(false)
        this._root.bgColor(0xf4f7f7)
        dxui.loadMain(this._root)
    },

    getRoot: function getRoot() {
        if (!this._root) this.init()
        return this._root
    },

    register: function register(name, view) {
        view.id = name
        view.hasInit = false
        view.root = null
        view.parent = null
        const self = this
        view.open = function open(target, data) {
            self.open(target, data)
        }
        view.close = function close(result) {
            self.close(view, result)
        }
        this._views[name] = view
    },

    safeInvoke: function safeInvoke(view, method, data) {
        if (!view || typeof view[method] !== 'function') return
        try {
            view[method](data)
        } catch (e) {
            log.error('page lifecycle failed', view.id, method, e)
        }
    },

    open: function open(name, data) {
        const next = this._views[name]
        if (!next) {
            log.error('page is not registered', name)
            return
        }
        if (this._current === next) {
            this.safeInvoke(next, 'onShow', data)
            return
        }
        if (!next.hasInit) {
            try {
                next.root = next.init()
                if (!next.root) throw new Error('init must return a root view')
                next.hasInit = true
            } catch (e) {
                log.error('page init failed', name, e)
                return
            }
        }
        if (this._current) {
            next.parent = this._current
            this._current.root.hide()
            this.safeInvoke(this._current, 'onHide')
        }
        this._current = next
        next.root.show()
        this.safeInvoke(next, 'onShow', data)
    },

    close: function close(view, result) {
        if (view !== this._current) return
        view.root.hide()
        this.safeInvoke(view, 'onHide')
        const parent = view.parent
        view.parent = null
        if (!parent) return
        this._current = parent
        parent.root.show()
        this.safeInvoke(parent, 'onShow', result)
    },

    font: function font(size, style) {
        const actualStyle = style === undefined ? dxui.Utils.FONT_STYLE.NORMAL : style
        const key = size + ':' + actualStyle
        if (!fonts[key]) {
            fonts[key] = dxui.Font.build(FONT_PATH, size, actualStyle)
        }
        return fonts[key]
    }
}

export default UIManager
