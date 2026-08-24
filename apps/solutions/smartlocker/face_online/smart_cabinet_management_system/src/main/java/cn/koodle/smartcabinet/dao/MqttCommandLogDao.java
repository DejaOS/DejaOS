package cn.koodle.smartcabinet.dao;

import cn.koodle.smartcabinet.entity.MqttCommandLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MqttCommandLogDao extends BaseMapper<MqttCommandLog> {
}
