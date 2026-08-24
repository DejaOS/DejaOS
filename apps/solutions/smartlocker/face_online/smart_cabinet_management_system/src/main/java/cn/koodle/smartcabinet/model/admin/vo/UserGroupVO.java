package cn.koodle.smartcabinet.model.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "人员分组展示对象")
public class UserGroupVO {

    @Schema(description = "分组ID")
    private Long id;

    @Schema(description = "父级ID")
    private Long parentId;

    @Schema(description = "分组名称")
    private String name;

    @Schema(description = "排序号")
    private Integer orderNum;

    @Schema(description = "包含人数(含子分组)")
    private Long userCount;

    @Schema(description = "创建时间")
    private LocalDateTime createTime;

    @Schema(description = "子分组列表")
    private List<UserGroupVO> children;
}