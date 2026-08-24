package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.dao.MqttCommandLogDao;
import cn.koodle.smartcabinet.entity.MqttCommandLog;
import cn.koodle.smartcabinet.model.admin.dto.MqttCommandLogQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.MqttCommandLogVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class MqttCommandLogService extends ServiceImpl<MqttCommandLogDao, MqttCommandLog> {

    private static MqttCommandLogService INSTANCE;

    @PostConstruct
    public void initStaticInstance() {
        INSTANCE = this;
    }

    public static void recordSafe(String direction, String topic, String deviceSn, String payload) {
        MqttCommandLogService service = INSTANCE;
        if (service == null) {
            return;
        }
        try {
            service.record(direction, topic, deviceSn, payload);
        } catch (Exception e) {
            log.warn("save mqtt command log failed, direction={}, topic={}, deviceSn={}", direction, topic, deviceSn, e);
        }
    }

    public void record(String direction, String topic, String deviceSn, String payload) {
        MqttCommandLog entity = new MqttCommandLog();
        entity.setDirection(direction);
        entity.setTopic(topic);
        entity.setDeviceSn(deviceSn);
        entity.setPayload(payload);
        entity.setCommandTime(LocalDateTime.now());
        this.save(entity);
    }

    public IPage<MqttCommandLogVO> getPage(MqttCommandLogQueryDTO query) {
        Page<MqttCommandLog> page = new Page<>(query.getPageNo(), query.getPageSize());
        LambdaQueryWrapper<MqttCommandLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getTopic()), MqttCommandLog::getTopic, query.getTopic())
                .eq(StringUtils.hasText(query.getDirection()), MqttCommandLog::getDirection, query.getDirection())
                .like(StringUtils.hasText(query.getDeviceSn()), MqttCommandLog::getDeviceSn, query.getDeviceSn());
        if (query.getStartTime() != null && query.getEndTime() != null) {
            wrapper.between(MqttCommandLog::getCommandTime, query.getStartTime(), query.getEndTime());
        }
        wrapper.orderByDesc(MqttCommandLog::getCommandTime).orderByDesc(MqttCommandLog::getId);
        return this.page(page, wrapper).convert(this::toVO);
    }

    public MqttCommandLogVO getDetail(Long id) {
        MqttCommandLog entity = this.getById(id);
        return entity == null ? null : toVO(entity);
    }

    private MqttCommandLogVO toVO(MqttCommandLog entity) {
        MqttCommandLogVO vo = new MqttCommandLogVO();
        vo.setId(entity.getId());
        vo.setTopic(entity.getTopic());
        vo.setDirection(entity.getDirection());
        vo.setDeviceSn(entity.getDeviceSn());
        vo.setCommandTime(entity.getCommandTime());
        vo.setPayload(entity.getPayload());
        return vo;
    }
}
