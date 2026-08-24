package cn.koodle.smartcabinet.model.admin.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class UserGroupImportDTO {

    @ExcelProperty("分组名称")
    private String name;

    @ExcelProperty("上级分组名称")
    private String parentName; // 如果为空，则认为是顶级分组

    @ExcelProperty("排序号")
    private Integer orderNum;
}