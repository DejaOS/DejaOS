package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "柜端人员保存参数")
public class UserDTO {

    private Long id;

    @Schema(description = "柜端人员ID，对应 MQTT User.userId")
    private String userId;

    @Schema(description = "姓名")
    private String name;

    @Schema(description = "联系电话")
    private String phone;

    @Schema(description = "PIN")
    private String pin;

    @Schema(description = "人员分组ID")
    private Long groupId;

    @Schema(description = "人脸照片地址")
    private String faceImageUrl;

    @Schema(description = "人脸照片MD5")
    private String faceImageMd5;

    @Schema(description = "设备端角色: 0-普通用户, 1-设备管理员")
    private Integer role;
}
