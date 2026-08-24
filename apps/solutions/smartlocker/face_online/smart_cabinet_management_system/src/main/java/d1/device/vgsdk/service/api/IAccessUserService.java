package d1.device.vgsdk.service.api;

import com.alibaba.fastjson2.JSONObject;
import d1.device.vgsdk.model.User;
import d1.device.vgsdk.model.UserPage;

import java.util.List;

public interface IAccessUserService {

    /**
     * 人员查询
     *
     * @param uuid  设备sn
     * @param index 设备编号
     * @param page  页码 从 0 开始。 如果超过总页数，返回空
     * @param size  每页最大数量 返回范围(0,100]
     */
    UserPage getUser(String uuid, String index, int page, int size, JSONObject signConfig) throws Exception;

    /**
     * 人员新增
     *
     * @param uuid  设备sn
     * @param index 设备编号
     * @param users 用户列表
     */
    void insertUser(String uuid, String index, List<? extends User> users, JSONObject signConfig) throws Exception;

    /**
     * 人员删除
     *
     * @param uuid    设备sn
     * @param index   设备编号
     * @param userIds 人员id列表
     */
    void delUser(String uuid, String index, List<String> userIds, JSONObject signConfig) throws Exception;

    /**
     * 人员清空
     *
     * @param uuid  设备sn
     * @param index 设备编号
     */
    void clearUser(String uuid, String index, JSONObject signConfig) throws Exception;
}
