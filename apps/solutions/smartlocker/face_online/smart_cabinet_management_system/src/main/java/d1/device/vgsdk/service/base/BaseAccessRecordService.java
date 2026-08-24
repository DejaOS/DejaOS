package d1.device.vgsdk.service.base;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.model.AccessRecord;
import d1.device.vgsdk.service.api.IAccessDeviceEventHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * 通行记录处理服务的基类，不同的组件可以直接使用或继承
 *
 * @author liuyi
 */
public abstract class BaseAccessRecordService {
    /**
     * 日志
     */
    protected static final Logger logger = LoggerFactory.getLogger(BaseAccessRecordService.class);
    /**
     * 通行记录
     */
    private final LinkedBlockingQueue<List<AccessRecord>> eventQueue;
    /**
     * 最新记录
     */
    private AccessRecord latestRecord = null;
    /**
     * 协议
     */
    private final String protocol;

    /**
     * @param protocol 协议
     */
    public BaseAccessRecordService(String protocol) {
        this.protocol = protocol;
        eventQueue = new LinkedBlockingQueue<>(10000);
    }

    /**
     *
     * @param uuid 设备uuid
     * @param records 通行记录
     */
    public abstract void add(String uuid, JSONArray records);

    /**
     *
     * @param uuid 设备uuid
     * @param record 通行记录
     * @param result 通行结果
     * @return 记录
     */
    public abstract AccessRecord toAccessRecord(String uuid, JSONObject record, Integer result);

    /**
     * @param threadPool 线程池
     * @param handler    处理
     */
    public void init(ExecutorService threadPool, IAccessDeviceEventHandler handler) {
        if (threadPool != null) {
            threadPool.execute(runnable(handler));
        } else {
            new Thread(runnable(handler)).start();
        }
    }

    //------------------------------------------------------------

    private Runnable runnable(IAccessDeviceEventHandler handler) {
        return () -> {
            while (true) {
                try {
                    List<AccessRecord> records = eventQueue.take();
                    if (records.size() <= 0) {
                        continue;
                    }
                    //如果2秒内重复发，就不记录了
                    List<AccessRecord> sendRecords = new ArrayList<>();
                    for (AccessRecord record : records) {
                        if (latestRecord != null && latestRecord.compare(record, 2000)) {
                            continue;
                        }
                        latestRecord = record;
                        sendRecords.add(record);
                    }
                    if (handler != null && !sendRecords.isEmpty()) {
                        logger.info("通行记录上报：{}", sendRecords);
                        handler.handleAccessRecord(this.protocol, sendRecords);
                    }
                } catch (Exception e) {
                    logger.error("take access record failed", e);
                }
            }
        };
    }

    /**
     * @param rs 通行记录
     */
    public void add(List<AccessRecord> rs) {
        try {
            eventQueue.add(rs);
        } catch (IllegalStateException exception) {
            logger.error("access record queue add failed", exception);
        }
    }
}
