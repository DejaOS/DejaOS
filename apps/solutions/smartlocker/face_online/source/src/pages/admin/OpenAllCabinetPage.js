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
import TipView from "../TipView.js";
import {
  listOperationalCabinets,
  releaseAllLockedCabinets,
} from "../../db/FitLockService.js";
import { startCabinetOpenSequence } from "../../lock/CabinetOpenSequence.js";

const ACTION_OPEN_ALL = "openAll";
const ACTION_RELEASE_LOCKED = "releaseLocked";

const OpenAllCabinetPage = {
  id: "adminOpenAllCabinet",
  _batchSequence: null,
  _batchQueue: [],
  _batchAction: "",
  _operatorUserId: "",

  _listCabinets: function () {
    try {
      const cabinets = listOperationalCabinets();
      const out = [];
      for (let i = 0; i < cabinets.length; i++) {
        const cabinet = cabinets[i];
        if (!cabinet) continue;
        out.push({
          groupId: cabinet.groupId,
          cabinetId: cabinet.cabinetId,
        });
      }
      return out;
    } catch (e) {
      return [];
    }
  },

  _clearBatchSequence: function () {
    if (this._batchSequence) this._batchSequence.cancel();
    this._batchSequence = null;
  },

  _isBatchRunning: function () {
    return !!(
      this._batchSequence && this._batchSequence.isRunning()
    );
  },

  _resetActionLabels: function () {
    this.btnActionLabel.text("打开所有柜");
    this.btnReleaseLockedLabel.text("释放已锁定柜格");
  },

  _resetBatchState: function () {
    this._clearBatchSequence();
    this._batchQueue = [];
    this._batchAction = "";
    this._resetActionLabels();
  },

  _finishBatch: function () {
    const total = this._batchQueue.length;
    const action = this._batchAction;
    this._resetBatchState();

    if (action === ACTION_RELEASE_LOCKED) {
      this.statusTip.text(`释放并开柜完成：共 ${total} 个已锁定柜格`);
      TipView.showSuccess("已完成释放已锁定柜格", 2);
      return;
    }
    this.statusTip.text(`开柜完成：共 ${total} 个柜子`);
    TipView.showSuccess("已完成打开所有柜", 2);
  },

  _startBatchOpen: function (cabinets, action) {
    this._clearBatchSequence();
    this._batchQueue = cabinets;
    this._batchAction = action;

    if (action === ACTION_RELEASE_LOCKED) {
      this.btnReleaseLockedLabel.text("执行中（点此可中断）");
      this.statusTip.text(`已释放 ${cabinets.length} 个锁定柜格，准备依次开柜`);
    } else {
      this.btnActionLabel.text("执行中（点此可中断）");
      this.statusTip.text(`准备依次开锁，共 ${cabinets.length} 个柜子`);
    }

    const sequence = startCabinetOpenSequence(cabinets, {
      userId: this._operatorUserId || "admin",
      reportAccess: false,
      onProgress: ({ index, total, cabinet }) => {
        this.statusTip.text(
          `正在开锁 ${index}/${total}：${cabinet.groupId}-${cabinet.cabinetId}`
        );
      },
      onComplete: () => this._finishBatch(),
    });
    this._batchSequence = sequence.isRunning() ? sequence : null;
  },

  _startOpenAll: function () {
    const cabinets = this._listCabinets();
    if (!cabinets.length) {
      TipView.showError("尚未配置柜格，请先完成柜格配置", 2);
      return;
    }
    this._appendAlarmEvent(ALARM_EVENT_TYPE.OPEN_ALL_CABINETS, cabinets.length);
    this._startBatchOpen(cabinets, ACTION_OPEN_ALL);
  },

  _appendAlarmEvent: function (type, cabinetCount) {
    try {
      bus.fire(BUS.MQTT_ALARM_EVENT_APPEND, {
        eventId: `evt_alarm_${type}_${Date.now()}`,
        userId: this._operatorUserId || "admin",
        timestamp: Math.floor(Date.now() / 1000),
        type,
        extra: { cabinetCount },
      });
    } catch (e) {
      log.error("[OpenAllCabinetPage] append alarm event failed", type, e);
    }
  },

  _startReleaseLocked: function () {
    let cabinets;
    try {
      cabinets = releaseAllLockedCabinets();
    } catch (e) {
      TipView.showError("释放已锁定柜格失败", 2);
      return;
    }

    if (!cabinets.length) {
      this.statusTip.text("当前没有已锁定柜格");
      TipView.showSuccess("当前没有已锁定柜格", 2);
      return;
    }

    try {
      bus.fire(BUS.CABINET_CHANGED, {});
    } catch (e) {
      log.error("[OpenAllCabinetPage] cabinet changed emit failed", e);
    }
    this._appendAlarmEvent(ALARM_EVENT_TYPE.RELEASE_LOCKED_CABINETS, cabinets.length);
    this._startBatchOpen(cabinets, ACTION_RELEASE_LOCKED);
  },

  _cancelBatch: function () {
    this._resetBatchState();
    this.statusTip.text("已中断批量开锁；已完成的释放操作不会撤销");
    TipView.showError("已中断批量开锁", 2);
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
    this.btnCancel.align(
      dxui.Utils.ALIGN.TOP_RIGHT,
      -Math.round(W * 0.02),
      Math.round(H * 0.02)
    );
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.radius(0);
    this.btnCancel.scroll(false);

    this.btnCancelLabel = dxui.Label.build(this.id + "_cancel_l", this.btnCancel);
    this.btnCancelLabel.text("取消");
    this.btnCancelLabel.textColor(COLORS.cancelLabel);
    this.btnCancelLabel.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminCancel),
        dxui.Utils.FONT_STYLE.NORMAL
      )
    );
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("柜门批量操作");
    this.title.textColor(COLORS.text);
    this.title.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminTitleBold),
        dxui.Utils.FONT_STYLE.BOLD
      )
    );
    this.title.align(
      dxui.Utils.ALIGN.TOP_MID,
      0,
      Math.round(H * ADMIN_LAYOUT.titleYRatio)
    );

    this.openAllDescription = dxui.Label.build(
      this.id + "_open_all_desc",
      this.root
    );
    this.openAllDescription.text("依次打开全部可用柜门，不修改柜格状态。");
    this.openAllDescription.textColor(COLORS.textMuted);
    this.openAllDescription.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminTip),
        dxui.Utils.FONT_STYLE.NORMAL
      )
    );
    this.openAllDescription.setSize(Math.round(W * 0.88), Math.round(H * 0.07));
    this.openAllDescription.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.openAllDescription.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.12));

    this.btnAction = dxui.View.build(this.id + "_action", this.root);
    this.btnAction.setSize(Math.round(W * 0.62), Math.round(H * 0.09));
    this.btnAction.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.21));
    this.btnAction.bgColor(COLORS.primary);
    this.btnAction.radius(Math.round(H * 0.02));
    this.btnAction.borderWidth(0);
    this.btnAction.scroll(false);

    this.btnActionLabel = dxui.Label.build(this.id + "_action_l", this.btnAction);
    this.btnActionLabel.text("打开所有柜");
    this.btnActionLabel.textColor(0xffffff);
    this.btnActionLabel.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminActionBold),
        dxui.Utils.FONT_STYLE.BOLD
      )
    );
    this.btnActionLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.releaseLockedDescription = dxui.Label.build(
      this.id + "_release_locked_desc",
      this.root
    );
    this.releaseLockedDescription.text(
      "仅释放已锁定柜格，并依次打开这些柜门。其他柜格不受影响。"
    );
    this.releaseLockedDescription.textColor(COLORS.textMuted);
    this.releaseLockedDescription.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminTip),
        dxui.Utils.FONT_STYLE.NORMAL
      )
    );
    this.releaseLockedDescription.setSize(
      Math.round(W * 0.88),
      Math.round(H * 0.09)
    );
    this.releaseLockedDescription.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.releaseLockedDescription.align(
      dxui.Utils.ALIGN.TOP_MID,
      0,
      Math.round(H * 0.39)
    );

    this.btnReleaseLocked = dxui.View.build(
      this.id + "_release_locked",
      this.root
    );
    this.btnReleaseLocked.setSize(Math.round(W * 0.62), Math.round(H * 0.09));
    this.btnReleaseLocked.align(
      dxui.Utils.ALIGN.TOP_MID,
      0,
      Math.round(H * 0.5)
    );
    this.btnReleaseLocked.bgColor(0xe65c3a);
    this.btnReleaseLocked.radius(Math.round(H * 0.02));
    this.btnReleaseLocked.borderWidth(0);
    this.btnReleaseLocked.scroll(false);

    this.btnReleaseLockedLabel = dxui.Label.build(
      this.id + "_release_locked_l",
      this.btnReleaseLocked
    );
    this.btnReleaseLockedLabel.text("释放已锁定柜格");
    this.btnReleaseLockedLabel.textColor(0xffffff);
    this.btnReleaseLockedLabel.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminActionBold),
        dxui.Utils.FONT_STYLE.BOLD
      )
    );
    this.btnReleaseLockedLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.statusTip = dxui.Label.build(this.id + "_status", this.root);
    this.statusTip.text("请选择需要执行的操作");
    this.statusTip.textColor(COLORS.textSecondary);
    this.statusTip.textFont(
      UIManager.font(
        Math.round(H * UI_FONT_RATIO.adminTip),
        dxui.Utils.FONT_STYLE.NORMAL
      )
    );
    this.statusTip.setSize(Math.round(W * 0.88), Math.round(H * 0.12));
    this.statusTip.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.statusTip.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.66));

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminHome"));
    this.btnAction.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._isBatchRunning()) {
        this._cancelBatch();
        return;
      }
      this._startOpenAll();
    });
    this.btnReleaseLocked.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._isBatchRunning()) {
        this._cancelBatch();
        return;
      }
      this._startReleaseLocked();
    });

    return this.root;
  },

  onHide: function () {
    this._resetBatchState();
    this.statusTip.text("请选择需要执行的操作");
    this._operatorUserId = "";
  },

  onShow: function (data) {
    this._operatorUserId = String((data && data.operatorUserId) || "").trim();
  },
};

export default OpenAllCabinetPage;
