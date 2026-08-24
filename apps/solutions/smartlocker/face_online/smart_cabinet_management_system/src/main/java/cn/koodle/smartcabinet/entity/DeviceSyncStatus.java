package cn.koodle.smartcabinet.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * 设备同步状态表
 */
@Data
@Accessors(chain = true)
@TableName("sys_device_sync_status")
public class DeviceSyncStatus {

    /**
     * 设备序列号
     */
    @TableId(type = IdType.INPUT)
    private String deviceSn;

    /**
     * 是否需要同步人员及人脸信息 (合并项：包含 userId、姓名、人脸照片)
     */
    private Boolean needSyncUser;

    /**
     * 最后更新时间
     */
    private LocalDateTime updateTime;
}