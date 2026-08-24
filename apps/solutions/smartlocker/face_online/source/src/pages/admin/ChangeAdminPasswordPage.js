import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import * as FitLock from "../../db/FitLockService.js";
import { ADMIN_LAYOUT, COLORS, UI_FONT_RATIO } from "../../constants.js";

const ADMIN_PIN_KEY = "admin.pin";

const ChangeAdminPasswordPage = {
  id: "adminChangePassword",
  _newPwd: "",
  _step: "new",
  _authorized: false,

  init: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, H);
    this.root.bgColor(COLORS.pageBgGray);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.scroll(false);

    this.btnCancel = dxui.View.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(Math.round(W * 0.2), Math.round(H * 0.06));
    this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.02), Math.round(H * 0.02));
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.radius(0);
    this.btnCancel.scroll(false);

    this.btnCancelLabel = dxui.Label.build(this.id + "_cancel_l", this.btnCancel);
    this.btnCancelLabel.text("取消");
    this.btnCancelLabel.textColor(COLORS.cancelLabel);
    this.btnCancelLabel.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminCancel), dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("修改密码");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    this.tip = dxui.Label.build(this.id + "_tip", this.root);
    this.tip.setSize(Math.round(W * 0.8), Math.round(H * 0.12));
    this.tip.text("设置新的 6 位管理员密码");
    this.tip.textColor(COLORS.textMuted);
    this.tip.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTip), dxui.Utils.FONT_STYLE.NORMAL));
    this.tip.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.tip.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * (0.18 - ADMIN_LAYOUT.contentShiftRatio)));

    const btnW = Math.round(W * 0.48);
    const btnH = Math.round(H * 0.075);
    this.btnStart = dxui.Button.build(this.id + "_start", this.root);
    this.btnStart.setSize(btnW, btnH);
    this.btnStart.align(dxui.Utils.ALIGN.CENTER, 0, -Math.round(H * 0.08));
    this.btnStart.bgColor(COLORS.primary);
    this.btnStart.radius(Math.round(btnH / 2));
    this.btnStart.borderWidth(0);

    this.btnStartLabel = dxui.Label.build(this.id + "_start_l", this.btnStart);
    this.btnStartLabel.text("输入新密码");
    this.btnStartLabel.textColor(0xffffff);
    this.btnStartLabel.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminActionBold), dxui.Utils.FONT_STYLE.BOLD));
    this.btnStartLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.passwordView = PasswordView.build(this.id + "_password", this.root, {
      placeholder: "请输入新密码",
      maxLength: 6,
      maskInput: true,
      onConfirm: (text) => this._handleConfirm(text),
    });
    this.passwordView.root.hide();

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => this._goBack());
    this.btnStart.on(dxui.Utils.EVENT.CLICK, () => this._startChange());

    return this.root;
  },

  _startChange: function () {
    if (!this._authorized) return;
    this._newPwd = "";
    this._step = "new";
    this.tip.text("请输入新的 6 位管理员密码");
    this.tip.textColor(COLORS.textMuted);
    this.passwordView.setPlaceholder("请输入新密码");
    this.passwordView.clearInput();
    this.passwordView.root.show();
  },

  _handleConfirm: function (inputPwd) {
    const pwd = String(inputPwd || "");
    if (!/^\d{6}$/.test(pwd)) {
      this.tip.text("密码必须是 6 位数字");
      this.tip.textColor(0xcc3333);
      this.passwordView.clearInput();
      return;
    }

    if (this._step === "new") {
      this._newPwd = pwd;
      this._step = "confirm";
      this.tip.text("请再次输入新密码");
      this.tip.textColor(COLORS.textMuted);
      this.passwordView.setPlaceholder("请确认新密码");
      this.passwordView.clearInput();
      return;
    }

    if (pwd !== this._newPwd) {
      this.tip.text("两次输入不一致，请重新设置");
      this.tip.textColor(0xcc3333);
      this._newPwd = "";
      this._step = "new";
      this.passwordView.setPlaceholder("请输入新密码");
      this.passwordView.clearInput();
      return;
    }

    try {
      FitLock.setConfig(ADMIN_PIN_KEY, pwd);
      this.passwordView.root.hide();
      this._newPwd = "";
      TipView.showSuccess("管理员密码修改成功", {
        duration: 1800,
        onFinish: () => UIManager.open("adminHome"),
      });
    } catch (e) {
      this.tip.text("密码修改失败，请重试");
      this.tip.textColor(0xcc3333);
      this.passwordView.clearInput();
    }
  },

  _goBack: function () {
    this.passwordView.root.hide();
    this._newPwd = "";
    UIManager.open("adminHome");
  },

  onShow: function (data) {
    this._authorized = !!(data && data.loginMethod === "password");
    this.passwordView.root.hide();
    this._newPwd = "";
    this._step = "new";
    this.tip.text("设置新的 6 位管理员密码");
    this.tip.textColor(COLORS.textMuted);
    if (!this._authorized) {
      UIManager.open("adminHome", { loginMethod: "face" });
    }
  },

  onHide: function () {
    this.passwordView.root.hide();
  },
};

export default ChangeAdminPasswordPage;
