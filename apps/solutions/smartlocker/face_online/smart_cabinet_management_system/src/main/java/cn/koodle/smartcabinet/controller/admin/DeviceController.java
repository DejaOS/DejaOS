package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.model.admin.dto.DeviceDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceImportDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceStatsVO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceVO;
import cn.koodle.smartcabinet.service.DeviceService;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

@Tag(name = "设备管理")
@RestController
@RequestMapping("/admin/v1/device")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @Operation(summary = "获取顶部统计卡片", description = "返回设备总数、在线状态和柜格使用统计")
    @GetMapping("/stats")
    public Result<DeviceStatsVO> getStats() {
        return Result.success(deviceService.getStats());
    }

    @Operation(summary = "分页查询设备列表")
    @GetMapping("/page")
    public Result<IPage<DeviceVO>> getPage(DeviceQueryDTO query) {
        return Result.success(deviceService.getPage(query));
    }

    @Operation(summary = "获取所有设备列表")
    @GetMapping("/list")
    public Result<List<Device>> list() {
        return Result.success(deviceService.getList());
    }

    @Operation(summary = "新增/修改设备")
    @PostMapping
    public Result<Boolean> save(@RequestBody DeviceDTO dto) {
        boolean success = deviceService.saveOrUpdateDevice(dto);
        return success ? Result.success(true) : Result.failed("操作失败");
    }

    @Operation(summary = "删除设备")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        boolean success = deviceService.remove(id);
        return success ? Result.success(true) : Result.failed("删除失败");
    }

    @Operation(summary = "批量导入设备")
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public Result<Boolean> importExcel(@RequestPart("file") MultipartFile file) throws IOException {
        deviceService.importDevices(file);
        return Result.success(true);
    }

    @Operation(summary = "下载设备导入模板")
    @GetMapping("/template")
    public void downloadTemplate(HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("设备导入模板", StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        DeviceImportDTO demo = new DeviceImportDTO();
        demo.setDeviceNo("000000");
        demo.setDeviceName("测试设备");
        demo.setIpAddress("192.168.1.100");
        demo.setVersion("1.0.2");
        demo.setRemark("请填写设备 SN");

        EasyExcel.write(response.getOutputStream(), DeviceImportDTO.class)
                .sheet("设备列表")
                .doWrite(Collections.singletonList(demo));
    }
}
