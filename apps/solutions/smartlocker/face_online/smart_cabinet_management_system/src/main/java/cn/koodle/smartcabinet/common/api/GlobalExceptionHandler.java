package cn.koodle.smartcabinet.common.api;

import cn.koodle.smartcabinet.common.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 处理我们自定义的业务异常
    @ExceptionHandler(ApiException.class)
    public Result<?> handleApiException(ApiException e) {
        log.warn("业务异常: {}", e.getMessage());
        return Result.failed(e.getCode(), e.getMessage());
    }

    // 处理其他未知的系统异常
    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        e.printStackTrace();
        log.error("系统异常", e);
        return Result.failed("系统内部错误，请联系管理员");
    }
}