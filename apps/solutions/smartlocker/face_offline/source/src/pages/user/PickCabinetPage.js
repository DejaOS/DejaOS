import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import std from "../../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";
import LockerDB from "../../lock/LockerDB.js";

const GRID_COLS = 3;

const PickCabinetPage = {
  id: "userPickCabinet",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xebebeb);

    this._userId = "";
    this._picPath = "";
    this._isTemp = true;
    this._cabinets = [];
    this._countdown = 30;
    this._timer = null;

    this._initView();
    this._bindEvents();

    return this.root;
  },

  _initView: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    const titleFontSize = Math.round(H * 0.038);
    const subFontSize = Math.round(H * 0.024);
    const gridBtnFontSize = Math.round(H * 0.032);
    const gridTimeFontSize = Math.round(H * 0.018);
    const bottomBtnFontSize = Math.round(H * 0.028);

    // 0. Cancel button: top right
    const cancelFontSize = Math.round(H * 0.024);
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
    this.btnCancel.radius(0);
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

    this.btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
    this.btnCancelLabel.text("Cancel");
    this.btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.textColor(0x888888);
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // 1. Title
    this.titleLabel = dxui.Label.build(this.id + "_title", this.root);
    this.titleLabel.text("Select cabinet to open");
    this.titleLabel.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.titleLabel.textColor(0x333333);
    this.titleLabel.setSize(Math.round(W * 0.85), Math.round(H * 0.06));
    this.titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.06));

    // 2. Subtitle
    this.subLabel = dxui.Label.build(this.id + "_sub", this.root);
    this.subLabel.text("You have 0 cabinet(s)");
    this.subLabel.textFont(UIManager.font(subFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.subLabel.textColor(0x888888);
    this.subLabel.setSize(Math.round(W * 0.85), Math.round(H * 0.04));
    this.subLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.13));

    // 3. Cabinet button grid (scrollable)
    const gridTop = Math.round(H * 0.20);
    const gridAreaH = Math.round(H * 0.58);
    const gridAreaW = Math.round(W * 0.85);

    this.gridArea = dxui.View.build(this.id + "_grid", this.root);
    this.gridArea.setSize(gridAreaW, gridAreaH);
    this.gridArea.align(dxui.Utils.ALIGN.TOP_MID, 0, gridTop);
    this.gridArea.bgOpa(0);
    this.gridArea.radius(0);
    this.gridArea.borderWidth(0);
    this.gridArea.padAll(0);
    this.gridArea.scroll(true);

    const gap = Math.round(gridAreaW * 0.04);
    const btnSize = Math.round((gridAreaW - gap * (GRID_COLS + 1)) / GRID_COLS);

    this._gridBtns = [];
    for (let i = 0; i < 30; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = gap + col * (btnSize + gap);
      const y = gap + row * (btnSize + gap);

      const btn = dxui.Button.build(this.id + "_gb_" + i, this.gridArea);
      btn.setSize(btnSize, btnSize);
      btn.setPos(x, y);
      btn.radius(Math.round(btnSize * 0.12));
      btn.bgColor(0xffa31f);
      btn.borderWidth(0);

      const label = dxui.Label.build(this.id + "_gl_" + i, btn);
      label.text(" ");
      label.textFont(UIManager.font(gridBtnFontSize, dxui.Utils.FONT_STYLE.BOLD));
      label.textColor(0xffffff);
      label.align(dxui.Utils.ALIGN.CENTER, 0, -Math.round(btnSize * 0.1));

      const timeLabel = dxui.Label.build(this.id + "_gt_" + i, btn);
      timeLabel.text("");
      timeLabel.textFont(UIManager.font(gridTimeFontSize, dxui.Utils.FONT_STYLE.NORMAL));
      timeLabel.textColor(0xffffffcc);
      timeLabel.align(dxui.Utils.ALIGN.CENTER, 0, Math.round(btnSize * 0.18));

      btn.hide();

      this._gridBtns.push({ btn, label, timeLabel, cabinetNo: 0 });
    }

    // 4. Bottom error label
    const errFontSize = Math.round(H * 0.02);
    this.errLabel = dxui.Label.build(this.id + "_err", this.root);
    this.errLabel.text(" ");
    this.errLabel.textFont(UIManager.font(errFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.errLabel.textColor(0xcc3333);
    this.errLabel.setSize(Math.round(W * 0.85), Math.round(H * 0.035));
    this.errLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.115));

    // 5. Bottom button
    const bottomBtnW = Math.round(W * 0.6);
    const bottomBtnH = Math.round(H * 0.07);

    this.btnAll = dxui.Button.build(this.id + "_all", this.root);
    this.btnAll.setSize(bottomBtnW, bottomBtnH);
    this.btnAll.radius(Math.round(bottomBtnH / 2));
    this.btnAll.bgColor(0xffa31f);
    this.btnAll.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.04));

    this.btnAllLabel = dxui.Label.build(this.id + "_all_label", this.btnAll);
    this.btnAllLabel.text("Open all cabinets");
    this.btnAllLabel.textFont(UIManager.font(bottomBtnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnAllLabel.textColor(0xffffff);
    this.btnAllLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
  },

  _bindEvents: function () {
    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this._clearCountdown();
      this.backTo("home");
    });

    for (let i = 0; i < this._gridBtns.length; i++) {
      const item = this._gridBtns[i];
      item.btn.on(dxui.Utils.EVENT.CLICK, () => {
        if (!item.cabinetNo) return;
        this._handlePickOne(item.cabinetNo);
      });
    }

    this.btnAll.on(dxui.Utils.EVENT.CLICK, () => {
      this._handlePickAll();
    });
  },

  _formatHM: function (ts) {
    const n = Number(ts);
    if (!n) return "";
    const d = new Date(n);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  },

  _loadCabinets: function () {
    try {
      this._cabinets = LockerDB.getCabinetsByUserId(this._userId);
    } catch (e) {
      log.error("PickCabinetPage: Query cabinets failed", e);
      this._cabinets = [];
    }

    const count = this._cabinets.length;
    this.subLabel.text(`You have ${count} cabinet(s). Tap to open.`);

    for (let i = 0; i < this._gridBtns.length; i++) {
      const item = this._gridBtns[i];
      if (i < count) {
        const cab = this._cabinets[i];
        item.cabinetNo = Number(cab.cabinet_no) || 0;
        item.label.text(String(item.cabinetNo));
        item.timeLabel.text(this._formatHM(cab.store_time));
        item.btn.show();
      } else {
        item.cabinetNo = 0;
        item.label.text("");
        item.timeLabel.text("");
        item.btn.hide();
      }
    }
  },

  _reasonToText: function (reason) {
    switch (reason) {
      case "INVALID_NO":
      case "INVALID_PARAM":
        return "Invalid cabinet no.";
      case "NO_CONFIG":
        return "Cabinet groups not configured";
      case "OUT_OF_RANGE":
        return "Cabinet no. out of range";
      case "NO_ITEM":
        return "No item in cabinet";
      default:
        return "Operation failed";
    }
  },

  _showErr: function (msg) {
    this.errLabel.text(msg);
  },

  _clearErr: function () {
    this.errLabel.text("");
  },

  _pickOneCabinet: function (cabinetNo) {
    const pickType = this._isTemp ? 0 : 1;
    try {
      const result = LockerService.handlePickupByFace(cabinetNo, this._userId, pickType);
      if (!result || !result.ok) {
        return this._reasonToText(result && result.reason);
      }
      return null;
    } catch (e) {
      log.error(`PickCabinetPage: Operate cabinet ${cabinetNo} failed`, e);
      return "System error";
    }
  },

  _handlePickOne: function (cabinetNo) {
    this._clearErr();
    this._clearCountdown();
    log.info(`PickCabinetPage: pickup cabinet=${cabinetNo}, isTemp=${this._isTemp}`);

    const err = this._pickOneCabinet(cabinetNo);
    if (err) {
      this._showErr(`Cabinet ${cabinetNo}: ${err}`);
      this._startCountdown();
      return;
    }

    const action = this._isTemp ? "Please close the door after use." : "Cabinet cleared.";
    TipView.showSuccess(
      `Cabinet ${cabinetNo} opened. ${action}`,
      {
        duration: 5000,
        countdown: true,
        onFinish: () => {
          this.backTo("home", { refreshRemain: true });
        },
      }
    );
  },

  _handlePickAll: function () {
    this._clearErr();
    this._clearCountdown();
    if (!this._cabinets.length) {
      this._showErr("No cabinet to operate");
      return;
    }

    log.info(`PickCabinetPage: Batch operate all, isTemp=${this._isTemp}, count=${this._cabinets.length}`);

    const errors = [];
    for (let i = 0; i < this._cabinets.length; i++) {
      const no = Number(this._cabinets[i].cabinet_no) || 0;
      if (!no) continue;

      const err = this._pickOneCabinet(no);
      if (err) {
        errors.push(`Cabinet ${no}: ${err}`);
      }
    }

    if (errors.length) {
      this._showErr(errors.join("  "));
    }

    const action = this._isTemp ? "Temp use" : "Clear use";
    TipView.showSuccess(
      `All cabinets ${action}. Doors open, please take items.`,
      {
        duration: 5000,
        countdown: true,
        onFinish: () => {
          this.backTo("home", { refreshRemain: true });
        },
      }
    );
  },

  _startCountdown: function () {
    this._clearCountdown();
    this._countdown = 30;

    this._timer = std.setInterval(() => {
      this._countdown -= 1;
      if (this._countdown <= 0) {
        this._clearCountdown();
        this.backTo("home");
      }
    }, 1000);
  },

  _clearCountdown: function () {
    if (this._timer) {
      std.clearInterval(this._timer);
      this._timer = null;
    }
  },

  onShow: function (data) {
    if (data) {
      this._userId = data.userId || "";
      this._picPath = data.picPath || "";
      this._isTemp = data.isTemp !== false;
    }

    this._clearErr();

    this.btnAllLabel.text(
      this._isTemp ? "Open all cabinets" : "Clear all cabinets"
    );

    this._loadCabinets();

    if (!this._cabinets.length) {
      TipView.showError("You have no cabinet in use", {
        duration: 3000,
        countdown: true,
        onFinish: () => {
          this.backTo("home");
        },
      });
      return;
    }

    this._startCountdown();
  },

  onHide: function () {
    this._clearCountdown();
  },
};

export default PickCabinetPage;
