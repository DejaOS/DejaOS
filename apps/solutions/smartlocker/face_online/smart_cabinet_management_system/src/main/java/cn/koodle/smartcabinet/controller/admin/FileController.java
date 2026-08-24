package cn.koodle.smartcabinet.controller.admin;

import cn.koodle.smartcabinet.common.api.Result;
import cn.koodle.smartcabinet.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Tag(name = "文件服务")
@RestController
@RequestMapping("/admin/v1/file")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Operation(summary = "单文件上传", description = "上传成功后返回文件的访问 URL")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Map<String, String>> upload(@Parameter(description = "文件对象") @RequestPart("file") MultipartFile file) {
        Map<String, String> map = fileService.upload(file);
        map.put("name", file.getOriginalFilename());
        return Result.success(map);
    }
}