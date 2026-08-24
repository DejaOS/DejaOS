package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.convert.DeviceEventConvert;
import cn.koodle.smartcabinet.dao.DeviceEventDao;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.DeviceEvent;
import cn.koodle.smartcabinet.model.admin.dto.DeviceEventQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceEventVO;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class DeviceEventService extends ServiceImpl<DeviceEventDao, DeviceEvent> {

    public static final String TYPE_CLOSE = "0";
    public static final String TYPE_OPEN = "1";
    public static final String TYPE_TEMP_OCCUPY = "2";
    public static final String TYPE_TEMP_RELEASE = "3";
    public static final String TYPE_DOOR_TIMEOUT = "5";
    public static final String TYPE_CABINET_LOCKED = "6";
    public static final String TYPE_FACE_SYNC_FAILURE = "faceSyncFailure";
    public static final String TYPE_CONNECT = "connect";
    public static final String TYPE_OFFLINE = "offline";

    private final DeviceEventConvert deviceEventConvert;

    public IPage<DeviceEventVO> getPage(DeviceEventQueryDTO query) {
        Page<DeviceEvent> page = new Page<>(query.getPageNo(), query.getPageSize());
        LambdaQueryWrapper<DeviceEvent> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getDeviceNo()), DeviceEvent::getDeviceNo, query.getDeviceNo())
                .eq(StringUtils.hasText(query.getEventType()), DeviceEvent::getEventType, query.getEventType())
                .like(StringUtils.hasText(query.getUserId()), DeviceEvent::getUserId, query.getUserId())
                .eq(query.getGroupId() != null, DeviceEvent::getGroupId, query.getGroupId())
                .eq(query.getCabinetId() != null, DeviceEvent::getCabinetId, query.getCabinetId());

        if (query.getStartTime() != null && query.getEndTime() != null) {
            wrapper.between(DeviceEvent::getEventTime, query.getStartTime(), query.getEndTime());
        } else if (query.getStartTime() != null) {
            wrapper.ge(DeviceEvent::getEventTime, query.getStartTime());
        } else if (query.getEndTime() != null) {
            wrapper.le(DeviceEvent::getEventTime, query.getEndTime());
        }

        wrapper.orderByDesc(DeviceEvent::getEventTime).orderByDesc(DeviceEvent::getId);
        return this.page(page, wrapper).convert(this::toVO);
    }

    public DeviceEventVO getDetail(Long id) {
        DeviceEvent event = this.getById(id);
        return event == null ? null : toVO(event);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveAccessEvent(Device device, JSONObject raw) {
        if (device == null || raw == null) {
            return;
        }
        Integer type = raw.getInteger("type");
        if (type == null || type == 4) {
            return;
        }
        String eventId = raw.getString("eventId");
        if (StringUtils.hasText(eventId) && this.count(new LambdaQueryWrapper<DeviceEvent>().eq(DeviceEvent::getEventId, eventId)) > 0) {
            return;
        }
        DeviceEvent event = baseEvent(device, raw.getString("serialNo"), eventId,
                String.valueOf(raw.getIntValue("type")), raw.getLong("timestamp"), raw.toJSONString());
        event.setUserId(normalizeText(raw.getString("userId")));
        event.setGroupId(raw.getInteger("groupId"));
        event.setCabinetId(raw.getInteger("cabinetId"));
        event.setExtra(toExtraText(raw.get("extra")));
        event.setMessage(buildAccessMessage(event.getEventType(), event.getUserId(), event.getGroupId(), event.getCabinetId(), event.getExtra()));
        this.save(event);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveFaceSyncFailure(Device device, String serialNo, JSONObject raw) {
        String code = raw == null ? null : normalizeText(raw.getString("code"));
        if (device == null || raw == null || !StringUtils.hasText(code) || "000000".equals(code)) {
            return;
        }
        String eventId = raw.getString("eventId");
        if (StringUtils.hasText(eventId) && this.count(new LambdaQueryWrapper<DeviceEvent>().eq(DeviceEvent::getEventId, eventId)) > 0) {
            return;
        }
        DeviceEvent event = baseEvent(device, serialNo, eventId, TYPE_FACE_SYNC_FAILURE,
                raw.getLong("timestamp"), raw.toJSONString());
        event.setUserId(normalizeText(raw.getString("userId")));
        event.setExtra(raw.toJSONString());
        String message = normalizeText(raw.getString("message"));
        event.setMessage(eventTypeText(TYPE_FACE_SYNC_FAILURE)
                + (StringUtils.hasText(event.getUserId()) ? " 用户 " + event.getUserId() : "")
                + (StringUtils.hasText(code) ? " " + code : "")
                + (StringUtils.hasText(message) ? " " + message : ""));
        this.save(event);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveConnectEvent(Device device, JSONObject envelope) {
        if (device == null) {
            return;
        }
        JSONObject raw = envelope == null ? new JSONObject() : envelope;
        DeviceEvent event = baseEvent(device, raw.getString("serialNo"), null, TYPE_CONNECT, raw.getLong("time"), raw.toJSONString());
        event.setExtra(toExtraText(raw.get("data")));
        event.setMessage("设备上线");
        this.save(event);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveOfflineEvent(Device device, JSONObject envelope) {
        if (device == null) {
            return;
        }
        JSONObject raw = envelope == null ? new JSONObject() : envelope;
        DeviceEvent event = baseEvent(device, raw.getString("serialNo"), null, TYPE_OFFLINE, raw.getLong("time"), raw.toJSONString());
        event.setMessage("设备离线");
        this.save(event);
    }

    private DeviceEvent baseEvent(Device device, String serialNo, String eventId, String eventType, Long eventTimestamp, String rawPayload) {
        DeviceEvent event = new DeviceEvent();
        event.setDeviceId(device.getId());
        event.setDeviceNo(device.getDeviceNo());
        event.setDeviceName(device.getDeviceName());
        event.setIpAddress(device.getIpAddress());
        event.setSerialNo(serialNo);
        event.setEventId(StringUtils.hasText(eventId) ? eventId : null);
        event.setEventType(eventType);
        event.setEventTimestamp(eventTimestamp);
        event.setEventTime(toLocalDateTime(eventTimestamp));
        event.setRawPayload(rawPayload);
        return event;
    }

    private DeviceEventVO toVO(DeviceEvent event) {
        DeviceEventVO vo = deviceEventConvert.toVO(event);
        vo.setEventTypeText(eventTypeText(event.getEventType()));
        return vo;
    }

    private String eventTypeText(String eventType) {
        if (TYPE_CLOSE.equals(eventType)) return "关柜";
        if (TYPE_OPEN.equals(eventType)) return "开柜";
        if (TYPE_TEMP_OCCUPY.equals(eventType)) return "临时占用";
        if (TYPE_TEMP_RELEASE.equals(eventType)) return "临时释放";
        if (TYPE_DOOR_TIMEOUT.equals(eventType)) return "开柜超时未关";
        if (TYPE_CABINET_LOCKED.equals(eventType)) return "柜格已锁定";
        if (TYPE_FACE_SYNC_FAILURE.equals(eventType)) return "人脸同步失败";
        if (TYPE_CONNECT.equals(eventType)) return "设备上线";
        if (TYPE_OFFLINE.equals(eventType)) return "设备离线";
        return eventType;
    }

    private String buildAccessMessage(String eventType, String userId, Integer groupId, Integer cabinetId, String extra) {
        String cabinet = groupId != null && cabinetId != null ? " 柜格 " + groupId + "-" + cabinetId : "";
        String user = StringUtils.hasText(userId) ? " 用户 " + userId : "";
        String suffix = StringUtils.hasText(extra) ? " " + extra : "";
        return eventTypeText(eventType) + cabinet + user + suffix;
    }

    private String toExtraText(Object extra) {
        if (extra == null) {
            return null;
        }
        if (extra instanceof JSONObject json) {
            return json.toJSONString();
        }
        return extra.toString();
    }

    private String normalizeText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private LocalDateTime toLocalDateTime(Long epoch) {
        if (epoch == null || epoch <= 0) {
            return LocalDateTime.now();
        }
        long millis = epoch < 100_000_000_000L ? epoch * 1000 : epoch;
        return Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}
