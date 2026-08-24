package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.common.utils.ThreadManager;
import cn.koodle.smartcabinet.entity.Device;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.alibaba.fastjson2.TypeReference;
import d1.device.vgsdk.DeviceFactory;
import d1.device.vgsdk.devices.face_vf105_js.FaceVf105JsService;
import d1.device.vgsdk.model.FirmwarePackage;
import d1.device.vgsdk.model.User;
import d1.device.vgsdk.service.IManagerService;
import d1.duoxian.mqttserver.IMqttVerifyListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceAdapterService implements IMqttVerifyListener {
    private final AccessDeviceEventHandler accessDeviceEventHandler;
    private Map<String, String> mqttPwdMap;

    @Value("${app.device.sign-secret:}")
    private String signSecret;

    public void initService() {
        try {
            File file = new File("./config/mqtt_password.json");
            if (file.exists()) {
                mqttPwdMap = JSONObject.parseObject(FileUtils.readFileToString(file, StandardCharsets.UTF_8), new TypeReference<>() {
                });
            }
        } catch (Exception e) {
            log.error("mqtt config read failed", e);
        }

        File file = new File("./config/device.json");
        if (!file.exists()) {
            log.info("device sdk config not found: {}", file.getPath());
            return;
        }

        try {
            DeviceFactory.getInstance().startup(FileUtils.readFileToString(file, StandardCharsets.UTF_8), accessDeviceEventHandler, ThreadManager.getInstance().getExecutor(), this);
        } catch (Exception e) {
            log.error("init device service failed", e);
        }
    }

    @Override
    public boolean verify(String clientId, String username, byte[] password) {
        if (mqttPwdMap == null || mqttPwdMap.isEmpty()) {
            return true;
        }
        if (!mqttPwdMap.containsKey(username)) {
            return false;
        }
        String passwordText = password == null ? "" : new String(password, StandardCharsets.UTF_8);
        return mqttPwdMap.get(username).equals(passwordText);
    }

    public void init(String firmwareProtocol, String uuid) throws Exception {
        try {
            getServiceByName(firmwareProtocol).init(uuid);
        } catch (Exception e) {
            log.info("init device failed", e);
        }
    }

    public Integer getDeviceOnline(String uuid) {
        try {
            return getService(uuid).isOnline(uuid) ? Device.ONLINE : Device.OFFLINE;
        } catch (Exception e) {
            return Device.OFFLINE;
        }
    }

    public IManagerService getService(String uuid) throws Exception {
        IManagerService service = DeviceFactory.getInstance().getService(uuid);
        if (service == null) {
            throw new Exception("device offline, uuid=" + uuid);
        }
        return service;
    }

    public IManagerService getServiceByName(String name) throws Exception {
        IManagerService service = DeviceFactory.getInstance().getServiceByName(name);
        if (service == null) {
            throw new Exception("unsupported firmware protocol, " + name);
        }
        return service;
    }

    public void upsertWhitelist(String deviceNo, List<User> users) throws ApiException {
        if (users == null || users.isEmpty()) {
            return;
        }
        try {
            getService(deviceNo).insertUser(deviceNo, null, users, getSignConfig());
        } catch (Exception e) {
            log.error("upsertWhitelist", e);
            throw new ApiException("下发用户失败: " + e.getMessage());
        }
    }

    public void deleteWhitelist(String deviceNo, List<String> userIds) throws ApiException {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }
        try {
            getService(deviceNo).delUser(deviceNo, null, userIds, getSignConfig());
        } catch (Exception e) {
            log.error("deleteWhitelist", e);
            throw new ApiException("删除用户失败: " + e.getMessage());
        }
    }

    public void syncLockerModel(String deviceNo, JSONObject lockerModel) throws ApiException {
        try {
            IManagerService service = getService(deviceNo);
            if (service instanceof FaceVf105JsService faceService) {
                faceService.upsertLockerModel(deviceNo, lockerModel, getSignConfig());
            }
        } catch (Exception e) {
            log.error("syncLockerModel", e);
            throw new ApiException("同步柜格规划失败: " + e.getMessage());
        }
    }

    public void syncBinding(String deviceNo, JSONArray bindings) throws ApiException {
        syncCabinets(deviceNo, bindings);
    }

    public void syncCabinets(String deviceNo, JSONArray cabinets) throws ApiException {
        try {
            IManagerService service = getService(deviceNo);
            if (service instanceof FaceVf105JsService faceService) {
                faceService.upsertCabinets(deviceNo, cabinets, getSignConfig());
            }
        } catch (Exception e) {
            log.error("syncCabinets", e);
            throw new ApiException("同步柜格数据失败: " + e.getMessage());
        }
    }

    public void clearCabinets(String deviceNo) throws ApiException {
        try {
            IManagerService service = getService(deviceNo);
            if (service instanceof FaceVf105JsService faceService) {
                faceService.clearCabinets(deviceNo, getSignConfig());
            }
        } catch (Exception e) {
            log.error("clearCabinets", e);
            throw new ApiException("清空设备柜格失败: " + e.getMessage());
        }
    }

    public void deleteCabinets(String deviceNo, JSONArray cabinets) throws ApiException {
        if (cabinets == null || cabinets.isEmpty()) {
            return;
        }
        try {
            IManagerService service = getService(deviceNo);
            if (service instanceof FaceVf105JsService faceService) {
                faceService.deleteCabinets(deviceNo, cabinets, getSignConfig());
            }
        } catch (Exception e) {
            log.error("deleteCabinets", e);
            throw new ApiException("删除设备柜格失败: " + e.getMessage());
        }
    }

    public JSONArray listCabinets(String deviceNo, JSONObject query) throws ApiException {
        try {
            IManagerService service = getService(deviceNo);
            if (service instanceof FaceVf105JsService faceService) {
                return faceService.listCabinets(deviceNo, query == null ? new JSONObject() : query, getSignConfig());
            }
            return new JSONArray();
        } catch (Exception e) {
            log.error("listCabinets", e);
            throw new ApiException("获取设备柜格失败: " + e.getMessage());
        }
    }

    public void openDoor(String deviceNo, String lockerId) throws ApiException {
        JSONObject extraObj = new JSONObject();
        extraObj.put("lockerId", lockerId);
        control(deviceNo, 1, extraObj);
    }

    public void openDoor(String deviceNo, Integer groupId, Integer cabinetId) throws ApiException {
        JSONObject extraObj = new JSONObject();
        extraObj.put("groupId", groupId);
        extraObj.put("cabinetId", cabinetId);
        control(deviceNo, 1, extraObj);
    }

    public String getConfig(String deviceNo, String key) {
        try {
            return getService(deviceNo).getConfig(deviceNo, key, getSignConfig());
        } catch (Exception e) {
            log.error("getConfig", e);
            throw new ApiException("获取设备配置失败: " + e.getMessage());
        }
    }

    public void setConfig(String deviceNo, JSONObject configData) {
        try {
            getService(deviceNo).setConfig(deviceNo, configData.toJSONString(), getSignConfig());
        } catch (Exception e) {
            log.error("setConfig", e);
            throw new ApiException("下发设备配置失败: " + e.getMessage());
        }
    }

    public void control(String deviceNo, int command, JSONObject extra) {
        try {
            getService(deviceNo).control(deviceNo, null, command, extra, getSignConfig());
        } catch (Exception e) {
            log.error("control", e);
            throw new ApiException("远程控制指令失败: " + e.getMessage());
        }
    }

    public void upgradeFirmware(String deviceNo, int type, String url, String md5) throws Exception {
        try {
            FirmwarePackage fw = new FirmwarePackage();
            fw.setType(String.valueOf(type));
            fw.setUrl(url);
            fw.setMd5(md5);
            getService(deviceNo).upgradeFirmware(deviceNo, fw, getSignConfig());
        } catch (Exception e) {
            log.error("upgradeFirmware", e);
            throw new ApiException("固件升级指令失败: " + e.getMessage());
        }
    }

    private JSONObject getSignConfig() {
        if (!StringUtils.hasText(signSecret)) {
            return null;
        }
        JSONObject obj = new JSONObject();
        obj.put("secret", signSecret);
        return obj;
    }
}
