package cn.koodle.smartcabinet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // 定义本地存储根目录 (项目根目录/upload/)
    public static final String UPLOAD_FOLDER = System.getProperty("user.dir") + File.separator + "upload" + File.separator;
    // 定义访问的前缀 URL
    public static final String ACCESS_PREFIX = "/files/";

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 映射本地文件目录到 HTTP URL
        // 也就是: http://localhost:8080/files/xxx.jpg -> 本地 upload/xxx.jpg
        registry.addResourceHandler(ACCESS_PREFIX + "**")
                .addResourceLocations("file:" + UPLOAD_FOLDER);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // ==========================================
        // 1. 管理后台拦截器 (只拦截 /admin/**)
        // ==========================================
        registry.addInterceptor(new LoginInterceptor())
                .addPathPatterns("/admin/**") // <--- 关键：只管 /admin 开头的
                .excludePathPatterns("/admin/v1/auth/login"); // 放行登录接口

        // ==========================================
        // 2. 设备端拦截器 (只拦截 /device/**)
        // ==========================================
        registry.addInterceptor(new DeviceAuthInterceptor())
                .addPathPatterns("/device/**") // <--- 关键：只管 /device 开头的
                .excludePathPatterns("/device/v1/activate"); // (可选)如果有设备激活接口需放行
    }
}