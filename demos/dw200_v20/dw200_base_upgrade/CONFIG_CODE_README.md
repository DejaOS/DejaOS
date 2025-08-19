# 配置码解析和保存功能说明

## 功能概述

本系统实现了配置码的解析、验证和保存功能，支持通过配置码快速设置设备网络参数。UI界面采用现代化设计，提供良好的用户体验。

## UI设计特点

- **现代化界面**：采用卡片式设计，白色背景配合蓝色边框
- **优雅配色**：深蓝色背景配合白色卡片，绿色保存按钮
- **圆角设计**：所有元素采用圆角设计，提升视觉体验
- **清晰布局**：合理的间距和字体大小，提升可读性
- **响应式交互**：根据网络类型和DHCP设置动态显示/隐藏相关字段
- **标准输入方式**：使用系统标准输入框，支持键盘输入

## 配置码格式

配置码采用以下格式：
```
___VBAR_CONFIG_V1.1.0___{JSON配置数据}--校验码
```

### 示例配置码
```
___VBAR_CONFIG_V1.1.0___{"net_type":2,"ssid":"123","psk":"4566"}--abc123
```

### 配置数据合并示例

假设现有配置文件包含：
```json
{
  "type": 1,
  "ssid": "old_wifi",
  "psk": "old_password",
  "mqttAddr": "mqtt.example.com:1883",
  "username": "user"
}
```

当接收到配置码 `{"net_type":2,"ssid":"new_wifi"}` 时，最终保存的配置将是：
```json
{
  "type": 2,                    // 更新：net_type -> type
  "ssid": "new_wifi",           // 更新：新的ssid
  "psk": "old_password",        // 保持：原有psk不变
  "mqttAddr": "mqtt.example.com:1883",  // 保持：原有mqttAddr不变
  "username": "user"            // 保持：原有username不变
}
```

注意：只更新配置码中传入的字段，其他原有字段保持不变。

## 支持的配置参数

| 参数名 | 说明 | 类型 | 示例值 |
|--------|------|------|--------|
| net_type | 网络类型 | number | 1:以太网, 2:WiFi |
| ssid | WiFi名称 | string | "MyWiFi" |
| psk | WiFi密码 | string | "password123" |
| dhcp | DHCP设置 | number | 1:自动, 2:手动 |
| mqttAddr | MQTT服务器地址 | string | "mqtt.example.com:1883" |
| username | 用户名 | string | "user" |
| password | 密码 | string | "pass" |
| ip | IP地址 | string | "192.168.1.100" |
| mask | 子网掩码 | string | "255.255.255.0" |
| gateway | 网关地址 | string | "192.168.1.1" |
| dns | DNS服务器 | string | "8.8.8.8" |

## 实现流程

### 1. 配置码接收和解析
- 位置：`src/service/codeService.js`
- 函数：`codeService.code()`
- 功能：接收配置码，解析JSON数据

### 2. 配置码验证
- 函数：`checkConfigCode()`
- 功能：验证配置码的完整性和正确性

### 3. 配置数据构建
- 函数：`buildConfigData()`
- 功能：将解析的JSON数据转换为标准配置格式
- 特性：直接根据传入数据动态生成配置，只包含传入的字段

### 4. 配置保存
- 保存路径：`/app/code/src/config.json`
- 方法：`updateConfigFile()`
- 功能：只更新传入的字段，保留原有配置数据

## 日志记录

系统会记录以下关键日志：
- `[codeService] configCode: 解析配置码` - 配置码解析结果
- `[codeService] configCode: 配置保存成功` - 配置保存成功
- `[codeService] configCode: 配置保存失败` - 配置保存失败

## 错误处理

系统包含完善的错误处理机制：
- 配置码格式验证
- JSON解析错误处理
- 文件保存错误处理

## 测试方法

可以使用提供的测试文件验证功能：

```bash
node test_config_code.js
```

## 注意事项

1. 配置码必须包含正确的校验码
2. 配置文件保存在 `/app/code/src/config.json`
3. 配置更新后可以选择重启设备应用新配置
4. 所有配置都直接从JSON配置文件读取：
   - 网络配置：type, dhcp, ssid, psk, ip, mask, gateway, dns
   - MQTT配置：mqttAddr, username, password
   - UI界面：直接从配置文件读取并显示当前配置
   - 如果配置文件中mqttAddr为空，系统会自动使用默认地址 `mqtt://123.57.175.193:61613` 