package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.entity.Locker;
import cn.koodle.smartcabinet.model.admin.dto.LockerBasicUpdateDTO;
import cn.koodle.smartcabinet.model.admin.dto.LockerBindUserDTO;
import cn.koodle.smartcabinet.model.admin.dto.LockerControlDTO;
import cn.koodle.smartcabinet.model.admin.dto.LockerStatusUpdateDTO;
import cn.koodle.smartcabinet.service.LockerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "管理端-柜格管理")
@RestController
@RequestMapping("/admin/v1/locker")
@RequiredArgsConstructor
public class LockerController {

    private final LockerService lockerService;

    @Operation(summary = "获取柜格列表")
    @GetMapping("/list")
    public Result<List<Locker>> list(@RequestParam(required = false) Long deviceId) {
        return Result.success(lockerService.getByDeviceId(deviceId));
    }

    @Operation(summary = "绑定/解绑用户")
    @PostMapping("/bindUser")
    public Result<Void> bindUser(@RequestBody @Valid LockerBindUserDTO bindDTO) {
        lockerService.bindOrUnbindUser(bindDTO);
        return Result.success();
    }

    @Operation(summary = "转为临时柜")
    @PostMapping("/convertTemp")
    public Result<Void> convertTemp(@RequestBody @Valid LockerControlDTO controlDTO) {
        lockerService.convertToTemp(controlDTO.getId());
        return Result.success();
    }

    @Operation(summary = "更新柜格基础信息")
    @PostMapping("/updateBasic")
    public Result<Void> updateBasic(@RequestBody LockerBasicUpdateDTO updateDTO) {
        lockerService.updateBasic(updateDTO);
        return Result.success();
    }

    @Operation(summary = "更新柜格状态")
    @PostMapping("/updateStatus")
    public Result<Void> updateStatus(@RequestBody LockerStatusUpdateDTO updateDTO) {
        lockerService.updateStatus(updateDTO);
        return Result.success();
    }

    @Operation(summary = "同步设备柜格")
    @PostMapping("/syncDevice")
    public Result<Void> syncDevice(@RequestBody Map<String, Long> body) {
        lockerService.fullSyncLockerModelToDevice(body == null ? null : body.get("deviceId"));
        return Result.success();
    }

    @Operation(summary = "从设备刷新柜格状态")
    @PostMapping("/refreshDevice")
    public Result<Integer> refreshDevice(@RequestBody Map<String, Long> body) {
        return Result.success(lockerService.refreshRuntimeFromDevice(body == null ? null : body.get("deviceId")));
    }

    @Operation(summary = "远程开柜")
    @PostMapping("/remoteOpen")
    public Result<Void> remoteOpen(@RequestBody @Valid LockerControlDTO controlDTO) {
        lockerService.remoteControl(controlDTO.getId(), 1);
        return Result.success();
    }

    @Operation(summary = "远程释放柜格")
    @PostMapping("/remoteRelease")
    public Result<Void> remoteRelease(@RequestBody @Valid LockerControlDTO controlDTO) {
        lockerService.remoteControl(controlDTO.getId(), 2);
        return Result.success();
    }
}
