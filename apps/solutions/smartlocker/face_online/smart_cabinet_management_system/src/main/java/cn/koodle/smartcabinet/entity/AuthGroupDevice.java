package cn.koodle.smartcabinet.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("sys_auth_group_device")
public class AuthGroupDevice {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long groupId;
    private Long deviceId;

    public AuthGroupDevice(Long groupId, Long deviceId) {
        this.groupId = groupId;
        this.deviceId = deviceId;
    }
}