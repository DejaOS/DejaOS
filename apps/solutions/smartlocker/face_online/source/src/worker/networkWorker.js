import std from "../../dxmodules/dxStd.js";
import dxNetwork from "../../dxmodules/dxNetwork.js";
import log from "../mylogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import { loadNetworkSettings, saveNetworkSettings } from "../db/FitLockService.js";
import { BUS } from "../constants.js";

/**
 * networkWorker：维护以太网 / Wi-Fi（无 HTTP 心跳）。
 * 网络参数经 FitLockService 持久化；MQTT 连通性由 mqttWorker 负责。
 */

const TICK_MS = 500;

let shouldReconnect = true;
let lastConnected = false;
let lastIp = "";
let lastNetType = "ETH";

function asBool(v, def) {
  if (v === true || v === "1" || v === "true") return true;
  if (v === false || v === "0" || v === "false") return false;
  return def;
}

function getNetConfig() {
  const s = loadNetworkSettings();
  return {
    netType: s.netType === "WIFI" ? "WIFI" : "ETH",
    dhcp: asBool(s.dhcp, true),
    ssid: String(s.ssid || ""),
    psk: String(s.psk || ""),
    ip: String(s.ip || ""),
    mask: String(s.mask || ""),
    gw: String(s.gw || ""),
    dns: String(s.dns || ""),
  };
}

function connectNetwork() {
  try {
    log.info("[networkWorker] connectNetwork.....................");
    const cfg = getNetConfig();
    let res = 0;

    if (cfg.netType === "ETH") {
      if (cfg.dhcp) {
        res = dxNetwork.connectEthWithDHCP();
      } else {
        if (!cfg.ip || !cfg.gw || !cfg.mask) {
          log.error("[networkWorker] 以太网静态配置不完整");
          return;
        }
        res = dxNetwork.connectEth({
          ip: cfg.ip,
          gateway: cfg.gw,
          netmask: cfg.mask,
          dns: cfg.dns,
        });
      }
    } else {
      if (cfg.dhcp) {
        res = dxNetwork.connectWifiWithDHCP(cfg.ssid, cfg.psk);
      } else {
        if (!cfg.ip || !cfg.gw || !cfg.mask) {
          log.error("[networkWorker] WiFi 静态配置不完整");
          return;
        }
        res = dxNetwork.connectWifi(cfg.ssid, cfg.psk, {
          ip: cfg.ip,
          gateway: cfg.gw,
          netmask: cfg.mask,
          dns: cfg.dns,
        });
      }
    }
    log.info("[networkWorker] connectNetwork 结果", res);
    if (res < 0) {
      shouldReconnect = true;
    }
  } catch (e) {
    log.error("[networkWorker] connectNetwork 异常", e);
  }
}

function tickNetwork() {
  const cfg = getNetConfig();
  const netType = cfg.netType === "WIFI" ? "WIFI" : "ETH";

  try {
    if (typeof dxNetwork.getNative === "function" && dxNetwork.getNative()) {
      dxNetwork.loop();
    }
  } catch (e) {
    log.error("[networkWorker] net.loop 异常", e);
  }

  if (shouldReconnect) {
    shouldReconnect = false;
    connectNetwork();
  }

  const connected = dxNetwork.isConnected();
  let ip = "";
  if (connected) {
    try {
      const param = dxNetwork.getNetParam && dxNetwork.getNetParam();
      if (param) {
        const actual = {
          ip: String(param.ip || ""),
          mask: String(param.netmask || ""),
          gw: String(param.gateway || ""),
          dns: String(param.dns || ""),
        };
        ip = actual.ip;
        if (
          cfg.dhcp &&
          (
            actual.ip !== cfg.ip ||
            actual.mask !== cfg.mask ||
            actual.gw !== cfg.gw ||
            actual.dns !== cfg.dns
          )
        ) {
          saveNetworkSettings(actual);
        }
      }
    } catch (e) {
      log.error("[networkWorker] 获取网络参数失败", e);
    }
  }

  if (connected !== lastConnected || ip !== lastIp || netType !== lastNetType) {
    lastConnected = connected;
    lastIp = ip;
    lastNetType = netType;
    bus.fire(BUS.NET_STATUS, { connected, ip, netType });
  }
}

try {
  log.info("[networkWorker] 启动");

  bus.on(BUS.NET_CONNECT_REQUEST, () => {
    shouldReconnect = true;
  });

  dxNetwork.init();
  shouldReconnect = true;

  std.setInterval(() => {
    try {
      tickNetwork();
    } catch (e) {
      log.error("[networkWorker] tick 异常", e);
    }
  }, TICK_MS);

} catch (e) {
  log.error("[networkWorker] 启动失败", e);
}
