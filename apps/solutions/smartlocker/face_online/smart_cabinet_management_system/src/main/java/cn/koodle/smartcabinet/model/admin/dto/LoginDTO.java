package cn.koodle.smartcabinet.model.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "登录参数")
public class LoginDTO {
    @Schema(description = "账号/手机号", requiredMode = Schema.RequiredMode.REQUIRED, example = "admin")
    private String account;

    @Schema(description = "密码", requiredMode = Schema.RequiredMode.REQUIRED, example = "123456")
    private String password;
}