package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.dao.DeviceChannelDao;
import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.dao.LockerDao;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.DeviceChannel;
import cn.koodle.smartcabinet.entity.Locker;
import cn.koodle.smartcabinet.model.admin.dto.LockerBasicUpdateDTO;
import cn.koodle.smartcabinet.model.admin.dto.LockerBindUserDTO;
import cn.koodle.smartcabinet.model.admin.dto.LockerStatusUpdateDTO;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LockerService extends ServiceImpl<LockerDao, Locker> {

    private final DeviceDao deviceDao;
    private final DeviceAdapterService deviceAdapterService;
    private final DeviceChannelDao deviceChannelDao;

    public List<Locker> getByDeviceId(Long deviceId) {
        LambdaQueryWrapper<Locker> wrapper = new LambdaQueryWrapper<>();
        if (deviceId != null) {
            wrapper.eq(Locker::getDeviceId, deviceId);
        }
        wrapper.orderByAsc(Locker::getGroupId).orderByAsc(Locker::getCabinetId);
        return this.list(wrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    public void bindOrUnbindUser(LockerBindUserDTO dto) {
        Locker locker = this.getById(dto.getLockerId());
        if (locker == null) {
            throw new ApiException("柜格不存在");
        }

        String userId = normalizeUserId(dto.getUserId());
        if (StringUtils.hasText(userId)) {
            long alreadyBoundCount = this.count(new LambdaQueryWrapper<Locker>()
                    .eq(Locker::getDeviceId, locker.getDeviceId())
                    .eq(Locker::getUserId, userId)
                    .ne(Locker::getId, locker.getId()));
            if (alreadyBoundCount > 0) {
                throw new ApiException("该用户在此设备上已经绑定了其他柜格");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        boolean hasBindingData = StringUtils.hasText(userId) || dto.getStartTime() != null || dto.getEndTime() != null;
        LocalDateTime startTime = hasBindingData ? (dto.getStartTime() == null ? now : dto.getStartTime()) : null;
        LocalDateTime endTime = dto.getEndTime();
        if (startTime != null && endTime != null && endTime.isBefore(startTime)) {
            throw new ApiException("结束时间不能早于开始时间");
        }
        Long startTimestamp = startTime == null ? null : startTime.atZone(ZoneId.systemDefault()).toEpochSecond();
        Long endTimestamp = endTime == null ? null : endTime.atZone(ZoneId.systemDefault()).toEpochSecond();

        LambdaUpdateWrapper<Locker> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Locker::getId, locker.getId());
        updateWrapper.set(Locker::getUserId, userId)
                .set(Locker::getType, 1)
                .set(Locker::getStatus, StringUtils.hasText(userId) ? 2 : 1)
                .set(Locker::getStartTimestamp, startTimestamp)
                .set(Locker::getEndTimestamp, endTimestamp)
                .set(Locker::getBindStartTime, startTime)
                .set(Locker::getBindEndTime, endTime == null ? null : endTime.toLocalDate());
        this.update(updateWrapper);

        syncLockerModelToDeviceAfterCommitIfOnline(locker.getDeviceId(), locker.getId(), "fixed assignment");
    }

    @Transactional(rollbackFor = Exception.class)
    public void convertToTemp(Long lockerId) {
        Locker locker = this.getById(lockerId);
        if (locker == null) {
            throw new ApiException("柜格不存在");
        }

        LambdaUpdateWrapper<Locker> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Locker::getId, locker.getId())
                .set(Locker::getUserId, null)
                .set(Locker::getType, 2)
                .set(Locker::getStatus, 1)
                .set(Locker::getStartTimestamp, null)
                .set(Locker::getEndTimestamp, null)
                .set(Locker::getBindStartTime, null)
                .set(Locker::getBindEndTime, null);
        this.update(updateWrapper);

        syncLockerModelToDeviceAfterCommitIfOnline(locker.getDeviceId(), locker.getId(), "convert to temporary");
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateBasic(LockerBasicUpdateDTO dto) {
        if (dto == null || dto.getId() == null) {
            throw new ApiException("柜格ID不能为空");
        }
        Locker locker = this.getById(dto.getId());
        if (locker == null) {
            throw new ApiException("柜格不存在");
        }
        String name = dto.getName() == null ? "" : dto.getName().trim();
        if (!StringUtils.hasText(name)) {
            throw new ApiException("柜格名称不能为空");
        }
        locker.setLockerNo(name);
        locker.setCabinetName(name);
        this.updateById(locker);

        syncLockerModelToDeviceAfterCommitIfOnline(locker.getDeviceId(), locker.getId(), "basic update");
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(LockerStatusUpdateDTO dto) {
        if (dto == null || dto.getId() == null) {
            throw new ApiException("柜格ID不能为空");
        }
        Integer status = dto.getStatus();
        if (status == null || status < 1 || status > 5) {
            throw new ApiException("柜格状态不正确");
        }
        Locker locker = this.getById(dto.getId());
        if (locker == null) {
            throw new ApiException("柜格不存在");
        }

        locker.setStatus(status);
        this.updateById(locker);

        syncLockerModelToDeviceAfterCommitIfOnline(locker.getDeviceId(), locker.getId(), "status update");
    }

    public void remoteControl(Long lockerId, int command) {
        Locker locker = this.getById(lockerId);
        if (locker == null) {
            throw new ApiException("柜格不存在");
        }
        Device device = deviceDao.selectById(locker.getDeviceId());
        if (device == null) {
            throw new ApiException("设备不存在");
        }
        JSONObject extra = new JSONObject();
        extra.put("groupId", resolveGroupId(locker, Map.of()));
        extra.put("cabinetId", resolveCabinetId(locker));
        deviceAdapterService.control(device.getDeviceNo(), command, extra);
    }

    public void syncLockerModelToDevice(Long deviceId) {
        Device device = deviceDao.selectById(deviceId);
        if (device == null) {
            throw new ApiException("设备不存在");
        }
        if (device.getOnlineStatus() != 1) {
            log.warn("device offline, cabinet sync skipped. deviceId={}", deviceId);
            throw new ApiException("设备当前不在线，无法同步柜格配置");
        }

        List<DeviceChannel> channels = deviceChannelDao.selectList(new LambdaQueryWrapper<DeviceChannel>().eq(DeviceChannel::getDeviceId, deviceId).orderByAsc(DeviceChannel::getChannelNo));
        Map<Long, DeviceChannel> channelMap = channels.stream().collect(Collectors.toMap(DeviceChannel::getId, c -> c));
        List<Locker> allLockers = this.list(new LambdaQueryWrapper<Locker>().eq(Locker::getDeviceId, deviceId).orderByAsc(Locker::getGroupId).orderByAsc(Locker::getCabinetId));

        try {
            deviceAdapterService.syncCabinets(device.getDeviceNo(), toCabinetArray(allLockers, channelMap));
        } catch (Exception e) {
            log.error("cabinet full sync failed, deviceId={}, reason={}", device.getId(), e.getMessage());
            throw new ApiException("设备同步无响应或失败");
        }
    }

    public void fullSyncLockerModelToDevice(Long deviceId) {
        Device device = deviceDao.selectById(deviceId);
        if (device == null) {
            throw new ApiException("设备不存在");
        }
        if (device.getOnlineStatus() != 1) {
            throw new ApiException("设备当前不在线，无法同步柜格配置");
        }

        List<DeviceChannel> channels = deviceChannelDao.selectList(new LambdaQueryWrapper<DeviceChannel>().eq(DeviceChannel::getDeviceId, deviceId).orderByAsc(DeviceChannel::getChannelNo));
        Map<Long, DeviceChannel> channelMap = channels.stream().collect(Collectors.toMap(DeviceChannel::getId, c -> c));
        List<Locker> allLockers = this.list(new LambdaQueryWrapper<Locker>().eq(Locker::getDeviceId, deviceId).orderByAsc(Locker::getGroupId).orderByAsc(Locker::getCabinetId));

        try {
            deviceAdapterService.clearCabinets(device.getDeviceNo());
            deviceAdapterService.syncCabinets(device.getDeviceNo(), toCabinetArray(allLockers, channelMap));
        } catch (Exception e) {
            log.error("cabinet full sync failed, deviceId={}, reason={}", device.getId(), e.getMessage());
            throw new ApiException("设备全部同步无响应或失败");
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public int refreshRuntimeFromDevice(Long deviceId) {
        Device device = deviceDao.selectById(deviceId);
        if (device == null) {
            throw new ApiException("设备不存在");
        }
        if (device.getOnlineStatus() != 1) {
            throw new ApiException("设备当前不在线，无法刷新柜格状态");
        }

        JSONArray deviceCabinets = deviceAdapterService.listCabinets(device.getDeviceNo(), new JSONObject());
        List<Locker> localLockers = this.list(new LambdaQueryWrapper<Locker>().eq(Locker::getDeviceId, deviceId));
        Map<String, Locker> localMap = localLockers.stream()
                .filter(locker -> locker.getGroupId() != null && locker.getCabinetId() != null)
                .collect(Collectors.toMap(locker -> cabinetKey(locker.getGroupId(), locker.getCabinetId()), locker -> locker, (a, b) -> a));

        int updated = 0;
        for (int i = 0; i < deviceCabinets.size(); i++) {
            JSONObject item = deviceCabinets.getJSONObject(i);
            if (item == null) {
                continue;
            }
            Locker locker = localMap.get(cabinetKey(item.getInteger("groupId"), item.getInteger("cabinetId")));
            if (locker == null) {
                continue;
            }
            LambdaUpdateWrapper<Locker> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(Locker::getId, locker.getId())
                    .set(Locker::getStatus, item.getInteger("status"))
                    .set(Locker::getType, item.getInteger("type"))
                    .set(Locker::getUserId, normalizeUserId(item.getString("userId")))
                    .set(Locker::getStartTimestamp, normalizeTimestamp(item.getLong("startTimestamp")))
                    .set(Locker::getEndTimestamp, normalizeTimestamp(item.getLong("endTimestamp")))
                    .set(Locker::getDoorOpen, item.getInteger("doorOpen"));
            this.update(updateWrapper);
            updated++;
        }
        return updated;
    }

    public void syncLockerModelToDeviceAfterCommitIfOnline(Long deviceId, Long lockerId, String operation) {
        Device device = deviceDao.selectById(deviceId);
        if (device != null && Integer.valueOf(1).equals(device.getOnlineStatus())) {
            Runnable syncTask = () -> syncLockerModelToDevice(deviceId);
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        syncTask.run();
                    }
                });
            } else {
                syncTask.run();
            }
        } else {
            log.warn("device offline, cabinet {} saved locally. deviceId={}, lockerId={}", operation, deviceId, lockerId);
        }
    }

    public void deleteCabinetsAfterCommitIfOnline(Long deviceId, JSONArray cabinets, String operation) {
        Device device = deviceDao.selectById(deviceId);
        if (device != null && Integer.valueOf(1).equals(device.getOnlineStatus())) {
            Runnable syncTask = () -> deviceAdapterService.deleteCabinets(device.getDeviceNo(), cabinets);
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        syncTask.run();
                    }
                });
            } else {
                syncTask.run();
            }
        } else {
            log.warn("device offline, cabinet {} saved locally. deviceId={}", operation, deviceId);
        }
    }

    private JSONArray toCabinetArray(List<Locker> lockers, Map<Long, DeviceChannel> channelMap) {
        JSONArray array = new JSONArray();
        for (Locker locker : lockers) {
            array.add(toCabinetJson(locker, channelMap));
        }
        return array;
    }

    private JSONObject toCabinetJson(Locker locker, Map<Long, DeviceChannel> channelMap) {
        JSONObject obj = new JSONObject();
        obj.put("groupId", resolveGroupId(locker, channelMap));
        obj.put("groupName", resolveGroupName(locker, channelMap));
        obj.put("cabinetId", resolveCabinetId(locker));
        obj.put("cabinetName", resolveCabinetName(locker));
        obj.put("row", locker.getRow() == null ? resolveGroupId(locker, channelMap) : locker.getRow());
        obj.put("col", locker.getCol() == null ? resolveCabinetId(locker) : locker.getCol());
        obj.put("status", locker.getStatus() == null ? 1 : locker.getStatus());
        obj.put("type", locker.getType() == null ? 2 : locker.getType());
        obj.put("userId", StringUtils.hasText(locker.getUserId()) ? locker.getUserId() : "");
        obj.put("startTimestamp", locker.getStartTimestamp() == null ? 0 : locker.getStartTimestamp());
        obj.put("endTimestamp", locker.getEndTimestamp() == null ? 0 : locker.getEndTimestamp());
        obj.put("doorOpen", locker.getDoorOpen() == null ? 0 : locker.getDoorOpen());
        return obj;
    }

    private Integer resolveGroupId(Locker locker, Map<Long, DeviceChannel> channelMap) {
        if (locker.getGroupId() != null) {
            return locker.getGroupId();
        }
        DeviceChannel channel = locker.getChannelId() == null ? null : channelMap.get(locker.getChannelId());
        if (channel != null && channel.getChannelNo() != null) {
            return channel.getChannelNo();
        }
        return locker.getChannelId() == null ? 1 : locker.getChannelId().intValue();
    }

    private String resolveGroupName(Locker locker, Map<Long, DeviceChannel> channelMap) {
        if (locker.getGroupName() != null) {
            return locker.getGroupName();
        }
        DeviceChannel channel = locker.getChannelId() == null ? null : channelMap.get(locker.getChannelId());
        if (channel != null && channel.getChannelName() != null) {
            return channel.getChannelName();
        }
        return "Group " + resolveGroupId(locker, channelMap);
    }

    private Integer resolveCabinetId(Locker locker) {
        if (locker.getCabinetId() != null) {
            return locker.getCabinetId();
        }
        return 1;
    }

    private String resolveCabinetName(Locker locker) {
        if (locker.getCabinetName() != null) {
            return locker.getCabinetName();
        }
        if (locker.getLockerNo() != null) {
            return locker.getLockerNo();
        }
        return resolveCabinetId(locker).toString();
    }

    private String cabinetKey(Integer groupId, Integer cabinetId) {
        return groupId + ":" + cabinetId;
    }

    private String normalizeUserId(String value) {
        String text = value == null ? "" : value.trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        return text;
    }

    private Long normalizeTimestamp(Long value) {
        return value == null || value <= 0 ? null : value;
    }
}
