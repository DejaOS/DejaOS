package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.DeviceChannelDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceChannelQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceChannelVO;
import cn.koodle.smartcabinet.service.DeviceChannelService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

@Tag(name = "柜组管理")
@RestController
@RequestMapping("/admin/v1/device-channel")
@RequiredArgsConstructor
public class DeviceChannelController {

    private final DeviceChannelService deviceChannelService;

    @Operation(summary = "分页查询")
    @GetMapping("/page")
    public Result<IPage<DeviceChannelVO>> getPage(@ParameterObject DeviceChannelQueryDTO query) {
        return Result.success(deviceChannelService.getPageVO(query));
    }

    @Operation(summary = "新增/修改柜组")
    @PostMapping
    public Result<Boolean> save(@RequestBody DeviceChannelDTO dto) {
        deviceChannelService.saveOrUpdateChannel(dto);
        return Result.success(true);
    }

    @Operation(summary = "获取详情")
    @GetMapping("/{id}")
    public Result<DeviceChannelVO> getDetail(@Parameter(description = "ID") @PathVariable Long id) {
        return Result.success(deviceChannelService.getDetail(id));
    }

    @Operation(summary = "删除柜组")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@Parameter(description = "ID") @PathVariable Long id, @Parameter(description = "DeviceId") @RequestParam Long deviceId) {
        deviceChannelService.delete(id, deviceId);
        return Result.success(true);
    }
}
