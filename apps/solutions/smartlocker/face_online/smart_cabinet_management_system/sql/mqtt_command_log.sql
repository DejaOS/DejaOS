CREATE TABLE IF NOT EXISTS sys_mqtt_command_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  create_time DATETIME NULL,
  update_time DATETIME NULL,
  create_by VARCHAR(64) NULL,
  update_by VARCHAR(64) NULL,
  topic VARCHAR(255) NULL,
  direction VARCHAR(16) NULL,
  device_sn VARCHAR(64) NULL,
  command_time DATETIME NULL,
  payload LONGTEXT NULL,
  INDEX idx_mqtt_log_device_time (device_sn, command_time),
  INDEX idx_mqtt_log_direction_time (direction, command_time)
);
