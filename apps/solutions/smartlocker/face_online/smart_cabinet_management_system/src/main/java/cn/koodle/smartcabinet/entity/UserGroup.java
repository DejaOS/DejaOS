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
@TableName("sys_user_group")
public class UserGroup extends BaseEntity {
    // 父级ID，顶级节点为 0
    private Long parentId;

    // 分组名称
    private String name;

    // 排序号
    private Integer orderNum;

    // 备注 (可选)
    private String remark;
}