package d1.device.vgsdk.service.base;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.common.DeviceException;
import d1.device.vgsdk.common.DeviceUtils;
import d1.device.vgsdk.model.*;
import d1.device.vgsdk.service.IManagerService;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import d1.duoxian.mqttserver.IMqttVerifyListener;
import io.netty.util.internal.StringUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.ExecutorService;

/**
 * 多种设备的DeviceManagerService的基类
 *
 * @author liuyi
 */
public abstract class AbstractManagerService implements IManagerService {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    /**
     * 端口
     */
    protected int port = 0;

    /**
     * 初始化状态标记
     */
    protected boolean initStatus;

    /**
     * 通行记录服务
     */
    protected BaseAccessRecordService accessRecordService;

    /**
     * mqtt服务
     */
    protected AbstractMqttService mqttService;

    /**
     * 告警记录的服务
     */
    protected BaseAlarmRecordService alarmService;

    /**
     * 子类必须把 accessRecordService，alarmService，mqttService，devicesShadow赋值过来
     *
     * @param port 端口
     * @throws Exception 错误
     */
    protected abstract void initService(int port) throws Exception;

    /**
     * 启动SDK服务实例
     *
     * @param port       监听的端口，绝大部分sdk需要，可以为空
     * @param handler    处理上报的数据，不能为空
     * @param threadPool 线程池实例，可以为空
     * @throws Exception 启动错误
     */
    @Override
    public void startup(int port, IAccessDeviceEventHandler handler, ExecutorService threadPool, IMqttVerifyListener iMqttVerifyListener) throws Exception {
        //通过 initStatus 限制多次init
        if (!initStatus) {
            this.port = port;
            initService(port);
            //2. 启动轮询线程，处理通行事件和告警事件
            accessRecordService.init(threadPool, handler);
            alarmService.init(threadPool, handler);
            //3. 启动mqtt server监听端口，让设备连上来
            mqttService.init(threadPool, handler, iMqttVerifyListener);
            //4. 注册服务
            initStatus = true;
        }
    }

    @Override
    public int getMqttPort() {
        return this.port;
    }

    @Override
    public boolean isOnline(String uuid) {
        return mqttService.isOnline(uuid);
    }

    @Override
    public AccessDevice find(String uuid) {
        return mqttService.findDevice(uuid);
    }

    @Override
    public List<AccessDevice> findAll() {
        return mqttService.findDeviceAll();
    }

    @Override
    public String getConfig(String uuid, String key, JSONObject signConfig) throws Exception {
        logger.info("配置查询，uuid：{}，key：{}", uuid, key);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.getConfig(DeviceUtils.generateIntId() + "", uuid, key, signConfig);
        synchronized (message) {
            message.wait(10000);
        }
        message.checkResult(message, "配置查询", "get config");
        return message.getData();
    }

    @Override
    public void setConfig(String uuid, String configs, JSONObject signConfig) throws Exception {
        logger.info("配置修改，uuid：{}，configs：{}", uuid, configs);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.setConfig(DeviceUtils.generateIntId() + "", uuid, configs, signConfig);
        synchronized (message) {
            message.wait(4000);
        }
        message.checkResult(message, "配置修改", "set config");

    }

    @Override
    public void upgradeFirmware(String uuid, FirmwarePackage firmware, JSONObject signConfig) throws Exception {
        logger.info("固件升级，uuid：{}，firmware：{}", uuid, firmware);
        checkDeviceStatus(uuid);
        if (StringUtil.isNullOrEmpty(firmware.getUrl()) || StringUtil.isNullOrEmpty(firmware.getMd5())) {
            throw new DeviceException("下载URL和md5值都不能为空", "");
        }
        MqttPublishedMessage message = mqttService.upgradeFirmware(DeviceUtils.generateIntId() + "", uuid, firmware, signConfig);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "固件升级", "upgrade firmware");
    }

    @Override
    public void control(String uuid, String index, int command, JSONObject extra, JSONObject signConfig) throws Exception {
        logger.info("远程控制，uuid：{}，index:{}，command:{}", uuid, index, command);
        checkDeviceStatus(uuid);
        JSONObject extraObj = null;
        MqttPublishedMessage message = mqttService.control(DeviceUtils.generateIntId() + "", uuid, command, extra, signConfig);
        synchronized (message) {
            message.wait(3000);
        }
        message.checkResult(message, "远程开门", "device open door");
    }


    @Override
    public void restart(String uuid, String index, JSONObject signConfig) throws Exception {
        logger.info("设备重启，uuid：{}，index:{}", uuid, index);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.control(DeviceUtils.generateIntId() + "", uuid, 0, null, signConfig);
        synchronized (message) {
            message.wait(3000);
        }
        message.checkResult(message, "设备重启", "device restart");
    }

    @Override
    public void reset(String uuid, String index, JSONObject signConfig) throws Exception {
        logger.info("设备重置，uuid：{}，index:{}", uuid, index);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.control(DeviceUtils.generateIntId() + "", uuid, 4, null, signConfig);
        synchronized (message) {
            message.wait(3000);
        }
        message.checkResult(message, "设备重启", "device reset");
    }

    /**
     * 发送指令
     *
     * @param uuid  设备唯一标识  必填
     * @param topic mqtt请求topic最后一个单词   必填
     * @param data  仅data数据体，不包含serialNo、uuid等外围字段  必填
     * @throws Exception 处理异常
     */
    @Override
    public String sendMessage(String uuid, String topic, JSONObject data) throws Exception {
        logger.info("发送指令:" + uuid);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.sendMessage(uuid, topic, data);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "发送指令", "Send instruction");
        return message.getData();
    }

    @Override
    public void offFireAlarm(String uuid, JSONObject signConfig) throws Exception {
        logger.info("解除火警:" + uuid);
    }

    @Override
    public void setNetwork(String uuid, NetworkConfiguration network, JSONObject signConfig) throws Exception {
        logger.info("设置设备网络及mqtt，uuid：{}，network：{}", uuid, network);
    }

    @Override
    public void setMqttServerUrl(String uuid, String url, String name, String pwd) throws Exception {
        logger.info("设置mqtt，uuid：{}，url：{}", uuid, url);
    }

    //******用户接口****************************************

    @Override
    public UserPage getUser(String uuid, String index, int page, int size, JSONObject signConfig) throws Exception {
        logger.info("查询人员mqtt，uuid：{}，index：{}，page：{}，size：{}", uuid, index, page, size);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.getUser(uuid, page, size, signConfig);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "查询人员", "insertUser");

        JSONObject messageObj = JSONObject.parseObject(message.getData());
        if (!messageObj.containsKey("data")) {
            return new UserPage();
        }
        String messageData = messageObj.getString("data");
        return JSON.parseObject(messageData, UserPage.class);
    }

    @Override
    public void insertUser(String uuid, String index, List<? extends User> users, JSONObject signConfig) throws Exception {
        logger.info("添加人员mqtt，uuid：{}，users：{}", uuid, JSON.toJSONString(users));
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.insertUser(uuid, users, signConfig);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "添加人员", "insertUser");
    }

    @Override
    public void delUser(String uuid, String index, List<String> userIds, JSONObject signConfig) throws Exception {
        logger.info("删除人员mqtt，uuid：{}，userIds：{}", uuid, userIds);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.delUser(uuid, userIds, signConfig);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "删除人员", "delUser");

    }

    @Override
    public void clearUser(String uuid, String index, JSONObject signConfig) throws Exception {
        logger.info("清空人员mqtt，uuid：{}", uuid);
        checkDeviceStatus(uuid);
        MqttPublishedMessage message = mqttService.clearUser(uuid, signConfig);
        synchronized (message) {
            message.wait(20000);
        }
        message.checkResult(message, "清空人员", "clearUser");
    }

    //------------private-------------------------------------

    /**
     * 校验设备状态
     *
     * @param uuid 设备唯一标识
     * @throws DeviceException 异常
     */
    protected void checkDeviceStatus(String uuid) throws DeviceException {
        if (StringUtil.isNullOrEmpty(uuid)) {
            throw new DeviceException("The device uuid cannot be empty(设备uuid不能为空)", "The device uuid cannot be empty(设备uuid不能为空)");
        }
        if (!isOnline(uuid)) {
            throw new DeviceException("The device is offline or not found(设备离线或未找到)", "The device is offline or not found(设备离线或未找到)");
        }
    }

    /**
     * 校验设置设备网络及mqtt参数,
     *
     * @param body 网络配置参数体
     * @throws Exception 异常
     */
    protected void checkConfigNetInfo(NetworkConfiguration body) throws Exception {
        if (body.getType() == 1 && (StringUtil.isNullOrEmpty(body.getSsid()) || StringUtil.isNullOrEmpty(body.getPassword()))) {
            throw new DeviceException("网络类型为wifi的时候，ssid和密码都不能为空", "When the network type is wifi, the ssid and password cannot be empty");
        }
        if (body.getDhcp() == 1) {
            return;
        }
        //当动态主机配置协议不空时,校验对应内容
        if (StringUtil.isNullOrEmpty(body.getIp()) || StringUtil.isNullOrEmpty(body.getGateway()) || StringUtil.isNullOrEmpty(body.getDns()) || StringUtil.isNullOrEmpty(body.getMask())) {
            throw new DeviceException("静态配置的时候,ip、网关、dns、子网掩码都不能为空", "In static configuration, the ip address, gateway, dns, and subnet mask cannot be empty");
        }
    }

}
