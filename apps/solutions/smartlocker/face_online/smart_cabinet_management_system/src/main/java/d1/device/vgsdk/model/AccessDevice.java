package d1.device.vgsdk.model;

/**
 * 门禁设备对象
 *
 * @author liuyi
 */
public class AccessDevice {
    /**
     * 设备唯一标识
     */
    private String uuid;
    /**
     * 设备ip地址
     */
    private String ip;

    /**
     * 构造
     */
    public AccessDevice() {
    }

    /**
     * 构造
     * @param uuid 设备uuid
     * @param ip 设备ip
     */
    public AccessDevice(String uuid, String ip) {
        this.uuid = uuid;
        this.ip = ip;
    }

    /**
     *
     * @return uuid
     */
    public String getUuid() {
        return uuid;
    }

    /**
     *
     * @param uuid uuid
     */
    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    /**
     * @return ip
     */
    public String getIp() {
        return ip;
    }

    /**
     * @param ip ip
     */
    public void setIp(String ip) {
        this.ip = ip;
    }

    @Override
    public String toString() {
        return "AccessDevice{" +
                "uuid='" + uuid + '\'' +
                ", ip='" + ip + '\'' +
                '}';
    }
}
