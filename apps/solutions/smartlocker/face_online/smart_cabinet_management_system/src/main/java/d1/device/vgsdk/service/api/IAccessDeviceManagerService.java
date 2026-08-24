package d1.device.vgsdk.service.api;

import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.model.AccessDevice;
import d1.device.vgsdk.model.FirmwarePackage;
import d1.device.vgsdk.model.NetworkConfiguration;
import d1.duoxian.mqttserver.IMqttVerifyListener;

import java.util.List;
import java.util.concurrent.ExecutorService;

/**
 * 门禁设备特有的多设备管理服务接口
 *
 * @author liuyi
 */
public interface IAccessDeviceManagerService {
    /**
     * 启动SDK服务实例
     *
     * @param port                监听的端口，绝大部分sdk需要，可以为空
     * @param handler             处理上报的数据，不能为空
     * @param threadPool          线程池实例，可以为空
     * @param iMqttVerifyListener mqtt校验监听
     * @throws Exception 启动错误
     */
    void startup(int port, IAccessDeviceEventHandler handler, ExecutorService threadPool, IMqttVerifyListener iMqttVerifyListener) throws Exception;

    /**
     * 做一些初始化的工作，这个函数通常只会执行一次，也不会返回错误和异常，由sdk开发者来确保初始化一定能成功执行
     *
     * @param uuid 设备唯一标识
     */
    void init(String uuid);

    /**
     * 获取固件协议名称
     *
     * @return 固件协议名称
     */
    String getName();

    /**
     * 判断设备是否在线
     *
     * @param uuid 设备唯一标识
     * @return 在线为true
     */
    boolean isOnline(String uuid);

    /**
     * 查询指定在线设备
     *
     * @param uuid 设备唯一标识 必填
     * @return 设备信息，如果未找到返回null
     */
    AccessDevice find(String uuid);

    /**
     * 查询所有在线设备
     *
     * @return 设备信息，如果未找到返回空list
     */
    List<AccessDevice> findAll();

    /**
     * 配置查询--不同类型的设备支持不同的属性
     *
     * @param uuid 设备唯一标识 必填
     * @param key  设备属性名 不必填，不填则可能返回所有数据
     * @return 设备属性值
     * @throws Exception uuid不为空，设备离线等异常
     */
    String getConfig(String uuid, String key, JSONObject signConfig) throws Exception;

    /**
     * 配置修改--不同类型的设备支持不同的属性
     *
     * @param uuid    设备唯一标识 必填
     * @param configs 设备属性集合（key：属性名，value：属性值） 必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void setConfig(String uuid, String configs, JSONObject signConfig) throws Exception;

    /**
     * 更新固件
     *
     * @param uuid     设备唯一标识 必填
     * @param firmware 固件新版本对象 必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void upgradeFirmware(String uuid, FirmwarePackage firmware, JSONObject signConfig) throws Exception;

    /**
     * 远程控制
     *
     * @param uuid    设备唯一标识 必填
     * @param command 0：重启 1：远程开门 2：写卡模式 4：设备重置 5:待补充
     * @param index   门控编号，比如设备是一控四，index可能就是1，2，3，4 ,可以为空，非必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void control(String uuid, String index, int command, JSONObject extra, JSONObject signConfig) throws Exception;

    /**
     * 重启
     *
     * @param uuid 设备唯一标识 必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void restart(String uuid, String index, JSONObject signConfig) throws Exception;

    /**
     * 重置
     *
     * @param uuid 设备唯一标识 必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void reset(String uuid, String index, JSONObject signConfig) throws Exception;

    /**
     * 设置网络相关，包括wifi，ip等
     *
     * @param uuid    设备唯一标识 必填
     * @param network 网络配置对象 必填
     * @throws Exception 可能有一些属性是必填项
     */
    void setNetwork(String uuid, NetworkConfiguration network, JSONObject signConfig) throws Exception;

    /**
     * 关闭火警报警
     *
     * @param uuid 设备唯一标识 必填
     * @throws Exception uuid不为空，设备离线等异常
     */
    void offFireAlarm(String uuid, JSONObject signConfig) throws Exception;
}