/*
 * DW200 Access Device SDK for Java 11+ (java.net.http.HttpClient + Gson).
 * Aligned with sdk/nodejs/dw200.js: port fixed 8080, same validation and endpoints.
 *
 * Dependency: Gson 2.x (e.g. gson-2.10.1.jar) — https://github.com/google/gson
 *
 * Compile (from this directory):
 *   javac --release 11 -cp gson-2.10.1.jar DW200Client.java
 *
 * Example:
 *   DW200Client c = new DW200Client("192.168.1.20", "password");
 *   JsonElement info = c.test();
 *   c.openDoor();
 */

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Consumer;
import java.util.regex.Pattern;

public final class DW200Client {

    /** Thrown when the device returns JSON with {@code code != 0}. */
    public static final class DW200Exception extends Exception {

        private final Integer apiCode;
        private final Integer statusCode;

        public DW200Exception(String message, Integer apiCode, Integer statusCode) {
            super(message);
            this.apiCode = apiCode;
            this.statusCode = statusCode;
        }

        public Integer getApiCode() {
            return apiCode;
        }

        public Integer getStatusCode() {
            return statusCode;
        }
    }

    /** One device found by {@link #scan(String, ScanOptions)}. */
    public static final class ScanResult {

        public final String ip;
        public final String sn;
        public final long timestamp;

        public ScanResult(String ip, String sn, long timestamp) {
            this.ip = ip;
            this.sn = sn;
            this.timestamp = timestamp;
        }
    }

    /** Options for {@link #scan(String, ScanOptions)}. */
    public static final class ScanOptions {

        int timeoutMs = 1500;
        int concurrency = 10;
        Consumer<ScanResult> onFound;

        public ScanOptions timeoutMs(int ms) {
            this.timeoutMs = ms;
            return this;
        }

        public ScanOptions concurrency(int n) {
            this.concurrency = n;
            return this;
        }

        public ScanOptions onFound(Consumer<ScanResult> onFound) {
            this.onFound = onFound;
            return this;
        }
    }

    /**
     * Period helpers (appendix B), same as {@code DW200Client.period} in Node.
     */
    public static final class Period {

        private static final Pattern SLOT = Pattern.compile("^\\d{2}:\\d{2}-\\d{2}:\\d{2}$");

        private Period() {}

        public static JsonObject always() {
            JsonObject p = new JsonObject();
            p.addProperty("type", 0);
            return p;
        }

        public static JsonObject range(long beginTime, long endTime) {
            if (endTime <= beginTime) {
                throw new IllegalArgumentException("endTime must be greater than beginTime");
            }
            JsonObject p = new JsonObject();
            p.addProperty("type", 1);
            JsonObject r = new JsonObject();
            r.addProperty("beginTime", beginTime);
            r.addProperty("endTime", endTime);
            p.add("range", r);
            return p;
        }

        public static JsonObject daily(String slots, JsonObject range) {
            if (slots == null || slots.trim().isEmpty()) {
                throw new IllegalArgumentException("slots cannot be empty, e.g. \"09:00-18:00\"");
            }
            JsonObject p = new JsonObject();
            p.addProperty("type", 2);
            p.addProperty("dayPeriodTime", slots);
            if (range != null) {
                p.add("range", range);
            }
            validatePeriod(p);
            return p;
        }

        public static JsonObject daily(String slots) {
            return daily(slots, null);
        }

        /** weekMap keys 1–7 (Mon–Sun), values slot strings. */
        public static JsonObject weekly(Map<String, String> weekMap, JsonObject range) {
            if (weekMap == null || weekMap.isEmpty()) {
                throw new IllegalArgumentException("weekMap cannot be empty, e.g. {\"1\":\"09:00-18:00\"}");
            }
            JsonObject w = new JsonObject();
            for (Map.Entry<String, String> e : weekMap.entrySet()) {
                w.addProperty(e.getKey(), e.getValue());
            }
            JsonObject p = new JsonObject();
            p.addProperty("type", 3);
            p.add("weekPeriodTime", w);
            if (range != null) {
                p.add("range", range);
            }
            validatePeriod(p);
            return p;
        }

        public static JsonObject weekly(Map<String, String> weekMap) {
            return weekly(weekMap, null);
        }

        /** Validate period embedded in a user credential (same rules as builders). */
        public static void assertPeriod(JsonObject p) {
            validatePeriod(p);
        }

        private static void validatePeriod(JsonObject p) {
            if (!p.has("type") || !p.get("type").isJsonPrimitive()) {
                throw new IllegalArgumentException("period must be an object");
            }
            int t = p.get("type").getAsInt();
            if (t < 0 || t > 3) {
                throw new IllegalArgumentException("period.type must be 0, 1, 2, or 3");
            }
            if (t >= 1 && p.has("range") && !p.get("range").isJsonNull()) {
                JsonObject r = p.getAsJsonObject("range");
                if (!r.has("beginTime") || !r.get("beginTime").isJsonPrimitive()
                        || !r.has("endTime") || !r.get("endTime").isJsonPrimitive()) {
                    throw new IllegalArgumentException(
                            "period.range.beginTime and endTime must be integer Unix timestamps (seconds)");
                }
                try {
                    r.get("beginTime").getAsInt();
                    r.get("endTime").getAsInt();
                } catch (Exception e) {
                    throw new IllegalArgumentException(
                            "period.range.beginTime and endTime must be integer Unix timestamps (seconds)");
                }
            }
            if (t == 2) {
                if (!p.has("dayPeriodTime") || !p.get("dayPeriodTime").isJsonPrimitive()) {
                    throw new IllegalArgumentException("period type=2 requires dayPeriodTime string");
                }
                String dpt = p.get("dayPeriodTime").getAsString();
                String[] slots = dpt.split("\\|");
                if (slots.length > 5) {
                    throw new IllegalArgumentException("dayPeriodTime allows at most 5 time slots");
                }
                for (int i = 0; i < slots.length; i++) {
                    String seg = slots[i].trim();
                    if (!SLOT.matcher(seg).matches()) {
                        throw new IllegalArgumentException(
                                "dayPeriodTime slot " + (i + 1) + " must be HH:MM-HH:MM");
                    }
                }
            }
            if (t == 3) {
                if (!p.has("weekPeriodTime") || !p.get("weekPeriodTime").isJsonObject()) {
                    throw new IllegalArgumentException("period type=3 requires weekPeriodTime object");
                }
                JsonObject wpt = p.getAsJsonObject("weekPeriodTime");
                for (Map.Entry<String, JsonElement> e : wpt.entrySet()) {
                    String day = e.getKey();
                    if (!day.matches("[1-7]")) {
                        throw new IllegalArgumentException("weekPeriodTime key \"" + day + "\" is invalid; use 1–7");
                    }
                    String slots = e.getValue().getAsString();
                    String[] parts = slots.split("\\|");
                    for (int i = 0; i < parts.length; i++) {
                        String seg = parts[i].trim();
                        if (!seg.isEmpty() && !SLOT.matcher(seg).matches()) {
                            throw new IllegalArgumentException(
                                    "weekPeriodTime day " + day + " slot " + (i + 1) + " must be HH:MM-HH:MM");
                        }
                    }
                }
            }
        }
    }

    public static final int DEVICE_HTTP_PORT = 8080;

    private static final Pattern TIME_STR = Pattern.compile("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$");
    private static final Pattern SUBNET = Pattern.compile("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$");

    private final String base;
    private final String apiKey;
    private final int timeoutMs;
    private final HttpClient http;
    private final Gson gson = new Gson();

    public DW200Client(String host) {
        this(host, "password", 10_000);
    }

    public DW200Client(String host, String apiKey) {
        this(host, apiKey, 10_000);
    }

    public DW200Client(String host, String apiKey, int timeoutMs) {
        if (host == null || host.trim().isEmpty()) {
            throw new IllegalArgumentException("host is required");
        }
        this.base = buildBaseWithFixedPort(host.trim());
        this.apiKey = apiKey == null || apiKey.isEmpty() ? "password" : apiKey;
        this.timeoutMs = timeoutMs;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();
    }

    public static String buildBaseWithFixedPort(String hostOrBaseUrl) {
        String input = hostOrBaseUrl.trim();
        if (input.isEmpty()) {
            throw new IllegalArgumentException("host cannot be empty");
        }
        if (!input.matches("(?i)https?://.*")) {
            input = "http://" + input;
        }
        URI u = URI.create(input);
        String scheme = u.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Only http or https device URLs are supported.");
        }
        String host = u.getHost();
        if (host == null || host.isEmpty()) {
            throw new IllegalArgumentException("Cannot parse device address: " + hostOrBaseUrl);
        }
        boolean ipv6 = host.contains(":") && !host.contains(".");
        String hostPart = ipv6 ? "[" + host + "]" : host;
        try {
            return new URI(scheme.toLowerCase(), null, hostPart, DEVICE_HTTP_PORT, null, null, null).toString();
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }

    /**
     * JSON string for access QR payload; sign = md5(value + timestamp + key).
     * Same rule as Node: {@code if (!value && value !== 0) throw}. Empty key → no {@code sign}.
     */
    public static String generateQrStr(Object value, String key) {
        if (value == null) {
            throw new IllegalArgumentException("value cannot be empty");
        }
        if (value instanceof Number) {
            /* any number, including 0 */
        } else if (value instanceof Boolean) {
            if (!Boolean.TRUE.equals(value)) {
                throw new IllegalArgumentException("value cannot be empty");
            }
        } else if (String.valueOf(value).isEmpty()) {
            throw new IllegalArgumentException("value cannot be empty");
        }
        long ts = System.currentTimeMillis();
        String keyTrim = key == null ? "" : key.trim();
        String v = String.valueOf(value);
        JsonObject o = new JsonObject();
        o.addProperty("value", v);
        o.addProperty("timestamp", ts);
        if (!keyTrim.isEmpty()) {
            o.addProperty("sign", md5Hex(v + ts + keyTrim));
        }
        return new Gson().toJson(o);
    }

    public static String generateQrStr(Object value) {
        return generateQrStr(value, "");
    }

    private static String md5Hex(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] dig = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(32);
            for (byte b : dig) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Scan .1–.254; parallel across groups, serial within group (same as Node). */
    public static List<ScanResult> scan(String subnet) {
        return scan(subnet, null);
    }

    public static List<ScanResult> scan(String subnet, ScanOptions opts) {
        if (opts == null) {
            opts = new ScanOptions();
        }
        if (!SUBNET.matcher(subnet.trim()).matches()) {
            throw new IllegalArgumentException("subnet must be \"A.B.C\", e.g. \"192.168.50\"");
        }
        subnet = subnet.trim();
        int timeoutMs = opts.timeoutMs;
        int concurrency = opts.concurrency;
        Consumer<ScanResult> onFound = opts.onFound;

        List<String> ips = new ArrayList<>(254);
        for (int i = 1; i <= 254; i++) {
            ips.add(subnet + "." + i);
        }
        @SuppressWarnings("unchecked")
        List<String>[] groups = new List[concurrency];
        for (int i = 0; i < concurrency; i++) {
            groups[i] = new ArrayList<>();
        }
        for (int idx = 0; idx < ips.size(); idx++) {
            groups[idx % concurrency].add(ips.get(idx));
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();

        ExecutorService pool = Executors.newFixedThreadPool(concurrency);
        List<Future<List<ScanResult>>> futs = new ArrayList<>();
        for (List<String> g : groups) {
            futs.add(pool.submit(() -> probeGroup(client, g, timeoutMs, onFound)));
        }
        List<ScanResult> all = new ArrayList<>();
        try {
            for (Future<List<ScanResult>> f : futs) {
                all.addAll(f.get());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        } catch (ExecutionException e) {
            Throwable c = e.getCause();
            if (c instanceof RuntimeException) {
                throw (RuntimeException) c;
            }
            if (c instanceof Error) {
                throw (Error) c;
            }
            throw new IllegalStateException(c);
        } finally {
            pool.shutdown();
        }

        all.sort(Comparator.comparingInt(r -> lastOctet(r.ip)));
        return all;
    }

    private static int lastOctet(String ip) {
        int dot = ip.lastIndexOf('.');
        return dot < 0 ? 0 : Integer.parseInt(ip.substring(dot + 1));
    }

    private static List<ScanResult> probeGroup(
            HttpClient client, List<String> ips, int timeoutMs, Consumer<ScanResult> onFound) {
        List<ScanResult> out = new ArrayList<>();
        for (String ip : ips) {
            ScanResult r = probeOne(client, ip, timeoutMs, onFound);
            if (r != null) {
                out.add(r);
            }
        }
        return out;
    }

    private static ScanResult probeOne(
            HttpClient client, String ip, int timeoutMs, Consumer<ScanResult> onFound) {
        String url = "http://" + ip + ":" + DEVICE_HTTP_PORT + "/api/v1/test";
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofMillis(timeoutMs))
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() / 100 != 2) {
                return null;
            }
            JsonElement el = JsonParser.parseString(resp.body());
            if (!el.isJsonObject()) {
                return null;
            }
            JsonObject o = el.getAsJsonObject();
            if (!o.has("code") || o.get("code").getAsInt() != 0) {
                return null;
            }
            if (!o.has("data") || !o.get("data").isJsonObject()) {
                return null;
            }
            JsonObject data = o.getAsJsonObject("data");
            if (!data.has("sn")) {
                return null;
            }
            String sn = data.get("sn").getAsString();
            if (sn == null || sn.isEmpty()) {
                return null;
            }
            long ts = data.has("timestamp") ? data.get("timestamp").getAsLong() : 0L;
            ScanResult s = new ScanResult(ip, sn, ts);
            if (onFound != null) {
                onFound.accept(s);
            }
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    private String url(String path, Map<String, String> query) {
        StringBuilder sb = new StringBuilder(base).append(path);
        if (query != null && !query.isEmpty()) {
            StringBuilder q = new StringBuilder();
            for (Map.Entry<String, String> e : query.entrySet()) {
                if (e.getValue() == null || e.getValue().isEmpty()) {
                    continue;
                }
                if (q.length() > 0) {
                    q.append('&');
                }
                q.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8))
                        .append('=')
                        .append(URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8));
            }
            if (q.length() > 0) {
                sb.append('?').append(q);
            }
        }
        return sb.toString();
    }

    private JsonElement check(HttpResponse<String> resp) throws DW200Exception {
        String raw = resp.body();
        JsonElement el;
        try {
            el = JsonParser.parseString(raw);
        } catch (Exception e) {
            throw new DW200Exception("Unexpected response body: " + raw, null, resp.statusCode());
        }
        if (!el.isJsonObject()) {
            throw new DW200Exception("Unexpected response body: " + raw, null, resp.statusCode());
        }
        JsonObject o = el.getAsJsonObject();
        if (!o.has("code")) {
            throw new DW200Exception("Unexpected response body: " + raw, null, resp.statusCode());
        }
        int code = o.get("code").getAsInt();
        if (code == 0) {
            if (!o.has("data") || o.get("data").isJsonNull()) {
                return null;
            }
            return o.get("data");
        }
        String msg = o.has("message") ? o.get("message").getAsString() : "API error";
        throw new DW200Exception(msg, code, resp.statusCode());
    }

    private JsonElement request(
            String method, String path, Map<String, String> query, JsonElement body, boolean withKey)
            throws IOException, InterruptedException, DW200Exception {
        String u = url(path, query);
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(u))
                .timeout(Duration.ofMillis(timeoutMs))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json");
        if (withKey) {
            b.header("X-API-Key", apiKey);
        }
        if ("GET".equals(method)) {
            b.GET();
        } else {
            String json = body == null ? "{}" : gson.toJson(body);
            b.method("POST", HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
        }
        HttpResponse<String> resp = http.send(b.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        return check(resp);
    }

    public JsonElement test() throws IOException, InterruptedException, DW200Exception {
        String u = url("/api/v1/test", null);
        HttpRequest req = HttpRequest.newBuilder(URI.create(u))
                .timeout(Duration.ofMillis(timeoutMs))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        return check(resp);
    }

    public JsonElement getDeviceInfo() throws IOException, InterruptedException, DW200Exception {
        return request("GET", "/api/v1/device/info", null, null, true);
    }

    public JsonElement getConfig() throws IOException, InterruptedException, DW200Exception {
        return request("GET", "/api/v1/device/config", null, null, true);
    }

    public JsonElement setConfig(JsonObject config) throws IOException, InterruptedException, DW200Exception {
        Objects.requireNonNull(config);
        if (config.entrySet().isEmpty()) {
            throw new IllegalArgumentException("config is empty; nothing to update");
        }
        if (config.has("adminPassword")) {
            String ap = config.get("adminPassword").getAsString();
            if (!ap.matches("^\\d{6}$")) {
                throw new IllegalArgumentException("adminPassword must be exactly 6 digits");
            }
        }
        if (config.has("webhookUrl") && !config.get("webhookUrl").isJsonNull()) {
            String wh = config.get("webhookUrl").getAsString();
            if (!wh.isEmpty() && !wh.matches("(?i)https?://.+")) {
                throw new IllegalArgumentException("webhookUrl must start with http:// or https://");
            }
        }
        JsonObject cfg = config.deepCopy();
        if (cfg.has("networkConfig") && cfg.get("networkConfig").isJsonObject()) {
            cfg.addProperty("networkConfig", gson.toJson(cfg.get("networkConfig")));
        }
        JsonObject body = new JsonObject();
        body.add("config", cfg);
        return request("POST", "/api/v1/device/config", null, body, true);
    }

    public JsonElement openDoor() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/device/opendoor", null, new JsonObject(), true);
    }

    public JsonElement reboot() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/device/reboot", null, new JsonObject(), true);
    }

    public JsonElement clearAllData() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/device/cleardata", null, new JsonObject(), true);
    }

    public JsonElement upgradeFirmware(String url, String md5hex)
            throws IOException, InterruptedException, DW200Exception {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("url cannot be empty");
        }
        String u = url.trim();
        if (!u.matches("(?i)https?://.+")) {
            throw new IllegalArgumentException("url must start with http:// or https://");
        }
        String m = md5hex == null ? "" : md5hex.trim().toLowerCase();
        if (!m.matches("^[a-f0-9]{32}$")) {
            throw new IllegalArgumentException("md5 must be a 32-character lowercase hex string");
        }
        JsonObject body = new JsonObject();
        body.addProperty("url", u);
        body.addProperty("md5", m);
        return request("POST", "/api/v1/device/upgrade", null, body, true);
    }

    public JsonElement setTime(LocalDateTime time) throws IOException, InterruptedException, DW200Exception {
        String timeStr = (time == null ? LocalDateTime.now() : time)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        if (!TIME_STR.matcher(timeStr).matches()) {
            throw new IllegalArgumentException("time must be \"YYYY-MM-DD HH:mm:ss\"");
        }
        JsonObject body = new JsonObject();
        body.addProperty("time", timeStr);
        return request("POST", "/api/v1/device/time", null, body, true);
    }

    public JsonElement setTime(String timeStr) throws IOException, InterruptedException, DW200Exception {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return setTime((LocalDateTime) null);
        }
        String t = timeStr.trim();
        if (!TIME_STR.matcher(t).matches()) {
            throw new IllegalArgumentException("time must be \"YYYY-MM-DD HH:mm:ss\"");
        }
        JsonObject body = new JsonObject();
        body.addProperty("time", t);
        return request("POST", "/api/v1/device/time", null, body, true);
    }

    public JsonElement setBackground(String base64) throws IOException, InterruptedException, DW200Exception {
        if (base64 == null || base64.trim().isEmpty()) {
            throw new IllegalArgumentException("base64 image data cannot be empty");
        }
        String clean = base64.trim().replaceFirst("(?i)^data:image/[a-z]+;base64,", "");
        JsonObject body = new JsonObject();
        body.addProperty("image", clean);
        return request("POST", "/api/v1/device/background", null, body, true);
    }

    public JsonElement addUsers(List<Map<String, Object>> users)
            throws IOException, InterruptedException, DW200Exception {
        if (users == null || users.isEmpty()) {
            throw new IllegalArgumentException("users must be a non-empty array");
        }
        if (users.size() > 100) {
            throw new IllegalArgumentException("At most 100 users per request");
        }
        JsonArray arr = new JsonArray();
        for (int i = 0; i < users.size(); i++) {
            validateUser(users.get(i), i);
            arr.add(gson.toJsonTree(users.get(i)));
        }
        JsonObject body = new JsonObject();
        body.add("users", arr);
        return request("POST", "/api/v1/users/add", null, body, true);
    }

    private void validateUser(Map<String, Object> u, int index) {
        try {
            if (!isStr(u.get("userId"))) {
                throw new IllegalArgumentException("userId cannot be empty");
            }
            if (!isStr(u.get("name"))) {
                throw new IllegalArgumentException("name cannot be empty");
            }
            Object type = u.get("type");
            List<String> valid = List.of("nfc", "pin", "qr", "ble", "face");
            if (!(type instanceof String) || !valid.contains(type)) {
                throw new IllegalArgumentException("type must be one of: nfc / pin / qr / ble / face");
            }
            if (!isStr(u.get("value"))) {
                throw new IllegalArgumentException("value cannot be empty");
            }
            if (u.containsKey("period") && u.get("period") != null) {
                JsonElement pe = gson.toJsonTree(u.get("period"));
                if (!pe.isJsonObject()) {
                    throw new IllegalArgumentException("period must be an object");
                }
                Period.assertPeriod(pe.getAsJsonObject());
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("users[" + index + "]: " + e.getMessage(), e);
        }
    }

    private static boolean isStr(Object v) {
        return v instanceof String && !((String) v).trim().isEmpty();
    }

    public JsonElement deleteUser(List<String> userIds) throws IOException, InterruptedException, DW200Exception {
        List<String> cleaned = new ArrayList<>();
        for (String x : userIds) {
            if (x != null && !x.trim().isEmpty()) {
                cleaned.add(x.trim());
            }
        }
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("userIds cannot be empty");
        }
        JsonObject body = new JsonObject();
        body.add("userIds", gson.toJsonTree(cleaned));
        return request("POST", "/api/v1/users/delete", null, body, true);
    }

    public JsonElement deleteUser(String userId) throws IOException, InterruptedException, DW200Exception {
        return deleteUser(List.of(userId));
    }

    public JsonElement deleteUserByIds(List<Integer> ids) throws IOException, InterruptedException, DW200Exception {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("ids must be a non-empty array");
        }
        JsonObject body = new JsonObject();
        body.add("ids", gson.toJsonTree(ids));
        return request("POST", "/api/v1/users/delete", null, body, true);
    }

    public JsonElement listUsers(int page, int size, Map<String, String> filters)
            throws IOException, InterruptedException, DW200Exception {
        if (page < 1 || size < 1) {
            throw new IllegalArgumentException("page and size must be positive integers");
        }
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("size", String.valueOf(size));
        if (filters != null) {
            List<String> valid = List.of("nfc", "pin", "qr", "ble", "face");
            String t = filters.get("type");
            if (t != null && !t.isEmpty() && !valid.contains(t)) {
                throw new IllegalArgumentException("filters.type must be one of: nfc / pin / qr / ble / face");
            }
            for (String k : List.of("userId", "name", "type", "value")) {
                String v = filters.get(k);
                if (v != null && !v.isEmpty()) {
                    q.put(k, v);
                }
            }
        }
        return request("GET", "/api/v1/users/list", q, null, true);
    }

    public JsonElement listUsers() throws IOException, InterruptedException, DW200Exception {
        return listUsers(1, 50, null);
    }

    public JsonElement clearUsers() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/users/clear", null, new JsonObject(), true);
    }

    public JsonElement listAccess(int page, int size, Map<String, String> filters)
            throws IOException, InterruptedException, DW200Exception {
        if (page < 1 || size < 1) {
            throw new IllegalArgumentException("page and size must be positive integers");
        }
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("size", String.valueOf(size));
        if (filters != null) {
            List<String> valid = List.of("nfc", "pin", "qr", "ble", "face", "remote");
            String t = filters.get("type");
            if (t != null && !t.isEmpty() && !valid.contains(t)) {
                throw new IllegalArgumentException("filters.type must be one of: nfc / pin / qr / ble / face / remote");
            }
            String res = filters.get("result");
            if (res != null && !res.isEmpty() && !"0".equals(res) && !"1".equals(res)) {
                throw new IllegalArgumentException("filters.result must be 0 or 1");
            }
            for (String k : List.of("userId", "name", "type", "value")) {
                String v = filters.get(k);
                if (v != null && !v.isEmpty()) {
                    q.put(k, v);
                }
            }
            if (res != null && !res.isEmpty()) {
                q.put("result", res);
            }
        }
        return request("GET", "/api/v1/access", q, null, true);
    }

    public JsonElement listAccess() throws IOException, InterruptedException, DW200Exception {
        return listAccess(1, 100, null);
    }

    public JsonElement deleteAccess(List<Integer> ids) throws IOException, InterruptedException, DW200Exception {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("ids must be a non-empty array");
        }
        JsonObject body = new JsonObject();
        body.add("ids", gson.toJsonTree(ids));
        return request("POST", "/api/v1/access/delete", null, body, true);
    }

    public JsonElement clearAccess() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/access/clear", null, new JsonObject(), true);
    }

    public JsonElement listEvents(int page, int size, Map<String, String> filters)
            throws IOException, InterruptedException, DW200Exception {
        if (page < 1 || size < 1) {
            throw new IllegalArgumentException("page and size must be positive integers");
        }
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("size", String.valueOf(size));
        if (filters != null) {
            List<String> valid = List.of("info", "warning", "error");
            String t = filters.get("type");
            if (t != null && !t.isEmpty() && !valid.contains(t)) {
                throw new IllegalArgumentException("filters.type must be one of: info / warning / error");
            }
            if (t != null && !t.isEmpty()) {
                q.put("type", t);
            }
            String msg = filters.get("message");
            if (msg != null && !msg.isEmpty()) {
                q.put("message", msg);
            }
        }
        return request("GET", "/api/v1/events", q, null, true);
    }

    public JsonElement listEvents() throws IOException, InterruptedException, DW200Exception {
        return listEvents(1, 100, null);
    }

    public JsonElement deleteEvents(List<Integer> ids) throws IOException, InterruptedException, DW200Exception {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("ids must be a non-empty array");
        }
        JsonObject body = new JsonObject();
        body.add("ids", gson.toJsonTree(ids));
        return request("POST", "/api/v1/events/delete", null, body, true);
    }

    public JsonElement clearEvents() throws IOException, InterruptedException, DW200Exception {
        return request("POST", "/api/v1/events/clear", null, new JsonObject(), true);
    }
}
