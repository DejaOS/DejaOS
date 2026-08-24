package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "分组新增/修改参数")
public class UserGroupDTO {

    @Schema(description = "ID (修改必填)")
    private Long id;

    @Schema(description = "父级ID (不填默认为0/顶级)")
    private Long parentId;

    @Schema(description = "分组名称")
    private String name;

    @Schema(description = "排序号")
    private Integer orderNum;
}