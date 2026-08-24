package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.UserGroupDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserGroupVO;
import cn.koodle.smartcabinet.service.UserGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@Tag(name = "人员分组管理")
@RestController
@RequestMapping("/admin/v1/user-group")
@RequiredArgsConstructor
public class UserGroupController {

    private final UserGroupService userGroupService;

    @Operation(summary = "获取分组树形列表", description = "包含递归人数统计")
    @GetMapping("/tree")
    public Result<List<UserGroupVO>> getTree() {
        return Result.success(userGroupService.getDepartmentTree());
    }

    @Operation(summary = "新增/修改分组")
    @PostMapping
    public Result<Boolean> save(@RequestBody UserGroupDTO dto) {
        boolean success = userGroupService.saveOrUpdateDept(dto);
        return success ? Result.success(true) : Result.failed("操作失败");
    }

    @Operation(summary = "删除分组", description = "如果包含子分组或人员则无法删除")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        userGroupService.remove(id);
        return Result.success(true);
    }

    @Operation(summary = "批量导入分组")
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public Result<Boolean> importExcel(@RequestPart("file") MultipartFile file) throws IOException {
        userGroupService.importDepartments(file);
        return Result.success(true);
    }

    @Operation(summary = "导出分组结构")
    @GetMapping("/export")
    public void exportExcel(HttpServletResponse response) throws IOException {
        userGroupService.exportDepartments(response);
    }
}