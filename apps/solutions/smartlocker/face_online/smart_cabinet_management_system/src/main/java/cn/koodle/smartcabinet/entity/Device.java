package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_device")
public class Device extends BaseEntity {

    public static final int OFFLINE = 0;
    public static final int ONLINE = 1;

    private String deviceNo;

    private String deviceName;

    private String ipAddress;

    private String version;

    private String remark;

    private LocalDateTime lastActiveTime;

    private Integer onlineStatus;

    /**
     * Full getConfig data returned by the device.
     */
    private String configJson;
}
