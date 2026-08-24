package d1.device.vgsdk.service.api;

/**
 * 如果设备是Mqtt协议，一些mqtt特有的设置
 *
 * @author liuyi
 */
public interface IDeviceMqtt {
    /**
     * 获取mqtt的端口
     *
     * @return mqtt当前监听的端口
     */
    int getMqttPort();

    /**
     * 应用端作为mqtt的服务端，有可能在连上后还可以修改为新的地址
     *
     * @param uuid 设备唯一标识 必填
     * @param url  mqtt服务端地址和端口 必填
     * @param name mqtt连接的用户名
     * @param pwd  mqtt连接的密码
     * @throws Exception uuid，url不能为空，设备离线等
     */
    void setMqttServerUrl(String uuid, String url, String name, String pwd) throws Exception;
}
