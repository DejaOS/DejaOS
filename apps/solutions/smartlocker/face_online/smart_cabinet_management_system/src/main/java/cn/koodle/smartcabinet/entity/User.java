package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@TableName("sys_user")
public class User extends BaseEntity {

    /**
     * Cabinet-side user id sent to the device MQTT user object.
     */
    private String userId;

    private String name;

    private String phone;

    private String pin;

    private Long groupId;

    private String faceImageUrl;

    private String faceImageMd5;

    /**
     * Device-side role: 0 ordinary user, 1 device admin.
     */
    private Integer role;
}
