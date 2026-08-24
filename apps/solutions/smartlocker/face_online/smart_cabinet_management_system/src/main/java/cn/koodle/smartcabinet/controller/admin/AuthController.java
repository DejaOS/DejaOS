package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.AdminPasswordDTO;
import cn.koodle.smartcabinet.model.admin.dto.LoginDTO;
import cn.koodle.smartcabinet.model.admin.vo.LoginVO;
import cn.koodle.smartcabinet.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "认证中心")
@RestController
@RequestMapping("/admin/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "用户登录", description = "返回Token，后续请求需在Header携带 Authorization: Bearer {token}")
    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody LoginDTO loginDTO) {
        LoginVO loginVO = authService.login(loginDTO);
        return Result.success(loginVO);
    }

    @Operation(summary = "修改后台管理员密码")
    @PutMapping("/password")
    public Result<Void> changePassword(@RequestBody AdminPasswordDTO passwordDTO) {
        authService.changePassword(passwordDTO);
        return Result.success();
    }
}
