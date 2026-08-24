package cn.koodle.smartcabinet.model.admin.dto;

import lombok.Data;

@Data
public class AdminPasswordDTO {
    private String oldPassword;
    private String newPassword;
}
