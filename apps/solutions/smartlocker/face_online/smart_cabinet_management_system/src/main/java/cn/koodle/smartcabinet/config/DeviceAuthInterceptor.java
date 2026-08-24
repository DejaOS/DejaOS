package cn.koodle.smartcabinet.config;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import cn.hutool.json.JSONObject;
import cn.koodle.smartcabinet.common.api.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.io.PrintWriter;

@Slf4j
public class DeviceAuthInterceptor implements HandlerInterceptor {

    // 设备通讯密钥
    private static final String DEVICE_API_SECRET = "koodle_vf105_secret_888";
    // 允许的时间误差 (5分钟)
    private static final int EXPIRATION_TIME = 5 * 60 * 1000;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String timestamp = request.getHeader("X-Timestamp");
        String signature = request.getHeader("X-Signature");
        String sn = request.getHeader("X-Device-SN");

        // 1. 基础参数校验
        if (StrUtil.hasBlank(timestamp, signature, sn)) {
            returnJson(response, "鉴权失败：缺少必要Header参数(X-Device-SN/X-Timestamp/X-Signature)");
            return false;
        }

        // 2. 防重放攻击：检查时间戳
        long reqTime;
        try {
            reqTime = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            returnJson(response, "鉴权失败：时间戳格式错误");
            return false;
        }

        // 校验时间是否过期 (考虑客户端和服务端时间可能的正负误差，建议取绝对值或允许一定范围)
        // 此处逻辑：请求时间必须在 当前时间-5分钟 到 当前时间+5分钟 之间（防止未来时间）
        long now = System.currentTimeMillis();
        if (Math.abs(now - reqTime) > EXPIRATION_TIME) {
            returnJson(response, "鉴权失败：请求时间戳已过期，请检查设备系统时间");
            return false;
        }

        // 3. 服务端重算签名
        // 签名规则: MD5(sn + timestamp + secret)
        String calculatedSign = DigestUtil.md5Hex(sn + timestamp + DEVICE_API_SECRET);

        // 建议使用 equalsIgnoreCase 兼容大小写
        if (!calculatedSign.equalsIgnoreCase(signature)) {
            log.warn("设备签名校验失败 SN: {}, ClientSign: {}, ServerSign: {}", sn, signature, calculatedSign);
            returnJson(response, "鉴权失败：签名不匹配");
            return false;
        }

        return true;
    }

    /**
     * 写入 JSON 错误响应
     */
    private void returnJson(HttpServletResponse response, String msg) {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=utf-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        try (PrintWriter writer = response.getWriter()) {
            writer.print(new JSONObject(Result.failed(msg)));
        } catch (IOException e) {
            log.error("写入响应失败", e);
        }
    }
}