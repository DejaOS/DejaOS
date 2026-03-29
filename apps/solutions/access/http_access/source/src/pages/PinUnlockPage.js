// PinUnlockPage.js - PIN unlock
import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";
import { EVENT_DOOR_OPEN_REQUEST } from "../constants.js";
import NumericKeypad from "../components/NumericKeypad.js";
import TipView from "../components/TipView.js";
import AccessService from "../service/AccessService.js";

const PinUnlockPage = {
    _inited: false,
    _root: null,
    _keypad: null,

    init: function () {
        if (this._inited) return;

        const H = 320;
        const W = 480;

        this._root = dxui.View.build("pin_unlock_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(0x1A1A1A);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        this._keypad = NumericKeypad.build("pin_unlock_keypad", this._root, {
            placeholder: "Enter PIN",
            maxLength: 12,
            maskInput: true,
            timeout: 60,
            onBack: () => this.close(),
            onConfirm: (text) => this._verifyPassword(text),
            onTimeout: () => {
                log.info("[PinUnlockPage] timeout, closing");
                this.close();
            },
        });

        this._inited = true;
        log.info("[PinUnlockPage] initialized");
        return this._root;
    },

    _verifyPassword: function (password) {
        const granted = AccessService.verifyAndOpen("pin", password);
        if (granted) {
            bus.fire(EVENT_DOOR_OPEN_REQUEST, { source: "keypad" });
            this.close();
        } else {
            this._keypad.clearInput();
        }
    },

    onShow: function (data) {
        if (!this._inited) this.init();
        if (this._keypad) {
            this._keypad.clearInput();
            this._keypad.startCountdown();
        }
        log.info("[PinUnlockPage] shown");
    },

    onHide: function () {
        if (this._keypad) this._keypad.stopCountdown();
        log.info("[PinUnlockPage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[PinUnlockPage] closed from:", sourceViewId);
    },

    close: function () {
        if (this._keypad) this._keypad.stopCountdown();
        UIManager.backTo("home");
    }
};

export default PinUnlockPage;
