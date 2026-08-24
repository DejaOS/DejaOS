package cn.koodle.smartcabinet.service;

import cn.hutool.core.date.DateUtil;
import cn.hutool.crypto.digest.BCrypt;
import cn.hutool.jwt.JWT;
import cn.hutool.jwt.signers.JWTSigner;
import cn.hutool.jwt.signers.JWTSignerUtil;
import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.model.admin.dto.AdminPasswordDTO;
import cn.koodle.smartcabinet.model.admin.dto.LoginDTO;
import cn.koodle.smartcabinet.model.admin.vo.LoginVO;
import com.alibaba.fastjson2.JSON;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Date;

@Slf4j
@Service
public class AuthService {

    private static final byte[] JWT_KEY = "koodle_cabinet_secret_key".getBytes(StandardCharsets.UTF_8);
    private static final String DEFAULT_ADMIN = "admin";
    private static final String DEFAULT_PASSWORD = "123456";

    @Value("${app.admin.config-path:./config/admin.json}")
    private String adminConfigPath;

    public LoginVO login(LoginDTO dto) {
        AdminAccount admin = loadAdminAccount();
        if (!StringUtils.hasText(dto.getAccount()) || !admin.getUsername().equals(dto.getAccount().trim())) {
            throw new ApiException("账号不存在");
        }
        if (!BCrypt.checkpw(dto.getPassword(), admin.getPasswordHash())) {
            throw new ApiException("密码错误");
        }

        JWTSigner signer = JWTSignerUtil.hs256(JWT_KEY);
        String token = JWT.create()
                .setPayload("id", 0L)
                .setPayload("userId", admin.getUsername())
                .setPayload("name", admin.getName())
                .setPayload("role", 1)
                .setExpiresAt(DateUtil.offsetHour(new Date(), 24))
                .setSigner(signer)
                .sign();

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setUserId(admin.getUsername());
        vo.setName(admin.getName());
        return vo;
    }

    public void changePassword(AdminPasswordDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.getOldPassword()) || !StringUtils.hasText(dto.getNewPassword())) {
            throw new ApiException("旧密码和新密码不能为空");
        }
        if (dto.getNewPassword().trim().length() < 6) {
            throw new ApiException("新密码至少 6 位");
        }

        AdminAccount admin = loadAdminAccount();
        if (!BCrypt.checkpw(dto.getOldPassword(), admin.getPasswordHash())) {
            throw new ApiException("旧密码错误");
        }
        admin.setPasswordHash(BCrypt.hashpw(dto.getNewPassword().trim()));
        writeAdminAccount(admin);
    }

    public void initAdminAccount() {
        loadAdminAccount();
    }

    private AdminAccount loadAdminAccount() {
        Path path = Path.of(adminConfigPath);
        if (!Files.exists(path)) {
            AdminAccount admin = new AdminAccount();
            admin.setUsername(DEFAULT_ADMIN);
            admin.setName("管理员");
            admin.setPasswordHash(BCrypt.hashpw(DEFAULT_PASSWORD));
            writeAdminAccount(admin);
            log.info("admin config initialized at {}", path.toAbsolutePath());
            return admin;
        }

        try {
            AdminAccount admin = JSON.parseObject(Files.readString(path, StandardCharsets.UTF_8), AdminAccount.class);
            if (admin == null || !StringUtils.hasText(admin.getUsername()) || !StringUtils.hasText(admin.getPasswordHash())) {
                throw new ApiException("管理员配置文件格式不正确");
            }
            if (!StringUtils.hasText(admin.getName())) {
                admin.setName(admin.getUsername());
            }
            return admin;
        } catch (IOException e) {
            throw new ApiException("读取管理员配置失败: " + e.getMessage());
        }
    }

    private void writeAdminAccount(AdminAccount admin) {
        Path path = Path.of(adminConfigPath);
        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(path, JSON.toJSONString(admin), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ApiException("保存管理员配置失败: " + e.getMessage());
        }
    }

    @Data
    private static class AdminAccount {
        private String username;
        private String name;
        private String passwordHash;
    }
}
