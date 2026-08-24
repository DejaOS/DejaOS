package cn.koodle.smartcabinet.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisConfig {

    @Value("${app.database.type:sqlite}")
    private String databaseType;

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(resolveDbType()));
        return interceptor;
    }

    private DbType resolveDbType() {
        if ("mysql".equalsIgnoreCase(databaseType == null ? "" : databaseType.trim())) {
            return DbType.MYSQL;
        }
        return DbType.SQLITE;
    }
}
