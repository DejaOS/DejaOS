const apiKey = sessionStorage.getItem("apiKey");
if (!apiKey) window.location.href = "index.html";

// ─── Utilities ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

function showAlert(id, msg, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "alert show " + (isErr ? "alert-err" : "alert-ok");
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.className = "alert";
  }, 4000);
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleString("en-US", { hour12: false });
}

function fmtUptime(s) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Navigation ──────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    const ext = (item.dataset.externalUrl || "").trim();
    if (ext) {
      window.open(ext, "_blank", "noopener,noreferrer");
      toggleSidebar(false);
      return;
    }
    document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("panel-" + item.dataset.panel).classList.add("active");
    toggleSidebar(false);
    if (item.dataset.panel === "info") {
      loadInfo();
      _renderTimeSummary();
    }
    if (item.dataset.panel === "config") loadConfig();
    if (item.dataset.panel === "users") {
      usersPage = 1;
      loadUsers(0);
    }
    if (item.dataset.panel === "access") loadAccess();
    if (item.dataset.panel === "events") loadEvents();
    if (item.dataset.panel === "qrcode") initQrPanel();
  });
});

function toggleSidebar(force) {
  const open = document.body.classList.contains("sidebar-open");
  const next = force === undefined ? !open : !!force;
  document.body.classList.toggle("sidebar-open", next);
}

// Tap overlay to close sidebar (mobile)
document.addEventListener("click", (e) => {
  if (!document.body.classList.contains("sidebar-open")) return;
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("mobileMenuBtn");
  if (sidebar && sidebar.contains(e.target)) return;
  if (btn && btn.contains(e.target)) return;
  toggleSidebar(false);
});

// ─── Access code (QR) ────────────────────────────────────────────────────────

let _qrObj = null;
let _qrPayloadText = "";

function initQrPanel() {
  // Prefer signing key from device config when present
  const keyEl = document.getElementById("qr-key");
  if (keyEl && !keyEl.value) {
    const k = (document.getElementById("cfg-barcodeKey")?.value || "").trim();
    keyEl.value = k;
  }
}

// Pure JS MD5 for QR signing only (aligned with sdk/test/qrcode.html)
(function (global) {
  function md5(str) {
    function safeAdd(x, y) {
      const lsw = (x & 0xffff) + (y & 0xffff);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt));
    }
    function md5cmn(q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function md5ff(a, b, c, d, x, s, t) {
      return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function md5gg(a, b, c, d, x, s, t) {
      return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function md5hh(a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5ii(a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function md5blks(s) {
      const nblk = ((s.length + 8) >> 6) + 1;
      const blks = new Array(nblk * 16).fill(0);
      for (let i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
      blks[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
      blks[nblk * 16 - 2] = s.length * 8;
      return blks;
    }
    const hex_chr = "0123456789abcdef".split("");
    function rhex(n) {
      let s = "";
      for (let j = 0; j < 4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
      return s;
    }
    function hex(x) {
      for (let i = 0; i < x.length; i++) x[i] = rhex(x[i]);
      return x.join("");
    }
    function add32(a, b) {
      return (a + b) & 0xffffffff;
    }
    function _md5(x, len) {
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;
      let a = 1732584193,
        b = -271733879,
        c = -1732584194,
        d = 271733878;
      for (let i = 0; i < x.length; i += 16) {
        const olda = a,
          oldb = b,
          oldc = c,
          oldd = d;
        a = md5ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = add32(a, olda);
        b = add32(b, oldb);
        c = add32(c, oldc);
        d = add32(d, oldd);
      }
      return [a, b, c, d];
    }
    function str2rstrUTF8(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        let x = input.charCodeAt(i);
        let y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
        if (x >= 0xd800 && x <= 0xdbff && y >= 0xdc00 && y <= 0xdfff) {
          x = 0x10000 + ((x & 0x03ff) << 10) + (y & 0x03ff);
          i++;
        }
        if (x <= 0x7f) output += String.fromCharCode(x);
        else if (x <= 0x7ff)
          output += String.fromCharCode(0xc0 | ((x >>> 6) & 0x1f), 0x80 | (x & 0x3f));
        else if (x <= 0xffff)
          output += String.fromCharCode(
            0xe0 | ((x >>> 12) & 0x0f),
            0x80 | ((x >>> 6) & 0x3f),
            0x80 | (x & 0x3f),
          );
        else
          output += String.fromCharCode(
            0xf0 | ((x >>> 18) & 0x07),
            0x80 | ((x >>> 12) & 0x3f),
            0x80 | ((x >>> 6) & 0x3f),
            0x80 | (x & 0x3f),
          );
      }
      return output;
    }
    const s = str2rstrUTF8(str);
    return hex(_md5(md5blks(s), s.length * 8));
  }
  global.md5 = md5;
})(window);

function generateQrCode() {
  const value = (document.getElementById("qr-value")?.value || "").trim();
  const key = document.getElementById("qr-key")?.value || "";

  if (!value) {
    showAlert("qrcode-alert", "QR credential value cannot be empty.", true);
    document.getElementById("qr-value")?.focus();
    return;
  }

  if (typeof QRCode === "undefined") {
    showAlert(
      "qrcode-alert",
      "QR library not loaded (device may be unable to reach CDN). Host qrcode.min.js locally in the static directory.",
      true
    );
    return;
  }

  const timestamp = Date.now();
  const keyTrim = String(key).trim();
  const payload = keyTrim
    ? JSON.stringify({
        value,
        timestamp,
        sign: md5(String(value) + String(timestamp) + keyTrim),
      })
    : JSON.stringify({ value, timestamp });

  _qrPayloadText = payload;

  const render = document.getElementById("qr-render");
  const placeholder = document.getElementById("qr-placeholder");
  if (!render || !placeholder) return;
  render.innerHTML = "";
  _qrObj = new QRCode(render, {
    text: payload,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
  placeholder.style.display = "none";
  render.style.display = "block";

  const payloadEl = document.getElementById("qr-payload");
  if (payloadEl) payloadEl.textContent = payload;

  showAlert("qrcode-alert", "Generated.", false);
}

function logout() {
  sessionStorage.removeItem("apiKey");
  window.location.href = "index.html";
}

// ─── Device info ─────────────────────────────────────────────────────────────
async function loadInfo() {
  try {
    const r = await api("GET", "/api/v1/device/info");
    if (r.code !== 0) return;
    const d = r.data;
    document.getElementById("i-sn").textContent = d.sn || "—";
    document.getElementById("i-model").textContent = d.model || "—";
    document.getElementById("i-fw").textContent = d.firmware || "—";
    document.getElementById("i-ip").textContent = d.ip || "—";
    document.getElementById("i-mac").textContent = d.mac || "—";
    document.getElementById("i-uptime").textContent = fmtUptime(d.uptime);
    document.getElementById("i-freemem").textContent =
      d.freeMem != null ? d.freeMem + " KB" : "—";
    document.getElementById("i-freedisk").textContent =
      d.freeStorage != null ? d.freeStorage + " MB" : "—";
    document.getElementById("deviceSn").textContent = "SN: " + (d.sn || "");
  } catch (e) {}
}

// ─── Time sync ───────────────────────────────────────────────────────────────
let _lastDeviceTimestampMs = 0;

function _fmt2(n) {
  return String(n).padStart(2, "0");
}

function _toApiTimeStr(date) {
  return `${date.getFullYear()}-${_fmt2(date.getMonth() + 1)}-${_fmt2(date.getDate())} ${_fmt2(date.getHours())}:${_fmt2(date.getMinutes())}:${_fmt2(date.getSeconds())}`;
}

function _renderTimeSummary() {
  const host = new Date();
  const hostText = _toApiTimeStr(host);
  const dev = _lastDeviceTimestampMs ? new Date(_lastDeviceTimestampMs) : null;
  const devText = dev ? _toApiTimeStr(dev) : "—";
  const skewMs = dev ? host.getTime() - dev.getTime() : null;
  const skewText =
    skewMs == null ? "—" : `${skewMs > 0 ? "+" : ""}${(skewMs / 1000).toFixed(1)}s`;

  const el = document.getElementById("time-summary");
  if (!el) return;
  el.innerHTML = `Host time: <span style="color:#ccc;font-family:monospace">${hostText}</span>
    &nbsp;&nbsp;Device time: <span style="color:#ccc;font-family:monospace">${devText}</span>
    &nbsp;&nbsp;Skew: <span style="color:#ccc;font-family:monospace">${skewText}</span>`;
}

async function fetchDeviceTime() {
  try {
    const r = await api("GET", "/api/v1/test");
    if (r.code !== 0) {
      showAlert("time-alert", r.message || "Failed to read device time", true);
      return;
    }
    _lastDeviceTimestampMs = Number(r.data && r.data.timestamp) || 0;
    _renderTimeSummary();
    showAlert("time-alert", "Device time retrieved", false);
  } catch (e) {
    showAlert("time-alert", "Failed to read device time", true);
  }
}

async function syncTimeNow() {
  const now = new Date();
  const timeStr = _toApiTimeStr(now);
  const r = await api("POST", "/api/v1/device/time", { time: timeStr });
  showAlert(
    "time-alert",
    r.code === 0 ? "Time synchronized" : r.message || "Sync failed",
    r.code !== 0,
  );
  if (r.code === 0) {
    // Refresh comparison after sync (device applies immediately)
    _lastDeviceTimestampMs = now.getTime();
    _renderTimeSummary();
  }
}

async function remoteOpen() {
  const r = await api("POST", "/api/v1/device/opendoor");
  showAlert(
    "ctrl-alert",
    r.code === 0 ? "Unlock command sent" : r.message || "Operation failed",
    r.code !== 0,
  );
}

async function rebootDevice() {
  if (!confirm("Restart the device?")) return;
  const r = await api("POST", "/api/v1/device/reboot");
  showAlert(
    "ctrl-alert",
    r.code === 0 ? "Device will reboot in 1 second" : r.message || "Operation failed",
    r.code !== 0,
  );
}

// ─── Background image ──────────────────────────────────────────────────────────
let _bgBase64 = null;

function openBgPicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => _showBgPreview(ev.target.result);
    reader.readAsDataURL(file);
  };
  input.click();
}

function _showBgPreview(dataUrl) {
  const img = document.getElementById("bg-preview");
  img.src = dataUrl;
  img.onload = () => {
    const w = img.naturalWidth,
      h = img.naturalHeight;
    document.getElementById("bg-info").textContent = `Resolution: ${w} × ${h}`;
    document.getElementById("bg-warn").textContent = "";
    document.getElementById("bg-warn").classList.remove("show");
    const ok = w === 480 && h === 320;
    document.getElementById("bg-compress-btn").style.display = ok ? "none" : "";
    document.getElementById("bg-confirm-btn").disabled = !ok;
    if (!ok) {
      document.getElementById("bg-warn").textContent =
        `Current size ${w}×${h}; compress to 480×320 before upload`;
      document.getElementById("bg-warn").classList.add("show");
    }
    _bgBase64 = ok ? dataUrl.split(",")[1] : null;
    document.getElementById("bgModal").classList.add("show");
  };
}

function compressBg() {
  const img = document.getElementById("bg-preview");
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 320;
  canvas.getContext("2d").drawImage(img, 0, 0, 480, 320);
  const dataUrl = canvas.toDataURL("image/png");
  img.src = dataUrl;
  document.getElementById("bg-info").textContent = "Resolution: 480 × 320 (compressed)";
  document.getElementById("bg-warn").classList.remove("show");
  document.getElementById("bg-compress-btn").style.display = "none";
  document.getElementById("bg-confirm-btn").disabled = false;
  _bgBase64 = dataUrl.split(",")[1];
}

function closeBgModal() {
  document.getElementById("bgModal").classList.remove("show");
  _bgBase64 = null;
}

async function uploadBg() {
  if (!_bgBase64) return;
  document.getElementById("bg-confirm-btn").disabled = true;
  const r = await api("POST", "/api/v1/device/background", { image: _bgBase64 });
  document.getElementById("bg-confirm-btn").disabled = false;
  if (r.code === 0) {
    closeBgModal();
    showAlert("ctrl-alert", "Background updated; device will reboot in about 3 seconds…", false);
  } else {
    document.getElementById("bg-warn").textContent = r.message || "Upload failed";
    document.getElementById("bg-warn").classList.add("show");
  }
}

async function clearAllData() {
  if (
    !confirm(
      "Warning: This will erase all users, logs, and device configuration, then reboot.\n\nErase all data?",
    )
  )
    return;
  if (!confirm("Please confirm again — erased data cannot be recovered.")) return;
  const r = await api("POST", "/api/v1/device/cleardata");
  showAlert(
    "ctrl-alert",
    r.code === 0 ? "Data erased; device will reboot in 2 seconds" : r.message || "Operation failed",
    r.code !== 0,
  );
}

// ─── Device configuration ──────────────────────────────────────────────────────
let _origConfig = {};

function onNetTypeChange() {
  const isWifi = document.getElementById("cfg-netType").value === "WIFI";
  document.getElementById("cfg-wifi-fields").style.display = isWifi ? "" : "none";
}

function onDhcpChange() {
  const isDhcp = document.getElementById("cfg-dhcp").value === "true";
  document.getElementById("cfg-static-fields").style.display = isDhcp ? "none" : "";
}

function _getVal(id) {
  return document.getElementById(id).value;
}
function _setVal(id, v) {
  document.getElementById(id).value = v;
}

function _snapshotConfig() {
  _origConfig = {
    screenTitle: _getVal("cfg-screenTitle"),
    webhookUrl: _getVal("cfg-webhookUrl"),
    barcodeKey: _getVal("cfg-barcodeKey"),
    barcodeTimeout: _getVal("cfg-barcodeTimeout"),
    netType: _getVal("cfg-netType"),
    dhcp: _getVal("cfg-dhcp"),
    ip: _getVal("cfg-ip"),
    netmask: _getVal("cfg-netmask"),
    gateway: _getVal("cfg-gateway"),
    dns: _getVal("cfg-dns"),
    ssid: _getVal("cfg-ssid"),
    wifiPwd: _getVal("cfg-wifiPwd"),
  };
}

async function loadConfig() {
  try {
    const r = await api("GET", "/api/v1/device/config");
    if (r.code !== 0) return;
    const d = r.data || {};
    if (d.screenTitle != null) _setVal("cfg-screenTitle", d.screenTitle);
    if (d.webhookUrl != null) _setVal("cfg-webhookUrl", d.webhookUrl);
    let bc = { key: "", timeout: 10 };
    try {
      bc = Object.assign(bc, JSON.parse(d.barcodeConfig || "{}"));
    } catch (e) {}
    _setVal("cfg-barcodeKey", bc.key != null ? bc.key : "");
    _setVal("cfg-barcodeTimeout", bc.timeout != null ? bc.timeout : 10);
    let nc = {};
    try {
      nc = JSON.parse(d.networkConfig || "{}");
    } catch (e) {}
    _setVal("cfg-netType", nc.netType || "ETH");
    _setVal("cfg-dhcp", nc.dhcp === false ? "false" : "true");
    _setVal("cfg-ip", nc.ip || "");
    _setVal("cfg-netmask", nc.netmask || "");
    _setVal("cfg-gateway", nc.gateway || "");
    _setVal("cfg-dns", nc.dns || "");
    _setVal("cfg-ssid", nc.ssid || "");
    _setVal("cfg-wifiPwd", nc.password || "");
    onNetTypeChange();
    onDhcpChange();
    _snapshotConfig();
  } catch (e) {}
}

function _validIp(ip) {
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split(".").every((n) => {
      const x = parseInt(n, 10);
      return x >= 0 && x <= 255;
    })
  );
}

async function saveConfig() {
  const config = {};
  const errors = [];

  const st = _getVal("cfg-screenTitle").trim();
  if (st !== _origConfig.screenTitle) {
    if (!st) errors.push("Screen title is required");
    else config.screenTitle = st;
  }

  const wu = _getVal("cfg-webhookUrl").trim();
  if (wu !== _origConfig.webhookUrl) {
    if (wu && !/^https?:\/\/.+/.test(wu))
      errors.push("Webhook URL must start with http:// or https://");
    else config.webhookUrl = wu;
  }

  const barcodeKey = _getVal("cfg-barcodeKey").trim();
  const barcodeTimeout = _getVal("cfg-barcodeTimeout");
  if (
    barcodeKey !== _origConfig.barcodeKey ||
    barcodeTimeout !== _origConfig.barcodeTimeout
  ) {
    const to = parseInt(barcodeTimeout, 10);
    if (isNaN(to) || to < 0) errors.push("Expiry must be a non-negative integer");
    else config.barcodeConfig = JSON.stringify({ key: barcodeKey, timeout: to });
  }

  const ak = _getVal("cfg-apiKey");
  if (ak) {
    if (ak.length < 4) errors.push("API key must be at least 4 characters");
    else config.apiKey = ak;
  }

  const ap = _getVal("cfg-adminPassword");
  if (ap) {
    if (!/^\d{6}$/.test(ap)) errors.push("Admin password must be 6 digits");
    else config.adminPassword = ap;
  }

  const netType = _getVal("cfg-netType");
  const dhcp = _getVal("cfg-dhcp");
  const ip = _getVal("cfg-ip").trim();
  const netmask = _getVal("cfg-netmask").trim();
  const gateway = _getVal("cfg-gateway").trim();
  const dns = _getVal("cfg-dns").trim();
  const ssid = _getVal("cfg-ssid").trim();
  const wifiPwd = _getVal("cfg-wifiPwd");

  const netChanged =
    netType !== _origConfig.netType ||
    dhcp !== _origConfig.dhcp ||
    ip !== _origConfig.ip ||
    netmask !== _origConfig.netmask ||
    gateway !== _origConfig.gateway ||
    dns !== _origConfig.dns ||
    ssid !== _origConfig.ssid ||
    wifiPwd !== _origConfig.wifiPwd;

  if (netChanged) {
    const nc = { netType, dhcp: dhcp === "true" };
    if (netType === "WIFI") {
      if (!ssid) errors.push("WiFi SSID is required");
      nc.ssid = ssid;
      if (wifiPwd) nc.password = wifiPwd;
    }
    if (dhcp === "false") {
      if (!_validIp(ip)) errors.push("Invalid IP address");
      if (!_validIp(netmask)) errors.push("Invalid subnet mask");
      if (!_validIp(gateway)) errors.push("Invalid gateway");
      if (!_validIp(dns)) errors.push("Invalid DNS");
      nc.ip = ip;
      nc.netmask = netmask;
      nc.gateway = gateway;
      nc.dns = dns;
    }
    if (errors.length === 0) config.networkConfig = JSON.stringify(nc);
  }

  if (errors.length > 0) return showAlert("cfg-alert", errors.join("；"), true);
  if (Object.keys(config).length === 0)
    return showAlert("cfg-alert", "Nothing to save", true);

  const r = await api("POST", "/api/v1/device/config", { config });
  showAlert(
    "cfg-alert",
    r.code === 0 ? "Configuration saved" : r.message || "Save failed",
    r.code !== 0,
  );
  if (r.code === 0) {
    if (ak) sessionStorage.setItem("apiKey", ak);
    _setVal("cfg-apiKey", "");
    _setVal("cfg-adminPassword", "");
    loadConfig();
  }
}

// ─── User management ─────────────────────────────────────────────────────────
let usersPage = 1;

function clearUsersFilter() {
  document.getElementById("uf-userId").value = "";
  document.getElementById("uf-name").value = "";
  document.getElementById("uf-type").value = "";
  document.getElementById("uf-value").value = "";
  usersPage = 1;
  loadUsers(0);
}

async function loadUsers(delta) {
  usersPage = Math.max(1, usersPage + delta);
  const size = parseInt(document.getElementById("users-size").value, 10);
  const params = new URLSearchParams({ page: usersPage, size });
  const userId = document.getElementById("uf-userId").value.trim();
  const name = document.getElementById("uf-name").value.trim();
  const type = document.getElementById("uf-type").value;
  const value = document.getElementById("uf-value").value.trim();
  if (userId) params.set("userId", userId);
  if (name) params.set("name", name);
  if (type) params.set("type", type);
  if (value) params.set("value", value);
  const r = await api("GET", `/api/v1/users/list?${params.toString()}`);
  if (r.code !== 0) return showAlert("users-alert", r.message || "Load failed", true);
  const { total = 0, list = [] } = r.data || {};
  document.getElementById("users-total").textContent = total;
  document.getElementById("users-page").textContent = `Page ${usersPage}`;
  document.getElementById("users-prev").disabled = usersPage <= 1;
  document.getElementById("users-next").disabled = list.length < size;

  const tbody = document.getElementById("users-tbody");
  const empty = document.getElementById("users-empty");
  if (list.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const typeMap = { nfc: "NFC tap", pin: "PIN", qr: "QR code", ble: "Bluetooth", face: "Face" };
  const periodLabel = (p) => {
    if (!p || p.type === 0) return "No expiry";
    if (p.type === 1) {
      const b = p.range && p.range.beginTime ? fmtTime(p.range.beginTime) : "";
      const e = p.range && p.range.endTime ? fmtTime(p.range.endTime) : "";
      return `${b} ~ ${e}`;
    }
    if (p.type === 2) return `Daily ${p.dayPeriodTime || ""}`;
    if (p.type === 3) return "Weekly repeat";
    return JSON.stringify(p);
  };

  tbody.innerHTML = list
    .map(
      (u) => `
    <tr>
      <td>${esc(u.userId)}</td>
      <td>${esc(u.name || "—")}</td>
      <td>${typeMap[u.type] || u.type}</td>
      <td style="font-family:monospace">${esc(u.value)}</td>
      <td style="font-size:12px;color:#888">${periodLabel(u.period)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteUserById(${u.id}, '${esc(u.userId)}', '${typeMap[u.type] || u.type}')">Delete</button></td>
    </tr>`,
    )
    .join("");
}

async function deleteUserById(id, userId, typeName) {
  if (!confirm(`Delete ${typeName} credential for user ${userId}?`)) return;
  const r = await api("POST", "/api/v1/users/delete", { ids: [id] });
  showAlert("users-alert", r.code === 0 ? "Deleted" : r.message || "Delete failed", r.code !== 0);
  if (r.code === 0) loadUsers(0);
}

async function clearUsers() {
  if (!confirm("Delete all users? This cannot be undone.")) return;
  const r = await api("POST", "/api/v1/users/clear");
  showAlert(
    "users-alert",
    r.code === 0 ? "Cleared" : r.message || "Failed",
    r.code !== 0,
  );
  if (r.code === 0) loadUsers(0);
}

function showAddUser() {
  ["u-userId", "u-name", "u-value", "u-beginTime", "u-endTime"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("u-type").value = "nfc";
  document.getElementById("u-periodType").value = "0";
  document.getElementById("period-range-fields").style.display = "none";
  document.getElementById("adduser-alert").className = "alert";
  document.getElementById("addUserModal").classList.add("show");
}

function closeAddUser() {
  document.getElementById("addUserModal").classList.remove("show");
}

function togglePeriodFields() {
  const type = document.getElementById("u-periodType").value;
  document.getElementById("period-range-fields").style.display =
    type === "1" ? "block" : "none";
}

async function submitAddUser() {
  const userId = document.getElementById("u-userId").value.trim();
  const name = document.getElementById("u-name").value.trim();
  const type = document.getElementById("u-type").value;
  const value = document.getElementById("u-value").value.trim();
  const ptype = parseInt(document.getElementById("u-periodType").value, 10);

  if (!userId || !value)
    return showAlert("adduser-alert", "User ID and credential value are required", true);

  let period = { type: ptype };
  if (ptype === 1) {
    const bt = document.getElementById("u-beginTime").value;
    const et = document.getElementById("u-endTime").value;
    period.range = {
      beginTime: bt ? Math.floor(new Date(bt).getTime() / 1000) : 0,
      endTime: et ? Math.floor(new Date(et).getTime() / 1000) : 0,
    };
  }

  const r = await api("POST", "/api/v1/users/add", {
    users: [{ userId, name, type, value, period }],
  });
  if (r.code === 0) {
    closeAddUser();
    showAlert("users-alert", "User added / updated", false);
    loadUsers(0);
  } else {
    showAlert("adduser-alert", r.message || "Operation failed", true);
  }
}

// ─── Access logs ─────────────────────────────────────────────────────────────
let accessPage = 1;

function clearAccessFilter() {
  document.getElementById("af-userId").value = "";
  document.getElementById("af-name").value = "";
  document.getElementById("af-type").value = "";
  document.getElementById("af-value").value = "";
  document.getElementById("af-result").value = "";
  accessPage = 1;
  loadAccess();
}

function loadAccessPage(delta) {
  accessPage = Math.max(1, accessPage + delta);
  loadAccess();
}

async function loadAccess() {
  const size = parseInt(document.getElementById("access-size").value, 10);
  const params = new URLSearchParams({ page: accessPage, size });
  const userId = document.getElementById("af-userId").value.trim();
  const name = document.getElementById("af-name").value.trim();
  const type = document.getElementById("af-type").value;
  const value = document.getElementById("af-value").value.trim();
  const result = document.getElementById("af-result").value;
  if (userId) params.set("userId", userId);
  if (name) params.set("name", name);
  if (type) params.set("type", type);
  if (value) params.set("value", value);
  if (result !== "") params.set("result", result);

  const r = await api("GET", `/api/v1/access?${params.toString()}`);
  if (r.code !== 0) return showAlert("access-alert", r.message || "Load failed", true);
  const { total = 0, list = [] } = r.data || {};
  document.getElementById("access-total").textContent = total;
  document.getElementById("access-page").textContent = `Page ${accessPage}`;
  document.getElementById("access-prev").disabled = accessPage <= 1;
  document.getElementById("access-next").disabled = list.length < size;

  const tbody = document.getElementById("access-tbody");
  const empty = document.getElementById("access-empty");
  document.getElementById("access-all").checked = false;
  if (list.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  const typeMap = { nfc: "NFC", pin: "PIN", qr: "QR", ble: "Bluetooth", face: "Face", remote: "Remote" };
  tbody.innerHTML = list
    .map(
      (a) => `
    <tr>
      <td><input type="checkbox" class="access-cb" value="${a.id}"></td>
      <td>${a.id}</td>
      <td>${esc(a.userId)}</td>
      <td>${esc(a.name || "—")}</td>
      <td>${typeMap[a.type] || a.type}</td>
      <td style="font-family:monospace;font-size:12px">${esc(a.value)}</td>
      <td><span class="badge ${a.result === 1 ? "badge-success" : "badge-fail"}">${a.result === 1 ? "OK" : "Fail"}</span></td>
      <td style="white-space:nowrap;font-size:12px">${fmtTime(a.time)}</td>
    </tr>`,
    )
    .join("");
}

function toggleAllAccess(cb) {
  document.querySelectorAll(".access-cb").forEach((c) => (c.checked = cb.checked));
}

async function deleteSelectedAccess() {
  const ids = [...document.querySelectorAll(".access-cb:checked")].map(
    (c) => parseInt(c.value, 10),
  );
  if (ids.length === 0) return showAlert("access-alert", "Select records to delete first", true);
  const r = await api("POST", "/api/v1/access/delete", { ids });
  showAlert(
    "access-alert",
    r.code === 0 ? `Deleted ${ids.length} row(s)` : r.message || "Failed",
    r.code !== 0,
  );
  if (r.code === 0) loadAccess();
}

async function clearAccess() {
  if (!confirm("Clear all access logs?")) return;
  const r = await api("POST", "/api/v1/access/clear");
  showAlert(
    "access-alert",
    r.code === 0 ? "Cleared" : r.message || "Failed",
    r.code !== 0,
  );
  if (r.code === 0) loadAccess();
}

// ─── Event / alarm logs ────────────────────────────────────────────────────────
let eventsPage = 1;

function clearEventsFilter() {
  document.getElementById("ef-type").value = "";
  document.getElementById("ef-message").value = "";
  eventsPage = 1;
  loadEvents();
}

function loadEventsPage(delta) {
  eventsPage = Math.max(1, eventsPage + delta);
  loadEvents();
}

async function loadEvents() {
  const size = parseInt(document.getElementById("events-size").value, 10);
  const params = new URLSearchParams({ page: eventsPage, size });
  const type = document.getElementById("ef-type").value;
  const message = document.getElementById("ef-message").value.trim();
  if (type) params.set("type", type);
  if (message) params.set("message", message);

  const r = await api("GET", `/api/v1/events?${params.toString()}`);
  if (r.code !== 0) return showAlert("events-alert", r.message || "Load failed", true);
  const { total = 0, list = [] } = r.data || {};
  document.getElementById("events-total").textContent = total;
  document.getElementById("events-page").textContent = `Page ${eventsPage}`;
  document.getElementById("events-prev").disabled = eventsPage <= 1;
  document.getElementById("events-next").disabled = list.length < size;

  const tbody = document.getElementById("events-tbody");
  const empty = document.getElementById("events-empty");
  document.getElementById("events-all").checked = false;
  if (list.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  const typeBadge = (t) => {
    if (t === "warning") return "badge-warn";
    if (t === "error") return "badge-err";
    if (t === "alarm") return "badge-alarm";
    return "badge-info";
  };
  tbody.innerHTML = list
    .map(
      (e) => `
    <tr>
      <td><input type="checkbox" class="events-cb" value="${e.id}"></td>
      <td>${e.id}</td>
      <td><span class="badge ${typeBadge(e.type)}">${e.type}</span></td>
      <td style="font-family:monospace;font-size:12px">${esc(e.event || "—")}</td>
      <td style="font-size:12px">${esc(e.message || "—")}</td>
      <td style="white-space:nowrap;font-size:12px">${fmtTime(e.time)}</td>
    </tr>`,
    )
    .join("");
}

function toggleAllEvents(cb) {
  document.querySelectorAll(".events-cb").forEach((c) => (c.checked = cb.checked));
}

async function deleteSelectedEvents() {
  const ids = [...document.querySelectorAll(".events-cb:checked")].map(
    (c) => parseInt(c.value, 10),
  );
  if (ids.length === 0) return showAlert("events-alert", "Select records to delete first", true);
  const r = await api("POST", "/api/v1/events/delete", { ids });
  showAlert(
    "events-alert",
    r.code === 0 ? `Deleted ${ids.length} row(s)` : r.message || "Failed",
    r.code !== 0,
  );
  if (r.code === 0) loadEvents();
}

async function clearEvents() {
  if (!confirm("Clear all event logs?")) return;
  const r = await api("POST", "/api/v1/events/clear");
  showAlert(
    "events-alert",
    r.code === 0 ? "Cleared" : r.message || "Failed",
    r.code !== 0,
  );
  if (r.code === 0) loadEvents();
}

// Click overlay to close modal
document.getElementById("addUserModal").addEventListener("click", function (e) {
  if (e.target === this) closeAddUser();
});

// ─── Initialization ────────────────────────────────────────────────────────────
loadInfo();
_renderTimeSummary();
