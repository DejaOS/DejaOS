import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import dxOs from "../../../dxmodules/dxOs.js";
import UIManager from "../../UIManager.js";
import { loadNetworkSettings } from "../../db/FitLockService.js";
import { ADMIN_LAYOUT, COLORS, FITLOCK_MQTT_APP_VERSION, FITLOCK_MQTT_MODEL, UI_FONT_RATIO } from "../../constants.js";
import { getDeviceSn } from "../../utils.js";

function tryGetIp() {
  try {
    const out = String(dxOs.systemWithRes("hostname -I", 256) || "").trim();
    const m = out.match(/(\d+\.\d+\.\d+\.\d+)/);
    return m ? m[1] : "";
  } catch (e) {
    return "";
  }
}

const SystemInfoPage = {
  id: "adminSystemInfo",

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
    this.title.text("系统信息");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    const padX = Math.round(W * 0.06);
    const panelTop = Math.round(H * (0.13 - ADMIN_LAYOUT.contentShiftRatio));
    const panelH = Math.round(H * 0.58);
    const rowFont = UIManager.font(Math.round(H * 0.028), dxui.Utils.FONT_STYLE.NORMAL);
    const rowColor = 0x444444;
    const lineCount = 4;
    const innerPad = Math.round(panelH * 0.08);
    const lineH = Math.round((panelH - innerPad * 2) / lineCount);

    this.infoPanel = dxui.View.build(this.id + "_info_panel", this.root);
    this.infoPanel.setSize(W - padX * 2, panelH);
    this.infoPanel.setPos(padX, panelTop);
    this.infoPanel.bgColor(COLORS.cardBg);
    this.infoPanel.radius(Math.round(W * 0.02));
    this.infoPanel.borderWidth(0);
    this.infoPanel.scroll(false);

    const rowW = W - padX * 2 - Math.round(W * 0.08);
    let y = innerPad;
    this.lblModel = this._buildInfoRow("model", this.infoPanel, rowW, rowFont, rowColor, y);
    y += lineH;
    this.lblVersion = this._buildInfoRow("ver", this.infoPanel, rowW, rowFont, rowColor, y);
    y += lineH;
    this.lblSn = this._buildInfoRow("sn", this.infoPanel, rowW, rowFont, rowColor, y);
    y += lineH;
    this.lblIp = this._buildInfoRow("ip", this.infoPanel, rowW, rowFont, rowColor, y);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminHome"));

    this._refreshSystemInfo();

    return this.root;
  },

  _buildInfoRow: function (key, parent, width, font, color, y) {
    const lbl = dxui.Label.build(this.id + "_info_" + key, parent);
    lbl.text("");
    lbl.setSize(width, Math.round(dxDriver.DISPLAY.HEIGHT * 0.05));
    lbl.textFont(font);
    lbl.textColor(color);
    lbl.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(dxDriver.DISPLAY.WIDTH * 0.04), y);
    return lbl;
  },

  _refreshSystemInfo: function () {
    let ip = "";
    try {
      ip = String(loadNetworkSettings().ip || "").trim();
    } catch (e) { }
    if (!ip) ip = tryGetIp();
    this.lblModel.text("型号：" + FITLOCK_MQTT_MODEL);
    this.lblVersion.text("版本：" + FITLOCK_MQTT_APP_VERSION);
    this.lblSn.text("SN：" + getDeviceSn("未知"));
    this.lblIp.text("IP：" + (ip || "未获取"));
  },

  onShow: function () {
    this._refreshSystemInfo();
  },
};

export default SystemInfoPage;
