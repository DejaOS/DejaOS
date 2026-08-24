CREATE TABLE IF NOT EXISTS sys_user_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  parent_id INTEGER,
  name TEXT,
  order_num INTEGER,
  remark TEXT
);

CREATE TABLE IF NOT EXISTS sys_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  user_id TEXT,
  name TEXT,
  phone TEXT,
  pin TEXT,
  group_id INTEGER,
  face_image_url TEXT,
  face_image_md5 TEXT,
  role INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_id ON sys_user(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_id ON sys_user(group_id);

CREATE TABLE IF NOT EXISTS sys_auth_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  group_name TEXT,
  description TEXT,
  status INTEGER
);

CREATE TABLE IF NOT EXISTS sys_auth_group_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  user_id INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_group_user ON sys_auth_group_user(group_id, user_id);

CREATE TABLE IF NOT EXISTS sys_auth_group_device (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  device_id INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_group_device ON sys_auth_group_device(group_id, device_id);

CREATE TABLE IF NOT EXISTS sys_device (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  device_no TEXT,
  device_name TEXT,
  ip_address TEXT,
  version TEXT,
  remark TEXT,
  last_active_time TEXT,
  online_status INTEGER,
  config_json TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_device_no ON sys_device(device_no);

CREATE TABLE IF NOT EXISTS sys_device_channel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  device_id INTEGER,
  channel_no INTEGER,
  channel_name TEXT,
  locker_count INTEGER,
  sort INTEGER,
  remark TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_device_channel_no ON sys_device_channel(device_id, channel_no);

CREATE TABLE IF NOT EXISTS sys_locker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  device_id INTEGER,
  channel_id INTEGER,
  group_id INTEGER,
  group_name TEXT,
  locker_no TEXT,
  cabinet_id INTEGER,
  cabinet_name TEXT,
  row INTEGER,
  col INTEGER,
  type INTEGER,
  user_id TEXT,
  status INTEGER,
  bind_start_time TEXT,
  bind_end_time TEXT,
  start_timestamp INTEGER,
  end_timestamp INTEGER,
  door_open INTEGER DEFAULT 0,
  remark TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_locker_device_group_cabinet ON sys_locker(device_id, group_id, cabinet_id);
CREATE INDEX IF NOT EXISTS idx_locker_device ON sys_locker(device_id);
CREATE INDEX IF NOT EXISTS idx_locker_channel ON sys_locker(channel_id);
CREATE INDEX IF NOT EXISTS idx_locker_user ON sys_locker(user_id);

CREATE TABLE IF NOT EXISTS sys_device_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  device_id INTEGER,
  device_no TEXT,
  device_name TEXT,
  ip_address TEXT,
  serial_no TEXT,
  event_id TEXT,
  event_type TEXT,
  user_id TEXT,
  group_id INTEGER,
  cabinet_id INTEGER,
  event_timestamp INTEGER,
  event_time TEXT,
  message TEXT,
  extra TEXT,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_event_device_time ON sys_device_event(device_id, event_time);
CREATE INDEX IF NOT EXISTS idx_device_event_type_time ON sys_device_event(event_type, event_time);
CREATE UNIQUE INDEX IF NOT EXISTS uk_device_event_id ON sys_device_event(event_id);

CREATE TABLE IF NOT EXISTS sys_device_permission_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  device_sn TEXT,
  user_id INTEGER,
  mqtt_user_id TEXT,
  username TEXT,
  data_md5 TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_permission_snapshot ON sys_device_permission_snapshot(device_sn, user_id);

CREATE TABLE IF NOT EXISTS sys_device_sync_status (
  device_sn TEXT PRIMARY KEY,
  need_sync_user INTEGER,
  update_time TEXT
);

CREATE TABLE IF NOT EXISTS sys_mqtt_command_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time TEXT,
  update_time TEXT,
  create_by TEXT,
  update_by TEXT,
  topic TEXT,
  direction TEXT,
  device_sn TEXT,
  command_time TEXT,
  payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_mqtt_log_device_time ON sys_mqtt_command_log(device_sn, command_time);
CREATE INDEX IF NOT EXISTS idx_mqtt_log_direction_time ON sys_mqtt_command_log(direction, command_time);
