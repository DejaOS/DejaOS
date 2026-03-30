using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Dw200Client;

public sealed class Dw200Client : IDisposable
{
    /// <summary>Fixed device HTTP port (matches firmware; not configurable).</summary>
    public const int DeviceHttpPort = 8080;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly Regex SubnetPrefixRegex = new(
        @"^\d{1,3}\.\d{1,3}\.\d{1,3}$",
        RegexOptions.Compiled);

    private readonly HttpClient _http;
    private readonly string _apiKey;

    public Dw200Client(string hostOrBaseUrl, string apiKey = "password", int timeoutMs = 10_000, HttpMessageHandler? handler = null)
    {
        if (string.IsNullOrWhiteSpace(hostOrBaseUrl))
        {
            throw new ArgumentException("hostOrBaseUrl cannot be empty.", nameof(hostOrBaseUrl));
        }

        var baseUri = BuildBaseAddressWithFixedPort(hostOrBaseUrl);

        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _http.BaseAddress = baseUri;
        _http.Timeout = TimeSpan.FromMilliseconds(timeoutMs);
        _apiKey = string.IsNullOrWhiteSpace(apiKey) ? "password" : apiKey.Trim();
    }

    /// <summary>Parses host or URL, normalizes to <c>http(s)://host:8080/</c> (ignores port and path in input).</summary>
    public static Uri BuildBaseAddressWithFixedPort(string hostOrBaseUrl)
    {
        var input = hostOrBaseUrl.Trim();
        if (!input.Contains("://", StringComparison.Ordinal))
        {
            input = "http://" + input;
        }

        if (!Uri.TryCreate(input, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException($"Cannot parse device address: {hostOrBaseUrl}", nameof(hostOrBaseUrl));
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new ArgumentException("Only http or https device URLs are supported.", nameof(hostOrBaseUrl));
        }

        var builder = new UriBuilder(uri)
        {
            Port = DeviceHttpPort,
            Path = "/",
            Query = string.Empty,
            Fragment = string.Empty
        };
        return builder.Uri;
    }

    /// <summary>Validates subnet prefix format (same as Node <c>DW200Client.scan</c>): <c>A.B.C</c>.</summary>
    public static bool IsValidSubnetPrefix(string? subnet, out string prefix)
    {
        prefix = (subnet ?? string.Empty).Trim();
        if (prefix.Length == 0 || !SubnetPrefixRegex.IsMatch(prefix))
        {
            prefix = string.Empty;
            return false;
        }

        return true;
    }

    /// <summary>
    /// Scans <c>.1</c>–<c>.254</c>; parallel across groups, serial within group; GET <c>/api/v1/test</c> (no API key), aligned with Node <c>DW200Client.scan</c>.
    /// </summary>
    public static async Task<IReadOnlyList<ScannedDevice>> ScanSubnetAsync(
        string subnetPrefix,
        int timeoutMs = 1500,
        int concurrency = 10,
        Action<ScannedDevice>? onFound = null,
        CancellationToken ct = default)
    {
        if (!IsValidSubnetPrefix(subnetPrefix, out var prefix) || prefix.Length == 0)
        {
            throw new ArgumentException(@"subnet must be ""A.B.C"", e.g. ""192.168.50""", nameof(subnetPrefix));
        }

        if (concurrency < 1)
        {
            concurrency = 10;
        }

        var groups = new List<string>[concurrency];
        for (var g = 0; g < concurrency; g++)
        {
            groups[g] = new List<string>();
        }

        for (var i = 1; i <= 254; i++)
        {
            groups[(i - 1) % concurrency].Add($"{prefix}.{i}");
        }

        using var handler = new SocketsHttpHandler();
        using var http = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        async Task<List<ScannedDevice>> ScanGroupAsync(List<string> group)
        {
            var results = new List<ScannedDevice>();
            foreach (var ip in group)
            {
                ct.ThrowIfCancellationRequested();
                var found = await ProbeSubnetHostAsync(http, ip, timeoutMs, onFound, ct).ConfigureAwait(false);
                if (found is not null)
                {
                    results.Add(found);
                }
            }

            return results;
        }

        var nested = await Task.WhenAll(groups.Select(ScanGroupAsync)).ConfigureAwait(false);
        var flat = nested.SelectMany(x => x).ToList();
        flat.Sort(static (a, b) =>
            LastOctet(a.Ip).CompareTo(LastOctet(b.Ip)));
        return flat;
    }

    private static int LastOctet(string ip)
    {
        var dot = ip.LastIndexOf('.');
        return int.Parse(ip.AsSpan(dot + 1), CultureInfo.InvariantCulture);
    }

    private static async Task<ScannedDevice?> ProbeSubnetHostAsync(
        HttpClient http,
        string ip,
        int timeoutMs,
        Action<ScannedDevice>? onFound,
        CancellationToken ct)
    {
        var uri = new Uri($"http://{ip}:{DeviceHttpPort}/api/v1/test");
        try
        {
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
            linked.CancelAfter(timeoutMs);
            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            using var rsp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, linked.Token)
                .ConfigureAwait(false);
            var body = await rsp.Content.ReadAsStringAsync(linked.Token).ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(body))
            {
                return null;
            }

            var api = JsonSerializer.Deserialize<ApiResponse<TestData>>(body, JsonOptions);
            if (api is null || api.Code != 0 || api.Data is null || string.IsNullOrWhiteSpace(api.Data.Sn))
            {
                return null;
            }

            var device = new ScannedDevice(ip, api.Data.Sn.Trim(), api.Data.Timestamp);
            onFound?.Invoke(device);
            return device;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            return null;
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task<TestData> TestAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/test");
        return await SendAsync<TestData>(req, withApiKey: false, ct);
    }

    public async Task<DeviceInfoData> GetDeviceInfoAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/device/info");
        return await SendAsync<DeviceInfoData>(req, withApiKey: true, ct);
    }

    public async Task<Dictionary<string, JsonElement>> GetConfigAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/device/config");
        return await SendAsync<Dictionary<string, JsonElement>>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> SetConfigAsync(object config, CancellationToken ct = default)
    {
        if (config is null)
        {
            throw new ArgumentNullException(nameof(config));
        }

        var sanitized = SanitizeConfigPayload(config);
        using var req = BuildJsonRequest("api/v1/device/config", new { config = sanitized });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> OpenDoorAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/device/opendoor", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> RebootAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/device/reboot", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> ClearAllDataAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/device/cleardata", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> ClearUsersAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/users/clear", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> DeleteUsersAsync(IReadOnlyList<string> userIds, CancellationToken ct = default)
    {
        if (userIds is null || userIds.Count == 0)
        {
            throw new ArgumentException("userIds must be a non-empty collection.", nameof(userIds));
        }

        var cleaned = userIds
            .Select(x => x?.Trim() ?? string.Empty)
            .Where(x => x.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (cleaned.Length == 0)
        {
            throw new ArgumentException("userIds cannot be empty.", nameof(userIds));
        }

        using var req = BuildJsonRequest("api/v1/users/delete", new { userIds = cleaned });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> DeleteUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("userId cannot be empty.", nameof(userId));
        }

        return await DeleteUsersAsync([userId.Trim()], ct);
    }

    /// <summary>Deletes credential rows by id (other credentials for the same user remain).</summary>
    public async Task<JsonElement?> DeleteUserCredentialsByIdsAsync(IReadOnlyList<long> ids, CancellationToken ct = default)
    {
        if (ids is null || ids.Count == 0)
        {
            throw new ArgumentException("ids must be a non-empty collection.", nameof(ids));
        }

        using var req = BuildJsonRequest("api/v1/users/delete", new { ids = ids.ToArray() });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    /// <summary>Lists user credentials (paged, optional filters).</summary>
    public async Task<PagedList<UserCredentialDto>> ListUsersAsync(
        int page = 1,
        int size = 50,
        UsersFilters? filters = null,
        CancellationToken ct = default)
    {
        if (page < 1)
        {
            throw new ArgumentException("page must be a positive integer.", nameof(page));
        }
        if (size < 1)
        {
            throw new ArgumentException("size must be a positive integer.", nameof(size));
        }

        filters ??= new UsersFilters();
        if (!string.IsNullOrWhiteSpace(filters.Type) && !UsersFilters.ValidTypes.Contains(filters.Type.Trim()))
        {
            throw new ArgumentException($"filters.type must be one of: {string.Join(" / ", UsersFilters.ValidTypes)}.", nameof(filters));
        }

        var query = new Dictionary<string, string?>
        {
            ["page"] = page.ToString(CultureInfo.InvariantCulture),
            ["size"] = size.ToString(CultureInfo.InvariantCulture),
            ["userId"] = filters.UserId,
            ["name"] = filters.Name,
            ["type"] = filters.Type,
            ["value"] = filters.Value
        };

        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/users/list" + BuildQueryString(query));
        return await SendAsync<PagedList<UserCredentialDto>>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> AddUsersAsync(IReadOnlyList<DeviceUserUpsertItem> users, CancellationToken ct = default)
    {
        if (users is null || users.Count == 0)
        {
            throw new ArgumentException("users must be a non-empty collection.", nameof(users));
        }
        if (users.Count > 100)
        {
            throw new ArgumentException("At most 100 users per request.", nameof(users));
        }

        for (var i = 0; i < users.Count; i++)
        {
            ValidateUserUpsertItem(users[i], i);
        }

        using var req = BuildJsonRequest("api/v1/users/add", new { users });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    /// <summary>Sets device time from the given local <see cref="DateTime"/>.</summary>
    public Task<JsonElement?> SetTimeAsync(DateTime dateTime, CancellationToken ct = default) =>
        SetTimeAsync(FormatLocalDateTime(dateTime), ct);

    /// <summary>
    /// Sets device time (<c>YYYY-MM-DD HH:mm:ss</c>). If <paramref name="time"/> is null or whitespace, uses current local time (same as Node SDK).
    /// To pass only a cancellation token, use <c>SetTimeAsync(cancellationToken: ct)</c>.
    /// </summary>
    public async Task<JsonElement?> SetTimeAsync(string? time = null, CancellationToken ct = default)
    {
        var timeText = string.IsNullOrWhiteSpace(time)
            ? FormatLocalDateTime(DateTime.Now)
            : time.Trim();

        if (!Regex.IsMatch(timeText, @"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$"))
        {
            throw new ArgumentException(@"time must be ""YYYY-MM-DD HH:mm:ss"".", nameof(time));
        }

        using var req = BuildJsonRequest("api/v1/device/time", new { time = timeText });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    /// <summary>Uploads home background image (PNG base64, without data:image/... prefix).</summary>
    public async Task<JsonElement?> SetBackgroundAsync(string base64Png, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(base64Png))
        {
            throw new ArgumentException("base64Png cannot be empty.", nameof(base64Png));
        }

        // Accept data URL: data:image/png;base64,xxxx
        var text = base64Png.Trim();
        var comma = text.IndexOf(',');
        if (comma >= 0)
        {
            text = text[(comma + 1)..];
        }

        using var req = BuildJsonRequest("api/v1/device/background", new { image = text });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> UpgradeFirmwareAsync(string url, string md5, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new ArgumentException("url cannot be empty.", nameof(url));
        }

        var urlText = url.Trim();
        if (!urlText.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !urlText.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("url must start with http:// or https://.", nameof(url));
        }

        var md5Text = md5?.Trim() ?? string.Empty;
        if (!Regex.IsMatch(md5Text, "^[a-fA-F0-9]{32}$"))
        {
            throw new ArgumentException("md5 must be a 32-character hexadecimal string.", nameof(md5));
        }

        using var req = BuildJsonRequest("api/v1/device/upgrade", new { url = urlText, md5 = md5Text.ToLowerInvariant() });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    // ─── Access & event records ─────────────────────────────────────────────────

    public async Task<PagedList<AccessRecordDto>> ListAccessAsync(
        int page = 1,
        int size = 100,
        AccessFilters? filters = null,
        CancellationToken ct = default)
    {
        if (page < 1)
        {
            throw new ArgumentException("page must be a positive integer.", nameof(page));
        }
        if (size < 1)
        {
            throw new ArgumentException("size must be a positive integer.", nameof(size));
        }

        filters ??= new AccessFilters();
        if (!string.IsNullOrWhiteSpace(filters.Type) && !AccessFilters.ValidTypes.Contains(filters.Type.Trim()))
        {
            throw new ArgumentException($"filters.type must be one of: {string.Join(" / ", AccessFilters.ValidTypes)}.", nameof(filters));
        }
        if (filters.Result is not null && filters.Result is not (0 or 1))
        {
            throw new ArgumentException("filters.result must be 0 or 1.", nameof(filters));
        }

        var query = new Dictionary<string, string?>
        {
            ["page"] = page.ToString(CultureInfo.InvariantCulture),
            ["size"] = size.ToString(CultureInfo.InvariantCulture),
            ["userId"] = filters.UserId,
            ["name"] = filters.Name,
            ["type"] = filters.Type,
            ["value"] = filters.Value,
            ["result"] = filters.Result?.ToString(CultureInfo.InvariantCulture)
        };

        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/access" + BuildQueryString(query));
        return await SendAsync<PagedList<AccessRecordDto>>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> DeleteAccessAsync(long[] ids, CancellationToken ct = default)
    {
        if (ids is null || ids.Length == 0)
        {
            throw new ArgumentException("ids must be a non-empty collection.", nameof(ids));
        }

        using var req = BuildJsonRequest("api/v1/access/delete", new { ids });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> ClearAccessAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/access/clear", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<PagedList<EventRecordDto>> ListEventsAsync(
        int page = 1,
        int size = 100,
        EventsFilters? filters = null,
        CancellationToken ct = default)
    {
        if (page < 1)
        {
            throw new ArgumentException("page must be a positive integer.", nameof(page));
        }
        if (size < 1)
        {
            throw new ArgumentException("size must be a positive integer.", nameof(size));
        }

        filters ??= new EventsFilters();
        if (!string.IsNullOrWhiteSpace(filters.Type) && !EventsFilters.ValidTypes.Contains(filters.Type.Trim()))
        {
            throw new ArgumentException($"filters.type must be one of: {string.Join(" / ", EventsFilters.ValidTypes)}.", nameof(filters));
        }

        var query = new Dictionary<string, string?>
        {
            ["page"] = page.ToString(CultureInfo.InvariantCulture),
            ["size"] = size.ToString(CultureInfo.InvariantCulture),
            ["type"] = filters.Type,
            ["message"] = filters.Message
        };

        using var req = new HttpRequestMessage(HttpMethod.Get, "api/v1/events" + BuildQueryString(query));
        return await SendAsync<PagedList<EventRecordDto>>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> DeleteEventsAsync(long[] ids, CancellationToken ct = default)
    {
        if (ids is null || ids.Length == 0)
        {
            throw new ArgumentException("ids must be a non-empty collection.", nameof(ids));
        }

        using var req = BuildJsonRequest("api/v1/events/delete", new { ids });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public async Task<JsonElement?> ClearEventsAsync(CancellationToken ct = default)
    {
        using var req = BuildJsonRequest("api/v1/events/clear", new { });
        return await SendAsync<JsonElement?>(req, withApiKey: true, ct);
    }

    public static string GenerateQrPayload(string value, string? key = null)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("value cannot be empty.", nameof(value));
        }

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        key = key?.Trim();
        if (string.IsNullOrEmpty(key))
        {
            return JsonSerializer.Serialize(new { value, timestamp }, JsonOptions);
        }

        using var md5 = MD5.Create();
        var bytes = Encoding.UTF8.GetBytes(value + timestamp + key);
        var sign = Convert.ToHexString(md5.ComputeHash(bytes)).ToLowerInvariant();
        return JsonSerializer.Serialize(new { value, timestamp, sign }, JsonOptions);
    }

    private HttpRequestMessage BuildJsonRequest(string path, object payload)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        return req;
    }

    private static string FormatLocalDateTime(DateTime dt) =>
        dt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);

    private static JsonElement SanitizeConfigPayload(object config)
    {
        var root = JsonSerializer.SerializeToElement(config, JsonOptions);
        if (root.ValueKind != JsonValueKind.Object)
        {
            throw new ArgumentException("config must be an object.", nameof(config));
        }

        var node = JsonNode.Parse(root.GetRawText())!.AsObject();
        if (node.Count == 0)
        {
            throw new ArgumentException("config is empty; nothing to update.", nameof(config));
        }

        foreach (var key in node.Select(static kv => kv.Key).ToList())
        {
            var val = node[key];
            if (val is null)
            {
                continue;
            }

            if (string.Equals(key, "adminPassword", StringComparison.OrdinalIgnoreCase)
                && val is JsonValue jv
                && jv.TryGetValue<string>(out var ap)
                && ap.Length > 0
                && !Regex.IsMatch(ap, @"^\d{6}$"))
            {
                throw new ArgumentException("adminPassword must be exactly 6 digits.", nameof(config));
            }

            if (string.Equals(key, "webhookUrl", StringComparison.OrdinalIgnoreCase)
                && val is JsonValue jw
                && jw.TryGetValue<string>(out var wh)
                && wh.Length > 0
                && !wh.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                && !wh.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("webhookUrl must start with http:// or https://.", nameof(config));
            }

            if (string.Equals(key, "networkConfig", StringComparison.OrdinalIgnoreCase) && val is JsonObject ncObj)
            {
                node[key] = JsonValue.Create(ncObj.ToJsonString());
            }
        }

        using var doc = JsonDocument.Parse(node.ToJsonString());
        return doc.RootElement.Clone();
    }

    private static void ValidateUserUpsertItem(DeviceUserUpsertItem u, int index)
    {
        var prefix = $"users[{index}]";
        if (string.IsNullOrWhiteSpace(u.UserId))
        {
            throw new ArgumentException($"{prefix}: userId cannot be empty.", nameof(u));
        }
        if (string.IsNullOrWhiteSpace(u.Name))
        {
            throw new ArgumentException($"{prefix}: name cannot be empty.", nameof(u));
        }
        var t = u.Type?.Trim() ?? string.Empty;
        if (!DeviceUserUpsertItem.ValidCredentialTypes.Contains(t))
        {
            throw new ArgumentException(
                $"{prefix}: type must be one of: {string.Join(" / ", DeviceUserUpsertItem.ValidCredentialTypes)}.",
                nameof(u));
        }
        if (string.IsNullOrWhiteSpace(u.Value))
        {
            throw new ArgumentException($"{prefix}: value cannot be empty.", nameof(u));
        }
        if (u.Period is { } p)
        {
            try
            {
                Dw200Period.Validate(p);
            }
            catch (ArgumentException ex)
            {
                throw new ArgumentException($"{prefix}: {ex.Message}", nameof(u), ex);
            }
        }
    }

    private static string BuildQueryString(IReadOnlyDictionary<string, string?> query)
    {
        var parts = new List<string>();
        foreach (var (k, v) in query)
        {
            if (string.IsNullOrWhiteSpace(v))
            {
                continue;
            }

            parts.Add(Uri.EscapeDataString(k) + "=" + Uri.EscapeDataString(v.Trim()));
        }

        return parts.Count == 0 ? string.Empty : "?" + string.Join("&", parts);
    }

    private async Task<T> SendAsync<T>(HttpRequestMessage req, bool withApiKey, CancellationToken ct)
    {
        if (withApiKey)
        {
            req.Headers.Add("X-API-Key", _apiKey);
        }

        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var rsp = await _http.SendAsync(req, ct);
        var body = await rsp.Content.ReadAsStringAsync(ct);
        var api = JsonSerializer.Deserialize<ApiResponse<T>>(body, JsonOptions)
                  ?? throw new InvalidOperationException("Device response could not be parsed.");
        if (api.Code != 0)
        {
            throw new InvalidOperationException($"Device returned error code={api.Code}, message={api.Message}");
        }

        return api.Data!;
    }

    public void Dispose() => _http.Dispose();
}

public sealed class ApiResponse<T>
{
    [JsonPropertyName("code")] public int Code { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }
    [JsonPropertyName("data")] public T? Data { get; set; }
}

public sealed class TestData
{
    [JsonPropertyName("sn")] public string? Sn { get; set; }
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("timestamp")] public long Timestamp { get; set; }
}

/// <summary>One entry from LAN scan (same fields as Node <c>DW200Client.scan</c>).</summary>
public sealed record ScannedDevice(string Ip, string Sn, long Timestamp);

public sealed class DeviceInfoData
{
    [JsonPropertyName("sn")] public string? Sn { get; set; }
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("firmware")] public string? Firmware { get; set; }
    [JsonPropertyName("ip")] public string? Ip { get; set; }
    [JsonPropertyName("mac")] public string? Mac { get; set; }
    [JsonPropertyName("uptime")] public long? Uptime { get; set; }
    [JsonPropertyName("freeMem")] public long? FreeMem { get; set; }
    [JsonPropertyName("freeStorage")] public long? FreeStorage { get; set; }
}

public sealed class PagedList<T>
{
    [JsonPropertyName("total")] public long Total { get; set; }
    [JsonPropertyName("list")] public List<T> List { get; set; } = new();
}

public sealed class UsersFilters
{
    public static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "nfc", "pin", "qr", "ble", "face"
    };

    public string? UserId { get; init; }
    public string? Name { get; init; }
    public string? Type { get; init; }
    public string? Value { get; init; }
}

public sealed class UserCredentialDto
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("userId")] public string? UserId { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("value")] public string? Value { get; set; }
    [JsonPropertyName("period")] public JsonElement Period { get; set; }
}

public sealed class AccessFilters
{
    public static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "nfc", "pin", "qr", "ble", "face", "remote"
    };

    public string? UserId { get; init; }
    public string? Name { get; init; }
    public string? Type { get; init; }
    public string? Value { get; init; }
    public int? Result { get; init; }
}

public sealed class AccessRecordDto
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("userId")] public string? UserId { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("value")] public string? Value { get; set; }
    [JsonPropertyName("result")] public int Result { get; set; }
    /// <summary>Unix timestamp (seconds).</summary>
    [JsonPropertyName("time")] public long Time { get; set; }
}

public sealed class EventsFilters
{
    public static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "info", "warning", "error"
    };

    public string? Type { get; init; }
    public string? Message { get; init; }
}

public sealed class EventRecordDto
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("event")] public string? Event { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }
    /// <summary>Unix timestamp (seconds).</summary>
    [JsonPropertyName("time")] public long Time { get; set; }
}

public sealed class DeviceUserUpsertItem
{
    public static readonly HashSet<string> ValidCredentialTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "nfc", "pin", "qr", "ble", "face"
    };

    [JsonPropertyName("userId")] public required string UserId { get; init; }
    [JsonPropertyName("name")] public required string Name { get; init; }
    [JsonPropertyName("type")] public required string Type { get; init; }
    [JsonPropertyName("value")] public required string Value { get; init; }
    [JsonPropertyName("period")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonElement? Period { get; init; }
}

/// <summary>Builds and validates credential <c>period</c> objects (aligned with Node <c>DW200Client.period</c>).</summary>
public static class Dw200Period
{
    private static readonly JsonSerializerOptions PeriodJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly Regex SlotRegex = new(@"^\d{2}:\d{2}-\d{2}:\d{2}$", RegexOptions.Compiled);

    public static JsonElement Always() =>
        JsonSerializer.SerializeToElement(new { type = 0 }, PeriodJson);

    public static JsonElement Range(long beginTimeSeconds, long endTimeSeconds)
    {
        if (endTimeSeconds <= beginTimeSeconds)
        {
            throw new ArgumentException("endTime must be greater than beginTime.");
        }

        return JsonSerializer.SerializeToElement(new
        {
            type = 1,
            range = new { beginTime = beginTimeSeconds, endTime = endTimeSeconds }
        }, PeriodJson);
    }

    public static JsonElement Daily(string slots, (long beginTime, long endTime)? range = null)
    {
        if (string.IsNullOrWhiteSpace(slots))
        {
            throw new ArgumentException("slots cannot be empty, e.g. \"09:00-18:00\".", nameof(slots));
        }

        JsonElement el = range is { } r
            ? JsonSerializer.SerializeToElement(
                new { type = 2, dayPeriodTime = slots.Trim(), range = new { beginTime = r.beginTime, endTime = r.endTime } },
                PeriodJson)
            : JsonSerializer.SerializeToElement(new { type = 2, dayPeriodTime = slots.Trim() }, PeriodJson);

        Validate(el);
        return el;
    }

    public static JsonElement Weekly(IReadOnlyDictionary<string, string> weekMap, (long beginTime, long endTime)? range = null)
    {
        if (weekMap is null || weekMap.Count == 0)
        {
            throw new ArgumentException("weekMap cannot be empty, e.g. { \"1\": \"09:00-18:00\" }.", nameof(weekMap));
        }

        var dict = weekMap.ToDictionary(static kv => kv.Key, static kv => kv.Value, StringComparer.Ordinal);
        JsonElement el = range is { } r
            ? JsonSerializer.SerializeToElement(
                new { type = 3, weekPeriodTime = dict, range = new { beginTime = r.beginTime, endTime = r.endTime } },
                PeriodJson)
            : JsonSerializer.SerializeToElement(new { type = 3, weekPeriodTime = dict }, PeriodJson);

        Validate(el);
        return el;
    }

    /// <summary>Validates a <c>period</c> object (appendix B); used by <see cref="Dw200Client.AddUsersAsync"/> and related APIs.</summary>
    public static void Validate(JsonElement p)
    {
        if (p.ValueKind != JsonValueKind.Object)
        {
            throw new ArgumentException("period must be an object.");
        }

        if (!p.TryGetProperty("type", out var typeEl) || typeEl.ValueKind != JsonValueKind.Number)
        {
            throw new ArgumentException("period.type must be a number.");
        }

        var t = typeEl.GetInt32();
        if (t is < 0 or > 3)
        {
            throw new ArgumentException("period.type must be 0, 1, 2, or 3.");
        }

        if (t >= 1 && p.TryGetProperty("range", out var rangeEl) && rangeEl.ValueKind == JsonValueKind.Object)
        {
            if (!rangeEl.TryGetProperty("beginTime", out var bt) || bt.ValueKind != JsonValueKind.Number
                || !rangeEl.TryGetProperty("endTime", out var et) || et.ValueKind != JsonValueKind.Number)
            {
                throw new ArgumentException("period.range requires integer beginTime and endTime (seconds).");
            }
        }

        if (t == 2)
        {
            if (!p.TryGetProperty("dayPeriodTime", out var dpt) || dpt.ValueKind != JsonValueKind.String)
            {
                throw new ArgumentException("period type=2 requires dayPeriodTime string.");
            }

            var slots = dpt.GetString()!.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (slots.Length > 5)
            {
                throw new ArgumentException("dayPeriodTime allows at most 5 time slots.");
            }

            for (var i = 0; i < slots.Length; i++)
            {
                if (!SlotRegex.IsMatch(slots[i]))
                {
                    throw new ArgumentException($"dayPeriodTime slot {i + 1} must be HH:MM-HH:MM.");
                }
            }
        }

        if (t == 3)
        {
            if (!p.TryGetProperty("weekPeriodTime", out var wpt) || wpt.ValueKind != JsonValueKind.Object)
            {
                throw new ArgumentException("period type=3 requires weekPeriodTime object.");
            }

            foreach (var prop in wpt.EnumerateObject())
            {
                if (!"1234567".Contains(prop.Name, StringComparison.Ordinal) || prop.Name.Length != 1)
                {
                    throw new ArgumentException($"weekPeriodTime key \"{prop.Name}\" is invalid; use 1–7.");
                }

                if (prop.Value.ValueKind != JsonValueKind.String)
                {
                    throw new ArgumentException($"weekPeriodTime day {prop.Name} must be a time-slot string.");
                }

                var daySlots = prop.Value.GetString()!.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                for (var i = 0; i < daySlots.Length; i++)
                {
                    if (!SlotRegex.IsMatch(daySlots[i]))
                    {
                        throw new ArgumentException($"weekPeriodTime day {prop.Name} slot {i + 1} must be HH:MM-HH:MM.");
                    }
                }
            }
        }
    }
}
