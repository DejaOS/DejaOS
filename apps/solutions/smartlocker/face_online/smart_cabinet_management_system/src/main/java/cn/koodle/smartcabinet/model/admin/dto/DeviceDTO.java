package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class DeviceDTO {
    private Long id;

    @Schema(description = "设备编号/SN")
    private String deviceNo;

    @Schema(description = "设备名称")
    private String deviceName;

    @Schema(description = "IP 地址")
    private String ipAddress;

    @Schema(description = "固件版本")
    private String version;

    @Schema(description = "备注")
    private String remark;
}
