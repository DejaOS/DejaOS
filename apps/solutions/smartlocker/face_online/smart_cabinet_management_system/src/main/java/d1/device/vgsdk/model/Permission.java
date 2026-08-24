package d1.device.vgsdk.model;

/**
 * 权限
 */
public class Permission {
    /**
     * 权限id
     */
    private String permId;
    /**
     * 权限类型：0 门禁、 1 考勤
     */
    private Integer type;
    /**
     * 授权起作用的时间区间 非必填项,不填就是永久有效
     */
    private PermissionTime time;
    /**
     * 人员名称等额外数据
     */
    private String extra;

    public Permission() {
    }

    public Permission(String permId, Integer type, PermissionTime time, String extra) {
        this.permId = permId;
        this.type = type;
        this.time = time;
        this.extra = extra;
    }

    public String getPermId() {
        return permId;
    }

    public void setPermId(String permId) {
        this.permId = permId;
    }

    public Integer getType() {
        return type;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public PermissionTime getTime() {
        return time;
    }

    public void setTime(PermissionTime time) {
        this.time = time;
    }

    public String getExtra() {
        return extra;
    }

    public void setExtra(String extra) {
        this.extra = extra;
    }

    @Override
    public String toString() {
        return "Permission{" +
                "id='" + permId + '\'' +
                ", timePeriod=" + time +
                ", extra='" + extra + '\'' +
                '}';
    }
}
