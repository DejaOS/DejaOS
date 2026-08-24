package d1.duoxian.mqttserver;

import java.util.Calendar;
import java.util.function.Function;

/**
 * 设备连接上后保存相应的session，统一由DeviceSessionManager管理
 *
 * @author Buter
 * date 2021/10/5 20:22
 */
public class ClientSession {
    /**
     * mqtt连接的用户名
     */
    private String username;
    /**
     * mqtt连接的密码
     */
    private byte[] password;
    /**
     * mqtt连接的ip
     */
    private String ip;
    /**
     * 设备唯一标识
     */
    private String uuid;
    /**
     * 设备对应的通信通道id
     */
    private String channelId;

    /**
     * 给设备发送消息的回调函数
     */
    private Function<CustomMqttPublishMessage, Boolean> publisher;

    /**
     * 设备最后刷新时间，也就是最后一次给paas发送数据的时间
     */
    private Calendar refreshTime;
    /**
     * 一些额外的数据，用于扩展
     */
    private Object data;

    public ClientSession(String ip, String uuid, String channelId, Function<CustomMqttPublishMessage, Boolean> publisher, String username, byte[] password) {
        this.uuid = uuid;
        this.ip = ip;
        this.channelId = channelId;
        this.publisher = publisher;
        this.username = username;
        this.password = password;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public byte[] getPassword() {
        return password;
    }

    public void setPassword(byte[] password) {
        this.password = password;
    }

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public Calendar getRefreshTime() {
        return refreshTime;
    }

    public void setRefreshTime(Calendar refreshTime) {
        this.refreshTime = refreshTime;
    }

    public String getChannelId() {
        return channelId;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public Function<CustomMqttPublishMessage, Boolean> getPublisher() {
        return publisher;
    }

    public void setPublisher(Function<CustomMqttPublishMessage, Boolean> publisher) {
        this.publisher = publisher;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    @Override
    public String toString() {
        return "DeviceSession{" +
                "uuid='" + uuid + '\'' +
                ", channelId='" + channelId + '\'' +
                ", publisher=" + publisher +
                ", refreshTime=" + refreshTime +
                '}';
    }
}
