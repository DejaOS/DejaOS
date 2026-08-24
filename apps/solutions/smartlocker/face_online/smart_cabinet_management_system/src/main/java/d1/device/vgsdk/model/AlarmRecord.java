package d1.device.vgsdk.model;


/**
 * 告警对象
 *
 * @author liuyi
 */
public class AlarmRecord {
    /**
     * 在线离线告警
     * 0：离线，1：在线
     */
    public final static String TYPE_ONLINE = "online";

    /**
     * 设备离线
     */
    public final static String TYPE_OFFLINE = "offline";

    /**
     * 门磁开状态告警
     */
    public final static String TYPE_DOOR_OPEN = "door_open";

    /**
     * 门磁开状态告警
     */
    public final static String TYPE_DOOR_CLOSE = "door_close";
    /**
     * 火警类型
     * 0：关，1：开
     */
    public final static String TYPE_FIRE = "fire";
    /**
     * 门磁状态告警
     * 0：关，1：开
     */
    public final static String TYPE_DOOR_SENSOR = "door_sensor";
    /**
     * 异常开门告警
     */
    public final static String TYPE_DOOR_ABNORMAL = "door_abnormal";
    /**
     * 开门超时
     */
    public final static String TYPE_DOOR_TIMEOUT = "door_timeout";

    /**
     * 多次开门失败
     */
    public  final static String TYPE_OPEN_FAILED = "open_failed";

    /**
     * 防拆告警
     */
    public final static String TYPE_DOOR_TAMPER = "door_tamper";

    /**
     * 升级告警
     */
    public final static String TYPE_UPGRADE_FIRMWARE = "upgrade_firmware";
    /**
     * 时控开关
     */
    public final static String POWEROFF = "poweroff";
    /**
     * 设备唯一标识
     */
    private String uuid;
    /**
     * 告警类型
     */
    private String type;
    /**
     * 告警的值
     */
    private String value;
    /**
     * 告警的时间戳（毫秒)
     */
    private Long time;

    /**
     * 门控编号，比如设备是一控四，index可能就是1，2，3，4 ,可以为空
     */
    private String index;

    /**
     * 构造
     */
    public AlarmRecord() {
    }

    /**
     * @param uuid  见上方注释
     * @param type  见上方注释
     * @param value 见上方注释
     * @param time  见上方注释
     */
    public AlarmRecord(String uuid, String type, String value, Long time) {
        this.uuid = uuid;
        this.type = type;
        this.value = value;
        this.time = time;
    }

    /**
     * @param uuid  见上方注释
     * @param type  见上方注释
     * @param value 见上方注释
     * @param time  见上方注释
     * @param index 见上方注释
     */
    public AlarmRecord(String uuid, String type, String value, Long time, String index) {
        this.uuid = uuid;
        this.type = type;
        this.value = value;
        this.time = time;
        this.index = index;
    }

    /**
     * 比较二个对象是否相同
     *
     * @param record   传递过来的对象
     * @param interval 在某个时间间隔内，就算相同的
     * @return 是否相同
     */
    public boolean compare(AlarmRecord record, long interval) {
        if (!this.getType().equals(record.getType())) {
            return false;
        }
        if (!this.getUuid().equals(record.getUuid())) {
            return false;
        }
        //index可能为null
        if (this.getIndex() == null && record.getIndex() != null) {
            return false;
        }
        if (this.getIndex() != null && !this.getIndex().equals(record.getIndex())) {
            return false;
        }
        //Value可能为null
        if (this.getValue() == null && record.getValue() != null) {
            return false;
        }
        if (this.getValue() != null && !this.getValue().equals(record.getValue())) {
            return false;
        }
        return Math.abs(this.getTime() - record.getTime()) < interval;
    }

    /**
     * @return 见上方注释
     */
    public String getIndex() {
        return index;
    }

    /**
     * @param index 见上方注释
     */
    public void setIndex(String index) {
        this.index = index;
    }

    /**
     * @return 见上方注释
     */
    public String getUuid() {
        return uuid;
    }

    /**
     * @param uuid 见上方注释
     */
    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    /**
     * @return 见上方注释
     */
    public String getType() {
        return type;
    }

    /**
     * @param type 见上方注释
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * @return 见上方注释
     */
    public String getValue() {
        return value;
    }

    /**
     * @param value 见上方注释
     */
    public void setValue(String value) {
        this.value = value;
    }

    /**
     * @return 见上方注释
     */
    public Long getTime() {
        return time;
    }

    /**
     * @param time 见上方注释
     */
    public void setTime(Long time) {
        this.time = time;
    }

    @Override
    public String toString() {
        return "AlarmRecord{" +
                "uuid='" + uuid + '\'' +
                ", type='" + type + '\'' +
                ", value='" + value + '\'' +
                ", time=" + time +
                ", index='" + index + '\'' +
                '}';
    }
}
