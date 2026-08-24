import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../../UIManager.js";
import { ADMIN_LAYOUT, COLORS, UI_FONT_RATIO } from "../../constants.js";

const AdminHomePage = {
  id: "adminHome",
  _loginMethod: "",
  _operatorUserId: "",

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
    this.title.text("管理员控制台");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    const cardW = Math.round(W * 0.36);
    const cardH = Math.round(H * 0.17);
    const gapX = Math.round(W * 0.05);
    const gapY = Math.round(H * 0.035);
    const startX = Math.round((W - (cardW * 2 + gapX)) / 2);
    const y1 = Math.round(H * (0.24 - ADMIN_LAYOUT.contentShiftRatio));
    const y2 = y1 + cardH + gapY;
    const y3 = y2 + cardH + gapY;
    this._menuCardW = cardW;
    this._menuGapX = gapX;
    this._menuStartX = startX;
    this._menuThirdY = y3;

    this.cardOpenOne = this._buildMenuCard(
      "open_one",
      "开指定柜",
      "/app/code/resource/image/admin_open.png",
      startX,
      y1,
      cardW,
      cardH
    );
    this.cardOpenAll = this._buildMenuCard(
      "open_all",
      "开所有柜",
      "/app/code/resource/image/admin_group.png",
      startX + cardW + gapX,
      y1,
      cardW,
      cardH
    );
    this.cardSysInfo = this._buildMenuCard(
      "sys_info",
      "系统信息",
      "/app/code/resource/image/admin_setting.png",
      startX,
      y2,
      cardW,
      cardH
    );
    this.cardNetwork = this._buildMenuCard(
      "network",
      "网络配置",
      "/app/code/resource/image/network_setting.png",
      startX + cardW + gapX,
      y2,
      cardW,
      cardH
    );
    this.cardChangePassword = this._buildMenuCard(
      "change_password",
      "修改密码",
      "/app/code/resource/image/admin_pwd.png",
      Math.round((W - cardW) / 2),
      y3,
      cardW,
      cardH
    );
    this.cardChangePassword.hide();
    this.cardDebugLog = this._buildMenuCard(
      "debug_log",
      "运行日志",
      "/app/code/resource/image/admin_records.png",
      Math.round((W - cardW) / 2),
      y3,
      cardW,
      cardH
    );

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this._loginMethod = "";
      this._operatorUserId = "";
      UIManager.open("home");
    });
    this.cardOpenOne.on(dxui.Utils.EVENT.CLICK, () =>
      UIManager.open("adminOpenSpecificCabinet", { operatorUserId: this._operatorUserId })
    );
    this.cardOpenAll.on(dxui.Utils.EVENT.CLICK, () =>
      UIManager.open("adminOpenAllCabinet", { operatorUserId: this._operatorUserId })
    );
    this.cardSysInfo.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminSystemInfo"));
    this.cardNetwork.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminNetworkConfig"));
    this.cardDebugLog.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminDebugLog"));
    this.cardChangePassword.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._loginMethod !== "password") return;
      UIManager.open("adminChangePassword", { loginMethod: this._loginMethod });
    });

    return this.root;
  },

  _buildMenuCard: function (id, text, iconPath, x, y, w, h) {
    const card = dxui.View.build(this.id + "_card_" + id, this.root);
    card.setSize(w, h);
    card.setPos(x, y);
    card.bgColor(COLORS.cardBg);
    card.radius(Math.round(w * 0.08));
    card.borderWidth(0);
    card.scroll(false);

    const icon = dxui.Image.build(this.id + "_icon_" + id, card);
    icon.source(iconPath);
    icon.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(h * 0.12));

    const label = dxui.Label.build(this.id + "_label_" + id, card);
    label.text(text);
    label.textColor(0x4d4d4d);
    label.textFont(UIManager.font(Math.round(h * 0.14), dxui.Utils.FONT_STYLE.NORMAL));
    label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(h * 0.1));

    return card;
  },

  onShow: function (data) {
    const method = data && String(data.loginMethod || "");
    if (method === "password" || method === "face") {
      this._loginMethod = method;
      this._operatorUserId =
        method === "password" ? "admin" : String(data.operatorUserId || "").trim();
    }
    if (this._loginMethod === "password") {
      this.cardChangePassword.setPos(this._menuStartX, this._menuThirdY);
      this.cardDebugLog.setPos(
        this._menuStartX + this._menuCardW + this._menuGapX,
        this._menuThirdY
      );
      this.cardChangePassword.show();
    } else {
      const W = dxDriver.DISPLAY.WIDTH;
      this.cardDebugLog.setPos(
        Math.round((W - this._menuCardW) / 2),
        this._menuThirdY
      );
      this.cardChangePassword.hide();
    }
  },
};

export default AdminHomePage;
