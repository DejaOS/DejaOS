package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.convert.DeviceChannelConvert;
import cn.koodle.smartcabinet.dao.DeviceChannelDao;
import cn.koodle.smartcabinet.dao.LockerDao;
import cn.koodle.smartcabinet.entity.DeviceChannel;
import cn.koodle.smartcabinet.entity.Locker;
import cn.koodle.smartcabinet.model.admin.dto.DeviceChannelDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceChannelQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceChannelVO;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceChannelService extends ServiceImpl<DeviceChannelDao, DeviceChannel> {

    private final DeviceChannelConvert deviceChannelConvert;
    private final LockerDao lockerDao;
    private final LockerService lockerService;

    public IPage<DeviceChannelVO> getPageVO(DeviceChannelQueryDTO query) {
        Page<DeviceChannel> page = new Page<>(query.getPageNo(), query.getPageSize());
        LambdaQueryWrapper<DeviceChannel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(query.getDeviceId() != null, DeviceChannel::getDeviceId, query.getDeviceId());
        wrapper.like(StringUtils.hasText(query.getChannelName()), DeviceChannel::getChannelName, query.getChannelName());
        wrapper.orderByAsc(DeviceChannel::getSort).orderByDesc(DeviceChannel::getCreateTime);

        Page<DeviceChannel> entityPage = this.page(page, wrapper);
        return entityPage.convert(deviceChannelConvert::toVO);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdateChannel(DeviceChannelDTO dto) {
        if (dto.getId() == null && dto.getChannelNo() == null) {
            DeviceChannel maxChannel = this.getOne(new LambdaQueryWrapper<DeviceChannel>()
                    .eq(DeviceChannel::getDeviceId, dto.getDeviceId())
                    .orderByDesc(DeviceChannel::getChannelNo)
                    .last("limit 1"));
            dto.setChannelNo(maxChannel == null ? 1 : maxChannel.getChannelNo() + 1);
        }

        LambdaQueryWrapper<DeviceChannel> checkWrapper = new LambdaQueryWrapper<>();
        checkWrapper.eq(DeviceChannel::getDeviceId, dto.getDeviceId()).eq(DeviceChannel::getChannelNo, dto.getChannelNo());
        if (dto.getId() != null) {
            checkWrapper.ne(DeviceChannel::getId, dto.getId());
        }
        if (this.count(checkWrapper) > 0) {
            throw new ApiException("柜组编号不能重复，该柜组编号已存在");
        }

        if (dto.getId() != null) {
            Long occupiedCount = lockerDao.selectCount(new LambdaQueryWrapper<Locker>()
                    .eq(Locker::getChannelId, dto.getId())
                    .eq(Locker::getStatus, 2));
            if (occupiedCount > 0) {
                throw new ApiException("该柜组下有柜格正在使用中，无法修改配置");
            }
        }

        DeviceChannel entity = DeviceChannelConvert.INSTANCE.toEntity(dto);
        this.saveOrUpdate(entity);
        Long channelId = entity.getId();

        lockerDao.update(null, new LambdaUpdateWrapper<Locker>()
                .eq(Locker::getChannelId, channelId)
                .set(Locker::getGroupId, entity.getChannelNo())
                .set(Locker::getGroupName, entity.getChannelName())
                .set(Locker::getRow, entity.getChannelNo()));

        Long currentCount = lockerDao.selectCount(new LambdaQueryWrapper<Locker>().eq(Locker::getChannelId, channelId));
        int targetCount = dto.getLockerCount() != null ? dto.getLockerCount() : 50;

        if (currentCount < targetCount) {
            int addNum = (int) (targetCount - currentCount);
            Locker maxLocker = lockerDao.selectOne(new LambdaQueryWrapper<Locker>()
                    .eq(Locker::getChannelId, channelId)
                    .orderByDesc(Locker::getCabinetId)
                    .last("limit 1"));
            int startCabinet = maxLocker == null ? 1 : maxLocker.getCabinetId() + 1;

            for (int i = 0; i < addNum; i++) {
                int cabinetId = startCabinet + i;
                Locker locker = new Locker();
                locker.setDeviceId(dto.getDeviceId());
                locker.setChannelId(channelId);
                locker.setLockerNo(dto.getChannelNo() + "-" + cabinetId);
                locker.setGroupId(dto.getChannelNo());
                locker.setGroupName(entity.getChannelName());
                locker.setCabinetId(cabinetId);
                locker.setCabinetName(dto.getChannelNo() + "-" + cabinetId);
                locker.setRow(dto.getChannelNo());
                locker.setCol(cabinetId);
                locker.setDoorOpen(0);
                locker.setStatus(1);
                locker.setType(2);
                lockerDao.insert(locker);
            }
        } else if (currentCount > targetCount) {
            int delNum = (int) (currentCount - targetCount);
            List<Locker> candidates = lockerDao.selectList(new LambdaQueryWrapper<Locker>()
                    .eq(Locker::getChannelId, channelId)
                    .orderByDesc(Locker::getCabinetId));

            List<Long> toDeleteIds = new ArrayList<>();
            for (Locker locker : candidates) {
                if (toDeleteIds.size() == delNum) {
                    break;
                }
                if (Integer.valueOf(1).equals(locker.getStatus()) && locker.getUserId() == null) {
                    toDeleteIds.add(locker.getId());
                }
            }
            if (toDeleteIds.size() < delNum) {
                throw new ApiException("该柜组下存在被占用或绑定用户的柜格，无法安全缩减数量。最多只能缩减 " + toDeleteIds.size() + " 个空闲柜格。");
            }
            lockerDao.deleteByIds(toDeleteIds);
        }

        lockerService.syncLockerModelToDeviceAfterCommitIfOnline(dto.getDeviceId(), null, "channel saved");
    }

    public DeviceChannelVO getDetail(Long id) {
        return deviceChannelConvert.toVO(this.getById(id));
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id, Long deviceId) {
        Long occupiedCount = lockerDao.selectCount(new LambdaQueryWrapper<Locker>()
                .eq(Locker::getChannelId, id)
                .eq(Locker::getStatus, 2));
        if (occupiedCount > 0) {
            throw new ApiException("该柜组下有柜格正在使用中，无法删除。请先清理柜格或等待用户取物。");
        }

        List<Locker> deletedLockers = lockerDao.selectList(new LambdaQueryWrapper<Locker>().eq(Locker::getChannelId, id));
        JSONArray deletePayload = new JSONArray();
        for (Locker locker : deletedLockers) {
            if (locker.getGroupId() == null || locker.getCabinetId() == null) {
                continue;
            }
            JSONObject item = new JSONObject();
            item.put("groupId", locker.getGroupId());
            item.put("cabinetId", locker.getCabinetId());
            deletePayload.add(item);
        }

        lockerDao.delete(new LambdaQueryWrapper<Locker>().eq(Locker::getChannelId, id));
        this.removeById(id);
        lockerService.deleteCabinetsAfterCommitIfOnline(deviceId, deletePayload, "channel deleted");
    }
}
