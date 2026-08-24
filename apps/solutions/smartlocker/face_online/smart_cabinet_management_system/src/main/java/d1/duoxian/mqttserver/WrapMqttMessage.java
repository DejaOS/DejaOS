package d1.duoxian.mqttserver;

import java.util.function.Function;

/**
 * 用于在队列里缓存的消息包裹类
 *
 * @author liuyi
 */
public class WrapMqttMessage extends CustomMqttPublishMessage {
    private String clientIp;
    private Function<CustomMqttPublishMessage, Boolean> publisher;

    public WrapMqttMessage(String clientIp, String channelId, String topic, String content, Function<CustomMqttPublishMessage, Boolean> publisher) {
        super(channelId, topic, content);
        this.clientIp = clientIp;
        this.publisher = publisher;
    }

    public String getClientIp() {
        return clientIp;
    }

    public void setClientIp(String clientIp) {
        this.clientIp = clientIp;
    }

    public Function<CustomMqttPublishMessage, Boolean> getPublisher() {
        return publisher;
    }

    public void setPublisher(Function<CustomMqttPublishMessage, Boolean> publisher) {
        this.publisher = publisher;
    }
}
