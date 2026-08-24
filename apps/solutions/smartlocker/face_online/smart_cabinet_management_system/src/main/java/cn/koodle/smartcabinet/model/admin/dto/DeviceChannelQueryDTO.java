package cn.koodle.smartcabinet.model.admin.dto;

import cn.koodle.smartcabinet.model.admin.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class DeviceChannelQueryDTO extends BasePageQuery {
    @Schema(description = "关联设备ID")
    private Long deviceId;
    
    @Schema(description = "分组名称")
    private String channelName;
}