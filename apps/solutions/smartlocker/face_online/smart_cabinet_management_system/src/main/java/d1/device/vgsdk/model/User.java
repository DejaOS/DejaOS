package d1.device.vgsdk.model;


import com.alibaba.fastjson2.JSONArray;

public class User {
    /**
     * 用户id
     */
    private String userId;
    /**
     * 用户名
     */
    private String name;
    /**
     * 扩展字段
     */
    private String extra;

    /**
     * 用户权限id--非dw200使用
     */
    private JSONArray permissionIds;

    public User() {
    }

    public User(String userId, String name, String extra) {
        this.userId = userId;
        this.name = name;
        this.extra = extra;
    }

    public User(String userId, String name, String extra, JSONArray permissionIds) {
        this.userId = userId;
        this.name = name;
        this.extra = extra;
        this.permissionIds = permissionIds;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getExtra() {
        return extra;
    }

    public void setExtra(String extra) {
        this.extra = extra;
    }

    public JSONArray getPermissionIds() {
        return permissionIds;
    }

    public void setPermissionIds(JSONArray permissionIds) {
        this.permissionIds = permissionIds;
    }
}
