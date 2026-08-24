package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 设备柜组 (对应控制板的一路锁控或用户自定义的柜组)
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_device_channel")
public class DeviceChannel extends BaseEntity {

    /**
     * 关联设备ID (人脸终端ID)
     */
    private Long deviceId;

    /**
     * 柜组编号 (如: 1, 2, 3)
     */
    private Integer channelNo;

    /**
     * 柜组名称 (如: A区柜格、VIP专属区)
     */
    private String channelName;

    /**
     * 柜格数量 (这一组挂载的锁控数量，默认 50)
     */
    private Integer lockerCount;

    /**
     * 排序
     */
    private Integer sort;

    /**
     * 备注
     */
    private String remark;
}
