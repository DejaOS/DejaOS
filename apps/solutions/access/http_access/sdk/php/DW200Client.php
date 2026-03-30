<?php
/**
 * DW200 Access Device SDK for PHP (ext-curl).
 *
 * Aligned with sdk/nodejs/dw200.js: port fixed 8080, same validation and endpoints.
 *
 *   require 'DW200Client.php';
 *   use DW200\DW200Client;
 *   use DW200\Period;
 *
 *   $client = new DW200Client(['host' => '192.168.1.20', 'apiKey' => 'password']);
 *   $info = $client->test();
 *   $client->openDoor();
 *
 * Requires: PHP 8.0+, ext-curl, ext-json
 */

declare(strict_types=1);

namespace DW200;

final class DW200Error extends \Exception
{
    public function __construct(
        string $message,
        public ?int $apiCode = null,
        public ?int $statusCode = null,
    ) {
        parent::__construct($message);
    }
}

final class Period
{
    /** Validate period object (e.g. embedded in user credential). */
    public static function assertPeriod(array $p): void
    {
        self::validatePeriod($p);
    }

    public static function always(): array
    {
        return ['type' => 0];
    }

    public static function range(int $beginTime, int $endTime): array
    {
        if ($endTime <= $beginTime) {
            throw new \InvalidArgumentException('endTime must be greater than beginTime');
        }
        return ['type' => 1, 'range' => ['beginTime' => $beginTime, 'endTime' => $endTime]];
    }

    public static function daily(string $slots, ?array $range = null): array
    {
        $p = ['type' => 2, 'dayPeriodTime' => $slots];
        if ($range !== null) {
            $p['range'] = $range;
        }
        self::validatePeriod($p);
        return $p;
    }

    /** @param array<string,string> $weekMap */
    public static function weekly(array $weekMap, ?array $range = null): array
    {
        if ($weekMap === []) {
            throw new \InvalidArgumentException('weekMap cannot be empty, e.g. {"1":"09:00-18:00"}');
        }
        $p = ['type' => 3, 'weekPeriodTime' => $weekMap];
        if ($range !== null) {
            $p['range'] = $range;
        }
        self::validatePeriod($p);
        return $p;
    }

    private static function validatePeriod(array $p): void
    {
        $t = $p['type'] ?? null;
        if (!in_array($t, [0, 1, 2, 3], true)) {
            throw new \InvalidArgumentException('period.type must be 0, 1, 2, or 3');
        }
        if ($t >= 1 && isset($p['range'])) {
            $r = $p['range'];
            if (!isset($r['beginTime'], $r['endTime']) || !is_int($r['beginTime']) || !is_int($r['endTime'])) {
                throw new \InvalidArgumentException(
                    'period.range.beginTime and endTime must be integer Unix timestamps (seconds)'
                );
            }
        }
        if ($t === 2) {
            $dpt = $p['dayPeriodTime'] ?? '';
            if (!is_string($dpt) || trim($dpt) === '') {
                throw new \InvalidArgumentException('period type=2 requires dayPeriodTime string');
            }
            $slots = explode('|', $dpt);
            if (count($slots) > 5) {
                throw new \InvalidArgumentException('dayPeriodTime allows at most 5 time slots');
            }
            foreach ($slots as $i => $seg) {
                $seg = trim($seg);
                if (!preg_match('/^\d{2}:\d{2}-\d{2}:\d{2}$/', $seg)) {
                    throw new \InvalidArgumentException('dayPeriodTime slot ' . ($i + 1) . ' must be HH:MM-HH:MM');
                }
            }
        }
        if ($t === 3) {
            $wpt = $p['weekPeriodTime'] ?? null;
            if (!is_array($wpt)) {
                throw new \InvalidArgumentException('period type=3 requires weekPeriodTime object');
            }
            foreach ($wpt as $day => $slots) {
                if (!in_array((string) $day, ['1', '2', '3', '4', '5', '6', '7'], true)) {
                    throw new \InvalidArgumentException("weekPeriodTime key \"{$day}\" is invalid; use 1–7");
                }
                foreach (explode('|', (string) $slots) as $i => $seg) {
                    $seg = trim($seg);
                    if ($seg !== '' && !preg_match('/^\d{2}:\d{2}-\d{2}:\d{2}$/', $seg)) {
                        throw new \InvalidArgumentException(
                            "weekPeriodTime day {$day} slot " . ($i + 1) . ' must be HH:MM-HH:MM'
                        );
                    }
                }
            }
        }
    }
}

final class DW200Client
{
    public const DEVICE_HTTP_PORT = 8080;

    private string $base;
    private string $apiKey;
    private int $timeoutMs;

    /** @param array{host:string, apiKey?:string, timeout?:int} $options */
    public function __construct(array $options)
    {
        $host = $options['host'] ?? '';
        if ($host === '') {
            throw new \InvalidArgumentException('options.host is required');
        }
        $this->base = self::buildBaseWithFixedPort($host);
        $this->apiKey = $options['apiKey'] ?? 'password';
        $this->timeoutMs = (int) ($options['timeout'] ?? 10000);
    }

    public static function buildBaseWithFixedPort(string $hostOrBaseUrl): string
    {
        $input = trim($hostOrBaseUrl);
        if ($input === '') {
            throw new \InvalidArgumentException('host cannot be empty');
        }
        if (!preg_match('/^https?:\/\//i', $input)) {
            $input = 'http://' . $input;
        }
        $u = parse_url($input);
        if ($u === false || !isset($u['scheme'], $u['host'])) {
            throw new \InvalidArgumentException("Cannot parse device address: {$hostOrBaseUrl}");
        }
        $scheme = strtolower($u['scheme']);
        if ($scheme !== 'http' && $scheme !== 'https') {
            throw new \InvalidArgumentException('Only http or https device URLs are supported.');
        }
        $host = $u['host'];
        $port = self::DEVICE_HTTP_PORT;
        $isV6 = str_contains($host, ':') && !str_contains($host, '.');
        $authority = $isV6 ? "[{$host}]:{$port}" : "{$host}:{$port}";
        return "{$scheme}://{$authority}";
    }

    /**
     * JSON string for access QR payload; sign = md5(value + timestamp + key).
     * Empty/whitespace key → no sign field.
     */
    public static function generateQrStr($value, string $key = ''): string
    {
        if ($value !== 0 && $value !== false && ($value === null || $value === '')) {
            throw new \InvalidArgumentException('value cannot be empty');
        }
        $timestamp = (int) round(microtime(true) * 1000);
        $keyTrim = trim($key);
        $v = (string) $value;
        if ($keyTrim === '') {
            return json_encode(['value' => $v, 'timestamp' => $timestamp], JSON_UNESCAPED_SLASHES);
        }
        $sign = md5($v . $timestamp . $keyTrim);
        return json_encode(['value' => $v, 'timestamp' => $timestamp, 'sign' => $sign], JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param array{timeout?:int, concurrency?:int, onFound?:callable(array):void} $opts
     * @return list<array{ip:string, sn:string, timestamp:int}>
     */
    public static function scan(string $subnet, array $opts = []): array
    {
        if (!preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,3}$/', $subnet)) {
            throw new \InvalidArgumentException('subnet must be "A.B.C", e.g. "192.168.50"');
        }
        $timeout = (int) ($opts['timeout'] ?? 1500);
        $concurrency = (int) ($opts['concurrency'] ?? 10);
        $onFound = $opts['onFound'] ?? null;

        $ips = [];
        for ($i = 1; $i <= 254; $i++) {
            $ips[] = "{$subnet}.{$i}";
        }
        $groups = array_fill(0, $concurrency, []);
        foreach ($ips as $idx => $ip) {
            $groups[$idx % $concurrency][] = $ip;
        }

        $mh = curl_multi_init();
        /** @var \SplObjectStorage<\CurlHandle, array{g:int, ip:string}> $meta */
        $meta = new \SplObjectStorage();
        $nextIdx = array_fill(0, $concurrency, 0);
        $results = [];

        $scheduleNext = function (int $g) use (&$mh, &$meta, &$groups, &$nextIdx, $timeout): void {
            if ($nextIdx[$g] >= count($groups[$g])) {
                return;
            }
            $ip = $groups[$g][$nextIdx[$g]];
            $nextIdx[$g]++;
            $url = "http://{$ip}:" . self::DEVICE_HTTP_PORT . '/api/v1/test';
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT_MS => $timeout,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
            ]);
            $meta[$ch] = ['g' => $g, 'ip' => $ip];
            curl_multi_add_handle($mh, $ch);
        };

        for ($g = 0; $g < $concurrency; $g++) {
            $scheduleNext($g);
        }

        do {
            while (($mrc = curl_multi_exec($mh, $running)) === CURLM_CALL_MULTI_PERFORM) {
            }
            while ($done = curl_multi_info_read($mh)) {
                if ($done['msg'] !== CURLMSG_DONE) {
                    continue;
                }
                /** @var \CurlHandle $ch */
                $ch = $done['handle'];
                $info = $meta[$ch];
                $g = $info['g'];
                $ip = $info['ip'];
                $body = curl_multi_getcontent($ch);
                curl_multi_remove_handle($mh, $ch);
                $meta->detach($ch);
                curl_close($ch);

                if ($body !== false && $body !== '') {
                    $json = json_decode($body, true);
                    if (is_array($json) && ($json['code'] ?? null) === 0) {
                        $data = $json['data'] ?? null;
                        if (is_array($data) && !empty($data['sn'])) {
                            $row = [
                                'ip' => $ip,
                                'sn' => (string) $data['sn'],
                                'timestamp' => (int) ($data['timestamp'] ?? 0),
                            ];
                            $results[] = $row;
                            if (is_callable($onFound)) {
                                $onFound($row);
                            }
                        }
                    }
                }
                $scheduleNext($g);
            }
            if ($running > 0) {
                $sel = curl_multi_select($mh, 1.0);
                if ($sel === -1) {
                    usleep(10000);
                }
            }
        } while ($running > 0);

        curl_multi_close($mh);

        usort($results, static function (array $a, array $b): int {
            $pa = explode('.', $a['ip']);
            $pb = explode('.', $b['ip']);
            $la = (int) (end($pa) ?: '0');
            $lb = (int) (end($pb) ?: '0');
            return $la <=> $lb;
        });

        return $results;
    }

    private function url(string $path, array $query = []): string
    {
        $url = $this->base . $path;
        if ($query !== []) {
            $q = http_build_query($query);
            if ($q !== '') {
                $url .= '?' . $q;
            }
        }
        return $url;
    }

    /**
     * @return array{status:int, body:mixed}
     */
    private function rawRequest(string $method, string $url, ?array $body, bool $withKey): array
    {
        $ch = curl_init($url);
        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        if ($withKey) {
            $headers[] = 'X-API-Key: ' . $this->apiKey;
        }
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT_MS => $this->timeoutMs,
        ];
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_SLASHES);
        }
        curl_setopt_array($ch, $opts);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if ($raw === false) {
            throw new DW200Error('HTTP request failed', null, $status);
        }
        $decoded = json_decode($raw, true);
        return ['status' => $status, 'body' => $decoded !== null ? $decoded : $raw];
    }

    private static function check(array $res): mixed
    {
        $b = $res['body'];
        if (is_array($b) && array_key_exists('code', $b)) {
            if ($b['code'] === 0) {
                return $b['data'] ?? null;
            }
            throw new DW200Error(
                (string) ($b['message'] ?? 'API error'),
                is_int($b['code']) ? $b['code'] : null,
                $res['status']
            );
        }
        throw new DW200Error('Unexpected response body: ' . json_encode($b), null, $res['status']);
    }

    private function get(string $path, array $query = []): mixed
    {
        return self::check($this->rawRequest('GET', $this->url($path, $query), null, true));
    }

    private function post(string $path, array $body): mixed
    {
        return self::check($this->rawRequest('POST', $this->url($path), $body, true));
    }

    public function test(): mixed
    {
        return self::check($this->rawRequest('GET', $this->url('/api/v1/test'), null, false));
    }

    public function getDeviceInfo(): mixed
    {
        return $this->get('/api/v1/device/info');
    }

    public function getConfig(): mixed
    {
        return $this->get('/api/v1/device/config');
    }

    public function setConfig(array $config): mixed
    {
        if ($config === []) {
            throw new \InvalidArgumentException('config is empty; nothing to update');
        }
        if (isset($config['adminPassword']) && !preg_match('/^\d{6}$/', (string) $config['adminPassword'])) {
            throw new \InvalidArgumentException('adminPassword must be exactly 6 digits');
        }
        if (isset($config['webhookUrl']) && $config['webhookUrl'] !== '') {
            if (!preg_match('/^https?:\/\/.+/i', (string) $config['webhookUrl'])) {
                throw new \InvalidArgumentException('webhookUrl must start with http:// or https://');
            }
        }
        $payload = $config;
        if (isset($payload['networkConfig']) && is_array($payload['networkConfig'])) {
            $payload['networkConfig'] = json_encode($payload['networkConfig'], JSON_UNESCAPED_SLASHES);
        }
        return $this->post('/api/v1/device/config', ['config' => $payload]);
    }

    public function openDoor(): mixed
    {
        return $this->post('/api/v1/device/opendoor', new \stdClass());
    }

    public function reboot(): mixed
    {
        return $this->post('/api/v1/device/reboot', new \stdClass());
    }

    public function clearAllData(): mixed
    {
        return $this->post('/api/v1/device/cleardata', new \stdClass());
    }

    public function upgradeFirmware(string $url, string $md5): mixed
    {
        $u = trim($url);
        if ($u === '') {
            throw new \InvalidArgumentException('url cannot be empty');
        }
        if (!preg_match('/^https?:\/\/.+/i', $u)) {
            throw new \InvalidArgumentException('url must start with http:// or https://');
        }
        $m = strtolower(trim($md5));
        if (!preg_match('/^[a-f0-9]{32}$/', $m)) {
            throw new \InvalidArgumentException('md5 must be a 32-character lowercase hex string');
        }
        return $this->post('/api/v1/device/upgrade', ['url' => $u, 'md5' => $m]);
    }

    public function setTime(null|string|\DateTimeInterface $time = null): mixed
    {
        if ($time === null) {
            $timeStr = (new \DateTimeImmutable('now'))->format('Y-m-d H:i:s');
        } elseif ($time instanceof \DateTimeInterface) {
            $timeStr = $time->format('Y-m-d H:i:s');
        } else {
            $timeStr = trim($time);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $timeStr)) {
            throw new \InvalidArgumentException('time must be "YYYY-MM-DD HH:mm:ss"');
        }
        return $this->post('/api/v1/device/time', ['time' => $timeStr]);
    }

    public function setBackground(string $base64): mixed
    {
        if (trim($base64) === '') {
            throw new \InvalidArgumentException('base64 image data cannot be empty');
        }
        $clean = preg_replace('/^data:image\/[a-z]+;base64,/i', '', trim($base64)) ?? '';
        return $this->post('/api/v1/device/background', ['image' => $clean]);
    }

    private static function validateUser(array $u, int $index): void
    {
        try {
            if (!isset($u['userId']) || !is_string($u['userId']) || trim($u['userId']) === '') {
                throw new \InvalidArgumentException('userId cannot be empty');
            }
            if (!isset($u['name']) || !is_string($u['name']) || trim($u['name']) === '') {
                throw new \InvalidArgumentException('name cannot be empty');
            }
            $validTypes = ['nfc', 'pin', 'qr', 'ble', 'face'];
            if (!isset($u['type']) || !in_array($u['type'], $validTypes, true)) {
                throw new \InvalidArgumentException('type must be one of: ' . implode(' / ', $validTypes));
            }
            if (!isset($u['value']) || !is_string($u['value']) || trim($u['value']) === '') {
                throw new \InvalidArgumentException('value cannot be empty');
            }
            if (isset($u['period'])) {
                if (!is_array($u['period'])) {
                    throw new \InvalidArgumentException('period must be an object');
                }
                Period::assertPeriod($u['period']);
            }
        } catch (\InvalidArgumentException $e) {
            throw new \InvalidArgumentException("users[{$index}]: " . $e->getMessage(), 0, $e);
        }
    }

    /** @param list<array<string,mixed>> $users */
    public function addUsers(array $users): mixed
    {
        if ($users === []) {
            throw new \InvalidArgumentException('users must be a non-empty array');
        }
        if (count($users) > 100) {
            throw new \InvalidArgumentException('At most 100 users per request');
        }
        foreach ($users as $i => $u) {
            self::validateUser($u, $i);
        }
        return $this->post('/api/v1/users/add', ['users' => $users]);
    }

    /** @param string|list<string> $userIds */
    public function deleteUser($userIds): mixed
    {
        $arr = is_array($userIds) ? $userIds : [$userIds];
        $cleaned = [];
        foreach ($arr as $x) {
            if (is_string($x) && trim($x) !== '') {
                $cleaned[] = trim($x);
            }
        }
        if ($cleaned === []) {
            throw new \InvalidArgumentException('userIds cannot be empty');
        }
        return $this->post('/api/v1/users/delete', ['userIds' => $cleaned]);
    }

    /** @param list<int> $ids */
    public function deleteUserByIds(array $ids): mixed
    {
        if ($ids === []) {
            throw new \InvalidArgumentException('ids must be a non-empty array');
        }
        return $this->post('/api/v1/users/delete', ['ids' => $ids]);
    }

    /** @param array<string,mixed> $filters */
    public function listUsers(int $page = 1, int $size = 50, array $filters = []): mixed
    {
        if ($page < 1 || $size < 1) {
            throw new \InvalidArgumentException('page and size must be positive integers');
        }
        $valid = ['nfc', 'pin', 'qr', 'ble', 'face'];
        if (isset($filters['type']) && $filters['type'] !== '' && !in_array($filters['type'], $valid, true)) {
            throw new \InvalidArgumentException('filters.type must be one of: ' . implode(' / ', $valid));
        }
        $query = ['page' => $page, 'size' => $size];
        foreach (['userId', 'name', 'type', 'value'] as $k) {
            if (!empty($filters[$k])) {
                $query[$k] = $filters[$k];
            }
        }
        return $this->get('/api/v1/users/list', $query);
    }

    public function clearUsers(): mixed
    {
        return $this->post('/api/v1/users/clear', new \stdClass());
    }

    /** @param array<string,mixed> $filters */
    public function listAccess(int $page = 1, int $size = 100, array $filters = []): mixed
    {
        if ($page < 1 || $size < 1) {
            throw new \InvalidArgumentException('page and size must be positive integers');
        }
        $valid = ['nfc', 'pin', 'qr', 'ble', 'face', 'remote'];
        if (isset($filters['type']) && $filters['type'] !== '' && !in_array($filters['type'], $valid, true)) {
            throw new \InvalidArgumentException('filters.type must be one of: ' . implode(' / ', $valid));
        }
        $r = $filters['result'] ?? null;
        if ($r !== null && $r !== '' && $r !== 0 && $r !== 1 && $r !== '0' && $r !== '1') {
            throw new \InvalidArgumentException('filters.result must be 0 or 1');
        }
        $query = ['page' => $page, 'size' => $size];
        foreach (['userId', 'name', 'type', 'value'] as $k) {
            if (isset($filters[$k]) && $filters[$k] !== '') {
                $query[$k] = $filters[$k];
            }
        }
        if (isset($filters['result']) && $filters['result'] !== '') {
            $query['result'] = $filters['result'];
        }
        return $this->get('/api/v1/access', $query);
    }

    /** @param list<int> $ids */
    public function deleteAccess(array $ids): mixed
    {
        if ($ids === []) {
            throw new \InvalidArgumentException('ids must be a non-empty array');
        }
        return $this->post('/api/v1/access/delete', ['ids' => $ids]);
    }

    public function clearAccess(): mixed
    {
        return $this->post('/api/v1/access/clear', new \stdClass());
    }

    /** @param array<string,mixed> $filters */
    public function listEvents(int $page = 1, int $size = 100, array $filters = []): mixed
    {
        if ($page < 1 || $size < 1) {
            throw new \InvalidArgumentException('page and size must be positive integers');
        }
        $valid = ['info', 'warning', 'error'];
        if (isset($filters['type']) && $filters['type'] !== '' && !in_array($filters['type'], $valid, true)) {
            throw new \InvalidArgumentException('filters.type must be one of: ' . implode(' / ', $valid));
        }
        $query = ['page' => $page, 'size' => $size];
        if (!empty($filters['type'])) {
            $query['type'] = $filters['type'];
        }
        if (!empty($filters['message'])) {
            $query['message'] = $filters['message'];
        }
        return $this->get('/api/v1/events', $query);
    }

    /** @param list<int> $ids */
    public function deleteEvents(array $ids): mixed
    {
        if ($ids === []) {
            throw new \InvalidArgumentException('ids must be a non-empty array');
        }
        return $this->post('/api/v1/events/delete', ['ids' => $ids]);
    }

    public function clearEvents(): mixed
    {
        return $this->post('/api/v1/events/clear', new \stdClass());
    }
}
