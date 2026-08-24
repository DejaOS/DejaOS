package cn.koodle.smartcabinet.model.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "仪表盘设备统计数据")
public class DeviceStatsVO {

    // --- 卡片1: 设备总数 & 增量 ---
    @Schema(description = "设备总数")
    private Long totalCount;

    @Schema(description = "较上月增加数量 ")
    private Long increaseCount;

    // --- 卡片2: 状态统计 ---
    @Schema(description = "正常运行设备数")
    private Long normalCount;

    @Schema(description = "维护中设备数")
    private Long maintenanceCount;

    // --- 新增: 在线/离线统计 ---
    @Schema(description = "在线设备数")
    private Long onlineCount;

    @Schema(description = "离线设备数")
    private Long offlineCount;

    // --- 卡片4: 柜格统计 ---
    @Schema(description = "总柜格数")
    private Long totalSlots;

    @Schema(description = "已使用柜格数")
    private Long usedSlots;
}
