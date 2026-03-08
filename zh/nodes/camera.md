---
title: "相机捕获"
summary: "相机采集（iOS node + macOS app）：照片（jpg）与短视频（mp4）"
read_when:
  - 你在 iOS node 或 macOS 上新增/修改相机采集
  - 你在扩展 agent 可访问的 MEDIA 临时文件流程
---

# 相机采集 (agent)

OpenClaw 支持 **相机采集** 用于 agent 工作流：

- **iOS node**（通过 Gateway 配对）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频**（`mp4`，可选音频）。
- **Android node**（通过 Gateway 配对）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频**（`mp4`，可选音频）。
- **macOS app**（作为 Gateway 节点）：通过 `node.invoke` 拍摄**照片**（`jpg`）或**短视频**（`mp4`，可选音频）。

所有相机访问都受**用户可控设置**限制。

## iOS node

### 用户设置（默认开启）

- iOS Settings 页 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认：**开启**（缺失键视为开启）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应 payload：
    - `devices`：数组 `{ id, name, position, deviceType }`

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；iOS node 默认 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`）
    - `format`: 当前为 `jpg`
    - `delayMs`: number（可选；默认 `0`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应 payload：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload 限制：照片会重新压缩以确保 base64 payload < 5 MB。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，最大 `60000`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`: 当前为 `mp4`
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应 payload：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 类似，iOS node 仅允许在**前台**执行 `camera.*`。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI helper（临时文件 + MEDIA）

最简方式是使用 CLI helper，它会把解码后的媒体写入临时文件，并输出 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `nodes camera snap` 默认**前后都拍**，便于 agent 获得双视角。
- 输出文件是临时文件（系统临时目录），除非你自己封装。

## Android node

### 用户设置（默认开启）

- Android Settings 页 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认：**开启**（缺失键视为开启）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA` 用于 `camera.snap` 与 `camera.clip`。
  - `RECORD_AUDIO` 用于 `camera.clip` 且 `includeAudio=true`。

若权限缺失，应用会在可能时弹窗；若被拒绝，`camera.*` 请求会以 `*_PERMISSION_REQUIRED` 失败。

### 前台要求

与 `canvas.*` 类似，Android node 仅允许在**前台**执行 `camera.*`。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Payload 限制

照片会重新压缩以确保 base64 payload < 5 MB。

## macOS app

### 用户设置（默认关闭）

macOS 伴侣应用提供一个复选框：

- **Settings → General → Allow Camera**（`openclaw.cameraEnabled`）
  - 默认：**关闭**
  - 关闭时：相机请求返回“Camera disabled by user”。

### CLI helper（node invoke）

使用主 `openclaw` CLI 调用 macOS node 上的相机命令。

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

- `openclaw nodes camera snap` 默认 `maxWidth=1600`，除非显式覆盖。
- 在 macOS 上，`camera.snap` 在预热/曝光稳定后等待 `delayMs`（默认 2000ms）再拍摄。
- 照片 payload 会重新压缩以保持 base64 < 5 MB。

## 安全性 + 实用限制

- 相机与麦克风访问会触发系统权限提示（并要求在 Info.plist 中声明）。
- 视频片段有上限（当前 `<= 60s`），避免 node payload 过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（系统级）

如果是*屏幕*视频（非相机），使用 macOS 伴侣：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

注意：

- 需要 macOS **Screen Recording** 权限（TCC）。
