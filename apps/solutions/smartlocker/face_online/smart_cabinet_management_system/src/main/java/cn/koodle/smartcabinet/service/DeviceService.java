package cn.koodle.smartcabinet.service;

import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.convert.DeviceConvert;
import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.DeviceChannel;
import cn.koodle.smartcabinet.entity.Locker;
import cn.koodle.smartcabinet.model.admin.dto.DeviceDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceImportDTO;
import cn.koodle.smartcabinet.model.admin.dto.DeviceQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceStatsVO;
import cn.koodle.smartcabinet.model.admin.vo.DeviceVO;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeviceService extends ServiceImpl<DeviceDao, Device> {

    private final DeviceConvert deviceConvert;
    private final DeviceSyncService deviceSyncService;
    private final DeviceChannelService deviceChannelService;
    private final LockerService lockerService;
    private final DeviceAdapterService deviceAdapterService;

    @Transactional(rollbackFor = Exception.class)
    public void importDevices(MultipartFile file) throws IOException {
        List<DeviceImportDTO> importList = EasyExcel.read(file.getInputStream()).head(DeviceImportDTO.class).sheet().doReadSync();
        if (importList == null || importList.isEmpty()) {
            throw new ApiException("导入数据为空");
        }

        List<Device> toSaveDevices = new ArrayList<>();
        Set<String> existDeviceNos = this.list(new LambdaQueryWrapper<Device>().select(Device::getDeviceNo))
                .stream()
                .map(Device::getDeviceNo)
                .collect(Collectors.toSet());

        for (DeviceImportDTO dto : importList) {
            if (!StringUtils.hasText(dto.getDeviceNo()) || existDeviceNos.contains(dto.getDeviceNo())) {
                continue;
            }

            Device device = new Device();
            device.setDeviceNo(dto.getDeviceNo());
            device.setDeviceName(dto.getDeviceName());
            device.setIpAddress(dto.getIpAddress());
            device.setVersion(dto.getVersion());
            device.setRemark(dto.getRemark());
            device.setOnlineStatus(deviceAdapterService.getDeviceOnline(dto.getDeviceNo()));

            toSaveDevices.add(device);
            existDeviceNos.add(dto.getDeviceNo());
        }

        if (!toSaveDevices.isEmpty()) {
            this.saveBatch(toSaveDevices);
        }
    }

    public IPage<DeviceVO> getPage(DeviceQueryDTO query) {
        Page<Device> page = new Page<>(query.getPageNo(), query.getPageSize());
        LambdaQueryWrapper<Device> wrapper = new LambdaQueryWrapper<>();

        wrapper.like(StringUtils.hasText(query.getDeviceNo()), Device::getDeviceNo, query.getDeviceNo())
                .like(StringUtils.hasText(query.getDeviceName()), Device::getDeviceName, query.getDeviceName())
                .eq(query.getOnlineStatus() != null, Device::getOnlineStatus, query.getOnlineStatus())
                .orderByDesc(Device::getOnlineStatus)
                .orderByDesc(Device::getCreateTime);

        return this.page(page, wrapper).convert(deviceConvert::toVO);
    }

    public List<Device> getList() {
        return this.list(new LambdaQueryWrapper<Device>()
                .orderByDesc(Device::getOnlineStatus)
                .orderByDesc(Device::getCreateTime));
    }

    public DeviceStatsVO getStats() {
        List<Device> all = this.list();
        long totalCount = all.size();
        long onlineCount = all.stream()
                .filter(d -> deviceAdapterService.getDeviceOnline(d.getDeviceNo()) == Device.ONLINE)
                .count();
        long offlineCount = totalCount - onlineCount;
        long totalSlots = lockerService.count();
        long usedSlots = lockerService.count(new LambdaQueryWrapper<Locker>().eq(Locker::getStatus, 2));

        return DeviceStatsVO.builder()
                .totalCount(totalCount)
                .increaseCount(1L)
                .normalCount(onlineCount)
                .maintenanceCount(offlineCount)
                .onlineCount(onlineCount)
                .offlineCount(offlineCount)
                .totalSlots(totalSlots)
                .usedSlots(usedSlots)
                .build();
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean saveOrUpdateDevice(DeviceDTO dto) {
        Device entity = deviceConvert.toEntity(dto);
        boolean isNew = entity.getId() == null;

        if (!StringUtils.hasText(entity.getDeviceNo())) {
            throw new ApiException("设备编号不能为空");
        }

        LambdaQueryWrapper<Device> check = new LambdaQueryWrapper<>();
        check.eq(Device::getDeviceNo, entity.getDeviceNo()).ne(!isNew, Device::getId, entity.getId());
        if (this.count(check) > 0) {
            throw new ApiException("设备编号 " + entity.getDeviceNo() + " 已存在");
        }

        entity.setOnlineStatus(deviceAdapterService.getDeviceOnline(entity.getDeviceNo()));
        return this.saveOrUpdate(entity);
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean remove(Long id) {
        Device device = getById(id);
        if (device == null) {
            return false;
        }

        long channelCount = deviceChannelService.count(new LambdaQueryWrapper<DeviceChannel>().eq(DeviceChannel::getDeviceId, id));
        if (channelCount > 0) {
            throw new ApiException("该设备下仍有柜组，请先删除柜组后再删除设备");
        }

        long occupiedCount = lockerService.count(new LambdaQueryWrapper<Locker>()
                .eq(Locker::getDeviceId, id)
                .eq(Locker::getStatus, 2));
        if (occupiedCount > 0) {
            throw new ApiException("该设备下有正在使用的柜格，请先清空或解绑后再删除设备");
        }

        lockerService.remove(new LambdaQueryWrapper<Locker>().eq(Locker::getDeviceId, id));
        boolean success = this.removeById(id);
        if (success) {
            deviceSyncService.markDevicesDirty(Collections.singletonList(device.getDeviceNo()));
        }
        return success;
    }

    public Device getByDeviceNo(String deviceNo) {
        if (!StringUtils.hasText(deviceNo)) {
            return null;
        }
        return this.getOne(new LambdaQueryWrapper<Device>().eq(Device::getDeviceNo, deviceNo));
    }

    public void saveConfigJson(String deviceNo, String configJson) {
        Device device = getByDeviceNo(deviceNo);
        if (device == null) {
            throw new ApiException("设备不存在: " + deviceNo);
        }
        device.setConfigJson(configJson);
        this.updateById(device);
    }
}
