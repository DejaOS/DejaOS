package cn.koodle.smartcabinet.dao;

import cn.koodle.smartcabinet.entity.Locker;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface LockerDao extends BaseMapper<Locker> {

    @Update("UPDATE sys_locker SET user_id = #{userId}, type = #{type}, status = #{status} WHERE id = #{id}")
    void updateLockerBindStatus(@Param("id") Long id, @Param("userId") String userId, @Param("type") Integer type, @Param("status") Integer status);
}
