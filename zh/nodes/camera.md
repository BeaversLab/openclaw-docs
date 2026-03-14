---
summary: "供代理使用的相机捕获（iOS/Android 节点 + macOS 应用）：照片 (jpg) 和短视频片段 (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "相机捕获"
---

# 相机捕获（代理）

OpenClaw 支持用于代理工作流的 **相机捕获**：

- **iOS 节点**（通过 Gateway 网关 配对）：通过 `node.invoke` 捕获**照片** (`jpg`) 或**短视频片段** (`mp4`，可选音频)。
- **Android 节点**（通过 Gateway 网关 配对）：通过 `node.invoke` 捕获**照片** (`jpg`) 或**短视频片段** (`mp4`，可选音频)。
- **macOS 应用**（通过 Gateway 网关 作为节点）：通过 `node.invoke` 捕获**照片** (`jpg`) 或**短视频片段** (`mp4`，可选音频)。

所有相机访问都受 **用户控制的设置** 限制。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置选项卡 → **相机** → **允许相机** (`camera.enabled`)
  - 默认值：**开启**（缺失的键被视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway 网关 `node.invoke`）

- `camera.list`
  - 响应负载：
    - `devices`: `{ id, name, position, deviceType }` 数组

- `camera.snap`
  - 参数:
    - `facing`: `front|back` (默认值: `front`)
    - `maxWidth`: 数字 (可选; iOS 节点上的默认值为 `1600`)
    - `quality`: `0..1` (可选; 默认值: `0.9`)
    - `format`: 目前为 `jpg`
    - `delayMs`: 数字 (可选; 默认值: `0`)
    - `deviceId`: 字符串 (可选; 来自 `camera.list`)
  - 响应载荷:
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - 载荷保护: 照片会经过重新压缩以保持 base64 载荷在 5 MB 以下。

- `camera.clip`
  - 参数:
    - `facing`: `front|back` (默认值: `front`)
    - `durationMs`: 数字 (默认值 `3000`, 最大上限为 `60000`)
    - `includeAudio`: 布尔值 (默认值 `true`)
    - `format`: 目前为 `mp4`
    - `deviceId`: 字符串 (可选; 来自 `camera.list`)
  - 响应载荷:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 类似，iOS 节点仅允许在**前台**执行 `camera.*` 命令。后台调用将返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 辅助工具 (临时文件 + MEDIA)

获取附件的最简单方法是使用 CLI 辅助工具，它会将解码后的媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意事项：

- `nodes camera snap` 默认为 **both**（两者），以便为代理提供两种视图。
- 输出文件是临时的（位于操作系统临时目录中），除非您构建自己的封装程序。

## Android 节点

### Android 用户设置 (默认开启)

- Android 设置表单 → **Camera** → **Allow Camera** (`camera.enabled`)
  - 默认值：**on**（缺少该键视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - 同时针对 `camera.snap` 和 `camera.clip` 使用 `CAMERA`。
  - 当 `includeAudio=true` 时，针对 `camera.clip` 使用 `RECORD_AUDIO`。

如果缺少权限，应用会在可能时提示；如果被拒绝，`camera.*` 请求将失败并返回
`*_PERMISSION_REQUIRED` 错误。

### Android 前台要求

与 `canvas.*` 类似，Android 节点仅允许在 **前台** 执行 `camera.*` 命令。后台调用将返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过 Gateway 网关 `node.invoke`）

- `camera.list`
  - 响应载荷：
    - `devices`：`{ id, name, position, deviceType }` 数组

### 负载保护

照片会被重新压缩，以将 base64 负载保持在 5 MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 伴随应用提供一个复选框：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`)
  - 默认值：**关闭**
  - 关闭时：相机请求将返回“Camera disabled by user”（相机已被用户禁用）。

### CLI 辅助工具（节点调用）

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
- 在 macOS 上，`camera.snap` 会在预热/曝光稳定后等待 `delayMs`（默认 2000ms）再进行拍摄。
- 照片负载会被重新压缩，以保持 base64 大小在 5 MB 以下。

## 安全性与实际限制

- 访问相机和麦克风会触发常规的 OS 权限提示（并且需要在 Info.plist 中包含使用说明字符串）。
- 视频片段受到限制（目前为 `<= 60s`），以避免节点载荷过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（系统级）

对于_屏幕_视频（非相机），请使用 macOS 伴随应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

注意：

- 需要 macOS **屏幕录制**权限 (TCC)。

import zh from '/components/footer/zh.mdx';

<zh />
