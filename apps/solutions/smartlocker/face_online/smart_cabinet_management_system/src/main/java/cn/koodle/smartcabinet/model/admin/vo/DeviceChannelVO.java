package cn.koodle.smartcabinet.model.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeviceChannelVO {
    private Long id;
    private Long deviceId;
    private Integer channelNo;
    private String channelName;
    private Integer lockerCount;
    private Integer sort;
    private String remark;
    private LocalDateTime createTime;
}