package cn.koodle.smartcabinet.service;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.crypto.digest.MD5;
import cn.koodle.smartcabinet.common.utils.ThreadManager;
import cn.koodle.smartcabinet.dao.AuthGroupDeviceDao;
import cn.koodle.smartcabinet.dao.AuthGroupUserDao;
import cn.koodle.smartcabinet.dao.DeviceDao;
import cn.koodle.smartcabinet.dao.DevicePermissionSnapshotDao;
import cn.koodle.smartcabinet.dao.DeviceSyncStatusDao;
import cn.koodle.smartcabinet.dao.UserDao;
import cn.koodle.smartcabinet.config.WebConfig;
import cn.koodle.smartcabinet.entity.AuthGroupDevice;
import cn.koodle.smartcabinet.entity.AuthGroupUser;
import cn.koodle.smartcabinet.entity.Device;
import cn.koodle.smartcabinet.entity.DevicePermissionSnapshot;
import cn.koodle.smartcabinet.entity.DeviceSyncStatus;
import cn.koodle.smartcabinet.entity.User;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceSyncService {

    private final DeviceDao deviceDao;
    private final DeviceSyncStatusDao syncStatusDao;
    private final DevicePermissionSnapshotDao snapshotDao;
    private final UserDao userDao;
    private final AuthGroupDeviceDao authGroupDeviceDao;
    private final AuthGroupUserDao authGroupUserDao;
    private final DeviceAdapterService deviceAdapterService;

    private final Map<String, Boolean> syncLocks = new ConcurrentHashMap<>();

    @Value("${app.file.base-url:}")
    private String fileBaseUrl;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @Transactional(rollbackFor = Exception.class)
    public void markDevicesDirty(List<String> deviceSns) {
        if (CollUtil.isEmpty(deviceSns)) {
            return;
        }
        for (String sn : deviceSns) {
            DeviceSyncStatus status = syncStatusDao.selectById(sn);
            if (status == null) {
                status = new DeviceSyncStatus().setDeviceSn(sn).setUpdateTime(LocalDateTime.now());
            }
            status.setNeedSyncUser(true);
            status.setUpdateTime(LocalDateTime.now());
            syncStatusDao.insertOrUpdate(status);
        }
    }

    @Scheduled(fixedDelay = 10000)
    public void scheduleDeviceSync() {
        List<DeviceSyncStatus> dirtyStatuses = syncStatusDao.selectList(new LambdaQueryWrapper<DeviceSyncStatus>().eq(DeviceSyncStatus::getNeedSyncUser, true));
        for (DeviceSyncStatus status : dirtyStatuses) {
            String deviceNo = status.getDeviceSn();
            if (Device.OFFLINE == deviceAdapterService.getDeviceOnline(deviceNo)) {
                continue;
            }
            if (syncLocks.putIfAbsent(deviceNo, true) == null) {
                ThreadManager.getInstance().getExecutor().execute(() -> {
                    try {
                        processUserDiffSync(deviceNo);
                    } catch (Exception e) {
                        log.error("device {} user diff sync failed: {}", deviceNo, e.getMessage());
                    } finally {
                        syncLocks.remove(deviceNo);
                    }
                });
            }
        }
    }

    private void processUserDiffSync(String deviceNo) {
        Device device = deviceDao.selectOne(new LambdaQueryWrapper<Device>().eq(Device::getDeviceNo, deviceNo));
        if (device == null) {
            return;
        }

        List<User> targetUsers = findAuthorizedUsers(device.getId()).stream()
                .filter(user -> StringUtils.hasText(user.getUserId()))
                .collect(Collectors.toList());
        Set<Long> targetDbUserIds = targetUsers.stream().map(User::getId).collect(Collectors.toSet());

        List<DevicePermissionSnapshot> snapshots = snapshotDao.selectList(new LambdaQueryWrapper<DevicePermissionSnapshot>().eq(DevicePermissionSnapshot::getDeviceSn, deviceNo));
        Map<Long, DevicePermissionSnapshot> snapMap = snapshots.stream().collect(Collectors.toMap(DevicePermissionSnapshot::getUserId, s -> s));

        List<User> toUpsert = new ArrayList<>();
        List<Long> snapshotsToDelete = new ArrayList<>();
        List<String> mqttUserIdsToDelete = new ArrayList<>();

        for (User user : targetUsers) {
            DevicePermissionSnapshot snap = snapMap.get(user.getId());
            if (snap != null && StringUtils.hasText(snap.getMqttUserId()) && !Objects.equals(snap.getMqttUserId(), user.getUserId())) {
                mqttUserIdsToDelete.add(snap.getMqttUserId());
            }
            if (snap == null || !calculateMd5(user).equals(snap.getDataMd5())) {
                toUpsert.add(user);
            }
        }

        for (DevicePermissionSnapshot snap : snapshots) {
            if (!targetDbUserIds.contains(snap.getUserId())) {
                snapshotsToDelete.add(snap.getUserId());
                if (StringUtils.hasText(snap.getMqttUserId())) {
                    mqttUserIdsToDelete.add(snap.getMqttUserId());
                }
            }
        }

        List<String> distinctDeleteIds = mqttUserIdsToDelete.stream().filter(StringUtils::hasText).distinct().collect(Collectors.toList());
        if (!distinctDeleteIds.isEmpty()) {
            deviceAdapterService.deleteWhitelist(deviceNo, distinctDeleteIds);
        }
        if (!snapshotsToDelete.isEmpty()) {
            snapshotDao.delete(new LambdaQueryWrapper<DevicePermissionSnapshot>().eq(DevicePermissionSnapshot::getDeviceSn, deviceNo).in(DevicePermissionSnapshot::getUserId, snapshotsToDelete));
        }

        if (!toUpsert.isEmpty()) {
            List<d1.device.vgsdk.model.User> mqttUpserts = toUpsert.stream().map(this::toMqttUser).collect(Collectors.toList());
            for (int i = 0; i < mqttUpserts.size(); i += 50) {
                deviceAdapterService.upsertWhitelist(deviceNo, mqttUpserts.subList(i, Math.min(i + 50, mqttUpserts.size())));
            }
            for (User user : toUpsert) {
                saveOrUpdateSnapshot(deviceNo, user);
            }
        }

        DeviceSyncStatus status = syncStatusDao.selectById(deviceNo);
        if (status != null) {
            status.setNeedSyncUser(false);
            status.setUpdateTime(LocalDateTime.now());
            syncStatusDao.updateById(status);
        }
        log.info("device {} user diff sync completed", deviceNo);
    }

    private void saveOrUpdateSnapshot(String deviceNo, User user) {
        DevicePermissionSnapshot snap = snapshotDao.selectOne(new LambdaQueryWrapper<DevicePermissionSnapshot>()
                .eq(DevicePermissionSnapshot::getDeviceSn, deviceNo)
                .eq(DevicePermissionSnapshot::getUserId, user.getId()));
        if (snap == null) {
            snap = new DevicePermissionSnapshot();
            snap.setDeviceSn(deviceNo);
            snap.setUserId(user.getId());
            snap.setCreateTime(LocalDateTime.now());
        }
        snap.setMqttUserId(user.getUserId());
        snap.setUsername(user.getName());
        snap.setDataMd5(calculateMd5(user));
        snap.setUpdateTime(LocalDateTime.now());
        snapshotDao.insertOrUpdate(snap);
    }

    private String calculateMd5(User user) {
        String raw = user.getId() + "_" + user.getUserId() + "_" + user.getName() + "_" + user.getRole() + "_"
                + buildFileUrl(user.getFaceImageUrl()) + "_" + user.getFaceImageMd5() + "_"
                + user.getPhone() + "_" + user.getPin();
        return MD5.create().digestHex(raw);
    }

    private d1.device.vgsdk.model.User toMqttUser(User user) {
        JSONObject extra = new JSONObject();
        String fullUrl = buildFileUrl(user.getFaceImageUrl());
        extra.put("faceImageUrl", fullUrl);
        extra.put("faceImageMd5", StringUtils.hasText(user.getFaceImageMd5()) ? user.getFaceImageMd5() : "");
        extra.put("phone", StringUtils.hasText(user.getPhone()) ? user.getPhone() : "");
        extra.put("pin", StringUtils.hasText(user.getPin()) ? user.getPin() : "");
        extra.put("role", user.getRole() == null ? 0 : user.getRole());

        String name = StringUtils.hasText(user.getName()) ? user.getName() : user.getUserId();
        return new d1.device.vgsdk.model.User(user.getUserId(), name, extra.toJSONString());
    }

    private String buildFileUrl(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) {
            return "";
        }
        String trimmedUrl = fileUrl.trim();
        if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
            return trimmedUrl;
        }

        String path = trimmedUrl.startsWith("/") ? trimmedUrl : "/" + trimmedUrl;
        String normalizedContextPath = normalizeContextPath();
        if (path.startsWith(WebConfig.ACCESS_PREFIX) && StringUtils.hasText(normalizedContextPath)) {
            path = normalizedContextPath + path;
        }

        String baseUrl = normalizeBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            return path;
        }
        if (StringUtils.hasText(normalizedContextPath) && baseUrl.endsWith(normalizedContextPath) && path.startsWith(normalizedContextPath)) {
            path = path.substring(normalizedContextPath.length());
        }
        return baseUrl + path;
    }

    private String normalizeBaseUrl() {
        if (!StringUtils.hasText(fileBaseUrl)) {
            return "";
        }
        String baseUrl = fileBaseUrl.trim();
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl;
    }

    private String normalizeContextPath() {
        if (!StringUtils.hasText(contextPath) || "/".equals(contextPath.trim())) {
            return "";
        }
        String value = contextPath.trim();
        if (!value.startsWith("/")) {
            value = "/" + value;
        }
        while (value.endsWith("/") && value.length() > 1) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private List<User> findAuthorizedUsers(Long deviceId) {
        List<Long> groupIds = authGroupDeviceDao.selectList(new LambdaQueryWrapper<AuthGroupDevice>().eq(AuthGroupDevice::getDeviceId, deviceId))
                .stream().map(AuthGroupDevice::getGroupId).collect(Collectors.toList());
        if (CollUtil.isEmpty(groupIds)) {
            return Collections.emptyList();
        }

        List<Long> userIds = authGroupUserDao.selectList(new LambdaQueryWrapper<AuthGroupUser>().in(AuthGroupUser::getGroupId, groupIds))
                .stream().map(AuthGroupUser::getUserId).distinct().collect(Collectors.toList());
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyList();
        }
        return userDao.selectByIds(userIds);
    }
}
