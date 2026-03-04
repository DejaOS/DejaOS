import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import dxOs from "../../../dxmodules/dxOs.js";
import std from "../../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import FaceMaskView from "../FaceMaskView.js";
import LockerService from "../../lock/LockerService.js";
import ntp from "../../../dxmodules/dxNtp.js";
import bus from "../../../dxmodules/dxEventBus.js";

// System settings: system info + admin face registration + password change + time change; password and time share bottom keypad
const AdminPasswordPage = {
  id: "adminPasswordSettings",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xebebeb);

    this.data = {
      pwd1: "",
      pwd2: "",
      step: 1,
      year: "",
      month: "",
      day: "",
      hour: "",
      minute: "",
      second: "",
      maxCab: "", // User max cabinet count 1-9, single digit
      keypadMode: "pwd", // "pwd" | "time" | "maxCab"
      activeField: 0,
    };

    this._initView();

    return this.root;
  },

  _initView: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    const titleFontSize = Math.round(H * 0.032);
    const cancelFontSize = Math.round(H * 0.024);
    const sectionFontSize = Math.round(H * 0.022);
    const bodyFontSize = Math.round(H * 0.02);
    const keypadH = Math.round(H / 3);
    const btnH = Math.round(H * 0.05);
    const btnRadius = Math.round(btnH / 2);
    const fieldH = Math.round(H * 0.045);

    // ---------- 1. Title + Cancel ----------
    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("System Settings");
    this.title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.title.textColor(0x333333);
    this.title.setSize(Math.round(W * 0.6), Math.round(H * 0.05));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.02));

    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
    this.btnCancel.radius(0);
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

    const btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
    btnCancelLabel.text("Cancel");
    btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    btnCancelLabel.textColor(0x888888);
    btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.backTo("adminHome"));

    let curY = Math.round(H * 0.08);

    // ---------- 2. System Info ----------
    this.infoTitle = dxui.Label.build(this.id + "_info_title", this.root);
    this.infoTitle.text("System Info");
    this.infoTitle.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.infoTitle.textColor(0x333333);
    this.infoTitle.setSize(Math.round(W * 0.9), fieldH);
    this.infoTitle.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    this.snLabel = dxui.Label.build(this.id + "_sn", this.root);
    this.snLabel.text("Device SN: -");
    this.snLabel.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.snLabel.textColor(0x666666);
    this.snLabel.setSize(Math.round(W * 0.9), fieldH);
    this.snLabel.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    this.versionLabel = dxui.Label.build(this.id + "_version", this.root);
    this.versionLabel.text("Version: vf203_v12_cubby_2.0.0");
    this.versionLabel.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.versionLabel.textColor(0x666666);
    this.versionLabel.setSize(Math.round(W * 0.9), fieldH);
    this.versionLabel.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    this.memLabel = dxui.Label.build(this.id + "_mem", this.root);
    this.memLabel.text("Free Memory: -");
    this.memLabel.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.memLabel.textColor(0x666666);
    this.memLabel.setSize(Math.round(W * 0.9), fieldH);
    this.memLabel.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH + Math.round(H * 0.01);

    // ---------- 3. Admin Face Registration ----------
    this.faceTitle = dxui.Label.build(this.id + "_face_title", this.root);
    this.faceTitle.text("Admin Face Registration");
    this.faceTitle.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.faceTitle.textColor(0x333333);
    this.faceTitle.setSize(Math.round(W * 0.9), fieldH);
    this.faceTitle.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    this.btnFaceReg = dxui.Button.build(this.id + "_face_reg", this.root);
    this.btnFaceReg.setSize(Math.round(W * 0.4), btnH);
    this.btnFaceReg.radius(btnRadius);
    this.btnFaceReg.bgColor(0xffa31f);
    this.btnFaceReg.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);

    const btnFaceRegLabel = dxui.Label.build(this.id + "_face_reg_label", this.btnFaceReg);
    btnFaceRegLabel.text("Face Register");
    btnFaceRegLabel.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    btnFaceRegLabel.textColor(0xffffff);
    btnFaceRegLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnFaceReg.on(dxui.Utils.EVENT.CLICK, () => this._startAdminFaceRegister());
    curY += btnH + Math.round(H * 0.01);

    // ---------- 4. Password Change (shares keypad with time, selected state bg) ----------
    this.pwdTitle = dxui.Label.build(this.id + "_pwd_title", this.root);
    this.pwdTitle.text("Password Change");
    this.pwdTitle.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.pwdTitle.textColor(0x333333);
    this.pwdTitle.setSize(Math.round(W * 0.9), fieldH);
    this.pwdTitle.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    const pwdFieldW = Math.round(W * 0.5);
    this.pwdField = dxui.View.build(this.id + "_pwd_field", this.root);
    this.pwdField.setSize(pwdFieldW, fieldH);
    this.pwdField.radius(Math.round(fieldH * 0.2));
    this.pwdField.borderWidth(0);
    this.pwdField.bgColor(0xffffff);
    this.pwdField.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    this.pwdField.scroll(false);

    this.pwdFieldLabel = dxui.Label.build(this.id + "_pwd_field_label", this.pwdField);
    this.pwdFieldLabel.text("Please set 6-digit password");
    this.pwdFieldLabel.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.pwdFieldLabel.textColor(0x999999);
    this.pwdFieldLabel.align(dxui.Utils.ALIGN.LEFT_MID, Math.round(pwdFieldW * 0.04), 0);

    this.pwdField.on(dxui.Utils.EVENT.CLICK, () => {
      this.data.keypadMode = "pwd";
      this._updateKeypadModeStyle();
    });
    curY += fieldH + Math.round(H * 0.01);

    // ---------- 5. Time Change (6 fields) ----------
    this.timeTitle = dxui.Label.build(this.id + "_time_title", this.root);
    this.timeTitle.text("Time Change");
    this.timeTitle.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.timeTitle.textColor(0x333333);
    this.timeTitle.setSize(Math.round(W * 0.9), fieldH);
    this.timeTitle.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    const timeFieldW = Math.round(W * 0.1);
    const timeGap = Math.round(W * 0.01);
    const timeStartX = Math.round(W * 0.05);
    this._timeFields = [];
    const keys = ["year", "month", "day", "hour", "minute", "second"];
    const placeholders = ["Year", "Month", "Day", "Hour", "Min", "Sec"];
    for (let i = 0; i < 6; i++) {
      const x = timeStartX + i * (timeFieldW + timeGap);
      const field = dxui.View.build(this.id + "_time_" + keys[i], this.root);
      field.setSize(timeFieldW, fieldH);
      field.radius(Math.round(fieldH * 0.2));
      field.borderWidth(0);
      field.bgColor(0xffffff);
      field.setPos(x, curY);
      field.scroll(false);

      const label = dxui.Label.build(this.id + "_time_" + keys[i] + "_label", field);
      label.text(placeholders[i]);
      label.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
      label.textColor(0x333333);
      label.align(dxui.Utils.ALIGN.CENTER, 0, 0);

      const idx = i;
      field.on(dxui.Utils.EVENT.CLICK, () => {
        this.data.keypadMode = "time";
        this.data.activeField = idx;
        this._updateKeypadModeStyle();
      });
      this._timeFields.push({ key: keys[i], field, label, placeholder: placeholders[i] });
    }
    curY += fieldH + Math.round(H * 0.015);

    // ---------- 5.1 User Max Cabinet Count (1-9, shared keypad) ----------
    this.maxCabTitle = dxui.Label.build(this.id + "_maxcab_title", this.root);
    this.maxCabTitle.text("User Max Cabinets (1-9)");
    this.maxCabTitle.textFont(UIManager.font(sectionFontSize, dxui.Utils.FONT_STYLE.BOLD));
    this.maxCabTitle.textColor(0x333333);
    this.maxCabTitle.setSize(Math.round(W * 0.9), fieldH);
    this.maxCabTitle.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    curY += fieldH;

    const maxCabFieldW = Math.round(W * 0.15);
    this.maxCabField = dxui.View.build(this.id + "_maxcab_field", this.root);
    this.maxCabField.setSize(maxCabFieldW, fieldH);
    this.maxCabField.radius(Math.round(fieldH * 0.2));
    this.maxCabField.borderWidth(0);
    this.maxCabField.bgColor(0xffffff);
    this.maxCabField.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), curY);
    this.maxCabField.scroll(false);

    this.maxCabFieldLabel = dxui.Label.build(this.id + "_maxcab_field_label", this.maxCabField);
    this.maxCabFieldLabel.text("");
    this.maxCabFieldLabel.textFont(UIManager.font(bodyFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.maxCabFieldLabel.textColor(0x999999);
    this.maxCabFieldLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.maxCabField.on(dxui.Utils.EVENT.CLICK, () => {
      this.data.keypadMode = "maxCab";
      this._updateKeypadModeStyle();
    });
    curY += fieldH + Math.round(H * 0.01);

    // ---------- 6. Bottom numeric keypad ----------
    this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
      onDigit: (d) => this._onDigit(d),
      onDelete: () => this._onDelete(),
      onConfirm: () => this._onConfirm(),
      onExit: () => UIManager.backTo("adminHome"),
    });

    this._updateKeypadModeStyle();
    this._refreshPwdField();
    this._refreshTimeFields();
    this._refreshMaxCabField();
  },

  _updateKeypadModeStyle: function () {
    const mode = this.data.keypadMode;
    const isPwd = mode === "pwd";
    const isMaxCab = mode === "maxCab";
    if (this.pwdField) {
      this.pwdField.bgColor(isPwd ? 0x3cbfa5 : 0xffffff);
      this.pwdFieldLabel.textColor(isPwd ? 0xffffff : (this.data.pwd1 || this.data.pwd2 ? 0x333333 : 0x999999));
    }
    if (this._timeFields) {
      for (let i = 0; i < this._timeFields.length; i++) {
        const f = this._timeFields[i];
        const active = mode === "time" && this.data.activeField === i;
        f.field.bgColor(active ? 0x3cbfa5 : 0xffffff);
        f.label.textColor(active ? 0xffffff : 0x333333);
      }
    }
    if (this.maxCabField) {
      this.maxCabField.bgColor(isMaxCab ? 0x3cbfa5 : 0xffffff);
      this.maxCabFieldLabel.textColor(isMaxCab ? 0xffffff : (this.data.maxCab ? 0x333333 : 0x999999));
    }
  },

  _refreshPwdField: function () {
    if (this.data.step === 1) {
      const len = this.data.pwd1.length;
      this.pwdFieldLabel.text(len > 0 ? "*".repeat(len) : "Please set 6-digit password");
    } else {
      const len = this.data.pwd2.length;
      this.pwdFieldLabel.text(len > 0 ? "*".repeat(len) : "Enter again to confirm");
    }
  },

  _refreshTimeFields: function () {
    const values = [
      this.data.year,
      this.data.month,
      this.data.day,
      this.data.hour,
      this.data.minute,
      this.data.second,
    ];
    for (let i = 0; i < this._timeFields.length; i++) {
      const f = this._timeFields[i];
      const v = values[i];
      f.label.text(v && v.length > 0 ? v : f.placeholder);
    }
  },

  _refreshMaxCabField: function () {
    if (!this.maxCabFieldLabel) return;
    this.maxCabFieldLabel.text(this.data.maxCab && this.data.maxCab.length > 0 ? this.data.maxCab : "1-9");
  },

  _onDigit: function (d) {
    if (this.data.keypadMode === "pwd") {
      if (this.data.step === 1) {
        if (this.data.pwd1.length >= 6) return;
        this.data.pwd1 += d;
      } else {
        if (this.data.pwd2.length >= 6) return;
        this.data.pwd2 += d;
      }
      this._refreshPwdField();
      this._updateKeypadModeStyle();
    } else if (this.data.keypadMode === "maxCab") {
      const n = parseInt(d, 10);
      if (!Number.isFinite(n) || n < 1 || n > 9) return;
      this.data.maxCab = d;
      this._refreshMaxCabField();
      this._updateKeypadModeStyle();
    } else {
      const key = this._timeFields[this.data.activeField].key;
      const maxLen = key === "year" ? 4 : 2;
      const cur = this.data[key] || "";
      if (cur.length >= maxLen) return;
      this.data[key] = cur + d;
      this._refreshTimeFields();
    }
  },

  _onDelete: function () {
    if (this.data.keypadMode === "pwd") {
      if (this.data.step === 1 && this.data.pwd1.length > 0) {
        this.data.pwd1 = this.data.pwd1.slice(0, -1);
      } else if (this.data.step === 2 && this.data.pwd2.length > 0) {
        this.data.pwd2 = this.data.pwd2.slice(0, -1);
      }
      this._refreshPwdField();
    } else if (this.data.keypadMode === "maxCab") {
      this.data.maxCab = "";
      this._refreshMaxCabField();
    } else {
      const key = this._timeFields[this.data.activeField].key;
      const cur = this.data[key] || "";
      if (cur.length > 0) {
        this.data[key] = cur.slice(0, -1);
        this._refreshTimeFields();
      }
    }
  },

  _onConfirm: function () {
    if (this.data.keypadMode === "pwd") {
      this._handlePasswordConfirm();
    } else if (this.data.keypadMode === "maxCab") {
      this._handleMaxCabConfirm();
    } else {
      this._handleTimeConfirm();
    }
  },

  _handlePasswordConfirm: function () {
    if (this.data.step === 1) {
      if (this.data.pwd1.length !== 6) {
        TipView.showError("Password must be 6 digits");
        return;
      }
      this.data.step = 2;
      this.data.pwd2 = "";
      this._refreshPwdField();
      TipView.showSuccess("Enter again to confirm");
      return;
    }
    const pwd1 = this.data.pwd1;
    const pwd2 = this.data.pwd2;
    if (pwd2.length !== 6) {
      TipView.showError("Password must be 6 digits");
      return;
    }
    if (pwd1 !== pwd2) {
      TipView.showError("Passwords do not match");
      return;
    }
    try {
      LockerService.setAdminPassword(pwd2);
      log.info("AdminPasswordPage: Admin password set successfully");
      TipView.showSuccess("Admin password set successfully", {
        duration: 2000,
        countdown: false,
        onFinish: () => {
          this.data.pwd1 = "";
          this.data.pwd2 = "";
          this.data.step = 1;
          this._refreshPwdField();
        },
      });
    } catch (e) {
      log.error("AdminPasswordPage: Set admin password failed", e);
      TipView.showError("Save failed, please try again later");
    }
  },

  _handleTimeConfirm: function () {
    const y = this.data.year;
    const m = this.data.month;
    const d = this.data.day;
    const hh = this.data.hour;
    const mm = this.data.minute;
    const ss = this.data.second;

    if (!y || !m || !d || !hh || !mm || !ss) {
      TipView.showError("Please enter full date and time");
      return;
    }

    const yearNum = parseInt(y, 10);
    const monthNum = parseInt(m, 10);
    const dayNum = parseInt(d, 10);
    const hourNum = parseInt(hh, 10);
    const minuteNum = parseInt(mm, 10);
    const secondNum = parseInt(ss, 10);

    if ([yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum].some((n) => !Number.isFinite(n))) {
      TipView.showError("Invalid time format");
      return;
    }
    if (y.length !== 4 || yearNum < 2000 || yearNum >= 2038) {
      TipView.showError("Year must be 4 digits between 2000-2037");
      return;
    }
    if (monthNum < 1 || monthNum > 12) {
      TipView.showError("Month must be 1-12");
      return;
    }
    if (dayNum < 1 || dayNum > 31) {
      TipView.showError("Day must be 1-31");
      return;
    }
    const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0;
    if (monthNum === 2) {
      if ((!isLeap && dayNum >= 29) || (isLeap && dayNum > 29)) {
        TipView.showError("Invalid February date");
        return;
      }
    }
    if ([4, 6, 9, 11].indexOf(monthNum) >= 0 && dayNum > 30) {
      TipView.showError("Month " + monthNum + " has at most 30 days");
      return;
    }
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59 || secondNum < 0 || secondNum > 59) {
      TipView.showError("Invalid hour/minute/second range");
      return;
    }

    const pad2 = (n) => String(n).padStart(2, "0");
    const timeStr = `${yearNum}-${pad2(monthNum)}-${pad2(dayNum)} ${pad2(hourNum)}:${pad2(minuteNum)}:${pad2(secondNum)}`;

    try {
      ntp.setTime(timeStr, true);
      log.info("AdminPasswordPage: setTime", timeStr);
      TipView.showSuccess("Time set successfully");
    } catch (e) {
      log.error("AdminPasswordPage: Set system time failed", e);
      TipView.showError("Set time failed, please try again later");
    }
  },

  _handleMaxCabConfirm: function () {
    const s = this.data.maxCab;
    if (!s || s.length === 0) {
      TipView.showError("Please enter a digit 1-9");
      return;
    }
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 1 || n > 9) {
      TipView.showError("User max cabinets must be 1-9");
      return;
    }
    try {
      LockerService.setUserMaxCabinetCount(n);
      log.info("AdminPasswordPage: User max cabinet count set to", n);
      TipView.showSuccess("Set to " + n);
      this.data.maxCab = String(n);
      this._refreshMaxCabField();
    } catch (e) {
      log.error("AdminPasswordPage: Set user max cabinet count failed", e);
      TipView.showError("Save failed, please try again later");
    }
  },

  _startAdminFaceRegister: function () {
    try {
      FaceMaskView.start((isCancel) => this._exitFaceRegister(isCancel));
      FaceMaskView.setHint("info", "Please face the camera for admin face registration...");
      try {
        UIManager.getRoot().hide();
      } catch (e) {}
      try {
        this.root.hide();
      } catch (e) {}
      bus.on("REGISTER_FACE_SUCCESS", (event) => {
        log.info("AdminPasswordPage: Admin face registration success", event);
        FaceMaskView.setHint("success", "Admin face registration success");
        std.setTimeout(() => {
          this._exitFaceRegister(true);
          TipView.showSuccess("Admin face registration success");
        }, 1000);
      });
      bus.on("REGISTER_FACE_FAILED", () => {
        FaceMaskView.setHint("error", "Registration failed, please retry");
      });
      FaceMaskView.setHint("info", "Please face the camera for admin face registration...");
      std.setTimeout(() => {
        bus.fire("REGISTER_FACE", "admin");
      }, 2000);
    } catch (e) {
      log.error("AdminPasswordPage: Admin face registration failed", e);
      TipView.showError("System error, please try again later");
    }
  },

  _exitFaceRegister: function (isCancel) {
    bus.off("REGISTER_FACE_SUCCESS");
    bus.off("REGISTER_FACE_FAILED");
    FaceMaskView.clearHint();
    FaceMaskView.hide();
    try {
      UIManager.getRoot().show();
    } catch (e) {}
    try {
      this.root.show();
    } catch (e) {}
  },

  onShow: function () {
    this.data.pwd1 = "";
    this.data.pwd2 = "";
    this.data.step = 1;
    this.data.keypadMode = "pwd";
    this.data.activeField = 0;
    try {
      this.data.maxCab = String(LockerService.getUserMaxCabinetCount());
    } catch (e) {
      this.data.maxCab = "3";
    }
    this._refreshPwdField();
    this._refreshMaxCabField();
    this._updateKeypadModeStyle();

    try {
      const sn = dxOs.getSn() || "Unknown";
      this.snLabel.text("Device SN: " + sn);
    } catch (e) {
      this.snLabel.text("Device SN: Get failed");
    }
    try {
      const freeMemBytes = dxOs.getFreemem() || 0;
      const freeMemKb = (freeMemBytes / 1024).toFixed(2);
      this.memLabel.text("Free Memory: " + freeMemKb + " KB");
    } catch (e) {
      this.memLabel.text("Free Memory: Get failed");
    }

    try {
      const now = new Date();
      this.data.year = String(now.getFullYear());
      this.data.month = String(now.getMonth() + 1).padStart(2, "0");
      this.data.day = String(now.getDate()).padStart(2, "0");
      this.data.hour = String(now.getHours()).padStart(2, "0");
      this.data.minute = String(now.getMinutes()).padStart(2, "0");
      this.data.second = String(now.getSeconds()).padStart(2, "0");
      this._refreshTimeFields();
    } catch (e) {
      log.error("AdminPasswordPage: Get current time failed", e);
    }
  },

  onHide: function () {},
};

export default AdminPasswordPage;
