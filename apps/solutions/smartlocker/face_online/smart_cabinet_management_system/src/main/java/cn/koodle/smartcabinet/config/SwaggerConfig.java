package cn.koodle.smartcabinet.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    // 全局 OpenAPI 配置 (保持不变，用于 Admin 的 Token)
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("智能储物柜管理系统 API")
                        .version("1.0")
                        .description("基于 Spring Boot 3 + MyBatis-Plus + Vue 的管理系统"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }

    // 分组1: 管理端接口 (保持不变)
    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("1. 管理后台-Admin")
                .pathsToMatch("/admin/**")
                .build();
    }

    // 分组2: 设备端接口 (!!! 修改这里 !!!)
    @Bean
    public GroupedOpenApi deviceApi() {
        return GroupedOpenApi.builder()
                .group("2. 设备终端-Device")
                .pathsToMatch("/device/**")
                // --- 新增：为设备接口统一添加 Header 参数 ---
                .addOperationCustomizer((operation, handlerMethod) -> {
                    // 1. 添加 X-Device-SN
                    operation.addParametersItem(new Parameter()
                            .name("X-Device-SN")
                            .description("设备序列号")
                            .in("header") // 参数位置：Header
                            .required(true) // 必填
                            .example("D001"));

                    // 2. 添加 X-Timestamp
                    operation.addParametersItem(new Parameter()
                            .name("X-Timestamp")
                            .description("时间戳 (System.currentTimeMillis())")
                            .in("header")
                            .required(true)
                            .example(String.valueOf(System.currentTimeMillis())));

                    // 3. 添加 X-Signature
                    operation.addParametersItem(new Parameter()
                            .name("X-Signature")
                            .description("签名 (MD5)")
                            .in("header")
                            .required(true)
                            .example("mock_signature")); // 测试时如果不校验签名逻辑，可填任意值

                    return operation;
                })
                // ----------------------------------------
                .build();
    }
}