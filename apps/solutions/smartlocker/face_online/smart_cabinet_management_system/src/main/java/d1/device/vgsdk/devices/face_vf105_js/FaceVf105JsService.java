package d1.device.vgsdk.devices.face_vf105_js;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.model.MqttPublishedMessage;
import d1.device.vgsdk.service.base.AbstractManagerService;
import d1.device.vgsdk.service.base.BaseAlarmRecordService;

public class FaceVf105JsService extends AbstractManagerService {

    @Override
    protected void initService(int port) {
        accessRecordService = new FaceVf105JsAccessRecordService(getName());
        alarmService = new BaseAlarmRecordService(getName());
        mqttService = new FaceVf105JsMqttService(port, alarmService, accessRecordService, getName());
    }

    @Override
    public void init(String uuid) {
    }

    @Override
    public String getName() {
        return "face_vf105_js";
    }

    public void upsertLockerModel(String uuid, JSONObject lockerModelData, JSONObject signConfig) throws Exception {
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = ((FaceVf105JsMqttService) mqttService).upsertLockerModel(uuid, lockerModelData, signConfig);
        waitAndCheck(message, "cabinet sync", "locker model sync");
    }

    public void upsertBinding(String uuid, JSONArray bindingDataArray, JSONObject signConfig) throws Exception {
        upsertCabinets(uuid, bindingDataArray, signConfig);
    }

    public void upsertCabinets(String uuid, JSONArray cabinets, JSONObject signConfig) throws Exception {
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = ((FaceVf105JsMqttService) mqttService).upsertCabinets(uuid, cabinets, signConfig);
        waitAndCheck(message, "cabinet sync", "cabinet sync");
    }

    public void deleteCabinets(String uuid, JSONArray cabinets, JSONObject signConfig) throws Exception {
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = ((FaceVf105JsMqttService) mqttService).deleteCabinets(uuid, cabinets, signConfig);
        waitAndCheck(message, "cabinet delete", "cabinet delete");
    }

    public void clearCabinets(String uuid, JSONObject signConfig) throws Exception {
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = ((FaceVf105JsMqttService) mqttService).clearCabinets(uuid, signConfig);
        waitAndCheck(message, "cabinet clear", "cabinet clear");
    }

    public JSONArray listCabinets(String uuid, JSONObject data, JSONObject signConfig) throws Exception {
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = ((FaceVf105JsMqttService) mqttService).listCabinets(uuid, data, signConfig);
        waitAndCheck(message, "cabinet list", "cabinet list");
        JSONObject reply = JSONObject.parseObject(message.getData());
        JSONArray cabinets = reply == null ? null : reply.getJSONArray("data");
        return cabinets == null ? new JSONArray() : cabinets;
    }

    private void waitAndCheck(MqttPublishedMessage message, String cn, String en) throws Exception {
        synchronized (message) {
            message.wait(5000);
        }
        message.checkResult(message, cn, en);
    }
}
