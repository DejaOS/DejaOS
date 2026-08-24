package d1.device.vgsdk.model;

/**
 * 固件协议对象
 *
 * @author liuyi
 */
public class FirmwareProtocol {
    /**
     * 启用，禁用
     */
    private boolean enable;
    /**
     * 协议id
     */
    private String id;
    /**
     * 协议名称
     */
    private String name;
    /**
     * 支持的设备类型
     */
    private String support;
    /**
     * 监听的端口
     */
    private String port;

    public boolean isEnable() {
        return enable;
    }

    public void setEnable(boolean enable) {
        this.enable = enable;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSupport() {
        return support;
    }

    public void setSupport(String support) {
        this.support = support;
    }

    public String getPort() {
        return port;
    }

    public void setPort(String port) {
        this.port = port;
    }

    public int getIntPort() {
        try {
            return Integer.parseInt(this.port);
        } catch (Exception e) {
            return 0;
        }
    }
}
