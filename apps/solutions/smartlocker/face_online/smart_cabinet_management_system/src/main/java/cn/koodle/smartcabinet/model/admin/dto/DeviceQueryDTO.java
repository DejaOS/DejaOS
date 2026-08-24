package cn.koodle.smartcabinet.model.admin.dto;

import cn.koodle.smartcabinet.model.admin.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class DeviceQueryDTO extends BasePageQuery {

    @Schema(description = "设备编号")
    private String deviceNo;

    @Schema(description = "设备名称")
    private String deviceName;

    @Schema(description = "在线状态：1 在线，0 离线")
    private Integer onlineStatus;
}
