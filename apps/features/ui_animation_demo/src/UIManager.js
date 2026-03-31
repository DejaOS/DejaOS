import log from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import std from '../dxmodules/dxStd.js'

const ttf = '/app/code/resource/font/font.ttf'
const fonts = []

/**
 * UI Manager
 * - manage the page register and switch(show/hide）
 * - 单 Screen 多 View 模式
 * - 支持 lazy init
 */
const UIManager = {
  _viewMap: {},
  _currentView: null,
  _rootScreen: null,

  init: function () {
    if (this._rootScreen) return

    log.info('UIManager init: Creating global RootScreen...')

    this._rootScreen = dxui.View.build(std.genRandomStr(10), dxui.Utils.LAYER.MAIN)
    this._rootScreen.radius(0)
    this._rootScreen.borderWidth(0)
    this._rootScreen.padAll(0)
    this._rootScreen.scroll(false)

    dxui.loadMain(this._rootScreen)
  },

  getRoot: function () {
    if (!this._rootScreen) this.init()
    return this._rootScreen
  },

  register: function (name, viewObj) {
    this._viewMap[name] = viewObj

    viewObj.id = name
    viewObj.hasInit = false
    viewObj.parent = null
    viewObj.root = null

    const self = this
    viewObj.open = function (targetName, data) {
      self.open(targetName, data)
    }
    viewObj.close = function (resultData) {
      self.close(viewObj, resultData)
    }
    viewObj.backTo = function (targetName, resultData) {
      self.backTo(targetName, resultData)
    }
  },

  _safeInvoke: function (view, fnName, ...args) {
    if (!view) return
    const fn = view[fnName]
    if (typeof fn !== 'function') return
    try {
      fn.apply(view, args)
    } catch (e) {
      const id = view.id || 'unknown'
      log.error(`UIManager: error in view '${id}'.${fnName}:`, e)
    }
  },

  _showRoot: function (view) {
    if (view && view.root && typeof view.root.show === 'function') view.root.show()
  },

  _hideRoot: function (view) {
    if (view && view.root && typeof view.root.hide === 'function') view.root.hide()
  },

  open: function (name, data) {
    if (!this._rootScreen) this.init()

    const nextView = this._viewMap[name]
    if (!nextView) {
      log.error(`UIManager: View '${name}' not registered.`)
      return
    }

    if (this._currentView === nextView) {
      this._safeInvoke(nextView, 'onShow', data)
      return
    }

    // prevent circular reference A->B->C->A
    let p = this._currentView
    while (p) {
      if (p === nextView) {
        log.info(`UIManager: View '${name}' is already in stack. Performing backTo.`)
        this.backTo(name)
        this._safeInvoke(nextView, 'onShow', data)
        return
      }
      p = p.parent
    }

    if (!nextView.hasInit) {
      if (typeof nextView.init !== 'function') {
        log.error(`UIManager: View '${name}' must have an init() function.`)
        return
      }

      let rootObj = null
      try {
        rootObj = nextView.init()
      } catch (e) {
        log.error(`UIManager: View '${name}'.init() throw error:`, e)
        return
      }

      nextView.root = rootObj
      if (!nextView.root) {
        log.error(`UIManager: View '${name}'.init() must return a valid Root UI object.`)
        return
      }

      nextView.hasInit = true
    }

    if (this._currentView) {
      if (nextView !== this._currentView) nextView.parent = this._currentView
      this._hideRoot(this._currentView)
      this._safeInvoke(this._currentView, 'onHide')
    }

    this._currentView = nextView

    this._showRoot(nextView)
    this._safeInvoke(nextView, 'onShow', data)
  },

  close: function (viewInstance, resultData) {
    if (viewInstance !== this._currentView) {
      log.error('UIManager: Trying to close a view that is not current.')
      return
    }

    this._hideRoot(viewInstance)
    this._safeInvoke(viewInstance, 'onHide')

    const parentView = viewInstance.parent
    if (parentView) {
      if (resultData !== undefined) {
        this._safeInvoke(parentView, 'onClose', viewInstance.id, resultData)
      }

      this._currentView = parentView
      this._showRoot(parentView)

      viewInstance.parent = null
    } else {
      this._currentView = null
    }
  },

  backTo: function (targetViewName, resultData) {
    if (!this._currentView) return

    let p = this._currentView.parent
    let targetView = null

    while (p) {
      if (p.id === targetViewName) {
        targetView = p
        break
      }
      p = p.parent
    }

    if (!targetView) {
      log.error(`UIManager: backTo failed. View '${targetViewName}' not found in history.`)
      return
    }

    this._hideRoot(this._currentView)
    this._safeInvoke(this._currentView, 'onHide')

    const sourceViewId = this._currentView.id

    let curr = this._currentView
    while (curr && curr !== targetView) {
      const tempParent = curr.parent
      curr.parent = null
      curr = tempParent
    }

    this._currentView = targetView

    if (resultData !== undefined) {
      this._safeInvoke(targetView, 'onClose', sourceViewId, resultData)
    }

    this._showRoot(targetView)
  },

  font: function (size, style) {
    const arr = fonts.filter(v => v.size == size && v.style == style)
    if (arr.length > 0) return arr[0].font

    size = size || 14
    style = style || dxui.Utils.FONT_STYLE.NORMAL
    const font = dxui.Font.build(ttf, size, style)
    fonts.push({ size, style, font })
    return font
  }
}

export default UIManager
