import log from "./mylogger.js";
import dxui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";

const ttf = "/app/code/resource/font/font.ttf";
const fontCache = [];

const UIManager = {
  _viewMap: {},
  _currentView: null,
  _rootScreen: null,

  init: function () {
    if (this._rootScreen) return;

    this._rootScreen = dxui.View.build(std.genRandomStr(10), dxui.Utils.LAYER.MAIN);
    this._rootScreen.radius(0);
    this._rootScreen.borderWidth(0);
    this._rootScreen.padAll(0);
    this._rootScreen.scroll(false);
    dxui.loadMain(this._rootScreen);
  },

  getRoot: function () {
    if (!this._rootScreen) this.init();
    return this._rootScreen;
  },

  register: function (name, viewObj) {
    this._viewMap[name] = viewObj;
    viewObj.id = name;
    viewObj.hasInit = false;
    viewObj.root = null;
  },

  _safeInvoke: function (view, fnName, ...args) {
    if (!view) return;
    const fn = view[fnName];
    if (typeof fn !== "function") return;
    try {
      fn.apply(view, args);
    } catch (e) {
      log.error(`UIManager: ${view.id}.${fnName} failed`, e);
    }
  },

  open: function (name, data) {
    if (!this._rootScreen) this.init();
    const view = this._viewMap[name];
    if (!view) {
      log.error(`UIManager: view '${name}' not registered`);
      return;
    }

    if (!view.hasInit) {
      if (typeof view.init !== "function") {
        log.error(`UIManager: view '${name}' has no init()`);
        return;
      }
      view.root = view.init();
      if (!view.root) {
        log.error(`UIManager: view '${name}' init() must return root`);
        return;
      }
      view.hasInit = true;
    }

    if (this._currentView && this._currentView.root && typeof this._currentView.root.hide === "function") {
      this._currentView.root.hide();
      this._safeInvoke(this._currentView, "onHide");
    }

    this._currentView = view;
    if (view.root && typeof view.root.show === "function") view.root.show();
    this._safeInvoke(view, "onShow", data);
  },

  font: function (size, style) {
    const s = size || 16;
    const st = style || dxui.Utils.FONT_STYLE.NORMAL;
    const matched = fontCache.find((v) => v.size === s && v.style === st);
    if (matched) return matched.font;
    const font = dxui.Font.build(ttf, s, st);
    fontCache.push({ size: s, style: st, font });
    return font;
  },
};

export default UIManager;

