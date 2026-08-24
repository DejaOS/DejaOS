package cn.koodle.smartcabinet;

import cn.koodle.smartcabinet.service.AuthService;
import cn.koodle.smartcabinet.service.DeviceAdapterService;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@MapperScan("cn.koodle.smartcabinet.dao")
@SpringBootApplication
public class SmartCabinetApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartCabinetApplication.class, args);
    }

    // 启动后执行：检查并创建 admin
    @Bean
    public CommandLineRunner init(AuthService authService, DeviceAdapterService deviceAdapterService) {
        return args -> {
            authService.initAdminAccount();
            deviceAdapterService.initService();
        };
    }
}
