package cn.koodle.smartcabinet.model.admin.dto;

import cn.koodle.smartcabinet.model.admin.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "权限组查询条件")
public class AuthGroupQueryDTO extends BasePageQuery {

    @Schema(description = "权限组名称")
    private String groupName;

    @Schema(description = "权限组描述")
    private String description;

    @Schema(description = "状态: 1-启用 0-禁用")
    private Integer status;
}