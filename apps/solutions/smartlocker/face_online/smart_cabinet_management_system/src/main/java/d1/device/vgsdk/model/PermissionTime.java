package d1.device.vgsdk.model;

/**
 * 权限时间周期
 *
 * @author liuyi
 */
public class PermissionTime {
    /**
     * 永久有效
     */
    public final static int TYPE_FOREVER = 0;
    /**
     * 特定时间区间内一直有效（startTime->endTime)
     */
    public final static int TYPE_PERIOD = 1;
    /**
     * 每日模式，每日特定时间到特定时间内有效(时间戳为当日零点到该时间的秒数)
     */
    public final static int TYPE_DAY = 2;
    /**
     * 特定时间区间内（startTime->endTime)的每周每天的特定时间区间内一直有效（weekPeriodTimes)
     */
    public final static int TYPE_WEEK_PERIOD = 3;
    /**
     * 次数模式，
     */
    public final static int TYPE_COUNT = 5;

    /**
     * 时间类型
     */
    private int type;
    /**
     * 时间区间开始时间戳（毫秒）
     */
    private Long startTime;
    /**
     * 时间区间结束时间戳（毫秒）
     */
    private Long endTime;

    /**
     * TYPE_WEEK_PERIOD类型下设置周一到周日的开始时间到结束时间，每天可以设置多个时间段,中间用|隔开，时间段之间不能重叠
     * {
     * "1":"9:00-10:00|11:00-13:30",
     * "2":"8:00-10:00",
     * "4":"00:00-24:00"
     * }
     * 如上示例，“1”表示周一，“2”表示周二，示例没有“3”，那么周三就全天无效，“4”表示周四全天有效
     * String时间的格式是"HH:mm"
     * 这里面必须是一个json格式的完整string
     */
    private String weekPeriodTime;
    /**
     * 每日模式，示例："12:00-13:30|15:00-16:30"
     */
    private String dayPeriodTime;
    /**
     * 次数
     */
    private Integer count;


    public PermissionTime() {
    }

    public PermissionTime(int type, Long startTime, Long endTime, String weekPeriodTime, String dayPeriodTime) {
        this.type = type;
        this.startTime = startTime;
        this.endTime = endTime;
        this.weekPeriodTime = weekPeriodTime;
        this.dayPeriodTime = dayPeriodTime;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public Long getStartTime() {
        return startTime;
    }

    public void setStartTime(Long startTime) {
        this.startTime = startTime;
    }

    public Long getEndTime() {
        return endTime;
    }

    public void setEndTime(Long endTime) {
        this.endTime = endTime;
    }

    public String getWeekPeriodTime() {
        return weekPeriodTime;
    }

    public void setWeekPeriodTime(String weekPeriodTime) {
        this.weekPeriodTime = weekPeriodTime;
    }

    public String getDayPeriodTime() {
        return dayPeriodTime;
    }

    public void setDayPeriodTime(String dayPeriodTime) {
        this.dayPeriodTime = dayPeriodTime;
    }

    public Integer getCount() {
        return count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }

    @Override
    public String toString() {
        return "PermissionTime{" +
                "type=" + type +
                ", startTime=" + startTime +
                ", endTime=" + endTime +
                ", weekPeriodTimes='" + weekPeriodTime + '\'' +
                ", dayPeriodTime='" + dayPeriodTime + '\'' +
                ", count=" + count +
                '}';
    }
}
