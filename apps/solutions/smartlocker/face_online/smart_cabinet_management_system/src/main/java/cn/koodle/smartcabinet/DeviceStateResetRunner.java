package cn.koodle.smartcabinet;

import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.service.DeviceService;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceStateResetRunner implements ApplicationRunner {

    private final DeviceService deviceService;

    @Override
    public void run(ApplicationArguments args) {
        log.info("系统启动中，正在重置所有设备的在线状态为离线(0)...");
        deviceService.update(new LambdaUpdateWrapper<Device>()
                .set(Device::getOnlineStatus, 0)
                .eq(Device::getOnlineStatus, 1)); // 只重置原来标为1的即可
        log.info("重置完成，等待设备自动重连...");
    }
}