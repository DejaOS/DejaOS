package d1.duoxian.mqttserver;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Calendar;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * 保存设备相关所有实时信息，都存在内存中
 *
 * @author Buter
 * date 2021/10/5 19:36
 */
public class ClientSessionManager {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final Map<String, ClientSession> clientsMap = new ConcurrentHashMap<>();
    private IMqttMessageListener listener;
    /**
     * 以通道id为key，和devicesMap重复存储
     */
    private final Map<String, ClientSession> channelsMap = new ConcurrentHashMap<>();

    public ClientSession getSessionByUuid(String uuid) {
        return clientsMap.get(uuid);
    }

    public Map<String, ClientSession> getClientsMap() {
        return clientsMap;
    }

    public Map<String, ClientSession> getChannelsMap() {
        return channelsMap;
    }

    /**
     * 设备离线后删除session
     */
    public synchronized void offline(String channelId) {
        ClientSession session = channelsMap.get(channelId);
        if (session != null) {
            String uuid = session.getUuid();
            logger.info("device offline,channelId={},uuid={}", channelId, uuid);
            clientsMap.remove(uuid);
            channelsMap.remove(channelId);
            this.listener.offline(uuid, session);
        } else {
            //设备强行断开会触发2次offline，一次是异常触发，一次是trigger触发，还有一种情况是有可能是设备拔下马上插上，重连了，新的channelid起作用，旧的被移除
            //do nothing
        }
    }

    /**
     * 接收到客户端返回的数据说明设备在线，刷新一下session
     */
    public synchronized void online(String ip, String channelId, Function<CustomMqttPublishMessage, Boolean> publisher, String uuid, String username, byte[] password) {
        ClientSession session = clientsMap.get(uuid);
        if (session == null) {
            logger.info("device online,channelId={},uuid={}", channelId, uuid);
            session = new ClientSession(ip, uuid, channelId, publisher, username, password);
            clientsMap.put(uuid, session);
            channelsMap.put(channelId, session);
        } else {
            logger.info("device online,new channelId={},uuid={}", channelId, session.getUuid());
            if (!channelsMap.containsKey(channelId)) {
                String oldChannelId = session.getChannelId();
                if (oldChannelId != null && oldChannelId.length() > 0 && !oldChannelId.equals(channelId)) {
                    //假如设备来了一个新的链接，而且发现有旧的链接，说明旧的链接一会儿会失效，提前remove掉
                    channelsMap.remove(session.getChannelId());
                }
                channelsMap.put(channelId, session);
            }
            session.setPublisher(publisher);
            session.setRefreshTime(Calendar.getInstance());
            session.setChannelId(channelId);
            session.setUsername(username);
            session.setPassword(password);
        }
        this.listener.online(uuid,session);
    }

    public void setListener(IMqttMessageListener listener) {
        this.listener = listener;
    }
}
