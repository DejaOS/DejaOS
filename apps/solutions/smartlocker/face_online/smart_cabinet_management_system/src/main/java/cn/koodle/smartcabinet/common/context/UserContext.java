package cn.koodle.smartcabinet.common.context;

import cn.koodle.smartcabinet.entity.User;

/**
 * 用户上下文工具类 (基于 ThreadLocal)
 * 用于在同一线程的不同层级（Interceptor -> Service -> Dao -> Handler）之间传递用户信息
 */
public class UserContext {

    private static final ThreadLocal<User> USER_HOLDER = new ThreadLocal<>();

    /**
     * 设置当前登录用户 (通常存 用户ID 或 用户编号/姓名)
     */
    public static void setUser(User user) {
        USER_HOLDER.set(user);
    }

    /**
     * 获取当前登录用户
     */
    public static User getUser() {
        return USER_HOLDER.get();
    }

    /**
     * 清除上下文 (务必在请求结束时调用，防止内存泄漏)
     */
    public static void clear() {
        USER_HOLDER.remove();
    }
}