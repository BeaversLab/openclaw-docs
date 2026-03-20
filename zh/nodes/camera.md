---
summary: "Camera capture (iOS/Android nodes + macOS app) for agent use: photos (jpg) and short video clips (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Camera Capture"
---

# Camera capture (agent)

OpenClaw supports **camera capture** for agent workflows:

- **iOS node** (paired via Gateway(网关)): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.
- **Android node** (paired via Gateway(网关)): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.
- **macOS app** (node via Gateway(网关)): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.

All camera access is gated behind **user-controlled settings**.

## iOS node

### User setting (default on)

- iOS Settings tab → **Camera** → **Allow Camera** (`camera.enabled`)
  - Default: **on** (missing key is treated as enabled).
  - When off: `camera.*` commands return `CAMERA_DISABLED`.

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
    - `width`，`height`
  - 有效载荷保护：照片会被重新压缩以保持 base64 有效载荷在 5 MB 以下。

- `camera.clip`
  - 参数：
    - `facing`：`front|back`（默认：`front`）
    - `durationMs`：数字（默认 `3000`，最大限制为 `60000`）
    - `includeAudio`：布尔值（默认 `true`）
    - `format`：目前 `mp4`
    - `deviceId`：字符串（可选；来自 `camera.list`）
  - 响应有效载荷：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 类似，iOS 节点仅允许在**前台**执行 `camera.*` 命令。后台调用将返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 助手（临时文件 + MEDIA）

获取附件最简单的方法是通过 CLI 助手，它会将解码后的媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意事项：

- `nodes camera snap` 默认为**两个**朝向，以便为代理提供两种视图。
- 除非您构建自己的包装器，否则输出文件是临时的（位于操作系统临时目录中）。

## Android 节点

### Android 用户设置（默认开启）

- Android 设置表单 → **相机** → **允许相机**（`camera.enabled`）
  - 默认值：**开启**（缺少的键被视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA` 用于 `camera.snap` 和 `camera.clip` 两者。
  - 当 `includeAudio=true` 时，`RECORD_AUDIO` 用于 `camera.clip`。

如果缺少权限，应用会在可能的情况下提示；如果被拒绝，`camera.*` 请求将失败并出现
`*_PERMISSION_REQUIRED` 错误。

### Android 前台要求

像 `canvas.*` 一样，Android 节点只允许在 **前台** 执行 `camera.*` 命令。后台调用将返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过 Gateway(网关) `node.invoke`）

- `camera.list`
  - 响应载荷：
    - `devices`：`{ id, name, position, deviceType }` 数组

### 载荷保护

照片会重新压缩，以将 base64 载荷保持在 5 MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 伴侣应用提供了一个复选框：

- **设置 → 通用 → 允许相机** (`openclaw.cameraEnabled`)
  - 默认值：**关闭**
  - 关闭时：相机请求将返回“相机已被用户禁用”。

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

说明：

- 除非被覆盖，否则 `openclaw nodes camera snap` 默认为 `maxWidth=1600`。
- 在 macOS 上，`camera.snap` 在预热/曝光稳定后会等待 `delayMs`（默认 2000ms）再进行拍摄。
- 照片载荷会重新压缩，以将 base64 大小保持在 5 MB 以下。

## 安全性与实际限制

- 访问相机和麦克风会触发通常的操作系统权限提示（并且需要在 Info.plist 中包含使用说明字符串）。
- 视频片段受到限制（目前为 `<= 60s`），以避免节点载荷过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（操作系统级别）

对于 _屏幕_ 视频（而非相机），请使用 macOS 伴侣应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

说明：

- 需要 macOS **屏幕录制** 权限 (TCC)。

import zh from "/components/footer/zh.mdx";

<zh />
