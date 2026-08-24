package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.service.DeviceAdapterService;
import cn.koodle.smartcabinet.service.DeviceService;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/admin/v1/device")
@RequiredArgsConstructor
public class DeviceConfigController {

    private static final Pattern IPV4 = Pattern.compile("^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$");
    private static final Pattern PIN = Pattern.compile("^\\d{6}$");
    private static final Pattern DATETIME = Pattern.compile("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$");
    private static final Set<String> WRITABLE_GROUPS = Set.of("network", "mqtt", "time", "audio", "lockRule", "openModel", "cabinetStrategy", "doorOpenTimeout", "tempPickupMode", "adminPin");

    private final DeviceAdapterService deviceAdapterService;
    private final DeviceService deviceService;

    /**
     * Returns the last config saved from device getConfig.
     */
    @GetMapping("/config")
    public Result<JSONObject> getConfig(@RequestParam String deviceNo) {
        try {
            Device device = requireDevice(deviceNo);
            return Result.success(parseConfig(device.getConfigJson()));
        } catch (Exception e) {
            log.error("获取本地设备配置失败, deviceNo={}", deviceNo, e);
            return Result.failed("获取配置失败: " + e.getMessage());
        }
    }

    /**
     * Sends getConfig to the online device and saves the returned data.
     */
    @PostMapping("/config/refresh")
    public Result<JSONObject> refreshConfig(@RequestParam String deviceNo, @RequestParam(required = false) String key) {
        try {
            JSONObject reply = JSONObject.parseObject(deviceAdapterService.getConfig(deviceNo, key));
            JSONObject configData = extractData(reply);
            JSONObject savedConfig = saveConfig(deviceNo, key, configData);
            return Result.success(savedConfig);
        } catch (Exception e) {
            log.error("刷新设备配置失败, deviceNo={}", deviceNo, e);
            return Result.failed("刷新配置失败: " + e.getMessage());
        }
    }

    /**
     * Sends only changed config groups. If a group has one changed field, the whole group is sent.
     */
    @PostMapping("/config")
    public Result<Boolean> setConfig(@RequestParam String deviceNo, @RequestBody JSONObject payload) {
        try {
            requireDevice(deviceNo);
            if (payload == null || payload.isEmpty()) {
                return Result.success(true);
            }

            validateWritableGroups(payload);
            validateConfig(payload);

            JSONObject oldConfig = parseConfig(requireDevice(deviceNo).getConfigJson());
            JSONObject changed = diffConfig(oldConfig, payload);
            if (changed.isEmpty()) {
                return Result.success(true);
            }

            deviceAdapterService.setConfig(deviceNo, changed);
            JSONObject merged = mergeConfig(oldConfig, changed);
            saveConfig(deviceNo, null, merged);
            return Result.success(true);
        } catch (Exception e) {
            log.error("下发配置失败, deviceNo={}", deviceNo, e);
            return Result.failed("下发配置失败: " + e.getMessage());
        }
    }

    @PostMapping("/control")
    public Result<Boolean> control(@RequestBody JSONObject payload) {
        try {
            String deviceNo = payload.getString("deviceNo");
            Integer command = payload.getInteger("command");
            JSONObject extra = payload.getJSONObject("extra");

            if (!StringUtils.hasText(deviceNo) || command == null) {
                return Result.failed("参数不完整：缺少 deviceNo 或 command");
            }
            if (!Set.of(0, 1, 2, 3, 4).contains(command)) {
                return Result.failed("不支持的 control command: " + command);
            }
            if ((command == 1 || command == 2) && extra == null) {
                return Result.failed("远程开柜/释放柜格需要 extra");
            }

            deviceAdapterService.control(deviceNo, command, extra);
            return Result.success(true);
        } catch (Exception e) {
            log.error("设备控制执行失败", e);
            return Result.failed("设备控制执行失败: " + e.getMessage());
        }
    }

    @PostMapping("/upgrade")
    public Result<Boolean> upgradeFirmware(@RequestBody JSONObject payload) {
        try {
            String deviceNo = payload.getString("deviceNo");
            Integer type = payload.getInteger("type");
            String url = payload.getString("url");
            String md5 = payload.getString("md5");

            if (!StringUtils.hasText(deviceNo) || !StringUtils.hasText(url) || !StringUtils.hasText(md5)) {
                return Result.failed("参数不完整：缺少升级必要信息");
            }
            if (type == null) {
                type = 0;
            }
            if (type != 0) {
                return Result.failed("当前协议仅支持本机固件升级 type=0");
            }

            deviceAdapterService.upgradeFirmware(deviceNo, type, url, md5);
            return Result.success(true);
        } catch (Exception e) {
            log.error("推送固件升级指令失败", e);
            return Result.failed("推送固件升级指令失败: " + e.getMessage());
        }
    }

    private Device requireDevice(String deviceNo) {
        Device device = deviceService.getByDeviceNo(deviceNo);
        if (device == null) {
            throw new ApiException("设备不存在: " + deviceNo);
        }
        return device;
    }

    private JSONObject extractData(JSONObject reply) {
        Object data = reply == null ? null : reply.get("data");
        if (data instanceof JSONObject obj) {
            return obj;
        }
        if (data instanceof String text && StringUtils.hasText(text)) {
            return JSONObject.parseObject(text);
        }
        return new JSONObject();
    }

    private JSONObject parseConfig(String configJson) {
        if (!StringUtils.hasText(configJson)) {
            return new JSONObject();
        }
        return JSONObject.parseObject(configJson);
    }

    private JSONObject saveConfig(String deviceNo, String key, JSONObject configData) {
        Device device = requireDevice(deviceNo);
        JSONObject fullConfig = parseConfig(device.getConfigJson());
        if (StringUtils.hasText(key)) {
            if (configData.containsKey(key)) {
                fullConfig.put(key, configData.get(key));
            } else {
                fullConfig.put(key, configData);
            }
            configData = fullConfig;
        }
        JSONObject sysinfo = configData.getJSONObject("sysinfo");
        JSONObject network = configData.getJSONObject("network");
        if (sysinfo != null) {
            String version = sysinfo.getString("appVersion");
            if (StringUtils.hasText(version)) {
                device.setVersion(version);
            }
        }
        if (network != null && StringUtils.hasText(network.getString("ip"))) {
            device.setIpAddress(network.getString("ip"));
        }
        device.setConfigJson(configData.toJSONString());
        deviceService.updateById(device);
        return configData;
    }

    private void validateWritableGroups(JSONObject payload) {
        for (String key : payload.keySet()) {
            if (!WRITABLE_GROUPS.contains(key)) {
                throw new ApiException("不支持下发配置项: " + key);
            }
        }
    }

    private JSONObject diffConfig(JSONObject oldConfig, JSONObject payload) {
        JSONObject changed = new JSONObject();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            String group = entry.getKey();
            Object newValue = entry.getValue();
            if ("adminPin".equals(group)) {
                changed.put(group, newValue);
                continue;
            }
            Object oldValue = oldConfig.get(group);
            if (!jsonEquals(oldValue, newValue)) {
                changed.put(group, newValue);
            }
        }
        return changed;
    }

    private JSONObject mergeConfig(JSONObject oldConfig, JSONObject changed) {
        JSONObject merged = oldConfig == null ? new JSONObject() : JSON.parseObject(oldConfig.toJSONString());
        for (Map.Entry<String, Object> entry : changed.entrySet()) {
            if (!"adminPin".equals(entry.getKey())) {
                merged.put(entry.getKey(), entry.getValue());
            }
        }
        return merged;
    }

    private boolean jsonEquals(Object oldValue, Object newValue) {
        return Objects.equals(JSON.toJSONString(oldValue), JSON.toJSONString(newValue));
    }

    private void validateConfig(JSONObject payload) {
        validateNetwork(payload.getJSONObject("network"));
        validateMqtt(payload.getJSONObject("mqtt"));
        validateTime(payload.getJSONObject("time"));
        validateAudio(payload.getJSONObject("audio"));
        validateLockRule(payload.getJSONObject("lockRule"));
        validateOpenModel(payload.getJSONObject("openModel"));
        validateCabinetStrategy(payload.getJSONObject("cabinetStrategy"));
        validateDoorOpenTimeout(payload.getJSONObject("doorOpenTimeout"));
        validateTempPickupMode(payload.getJSONObject("tempPickupMode"));
        validateAdminPin(payload.getJSONObject("adminPin"));
    }

    private void validateNetwork(JSONObject network) {
        if (network == null) {
            return;
        }
        String netType = network.getString("netType");
        if (!Set.of("ETH", "WIFI").contains(netType)) {
            throw new ApiException("network.netType 仅支持 ETH/WIFI");
        }
        if ("WIFI".equals(netType) && !StringUtils.hasText(network.getString("ssid"))) {
            throw new ApiException("WIFI 模式必须填写 SSID");
        }
        boolean dhcp = Boolean.TRUE.equals(network.getBoolean("dhcp"));
        if (!dhcp) {
            requireIpv4(network, "ip");
            requireIpv4(network, "mask");
            requireIpv4(network, "gw");
            requireIpv4(network, "dns");
        } else if (StringUtils.hasText(network.getString("dns"))) {
            requireIpv4(network, "dns");
        }
    }

    private void validateMqtt(JSONObject mqtt) {
        if (mqtt == null) {
            return;
        }
        if (!StringUtils.hasText(mqtt.getString("host"))) {
            throw new ApiException("mqtt.host 不能为空");
        }
        Integer port = mqtt.getInteger("port");
        if (port == null || port < 1 || port > 65535) {
            throw new ApiException("mqtt.port 必须是 1-65535");
        }
        Integer qos = mqtt.getInteger("qos");
        if (qos == null || qos < 0 || qos > 2) {
            throw new ApiException("mqtt.qos 必须是 0-2");
        }
        Integer keepAlive = mqtt.getInteger("keepAlive");
        if (keepAlive == null || keepAlive <= 0) {
            throw new ApiException("mqtt.keepAlive 必须大于 0");
        }
    }

    private void validateTime(JSONObject time) {
        if (time == null || !StringUtils.hasText(time.getString("value"))) {
            return;
        }
        if (!DATETIME.matcher(time.getString("value")).matches()) {
            throw new ApiException("time.value 格式应为 YYYY-MM-DD HH:mm:ss");
        }
    }

    private void validateAudio(JSONObject audio) {
        if (audio == null || !audio.containsKey("volume")) {
            return;
        }
        Integer volume = audio.getInteger("volume");
        if (volume == null || volume < 0 || volume > 10) {
            throw new ApiException("audio.volume 必须是 0-10");
        }
    }

    private void validateLockRule(JSONObject lockRule) {
        if (lockRule == null) {
            return;
        }
        Integer tempDelay = lockRule.getInteger("tempDelay");
        if (tempDelay != null && tempDelay <= 0) {
            throw new ApiException("lockRule.tempDelay 必须大于 0");
        }
        JSONObject timeDelay = lockRule.getJSONObject("timeDelay");
        if (timeDelay == null) {
            return;
        }
        String type = timeDelay.getString("type");
        if (StringUtils.hasText(type) && !Set.of("timeout", "static").contains(type)) {
            throw new ApiException("lockRule.timeDelay.type 仅支持 timeout/static");
        }
        Integer value = timeDelay.getInteger("value");
        if (value != null && value < 0) {
            throw new ApiException("lockRule.timeDelay.value 不能小于 0");
        }
        if ("static".equals(type) && value != null && value > 24) {
            throw new ApiException("static 模式下 timeDelay.value 必须为 0-24");
        }
    }

    private void validateOpenModel(JSONObject openModel) {
        if (openModel == null) {
            return;
        }
        String value = openModel.getString("value");
        if (!Set.of("face", "pin").contains(value)) {
            throw new ApiException("openModel.value 仅支持 face/pin");
        }
    }

    private void validateCabinetStrategy(JSONObject cabinetStrategy) {
        if (cabinetStrategy == null) {
            return;
        }
        Integer mode = cabinetStrategy.getInteger("mode");
        if (mode == null || mode < 0 || mode > 2) {
            throw new ApiException("cabinetStrategy.mode 必须是 0/1/2");
        }
    }

    private void validateDoorOpenTimeout(JSONObject doorOpenTimeout) {
        if (doorOpenTimeout == null) {
            return;
        }
        Integer value = doorOpenTimeout.getInteger("value");
        if (value == null || value < 30) {
            throw new ApiException("doorOpenTimeout.value must be at least 30 seconds");
        }
    }

    private void validateTempPickupMode(JSONObject tempPickupMode) {
        if (tempPickupMode == null) {
            return;
        }
        Integer value = tempPickupMode.getInteger("value");
        if (value == null || (value != 0 && value != 1)) {
            throw new ApiException("tempPickupMode.value must be 0 or 1");
        }
    }

    private void validateAdminPin(JSONObject adminPin) {
        if (adminPin == null) {
            return;
        }
        if (!PIN.matcher(adminPin.getString("oldPwd") == null ? "" : adminPin.getString("oldPwd")).matches()) {
            throw new ApiException("管理员旧密码必须是 6 位数字");
        }
        if (!PIN.matcher(adminPin.getString("newPwd") == null ? "" : adminPin.getString("newPwd")).matches()) {
            throw new ApiException("管理员新密码必须是 6 位数字");
        }
    }

    private void requireIpv4(JSONObject object, String key) {
        String value = object.getString(key);
        if (!StringUtils.hasText(value) || !IPV4.matcher(value).matches()) {
            throw new ApiException("network." + key + " 必须是合法 IPv4 地址");
        }
    }
}
