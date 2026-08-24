import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";

const WaitingView = {
  _inited: false,
  _root: null,
  _label: null,
  _cir1: null,
  _cir2: null,
  _mask1: null,
  _mask2: null,
  _timer: null,
  _angle1: 0,
  _angle2: 0,
  _running: false,
  _baseMessage: "",

  init: function () {
    if (this._inited) return;

    const screenW = dxDriver.DISPLAY.WIDTH;
    const screenH = dxDriver.DISPLAY.HEIGHT;

    this._root = dxui.View.build("wait_root", dxui.Utils.LAYER.TOP);
    this._root.setSize(screenW, screenH);
    this._root.bgColor(0x000000);
    this._root.bgOpa(60);
    this._root.radius(0);
    this._root.borderWidth(0);
    this._root.padAll(0);
    this._root.scroll(false);

    const animBox = dxui.View.build("wait_anim_box", this._root);
    animBox.setSize(180, 180);
    animBox.align(dxui.Utils.ALIGN.CENTER, 0, -20);
    animBox.bgOpa(0);
    animBox.borderWidth(0);
    animBox.padAll(0);
    animBox.scroll(false);

    this._cir1 = dxui.View.build("wait_cir1", animBox);
    this._cir1.setSize(144, 144);
    this._cir1.radius(72);
    this._cir1.bgColor(0xb1f5ff);
    this._cir1.borderWidth(0);
    this._cir1.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._cir1.scroll(false);

    this._mask1 = dxui.View.build("wait_mask1", this._cir1);
    this._mask1.setSize(134, 134);
    this._mask1.radius(67);
    this._mask1.bgColor(0x616990);
    this._mask1.borderWidth(0);
    this._mask1.align(dxui.Utils.ALIGN.CENTER, -5, -5);

    this._cir2 = dxui.View.build("wait_cir2", animBox);
    this._cir2.setSize(114, 114);
    this._cir2.radius(57);
    this._cir2.bgColor(0xe16e7a);
    this._cir2.borderWidth(0);
    this._cir2.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._cir2.scroll(false);

    this._mask2 = dxui.View.build("wait_mask2", this._cir2);
    this._mask2.setSize(104, 104);
    this._mask2.radius(52);
    this._mask2.bgColor(0x616990);
    this._mask2.borderWidth(0);
    this._mask2.align(dxui.Utils.ALIGN.CENTER, 3, 3);

    this._label = dxui.Label.build("wait_label", this._root);
    this._label.text(" ");
    this._label.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD));
    this._label.textColor(0xffffff);
    this._label.setSize(360, 60);
    this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this._label.align(dxui.Utils.ALIGN.CENTER, 0, 120);

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

      updateMaskPos(this._mask1, 5, this._angle1, true);
      updateMaskPos(this._mask2, 5, this._angle2, false);
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
    this._baseMessage = message || "请稍候...";
    this._label.text(this._baseMessage);
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
