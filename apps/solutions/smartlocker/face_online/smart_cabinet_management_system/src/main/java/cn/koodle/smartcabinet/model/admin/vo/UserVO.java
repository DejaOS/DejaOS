package cn.koodle.smartcabinet.model.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "柜端人员展示对象")
public class UserVO {

    private Long id;

    @Schema(description = "柜端人员ID")
    private String userId;

    private String name;

    private String phone;

    private String pin;

    private Long groupId;

    private String groupName;

    private String faceImageUrl;

    private String faceImageMd5;

    private Integer role;

    private LocalDateTime createTime;
}
