---
summary: "供代理使用的相机捕获（iOS/Android 节点 + macOS 应用）：照片 (jpg) 和短视频片段 (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Camera capture"
---

OpenClaw 支持 agent 工作流的 **camera capture**：

- **iOS node**（通过 Gateway(网关) 配对）：通过 `node.invoke` 拍摄 **photo**（`jpg`）或 **short video clip**（`mp4`，可选音频）。
- **Android node**（通过 Gateway(网关) 配对）：通过 `node.invoke` 拍摄 **photo**（`jpg`）或 **short video clip**（`mp4`，可选音频）。
- **macOS app**（通过 Gateway(网关) 的节点）：通过 `node.invoke` 拍摄 **photo**（`jpg`）或 **short video clip**（`mp4`，可选音频）。

所有相机访问都受 **user-controlled settings** 限制。

## iOS node

### User setting (default on)

- iOS 设置选项卡 → **Camera** → **Allow Camera** (`camera.enabled`)
  - 默认值：**on**（缺少的键将被视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### Commands (via Gateway(网关) `node.invoke`)

- `camera.list`
  - Response payload:
    - `devices`: array of `{ id, name, position, deviceType }`

- `camera.snap`
  - Params:
    - `facing`: `front|back` (default: `front`)
    - `maxWidth`: number (optional; default `1600` on the iOS node)
    - `quality`: `0..1` (optional; default `0.9`)
    - `format`: currently `jpg`
    - `delayMs`: number (optional; default `0`)
    - `deviceId`: string (optional; from `camera.list`)
  - Response payload:
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload guard：照片会被重新压缩，以将 base64 负载保持在 5 MB 以下。

- `camera.clip`
  - Params:
    - `facing`: `front|back` (默认: `front`)
    - `durationMs`: number (默认 `3000`, 限制最大为 `60000`)
    - `includeAudio`: boolean (默认 `true`)
    - `format`: 当前为 `mp4`
    - `deviceId`: string (可选; 来自 `camera.list`)
  - 响应负载:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 类似，iOS 节点只允许在 **前台** 执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 辅助工具 (临时文件 + MEDIA)

获取附件的最简单方法是通过 CLI 辅助工具，它会将解码后的媒体写入临时文件并打印 `MEDIA:<path>`。

示例:

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意:

- `nodes camera snap` 默认为 **both** (两个) 摄像头朝向，以便为代理提供两种视图。
- 除非您构建自己的包装器，否则输出文件是临时的（位于操作系统临时目录中）。

## Android 节点

### Android 用户设置 (默认开启)

- Android 设置表单 → **相机** → **允许相机** (`camera.enabled`)
  - 默认: **on** (缺少的键将被视为已启用)。
  - 关闭时: `camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限:
  - `CAMERA` 用于 `camera.snap` 和 `camera.clip`。
  - 当 `includeAudio=true` 时，`camera.clip` 需要 `RECORD_AUDIO`。

如果缺少权限，应用程序会在可能的情况下提示；如果被拒绝，`camera.*` 请求将失败并返回
`*_PERMISSION_REQUIRED` 错误。

### Android 前台要求

与 `canvas.*` 类似，Android 节点只允许在 **前台** 执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：
    - `devices`：`{ id, name, position, deviceType }` 数组

### 负载保护

照片会被重新压缩，以将 base64 负载保持在 5 MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 配套应用提供了一个复选框：

- **设置 → 通用 → 允许相机** (`openclaw.cameraEnabled`)
  - 默认：**关闭**
  - 关闭时：相机请求将返回“用户已禁用相机”。

### CLI 帮助程序（节点调用）

使用主 `openclaw` CLI 在 macOS 节点上调用相机命令。

示例：

```bash
openclaw nodes camera list --node <id>            # list camera ids
openclaw nodes camera snap --node <id>            # prints MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # prints MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # prints MEDIA:<path> (legacy flag)
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- 除非被覆盖，`openclaw nodes camera snap` 默认为 `maxWidth=1600`。
- 在 macOS 上，`camera.snap` 在预热/曝光稳定后会等待 `delayMs`（默认 2000ms）再进行捕获。
- 照片负载会被重新压缩，以将 base64 大小保持在 5 MB 以下。

## 安全性与实际限制

- 相机和麦克风访问会触发常规的操作系统权限提示（并且需要在 Info.plist 中包含使用说明字符串）。
- 视频片段设有上限（目前为 `<= 60s`），以避免节点负载过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（操作系统级别）

对于*屏幕*视频（而非相机），请使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

注意：

- 需要 macOS **屏幕录制**权限 (TCC)。

## 相关

- [图像和媒体支持](/zh/nodes/images)
- [媒体理解](/zh/nodes/media-understanding)
- [位置命令](/zh/nodes/location-command)
