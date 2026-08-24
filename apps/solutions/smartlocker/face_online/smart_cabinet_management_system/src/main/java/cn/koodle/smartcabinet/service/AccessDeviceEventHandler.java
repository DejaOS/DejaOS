package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.dao.LockerDao;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.Locker;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import d1.device.vgsdk.model.AccessDeviceInfo;
import d1.device.vgsdk.model.AccessRecord;
import d1.device.vgsdk.model.AlarmRecord;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccessDeviceEventHandler implements IAccessDeviceEventHandler {
    private static final int EVENT_CLOSE = 0;
    private static final int EVENT_OPEN = 1;
    private static final int EVENT_TEMP_OCCUPY = 2;
    private static final int EVENT_TEMP_RELEASE = 3;
    private static final int EVENT_DOOR_TIMEOUT = 5;
    private static final int EVENT_CABINET_LOCKED = 6;

    private final DeviceDao deviceDao;
    private final LockerDao lockerDao;
    private final DeviceEventService deviceEventService;

    @Override
    public void handleAccessRecord(String protocol, List<AccessRecord> array) {
        if (array == null || array.isEmpty()) {
            return;
        }
        for (AccessRecord record : array) {
            handleAccessRecord(record);
        }
    }

    @Override
    public void handleFaceSync(String protocol, String uuid, String serialNo, JSONArray array) {
        if (!StringUtils.hasText(uuid) || array == null || array.isEmpty()) {
            return;
        }
        Device device = findDevice(uuid);
        if (device == null) {
            log.warn("skip face sync event, device not found: uuid={}", uuid);
            return;
        }
        for (Object item : array) {
            if (item instanceof JSONObject raw) {
                String code = raw.getString("code");
                if (StringUtils.hasText(code) && !"000000".equals(code)) {
                    deviceEventService.saveFaceSyncFailure(device, serialNo, raw);
                }
            }
        }
        touchDevice(device);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleAlarm(String protocol, AlarmRecord alarmRecord) {
        if (alarmRecord == null || !StringUtils.hasText(alarmRecord.getUuid())) {
            return;
        }
        Device device = findDevice(alarmRecord.getUuid());
        if (device == null) {
            return;
        }
        if (AlarmRecord.TYPE_OFFLINE.equals(alarmRecord.getType())) {
            Device update = new Device();
            update.setId(device.getId());
            update.setOnlineStatus(0);
            update.setLastActiveTime(LocalDateTime.now());
            deviceDao.updateById(update);
            deviceEventService.saveOfflineEvent(device, parseJson(alarmRecord.getValue()));
        }
    }

    @Override
    public boolean onlineCheck(String protocol, AccessRecord record) {
        return record != null && findDevice(record.getUuid()) != null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleInfo(String protocol, AccessDeviceInfo info) {
        if (info == null || !StringUtils.hasText(info.getUuid())) {
            return;
        }
        Device device = findDevice(info.getUuid());
        if (device == null) {
            log.warn("mqtt device connected but not registered, uuid={}", info.getUuid());
            return;
        }
        JSONObject envelope = parseJson(info.getExtra());
        JSONObject data = envelope == null ? null : envelope.getJSONObject("data");
        String version = data == null ? info.getName() : data.getString("appVersion");
        String ip = data == null ? null : data.getString("ip");

        Device update = new Device();
        update.setId(device.getId());
        update.setOnlineStatus(1);
        update.setVersion(StringUtils.hasText(version) ? version : device.getVersion());
        update.setIpAddress(StringUtils.hasText(ip) ? ip : device.getIpAddress());
        update.setLastActiveTime(LocalDateTime.now());
        deviceDao.updateById(update);

        Device current = findDevice(info.getUuid());
        deviceEventService.saveConnectEvent(current == null ? device : current, envelope);
    }

    private void handleAccessRecord(AccessRecord record) {
        if (record == null || !StringUtils.hasText(record.getUuid())) {
            return;
        }
        JSONObject raw = parseJson(record.getExtra());
        if (raw == null) {
            log.warn("skip access event without raw payload: {}", record);
            return;
        }

        Device device = findDevice(record.getUuid());
        if (device == null) {
            log.warn("skip access event, device not found: uuid={}", record.getUuid());
            return;
        }

        deviceEventService.saveAccessEvent(device, raw);
        try {
            updateLockerRuntime(device.getId(), raw);
        } catch (Exception e) {
            log.error("access event locker runtime update failed, deviceId={}, raw={}", device.getId(), raw, e);
        }
        touchDevice(device);
    }

    private void updateLockerRuntime(Long deviceId, JSONObject raw) {
        Integer eventType = raw.getInteger("type");
        if (eventType == null || eventType < EVENT_CLOSE
                || (eventType > EVENT_TEMP_RELEASE && eventType != EVENT_DOOR_TIMEOUT && eventType != EVENT_CABINET_LOCKED)) {
            return;
        }
        Locker locker = findLocker(deviceId, raw);
        if (locker == null) {
            log.warn("access event locker not found, deviceId={}, raw={}", deviceId, raw);
            return;
        }

        LambdaUpdateWrapper<Locker> update = new LambdaUpdateWrapper<Locker>().eq(Locker::getId, locker.getId());
        if (eventType == EVENT_CLOSE) {
            update.set(Locker::getDoorOpen, 0);
        } else if (eventType == EVENT_OPEN) {
            update.set(Locker::getDoorOpen, 1);
        } else if (eventType == EVENT_TEMP_OCCUPY) {
            update.set(Locker::getStatus, 2)
                    .set(Locker::getType, 2)
                    .set(Locker::getUserId, normalizeText(raw.getString("userId")))
                    .set(Locker::getStartTimestamp, firstLong(raw, "startTimestamp", "start_timestamp"))
                    .set(Locker::getEndTimestamp, firstLong(raw, "endTimestamp", "end_timestamp"));
        } else if (eventType == EVENT_TEMP_RELEASE) {
            update.set(Locker::getStatus, 1)
                    .set(Locker::getUserId, null)
                    .set(Locker::getStartTimestamp, null)
                    .set(Locker::getEndTimestamp, null)
                    .set(Locker::getBindStartTime, null)
                    .set(Locker::getBindEndTime, null);
        } else if (eventType == EVENT_DOOR_TIMEOUT) {
            update.set(Locker::getDoorOpen, 1);
        } else if (eventType == EVENT_CABINET_LOCKED) {
            update.set(Locker::getStatus, 3)
                    .set(Locker::getUserId, normalizeText(raw.getString("userId")));
        }
        lockerDao.update(null, update);
    }

    private void touchDevice(Device device) {
        Device update = new Device();
        update.setId(device.getId());
        update.setLastActiveTime(LocalDateTime.now());
        deviceDao.updateById(update);
    }

    private Device findDevice(String deviceNo) {
        return deviceDao.selectOne(new LambdaQueryWrapper<Device>().eq(Device::getDeviceNo, deviceNo).last("limit 1"));
    }

    private Locker findLocker(Long deviceId, JSONObject raw) {
        Integer groupId = raw.getInteger("groupId");
        Integer cabinetId = raw.getInteger("cabinetId");
        if (groupId == null || cabinetId == null) {
            return null;
        }
        return lockerDao.selectOne(new LambdaQueryWrapper<Locker>()
                .eq(Locker::getDeviceId, deviceId)
                .eq(Locker::getGroupId, groupId)
                .eq(Locker::getCabinetId, cabinetId)
                .last("limit 1"));
    }

    private Long firstLong(JSONObject raw, String... keys) {
        for (String key : keys) {
            Long value = raw.getLong(key);
            if (value != null) {
                return value;
            }
        }
        JSONObject extra = parseExtra(raw.get("extra"));
        if (extra != null) {
            for (String key : keys) {
                Long value = extra.getLong(key);
                if (value != null) {
                    return value;
                }
            }
        }
        return null;
    }

    private JSONObject parseExtra(Object value) {
        if (value instanceof JSONObject json) {
            return json;
        }
        return value == null ? null : parseJson(value.toString());
    }

    private JSONObject parseJson(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return JSONObject.parseObject(value);
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
