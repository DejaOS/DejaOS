package cn.koodle.smartcabinet.model.admin.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LockerBindUserDTO {
    @NotNull(message = "柜格ID不能为空")
    private Long lockerId;

    private String userId;

    /**
     * 绑定开始时间，不填则使用当前时间。
     */
    private LocalDateTime startTime;

    /**
     * 绑定结束时间，不填则表示无固定截止时间。
     */
    private LocalDateTime endTime;
}
