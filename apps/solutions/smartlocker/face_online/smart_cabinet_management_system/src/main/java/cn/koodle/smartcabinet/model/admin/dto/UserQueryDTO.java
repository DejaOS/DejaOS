package cn.koodle.smartcabinet.model.admin.dto;

import cn.koodle.smartcabinet.model.admin.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UserQueryDTO extends BasePageQuery {

    @Schema(description = "柜端人员ID")
    private String userId;

    @Schema(description = "姓名")
    private String name;

    @Schema(description = "联系电话")
    private String phone;

    @Schema(description = "人员分组ID")
    private Long groupId;

    @Schema(description = "要排除的设备ID，用于过滤已在该设备绑定柜格的人员")
    private Long excludeDeviceId;
}
