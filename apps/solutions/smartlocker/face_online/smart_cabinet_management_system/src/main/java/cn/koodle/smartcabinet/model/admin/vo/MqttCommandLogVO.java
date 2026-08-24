package cn.koodle.smartcabinet.model.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MqttCommandLogVO {

    private Long id;

    private String topic;

    private String direction;

    private String deviceSn;

    private LocalDateTime commandTime;

    private String payload;
}
