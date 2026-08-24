package cn.koodle.smartcabinet.dao;

import cn.koodle.smartcabinet.entity.Device;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface DeviceDao extends BaseMapper<Device> {

    /**
     * 更新设备心跳信息
     * 更新字段: ip_address, version, last_active_time
     * 条件: device_no
     *
     * @param deviceSn 设备序列号
     * @param ip       IP地址
     * @param version  软件版本
     * @param time     心跳时间
     */
    @Update("UPDATE sys_device SET ip_address = #{ip}, version = #{version}, last_active_time = #{time} WHERE device_no = #{deviceSn}")
    void updateHeartbeat(@Param("deviceSn") String deviceSn, @Param("ip") String ip, @Param("version") String version, @Param("time") LocalDateTime time);


    /**
     * 根据用户ID，查询该用户有权限的所有设备编号
     * 关联路径: 用户 -> 权限组 -> 设备
     */
    @Select("""
                SELECT DISTINCT d.device_no
                FROM sys_device d
                INNER JOIN sys_auth_group_device agd ON d.id = agd.device_id
                INNER JOIN sys_auth_group_user age ON agd.group_id = age.group_id
                WHERE age.user_id = #{userId}
            """)
    List<String> selectDeviceNosByUserId(Long userId);


    /**
     * 根据权限组ID，查询该组关联的所有设备编号
     */
    @Select("""
                SELECT d.device_no
                FROM sys_device d
                INNER JOIN sys_auth_group_device agd ON d.id = agd.device_id
                WHERE agd.group_id = #{groupId}
            """)
    List<String> selectDeviceNosByGroupId(Long groupId);
}
