-- Fitlock v1 protocol schema delta.
-- MyBatis-Plus does not create or migrate tables automatically. Apply this once
-- to the target MySQL database before running the new protocol code.

ALTER TABLE sys_user
  ADD COLUMN pin varchar(32) NULL COMMENT 'Fitlock User.pin' AFTER phone;

ALTER TABLE sys_locker
  ADD COLUMN group_id int NULL COMMENT 'Fitlock Cabinet.groupId' AFTER channel_id,
  ADD COLUMN group_name varchar(100) NULL COMMENT 'Fitlock Cabinet.groupName' AFTER group_id,
  ADD COLUMN cabinet_id int NULL COMMENT 'Fitlock Cabinet.cabinetId' AFTER locker_no,
  ADD COLUMN cabinet_name varchar(100) NULL COMMENT 'Fitlock Cabinet.cabinetName' AFTER cabinet_id,
  ADD COLUMN row int NULL COMMENT 'Fitlock Cabinet.row' AFTER cabinet_name,
  ADD COLUMN col int NULL COMMENT 'Fitlock Cabinet.col' AFTER row,
  ADD COLUMN start_timestamp bigint NULL COMMENT 'Fitlock Cabinet.startTimestamp seconds' AFTER bind_end_time,
  ADD COLUMN end_timestamp bigint NULL COMMENT 'Fitlock Cabinet.endTimestamp seconds' AFTER start_timestamp,
  ADD COLUMN door_open tinyint NULL DEFAULT 0 COMMENT 'Fitlock Cabinet.doorOpen, 0 closed, 1 open' AFTER end_timestamp,
  ADD UNIQUE KEY uk_device_group_cabinet (device_id, group_id, cabinet_id),
  ADD KEY idx_locker_device_group (device_id, group_id),
  ADD KEY idx_locker_device_cabinet (device_id, cabinet_id);

ALTER TABLE sys_locker_record
  ADD COLUMN group_id int NULL COMMENT 'Fitlock access event groupId' AFTER locker_id,
  ADD COLUMN cabinet_id int NULL COMMENT 'Fitlock access event cabinetId' AFTER group_id,
  ADD COLUMN cabinet_name varchar(100) NULL COMMENT 'Fitlock access event cabinetName' AFTER cabinet_id,
  ADD KEY idx_record_device_group_cabinet (device_id, group_id, cabinet_id);
