import bus from "../../dxmodules/dxEventBus.js";
import { BUS } from "../constants.js";

const PageState = {
  _inited: false,
  _netStatusListeners: new Set(),
  _netStatus: { connected: false, ip: "", netType: "ETH" },

  /** 人脸识别结果：多页面可同时订阅，避免 dxEventBus 同 topic 仅保留最后一个 handler */
  _faceRecognizedListeners: new Set(),
  _faceRecognizedBridge: false,

  _ensureFaceRecognizedBridge: function () {
    if (PageState._faceRecognizedBridge) return;
    bus.on(BUS.FACE_RECOGNIZED, (event) => {
      PageState._faceRecognizedListeners.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {}
      });
    });
    PageState._faceRecognizedBridge = true;
  },

  /**
   * @param {(event: object) => void} cb
   */
  onFaceRecognized: function (cb) {
    if (!cb || typeof cb !== "function") return;
    PageState._ensureFaceRecognizedBridge();
    PageState._faceRecognizedListeners.add(cb);
  },

  /**
   * @param {(event: object) => void} cb 须与 onFaceRecognized 传入同一引用
   */
  offFaceRecognized: function (cb) {
    if (!cb) return;
    PageState._faceRecognizedListeners.delete(cb);
    if (PageState._faceRecognizedListeners.size === 0 && PageState._faceRecognizedBridge) {
      try {
        bus.off(BUS.FACE_RECOGNIZED);
      } catch (e) {}
      PageState._faceRecognizedBridge = false;
    }
  },

  _init: function () {
    if (this._inited) return;
    this._inited = true;
    bus.on(BUS.NET_STATUS, (data) => {
      if (!data || typeof data.connected === "undefined") return;
      this._netStatus = {
        connected: !!data.connected,
        ip: data.ip ? String(data.ip) : "",
        netType: data.netType === "WIFI" ? "WIFI" : "ETH",
      };
      this._netStatusListeners.forEach((cb) => {
        try {
          cb(this._netStatus);
        } catch (e) {}
      });
    });
  },

  onNetStatus: function (cb) {
    if (!cb) return;
    this._init();
    this._netStatusListeners.add(cb);
  },

  offNetStatus: function (cb) {
    if (!cb) return;
    this._netStatusListeners.delete(cb);
  },

  getNetStatus: function () {
    return this._netStatus;
  },
};

export default PageState;
