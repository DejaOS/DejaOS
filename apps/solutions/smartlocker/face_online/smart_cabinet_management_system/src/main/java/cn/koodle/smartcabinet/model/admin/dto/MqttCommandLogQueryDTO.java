package cn.koodle.smartcabinet.model.admin.dto;

import cn.koodle.smartcabinet.model.admin.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
public class MqttCommandLogQueryDTO extends BasePageQuery {

    private String topic;

    private String direction;

    private String deviceSn;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
