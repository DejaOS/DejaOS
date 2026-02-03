// KeyboardInputPage.js - Custom keyboard: top Textarea, 4-row keys, Shift cycles lower/upper/symbols
import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import UIManager from "../UIManager.js";
import { COLORS } from "../constants.js";

// mode: 0=lower, 1=upper, 2=digits+symbols. QWERTY 10 cols; row4 = Shift Del Space Done
function getMap(mode) {
    if (mode === 0) {
        return ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "\n", "a", "s", "d", "f", "g", "h", "j", "k", "l", "Del", "\n", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "\n", "Shift", "Del", " ", "Done", ""];
    }
    if (mode === 1) {
        return ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\n", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Del", "\n", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "\n", "Shift", "Del", " ", "Done", ""];
    }
    return [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "\n",
        ".", "@", "-", "_", "/", "\\", "[", "]", "{", "}", "\n",
        ",", "'", "\"", ";", ":", "=", "+", "?", "#", "&", "\n",
        "Shift", "Del", " ", "Done", ""
    ];
}

const KeyboardInputPage = {
    _inited: false,
    _root: null,
    _inputArea: null,
    _keyboard: null,
    _field: null,
    _isPassword: false,
    _shiftMode: 0,

    init: function () {
        if (this._inited) return;

        const screenW = dxDriver.DISPLAY.WIDTH;
        const screenH = dxDriver.DISPLAY.HEIGHT;

        this._root = dxui.View.build("keyboard_input_root", UIManager.getRoot());
        this._root.setSize(screenW, screenH);
        this._root.bgColor(COLORS.dark);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        this._inputArea = dxui.Textarea.build("keyboard_input_area", this._root);
        this._inputArea.text("");
        this._inputArea.setOneLine(true);
        this._inputArea.setCursorClickPos(true);
        this._inputArea.scroll(false);
        this._inputArea.textFont(UIManager.font(18));
        this._inputArea.textColor(COLORS.dark);
        this._inputArea.bgColor(COLORS.light);
        this._inputArea.radius(6);
        this._inputArea.padAll(8);
        this._inputArea.setSize(screenW - 24, 44);
        this._inputArea.align(dxui.Utils.ALIGN.TOP_MID, 0, 12);

        const self = this;
        function keyboardValueChanged() {
            self._onKeyPress();
        }
        this._keyboard = dxui.Buttons.build("keyboard_buttons", this._root);
        this._keyboard.setSize(screenW - 20, screenH - 80);
        this._keyboard.align(dxui.Utils.ALIGN.TOP_MID, 0, 64);
        this._keyboard.textFont(UIManager.font(14), dxui.Utils.STYLE_PART.ITEMS);
        this._keyboard.textColor(COLORS.white, dxui.Utils.STYLE_PART.ITEMS);
        this._keyboard.bgColor(COLORS.secondary, dxui.Utils.STYLE_PART.ITEMS);
        this._keyboard.radius(6);
        this._keyboard.padAll(4);
        this._keyboard.on(dxui.Utils.EVENT.VALUE_CHANGED, keyboardValueChanged);

        this._inited = true;
        this._shiftMode = 0;
        this._loadKeyboardMap();
        log.info("[KeyboardInputPage] Initialized");
        return this._root;
    },

    _onKeyPress: function () {
        const btn = this._keyboard.clickedButton();
        if (!btn || btn.text == null) return;

        const raw = btn.text;
        const t = raw.trim();
        if (t === "Del") {
            this._inputArea.lvTextareaDelChar();
            this._inputArea.send(dxui.Utils.EVENT.FOCUSED);
            return;
        }
        if (t === "Done") {
            const value = (this._inputArea.text() || "").trim();
            this.close({ field: this._field, value: value });
            return;
        }
        if (t === "Shift") {
            this._shiftMode = (this._shiftMode + 1) % 3;
            this._loadKeyboardMap();
            return;
        }
        if (raw === " ") {
            this._inputArea.lvTextareaAddText(" ");
            this._inputArea.send(dxui.Utils.EVENT.FOCUSED);
            return;
        }
        if (t.length >= 1 && t !== "Shift" && t !== "Del" && t !== "Done") {
            this._inputArea.lvTextareaAddText(t);
            this._inputArea.send(dxui.Utils.EVENT.FOCUSED);
        }
    },

    onShow: function (data) {
        if (!this._inited) this.init();

        this._shiftMode = 0;
        this._loadKeyboardMap();

        if (data) {
            this._field = data.field || "ssid";
            this._isPassword = this._field === "password";
            const initial = (data.initialValue || "").toString();
            this._inputArea.text(initial);
            this._inputArea.setPasswordMode(this._isPassword);
        } else {
            this._inputArea.text("");
        }

        std.setTimeout(() => {
            this._inputArea.focus(true);
            this._inputArea.send(dxui.Utils.EVENT.FOCUSED);
        }, 50);

        log.info("[KeyboardInputPage] Shown", this._field);
    },

    onHide: function () {
        log.info("[KeyboardInputPage] Hidden");
    },

    onClose: function (sourceViewId, resultData) { },

    _loadKeyboardMap: function () {
        if (!this._keyboard) return;
        this._keyboard.data(getMap(this._shiftMode));
    }
};

export default KeyboardInputPage;
