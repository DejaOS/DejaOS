import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";

/**
 * 取柜方式选择弹窗：
 * - 临时取物：仅开柜，不释放占用
 * - 归还柜格：开柜并释放占用
 */
const PickChooseView = {
  _inited: false,
  _root: null,
  _card: null,
  _onTemp: null,
  _onRelease: null,
  _onCancel: null,
  _descLabel: null,

  init: function () {
    if (this._inited) return;
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    this._root = dxui.View.build("pick_choose_root", dxui.Utils.LAYER.TOP);
    this._root.setSize(W, H);
    this._root.bgColor(0x000000);
    this._root.bgOpa(120);
    this._root.radius(0);
    this._root.borderWidth(0);
    this._root.padAll(0);
    this._root.scroll(false);

    const cardW = Math.round(W * 0.78);
    const cardH = Math.round(H * 0.40);
    this._card = dxui.View.build("pick_choose_card", this._root);
    this._card.setSize(cardW, cardH);
    this._card.radius(Math.round(W * 0.03));
    this._card.borderWidth(0);
    this._card.bgColor(0xffffff);
    this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._card.scroll(false);

    const titleFontSize = Math.round(H * 0.034);
    const descFontSize = Math.round(H * 0.022);
    const btnFontSize = Math.round(H * 0.028);
    const btnW = Math.round(cardW * 0.38);
    const btnH = Math.round(H * 0.068);
    const btnRadius = Math.round(btnH / 2);
    const btnGap = Math.round(cardW * 0.06);

    const title = dxui.Label.build("pick_choose_title", this._card);
    title.text("请选择取柜方式");
    title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
    title.textColor(0x333333);
    title.setSize(Math.round(cardW * 0.90), Math.round(H * 0.05));
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.12));

    this._descLabel = dxui.Label.build("pick_choose_desc", this._card);
    this._descLabel.text("临时取物：开门拿取物品，柜格继续占用 归还柜格：开门拿取物品，同时归还柜格。");
    this._descLabel.textFont(UIManager.font(descFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this._descLabel.textColor(0x999999);
    this._descLabel.setSize(Math.round(cardW * 0.86), Math.round(H * 0.12));
    this._descLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this._descLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.30));

    const closeBtnSize = Math.round(H * 0.045);
    const closeFontSize = Math.round(H * 0.028);
    const btnClose = dxui.View.build("pick_choose_close", this._card);
    btnClose.setSize(closeBtnSize, closeBtnSize);
    btnClose.radius(0);
    btnClose.bgOpa(0);
    btnClose.borderWidth(0);
    btnClose.padAll(0);
    btnClose.scroll(false);
    btnClose.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(cardW * 0.03), Math.round(cardH * 0.04));
    const closeLabel = dxui.Label.build("pick_choose_close_label", btnClose);
    closeLabel.text("X");
    closeLabel.textFont(UIManager.font(closeFontSize, dxui.Utils.FONT_STYLE.BOLD));
    closeLabel.textColor(0x999999);
    closeLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    const btnTemp = dxui.Button.build("pick_choose_temp", this._card);
    btnTemp.setSize(btnW, btnH);
    btnTemp.radius(btnRadius);
    btnTemp.bgColor(0x4caf50);
    btnTemp.align(
      dxui.Utils.ALIGN.BOTTOM_MID,
      -Math.round(btnW / 2 + btnGap / 2),
      -Math.round(cardH * 0.12)
    );
    const tempLabel = dxui.Label.build("pick_choose_temp_label", btnTemp);
    tempLabel.text("临时取物");
    tempLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    tempLabel.textColor(0xffffff);
    tempLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    const btnRelease = dxui.Button.build("pick_choose_release", this._card);
    btnRelease.setSize(btnW, btnH);
    btnRelease.radius(btnRadius);
    btnRelease.bgColor(0xf44336);
    btnRelease.align(
      dxui.Utils.ALIGN.BOTTOM_MID,
      Math.round(btnW / 2 + btnGap / 2),
      -Math.round(cardH * 0.12)
    );
    const releaseLabel = dxui.Label.build("pick_choose_release_label", btnRelease);
    releaseLabel.text("归还柜格");
    releaseLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    releaseLabel.textColor(0xffffff);
    releaseLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    btnClose.on(dxui.Utils.EVENT.CLICK, () => {
      this.hide();
      if (typeof this._onCancel === "function") this._onCancel();
    });
    btnTemp.on(dxui.Utils.EVENT.CLICK, () => {
      this.hide();
      if (typeof this._onTemp === "function") this._onTemp();
    });
    btnRelease.on(dxui.Utils.EVENT.CLICK, () => {
      this.hide();
      if (typeof this._onRelease === "function") this._onRelease();
    });

    this._root.hide();
    this._inited = true;
  },

  show: function (options) {
    if (!this._inited) this.init();
    this._onTemp = (options && options.onTemp) || null;
    this._onRelease = (options && options.onRelease) || null;
    this._onCancel = (options && options.onCancel) || null;
    const baseDesc =
      "临时取物：开门拿取物品，柜格继续占用 归还柜格：开门拿取物品，同时归还柜格。";
    const extra = options && options.descExtra ? String(options.descExtra).trim() : "";
    if (this._descLabel) {
      this._descLabel.text(extra ? `${baseDesc}\n${extra}` : baseDesc);
    }
    this._root.show();
  },

  hide: function () {
    if (!this._inited) return;
    this._root.hide();
  },
};

export default PickChooseView;
