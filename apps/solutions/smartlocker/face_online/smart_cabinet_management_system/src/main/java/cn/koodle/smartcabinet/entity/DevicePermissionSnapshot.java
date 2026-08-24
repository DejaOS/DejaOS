package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * 设备权限快照表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("sys_device_permission_snapshot")
public class DevicePermissionSnapshot extends BaseEntity {

    /**
     * 设备序列号
     */
    private String deviceSn;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 用户编号
     */
    private String mqttUserId;

    /**
     * 用户姓名
     */
    private String username;

    /**
     * 数据指纹
     * MD5(用户id_用户编号_姓名_角色_人脸照片Url_人脸照片md5)
     */
    private String dataMd5;

}
