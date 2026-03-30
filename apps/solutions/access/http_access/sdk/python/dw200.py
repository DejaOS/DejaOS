"""
DW200 Access Device SDK for Python (stdlib only: urllib, json, hashlib).

Aligned with sdk/nodejs/dw200.js: fixed port 8080, same validation and endpoints.

  from dw200 import DW200Client, DW200Error, Period

  client = DW200Client(host="192.168.1.20", api_key="password")
  info = client.test()
  client.open_door()
"""

from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Union

DEVICE_HTTP_PORT = 8080

_SLOT_RE = re.compile(r"^\d{2}:\d{2}-\d{2}:\d{2}$")
_TIME_STR_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")
_SUBNET_RE = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}$")


class DW200Error(Exception):
    """API returned code != 0."""

    def __init__(self, message: str, code: Optional[int] = None, status_code: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def _build_base_with_fixed_port(host_or_base_url: str) -> str:
    s = (host_or_base_url or "").strip()
    if not s:
        raise ValueError("host cannot be empty")
    if not re.match(r"^https?://", s, re.I):
        s = "http://" + s
    p = urllib.parse.urlparse(s)
    if p.scheme not in ("http", "https"):
        raise ValueError("Only http or https device URLs are supported.")
    host = p.hostname
    if not host:
        raise ValueError(f"Cannot parse device address: {host_or_base_url}")
    # Bracket IPv6 in netloc
    if ":" in host and "." not in host:
        netloc = f"[{host}]:{DEVICE_HTTP_PORT}"
    else:
        netloc = f"{host}:{DEVICE_HTTP_PORT}"
    return f"{p.scheme}://{netloc}"


def _is_str(v: Any) -> bool:
    return isinstance(v, str) and len(v.strip()) > 0


def _is_pos_int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v > 0


def _date_to_time_str(d: datetime) -> str:
    return d.strftime("%Y-%m-%d %H:%M:%S")


def _validate_period(p: Mapping[str, Any]) -> None:
    if not isinstance(p, Mapping):
        raise ValueError("period must be an object")
    t = p.get("type")
    if t not in (0, 1, 2, 3):
        raise ValueError("period.type must be 0, 1, 2, or 3")

    if t >= 1 and p.get("range"):
        r = p["range"]
        if not isinstance(r, Mapping):
            raise ValueError("period.range must be an object")
        bt, et = r.get("beginTime"), r.get("endTime")
        if not isinstance(bt, int) or not isinstance(et, int):
            raise ValueError(
                "period.range.beginTime and endTime must be integer Unix timestamps (seconds)"
            )

    if t == 2:
        dpt = p.get("dayPeriodTime")
        if not _is_str(dpt):
            raise ValueError("period type=2 requires dayPeriodTime string")
        slots = str(dpt).split("|")
        if len(slots) > 5:
            raise ValueError("dayPeriodTime allows at most 5 time slots")
        for i, seg in enumerate(slots):
            seg = seg.strip()
            if not _SLOT_RE.match(seg):
                raise ValueError(f"dayPeriodTime slot {i + 1} must be HH:MM-HH:MM")

    if t == 3:
        wpt = p.get("weekPeriodTime")
        if not isinstance(wpt, Mapping):
            raise ValueError("period type=3 requires weekPeriodTime object")
        for day, slots in wpt.items():
            if str(day) not in "1234567" or len(str(day)) != 1:
                raise ValueError(f'weekPeriodTime key "{day}" is invalid; use 1–7')
            for i, seg in enumerate(str(slots).split("|")):
                seg = seg.strip()
                if seg and not _SLOT_RE.match(seg):
                    raise ValueError(
                        f"weekPeriodTime day {day} slot {i + 1} must be HH:MM-HH:MM"
                    )


def _validate_user(u: Mapping[str, Any]) -> None:
    if not _is_str(u.get("userId")):
        raise ValueError("userId cannot be empty")
    if not _is_str(u.get("name")):
        raise ValueError("name cannot be empty")
    valid = ("nfc", "pin", "qr", "ble", "face")
    if u.get("type") not in valid:
        raise ValueError(f"type must be one of: {' / '.join(valid)}")
    if not _is_str(u.get("value")):
        raise ValueError("value cannot be empty")
    if "period" in u and u["period"] is not None:
        _validate_period(u["period"])


def _check(status: int, body: Any) -> Any:
    if isinstance(body, dict) and "code" in body:
        if body.get("code") == 0:
            return body.get("data")
        raise DW200Error(
            body.get("message") or f"API error code={body.get('code')}",
            code=body.get("code"),
            status_code=status,
        )
    raise DW200Error(f"Unexpected response body: {body!r}", status_code=status)


class Period:
    """Period helpers (appendix B), same as DW200Client.period in Node."""

    @staticmethod
    def always() -> Dict[str, int]:
        return {"type": 0}

    @staticmethod
    def range(begin_time: int, end_time: int) -> Dict[str, Any]:
        if not isinstance(begin_time, int) or not isinstance(end_time, int):
            raise ValueError("beginTime and endTime must be integer Unix seconds")
        if end_time <= begin_time:
            raise ValueError("endTime must be greater than beginTime")
        return {"type": 1, "range": {"beginTime": begin_time, "endTime": end_time}}

    @staticmethod
    def daily(slots: str, range_: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        if not _is_str(slots):
            raise ValueError('slots cannot be empty, e.g. "09:00-18:00"')
        p: Dict[str, Any] = {"type": 2, "dayPeriodTime": slots.strip()}
        if range_ is not None:
            p["range"] = range_
        _validate_period(p)
        return p

    @staticmethod
    def weekly(week_map: Mapping[str, str], range_: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        if not week_map:
            raise ValueError('weekMap cannot be empty, e.g. {"1": "09:00-18:00"}')
        p: Dict[str, Any] = {"type": 3, "weekPeriodTime": dict(week_map)}
        if range_ is not None:
            p["range"] = range_
        _validate_period(p)
        return p


def generate_qr_str(value: Any, key: str = "") -> str:
    """JSON string for access QR payload; sign = md5(value + timestamp + key)."""
    if value is None:
        raise ValueError("value cannot be empty")
    if not value and value != 0 and value is not False:
        raise ValueError("value cannot be empty")
    ts = int(datetime.now().timestamp() * 1000)
    key_trim = (key or "").strip()
    v = str(value)
    if not key_trim:
        return json.dumps({"value": v, "timestamp": ts}, separators=(",", ":"))
    sign = hashlib.md5((v + str(ts) + key_trim).encode("utf-8")).hexdigest()
    return json.dumps({"value": v, "timestamp": ts, "sign": sign}, separators=(",", ":"))


@dataclass
class ScanResult:
    ip: str
    sn: str
    timestamp: int = 0


class DW200Client:
    def __init__(self, host: str, api_key: str = "password", timeout_ms: int = 10_000):
        if not host:
            raise ValueError("host is required")
        self._base = _build_base_with_fixed_port(host)
        self._api_key = api_key or "password"
        self._timeout = timeout_ms / 1000.0

    def _url(self, path: str, query: Optional[Dict[str, Any]] = None) -> str:
        url = self._base + path
        if query:
            q = {k: v for k, v in query.items() if v is not None and v != ""}
            if q:
                url += "?" + urllib.parse.urlencode(q)
        return url

    def _request(
        self,
        method: str,
        path: str,
        query: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
        with_key: bool = True,
    ) -> Any:
        url = self._url(path, query)
        data = None
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if with_key:
            headers["X-API-Key"] = self._api_key
        if body is not None:
            data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        ctx = ssl.create_default_context()
        try:
            with urllib.request.urlopen(req, timeout=self._timeout, context=ctx) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                status = resp.status
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            status = e.code
        try:
            parsed: Any = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return _check(status, parsed)

    def test(self) -> Any:
        url = self._url("/api/v1/test")
        req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=self._timeout, context=ctx) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw)
        return _check(resp.status, parsed)

    def get_device_info(self) -> Any:
        return self._request("GET", "/api/v1/device/info")

    def get_config(self) -> Any:
        return self._request("GET", "/api/v1/device/config")

    def set_config(self, config: Mapping[str, Any]) -> Any:
        if not isinstance(config, Mapping) or len(config) == 0:
            raise ValueError("config must be a non-empty object")
        cfg = dict(config)
        ap = cfg.get("adminPassword")
        if ap is not None and not re.fullmatch(r"\d{6}", str(ap)):
            raise ValueError("adminPassword must be exactly 6 digits")
        wh = cfg.get("webhookUrl")
        if wh is not None and str(wh) != "":
            if not re.match(r"^https?://.+", str(wh), re.I):
                raise ValueError("webhookUrl must start with http:// or https://")
        if isinstance(cfg.get("networkConfig"), Mapping):
            cfg["networkConfig"] = json.dumps(cfg["networkConfig"], separators=(",", ":"))
        return self._request("POST", "/api/v1/device/config", body={"config": cfg})

    def open_door(self) -> Any:
        return self._request("POST", "/api/v1/device/opendoor", body={})

    def reboot(self) -> Any:
        return self._request("POST", "/api/v1/device/reboot", body={})

    def clear_all_data(self) -> Any:
        return self._request("POST", "/api/v1/device/cleardata", body={})

    def upgrade_firmware(self, url: str, md5_hex: str) -> Any:
        if not _is_str(url):
            raise ValueError("url cannot be empty")
        u = url.strip()
        if not re.match(r"^https?://.+", u, re.I):
            raise ValueError("url must start with http:// or https://")
        m = (md5_hex or "").strip().lower()
        if not re.fullmatch(r"[a-f0-9]{32}", m):
            raise ValueError("md5 must be a 32-character lowercase hex string")
        return self._request("POST", "/api/v1/device/upgrade", body={"url": u, "md5": m})

    def set_time(self, time: Union[None, str, datetime] = None) -> Any:
        if time is None:
            time_str = _date_to_time_str(datetime.now())
        elif isinstance(time, datetime):
            time_str = _date_to_time_str(time)
        else:
            time_str = str(time).strip()
        if not _TIME_STR_RE.match(time_str):
            raise ValueError('time must be "YYYY-MM-DD HH:mm:ss"')
        return self._request("POST", "/api/v1/device/time", body={"time": time_str})

    def set_background(self, base64_png: str) -> Any:
        if not _is_str(base64_png):
            raise ValueError("base64 image data cannot be empty")
        clean = re.sub(r"^data:image/[a-z]+;base64,", "", base64_png.strip(), flags=re.I)
        return self._request("POST", "/api/v1/device/background", body={"image": clean})

    def add_users(self, users: Sequence[Mapping[str, Any]]) -> Any:
        if not users or len(users) == 0:
            raise ValueError("users must be a non-empty array")
        if len(users) > 100:
            raise ValueError("At most 100 users per request")
        for i, u in enumerate(users):
            try:
                _validate_user(u)
            except ValueError as e:
                raise ValueError(f"users[{i}]: {e}") from e
        return self._request("POST", "/api/v1/users/add", body={"users": list(users)})

    def delete_user(self, user_ids: Union[str, Sequence[str]]) -> Any:
        arr = [user_ids] if isinstance(user_ids, str) else list(user_ids)
        cleaned = [x.strip() for x in arr if isinstance(x, str) and x.strip()]
        if not cleaned:
            raise ValueError("userIds cannot be empty")
        return self._request("POST", "/api/v1/users/delete", body={"userIds": cleaned})

    def delete_user_by_ids(self, ids: Sequence[int]) -> Any:
        if not ids:
            raise ValueError("ids must be a non-empty array")
        return self._request("POST", "/api/v1/users/delete", body={"ids": list(ids)})

    def list_users(
        self, page: int = 1, size: int = 50, filters: Optional[Mapping[str, Any]] = None
    ) -> Any:
        if not _is_pos_int(page) or not _is_pos_int(size):
            raise ValueError("page and size must be positive integers")
        f = dict(filters or {})
        valid = {"nfc", "pin", "qr", "ble", "face"}
        if f.get("type") and f["type"] not in valid:
            raise ValueError(f"filters.type must be one of: {' / '.join(sorted(valid))}")
        q: Dict[str, Any] = {"page": page, "size": size}
        for k in ("userId", "name", "type", "value"):
            if f.get(k):
                q[k] = f[k]
        return self._request("GET", "/api/v1/users/list", query=q)

    def clear_users(self) -> Any:
        return self._request("POST", "/api/v1/users/clear", body={})

    def list_access(
        self, page: int = 1, size: int = 100, filters: Optional[Mapping[str, Any]] = None
    ) -> Any:
        if not _is_pos_int(page) or not _is_pos_int(size):
            raise ValueError("page and size must be positive integers")
        f = dict(filters or {})
        valid = {"nfc", "pin", "qr", "ble", "face", "remote"}
        if f.get("type") and f["type"] not in valid:
            raise ValueError(f"filters.type must be one of: {' / '.join(sorted(valid))}")
        r = f.get("result")
        if r is not None and r != "" and r not in (0, 1):
            raise ValueError("filters.result must be 0 or 1")
        q: Dict[str, Any] = {"page": page, "size": size}
        for k in ("userId", "name", "type", "value"):
            v = f.get(k)
            if v is not None and v != "":
                q[k] = v
        if f.get("result") is not None and f.get("result") != "":
            q["result"] = f["result"]
        return self._request("GET", "/api/v1/access", query=q)

    def delete_access(self, ids: Sequence[int]) -> Any:
        if not ids:
            raise ValueError("ids must be a non-empty array")
        return self._request("POST", "/api/v1/access/delete", body={"ids": list(ids)})

    def clear_access(self) -> Any:
        return self._request("POST", "/api/v1/access/clear", body={})

    def list_events(
        self, page: int = 1, size: int = 100, filters: Optional[Mapping[str, Any]] = None
    ) -> Any:
        if not _is_pos_int(page) or not _is_pos_int(size):
            raise ValueError("page and size must be positive integers")
        f = dict(filters or {})
        valid = {"info", "warning", "error"}
        if f.get("type") and f["type"] not in valid:
            raise ValueError(f"filters.type must be one of: {' / '.join(sorted(valid))}")
        q: Dict[str, Any] = {"page": page, "size": size}
        if f.get("type"):
            q["type"] = f["type"]
        if f.get("message"):
            q["message"] = f["message"]
        return self._request("GET", "/api/v1/events", query=q)

    def delete_events(self, ids: Sequence[int]) -> Any:
        if not ids:
            raise ValueError("ids must be a non-empty array")
        return self._request("POST", "/api/v1/events/delete", body={"ids": list(ids)})

    def clear_events(self) -> Any:
        return self._request("POST", "/api/v1/events/clear", body={})


def scan_subnet(
    subnet: str,
    *,
    timeout_ms: int = 1500,
    concurrency: int = 10,
    on_found: Optional[Callable[[ScanResult], None]] = None,
) -> List[ScanResult]:
    """
    Scan .1–.254 on subnet A.B.C; parallel across groups, serial within group (same as Node).
    """
    if not _SUBNET_RE.match(subnet.strip()):
        raise ValueError('subnet must be "A.B.C", e.g. "192.168.50"')
    subnet = subnet.strip()
    if concurrency < 1:
        concurrency = 10
    groups: List[List[str]] = [[] for _ in range(concurrency)]
    for i in range(1, 255):
        groups[(i - 1) % concurrency].append(f"{subnet}.{i}")
    timeout = timeout_ms / 1000.0

    def probe_one(ip: str) -> Optional[ScanResult]:
        url = f"http://{ip}:{DEVICE_HTTP_PORT}/api/v1/test"
        req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                body = json.loads(raw)
        except Exception:
            return None
        if not isinstance(body, dict) or body.get("code") != 0:
            return None
        data = body.get("data") or {}
        sn = data.get("sn")
        if not sn:
            return None
        found = ScanResult(ip=ip, sn=str(sn).strip(), timestamp=int(data.get("timestamp") or 0))
        if on_found:
            on_found(found)
        return found

    def scan_group(ips: List[str]) -> List[ScanResult]:
        out: List[ScanResult] = []
        for ip in ips:
            r = probe_one(ip)
            if r:
                out.append(r)
        return out

    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(scan_group, g) for g in groups]
        nested = [f.result() for f in futs]
    flat = [x for sub in nested for x in sub]

    def last_octet(ip: str) -> int:
        return int(ip.rsplit(".", 1)[-1])

    flat.sort(key=last_octet)
    return flat


__all__ = [
    "DEVICE_HTTP_PORT",
    "DW200Client",
    "DW200Error",
    "Period",
    "ScanResult",
    "generate_qr_str",
    "scan_subnet",
]
