package cn.koodle.smartcabinet.model.admin.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class UserImportDTO {

    @ExcelProperty("人员ID")
    private String userId;

    @ExcelProperty("姓名")
    private String name;

    @ExcelProperty("联系电话")
    private String phone;

    @ExcelProperty("PIN")
    private String pin;

    @ExcelProperty("所属分组")
    private String groupName;
}
