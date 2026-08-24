package cn.koodle.smartcabinet.model.admin.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class UserGroupExportDTO {
    @ExcelProperty("分组名称")
    private String name;

    @ExcelProperty("上级分组名称")
    private String parentName;

    @ExcelProperty("人数")
    private Long userCount;
    
    @ExcelProperty("排序号")
    private Integer orderNum;
}