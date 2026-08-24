package d1.device.vgsdk.model;

/**
 * 网络配置，包括wifi、ip等
 */
public class NetworkConfiguration {
    /**
     * 网络类型 :1 有线、2 WiFi
     */
    private int type;
    /**
     * wifi账号
     */
    private String ssid;
    /**
     * wifi密码
     */
    private String password;
    /**
     * DHCP模式 :1 启用（动态）、2 禁用（静态）
     */
    private int dhcp;
    /**
     * ip ip地址
     */
    private String ip;
    /**
     * gateway 网关
     */
    private String gateway;
    /**
     * DNS
     */
    private String dns;
    /**
     * 子网掩码
     */
    private String mask;

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public String getSsid() {
        return ssid;
    }

    public void setSsid(String ssid) {
        this.ssid = ssid;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public int getDhcp() {
        return dhcp;
    }

    public void setDhcp(int dhcp) {
        this.dhcp = dhcp;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public String getDns() {
        return dns;
    }

    public void setDns(String dns) {
        this.dns = dns;
    }

    public String getMask() {
        return mask;
    }

    public void setMask(String mask) {
        this.mask = mask;
    }
}
