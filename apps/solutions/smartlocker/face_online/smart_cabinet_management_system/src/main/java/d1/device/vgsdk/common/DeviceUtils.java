package d1.device.vgsdk.common;

import com.alibaba.fastjson2.JSONObject;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Random;
import java.util.UUID;

/**
 * @author liuyi
 */
public class DeviceUtils {
    private static final Logger logger = LoggerFactory.getLogger(DeviceUtils.class);

    public static String generate32Id() {
        return UUID.randomUUID().toString().replace("-", "").toLowerCase();
    }

    /**
     * 根据特定的标识来获取这个标识对应的id值，这个id是递增的int类型,数据保存在/data/intid.json
     */
    private static final String INT_ID_FILE = "./data/intid.json";
    private static final Object INT_ID_LOCK = new Object();

    public static int generateIntId() {
        try {
            return generateIntId(null);
        } catch (IOException ignore) {
            logger.error("生成消息序列号失败：", ignore);
        }
        return new Random().nextInt();
    }

    public static int generateIntId(String key) throws IOException {
        synchronized (INT_ID_LOCK) {
            File file = new File(INT_ID_FILE);
            if (!file.exists()) {
                JSONObject init = new JSONObject();
                init.put("default", 0);
                FileUtils.writeStringToFile(file, init.toJSONString(), StandardCharsets.UTF_8);
            }
            String fileContent = FileUtils.readFileToString(file, StandardCharsets.UTF_8);
            JSONObject object;
            if (StringUtils.hasText(fileContent)) {
                object = JSONObject.parseObject(fileContent);
            } else {
                object = new JSONObject();
            }
            key = (key == null || key.length() == 0) ? "default" : key;
            int id = object.containsKey(key) ? object.getInteger(key) + 1 : 0;
            object.put(key, id);
            FileUtils.writeStringToFile(file, object.toJSONString(), StandardCharsets.UTF_8);
            return id;
        }
    }


    public static String hmacMd5(String secret, String data) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacMD5");
            Mac mac = Mac.getInstance("HmacMD5");
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder(32);
            for (byte b : rawHmac) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString(); // 小写十六进制，长度32
        } catch (Exception e) {
            throw new RuntimeException("HMAC-MD5 calculation failed", e);
        }
    }
}
