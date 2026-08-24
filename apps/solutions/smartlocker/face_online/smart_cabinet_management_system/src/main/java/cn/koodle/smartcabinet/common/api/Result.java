package cn.koodle.smartcabinet.common.api;

import cn.koodle.smartcabinet.common.enums.ResultCode;
import lombok.Data;

/**
 * 通用返回对象
 * @param <T> 数据类型
 */
@Data
public class Result<T> {

    private int code;
    private String message;
    private T data;
    
    // 可选：添加时间戳，方便排查问题
    private long timestamp;

    protected Result() {
    }

    protected Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }

    /**
     * 成功返回结果
     */
    public static <T> Result<T> success() {
        return success(null);
    }

    /**
     * 成功返回结果
     *
     * @param data 获取的数据
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMessage(), data);
    }

    /**
     * 成功返回结果（自定义提示信息）
     */
    public static <T> Result<T> success(T data, String message) {
        return new Result<>(ResultCode.SUCCESS.getCode(), message, data);
    }

    /**
     * 失败返回结果
     * @param errorCode 错误码枚举
     */
    public static <T> Result<T> failed(ResultCode errorCode) {
        return new Result<>(errorCode.getCode(), errorCode.getMessage(), null);
    }

    /**
     * 失败返回结果（自定义提示信息）
     */
    public static <T> Result<T> failed(String message) {
        return new Result<>(ResultCode.FAILED.getCode(), message, null);
    }

    /**
     * 失败返回结果（自定义错误码和提示信息）
     */
    public static <T> Result<T> failed(int code, String message) {
        return new Result<>(code, message, null);
    }
}