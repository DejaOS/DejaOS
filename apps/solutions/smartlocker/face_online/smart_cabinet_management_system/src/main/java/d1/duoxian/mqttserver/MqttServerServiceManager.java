package d1.duoxian.mqttserver;

import java.util.ArrayList;
import java.util.List;

/**
 * 管理所有service实例，目前只提供close方法
 *
 * @author liuyi
 */
public class MqttServerServiceManager {
    private final List<MqttServerService> services;
    private static volatile MqttServerServiceManager instance;

    public static MqttServerServiceManager getInstance() {
        if (instance == null) {
            synchronized (MqttServerServiceManager.class) {
                if (instance == null) {
                    instance = new MqttServerServiceManager();
                }
            }
        }
        return instance;
    }

    private MqttServerServiceManager() {
        services = new ArrayList<>();
    }

    public void register(MqttServerService service) {
        services.add(service);
    }

    //系统shutdown的时候主动触发一下close netty
    public void destroy() {
        for (MqttServerService service : services) {
            if (service != null) {
                service.close();
            }
        }
    }
}
