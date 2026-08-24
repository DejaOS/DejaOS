package d1.device.vgsdk;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.TypeReference;
import d1.device.vgsdk.model.FirmwareProtocol;
import d1.device.vgsdk.service.IManagerService;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import d1.duoxian.mqttserver.IMqttVerifyListener;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;

/**
 * 通过这个服务注册具体设备的服务实例
 * 根据设备uuid来获取具体设备的服务实例
 *
 * @author liuyi
 */
public class DeviceFactory {
    private static volatile DeviceFactory instance;
    private final Map<String, IManagerService> services;

    private DeviceFactory() {
        services = new HashMap<>();
    }

    public static DeviceFactory getInstance() {
        if (instance == null) {
            synchronized (DeviceFactory.class) {
                if (instance == null) {
                    instance = new DeviceFactory();
                }
            }
        }
        return instance;
    }

    public Map<String, IManagerService> getServices() {
        return services;
    }

    /**
     * 不同的sdk注册自己的服务到这里
     *
     * @param service 服务实例
     */
    public void register(String name, IManagerService service) {
        services.put(name, service);
    }

    /**
     * 根据uuid来获取服务实例，这样调用者就不需要提前知道uuid对应的设备在那个服务下
     * 只能当这个设备在线才能获取到
     *
     * @param uuid 设备唯一标识
     * @return 服务实例 为null可能是设备已经离线
     */
    public IManagerService getService(String uuid) {
        if (uuid == null || uuid.length() <= 0) {
            return null;
        }
        for (IManagerService service : services.values()) {
            if (service.isOnline(uuid)) {
                return service;
            }
        }
        return null;
    }

    /**
     * 根据固件协议名称获取服务实例
     *
     * @param name 固件协议名称
     * @return 服务实例
     */
    public IManagerService getServiceByName(String name) {
        if (name == null || name.length() <= 0) {
            return null;
        }
        return services.get(name);
    }

    /**
     * 启动所有能启动的SDK服务
     *
     * @param content    配置文件对应的字符串内容，是FirmwareProtocol对象的列表
     * @param handler    处理上报的数据，不能为空
     * @param threadPool 线程池实例，可以为空
     * @throws Exception 启动的异常
     */
    public void startup(String content, IAccessDeviceEventHandler handler, ExecutorService threadPool, IMqttVerifyListener iMqttVerifyListener) throws Exception {
        List<FirmwareProtocol> list = JSON.parseObject(content, new TypeReference<>() {
        });
        startup(list, handler, threadPool, iMqttVerifyListener);
    }

    /**
     * 启动所有能启动的SDK服务
     *
     * @param list       FirmwareProtocol对象的列表
     * @param handler    处理上报的数据，不能为空
     * @param threadPool 线程池实例，可以为空
     * @throws Exception 启动的异常
     */
    public void startup(List<FirmwareProtocol> list, IAccessDeviceEventHandler handler, ExecutorService threadPool, IMqttVerifyListener iMqttVerifyListener) throws Exception {
        for (FirmwareProtocol p : list) {
            if (!p.isEnable()) {
                continue;
            }
            String id = p.getId();
            //反射的方式来启动实例，并调用startup
            String cls = "d1.device.vgsdk.devices." + id + "." + convertToCamelCase(id) + "Service";
            Class<?> clazz = Class.forName(cls);
            Object instance = clazz.getDeclaredConstructor().newInstance();
            IManagerService service = (IManagerService) instance;
            service.startup(p.getIntPort(), handler, threadPool, iMqttVerifyListener);
            this.register(service.getName(), service);
        }
    }

    private String convertToCamelCase(String input) {
        // 切分字符串
        String[] parts = input.split("_");
        // 处理每个部分的首字母大写
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                result.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1).toLowerCase());
            }
        }
        return result.toString();
    }
}
