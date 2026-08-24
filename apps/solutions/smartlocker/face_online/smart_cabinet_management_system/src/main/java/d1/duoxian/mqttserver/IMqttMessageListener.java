package d1.duoxian.mqttserver;

import java.util.function.Function;

/**
 * @author Buter
 * date 2021/10/4 9:58
 */
public interface IMqttMessageListener {
    /**
     * 设备离线后触发，请不要在这个函数里添加耗时操作
     */
    void offline(String uuid, ClientSession clientSession);

    /**
     * 接收到客户端返回的消息后触发，请不要在这个函数里添加耗时操作
     *
     * @param ip        客户端的ip地址
     * @param channelId 通道id
     * @param topic     消息TOPIC
     * @param message   消息正文，已转换成字符串
     * @param publisher 回调函数，要返回给客户端的topic和内容
     */
    void onMessage(String ip, String channelId, String topic, String message, Function<CustomMqttPublishMessage, Boolean> publisher);

    /**
     * 设备上线后触发，请不要在这个函数里添加耗时操作
     *
     * @param uuid 链接的设备的uuid
     */
    void online(String uuid, ClientSession clientSession);

    /**
     * 某些特定设备的uuid并不是mqtt的clientId，需要做额外的处理
     * 请不要在这个函数里添加耗时操作
     *
     * @param clientId mqtt client的唯一标识
     * @return 根据clientId返回对应的uuid，绝大部分情况是相等
     */
    String clientIdToUuid(String clientId);
}

