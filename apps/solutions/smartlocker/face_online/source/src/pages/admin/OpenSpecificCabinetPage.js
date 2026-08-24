import dxui from "../../../dxmodules/dxUi.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import bus from "../../../dxmodules/dxEventBus.js";
import log from "../../mylogger.js";
import UIManager from "../../UIManager.js";
import {
  ALARM_EVENT_TYPE,
  ADMIN_LAYOUT,
  BUS,
  COLORS,
  UI_FONT_RATIO,
} from "../../constants.js";
import KeyboardView from "../KeyboardView.js";
import TipView from "../TipView.js";
import { listOperationalCabinets, resolveCabinetToHardware } from "../../db/FitLockService.js";

const OpenSpecificCabinetPage = {
  id: "adminOpenSpecificCabinet",
  _operatorUserId: "",

  _listCabinetLabels: function () {
    try {
      const cabinets = listOperationalCabinets();
      const out = [];
      for (let i = 0; i < cabinets.length; i++) {
        const c = cabinets[i];
        if (!c) continue;
        out.push(`${c.groupId}-${c.cabinetId}`);
      }
      return out;
    } catch (e) {
      return [];
    }
  },

  _parseCabinetLabel: function (text) {
    const t = String(text || "").trim();
    const m = t.match(/^(\d+)\s*[-_]\s*(\d+)$/);
    if (!m) return null;
    return { groupId: Number(m[1]), cabinetId: Number(m[2]) };
  },

  _openCabinet: function (groupId, cabinetId) {
    const gid = Number(groupId);
    const cid = Number(cabinetId);
    if (!Number.isFinite(gid) || !Number.isFinite(cid)) {
      TipView.showError("柜格编号无效，格式：组号-柜号", 2);
      return;
    }
    const hw = resolveCabinetToHardware(gid, cid);
    if (!hw) {
      TipView.showError("柜格不存在或不可用，请先完成柜格配置", 2);
      return;
    }
    bus.fire(BUS.LOCK_CMD, {
      action: "openOneByCabinet",
      groupId: gid,
      cabinetId: cid,
      userId: this._operatorUserId || "admin",
      reportAccess: false,
    });
    try {
      bus.fire(BUS.MQTT_ALARM_EVENT_APPEND, {
        eventId: `evt_alarm_open_specific_${gid}_${cid}_${Date.now()}`,
        userId: this._operatorUserId || "admin",
        groupId: gid,
        cabinetId: cid,
        timestamp: Math.floor(Date.now() / 1000),
        type: ALARM_EVENT_TYPE.OPEN_SPECIFIC_CABINET,
      });
    } catch (e) {
      log.error("[OpenSpecificCabinetPage] append alarm event failed", e);
    }
    const label = `${gid}-${cid}`;
    this.tip.text(`已发送开锁指令：${label}`);
    TipView.showSuccess(`已发送开锁：${label}`, 2);
  },

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
    this.title.text("开指定柜");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    this.tip = dxui.Label.build(this.id + "_tip", this.root);
    this.tip.text("点击下方按钮，输入「组号-柜号」并开锁（如 1-3）");
    this.tip.textColor(COLORS.textMuted);
    this.tip.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTip), dxui.Utils.FONT_STYLE.NORMAL));
    const tipW = Math.round(W * 0.88);
    const tipH = Math.round(H * 0.14);
    this.tip.setSize(tipW, tipH);
    this.tip.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.tip.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * (0.13 - ADMIN_LAYOUT.contentShiftRatio)));

    this.btnAction = dxui.View.build(this.id + "_action", this.root);
    this.btnAction.setSize(Math.round(W * 0.52), Math.round(H * 0.1));
    this.btnAction.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * (0.42 - ADMIN_LAYOUT.contentShiftRatio)));
    this.btnAction.bgColor(COLORS.primary);
    this.btnAction.radius(Math.round(H * 0.02));
    this.btnAction.borderWidth(0);
    this.btnAction.scroll(false);

    this.btnActionLabel = dxui.Label.build(this.id + "_action_l", this.btnAction);
    this.btnActionLabel.text("输入柜格并开锁");
    this.btnActionLabel.textColor(0xffffff);
    this.btnActionLabel.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminActionBold), dxui.Utils.FONT_STYLE.BOLD));
    this.btnActionLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminHome"));
    this.btnAction.on(dxui.Utils.EVENT.CLICK, () => {
      const all = this._listCabinetLabels();
      if (!all.length) {
        TipView.showError("尚未配置柜格，请先完成柜格配置", 2);
        return;
      }
      const sample = all.length <= 5 ? all.join(" / ") : `${all.slice(0, 5).join(" / ")} ......`;
      this.tip.text(`可用编号示例：${sample}`);
      KeyboardView.show({
        fieldLabel: "柜格（组-柜）",
        initialText: "",
        maxLength: 32,
        passwordMode: false,
        validate: (text) => {
          const loc = this._parseCabinetLabel(text);
          if (!loc) return { ok: false, message: "格式须为 组号-柜号" };
          return { ok: true };
        },
        onCommit: (text) => {
          const loc = this._parseCabinetLabel(text);
          if (loc) this._openCabinet(loc.groupId, loc.cabinetId);
        },
      });
    });

    return this.root;
  },

  onHide: function () {
    try {
      if (KeyboardView.isVisible()) KeyboardView.hide();
    } catch (e) {}
  },

  onShow: function (data) {
    this._operatorUserId = String((data && data.operatorUserId) || "").trim();
  },
};

export default OpenSpecificCabinetPage;
