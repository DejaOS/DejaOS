package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_mqtt_command_log")
public class MqttCommandLog extends BaseEntity {

    public static final String DIRECTION_SEND = "SEND";
    public static final String DIRECTION_RECEIVE = "RECEIVE";

    private String topic;

    private String direction;

    private String deviceSn;

    private LocalDateTime commandTime;

    private String payload;
}
