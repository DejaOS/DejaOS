import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";

const MASK_IMAGE_PATH =
  dxDriver.DRIVER && String(dxDriver.DRIVER.MODEL || "").toLowerCase() === "vf203"
    ? "/app/code/resource/image/mask_circle_vf203.png"
    : "/app/code/resource/image/mask_circle.png";

const FaceMaskView = {
  id: "face_mask_view",
  _visible: false,
  _timer: null,
  _onExit: null,

  init: function () {
    if (this.root) return this.root;

    this.root = dxui.View.build(this.id + "_root", dxui.Utils.LAYER.TOP);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.setPos(0, 0);
    this.root.bgOpa(0);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.scroll(false);
    this.root.hide();

    this.mask = dxui.Image.build(this.id + "_mask", this.root);
    this.mask.source(MASK_IMAGE_PATH);
    this.mask.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.mask.setPos(0, 0);

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("人脸识别");
    this.title.textFont(UIManager.font(44, dxui.Utils.FONT_STYLE.BOLD));
    this.title.textColor(0xffffff);
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, 64);

    this.hint = dxui.Label.build(this.id + "_hint", this.root);
    this.hint.text("请面向摄像头");
    this.hint.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.NORMAL));
    this.hint.textColor(0xffffff);
    this.hint.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -300);

    this.cancelBtn = dxui.View.build(this.id + "_cancel", this.root);
    this.cancelBtn.setSize(200, 80);
    this.cancelBtn.bgColor(0xcc3333);
    this.cancelBtn.radius(40);
    this.cancelBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -180);
    this.cancelBtn.borderWidth(0);
    this.cancelBtn.scroll(false);

    this.cancelLabel = dxui.Label.build(this.id + "_cancel_label", this.cancelBtn);
    this.cancelLabel.text("取消");
    this.cancelLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
    this.cancelLabel.textColor(0xffffff);
    this.cancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.cancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._onExit) this._onExit(true);
    });

    return this.root;
  },

  start: function (onExit, timeoutMs = 30000) {
    if (!this.root) this.init();
    this._onExit = onExit;
    this.show(timeoutMs);
  },

  show: function (timeoutMs = 30000) {
    if (!this.root) this.init();
    if (this._visible) return;
    this._visible = true;
    this.root.show();

    if (this._timer) {
      std.clearTimeout(this._timer);
      this._timer = null;
    }
    if (timeoutMs > 0) {
      this._timer = std.setTimeout(() => {
        if (this._onExit) this._onExit(true);
      }, timeoutMs);
    }
  },

  setHint: function (typeOrText, maybeText) {
    if (!this.hint) return;
    let type = "info";
    let text = "";
    if (maybeText === undefined) {
      text = typeOrText || "";
    } else {
      type = String(typeOrText || "info");
      text = maybeText || "";
    }

    let color = 0xffffff;
    if (type === "success") color = 0x39b54a;
    else if (type === "error") color = 0xcc3333;
    else if (type === "warn") color = 0xffa31f;

    this.hint.text(text);
    this.hint.textColor(color);
  },

  hide: function () {
    if (!this._visible) return;
    this._visible = false;
    if (this._timer) {
      std.clearTimeout(this._timer);
      this._timer = null;
    }
    if (this.root) this.root.hide();
  },
};

export default FaceMaskView;
