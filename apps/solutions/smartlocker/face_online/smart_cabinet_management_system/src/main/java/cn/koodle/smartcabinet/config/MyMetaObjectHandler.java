package cn.koodle.smartcabinet.config;

import cn.koodle.smartcabinet.common.context.UserContext;
import cn.koodle.smartcabinet.entity.User;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());

        User user = getCurrentUser();
        if (user != null) {
            this.strictInsertFill(metaObject, "createBy", String.class, user.getUserId());
            this.strictInsertFill(metaObject, "updateBy", String.class, user.getUserId());
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());

        User user = getCurrentUser();
        if (user != null) {
            this.strictUpdateFill(metaObject, "updateBy", String.class, user.getUserId());
        }
    }

    /**
     * 获取当前用户，带兜底逻辑
     */
    private User getCurrentUser() {
        return UserContext.getUser();
    }
}
