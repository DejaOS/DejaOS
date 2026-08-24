package cn.koodle.smartcabinet.entity;

import cn.koodle.smartcabinet.entity.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 柜格 (物理储物单元)
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_locker")
public class Locker extends BaseEntity {

    /**
     * 关联主设备ID (对应人脸终端)
     */
    private Long deviceId;

    /**
     * 关联的柜组ID (映射到 DeviceChannel)
     */
    private Long channelId;

    private Integer groupId;

    private String groupName;

    /**
     * 柜格显示编号 (可视化标识，如: A01, B12，用户看这个编号找柜格)
     */
    private String lockerNo;

    private Integer cabinetId;

    private String cabinetName;

    private Integer row;

    private Integer col;

    /**
     * 柜格类型: 1-固定柜, 2-临时柜
     */
    private Integer type;

    /**
     * 绑定的用户ID
     * - 如果是长期柜：由后台管理员分配时写入，一直存在。
     * - 如果是临时柜：用户扫脸存物时临时写入，用户扫脸取走物品后【必须清空(置为null)】。
     */
    private String userId;

    /**
     * 柜格状态
     * 1: 空闲 (临时柜无物品/可供选择)
     * 2: 使用中/已占用 (临时柜正在被某人使用)
     * 3: 锁定 (占用期满且已过延时锁定规则)
     * 4: 故障 (锁损坏等)
     * 5: 空格
     * 注：如果是长期柜，只要绑了userId，对于别人来说就是不可用的，状态可视情况固定为"使用中"或由管理员手动标记。
     */
    private Integer status;

    /**
     * 绑定起始时间
     */
    private LocalDateTime bindStartTime;

    /**
     * 绑定结束时间（到期时间）
     */
    private LocalDate bindEndTime;

    private Long startTimestamp;

    private Long endTimestamp;

    private Integer doorOpen;

    /**
     * 备注
     */
    private String remark;
}
