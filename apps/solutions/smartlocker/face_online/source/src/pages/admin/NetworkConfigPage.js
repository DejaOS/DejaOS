import dxui from "../../../dxmodules/dxUi.js";
import log from "../../mylogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import dxNetwork from "../../../dxmodules/dxNetwork.js";
import std from "../../../dxmodules/dxStd.js";
import bus from "../../../dxmodules/dxEventBus.js";
import dxMap from "../../../dxmodules/dxMap.js";
import UIManager from "../../UIManager.js";
import KeyboardView from "../KeyboardView.js";
import TipView from "../TipView.js";
import WaitingView from "../WaitingView.js";
import PageState from "../PageState.js";
import ConfigService from "../../lock/ConfigService.js";
import { ADMIN_LAYOUT, BUS, COLORS, UI_FONT_RATIO } from "../../constants.js";

/** 仅网络配置页：选项按钮、输入框、状态点等专用色 */
const NET_COLORS = {
  optionInactive: 0xe8e8e8,
  optionInactiveText: 0x616161,
  inputBg: 0xf7f7f7,
  inputBorder: 0xd0d0d0,
  danger: 0xe53935,
  success: 0x43a047,
  info: 0x1e88e5,
};

/** 软键盘顶部左侧显示的短标题（与页面左侧长文案分开） */
const KB_FIELD_TITLE = {
  ssid: "SSID",
  psk: "Wi-Fi密码",
  ip: "IP地址",
  mask: "子网掩码",
  gw: "默认网关",
  dns: "DNS",
  mqttHost: "MQTT地址",
  mqttPort: "端口",
  mqttUser: "用户名",
  mqttPass: "密码",
};

/** 本页「取消」略大于其它管理页的 adminCancel */
const NETWORK_CANCEL_FONT_RATIO = 0.027;

const NetworkConfigPage = {
  id: "adminNetworkConfig",
  _netType: "ETH",
  _dhcp: true,
  _activeInputKey: null,
  _activeInputBox: null,
  _inputs: {},
  _connectTimer: null,
  _waitingConnect: false,
  _onNetStatus: null,
  _mqttTestPollTimer: null,
  _mqttTestTimeoutTimer: null,

  /** 布局常量（绝对坐标自上而下累加） */
  _padX: 24,
  _labelW: 140,
  _rowH: 64,
  _sectionGap: 24,

  _config: {
    ssid: "",
    psk: "",
    ip: "",
    mask: "",
    gw: "",
    dns: "",
    mqttHost: "",
    mqttPort: "1883",
    mqttUser: "",
    mqttPass: "",
  },

  init: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, H);
    this.root.bgColor(COLORS.cardBg);
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
    this.btnCancelLabel.textFont(UIManager.font(Math.round(H * NETWORK_CANCEL_FONT_RATIO), dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("网络配置");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    const contentTop = Math.round(H * (0.11 - ADMIN_LAYOUT.contentShiftRatio));
    const contentH = H - contentTop;

    this.content = dxui.View.build(this.id + "_content", this.root);
    this.content.setSize(W, contentH);
    this.content.setPos(0, contentTop);
    this.content.bgColor(COLORS.cardBg);
    this.content.radius(0);
    this.content.scroll(true);
    this.content.padAll(0);

    this._buildAllWidgets(W);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => UIManager.open("adminHome"));
    this.root.on(dxui.Utils.EVENT.CLICK, () => {
      if (KeyboardView.isVisible()) {
        KeyboardView.hide();
      }
    });

    this.refreshLayout();

    return this.root;
  },

  /** 点击 Done 时做单字段校验（复杂校验仍在连接/测试前统一做） */
  _validateFieldForKeyboard: function (key, text) {
    const t = String(text || "").trim();
    const isIPv4 = (v) => {
      const s = String(v || "").trim();
      const parts = s.split(".");
      if (parts.length !== 4) return false;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!/^\d+$/.test(p)) return false;
        const n = Number(p);
        if (!Number.isFinite(n) || n < 0 || n > 255) return false;
      }
      return true;
    };

    if (key === "ssid" && this._netType === "WIFI" && !t) {
      return { ok: false, message: "SSID 不能为空" };
    }
    if (key === "mqttPort") {
      if (!t) return { ok: true };
      const n = parseInt(t, 10);
      if (!Number.isFinite(n) || n < 1 || n > 65535) {
        return { ok: false, message: "端口应为 1～65535" };
      }
    }
    if (key === "mqttHost" && !t) {
      return { ok: false, message: "MQTT 地址不能为空" };
    }
    if (key === "psk" && this._netType === "WIFI" && t.length > 0 && t.length < 8) {
      return { ok: false, message: "Wi-Fi 密码至少 8 位" };
    }
    if ((key === "ip" || key === "mask" || key === "gw" || key === "dns") && !this._dhcp) {
      if (!t) {
        return { ok: false, message: "静态网络下该项不能为空" };
      }
      if (!isIPv4(t)) {
        return { ok: false, message: "请输入合法 IPv4 地址（如 192.168.1.10）" };
      }
    }
    return { ok: true };
  },

  _inputX: function (W) {
    return this._padX + this._labelW + 18;
  },

  _inputW: function (W) {
    return W - this._inputX(W) - this._padX;
  },

  _buildAllWidgets: function (W) {
    const c = this.content;
    const ix = this._inputX(W);
    const iw = this._inputW(W);

    this.netTitleLabel = dxui.Label.build(this.id + "_net_t", c);
    this.netTitleLabel.text("网络设置");
    this.netTitleLabel.textFont(UIManager.font(26, dxui.Utils.FONT_STYLE.BOLD));
    this.netTitleLabel.textColor(COLORS.primary);

    this.netStatusDot = dxui.View.build(this.id + "_net_dot", c);
    this.netStatusDot.setSize(18, 18);
    this.netStatusDot.radius(9);
    this.netStatusDot.bgColor(NET_COLORS.danger);
    this.netStatusDot.borderWidth(0);
    this.netStatusDot.scroll(false);

    this.connectBtn = dxui.Button.build(this.id + "_connect_btn", c);
    this.connectBtn.setSize(210, 54);
    this.connectBtn.bgColor(COLORS.primary);
    this.connectBtn.radius(27);
    this.connectBtn.borderWidth(0);
    const connLabel = dxui.Label.build(this.id + "_conn_lbl", this.connectBtn);
    connLabel.text("连接网络");
    connLabel.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.BOLD));
    connLabel.textColor(0xffffff);
    connLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this.connectBtn.on(dxui.Utils.EVENT.CLICK, () => this.handleConnect());

    this.lblNetType = this._mkLabel("网络类型", "lbl_net_type");
    this.ethBtn = this._mkOptionBtn("以太网", "eth", () => this.setNetType("ETH"));
    this.wifiBtn = this._mkOptionBtn("WIFI", "wifi", () => this.setNetType("WIFI"));

    this.lblSsid = this._mkLabel("SSID", "lbl_ssid");
    this.ssidInput = this._mkInput("请输入 SSID", ix, 0, iw, "ssid");

    this.lblPsk = this._mkLabel("Wi-Fi 密码", "lbl_psk");
    this.pskInput = this._mkInput("密码至少 8 位", ix, 0, iw, "psk");

    this.lblDhcp = this._mkLabel("DHCP", "lbl_dhcp");
    this.dhcpYesBtn = this._mkOptionBtn("是", "dhcp_y", () => this.setDHCP(true));
    this.dhcpNoBtn = this._mkOptionBtn("否", "dhcp_n", () => this.setDHCP(false));

    this.lblIp = this._mkLabel("IP 地址", "lbl_ip");
    this.ipInput = this._mkInput("0.0.0.0", ix, 0, iw, "ip");
    this.lblMask = this._mkLabel("子网掩码", "lbl_mask");
    this.maskInput = this._mkInput("255.255.255.0", ix, 0, iw, "mask");
    this.lblGw = this._mkLabel("默认网关", "lbl_gw");
    this.gwInput = this._mkInput("0.0.0.0", ix, 0, iw, "gw");
    this.lblDns = this._mkLabel("DNS", "lbl_dns");
    this.dnsInput = this._mkInput("8.8.8.8", ix, 0, iw, "dns");

    this.mqttTitleLabel = dxui.Label.build(this.id + "_mqtt_t", c);
    this.mqttTitleLabel.text("MQTT 服务");
    this.mqttTitleLabel.textFont(UIManager.font(26, dxui.Utils.FONT_STYLE.BOLD));
    this.mqttTitleLabel.textColor(COLORS.primary);

    this.testBtn = dxui.Button.build(this.id + "_test_btn", c);
    this.testBtn.setSize(210, 54);
    this.testBtn.bgColor(NET_COLORS.info);
    this.testBtn.radius(27);
    this.testBtn.borderWidth(0);
    const testLabel = dxui.Label.build(this.id + "_test_lbl", this.testBtn);
    testLabel.text("连接MQTT");
    testLabel.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.BOLD));
    testLabel.textColor(0xffffff);
    testLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this.testBtn.on(dxui.Utils.EVENT.CLICK, () => this.handleTest());

    this.lblMqttHost = this._mkLabel("MQTT 地址", "lbl_mqtt_host");
    this.mqttHostInput = this._mkInput("例如 192.168.1.10", ix, 0, iw, "mqttHost");

    this.lblMqttPort = this._mkLabel("端口", "lbl_mqtt_port");
    this.mqttPortInput = this._mkInput("1883", ix, 0, 192, "mqttPort");

    this.lblMqttUser = this._mkLabel("用户名", "lbl_mqtt_user");
    this.mqttUserInput = this._mkInput("可选", ix, 0, iw, "mqttUser");

    this.lblMqttPass = this._mkLabel("密码", "lbl_mqtt_pass");
    this.mqttPassInput = this._mkInput("可选", ix, 0, iw, "mqttPass");
  },

  _mkLabel: function (text, suffix) {
    const l = dxui.Label.build(this.id + "_" + suffix, this.content);
    l.text(text);
    l.textFont(UIManager.font(21, dxui.Utils.FONT_STYLE.NORMAL));
    l.textColor(COLORS.text);
    return l;
  },

  _mkOptionBtn: function (text, suffix, onClick) {
    const btn = dxui.Button.build(this.id + "_opt_" + suffix, this.content);
    btn.setSize(150, 54);
    btn.radius(12);
    btn.borderWidth(0);
    const lbl = dxui.Label.build(this.id + "_opt_l_" + suffix, btn);
    lbl.text(text);
    lbl.textFont(UIManager.font(19, dxui.Utils.FONT_STYLE.NORMAL));
    lbl.textColor(NET_COLORS.optionInactiveText);
    lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    btn._captionLabel = lbl;
    btn.on(dxui.Utils.EVENT.CLICK, onClick);
    return btn;
  },

  _mkInput: function (placeholder, x, y, w, key) {
    const inputH = 58;
    const fontInput = 21;

    const maxLenByKey = {
      ssid: 64,
      psk: 64,
      ip: 45,
      mask: 45,
      gw: 45,
      dns: 45,
      mqttHost: 128,
      mqttPort: 5,
      mqttUser: 64,
      mqttPass: 64,
    };
    const maxLen = maxLenByKey[key] || 96;
    const kbTitle = KB_FIELD_TITLE[key] || key;

    const box = dxui.View.build(this.id + "_input_" + key, this.content);
    box.setSize(w, inputH);
    box.setPos(x, y);
    box.bgColor(NET_COLORS.inputBg);
    box.radius(12);
    box.borderWidth(1);
    box.setBorderColor(NET_COLORS.inputBorder);
    box.scroll(false);

    const valLabel = dxui.Label.build(this.id + "_val_" + key, box);
    valLabel.textFont(UIManager.font(fontInput, dxui.Utils.FONT_STYLE.NORMAL));
    valLabel.align(dxui.Utils.ALIGN.LEFT_MID, 16, 0);

    const syncVal = () => {
      const v = this._config[key];
      valLabel.text(v ? v : placeholder);
      valLabel.textColor(v ? COLORS.text : COLORS.textSecondary);
    };
    syncVal();

    box.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._activeInputBox) this._activeInputBox.setBorderColor(NET_COLORS.inputBorder);
      this._activeInputKey = key;
      this._activeInputBox = box;
      box.setBorderColor(COLORS.primary);

      KeyboardView.show({
        fieldLabel: kbTitle,
        initialText: String(this._config[key] || ""),
        maxLength: maxLen,
        passwordMode: false,
        validate: (text) => this._validateFieldForKeyboard(key, text),
        onCommit: (text) => {
          this._config[key] = text != null ? String(text) : "";
          syncVal();
        },
        afterHide: () => {
          if (this._activeInputBox) this._activeInputBox.setBorderColor(NET_COLORS.inputBorder);
          this._activeInputBox = null;
          this._activeInputKey = null;
        },
      });
    });

    this._inputs[key] = { box, valLabel, placeholder };

    return box;
  },

  refreshLayout: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const px = this._padX;
    const rh = this._rowH;
    const ix = this._inputX(W);
    const iw = this._inputW(W);
    let y = 18;

    const hdr = 58;
    const ih = 58;
    const opt2 = ix + 150 + 12;
    const optYOff = Math.round((rh - 54) / 2);
    const inpYOff = Math.round((rh - ih) / 2);

    const placeRowLabel = (lbl, yRow) => {
      lbl.setPos(px, yRow + Math.round((rh - 28) / 2));
    };

    const cw = 210;
    const ch = 54;
    const dotSz = 18;

    this.netTitleLabel.setPos(px, y);
    this.netStatusDot.setPos(W - px - cw - 4 - dotSz, y + Math.round((hdr - dotSz) / 2));
    this.connectBtn.setPos(W - px - cw, y + Math.round((hdr - ch) / 2));
    y += hdr + this._sectionGap;

    placeRowLabel(this.lblNetType, y);
    this.ethBtn.setPos(ix, y + optYOff);
    this.wifiBtn.setPos(opt2, y + optYOff);
    y += rh;

    const showWifi = this._netType === "WIFI";
    if (showWifi) {
      placeRowLabel(this.lblSsid, y);
      this.ssidInput.setSize(iw, ih);
      this.ssidInput.setPos(ix, y + inpYOff);
      this.lblSsid.show();
      this.ssidInput.show();
      y += rh;

      placeRowLabel(this.lblPsk, y);
      this.pskInput.setSize(iw, ih);
      this.pskInput.setPos(ix, y + inpYOff);
      this.lblPsk.show();
      this.pskInput.show();
      y += rh;
    } else {
      this.lblSsid.hide();
      this.ssidInput.hide();
      this.lblPsk.hide();
      this.pskInput.hide();
    }

    placeRowLabel(this.lblDhcp, y);
    this.dhcpYesBtn.setPos(ix, y + optYOff);
    this.dhcpNoBtn.setPos(opt2, y + optYOff);
    this.ethBtn.bgColor(this._netType === "ETH" ? COLORS.primary : NET_COLORS.optionInactive);
    this.wifiBtn.bgColor(this._netType === "WIFI" ? COLORS.primary : NET_COLORS.optionInactive);
    this._styleOptionLabel(this.ethBtn, this._netType === "ETH");
    this._styleOptionLabel(this.wifiBtn, this._netType === "WIFI");
    this.dhcpYesBtn.bgColor(this._dhcp ? COLORS.primary : NET_COLORS.optionInactive);
    this.dhcpNoBtn.bgColor(!this._dhcp ? COLORS.primary : NET_COLORS.optionInactive);
    this._styleOptionLabel(this.dhcpYesBtn, this._dhcp);
    this._styleOptionLabel(this.dhcpNoBtn, !this._dhcp);
    y += rh;

    const showStatic = !this._dhcp;
    if (showStatic) {
      const rows = [
        [this.lblIp, this.ipInput],
        [this.lblMask, this.maskInput],
        [this.lblGw, this.gwInput],
        [this.lblDns, this.dnsInput],
      ];
      for (let i = 0; i < rows.length; i++) {
        const lbl = rows[i][0];
        const inp = rows[i][1];
        placeRowLabel(lbl, y);
        inp.setSize(iw, ih);
        inp.setPos(ix, y + inpYOff);
        lbl.show();
        inp.show();
        y += rh;
      }
    } else {
      [this.lblIp, this.ipInput, this.lblMask, this.maskInput, this.lblGw, this.gwInput, this.lblDns, this.dnsInput].forEach(
        (w) => w.hide()
      );
    }

    y += 8;
    this.mqttTitleLabel.setPos(px, y);
    this.testBtn.setPos(W - px - cw, y + Math.round((hdr - ch) / 2));
    y += hdr + this._sectionGap;

    placeRowLabel(this.lblMqttHost, y);
    this.mqttHostInput.setSize(iw, ih);
    this.mqttHostInput.setPos(ix, y + inpYOff);
    y += rh;

    placeRowLabel(this.lblMqttPort, y);
    this.mqttPortInput.setSize(192, ih);
    this.mqttPortInput.setPos(ix, y + inpYOff);
    y += rh;

    placeRowLabel(this.lblMqttUser, y);
    this.mqttUserInput.setSize(iw, ih);
    this.mqttUserInput.setPos(ix, y + inpYOff);
    y += rh;

    placeRowLabel(this.lblMqttPass, y);
    this.mqttPassInput.setSize(iw, ih);
    this.mqttPassInput.setPos(ix, y + inpYOff);
    y += rh;

    const bottomPad = 64;
    this.content.setSize(W, y + bottomPad);
  },

  _styleOptionLabel: function (btn, active) {
    const lbl = btn && btn._captionLabel;
    if (!lbl || typeof lbl.textColor !== "function") return;
    lbl.textColor(active ? 0xffffff : NET_COLORS.optionInactiveText);
  },

  setNetType: function (type) {
    if (this._netType === type) return;
    this._netType = type;
    this.refreshLayout();
  },

  setDHCP: function (val) {
    if (this._dhcp === val) return;
    this._dhcp = val;
    this.refreshLayout();
  },

  persistSettingsToDisk: function () {
    ConfigService.setNetworkConfig({
      netType: this._netType,
      dhcp: this._dhcp,
      ssid: this._config.ssid || "",
      psk: this._config.psk || "",
      ip: this._config.ip || "",
      mask: this._config.mask || "",
      gw: this._config.gw || "",
      dns: this._config.dns || "",
    });
    ConfigService.setMqttConfig({
      host: this._config.mqttHost || "",
      port: this._config.mqttPort || "1883",
      user: this._config.mqttUser || "",
      pass: this._config.mqttPass || "",
    });
  },

  handleConnect: function () {
    if (!this.validateNetConfig()) {
      return;
    }
    this.netStatusDot.bgColor(NET_COLORS.danger);

    this.persistSettingsToDisk();
    bus.fire(BUS.NET_CONNECT_REQUEST);

    this._waitingConnect = true;
    WaitingView.show("正在连接网络...");

    if (this._connectTimer) {
      std.clearTimeout(this._connectTimer);
      this._connectTimer = null;
    }
    this._connectTimer = std.setTimeout(() => {
      if (this._waitingConnect) {
        this._waitingConnect = false;
        WaitingView.hide();
        TipView.showError("连接超时，请检查网络配置");
      }
    }, 30000);
  },

  validateNetConfig: function () {
    if (this._netType === "WIFI") {
      if (!this._config.ssid || !this._config.psk) {
        TipView.showError("SSID 和 WIFI 密码不能为空");
        return false;
      }
      if (String(this._config.psk).length < 8) {
        TipView.showError("WIFI 密码长度不能小于 8 位");
        return false;
      }
    }

    if (!this._dhcp) {
      if (!this._config.ip || !this._config.mask || !this._config.gw || !this._config.dns) {
        TipView.showError("IP、子网掩码、网关、DNS 不能为空");
        return false;
      }
    }
    return true;
  },

  handleTest: function () {
    const host = String(this._config.mqttHost || "").trim();
    const portStr = String(this._config.mqttPort || "1883").trim();
    if (!host) {
      TipView.showError("请先填写 MQTT 地址");
      return;
    }
    const port = parseInt(portStr, 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      TipView.showError("端口应为 1～65535 的数字");
      return;
    }

    this.persistSettingsToDisk();
    bus.fire(BUS.MQTT_REINIT);

    const mqttMap = dxMap.get("MQTT");
    this._clearMqttTestWaiters();
    WaitingView.show("正在重连 MQTT...");

    this._mqttTestPollTimer = std.setInterval(() => {
      const s = String(mqttMap.get("MQTT_STATUS") || "");
      if (s === "connected") {
        this._clearMqttTestWaiters();
        WaitingView.hide();
        TipView.showSuccess("MQTT 连接成功");
      }
    }, 500);

    this._mqttTestTimeoutTimer = std.setTimeout(() => {
      this._clearMqttTestWaiters();
      WaitingView.hide();
      TipView.showError("MQTT 连接超时，请检查地址/端口/账号密码");
    }, 60000);
  },

  _clearMqttTestWaiters: function () {
    if (this._mqttTestPollTimer) {
      std.clearInterval(this._mqttTestPollTimer);
      this._mqttTestPollTimer = null;
    }
    if (this._mqttTestTimeoutTimer) {
      std.clearTimeout(this._mqttTestTimeoutTimer);
      this._mqttTestTimeoutTimer = null;
    }
  },

  loadConfigFromStore: function () {
    const net = ConfigService.getNetworkConfig();
    const mq = ConfigService.getMqttConfig();

    this._netType = net.netType === "WIFI" ? "WIFI" : "ETH";
    this._dhcp = !!net.dhcp;

    this._config.ssid = net.ssid || "";
    this._config.psk = net.psk || "";
    this._config.ip = net.ip || "";
    this._config.mask = net.mask || "";
    this._config.gw = net.gw || "";
    this._config.dns = net.dns || "";

    this._config.mqttHost = mq.host || "";
    this._config.mqttPort = String(mq.port || "1883");
    this._config.mqttUser = mq.user || "";
    this._config.mqttPass = mq.pass || "";

    Object.keys(this._inputs).forEach((key) => {
      const item = this._inputs[key];
      if (!item || !item.valLabel) return;
      const value = String(this._config[key] || "");
      item.valLabel.text(value || item.placeholder);
      item.valLabel.textColor(value ? COLORS.text : COLORS.textSecondary);
    });
  },

  onHide: function () {
    KeyboardView.hide();
    if (this._activeInputBox) this._activeInputBox.setBorderColor(NET_COLORS.inputBorder);
    if (this._connectTimer) {
      std.clearTimeout(this._connectTimer);
      this._connectTimer = null;
    }
    this._waitingConnect = false;
    this._clearMqttTestWaiters();
    WaitingView.hide();
  },

  onShow: function () {
    this.loadConfigFromStore();
    this.refreshLayout();

    if (dxNetwork && dxNetwork.isConnected && dxNetwork.isConnected()) {
      this.netStatusDot.bgColor(NET_COLORS.success);
    } else {
      this.netStatusDot.bgColor(NET_COLORS.danger);
    }

    if (!this._onNetStatus) {
      this._onNetStatus = (data) => {
        if (!data || typeof data.connected === "undefined") {
          return;
        }

        if (!data.connected) {
          this.netStatusDot.bgColor(NET_COLORS.danger);
        }
        if (data.connected) {
          this.netStatusDot.bgColor(NET_COLORS.success);
          if (this._waitingConnect) {
            this._waitingConnect = false;
            if (this._connectTimer) {
              std.clearTimeout(this._connectTimer);
              this._connectTimer = null;
            }
            WaitingView.hide();
            TipView.showSuccess("网络连接成功");
          }
        }
      };
      PageState.onNetStatus(this._onNetStatus);
    }
  },
};

export default NetworkConfigPage;
