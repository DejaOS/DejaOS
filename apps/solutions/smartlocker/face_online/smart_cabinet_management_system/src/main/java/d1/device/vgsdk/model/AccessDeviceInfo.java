package d1.device.vgsdk.model;

/**
 * 门禁设备基本信息对象
 *
 * @author liuyi
 */
public class AccessDeviceInfo {
    /**
     * 设备唯一标识
     */
    private String uuid;

    /**
     * 设备mac地址，比如蓝牙芯片的mac地址
     */
    private String mac;
    /**
     * 设备作为mqtt client链接时的clientid，缺省和uuid是一样的，特殊情况下可以修改成其他值
     */
    private String clientId;
    /**
     * 设备别称
     */
    private String name;
    /**
     * 设备其他基本信息
     */
    private String extra;

    /**
     * 构造
     */
    public AccessDeviceInfo() {
    }

    /**
     * 构造
     *
     * @param uuid     设备uuid
     * @param mac      mac
     * @param clientId clientId
     * @param name     name
     * @param extra    extra
     */
    public AccessDeviceInfo(String uuid, String mac, String clientId, String name, String extra) {
        this.uuid = uuid;
        this.mac = mac;
        this.clientId = clientId;
        this.name = name;
        this.extra = extra;
    }

    /**
     * @return uuid
     */
    public String getUuid() {
        return uuid;
    }

    /**
     * @param uuid uuid
     */
    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    /**
     * @return mac
     */
    public String getMac() {
        return mac;
    }

    /**
     * @param mac mac
     */
    public void setMac(String mac) {
        this.mac = mac;
    }

    /**
     * @return clientId
     */
    public String getClientId() {
        return clientId;
    }

    /**
     * @param clientId clientId
     */
    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    /**
     * @return name
     */
    public String getName() {
        return name;
    }

    /**
     * @param name name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * @return extra
     */
    public String getExtra() {
        return extra;
    }

    /**
     * @param extra extra
     */
    public void setExtra(String extra) {
        this.extra = extra;
    }
}
