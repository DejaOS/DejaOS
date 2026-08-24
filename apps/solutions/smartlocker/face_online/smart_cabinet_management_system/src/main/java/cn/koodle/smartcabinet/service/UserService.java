package cn.koodle.smartcabinet.service;

import cn.hutool.core.collection.CollUtil;
import cn.koodle.smartcabinet.common.exception.ApiException;
import cn.koodle.smartcabinet.convert.UserConvert;
import cn.koodle.smartcabinet.dao.AuthGroupDeviceDao;
import cn.koodle.smartcabinet.dao.AuthGroupUserDao;
import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.dao.LockerDao;
import cn.koodle.smartcabinet.dao.UserDao;
import cn.koodle.smartcabinet.dao.UserGroupDao;
import cn.koodle.smartcabinet.entity.AuthGroupDevice;
import cn.koodle.smartcabinet.entity.AuthGroupUser;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.Locker;
import cn.koodle.smartcabinet.entity.User;
import cn.koodle.smartcabinet.entity.UserGroup;
import cn.koodle.smartcabinet.model.admin.dto.UserDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserImportDTO;
import cn.koodle.smartcabinet.model.admin.dto.UserQueryDTO;
import cn.koodle.smartcabinet.model.admin.vo.UserVO;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService extends ServiceImpl<UserDao, User> {

    private final UserConvert userConvert;
    private final UserGroupDao userGroupDao;
    private final DeviceDao deviceDao;
    private final LockerDao lockerDao;
    private final DeviceSyncService deviceSyncService;
    private final AuthGroupUserDao authGroupUserDao;
    private final AuthGroupDeviceDao authGroupDeviceDao;

    public IPage<UserVO> getPage(UserQueryDTO query) {
        Page<User> page = new Page<>(query.getPageNo(), query.getPageSize());
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getName()), User::getName, query.getName());
        wrapper.like(StringUtils.hasText(query.getPhone()), User::getPhone, query.getPhone());
        wrapper.like(StringUtils.hasText(query.getUserId()), User::getUserId, query.getUserId());
        wrapper.eq(query.getGroupId() != null, User::getGroupId, query.getGroupId());
        if (query.getExcludeDeviceId() != null) {
            wrapper.notInSql(User::getUserId, "SELECT user_id FROM sys_locker WHERE device_id = " + query.getExcludeDeviceId() + " AND user_id IS NOT NULL AND user_id <> ''");
        }
        wrapper.orderByDesc(User::getCreateTime);

        Page<User> userPage = this.page(page, wrapper);
        if (CollectionUtils.isEmpty(userPage.getRecords())) {
            return userPage.convert(userConvert::toVO);
        }

        Set<Long> groupIds = userPage.getRecords().stream().map(User::getGroupId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> groupNameMap = Collections.emptyMap();
        if (!CollectionUtils.isEmpty(groupIds)) {
            groupNameMap = userGroupDao.selectByIds(groupIds).stream().collect(Collectors.toMap(UserGroup::getId, UserGroup::getName));
        }

        Map<Long, String> finalGroupNameMap = groupNameMap;
        return userPage.convert(user -> {
            UserVO vo = userConvert.toVO(user);
            if (user.getGroupId() != null) {
                vo.setGroupName(finalGroupNameMap.get(user.getGroupId()));
            }
            return vo;
        });
    }

    @Transactional(rollbackFor = Exception.class)
    public void importUser(MultipartFile file) throws IOException {
        List<UserImportDTO> importList = EasyExcel.read(file.getInputStream()).head(UserImportDTO.class).sheet().doReadSync();
        if (CollectionUtils.isEmpty(importList)) {
            throw new ApiException("导入数据为空");
        }

        Set<String> importUserIds = new HashSet<>();
        List<String> duplicateInFile = new ArrayList<>();
        for (UserImportDTO dto : importList) {
            if (StringUtils.hasText(dto.getUserId()) && !importUserIds.add(dto.getUserId().trim())) {
                duplicateInFile.add(dto.getUserId());
            }
        }
        if (!duplicateInFile.isEmpty()) {
            throw new ApiException("导入文件中存在重复人员ID: " + duplicateInFile);
        }
        if (!importUserIds.isEmpty()) {
            List<User> existing = this.list(new LambdaQueryWrapper<User>().in(User::getUserId, importUserIds));
            if (!CollectionUtils.isEmpty(existing)) {
                throw new ApiException("以下人员ID已存在，无法导入: " + existing.stream().map(User::getUserId).collect(Collectors.toList()));
            }
        }

        List<UserGroup> allGroups = userGroupDao.selectList(null);
        Map<String, Long> groupMap = allGroups.stream().collect(Collectors.toMap(UserGroup::getName, UserGroup::getId, (v1, v2) -> v1));

        List<User> saveList = new ArrayList<>();
        for (UserImportDTO dto : importList) {
            if (!StringUtils.hasText(dto.getUserId())) {
                continue;
            }
            User user = new User();
            user.setUserId(dto.getUserId().trim());
            user.setName(dto.getName());
            user.setPhone(dto.getPhone());
            user.setPin(dto.getPin());
            user.setRole(0);
            if (StringUtils.hasText(dto.getGroupName())) {
                user.setGroupId(groupMap.get(dto.getGroupName()));
            }
            saveList.add(user);
        }

        if (!CollectionUtils.isEmpty(saveList)) {
            this.saveBatch(saveList);
        }
    }

    public UserVO getDetail(Long id) {
        User user = this.getById(id);
        if (user == null) {
            return null;
        }
        UserVO vo = userConvert.toVO(user);
        if (user.getGroupId() != null) {
            UserGroup group = userGroupDao.selectById(user.getGroupId());
            if (group != null) {
                vo.setGroupName(group.getName());
            }
        }
        return vo;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean remove(Long id) {
        User user = this.getById(id);
        if (user == null) {
            return false;
        }

        Long boundCount = lockerDao.selectCount(new LambdaQueryWrapper<Locker>().eq(Locker::getUserId, user.getUserId()));
        if (boundCount > 0) {
            throw new ApiException("该人员当前绑定了 " + boundCount + " 个柜格，请先在柜格管理中完成解绑操作再删除");
        }

        List<String> deviceNos = deviceDao.selectDeviceNosByUserId(id);
        boolean success = this.removeById(id);
        if (success && !CollectionUtils.isEmpty(deviceNos)) {
            deviceSyncService.markDevicesDirty(deviceNos);
        }
        return success;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean saveOrUpdateUser(UserDTO dto) {
        User entity = userConvert.toEntity(dto);
        boolean isNew = entity.getId() == null;
        if (!StringUtils.hasText(entity.getUserId())) {
            throw new ApiException("人员ID不能为空");
        }
        entity.setUserId(entity.getUserId().trim());
        if (entity.getRole() == null) {
            entity.setRole(0);
        }
        normalizePhoneAndPin(entity);

        LambdaQueryWrapper<User> checkWrapper = new LambdaQueryWrapper<>();
        checkWrapper.eq(User::getUserId, entity.getUserId());
        if (!isNew) {
            checkWrapper.ne(User::getId, entity.getId());
        }
        if (this.count(checkWrapper) > 0) {
            throw new ApiException("人员ID " + entity.getUserId() + " 已存在");
        }

        boolean isInfoChanged = isNew;
        String oldUserId = null;
        if (!isNew) {
            User old = this.getById(entity.getId());
            if (old != null) {
                oldUserId = old.getUserId();
                isInfoChanged = !Objects.equals(old.getName(), entity.getName())
                        || !Objects.equals(old.getUserId(), entity.getUserId())
                        || !Objects.equals(old.getRole(), entity.getRole())
                        || !Objects.equals(old.getPhone(), entity.getPhone())
                        || !Objects.equals(old.getPin(), entity.getPin())
                        || !Objects.equals(old.getFaceImageUrl(), entity.getFaceImageUrl())
                        || !Objects.equals(old.getFaceImageMd5(), entity.getFaceImageMd5());
            }
        }

        boolean success = this.saveOrUpdate(entity);
        if (!success) {
            return false;
        }

        if (!isNew && StringUtils.hasText(oldUserId) && !Objects.equals(oldUserId, entity.getUserId())) {
            lockerDao.update(null, new LambdaUpdateWrapper<Locker>()
                    .eq(Locker::getUserId, oldUserId)
                    .set(Locker::getUserId, entity.getUserId()));
        }
        if (!isNew && isInfoChanged) {
            deviceSyncService.markDevicesDirty(findDeviceSnsByUserId(entity.getId()));
        }
        return true;
    }

    private List<String> findDeviceSnsByUserId(Long userId) {
        List<AuthGroupUser> groupUsers = authGroupUserDao.selectList(new LambdaQueryWrapper<AuthGroupUser>().eq(AuthGroupUser::getUserId, userId));
        if (CollUtil.isEmpty(groupUsers)) {
            return Collections.emptyList();
        }

        List<Long> groupIds = groupUsers.stream().map(AuthGroupUser::getGroupId).collect(Collectors.toList());
        List<AuthGroupDevice> groupDevices = authGroupDeviceDao.selectList(new LambdaQueryWrapper<AuthGroupDevice>().in(AuthGroupDevice::getGroupId, groupIds));
        if (CollUtil.isEmpty(groupDevices)) {
            return Collections.emptyList();
        }

        Set<Long> deviceIds = groupDevices.stream().map(AuthGroupDevice::getDeviceId).collect(Collectors.toSet());
        List<Device> devices = deviceDao.selectByIds(deviceIds);
        return devices.stream().map(Device::getDeviceNo).collect(Collectors.toList());
    }

    private void normalizePhoneAndPin(User user) {
        String phone = StringUtils.hasText(user.getPhone()) ? user.getPhone().trim() : null;
        String pin = StringUtils.hasText(user.getPin()) ? user.getPin().trim() : null;
        if (phone == null && pin != null) {
            throw new ApiException("填写 PIN 码时必须同时填写手机号");
        }
        if (phone != null && !phone.matches("^\\d{11}$")) {
            throw new ApiException("手机号必须是 11 位数字");
        }
        if (phone != null && pin == null) {
            pin = "000000";
        }
        if (pin != null && !pin.matches("^\\d{6}$")) {
            throw new ApiException("PIN 码必须是 6 位数字");
        }
        user.setPhone(phone);
        user.setPin(pin);
    }
}
