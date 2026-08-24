package cn.koodle.smartcabinet.common.exception;

import cn.koodle.smartcabinet.common.enums.ResultCode;
import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final int code;

    public ApiException(String message) {
        super(message);
        this.code = ResultCode.FAILED.getCode();
    }

    public ApiException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
    }
}