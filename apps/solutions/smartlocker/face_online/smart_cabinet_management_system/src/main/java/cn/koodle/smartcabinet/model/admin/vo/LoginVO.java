package cn.koodle.smartcabinet.model.admin.vo;

import lombok.Data;

@Data
public class LoginVO {
    private String token;
    private String userId;
    private String name;
}
