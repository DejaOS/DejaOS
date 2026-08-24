package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_auth_group")
public class AuthGroup extends BaseEntity {

    /** 权限组名称 */
    private String groupName;

    /** 描述 */
    private String description;

    /** 状态: 1-启用, 0-禁用 */
    private Integer status;
}