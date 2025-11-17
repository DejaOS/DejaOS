const netUtils = {}


/**
 * 对 wifiList（array of objects or strings）做过滤：
 *  - 参数 list: 形如 [{ ssid: '...' }, ...] 或 ['ssid1', 'ssid2']
 *  - 返回去空、去重、解码后的 ssid 字符串数组（保持第一次出现的顺序）
 *  - options: { key: 'ssid', maxLen: 32 }
 */
netUtils.filterWifiList = function (list, options) {
    options = options || {};
    var key = options.key || 'ssid';
    var maxLen = options.maxLen || 64; // 默认 64 字符
    if (!Array.isArray(list)) return [];

    var seen = Object.create(null); // 哈希表
    var out = [];

    for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var raw;
        if (item && typeof item === 'object' && key in item) {
            raw = item[key];
        } else {
            raw = item;
        }

        var cleaned = cleanSsidRaw(raw, maxLen);
        if (!cleaned) continue; // 过滤空或非法

        // 去重，保留第一次出现
        if (seen[cleaned]) continue;
        seen[cleaned] = true;
        out.push(cleaned);
    }

    return out;
}




/**
 * 清理单个 SSID 字符串：
 *  - 将形如 "\xE5\x8A\x9E" 的转义字节序列转成 UTF-8 字符（若可能）
 *  - 移除控制/不可见字符
 *  - trim() 并把多余空白压缩为单个空格
 *  - 截断到 maxLen（若提供）
 *  - 若清理后为空，返回 null
 *
 * 兼容 QuickJS：不依赖 Buffer，使用 decodeURIComponent 将 %XX 转回字节并解码
 */
function cleanSsidRaw(raw, maxLen) {
    if (raw == null) return null;
    // 确保是字符串
    let s = String(raw);

    // 1) 把 \xNN 形式转换为 %NN，方便用 decodeURIComponent 解码为 UTF-8
    //    例如 "\\xE5\\x8A" -> "%E5%8A"
    //    注意：如果原字符串本来就包含真正的 %xx 或非 UTF-8，这里会 try/catch。
    try {
        // 把 \xHH (双反斜杠在日志中常见) 或 \xHH(单反斜杠) 都处理
        s = s.replace(/\\x([0-9A-Fa-f]{2})/g, '%$1');
        // 还有可能存在 \uXXXX，这里不改动（通常是合法 JS unicode），但同样可以 decodeURIComponent 处理
        // decodeURIComponent 会把 %XX 序列还原为字节并按 UTF-8 解为字符
        s = decodeURIComponent(s);
    } catch (e) {
        // 如果 decode 失败，则保留原字符串（容错）
        // quickjs 环境可能不支持某些 decode 场景，继续清理下面步骤
    }

    // 2) 去掉所有控制字符（U+0000–U+001F, U+007F–U+009F），避免不可见字符干扰
    //    保留合法可打印字符。也去掉零宽空格等常见隐形字符（部分在这范围之外，但已覆盖大多数情况）。
    s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // 3) 替换多空白为单空格，并 trim 两端空格
    s = s.replace(/\s+/g, ' ').trim();

    // 4) 可选：去掉长度为 0 或全空的
    if (s.length === 0) return null;

    // 5) 可选：限制最大长度，避免异常长名（可按需删掉或调整）
    if (typeof maxLen === 'number' && maxLen > 0 && s.length > maxLen) {
        s = s.slice(0, maxLen);
    }

    return s;
}

export default netUtils
