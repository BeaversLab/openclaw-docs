---
summary: "相机捕获（iOS 节点 + macOS 应用）供代理使用：照片（jpg）和短视频片段（mp4）"
read_when:
  - "Adding or modifying camera capture on iOS nodes or macOS"
  - "Extending agent-accessible MEDIA temp-file workflows"
title: "相机捕获"
---

# 相机捕获（代理）

OpenClaw 为代理工作流支持 **相机捕获**：

- **iOS 节点**（通过 Gateway 配对）：通过 `node.invoke` 捕获 **照片**（`jpg`）或 **短视频片段**（`mp4`，可选音频）。
- **Android 节点**（通过 Gateway 配对）：通过 `node.invoke` 捕获 **照片**（`jpg`）或 **短视频片段**（`mp4`，可选音频）。
- **macOS 应用**（通过 Gateway 的节点）：通过 `node.invoke` 捕获 **照片**（`jpg`）或 **短视频片段**（`mp4`，可选音频）。

所有相机访问都受到 **用户控制设置** 的限制。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置标签页 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认值：**on**（缺失的键被视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：
    - `devices`: `{ id, name, position, deviceType }` 数组

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；iOS 节点上的默认值为 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`）
    - `format`: 当前 `jpg`
    - `delayMs`: number（可选；默认 `0`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`、`height`
  - 负载保护：照片被重新压缩以保持 base64 负载在 5 MB 以下。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，最大值限制为 `60000`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`: 当前 `mp4`
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 一样，iOS 节点只允许在 **前台** 执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI helper (temp files + MEDIA)

获取附件的最简单方法是通过 CLI 辅助工具，它将解码的媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意：
- `nodes camera snap` 默认为 **both**（两个朝向），以便为代理提供两个视图。
- 输出文件是临时的（在 OS 临时目录中），除非您构建自己的包装器。

## Android 节点

### 用户设置（默认开启）

- Android 设置表单 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认值：**on**（缺失的键被视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA` 用于 `camera.snap` 和 `camera.clip`。
  - `RECORD_AUDIO` 用于 `camera.clip` 当 `includeAudio=true` 时。

如果缺少权限，应用会在可能的情况下提示；如果被拒绝，`camera.*` 请求将失败并返回 `*_PERMISSION_REQUIRED` 错误。

### 前台要求

与 `canvas.*` 一样，Android 节点只允许在 **前台** 执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### 负载保护

照片被重新压缩以保持 base64 负载在 5 MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 伴随应用公开了一个复选框：

- **Settings → General → Allow Camera**（`openclaw.cameraEnabled`）
  - 默认值：**off**
  - 关闭时：相机请求返回”Camera disabled by user”。

### CLI helper (node invoke)

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

- `openclaw nodes camera snap` 默认为 `maxWidth=1600`，除非被覆盖。
- 在 macOS 上，`camera.snap` 在预热/曝光稳定后等待 `delayMs`（默认 2000ms）再进行捕获。
- 照片负载被重新压缩以保持 base64 在 5 MB 以下。

## 安全 + 实际限制

- 相机和麦克风访问会触发常规 OS 权限提示（并且需要在 Info.plist 中提供使用说明字符串）。
- 视频片段被限制（当前 `<= 60s`）以避免过大的节点负载（base64 开销 + 消息限制）。

## macOS 屏幕视频（操作系统级别）

对于 _screen_ 视频（不是相机），使用 macOS 伴随应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

注意：

- 需要 macOS **Screen Recording** 权限（TCC）。
