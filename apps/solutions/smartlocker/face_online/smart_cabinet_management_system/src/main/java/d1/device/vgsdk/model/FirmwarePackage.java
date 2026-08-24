package d1.device.vgsdk.model;

/**
 * 设备固件升级包
 *
 * @author liuyi
 */
public class FirmwarePackage {
    /**
     * 升级包下载地址
     */
    private String url;

    /**
     * 升级包md5值
     */
    private String md5;

    /**
     * 0：本机升级
     */
    private String type;

    /**
     * 额外字段
     */
    private String extra;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getMd5() {
        return md5;
    }

    public void setMd5(String md5) {
        this.md5 = md5;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getExtra() {
        return extra;
    }

    public void setExtra(String extra) {
        this.extra = extra;
    }
}
