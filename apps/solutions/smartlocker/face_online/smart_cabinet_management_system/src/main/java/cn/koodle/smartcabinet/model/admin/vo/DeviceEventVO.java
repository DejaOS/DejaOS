package cn.koodle.smartcabinet.model.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeviceEventVO {
    private Long id;
    private Long deviceId;
    private String deviceNo;
    private String deviceName;
    private String ipAddress;
    private String serialNo;
    private String eventId;
    private String eventType;
    private String eventTypeText;
    private String userId;
    private Integer groupId;
    private Integer cabinetId;
    private Long eventTimestamp;
    private LocalDateTime eventTime;
    private String message;
    private String extra;
    private String rawPayload;
    private LocalDateTime createTime;
}
