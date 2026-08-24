package d1.duoxian.mqttserver;


/**
 * @author Buter
 * date 2021/10/4 14:58
 */
public class CustomMqttPublishMessage {
    private String channelId;
    private String topic;
    private String content;

    public CustomMqttPublishMessage(String channelId, String topic, String content) {
        this.channelId = channelId;
        this.topic = topic;
        this.content = content;
    }

    public String getChannelId() {
        return channelId;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public boolean isEmpty() {
        return channelId == null || channelId.length() <= 0 || topic == null || topic.length() <= 0 || content == null || content.length() <= 0;
    }

    @Override
    public String toString() {
        String temp = content.length() < 300 ? content : (content.substring(0, 300) + "......");
        return "\n{\n" +
                //"channelId='" + channelId + '\'' +
                "   topic='" + topic + '\'' +
                ",\n   content='" + temp + '\'' +
                "\n}";
    }
}
