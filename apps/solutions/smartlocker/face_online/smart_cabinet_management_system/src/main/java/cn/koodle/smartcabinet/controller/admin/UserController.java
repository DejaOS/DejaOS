package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.model.admin.dto.UserDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserImportDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserVO;
import cn.koodle.smartcabinet.service.UserService;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Tag(name = "人员管理", description = "柜端人员信息维护")
@RestController
@RequestMapping("/admin/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "分页查询列表")
    @GetMapping("/page")
    public Result<IPage<UserVO>> getPage(@ParameterObject UserQueryDTO query) {
        return Result.success(userService.getPage(query));
    }

    @Operation(summary = "新增/修改柜端人员")
    @PostMapping
    public Result<Boolean> save(@RequestBody UserDTO dto) {
        boolean success = userService.saveOrUpdateUser(dto);
        return success ? Result.success(true) : Result.failed("操作失败");
    }

    @Operation(summary = "获取人员详情")
    @GetMapping("/{id}")
    public Result<UserVO> getDetail(@Parameter(description = "人员ID") @PathVariable Long id) {
        return Result.success(userService.getDetail(id));
    }

    @Operation(summary = "删除人员")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@Parameter(description = "人员ID") @PathVariable Long id) {
        boolean success = userService.remove(id);
        return success ? Result.success(true) : Result.failed("删除失败");
    }

    @Operation(summary = "批量导入人员", description = "上传 Excel 文件")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Boolean> importExcel(@RequestPart("file") MultipartFile file) {
        try {
            userService.importUser(file);
            return Result.success(true);
        } catch (IOException e) {
            return Result.failed("Excel 解析失败: " + e.getMessage());
        }
    }

    @Operation(summary = "下载导入模板")
    @GetMapping("/template")
    public void downloadTemplate(HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("人员导入模板", StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        List<UserImportDTO> list = new ArrayList<>();
        UserImportDTO demo = new UserImportDTO();
        demo.setUserId("EMP888");
        demo.setName("演示人员");
        demo.setGroupName("默认分组");
        demo.setPhone("13123456789");
        demo.setPin("123456");
        list.add(demo);

        EasyExcel.write(response.getOutputStream(), UserImportDTO.class).sheet("人员列表").doWrite(list);
    }
}
