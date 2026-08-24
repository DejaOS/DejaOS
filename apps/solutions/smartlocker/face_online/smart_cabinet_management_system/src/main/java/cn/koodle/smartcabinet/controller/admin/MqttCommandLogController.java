package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.MqttCommandLogQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.MqttCommandLogVO;
import cn.koodle.smartcabinet.service.MqttCommandLogService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "MQTT 记录")
@RestController
@RequestMapping("/admin/v1/mqtt-command-log")
@RequiredArgsConstructor
public class MqttCommandLogController {

    private final MqttCommandLogService mqttCommandLogService;

    @Operation(summary = "分页查询 MQTT 记录")
    @GetMapping("/page")
    public Result<IPage<MqttCommandLogVO>> getPage(MqttCommandLogQueryDTO query) {
        return Result.success(mqttCommandLogService.getPage(query));
    }

    @Operation(summary = "MQTT 详情")
    @GetMapping("/{id}")
    public Result<MqttCommandLogVO> getDetail(@PathVariable Long id) {
        return Result.success(mqttCommandLogService.getDetail(id));
    }

    @Operation(summary = "删除 MQTT 记录")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.success(mqttCommandLogService.removeById(id));
    }
}
