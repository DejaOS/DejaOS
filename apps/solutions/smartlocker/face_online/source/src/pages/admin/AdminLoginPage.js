import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import bus from "../../../dxmodules/dxEventBus.js";
import std from "../../../dxmodules/dxStd.js";
import UIManager from "../../UIManager.js";
import FaceMaskView from "../FaceMaskView.js";
import PasswordView from "../PasswordView.js";
import { ADMIN_LAYOUT, BUS, COLORS, UI_FONT_RATIO } from "../../constants.js";
import * as FitLock from "../../db/FitLockService.js";
import FitLockDB from "../../db/FitLockDB.js";
import PageState from "../PageState.js";
import { getDeviceSn } from "../../utils.js";

function getRecoveryPasswordFromSn() {
  const sn = getDeviceSn("").toLowerCase();
  if (!sn) {
    return "000000";
  }
  if (!sn) return "000000";
  //Add your logic to generate recovery password from SN here
  return "111111";
}

const AdminLoginPage = {
  id: "adminLogin",
  _faceMode: false,
  _adminPwd: "000000",
  _recoveryPwd: "000000",

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

    this._recoveryPwd = getRecoveryPasswordFromSn();

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("管理员登录");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    this.tip = dxui.Label.build(this.id + "_tip", this.root);
    this.tip.text("请选择登录方式");
    this.tip.textColor(COLORS.textMuted);
    this.tip.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTip), dxui.Utils.FONT_STYLE.NORMAL));
    this.tip.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * (0.13 - ADMIN_LAYOUT.contentShiftRatio)));

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

    const btnW = Math.round(W * 0.55);
    const btnH = Math.round(H * 0.08);
    const btnGap = Math.round(H * 0.02);
    const topY = Math.round(H * (0.2 - ADMIN_LAYOUT.contentShiftRatio));

    this.btnFace = dxui.View.build(this.id + "_face", this.root);
    this.btnFace.setSize(btnW, btnH);
    this.btnFace.align(dxui.Utils.ALIGN.TOP_MID, 0, topY);
    this.btnFace.bgColor(COLORS.primary);
    this.btnFace.radius(Math.round(btnH / 2));
    this.btnFace.borderWidth(0);
    this.btnFace.scroll(false);

    this.btnFaceLabel = dxui.Label.build(this.id + "_face_l", this.btnFace);
    this.btnFaceLabel.text("人脸识别登录");
    this.btnFaceLabel.textColor(0xffffff);
    this.btnFaceLabel.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminLoginMainBtn), dxui.Utils.FONT_STYLE.BOLD));
    this.btnFaceLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnPwd = dxui.View.build(this.id + "_pwd_btn", this.root);
    this.btnPwd.setSize(btnW, btnH);
    this.btnPwd.align(dxui.Utils.ALIGN.TOP_MID, 0, topY + btnH + btnGap);
    this.btnPwd.bgColor(COLORS.primary);
    this.btnPwd.radius(Math.round(btnH / 2));
    this.btnPwd.borderWidth(0);
    this.btnPwd.scroll(false);

    this.btnPwdLabel = dxui.Label.build(this.id + "_pwd_l", this.btnPwd);
    this.btnPwdLabel.text("密码登录");
    this.btnPwdLabel.textColor(0xffffff);
    this.btnPwdLabel.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminLoginMainBtn), dxui.Utils.FONT_STYLE.BOLD));
    this.btnPwdLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.pwdView = PasswordView.build(this.id + "_pwd", this.root, {
      placeholder: "请输入管理员密码",
      maxLength: 6,
      maskInput: true,
      onConfirm: (text) => this._handleConfirm(text),
    });
    this.pwdView.root.hide();

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("home"));
    this.btnFace.on(dxui.Utils.EVENT.CLICK, () => this._startFaceLogin());
    this.btnPwd.on(dxui.Utils.EVENT.CLICK, () => this._showPwdPanel(true));

    this._adminFaceHandler = (e) => this._onAdminFaceRecognized(e);

    return this.root;
  },

  _showPwdPanel: function (show) {
    if (show) {
      this.pwdView.clearInput();
      this.pwdView.root.show();
    } else {
      this.pwdView.root.hide();
    }
    this.tip.text(show ? "请输入 6 位管理员密码" : "请选择登录方式");
  },

  _showTip: function (text, isError = false) {
    this.tip.text(text || "");
    this.tip.textColor(isError ? 0xcc3333 : 0x777777);
  },

  _handleConfirm: function (inputPwd) {
    const pwd = String(inputPwd || "");
    if (pwd.length !== 6) {
      this._showTip("管理员密码必须是 6 位数字", true);
      return;
    }
    if (pwd === this._adminPwd || pwd === this._recoveryPwd) {
      this._showTip("登录成功");
      this._showPwdPanel(false);
      UIManager.open("adminHome", { loginMethod: "password", operatorUserId: "admin" });
      return;
    }
    this._showTip("密码错误，请重试", true);
    this.pwdView.clearInput();
  },

  _startFaceLogin: function () {
    if (this._faceMode) return;
    this._faceMode = true;
    FaceMaskView.start((isCancel) => this._exitFaceMode(isCancel));
    FaceMaskView.setHint("info", "请管理员面向摄像头");
    PageState.onFaceRecognized(this._adminFaceHandler);
    try {
      UIManager.getRoot().hide();
      this.root.hide();
    } catch (e) {}
    bus.fire(BUS.FACE_START);
  },

  /** 人脸登录：仅当 user.role===1 通过。 */
  _onAdminFaceRecognized: function (event) {
    if (!this._faceMode) return;
    const userId = event && (event.userId || event.user_id || "");
    const uid = String(userId || "").trim();
    const isRec = event && typeof event.isRec === "boolean" ? event.isRec : !!uid;
    if (isRec && uid && FitLockDB.isUserAdmin(uid)) {
      FaceMaskView.setHint("success", "管理员识别成功");
      std.setTimeout(() => {
        this._exitFaceMode(true);
        UIManager.open("adminHome", { loginMethod: "face", operatorUserId: uid });
      }, 1000);
      return;
    }
    FaceMaskView.setHint("error", uid ? "非管理员，无法进入" : "识别失败，请重试");
  },

  _exitFaceMode: function () {
    PageState.offFaceRecognized(this._adminFaceHandler);
    bus.fire(BUS.FACE_STOP);
    this._faceMode = false;
    FaceMaskView.hide();
    try {
      UIManager.getRoot().show();
      this.root.show();
    } catch (e) {}
  },

  onShow: function () {
    this._adminPwd = FitLock.getConfig("admin.pin", "000000") || "000000";
    this._recoveryPwd = getRecoveryPasswordFromSn();
    this._showPwdPanel(false);
  },

  onHide: function () {
    if (this._faceMode) {
      this._exitFaceMode();
    }
  },
};

export default AdminLoginPage;

