package cn.koodle.smartcabinet.model.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeviceVO {
    private Long id;

    private String deviceNo;
    private String deviceName;
    private String ipAddress;
    private String version;
    private String remark;
    private LocalDateTime lastActiveTime;
    private Integer onlineStatus;
    private LocalDateTime createTime;
}
