import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";

const MAX_CHOICES = 6;

/**
 * 用户关联多个柜格时选择本次操作的柜子（专属/临时，支持 2～6 个按钮）。
 */
const FixedOrTempChooseView = {
  _inited: false,
  _root: null,
  _card: null,
  _desc: null,
  _choiceBtns: [],
  _choiceLabels: [],
  _onSelect: null,
  _onCancel: null,
  _currentItems: null,

  init: function () {
    if (this._inited) return;
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    this._root = dxui.View.build("fixed_temp_choose_root", dxui.Utils.LAYER.TOP);
    this._root.setSize(W, H);
    this._root.bgColor(0x000000);
    this._root.bgOpa(120);
    this._root.radius(0);
    this._root.borderWidth(0);
    this._root.padAll(0);
    this._root.scroll(false);

    const cardW = Math.round(W * 0.78);
    const cardH = Math.round(H * 0.52);
    this._card = dxui.View.build("fixed_temp_choose_card", this._root);
    this._card.setSize(cardW, cardH);
    this._card.radius(Math.round(W * 0.03));
    this._card.borderWidth(0);
    this._card.bgColor(0xffffff);
    this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._card.scroll(false);

    const titleFontSize = Math.round(H * 0.034);
    const descFontSize = Math.round(H * 0.026);
    const btnFontSize = Math.round(H * 0.026);
    const btnH = Math.round(H * 0.062);
    const btnRadius = Math.round(btnH / 2);

    const title = dxui.Label.build("fixed_temp_choose_title", this._card);
    title.text("请选择本次使用的柜子");
    title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
    title.textColor(0x333333);
    title.setSize(Math.round(cardW * 0.9), Math.round(H * 0.05));
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.06));

    this._desc = dxui.Label.build("fixed_temp_choose_desc", this._card);
    this._desc.text("");
    this._desc.textFont(UIManager.font(descFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this._desc.textColor(0x666666);
    this._desc.setSize(Math.round(cardW * 0.86), Math.round(cardH * 0.22));
    this._desc.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this._desc.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.14));

    const closeBtnSize = Math.round(H * 0.045);
    const closeFontSize = Math.round(H * 0.028);
    const btnClose = dxui.View.build("fixed_temp_choose_close", this._card);
    btnClose.setSize(closeBtnSize, closeBtnSize);
    btnClose.radius(0);
    btnClose.bgOpa(0);
    btnClose.borderWidth(0);
    btnClose.padAll(0);
    btnClose.scroll(false);
    btnClose.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(cardW * 0.03), Math.round(cardH * 0.03));
    const closeLabel = dxui.Label.build("fixed_temp_choose_close_l", btnClose);
    closeLabel.text("X");
    closeLabel.textFont(UIManager.font(closeFontSize, dxui.Utils.FONT_STYLE.BOLD));
    closeLabel.textColor(0x999999);
    closeLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    const btnWPair = Math.round(cardW * 0.38);
    const btnGap = Math.round(cardW * 0.06);
    this._btnWPair = btnWPair;
    this._btnGap = btnGap;
    this._btnH = btnH;
    this._btnRadius = btnRadius;
    this._btnFontSize = btnFontSize;
    this._cardW = cardW;
    this._cardH = cardH;

    for (let i = 0; i < MAX_CHOICES; i++) {
      const btn = dxui.Button.build(`fixed_temp_choose_btn_${i}`, this._card);
      btn.setSize(btnWPair, btnH);
      btn.radius(btnRadius);
      btn.bgColor(0xffa31f);
      btn.hide();
      const lbl = dxui.Label.build(`fixed_temp_choose_btn_l_${i}`, btn);
      lbl.text("");
      lbl.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
      lbl.textColor(0xffffff);
      lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      const idx = i;
      btn.on(dxui.Utils.EVENT.CLICK, () => {
        const items = this._currentItems;
        const item = items && items[idx];
        this.hide();
        if (item && typeof this._onSelect === "function") {
          this._onSelect(item, idx);
        }
      });
      this._choiceBtns.push(btn);
      this._choiceLabels.push(lbl);
    }

    btnClose.on(dxui.Utils.EVENT.CLICK, () => {
      this.hide();
      if (typeof this._onCancel === "function") this._onCancel();
    });

    this._root.hide();
    this._inited = true;
  },

  _layoutChoiceButtons: function (n) {
    const cardH = this._cardH;
    const cardW = this._cardW;
    const btnH = this._btnH;
    const btnWPair = this._btnWPair;
    const btnGap = this._btnGap;
    const bottomPad = Math.round(cardH * 0.08);
    const rowGap = Math.round(btnH * 0.35);

    if (n <= 2) {
      // 双按钮场景仍需为标题、说明和按钮分别留出空间。
      const cardH2 = Math.round(cardH * 0.68);
      const compactBottomPad = Math.round(cardH2 * 0.08);
      this._card.setSize(cardW, cardH2);
      for (let i = 0; i < n; i++) {
        const btn = this._choiceBtns[i];
        btn.setSize(btnWPair, btnH);
        const xOff = n === 1 ? 0 : i === 0 ? -Math.round(btnWPair / 2 + btnGap / 2) : Math.round(btnWPair / 2 + btnGap / 2);
        btn.align(dxui.Utils.ALIGN.BOTTOM_MID, xOff, -compactBottomPad);
        btn.show();
      }
      return;
    }

    const cardHn = Math.min(
      Math.round(cardH + (n - 2) * (btnH + rowGap)),
      Math.round(dxDriver.DISPLAY.HEIGHT * 0.72)
    );
    this._card.setSize(cardW, cardHn);
    const btnWFull = Math.round(cardW * 0.82);
    let yFromBottom = bottomPad;
    for (let j = n - 1; j >= 0; j--) {
      const btn = this._choiceBtns[j];
      btn.setSize(btnWFull, btnH);
      btn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -yFromBottom);
      btn.show();
      yFromBottom += btnH + rowGap;
    }
  },

  /**
   * @param {{
   *   items?: Array<{ label: string, kind: 'long'|'temp', cabinet?: object }>,
   *   fixedLabel?: string, tempLabel?: string,
   *   onSelect?: function(item, index), onFixed?: function, onTemp?: function, onCancel?: function
   * }} options
   */
  show: function (options) {
    if (!this._inited) this.init();
    options = options || {};

    let items = Array.isArray(options.items) ? options.items.slice() : null;
    if (!items || !items.length) {
      const fid = String(options.fixedLabel || options.fixedLockerId || "").trim();
      const tid = String(options.tempLabel || options.tempLockerId || "").trim();
      items = [];
      if (fid) items.push({ label: `专属柜「${fid}」`, kind: "long" });
      if (tid) items.push({ label: `临时柜「${tid}」`, kind: "temp" });
    }

    if (!items.length) return;

    for (let h = 0; h < MAX_CHOICES; h++) {
      this._choiceBtns[h].hide();
    }

    const n = Math.min(items.length, MAX_CHOICES);
    this._currentItems = items.slice(0, n);

    if (n === 2 && items[0].kind === "long" && items[1].kind === "temp") {
      this._desc.text(
        `您已绑定专属柜，同时又占用了临时柜。请选择本次要使用的柜子。`
      );
    } else {
      this._desc.text(`您当前关联了 ${n} 个柜子，请选择本次要操作的柜子。`);
    }

    for (let i = 0; i < n; i++) {
      this._choiceLabels[i].text(String(items[i].label || "").trim() || `柜子 ${i + 1}`);
    }
    this._layoutChoiceButtons(n);

    this._onCancel = options.onCancel || null;
    this._onSelect =
      options.onSelect ||
      ((item) => {
        if (item.kind === "long" && typeof options.onFixed === "function") options.onFixed();
        if (item.kind === "temp" && typeof options.onTemp === "function") options.onTemp();
      });

    this._root.show();
  },

  hide: function () {
    if (!this._inited) return;
    this._root.hide();
    this._currentItems = null;
  },
};

export default FixedOrTempChooseView;
