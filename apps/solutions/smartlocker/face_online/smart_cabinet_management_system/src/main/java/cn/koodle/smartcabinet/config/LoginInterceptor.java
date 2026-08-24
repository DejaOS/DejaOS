package cn.koodle.smartcabinet.config;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import cn.hutool.jwt.JWT;
import cn.hutool.jwt.JWTUtil;
import cn.hutool.jwt.signers.JWTSignerUtil;
import cn.koodle.smartcabinet.common.context.UserContext;
import cn.koodle.smartcabinet.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

public class LoginInterceptor implements HandlerInterceptor {

    private static final byte[] JWT_KEY = "koodle_cabinet_secret_key".getBytes(StandardCharsets.UTF_8);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 放行 OPTIONS 请求
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 2. 获取 Token
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        if (token == null || token.isEmpty()) {
            response.setStatus(401);
            return false;
        }

        try {
            // 3. 校验签名
            boolean verify = JWTUtil.verify(token, JWTSignerUtil.hs256(JWT_KEY));
            if (!verify) {
                response.setStatus(401);
                return false;
            }

            // 4. 解析并存储用户信息到 ThreadLocal
            JWT jwt = JWTUtil.parseToken(token);
            JSONObject payloads = jwt.getPayloads();
            User user = JSONUtil.toBean(payloads, User.class);
            UserContext.setUser(user);
            return true;

        } catch (Exception e) {
            response.setStatus(401);
            return false;
        }
    }

    /**
     * 请求处理完成后执行 (无论是否发生异常)
     * 用于清理资源
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, @Nullable Exception ex) throws Exception {
        UserContext.clear();
    }
}