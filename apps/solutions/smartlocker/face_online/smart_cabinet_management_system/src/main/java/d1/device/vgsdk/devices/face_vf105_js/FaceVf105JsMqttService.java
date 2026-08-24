package d1.device.vgsdk.devices.face_vf105_js;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import cn.koodle.smartcabinet.entity.MqttCommandLog;
import cn.koodle.smartcabinet.service.MqttCommandLogService;
import d1.device.vgsdk.common.DeviceUtils;
import d1.device.vgsdk.model.AccessDeviceInfo;
import d1.device.vgsdk.model.AccessRecord;
import d1.device.vgsdk.model.AlarmRecord;
import d1.device.vgsdk.model.FirmwarePackage;
import d1.device.vgsdk.model.MqttPublishedMessage;
import d1.device.vgsdk.model.User;
import d1.device.vgsdk.service.base.AbstractMqttService;
import d1.device.vgsdk.service.base.BaseAccessRecordService;
import d1.device.vgsdk.service.base.BaseAlarmRecordService;
import d1.duoxian.mqttserver.CustomMqttPublishMessage;
import io.netty.util.internal.StringUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

public class FaceVf105JsMqttService extends AbstractMqttService {

    private static final String TOPIC_CMD_PREFIX = "fitlock/v1/cmd/";
    private static final String TOPIC_EVENT_PREFIX = "fitlock/v1/event/";

    private static final Logger logger = LoggerFactory.getLogger(FaceVf105JsMqttService.class);

    public FaceVf105JsMqttService(int port, BaseAlarmRecordService alarmService, BaseAccessRecordService accessRecordService, String protocol) {
        super(port, alarmService, accessRecordService, protocol);
    }

    @Override
    public void onMessage(String ip, String channelId, String topic, String message, Function<CustomMqttPublishMessage, Boolean> publisher) {
        JSONObject object = JSONObject.parseObject(message);
        String logDeviceSn = object == null ? null : object.getString("uuid");
        MqttCommandLogService.recordSafe(MqttCommandLog.DIRECTION_RECEIVE, topic, logDeviceSn, message);
        if (object == null || !object.containsKey("uuid")) {
            logger.error("MQTT message missing uuid, topic={}", topic);
            return;
        }

        String uuid = object.getString("uuid");
        String serialNo = object.getString("serialNo");
        if (topic.startsWith(TOPIC_CMD_PREFIX) && topic.endsWith(REPLY_FLAG)) {
            onMessageReply(topic, object, serialNo, uuid);
        } else if (topic.startsWith(TOPIC_EVENT_PREFIX) && !topic.endsWith(REPLY_FLAG)) {
            onMessageReport(topic, object, serialNo, uuid, channelId, publisher);
        }
    }

    protected void onMessageReport(String topic, JSONObject contentObj, String serialNo, String uuid, String channelId, Function<CustomMqttPublishMessage, Boolean> publisher) {
        logger.info("receive device event, topic={}, content={}", topic, contentObj.toJSONString());
        String eventName = topic.replace(TOPIC_EVENT_PREFIX, "");

        switch (eventName) {
            case "connect" -> {
                JSONObject data = contentObj.getJSONObject("data");
                String model = data == null ? null : data.getString("model");
                String appVersion = data == null ? null : data.getString("appVersion");
                handler.handleInfo(protocol, new AccessDeviceInfo(uuid, model, model, appVersion, contentObj.toJSONString()));
            }
            case "offline" -> {
                logger.info("device offline event, uuid={}", uuid);
                Long eventTime = contentObj.getLong("time");
                alarmService.add(new AlarmRecord(uuid, AlarmRecord.TYPE_OFFLINE, contentObj.toJSONString(), eventTime == null ? System.currentTimeMillis() : eventTime * 1000));
            }
            case "access" -> {
                JSONArray accessData = normalizeEventData(contentObj, serialNo, "access");
                if (accessData != null && !accessData.isEmpty()) {
                    handleAccessData(uuid, accessData);
                }
                reply(channelId, serialNo, uuid, TOPIC_EVENT_PREFIX + uuid + "/access_reply", publisher);
            }
            case "faceSync" -> {
                JSONArray faceSyncData = normalizeEventData(contentObj, serialNo, "faceSync");
                if (!faceSyncData.isEmpty()) {
                    handleFaceSyncData(uuid, serialNo, faceSyncData);
                }
                reply(channelId, serialNo, uuid, TOPIC_EVENT_PREFIX + uuid + "/faceSync_reply", publisher);
            }
            default -> logger.warn("unknown fitlock event topic: {}", topic);
        }
    }

    private JSONArray normalizeEventData(JSONObject contentObj, String serialNo, String eventName) {
        Object data = contentObj.get("data");
        JSONArray array;
        if (data instanceof JSONArray items) {
            array = items;
        } else if (data instanceof JSONObject item) {
            array = new JSONArray();
            array.add(item);
        } else {
            logger.warn("fitlock {} event data is empty or invalid: {}", eventName, contentObj);
            return new JSONArray();
        }

        for (Object item : array) {
            if (item instanceof JSONObject record && !record.containsKey("serialNo")) {
                record.put("serialNo", serialNo);
            }
        }
        return array;
    }

    private void handleFaceSyncData(String uuid, String serialNo, JSONArray faceSyncData) {
        try {
            handler.handleFaceSync(protocol, uuid, serialNo, faceSyncData);
        } catch (Exception e) {
            logger.error("handle fitlock face sync event failed, uuid={}, records={}", uuid, faceSyncData, e);
        }
    }

    private void handleAccessData(String uuid, JSONArray accessData) {
        List<AccessRecord> records = new ArrayList<>();
        for (Object item : accessData) {
            if (item instanceof JSONObject record) {
                AccessRecord accessRecord = accessRecordService.toAccessRecord(uuid, record, null);
                if (accessRecord != null) {
                    records.add(accessRecord);
                }
            }
        }
        if (records.isEmpty()) {
            return;
        }
        try {
            handler.handleAccessRecord(protocol, records);
        } catch (Exception e) {
            logger.error("handle fitlock access event failed, uuid={}, records={}", uuid, accessData, e);
        }
    }

    protected void onMessageReply(String topic, JSONObject contentObj, String serialNo, String uuid) {
        logger.info("receive device reply uuid={}, topic={}, content={}", uuid, topic, contentObj.toJSONString());
        if (!messageMap.containsKey(serialNo)) {
            logger.error("reply serialNo not waiting, uuid={}, topic={}, serialNo={}", uuid, topic, serialNo);
            return;
        }
        MqttPublishedMessage message = messageMap.get(serialNo);
        String code = contentObj.getString("code");
        message.setResult("000000".equals(code) ? 1 : -1);
        message.setData(contentObj.toString());
        messageMap.remove(serialNo);

        synchronized (message) {
            message.notify();
        }
    }

    @Override
    public MqttPublishedMessage getConfig(String serialNo, String uuid, String key, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/getConfig";
        Object data = StringUtil.isNullOrEmpty(key) ? "" : key;
        JSONObject object = initSendDataJsonObject(uuid, serialNo, data, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage setConfig(String serialNo, String uuid, String config, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/setConfig";
        JSONObject configObj = JSONObject.parseObject(config);
        JSONObject object = initSendDataJsonObject(uuid, serialNo, configObj, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage upgradeFirmware(String serialNo, String uuid, FirmwarePackage firmware, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/upgradeFirmware";
        JSONObject dataObj = new JSONObject();
        dataObj.put("type", Integer.parseInt(firmware.getType()));
        dataObj.put("url", firmware.getUrl());
        dataObj.put("md5", firmware.getMd5());
        JSONObject object = initSendDataJsonObject(uuid, serialNo, dataObj, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage control(String serialNo, String uuid, int command, JSONObject extra, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/control";
        JSONObject dataObj = new JSONObject();
        dataObj.put("command", command);
        if (extra != null) {
            dataObj.put("extra", extra);
        }
        JSONObject object = initSendDataJsonObject(uuid, serialNo, dataObj, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage insertUser(String uuid, List<? extends User> users, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/user/upsert";
        String serialNo = DeviceUtils.generateIntId() + "";

        JSONArray dataArray = new JSONArray();
        for (User user : users) {
            JSONObject extra = user.getExtra() == null ? new JSONObject() : JSONObject.parseObject(user.getExtra());
            JSONObject uObj = new JSONObject();
            uObj.put("userId", user.getUserId());
            uObj.put("name", user.getName());
            uObj.put("faceImageUrl", extra.getString("faceImageUrl"));
            uObj.put("faceImageMd5", extra.getString("faceImageMd5"));
            uObj.put("phone", extra.getString("phone"));
            uObj.put("pin", extra.getString("pin"));
            if (extra.containsKey("role")) {
                uObj.put("role", extra.getIntValue("role"));
            }
            dataArray.add(uObj);
        }

        JSONObject object = initSendDataJsonObject(uuid, serialNo, dataArray, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage delUser(String uuid, List<String> userIds, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/user/delete";
        String serialNo = DeviceUtils.generateIntId() + "";

        JSONArray dataArray = new JSONArray();
        for (String id : userIds) {
            JSONObject uObj = new JSONObject();
            uObj.put("userId", id);
            dataArray.add(uObj);
        }

        JSONObject object = initSendDataJsonObject(uuid, serialNo, dataArray, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage clearUser(String uuid, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/user/clear";
        String serialNo = DeviceUtils.generateIntId() + "";
        JSONObject object = initSendDataJsonObject(uuid, serialNo, new JSONObject(), signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage getUser(String uuid, int page, int size, JSONObject signConfig) {
        MqttPublishedMessage message = new MqttPublishedMessage(uuid, "", "");
        message.setResult(1);
        return message;
    }

    public MqttPublishedMessage upsertLockerModel(String uuid, JSONObject lockerModelData, JSONObject signConfig) throws Exception {
        Object data = lockerModelData == null ? new JSONArray() : lockerModelData.get("cabinets");
        if (data == null) {
            data = lockerModelData;
        }
        return upsertCabinets(uuid, data instanceof JSONArray array ? array : JSONArray.of(data), signConfig);
    }

    public MqttPublishedMessage upsertBinding(String uuid, JSONArray bindingDataArray, JSONObject signConfig) throws Exception {
        return upsertCabinets(uuid, bindingDataArray, signConfig);
    }

    public MqttPublishedMessage upsertCabinets(String uuid, JSONArray cabinets, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/cabinet/upsert";
        String serialNo = DeviceUtils.generateIntId() + "";
        JSONObject object = initSendDataJsonObject(uuid, serialNo, cabinets == null ? new JSONArray() : cabinets, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    public MqttPublishedMessage deleteCabinets(String uuid, JSONArray cabinets, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/cabinet/delete";
        String serialNo = DeviceUtils.generateIntId() + "";
        JSONObject object = initSendDataJsonObject(uuid, serialNo, cabinets == null ? new JSONArray() : cabinets, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    public MqttPublishedMessage clearCabinets(String uuid, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/cabinet/clear";
        String serialNo = DeviceUtils.generateIntId() + "";
        JSONObject object = initSendDataJsonObject(uuid, serialNo, new JSONObject(), signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    public MqttPublishedMessage listCabinets(String uuid, JSONObject data, JSONObject signConfig) throws Exception {
        String topic = TOPIC_CMD_PREFIX + uuid + "/cabinet/list";
        String serialNo = DeviceUtils.generateIntId() + "";
        JSONObject object = initSendDataJsonObject(uuid, serialNo, data == null ? new JSONObject() : data, signConfig);
        return sendAndLog(uuid, topic, object.toJSONString(), serialNo);
    }

    @Override
    public MqttPublishedMessage sendMessage(String uuid, String topic, JSONObject data) throws Exception {
        String serialNo = DeviceUtils.generateIntId() + "";
        String fullTopic = TOPIC_CMD_PREFIX + uuid + "/" + topic;
        return sendAndLog(uuid, fullTopic, initSendDataJsonObject(uuid, serialNo, data, null).toJSONString(), serialNo);
    }

    private void reply(String channelId, String serialNo, String uuid, String topic, Function<CustomMqttPublishMessage, Boolean> publisher) {
        JSONObject object = initJsonObject(uuid, serialNo);
        String payload = object.toJSONString();
        MqttCommandLogService.recordSafe(MqttCommandLog.DIRECTION_SEND, topic, uuid, payload);
        publish(channelId, publisher, topic, payload);
    }

    private MqttPublishedMessage sendAndLog(String uuid, String topic, String payload, String serialNo) throws Exception {
        MqttCommandLogService.recordSafe(MqttCommandLog.DIRECTION_SEND, topic, uuid, payload);
        return send(uuid, topic, payload, serialNo);
    }

    private JSONObject initJsonObject(String uuid, Object serialNo) {
        JSONObject object = new JSONObject();
        object.put("serialNo", serialNo);
        object.put("uuid", uuid);
        object.put("time", System.currentTimeMillis() / 1000);
        object.put("code", "000000");
        object.put("message", "success");
        object.put("sign", "");
        return object;
    }

    protected JSONObject initSendDataJsonObject(String uuid, Object serialNo, Object data, JSONObject signConfig) {
        long time = System.currentTimeMillis() / 1000;
        JSONObject object = new JSONObject();
        object.put("serialNo", serialNo);
        object.put("uuid", uuid);
        object.put("data", Objects.requireNonNullElse(data, ""));
        object.put("time", time);

        if (signConfig != null && signConfig.containsKey("secret")) {
            object.put("sign", DeviceUtils.hmacMd5(signConfig.getString("secret"), uuid + time));
        } else {
            object.put("sign", "");
        }
        return object;
    }
}
