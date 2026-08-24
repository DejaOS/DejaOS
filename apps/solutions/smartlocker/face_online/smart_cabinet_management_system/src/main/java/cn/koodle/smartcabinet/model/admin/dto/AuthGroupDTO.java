package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "权限组新增/修改")
public class AuthGroupDTO {

    @Schema(description = "ID (修改时必填)")
    private Long id;

    @Schema(description = "权限组名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String groupName;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "状态: 1-启用 0-禁用")
    private Integer status;
}