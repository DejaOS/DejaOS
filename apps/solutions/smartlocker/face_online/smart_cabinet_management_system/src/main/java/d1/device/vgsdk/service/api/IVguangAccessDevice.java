package d1.device.vgsdk.service.api;


import com.alibaba.fastjson2.JSONObject;

/**
 * 微光门禁设备特有的一下配置和功能
 *
 * @author liuyi
 */
public interface IVguangAccessDevice {

    /**
     * 发送指令
     * @param uuid      设备唯一标识  必填
     * @param topic     mqtt请求topic最后一个单词   必填
     * @param data      仅data数据体，不包含serialNo、uuid等外围字段  必填
     * @return 结果
     * @throws Exception    处理异常
     */
    String sendMessage(String uuid, String topic, JSONObject data) throws Exception;
}
