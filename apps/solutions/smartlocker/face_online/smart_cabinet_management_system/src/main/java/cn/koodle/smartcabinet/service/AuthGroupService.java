package cn.koodle.smartcabinet.service;

import cn.hutool.core.collection.CollUtil;
import cn.koodle.smartcabinet.convert.AuthGroupConvert;
import cn.koodle.smartcabinet.dao.AuthGroupDao;
import cn.koodle.smartcabinet.dao.AuthGroupDeviceDao;
import cn.koodle.smartcabinet.dao.AuthGroupUserDao;
import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.entity.AuthGroup;
import cn.koodle.smartcabinet.entity.AuthGroupDevice;
import cn.koodle.smartcabinet.entity.AuthGroupUser;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupAssignDTO;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupDTO;
import cn.koodle.smartcabinet.model.admin.dto.AuthGroupQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.AuthGroupVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthGroupService extends ServiceImpl<AuthGroupDao, AuthGroup> {

    private final AuthGroupConvert authGroupConvert;
    private final AuthGroupUserDao groupEmployeeDao;
    private final AuthGroupDeviceDao groupDeviceDao;

    // 注入设备同步服务
    private final DeviceSyncService deviceSyncService;
    private final DeviceDao deviceDao;

    /**
     * 分页查询权限组
     */
    public IPage<AuthGroupVO> getPageVO(AuthGroupQueryDTO query) {
        Page<AuthGroup> page = new Page<>(query.getPageNo(), query.getPageSize());

        LambdaQueryWrapper<AuthGroup> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getGroupName()), AuthGroup::getGroupName, query.getGroupName())
                .like(StringUtils.hasText(query.getDescription()), AuthGroup::getDescription, query.getDescription())
                .eq(query.getStatus() != null, AuthGroup::getStatus, query.getStatus())
                .orderByDesc(AuthGroup::getCreateTime);

        Page<AuthGroup> resultPage = this.page(page, wrapper);
        if (CollectionUtils.isEmpty(resultPage.getRecords())) {
            return resultPage.convert(authGroupConvert::toVO);
        }

        // --- 批量统计关联数量 ---
        List<Long> groupIds = resultPage.getRecords().stream().map(AuthGroup::getId).collect(Collectors.toList());

        // 1. 统计每个组有多少人
        QueryWrapper<AuthGroupUser> empQuery = new QueryWrapper<>();
        empQuery.select("group_id", "count(*) as total").in("group_id", groupIds).groupBy("group_id");
        Map<Long, Long> empCountMap = groupEmployeeDao.selectMaps(empQuery).stream()
                .collect(Collectors.toMap(m -> toLong(m.get("group_id")), m -> toLong(m.get("total"))));

        // 2. 统计每个组有多少设备
        QueryWrapper<AuthGroupDevice> devQuery = new QueryWrapper<>();
        devQuery.select("group_id", "count(*) as total").in("group_id", groupIds).groupBy("group_id");
        Map<Long, Long> devCountMap = groupDeviceDao.selectMaps(devQuery).stream()
                .collect(Collectors.toMap(m -> toLong(m.get("group_id")), m -> toLong(m.get("total"))));

        return resultPage.convert(entity -> {
            AuthGroupVO vo = authGroupConvert.toVO(entity);
            vo.setUserCount(empCountMap.getOrDefault(entity.getId(), 0L));
            vo.setDeviceCount(devCountMap.getOrDefault(entity.getId(), 0L));
            return vo;
        });
    }

    /**
     * 新增/修改
     * (非权限分配类操作，保持简单，暂不触发 USER/FACE 同步)
     */
    public boolean saveOrUpdateGroup(AuthGroupDTO dto) {
        AuthGroup entity = authGroupConvert.toEntity(dto);
        if (entity.getId() == null && entity.getStatus() == null) {
            entity.setStatus(1); // 默认启用
        }
        return this.saveOrUpdate(entity);
    }

    /**
     * 删除权限组
     * (这是明确的变更操作，必须同步)
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean removeGroup(Long id) {
        // 1. 删除前先查询该组关联的设备
        List<String> affectedDeviceSns = deviceDao.selectDeviceNosByGroupId(id);

        // 2. 删除组及关联
        this.removeById(id);
        groupEmployeeDao.delete(new LambdaQueryWrapper<AuthGroupUser>().eq(AuthGroupUser::getGroupId, id));
        groupDeviceDao.delete(new LambdaQueryWrapper<AuthGroupDevice>().eq(AuthGroupDevice::getGroupId, id));

        // 3. 触发同步
        if (CollUtil.isNotEmpty(affectedDeviceSns)) {
            deviceSyncService.markDevicesDirty(affectedDeviceSns);
        }

        return true;
    }

    /**
     * 分配人员
     * 1. 严格比对新旧人员ID集合。
     * 2. 只有 ID 集合发生变化时，才更新数据库并触发同步。
     * 3. 避免“空保存”导致设备标记为脏，但计算出的 Diff 为空，从而卡死。
     */
    @Transactional(rollbackFor = Exception.class)
    public void assignUsers(AuthGroupAssignDTO dto) {
        Long groupId = dto.getGroupId();

        // 1. 获取数据库中旧的人员ID集合
        Set<Long> oldEmpIds = groupEmployeeDao.selectList(new LambdaQueryWrapper<AuthGroupUser>().eq(AuthGroupUser::getGroupId, groupId)).stream().map(AuthGroupUser::getUserId).collect(Collectors.toSet());

        // 2. 获取提交的新人员ID集合
        Set<Long> newEmpIds = new HashSet<>();
        if (!CollectionUtils.isEmpty(dto.getTargetIds())) {
            newEmpIds.addAll(dto.getTargetIds());
        }

        // 3. 如果完全一致，直接返回，不做任何操作
        if (oldEmpIds.equals(newEmpIds)) {
            return;
        }

        // 4. 执行更新
        groupEmployeeDao.delete(new LambdaQueryWrapper<AuthGroupUser>().eq(AuthGroupUser::getGroupId, groupId));
        if (!CollectionUtils.isEmpty(dto.getTargetIds())) {
            for (Long empId : dto.getTargetIds()) {
                groupEmployeeDao.insert(new AuthGroupUser(groupId, empId));
            }
        }

        // 5. 触发同步：人员变了，该组下的所有设备都需要更新权限
        List<String> deviceSns = deviceDao.selectDeviceNosByGroupId(groupId);
        if (CollUtil.isNotEmpty(deviceSns)) {
            deviceSyncService.markDevicesDirty(deviceSns);
        }
    }

    /**
     * 分配设备
     * 逻辑修正：
     * 1. 严格比对新旧设备ID集合。
     * 2. 只有设备集合发生变化时才操作。
     * 3. 【重要】只对“新增进组”和“移出组”的设备触发同步。
     * 对于“一直在组里没动”的设备，因为组内人员没变，它的权限集也没变，
     * 如果强行标记它，Diff 计算结果会为空，导致死循环。
     */
    @Transactional(rollbackFor = Exception.class)
    public void assignDevices(AuthGroupAssignDTO dto) {
        Long groupId = dto.getGroupId();

        // 1. 获取旧设备ID集合
        Set<Long> oldDevIds = groupDeviceDao.selectList(new LambdaQueryWrapper<AuthGroupDevice>().eq(AuthGroupDevice::getGroupId, groupId)).stream().map(AuthGroupDevice::getDeviceId).collect(Collectors.toSet());

        // 2. 获取新设备ID集合
        Set<Long> newDevIds = new HashSet<>();
        if (!CollectionUtils.isEmpty(dto.getTargetIds())) {
            newDevIds.addAll(dto.getTargetIds());
        }

        // 3. 比对集合：无变化则直接返回
        if (oldDevIds.equals(newDevIds)) {
            return;
        }

        // 4. 执行更新
        groupDeviceDao.delete(new LambdaQueryWrapper<AuthGroupDevice>().eq(AuthGroupDevice::getGroupId, groupId));
        if (!CollectionUtils.isEmpty(dto.getTargetIds())) {
            for (Long devId : dto.getTargetIds()) {
                groupDeviceDao.insert(new AuthGroupDevice(groupId, devId));
            }
        }

        // 5. 计算需要同步的设备 (差集)
        // 只有 真正受影响 的设备才需要通知，交集部分(Intersection)不需要通知
        Set<Long> affectedDevIds = new HashSet<>();

        // 5.1 找出被移除的设备 (Old - New) -> 需要同步以删除权限
        affectedDevIds.addAll(subtract(oldDevIds, newDevIds));

        // 5.2 找出新加入的设备 (New - Old) -> 需要同步以拉取权限
        affectedDevIds.addAll(subtract(newDevIds, oldDevIds));

        // 6. 触发同步
        if (CollUtil.isNotEmpty(affectedDevIds)) {
            List<Device> devices = deviceDao.selectByIds(affectedDevIds);
            if (CollUtil.isNotEmpty(devices)) {
                List<String> sns = devices.stream().map(Device::getDeviceNo).collect(Collectors.toList());
                deviceSyncService.markDevicesDirty(sns);
            }
        }
    }

    /**
     * 辅助方法：计算差集 (set1 - set2)
     */
    private Set<Long> subtract(Set<Long> set1, Set<Long> set2) {
        Set<Long> result = new HashSet<>(set1);
        result.removeAll(set2);
        return result;
    }

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    public List<Long> getAssociatedEmployeeIds(Long groupId) {
        return groupEmployeeDao.selectList(new LambdaQueryWrapper<AuthGroupUser>().eq(AuthGroupUser::getGroupId, groupId).select(AuthGroupUser::getUserId)).stream().map(AuthGroupUser::getUserId).collect(Collectors.toList());
    }

    public List<Long> getAssociatedDeviceIds(Long groupId) {
        return groupDeviceDao.selectList(new LambdaQueryWrapper<AuthGroupDevice>().eq(AuthGroupDevice::getGroupId, groupId).select(AuthGroupDevice::getDeviceId)).stream().map(AuthGroupDevice::getDeviceId).collect(Collectors.toList());
    }
}
