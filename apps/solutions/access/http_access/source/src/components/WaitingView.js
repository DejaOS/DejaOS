/**
 * WaitingView — dim overlay + spinner + caption
 */

import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";

const WaitingView = {
    _inited: false,
    _root: null,
    _cir1: null,
    _cir2: null,
    _mask1: null,
    _mask2: null,
    _label: null,
    _timer: null,
    _running: false,
    _angle1: 0,
    _angle2: 0,

    init: function () {
        if (this._inited) return;

        const W = 480;
        const H = 320;

        // Overlay
        this._root = dxui.View.build("wait_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(W, H);
        this._root.bgColor(0x000000);
        this._root.bgOpa(60);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Spinner box
        const animBox = dxui.View.build("wait_anim_box", this._root);
        animBox.setSize(100, 100);
        animBox.align(dxui.Utils.ALIGN.CENTER, 0, -20);
        animBox.bgOpa(0);
        animBox.borderWidth(0);
        animBox.padAll(0);
        animBox.scroll(false);

        // Outer ring
        this._cir1 = dxui.View.build("wait_cir1", animBox);
        this._cir1.setSize(80, 80);
        this._cir1.radius(40);
        this._cir1.bgColor(0xB1F5FF);
        this._cir1.borderWidth(0);
        this._cir1.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._cir1.scroll(false);

        this._mask1 = dxui.View.build("wait_mask1", this._cir1);
        this._mask1.setSize(74, 74);
        this._mask1.radius(37);
        this._mask1.bgColor(0x616990);
        this._mask1.borderWidth(0);
        this._mask1.align(dxui.Utils.ALIGN.CENTER, -3, -3);

        // Inner ring
        this._cir2 = dxui.View.build("wait_cir2", animBox);
        this._cir2.setSize(60, 60);
        this._cir2.radius(30);
        this._cir2.bgColor(0xE16E7A);
        this._cir2.borderWidth(0);
        this._cir2.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._cir2.scroll(false);

        this._mask2 = dxui.View.build("wait_mask2", this._cir2);
        this._mask2.setSize(54, 54);
        this._mask2.radius(27);
        this._mask2.bgColor(0x616990);
        this._mask2.borderWidth(0);
        this._mask2.align(dxui.Utils.ALIGN.CENTER, 2, 2);

        // Caption
        this._label = dxui.Label.build("wait_label", this._root);
        this._label.text(" ");
        this._label.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.BOLD));
        this._label.textColor(0xFFFFFF);
        this._label.setSize(W - 40, 30);
        this._label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._label.align(dxui.Utils.ALIGN.CENTER, 0, 50);

        // Hidden by default
        this._root.hide();
        this._inited = true;
    },

    _startAnim: function () {
        if (this._timer) {
            std.clearInterval(this._timer);
            this._timer = null;
        }
        this._running = true;
        this._angle1 = 0;
        this._angle2 = 360;

        const updateMaskPos = (mask, radius, angleDeg, invert) => {
            const rad = (angleDeg * Math.PI) / 180;
            let x = Math.cos(rad) * radius;
            let y = Math.sin(rad) * radius;
            if (invert) {
                x *= -1;
                y *= -1;
            }
            mask.setPos(Math.floor(x), Math.floor(y));
        };

        this._timer = std.setInterval(() => {
            if (!this._running) return;

            this._angle1 = (this._angle1 + 12) % 360;
            this._angle2 = (this._angle2 - 12 + 360) % 360;

            updateMaskPos(this._mask1, 3, this._angle1, true);
            updateMaskPos(this._mask2, 3, this._angle2, false);
        }, 33);
    },

    _stopAnim: function () {
        this._running = false;
        if (this._timer) {
            std.clearInterval(this._timer);
            this._timer = null;
        }
    },

    show: function (message) {
        if (!this._inited) this.init();
        this._label.text(message || "Please wait…");
        this._root.show();
        this._startAnim();
    },

    hide: function () {
        this._stopAnim();
        if (!this._inited) return;
        this._root.hide();
    },
};

export default WaitingView;
