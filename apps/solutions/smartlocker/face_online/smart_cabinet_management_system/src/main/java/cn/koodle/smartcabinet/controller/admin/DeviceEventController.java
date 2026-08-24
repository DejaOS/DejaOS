package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.DeviceEventQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceEventVO;
import cn.koodle.smartcabinet.service.DeviceEventService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "设备事件日志")
@RestController
@RequestMapping("/admin/v1/device-event")
@RequiredArgsConstructor
public class DeviceEventController {

    private final DeviceEventService deviceEventService;

    @Operation(summary = "分页查询事件列表")
    @GetMapping("/page")
    public Result<IPage<DeviceEventVO>> getPage(@ParameterObject DeviceEventQueryDTO query) {
        return Result.success(deviceEventService.getPage(query));
    }

    @Operation(summary = "查询事件详情")
    @GetMapping("/{id}")
    public Result<DeviceEventVO> getDetail(@Parameter(description = "ID") @PathVariable Long id) {
        return Result.success(deviceEventService.getDetail(id));
    }

    @Operation(summary = "删除事件")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@Parameter(description = "ID") @PathVariable Long id) {
        return Result.success(deviceEventService.removeById(id));
    }
}
