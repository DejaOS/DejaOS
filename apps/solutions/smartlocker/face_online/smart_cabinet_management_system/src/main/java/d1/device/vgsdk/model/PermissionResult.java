package d1.device.vgsdk.model;

import java.util.List;

/**
 * 插入或删除权限的返回结果对象
 *
 * @author liuyi
 */
public class PermissionResult {
    /**
     * 删除或插入的权限原样返回
     */
    private Permission permission;
    /**
     * 删除、插入权限成功或失败，0表示失败，1表示成功
     */
    private int result;
    /**
     * 成功或失败对应的说明，失败对应是失败原因
     */
    private String data;

    public PermissionResult(Permission permission, int result, String data) {
        this.permission = permission;
        this.result = result;
        this.data = data;
    }

    public static PermissionResult ofSuccess(Permission permission) {
        return new PermissionResult(permission, 1, "");
    }

    public static PermissionResult ofFail(Permission permission, String data) {
        return new PermissionResult(permission, 0, data);
    }

    /**
     * 把一组权限批量成功或失败加到已有的PermissionResult列表里
     *
     * @param list        已创建好的PermissionResult列表对象
     * @param permissions 一批permission
     * @param result      0表示失败，1表示成功
     */
    public static void ofList(List<PermissionResult> list, List<? extends Permission> permissions, int result, String data) {
        if (list == null || permissions == null) {
            return;
        }
        for (Permission permission : permissions) {
            list.add(new PermissionResult(permission, result, data));
        }
    }

    public Permission getPermission() {
        return permission;
    }

    public void setPermission(Permission permission) {
        this.permission = permission;
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

    @Override
    public String toString() {
        return "PermissionResult{" +
                "permission=" + permission +
                ", result=" + result +
                ", data='" + data + '\'' +
                '}';
    }
}
