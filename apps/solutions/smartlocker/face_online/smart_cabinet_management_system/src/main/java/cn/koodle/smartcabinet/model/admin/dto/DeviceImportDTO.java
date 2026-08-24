package cn.koodle.smartcabinet.model.admin.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class DeviceImportDTO {

    @ExcelProperty("设备编号")
    private String deviceNo;

    @ExcelProperty("设备名称")
    private String deviceName;

    @ExcelProperty("IP地址")
    private String ipAddress;

    @ExcelProperty("固件版本")
    private String version;

    @ExcelProperty("备注")
    private String remark;
}
