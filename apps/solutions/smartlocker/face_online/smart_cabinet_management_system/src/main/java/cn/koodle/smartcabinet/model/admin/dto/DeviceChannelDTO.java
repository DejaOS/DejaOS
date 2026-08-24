package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class DeviceChannelDTO {
    private Long id;

    @Schema(description = "关联设备ID")
    private Long deviceId;

    @Schema(description = "柜组编号")
    private Integer channelNo;

    @Schema(description = "柜组名称")
    private String channelName;

    @Schema(description = "柜格数量")
    private Integer lockerCount;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "备注")
    private String remark;
}
