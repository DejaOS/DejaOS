package d1.device.vgsdk.service.api;

import com.alibaba.fastjson2.JSONArray;
import d1.device.vgsdk.model.AccessDeviceInfo;
import d1.device.vgsdk.model.AccessRecord;
import d1.device.vgsdk.model.AlarmRecord;

import java.util.List;

/**
 * 设备会主动上报一些数据，调用者需要实现这个接口来处理上报的数据
 *
 * @author liuyi
 */
public interface IAccessDeviceEventHandler {
    /**
     * 设备会上报一些通行记录，上报失败还会缓存下来，会尝试再次上报
     *
     * @param protocol 不同的sdk公用一个handler，用协议名称来区分
     * @param array    通行记录集合
     * @throws Exception 只要处理没有异常则认为已经处理过了，当前就无需再缓存和重试
     */
    void handleAccessRecord(String protocol, List<AccessRecord> array) throws Exception;

    /**
     * Handle face synchronization results reported asynchronously by a device.
     */
    default void handleFaceSync(String protocol, String uuid, String serialNo, JSONArray array) throws Exception {
    }

    /**
     * 设备会上报一些告警，上报失败还会缓存下来，会尝试再次上报
     *
     * @param protocol    不同的sdk公用一个handler，用协议名称来区分
     * @param alarmRecord 告警记录
     * @throws Exception 只要处理没有异常则认为已经处理过了，当前就无需再缓存和重试
     */
    void handleAlarm(String protocol, AlarmRecord alarmRecord) throws Exception;

    /**
     * 设备发生通行请求，需在线验证时会上报当前通行记录，处理在线验证逻辑
     *
     * @param protocol 不同的sdk公用一个handler，用协议名称来区分
     * @param record   通行记录
     * @return 通行验证结果
     * @throws Exception 验证异常
     */
    boolean onlineCheck(String protocol, AccessRecord record) throws Exception;

    /**
     * 设备会主动上报一些基础信息
     * @param protocol 不同的sdk公用一个handler，用协议名称来区分
     * @param info 设备基础信息对象
     */
    void handleInfo(String protocol, AccessDeviceInfo info);
}
