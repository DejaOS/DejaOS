package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "柜格远程控制传输对象")
public class LockerControlDTO {
    @Schema(description = "柜格主键ID", required = true)
    private Long id;
}
