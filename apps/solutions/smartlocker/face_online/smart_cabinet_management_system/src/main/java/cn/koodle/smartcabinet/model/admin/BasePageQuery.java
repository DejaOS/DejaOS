package cn.koodle.smartcabinet.model.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 基础分页查询对象
 */
@Data
public class BasePageQuery {

    @Schema(description = "页码 (默认1)", example = "1")
    private Integer pageNo = 1;

    @Schema(description = "每页大小 (默认10)", example = "10")
    private Integer pageSize = 10;
}