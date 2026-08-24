package d1.device.vgsdk.service.base;

import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.common.DeviceException;
import d1.device.vgsdk.model.*;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import d1.duoxian.mqttserver.*;
import io.netty.util.internal.StringUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.function.Function;

/**
 * 启动一个mqtt server负责和设备通信,这个是基类
 *
 * @author liuyi
 */
public abstract class AbstractMqttService implements IMqttMessageListener {
    /**
     * 回调后缀
     */
    protected static final String REPLY_FLAG = "_reply";
    private static final Logger logger = LoggerFactory.getLogger(AbstractMqttService.class);
    /**
     * 消息发送后会存入这个队列中，方便检查设备回复是否超时
     */
    protected final Map<String, MqttPublishedMessage> messageMap = new ConcurrentHashMap<>();
    /**
     * 端口
     */
    protected final int port;
    /**
     * 协议
     */
    protected final String protocol;
    /**
     * mqtt服务
     */
    protected MqttServerService mqttServerService;
    /**
     * 设备上报处理
     */
    protected IAccessDeviceEventHandler handler;
    /**
     * 告警记录处理
     */
    protected BaseAlarmRecordService alarmService;
    /**
     * 通行记录处理
     */
    protected BaseAccessRecordService accessRecordService;

    /**
     * 构造函数
     *
     * @param port                端口
     * @param alarmService        告警服务
     * @param accessRecordService 通行记录
     * @param protocol            协议
     */
    public AbstractMqttService(int port, BaseAlarmRecordService alarmService, BaseAccessRecordService accessRecordService, String protocol) {
        this.port = port;
        this.protocol = protocol;
        this.alarmService = alarmService;
        this.accessRecordService = accessRecordService;
    }

    /**
     * 初始化
     *
     * @param threadPool          线程池
     * @param handler             通行记录处理
     * @param iMqttVerifyListener mqtt校验
     */
    protected void init(ExecutorService threadPool, IAccessDeviceEventHandler handler, IMqttVerifyListener iMqttVerifyListener) {
        this.handler = handler;
        this.mqttServerService = new MqttServerService();
        if (threadPool != null) {
            threadPool.execute(() -> mqttServerService.startup(port, 90, 10485760, this, 0, 0, iMqttVerifyListener));
            threadPool.execute(checkRunnable());
        } else {
            new Thread(() -> mqttServerService.startup(port, 90, 10485760, this, 0, 0, iMqttVerifyListener)).start();
            new Thread(checkRunnable()).start();
        }
    }

    /**
     * 结束
     */
    public void destroy() {
        mqttServerService.close();
    }

    /**
     * 查询所有在线设备
     *
     * @return 设备信息列表
     */
    public List<AccessDevice> findDeviceAll() {
        Map<String, ClientSession> clients = mqttServerService.getClientSessionManager().getClientsMap();
        //获取所有在线客户端列表
        if (clients.isEmpty()) {
            return null;
        }
        ArrayList<AccessDevice> deviceList = new ArrayList<>();
        clients.forEach((key, value) -> deviceList.add(new AccessDevice(value.getUuid(), value.getIp())));
        return deviceList;
    }

    /**
     * 判断是否离线
     *
     * @param uuid 设备uuid
     * @return 结果 ture在线false离线
     */
    public boolean isOnline(String uuid) {
        Map<String, ClientSession> clients = mqttServerService.getClientSessionManager().getClientsMap();
        //获取所有在线客户端列表
        if (clients.isEmpty() || StringUtil.isNullOrEmpty(uuid)) {
            return false;
        }
        return clients.containsKey(uuid);
    }

    @Override
    public void online(String uuid, ClientSession clientSession) {
        alarmService.add(new AlarmRecord(uuid, AlarmRecord.TYPE_ONLINE, "1", System.currentTimeMillis()));
    }

    @Override
    public void offline(String uuid, ClientSession clientSession) {
        alarmService.add(new AlarmRecord(uuid, AlarmRecord.TYPE_OFFLINE, "0", System.currentTimeMillis()));
    }

    @Override
    public String clientIdToUuid(String clientId) {
        if (StringUtil.isNullOrEmpty(clientId)) {
            logger.error("wrong client id which is null or empty");
            return "";
        }
        if (clientId.length() <= 4) {
            logger.error("wrong client id which length<=4:" + clientId);
            return clientId;
        }
        return clientId;
    }

    /**
     * 查询指定在线设备
     *
     * @param uuid 设备唯一标识
     * @return 设备信息
     */
    public AccessDevice findDevice(String uuid) {
        Map<String, ClientSession> clients = mqttServerService.getClientSessionManager().getClientsMap();
        //获取所有在线客户端列表
        if (clients.isEmpty() || StringUtil.isNullOrEmpty(uuid)) {
            return null;
        }
        ClientSession clientSession = clients.get(uuid);
        if (clientSession == null) {
            return null;
        }
        return new AccessDevice(clientSession.getUuid(), clientSession.getIp());
    }

    /**
     * 发送消息
     *
     * @param uuid     设备uuid
     * @param topic    mqttTopic
     * @param content  mqtt内容
     * @param serialNo 消息序列号
     * @return 结果
     * @throws Exception 异常
     */
    protected MqttPublishedMessage send(String uuid, String topic, String content, String serialNo) throws Exception {
        ClientSession session = this.mqttServerService.getClientSessionManager().getSessionByUuid(uuid);
        if (session == null) {
            logger.error("device sn ={} offline,publish failed mqtt message", uuid);
            throw new DeviceException("device offline,publish failed mqtt message", "device offline,publish failed mqtt message");
        }
        //存储发送的消息
        MqttPublishedMessage message = new MqttPublishedMessage(uuid, topic, serialNo);
        messageMap.put(serialNo, message);

        logger.info("发送mqtt指令 topic：{}", topic);
        String logContent = content.length() > 1000 ? content.substring(0, 1000) : content;
        logger.info("发送mqtt指令 content：{}", logContent);
        if (!publish(session.getChannelId(), session.getPublisher(), topic, content)) {
            logger.error("device sn ={} publish message to device failed", uuid);
            throw new DeviceException("publish message to device failed", "publish message to device failed");
        } else {
            logger.info("publish message to device success,uuid={} ,topic={} ,content={} ,serialNo={}", uuid, topic, logContent, serialNo);
        }
        return message;
    }

    /**
     * 给客户端发送数据，顺便存到数据库（异步）,
     * 收到设备的主动汇报指令后需要返回相应指令，这个不需要记录到相关日志里，只有本地文件日志
     *
     * @param channelId mqtt通道id
     * @param publisher 发送体
     * @param topic     mqtt主题
     * @param content   mqtt内容
     * @return 结果
     */
    protected boolean publish(String channelId, Function<CustomMqttPublishMessage, Boolean> publisher, String topic, String content) {
        CustomMqttPublishMessage message = new CustomMqttPublishMessage(channelId, topic, content);
        return publisher.apply(message);
    }

    /**
     * 每隔5分钟清空一下消息
     *
     * @return 结果
     */
    protected Runnable checkRunnable() {
        return () -> {
            while (true) {
                try {
                    Thread.sleep(5 * 60 * 1000);

                    Iterator<String> iterator = messageMap.keySet().iterator();
                    while (iterator.hasNext()) {
                        String serialNo = iterator.next();
                        MqttPublishedMessage message = messageMap.get(serialNo);
                        if (message == null || message.getTime() == null) {
                            iterator.remove();
                            continue;
                        }
                        //检查是否超时，超时移除队列
                        if (System.currentTimeMillis() - message.getTime() >= 5 * 60 * 1000) {
                            iterator.remove();
                        }
                    }
                } catch (Exception e) {
                    logger.error("check timeout thread error", e);
                }
            }
        };
    }

    //------action-----------------------------------------------------------------------------

    /**
     * 发送指令
     *
     * @param uuid  设备uuid
     * @param topic 指令topic
     * @param data  消息体
     * @return 结果
     * @throws Exception 异常
     */
    public abstract MqttPublishedMessage sendMessage(String uuid, String topic, JSONObject data) throws Exception;

    /**
     * 配置查询
     *
     * @param serialNo 消息序列号
     * @param uuid     设备uuid
     * @param key      某一个字段
     * @return 结果
     * @throws Exception 异常
     */
    public abstract MqttPublishedMessage getConfig(String serialNo, String uuid, String key, JSONObject signConfig) throws Exception;


    /**
     * 配置修改
     *
     * @param serialNo 消息序列号
     * @param uuid     设备地址uuid
     * @param config   配置体
     * @return 结果
     * @throws Exception 异常
     */
    public abstract MqttPublishedMessage setConfig(String serialNo, String uuid, String config, JSONObject signConfig) throws Exception;

    /**
     * 固件升级
     *
     * @param serialNo 消息序列号
     * @param uuid     设备地址uuid
     * @param firmware 固件体
     * @return 结果
     * @throws Exception 异常
     */
    public abstract MqttPublishedMessage upgradeFirmware(String serialNo, String uuid, FirmwarePackage firmware, JSONObject signConfig) throws Exception;

    /**
     * 控制设备
     *
     * @param serialNo 消息序列号
     * @param uuid     设备uuid
     * @param command  类型
     * @param extra    数据
     * @return 结果
     * @throws Exception 异常
     */
    public abstract MqttPublishedMessage control(String serialNo, String uuid, int command, JSONObject extra, JSONObject signConfig) throws Exception;

    public abstract MqttPublishedMessage getUser(String uuid, int page, int size, JSONObject signConfig) throws Exception;

    public abstract MqttPublishedMessage insertUser(String uuid, List<? extends User> users, JSONObject signConfig) throws Exception;

    public abstract MqttPublishedMessage delUser(String uuid, List<String> userIds, JSONObject signConfig) throws Exception;

    public abstract MqttPublishedMessage clearUser(String uuid, JSONObject signConfig) throws Exception;


}

