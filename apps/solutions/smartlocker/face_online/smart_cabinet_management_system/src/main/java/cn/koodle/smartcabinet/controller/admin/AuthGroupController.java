package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupAssignDTO;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupDTO;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.AuthGroupVO;
import cn.koodle.smartcabinet.service.AuthGroupService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "权限管理")
@RestController
@RequestMapping("/admin/v1/auth-group")
@RequiredArgsConstructor
public class AuthGroupController {

    private final AuthGroupService authGroupService;

    @Operation(summary = "分页查询权限组")
    @GetMapping("/page")
    public Result<IPage<AuthGroupVO>> getPage(AuthGroupQueryDTO query) {
        return Result.success(authGroupService.getPageVO(query));
    }

    @Operation(summary = "新增/修改权限组")
    @PostMapping
    public Result<Boolean> save(@RequestBody AuthGroupDTO dto) {
        boolean success = authGroupService.saveOrUpdateGroup(dto);
        return success ? Result.success(true) : Result.failed("操作失败");
    }

    @Operation(summary = "删除权限组")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        boolean success = authGroupService.removeGroup(id);
        return success ? Result.success(true) : Result.failed("删除失败");
    }

    // --- 关联操作 ---

    @Operation(summary = "分配人员-保存", description = "传入组ID和选中的用户ID列表(全量覆盖)")
    @PostMapping("/assign/users")
    public Result<Boolean> assignUsers(@RequestBody AuthGroupAssignDTO dto) {
        authGroupService.assignUsers(dto);
        return Result.success(true);
    }

    @Operation(summary = "分配人员-获取已选ID", description = "用于穿梭框回显")
    @GetMapping("/{id}/users")
    public Result<List<Long>> getAssignedEmployees(@PathVariable Long id) {
        return Result.success(authGroupService.getAssociatedEmployeeIds(id));
    }

    @Operation(summary = "分配设备-保存", description = "传入组ID和选中的设备ID列表(全量覆盖)")
    @PostMapping("/assign/devices")
    public Result<Boolean> assignDevices(@RequestBody AuthGroupAssignDTO dto) {
        authGroupService.assignDevices(dto);
        return Result.success(true);
    }

    @Operation(summary = "分配设备-获取已选ID")
    @GetMapping("/{id}/devices")
    public Result<List<Long>> getAssignedDevices(@PathVariable Long id) {
        return Result.success(authGroupService.getAssociatedDeviceIds(id));
    }
}