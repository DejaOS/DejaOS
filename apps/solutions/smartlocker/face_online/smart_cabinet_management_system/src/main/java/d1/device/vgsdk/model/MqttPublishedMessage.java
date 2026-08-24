package d1.device.vgsdk.model;


import d1.device.vgsdk.common.DeviceException;

/**
 * mqtt异步转同步，下发前先用这个对象记录，然后异步成功或失败再用这个对象记录结果
 *
 * @author lyin
 */
public class MqttPublishedMessage {
    /**
     * 设备唯一标识
     */
    private String uuid;
    private String topic;
    /**
     * 设备指令唯一序列号
     */
    private String serialNo;

    /**
     * 指令执行结束的时间戳（毫秒）类似1596277728123
     */
    private Long time;

    /**
     * 处理结果 1：成功，-1：失败 0表示初始值，如果处理后还是0说明是超时错误
     */
    private int result = 0;

    /**
     * 成功可能返回的数据或失败返回的原因
     */
    private String data;


    /**
     * 校验状态并返回
     *
     * @param message 设备处理结果
     * @param cn      中文类型
     * @param en      英文类型
     */
    public void checkResult(MqttPublishedMessage message, String cn, String en) throws DeviceException {
        if (message.getResult() == 0) {
            throw new DeviceException(cn + "超时", en + "timeout");
        } else if (message.getResult() == -1) {
            String error = (message.getData() == null || message.getData().length() == 0) ? "" : ":" + message.getData();
            throw new DeviceException(cn + "failed" + error, en + " failed " + error);
        }
    }


    public MqttPublishedMessage(String uuid, String topic, Object serialNo) {
        this.time = System.currentTimeMillis();
        this.uuid = uuid;
        this.topic = topic;
        this.serialNo = "" + serialNo;
    }

    public int getResult() {
        return result;
    }

    public void setResult(int result) {
        this.result = result;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(String serialNo) {
        this.serialNo = serialNo;
    }

    public Long getTime() {
        return time;
    }

    public void setTime(Long time) {
        this.time = time;
    }
}
