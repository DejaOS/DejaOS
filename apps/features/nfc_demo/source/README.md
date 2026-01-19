# NFC Demo 应用程序说明

这是一个基于 DejaOS 构建的 NFC 卡片读取演示应用。它展示了如何在多线程环境下进行硬件交互、UI 管理以及数据处理。

## 应用截图

| 状态           | 预览图                                                                                                                                                                                                    |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **未放置卡片** | ![Home Page No Card](https://raw.githubusercontent.com/DejaOS/DejaOS/refs/heads/main/apps/features/nfc_demo/screenshot/home1.png) <br> _应用启动后的初始界面，显示“No Card”状态。_                        |
| **检测到卡片** | ![Home Page Card Present](https://raw.githubusercontent.com/DejaOS/DejaOS/refs/heads/main/apps/features/nfc_demo/screenshot/home2.png) <br> _放置卡片后，界面实时更新卡片 ID、类型、SAK 等信息。_         |
| **读取数据**   | ![Block Data Page](https://raw.githubusercontent.com/DejaOS/DejaOS/refs/heads/main/apps/features/nfc_demo/screenshot/blockData.png) <br> _点击“Read Blocks”后，展示卡片前 6 个数据块的原始十六进制内容。_ |

---

## 主要功能

- **实时感应**：自动监测 NFC 卡片的靠近与离开。
- **信息提取**：显示卡片的 UID、类型（如 Mifare One）、SAK 值及其 ID 长度。
- **蜂鸣器反馈**：成功检卡时，硬件蜂鸣器会发出简短提示音。
- **扇区读取**：通过 RPC 调用，读取并格式化展示 M1 卡的数据块内容。

## 项目结构

应用采用多线程（Worker）架构，保证了 UI 的流畅性与硬件操作的独立性：

- `src/main.js`: **主线程入口**。负责启动 UI 和 NFC 两个子线程。
- `src/uiWorker.js`: **UI 线程**。负责界面渲染、页面切换逻辑及事件循环。
- `src/nfcWorker.js`: **硬件线程**。直接驱动 NFC 芯片，处理卡片轮询，并通过 EventBus 或 RPC 与 UI 线程通信。
- `src/pages/`:
  - `HomePage.js`: 主控面板，展示实时状态。
  - `BlockDataPage.js`: 详情页，处理块数据的 RPC 请求与展示。
- `src/UIManager.js`: 自定义的 UI 管理框架，支持页面注册、生命周期回调及路由跳转。
- `dxmodules/`: 硬件驱动库及核心工具类。

## 核心技术

- **DejaOS UI 系统**：使用 `dxUi` 系列组件构建原生流畅界面。
- **EventBus & RPC**：跨线程的高效通信机制。
- **PWM 驱动**：控制硬件蜂鸣器实现交互反馈。
- **dxNfcCard**：封装了底层的 NFC/M1 卡操作协议。

## 使用说明

1. 启动应用后，主界面显示为红色的“No Card”状态。
2. 将兼容的 NFC 卡片（如 M1 卡）靠近设备的感应区。
3. 听到“嘀”声后，界面会变为绿色并显示卡片信息。
4. 点击“Read Blocks”按钮进入详情页查看数据。

---

> **提示**：本示例是针对 **DW200** 设备设计的，屏幕分辨率为 **480\*320**。大部分界面布局和图片资源均基于此分辨率优化。虽然核心业务逻辑具有跨设备通用性，但若需在其他不同分辨率的设备上运行，则需要进行相应的 UI 适配工作。
>
> 受限于屏幕尺寸，本应用目前仅展示了卡片前 6 个数据块（block）的内容，且未包含修改块数据等写卡功能。
