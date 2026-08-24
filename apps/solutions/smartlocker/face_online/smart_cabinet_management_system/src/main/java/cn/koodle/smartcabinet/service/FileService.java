package cn.koodle.smartcabinet.service;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.lang.UUID;
import cn.hutool.crypto.digest.MD5;
import cn.koodle.smartcabinet.config.WebConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class FileService {
    @Value("${server.servlet.context-path:}")
    private String contextPath;

    /**
     * 上传文件并计算文件MD5
     * @return 包含 url 和 md5 的 Map
     */
    public Map<String, String> upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("上传文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String extName = FileUtil.extName(originalFilename);
        String newFileName = UUID.fastUUID() + "." + extName;
        String datePath = DateUtil.format(new Date(), "yyyy/MM/dd/");

        File destFile = new File(WebConfig.UPLOAD_FOLDER + datePath + newFileName);
        if (!destFile.getParentFile().exists()) {
            destFile.getParentFile().mkdirs();
        }

        try {
            file.transferTo(destFile);
        } catch (IOException e) {
            log.error("文件保存失败", e);
            throw new RuntimeException("文件上传失败");
        }

        // 1. 组装相对路径
        String url = normalizeContextPath() + WebConfig.ACCESS_PREFIX + datePath + newFileName;
        // 2. 计算真实物理文件的 MD5
        String fileMd5 = MD5.create().digestHex(destFile);

        Map<String, String> resultMap = new HashMap<>();
        resultMap.put("url", url);
        resultMap.put("md5", fileMd5);

        return resultMap;
    }

    private String normalizeContextPath() {
        if (contextPath == null || contextPath.isBlank() || "/".equals(contextPath)) {
            return "";
        }
        return contextPath.startsWith("/") ? contextPath : "/" + contextPath;
    }
}
