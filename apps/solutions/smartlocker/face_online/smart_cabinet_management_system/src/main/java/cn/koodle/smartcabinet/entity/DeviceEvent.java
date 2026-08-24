package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_device_event")
public class DeviceEvent extends BaseEntity {
    private Long deviceId;
    private String deviceNo;
    private String deviceName;
    private String ipAddress;

    private String serialNo;
    private String eventId;
    private String eventType;
    private String userId;
    private Integer groupId;
    private Integer cabinetId;
    private Long eventTimestamp;
    private LocalDateTime eventTime;
    private String message;
    private String extra;
    private String rawPayload;
}
