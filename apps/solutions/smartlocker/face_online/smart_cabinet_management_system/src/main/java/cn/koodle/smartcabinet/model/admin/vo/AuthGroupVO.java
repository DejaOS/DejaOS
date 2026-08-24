package cn.koodle.smartcabinet.model.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AuthGroupVO {

    private Long id;
    private String groupName;
    private String description;
    
    private Integer status;
    private String statusText; // 启用/禁用
    
    @Schema(description = "关联用户数量")
    private Long userCount; 
    
    @Schema(description = "关联设备数量")
    private Long deviceCount;

    private LocalDateTime createTime;
}