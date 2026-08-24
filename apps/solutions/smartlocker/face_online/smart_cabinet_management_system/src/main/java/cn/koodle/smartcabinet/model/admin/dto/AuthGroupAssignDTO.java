package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "权限组分配关联参数")
public class AuthGroupAssignDTO {

    @Schema(description = "权限组ID", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long groupId;

    @Schema(description = "目标ID列表 (如果是分配人员则传用户ID，分配设备则传设备ID)")
    private List<Long> targetIds;
}