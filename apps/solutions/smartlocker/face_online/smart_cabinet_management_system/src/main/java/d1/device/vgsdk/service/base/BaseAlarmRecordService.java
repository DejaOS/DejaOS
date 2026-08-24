package d1.device.vgsdk.service.base;

import d1.device.vgsdk.model.AlarmRecord;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * 告警相关的处理服务的基类，不同的组件可以直接使用或继承
 *
 * @author liuyi
 */
public class BaseAlarmRecordService {
    private static final Logger logger = LoggerFactory.getLogger(BaseAlarmRecordService.class);
    private final LinkedBlockingQueue<AlarmRecord> eventQueue;
    private AlarmRecord latestRecord = null;
    private final String protocol;

    /**
     *
     * @param protocol 协议
     */
    public BaseAlarmRecordService(String protocol) {
        this.protocol = protocol;
        this.eventQueue = new LinkedBlockingQueue<>(10000);
    }

    /**
     *
     * @param threadPool 线程池
     * @param handler 通行记录处理
     */
    public void init( ExecutorService threadPool, IAccessDeviceEventHandler handler) {
        if (threadPool != null) {
            threadPool.execute(runnable(handler));
        } else {
            new Thread(runnable(handler)).start();
        }
    }

    /**
     * 避免消息的处理占用mqttserver的并发量，所以同步转异步
     * @param alarm 告警
     */
    public void add(AlarmRecord alarm) {
        if (alarm == null) {
            return;
        }
        try {
            //如果2秒内重复发，就不记录了
            if (latestRecord != null && latestRecord.compare(alarm, 2000)) {
                return;
            }
            latestRecord = alarm;
            eventQueue.add(alarm);
        } catch (IllegalStateException exception) {
            logger.error("alarm queue add failed", exception);
        }
    }

    //------------------------------------------------------------

    private Runnable runnable( IAccessDeviceEventHandler handler) {
        return () -> {
            while (true) {
                try {
                    AlarmRecord obj = eventQueue.take();
                    if (handler != null) {
                        logger.info("告警记录上报：{}", obj);
                        handler.handleAlarm(protocol, obj);
                    }
                } catch (Exception e) {
                    logger.error("take access record failed", e);
                }
            }
        };
    }
}
