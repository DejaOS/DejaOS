import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import bus from "../../dxmodules/dxEventBus.js";
import {
  ACCESS_EVENT_TYPE,
  BUS,
  FACE_CAPTURE_DIR,
  USER_WAV,
} from "../constants.js";
import UIManager from "../UIManager.js";
import std from "../../dxmodules/dxStd.js";
import FaceMaskView from "./FaceMaskView.js";
import PinEntryView from "./PinEntryView.js";
import log from "../mylogger.js";
import PageState from "./PageState.js";
import dxMap from "../../dxmodules/dxMap.js";
import TipView from "./TipView.js";
import PickChooseView from "./PickChooseView.js";
import FixedOrTempChooseView from "./FixedOrTempChooseView.js";
import audio from "../../dxmodules/dxAudio.js";
import FitLockDB from "../db/FitLockDB.js";
import {
  getLockRule,
  computeTempEndTime,
  formatTempLockerRemainText,
  isPastNominalEnd,
  formatLocalDateTime,
  getOpenModel,
  getCabinetStrategy,
  isCabinetLocked,
  getTempPickupMode,
  OPEN_MODEL_PIN,
} from "../db/FitLockService.js";
import { isTempRetainPickupEnabled } from "../db/tempPickupMode.js";
import { getDeviceSn } from "../utils.js";

function cabinetLabel(c) {
  if (!c) return "";
  const name = c.cabinetName != null ? String(c.cabinetName).trim() : "";
  const id = `${c.groupId}-${c.cabinetId}`;
  return name ? `${name}（${id}）` : id;
}

function cabinetChoiceLabel(c) {
  if (!c) return "";
  const name = c.cabinetName != null ? String(c.cabinetName).trim() : "";
  return name || `${c.groupId}-${c.cabinetId}`;
}

function isSameCabinet(a, b) {
  if (!a || !b) return false;
  return Number(a.groupId) === Number(b.groupId) && Number(a.cabinetId) === Number(b.cabinetId);
}

function requestOpenCabinet(groupId, cabinetId, userId, picPath) {
  const cmd = {
    action: "openOneByCabinet",
    groupId,
    cabinetId,
    userId,
  };
  const capturePath = String(picPath || "").trim();
  if (capturePath) cmd.picPath = capturePath;
  bus.fire(BUS.LOCK_CMD, cmd);
}

function persistFaceCapture(picPath) {
  const sourcePath = String(picPath || "").trim();
  if (!sourcePath) return "";
  const targetPath = `${FACE_CAPTURE_DIR}${Date.now()}_${std.genRandomStr(6)}.jpg`;
  try {
    std.ensurePathExists(targetPath);
    const rc = std.rename(sourcePath, targetPath);
    if (rc === 0) {
      log.info("[HomePage] face capture moved", targetPath);
      return targetPath;
    }
    log.error("[HomePage] face capture move failed", sourcePath, targetPath, rc);
  } catch (e) {
    log.error("[HomePage] face capture move failed", sourcePath, targetPath, e);
  }
  return sourcePath;
}

function collectUserCabinetChoices(userId) {
  const uid = String(userId || "").trim();
  const choices = [];
  if (!uid) return choices;

  let longList = [];
  let tempCab = null;
  try {
    if (!isFullTempStrategy()) {
      longList = FitLockDB.listLongTermCabinetsByUser(uid) || [];
    }
    tempCab = FitLockDB.findTempCabinetByUser(uid);
  } catch (e) {
    log.error("[HomePage] collectUserCabinetChoices failed", e);
    return choices;
  }

  for (let i = 0; i < longList.length; i++) {
    const c = longList[i];
    if (!c) continue;
    choices.push({
      kind: "long",
      cabinet: c,
      label: `专属柜${cabinetChoiceLabel(c)}`,
    });
  }

  if (tempCab && tempCab.groupId && tempCab.cabinetId) {
    const dup = longList.some((lt) => isSameCabinet(lt, tempCab));
    if (!dup) {
      choices.push({
        kind: "temp",
        cabinet: tempCab,
        label: `临时柜${cabinetChoiceLabel(tempCab)}`,
      });
    }
  }
  return choices;
}
function safePlayWav(audioModule, path) {
  if (!audioModule || !path) return;
  try {
    audioModule.play(path);
  } catch (e) {
    log.info("[HomePage] play wav failed", path, e);
  }
}

function getCabinetStrategyModeSafe() {
  try {
    const strategy = getCabinetStrategy();
    const mode = Number(strategy && strategy.mode);
    return mode === 1 || mode === 2 ? mode : 0;
  } catch (e) {
    log.error("[HomePage] get cabinetStrategy failed", e);
    return 0;
  }
}

function isFullTempStrategy() {
  return getCabinetStrategyModeSafe() === 1;
}

function isFullLongTermStrategy() {
  return getCabinetStrategyModeSafe() === 2;
}

const HomePage = {
  id: "home",
  _networkInfo: {
    ip: "",
    connected: false,
    netType: "ETH",
  },
  _mqttConnected: false,
  _useMode: false,

  init: function () {
    const parent = UIManager.getRoot();
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, H);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xffffff);

    this.logo = dxui.Image.build(this.id + "_logo", this.root);
    // 参考旧首页：logo 与图片控件同尺寸，使用固定比例避免拉伸
    const logoSize = 256;
    this.logo.source("/app/code/resource/image/logo.png");
    this.logo.setSize(logoSize, logoSize);
    this.logo.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.08));

    this.timeLabel = dxui.Label.build(this.id + "_time", this.root);
    this.timeLabel.textColor(0x666666);
    this.timeLabel.textFont(UIManager.font(Math.round(H * 0.018), dxui.Utils.FONT_STYLE.NORMAL));
    this.timeLabel.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.015), Math.round(H * 0.012));
    this._updateClockText();

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("智能储物柜");
    this.title.textColor(0x222222);
    this.title.textFont(UIManager.font(Math.round(H * 0.055), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.36));

    this.hint = dxui.Label.build(this.id + "_hint", this.root);
    this.hint.text("刷脸即可开柜使用");
    this.hint.textColor(0x777777);
    this.hint.textFont(UIManager.font(Math.round(H * 0.03), dxui.Utils.FONT_STYLE.NORMAL));
    this.hint.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.44));

    // 主按钮改为接近正方形，并整体下移
    const btnSize = Math.round(Math.min(W, H) * 0.30);
    const btnY = Math.round(H * 0.58);
    this._useBtnSize = btnSize;
    this._useBtnY = btnY;
    this.useBtn = dxui.View.build(this.id + "_use_btn", this.root);
    this.useBtn.setSize(btnSize, btnSize);
    this.useBtn.align(dxui.Utils.ALIGN.TOP_MID, 0, btnY);
    this.useBtn.bgColor(0x1e88e5);
    this.useBtn.radius(Math.round(btnSize * 0.5));
    this.useBtn.borderWidth(0);
    this.useBtn.scroll(false);

    this.useBtnLabel = dxui.Label.build(this.id + "_use_btn_label", this.useBtn);
    this.useBtnLabel.text("使用柜子");
    this.useBtnLabel.textColor(0xffffff);
    this.useBtnLabel.textFont(UIManager.font(Math.round(H * 0.036), dxui.Utils.FONT_STYLE.BOLD));
    this.useBtnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // 按钮注意力动画：两层扩散圆环
    this.ring1 = dxui.View.build(this.id + "_ring1", this.root);
    this.ring1.setSize(btnSize, btnSize);
    this.ring1.align(dxui.Utils.ALIGN.TOP_MID, 0, btnY);
    this.ring1.bgOpa(0);
    this.ring1.borderWidth(2);
    this.ring1.setBorderColor(0x1e88e5);
    this.ring1.radius(Math.round(btnSize * 0.5));
    this.ring1.scroll(false);

    this.ring2 = dxui.View.build(this.id + "_ring2", this.root);
    this.ring2.setSize(btnSize, btnSize);
    this.ring2.align(dxui.Utils.ALIGN.TOP_MID, 0, btnY);
    this.ring2.bgOpa(0);
    this.ring2.borderWidth(2);
    this.ring2.setBorderColor(0x1e88e5);
    this.ring2.radius(Math.round(btnSize * 0.5));
    this.ring2.scroll(false);

    this.adminArea = dxui.View.build(this.id + "_admin_area", this.root);
    this.adminArea.setSize(Math.round(W * 0.11), Math.round(H * 0.08));
    this.adminArea.setPos(W - Math.round(W * 0.11), Math.round(H * 0.005));
    this.adminArea.bgOpa(0);
    this.adminArea.borderWidth(0);
    this.adminArea.radius(0);
    this.adminArea.padAll(0);
    this.adminArea.scroll(false);

    this.adminIcon = dxui.Image.build(this.id + "_admin_icon", this.adminArea);
    this.adminIcon.source("/app/code/resource/image/icon_admin.png");
    this.adminIcon.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this.adminArea.hide();

    this.tempCountLabel = dxui.Label.build(this.id + "_temp_count", this.root);
    this.tempCountLabel.text("临时柜: --/--");
    this.tempCountLabel.textColor(0x616161);
    this.tempCountLabel.textFont(UIManager.font(Math.round(H * 0.028), dxui.Utils.FONT_STYLE.NORMAL));
    this.tempCountLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.07));

    this._initStatusBar(W, H);

    // 圆环在按钮上层时，转发点击到同一入口，避免遮挡导致按钮无法点击。
    this.useBtn.on(dxui.Utils.EVENT.CLICK, () => this.enterUseMode());
    this.ring2.on(dxui.Utils.EVENT.CLICK, () => this.enterUseMode());

    this.adminArea.on(dxui.Utils.EVENT.CLICK, () => {
      this.adminArea.hide();
      if (this._adminTimer) {
        std.clearTimeout(this._adminTimer);
        this._adminTimer = null;
      }
      UIManager.open("adminLogin");
    });

    this.root.on(dxui.Utils.EVENT.LONG_PRESSED, () => {
      this.adminArea.show();
      if (this._adminTimer) {
        std.clearTimeout(this._adminTimer);
        this._adminTimer = null;
      }
      this._adminTimer = std.setTimeout(() => {
        this.adminArea.hide();
        this._adminTimer = null;
      }, 5000);
    });

    this._startUseBtnAnim(btnSize, btnY);
    this._startClock();
    this._refreshOpenModelUi();

    this._faceRecHandler = (e) => this._onFaceRecognized(e);

    return this.root;
  },

  _initStatusBar: function (W, H) {
    const barH = Math.round(H * 0.038);
    const barY = H - barH - Math.round(H * 0.01);

    this.statusBar = dxui.View.build(this.id + "_status_bar", this.root);
    this.statusBar.setSize(W, barH);
    this.statusBar.setPos(0, barY);
    this.statusBar.bgOpa(0);
    this.statusBar.borderWidth(0);
    this.statusBar.radius(0);
    this.statusBar.padAll(0);
    this.statusBar.scroll(false);

    this.netIcon = dxui.Image.build(this.id + "_net_icon", this.statusBar);
    this.netIcon.source("/app/code/resource/image/eth_disable.png");
    this.netIcon.setSize(23, 23);
    const iconSize = 23;
    const iconGap = 8;
    const leftX = Math.round(W * 0.02);
    this.netIcon.align(dxui.Utils.ALIGN.LEFT_MID, leftX, 0);

    this.mqttIcon = dxui.Image.build(this.id + "_mqtt_icon", this.statusBar);
    this.mqttIcon.source("/app/code/resource/image/mqtt_disable.png");
    this.mqttIcon.setSize(iconSize, iconSize);
    this.mqttIcon.align(dxui.Utils.ALIGN.LEFT_MID, leftX + iconSize + iconGap, 0);

    this.ipLabel = dxui.Label.build(this.id + "_ip", this.statusBar);
    this.ipLabel.textColor(0x616161);
    this.ipLabel.textFont(UIManager.font(Math.round(H * 0.018), dxui.Utils.FONT_STYLE.NORMAL));
    this.ipLabel.align(dxui.Utils.ALIGN.LEFT_MID, leftX + (iconSize + iconGap) * 2, 0);

    this.snLabel = dxui.Label.build(this.id + "_sn", this.statusBar);
    this.snLabel.textColor(0x616161);
    this.snLabel.textFont(UIManager.font(Math.round(H * 0.018), dxui.Utils.FONT_STYLE.NORMAL));
    this.snLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -Math.round(W * 0.02), 0);

    this._refreshStatusBar();
  },

  _refreshStatusBar: function () {
    const ip = this._getIpAddress();
    const sn = this._getSn();
    const connected = !!this._networkInfo.connected;
    const isWifi = this._networkInfo.netType === "WIFI";
    this.netIcon.source(
      isWifi
        ? (connected ? "/app/code/resource/image/wifi_enable.png" : "/app/code/resource/image/wifi_disable.png")
        : (connected ? "/app/code/resource/image/eth_enable.png" : "/app/code/resource/image/eth_disable.png")
    );
    if (this.mqttIcon) {
      this.mqttIcon.source(
        this._mqttConnected ? "/app/code/resource/image/mqtt_enable.png" : "/app/code/resource/image/mqtt_disable.png"
      );
    }
    this.ipLabel.text(ip || "IP: 未获取");
    this.snLabel.text("SN: " + sn);
  },

  _getIpAddress: function () {
    return this._networkInfo.ip || "";
  },

  _bindNetworkStatus: function () {
    if (this._onNetStatus) return;
    this._onNetStatus = (data) => {
      this.setNetworkInfo(data || {});
    };
    PageState.onNetStatus(this._onNetStatus);
  },

  _bindMqttStatus: function () {
    if (this._onMqttStatus) return;
    this._onMqttStatus = (data) => {
      if (!data || typeof data.connected === "undefined") return;
      this._mqttConnected = !!data.connected;
      this._refreshStatusBar();
    };
    bus.on(BUS.MQTT_CONNECTED, this._onMqttStatus);
  },

  _bindCabinetChanged: function () {
    if (this._onCabinetChanged) return;
    this._onCabinetChanged = () => {
      try {
        this._refreshTempCabinetCount();
      } catch (e) {}
    };
    bus.on(BUS.CABINET_CHANGED, this._onCabinetChanged);
  },

  _syncMqttStatusFromMap: function () {
    try {
      const mqttMap = dxMap.get("MQTT");
      const s = String(mqttMap.get("MQTT_STATUS") || "");
      this._mqttConnected = s === "connected";
    } catch (e) {
      this._mqttConnected = false;
    }
  },

  setNetworkInfo: function (info = {}) {
    this._networkInfo = {
      ip: info.ip || "",
      connected: !!info.connected,
      netType: info.netType === "WIFI" ? "WIFI" : "ETH",
    };
    this._refreshStatusBar();
  },

  _getSn: function () {
    return getDeviceSn("未知");
  },

  _refreshOpenModelUi: function () {
    try {
      const isPin = getOpenModel() === OPEN_MODEL_PIN;
      if (this.hint) {
        this.hint.text(isPin ? "密码即可开柜使用" : "刷脸即可开柜使用");
      }
    } catch (e) {
      log.error("[HomePage] refresh openModel ui failed", e);
    }
  },

  _playAuthResultWav: function (success) {
    const isPin = this._useMode === "pin";
    const path = success
      ? (isPin ? USER_WAV.PWD_OK : USER_WAV.FACE_OK)
      : (isPin ? USER_WAV.PWD_FAIL : USER_WAV.FACE_FAIL);
    safePlayWav(audio, path);
  },

  enterUseMode: function () {
    if (this._useMode) return;
    try {
      const cabinets = FitLockDB.listCabinets({});
      if (!cabinets || !cabinets.length) {
        TipView.showError("尚未配置柜格，请联系管理员", 3);
        safePlayWav(audio, USER_WAV.NO_GROUP);
        return;
      }
    } catch (e) {
      log.error("[HomePage] listCabinets failed", e);
      TipView.showError("柜格数据异常", 2);
      return;
    }
    if (getOpenModel() === OPEN_MODEL_PIN) {
      this.enterPinMode();
      return;
    }
    this.enterFaceMode();
  },

  enterPinMode: function () {
    if (this._useMode) return;
    this._useMode = "pin";
    PinEntryView.start(
      (isCancel) => this.exitPinMode(isCancel),
      (userId) => this._onPinAuthSuccess(userId),
      () => this._playAuthResultWav(false)
    );
    try {
      UIManager.getRoot().hide();
      this.root.hide();
    } catch (e) {}
  },

  _onPinAuthSuccess: function (userId) {
    const uid = String(userId || "").trim();
    if (!uid) return;
    log.info("[HomePage] pin auth success", uid);
    this._playAuthResultWav(true);
    this.exitPinMode(false);
    std.setTimeout(() => {
      this._handleUserAfterRecognized(uid);
    }, 300);
  },

  exitPinMode: function () {
    PinEntryView.hide();
    this._useMode = false;
    try {
      UIManager.getRoot().show();
      this.root.show();
    } catch (e) {}
  },

  enterFaceMode: function () {
    if (this._useMode) return;
    this._useMode = "face";
    PageState.onFaceRecognized(this._faceRecHandler);
    FaceMaskView.start((isCancel) => this.exitFaceMode(isCancel));
    FaceMaskView.setHint("info", "请面向摄像头进行识别");
    try {
      UIManager.getRoot().hide();
      this.root.hide();
    } catch (e) { }
    bus.fire(BUS.FACE_START);
  },

  _onFaceRecognized: function (event) {
    if (this._useMode !== "face") return;
    const userId = event && (event.userId || event.user_id || "");
    if (userId) {
      const uid = String(userId).trim();
      let picPath = String(
        (event && (event.picPath || event.pic_path)) || ""
      ).trim();
      let user = null;
      try {
        user = FitLockDB.getUser(uid);
      } catch (e) {
        log.error("[HomePage] get user after face recognized failed", uid, e);
      }
      if (!user) {
        log.info("[HomePage] face recognized user not found", uid);
        FaceMaskView.setHint("error", "用户不存在，请联系管理员");
        this._playAuthResultWav(false);
        return;
      }
      picPath = persistFaceCapture(picPath);
      log.info("[HomePage] face recognized success", userId);
      if (!picPath) {
        log.error("[HomePage] face recognized without picPath", uid);
      }
      FaceMaskView.setHint("success", "识别成功，欢迎使用");
      this._playAuthResultWav(true);
      std.setTimeout(() => {
        this.exitFaceMode(false);
        this._handleUserAfterRecognized(uid, picPath);
      }, 600);
    } else {
      log.info("[HomePage] face recognized failed");
      FaceMaskView.setHint("error", "识别失败，请重试");
      this._playAuthResultWav(false);
    }
  },

  /**
   * 仅专属柜：校验绑定并弹出「是否打开专属柜」确认框。
   */
  _showExclusiveCabinetConfirm: function (userId, cabinet, picPath) {
    if (!cabinet || !cabinet.groupId || !cabinet.cabinetId) return;
    if (isCabinetLocked(cabinet)) {
      TipView.showError("专属柜已锁定或到期，无法开柜，请联系管理员", 3);
      return;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const endSec = cabinet.endTimestamp != null ? Number(cabinet.endTimestamp) : 0;
    let suffixText = "";
    if (endSec > 0) {
      if (isPastNominalEnd(endSec, nowSec)) {
        suffixText = "，已到期，请尽快归还";
      } else {
        const daysLeft = Math.ceil((endSec - nowSec) / 86400);
        suffixText = `，剩余 ${daysLeft} 天到期`;
      }
    }
    TipView.showConfirm(`您有一个专属柜子（${cabinetLabel(cabinet)}）${suffixText}，是否现在打开？`, {
      type: "warn",
      onConfirm: () => {
        safePlayWav(audio, USER_WAV.PICK);
        requestOpenCabinet(cabinet.groupId, cabinet.cabinetId, userId, picPath);
      },
      onCancel: () => {},
    });
  },

  _onUserCabinetChoiceSelected: function (userId, item, picPath) {
    if (!item) return;
    if (item.kind === "long" && item.cabinet) {
      this._showExclusiveCabinetConfirm(userId, item.cabinet, picPath);
      return;
    }
    if (item.kind === "temp") {
      this._handleTempCabinetFlow(userId, picPath);
    }
  },

  _handleUserAfterRecognized: function (userId, picPath) {
    const uid = String(userId || "").trim();
    if (!uid) return;

    const choices = collectUserCabinetChoices(uid);

    if (choices.length > 1) {
      FixedOrTempChooseView.show({
        items: choices,
        onSelect: (item) =>
          this._onUserCabinetChoiceSelected(uid, item, picPath),
        onCancel: () => {},
      });
      return;
    }

    if (choices.length === 1) {
      this._onUserCabinetChoiceSelected(uid, choices[0], picPath);
      return;
    }

    if (isFullLongTermStrategy()) {
      TipView.showError("您尚未绑定专属柜，请联系管理员", 3);
      safePlayWav(audio, USER_WAV.NO_FREE);
      return;
    }

    this._handleTempCabinetFlow(uid, picPath);
  },

  _appendAccessEvent: function (payload) {
    try {
      bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, payload || {});
    } catch (e) {
      log.error("[HomePage] append access event failed", e);
    }
  },

  _releaseTempCabinetAndOpen: function (userId, groupId, cabinetId, picPath) {
    safePlayWav(audio, USER_WAV.PICK);
    requestOpenCabinet(groupId, cabinetId, userId, picPath);
    try {
      FitLockDB.releaseCabinet(groupId, cabinetId);
    } catch (e) {
      log.error("[HomePage] release cabinet failed", e);
    }
    this._appendAccessEvent({
      eventId: `temp-release-${Date.now()}`,
      userId,
      groupId,
      cabinetId,
      timestamp: Math.floor(Date.now() / 1000),
      type: ACCESS_EVENT_TYPE.TEMP_RELEASE,
    });
    this._refreshTempCabinetCount();
  },

  _handleTempCabinetFlow: function (userId, picPath) {
    let occupied = null;
    try {
      occupied = FitLockDB.findTempCabinetByUser(userId);
    } catch (e) {
      log.error("[HomePage] findTempCabinetByUser failed", e);
    }

    if (occupied && occupied.groupId && occupied.cabinetId) {
      const gid = occupied.groupId;
      const cid = occupied.cabinetId;
      if (isCabinetLocked(occupied)) {
        TipView.showError("您的临时柜已被锁定，无法再使用，请联系管理员处理", 3);
        return;
      }
      const remain = formatTempLockerRemainText(occupied.endTimestamp);
      let descExtra = "";
      if (remain) {
        descExtra = `您的柜子还有约 ${remain} 可用，请及时归还`;
      } else if (isPastNominalEnd(occupied.endTimestamp)) {
        descExtra = "已到期，请尽快归还";
      }
      if (isTempRetainPickupEnabled(getTempPickupMode())) {
        PickChooseView.show({
          descExtra,
          onTemp: () => {
            safePlayWav(audio, USER_WAV.PICK);
            requestOpenCabinet(gid, cid, userId, picPath);
          },
          onRelease: () =>
            this._releaseTempCabinetAndOpen(userId, gid, cid, picPath),
        });
        return;
      }

      const label = cabinetLabel(occupied);
      let suffix = "";
      if (descExtra) suffix = `，${descExtra}`;
      TipView.showConfirm(`您已占用临时柜（${label}）${suffix}，是否取物？确认后将开柜并归还该柜。`, {
        type: "warn",
        onConfirm: () =>
          this._releaseTempCabinetAndOpen(userId, gid, cid, picPath),
        onCancel: () => {},
      });
      return;
    }

    if (isFullLongTermStrategy()) {
      TipView.showError("您尚未绑定专属柜，请联系管理员", 3);
      safePlayWav(audio, USER_WAV.NO_FREE);
      return;
    }

    let freeCab = null;
    try {
      freeCab = FitLockDB.findAvailableTempCabinet();
    } catch (e) {
      log.error("[HomePage] findAvailableTempCabinet failed", e);
    }
    if (!freeCab) {
      TipView.showError("临时柜已满，请稍后再试", 2);
      safePlayWav(audio, USER_WAV.NO_FREE);
      return;
    }

    const sinceSec = Math.floor(Date.now() / 1000);
    let endSec;
    try {
      endSec = computeTempEndTime(sinceSec, getLockRule());
    } catch (e) {
      log.error("[HomePage] compute end time failed", e);
      endSec = computeTempEndTime(sinceSec, null);
    }
    const label = cabinetLabel(freeCab);
    const deadlineHint = formatLocalDateTime(endSec);
    TipView.showConfirm(
      `已为您分配临时柜 ${label}，请在 ${deadlineHint} 前归还，是否现在开柜存物？`,
      {
        type: "warn",
        onConfirm: () => {
          safePlayWav(audio, USER_WAV.PICK);
          requestOpenCabinet(
            freeCab.groupId,
            freeCab.cabinetId,
            userId,
            picPath
          );
          try {
            FitLockDB.occupyTempCabinet(freeCab.groupId, freeCab.cabinetId, userId, sinceSec, endSec);
          } catch (e) {
            log.error("[HomePage] occupy temp cabinet failed", e);
          }
          this._appendAccessEvent({
            eventId: `temp-occupy-${Date.now()}`,
            userId,
            groupId: freeCab.groupId,
            cabinetId: freeCab.cabinetId,
            timestamp: sinceSec,
            type: ACCESS_EVENT_TYPE.TEMP_OCCUPY,
            extra: { startTimestamp: sinceSec, endTimestamp: endSec },
          });
          this._refreshTempCabinetCount();
        },
      }
    );
  },

  _refreshTempCabinetCount: function () {
    try {
      const stats = FitLockDB.countTempCabinetStats();
      if (!stats.total) {
        this.tempCountLabel.text("临时柜: --/--");
        return;
      }
      this.tempCountLabel.text(`临时柜: ${stats.free}/${stats.total}`);
    } catch (e) {
      log.error("[HomePage] refresh temp count failed", e);
      this.tempCountLabel.text("临时柜: --/--");
    }
  },

  exitFaceMode: function () {
    PageState.offFaceRecognized(this._faceRecHandler);
    bus.fire(BUS.FACE_STOP);
    this._useMode = false;
    FaceMaskView.hide();
    try {
      UIManager.getRoot().show();
      this.root.show();
    } catch (e) { }
  },

  _startUseBtnAnim: function (baseSize, yPos) {
    let tick = 0;
    if (this._ringTimer) {
      std.clearInterval(this._ringTimer);
      this._ringTimer = null;
    }

    this._ringTimer = std.setInterval(() => {
      tick += 1;
      const phase1 = tick % 40;
      const phase2 = (tick + 20) % 40;
      this._updateRing(this.ring1, baseSize, yPos, phase1);
      this._updateRing(this.ring2, baseSize, yPos, phase2);
    }, 50);
  },

  _updateRing: function (ring, baseSize, yPos, phase) {
    const scale = 1 + (phase / 40) * 0.35;
    const size = Math.round(baseSize * scale);
    ring.setSize(size, size);
    ring.radius(Math.round(size * 0.5));
    ring.align(dxui.Utils.ALIGN.TOP_MID, 0, yPos - Math.round((size - baseSize) / 2));
    ring.borderWidth(phase < 34 ? 2 : 0);
  },

  _updateClockText: function () {
    const d = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const text =
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes()) +
      ":" +
      pad(d.getSeconds());
    this.timeLabel.text(text);
  },

  _startClock: function () {
    if (this._clockTimer) {
      std.clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
    this._clockTimer = std.setInterval(() => this._updateClockText(), 1000);
  },

  onHide: function () {
    try {
      PinEntryView.hide();
    } catch (e0) {}
    if (this._useMode === "face") {
      this.exitFaceMode();
    } else if (this._useMode === "pin") {
      this.exitPinMode();
    }
    try {
      PickChooseView.hide();
    } catch (e) {}
    try {
      FixedOrTempChooseView.hide();
    } catch (e2) {}
    if (this._ringTimer) {
      std.clearInterval(this._ringTimer);
      this._ringTimer = null;
    }
    if (this._clockTimer) {
      std.clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
    if (this._adminTimer) {
      std.clearTimeout(this._adminTimer);
      this._adminTimer = null;
    }
  },

  onShow: function () {
    this._bindNetworkStatus();
    this._bindMqttStatus();
    this._bindCabinetChanged();
    this._syncMqttStatusFromMap();
    const status = PageState.getNetStatus();
    if (status) {
      this.setNetworkInfo(status);
    }
    if (this._useBtnSize && typeof this._useBtnY === "number") {
      this._startUseBtnAnim(this._useBtnSize, this._useBtnY);
    }
    this._updateClockText();
    this._startClock();
    this._refreshStatusBar();
    this._refreshTempCabinetCount();
    this._refreshOpenModelUi();
  },
};

export default HomePage;

