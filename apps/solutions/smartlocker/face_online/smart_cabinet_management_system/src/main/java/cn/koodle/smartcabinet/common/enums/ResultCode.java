package cn.koodle.smartcabinet.common.enums;

import lombok.Getter;

@Getter
public enum ResultCode {

    /**
     * 操作成功
     */
    SUCCESS(0, "操作成功"),

    /**
     * 操作失败
     */
    FAILED(500, "操作失败"),

    /**
     * 参数检验失败
     */
    VALIDATE_FAILED(400, "参数检验失败"),

    /**
     * 暂无登录或token已经过期
     */
    UNAUTHORIZED(401, "暂无登录或token已经过期"),

    /**
     * 没有相关权限
     */
    FORBIDDEN(403, "没有相关权限");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}