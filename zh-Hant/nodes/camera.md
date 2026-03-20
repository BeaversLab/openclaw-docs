---
summary: "Camera capture (iOS/Android nodes + macOS app) for agent use: photos (jpg) and short video clips (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Camera Capture"
---

# Camera capture (agent)

OpenClaw supports **camera capture** for agent workflows:

- **iOS node** (paired via Gateway): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.
- **Android node** (paired via Gateway): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.
- **macOS app** (node via Gateway): capture a **photo** (`jpg`) or **short video clip** (`mp4`, with optional audio) via `node.invoke`.

All camera access is gated behind **user-controlled settings**.

## iOS node

### User setting (default on)

- iOS Settings tab → **Camera** → **Allow Camera** (`camera.enabled`)
  - Default: **on** (missing key is treated as enabled).
  - When off: `camera.*` commands return `CAMERA_DISABLED`.

### Commands (via Gateway `node.invoke`)

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
  - Payload guard：照片會被重新壓縮，以將 base64 payload 保持在 5 MB 以下。

- `camera.clip`
  - Params：
    - `facing`: `front|back` (default: `front`)
    - `durationMs`: number (default `3000`, clamped to a max of `60000`)
    - `includeAudio`: boolean (default `true`)
    - `format`: currently `mp4`
    - `deviceId`: string (optional; from `camera.list`)
  - Response payload：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Foreground requirement

Like `canvas.*`, the iOS node only allows `camera.*` commands in the **foreground**. Background invocations return `NODE_BACKGROUND_UNAVAILABLE`.

### CLI helper (temp files + MEDIA)

The easiest way to get attachments is via the CLI helper, which writes decoded media to a temp file and prints `MEDIA:<path>`.

Examples：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Notes：

- `nodes camera snap` defaults to **both** facings to give the agent both views.
- Output files are temporary (in the OS temp directory) unless you build your own wrapper.

## Android 節點

### Android 使用者設定（預設開啟）

- Android Settings sheet → **Camera** → **Allow Camera** (`camera.enabled`)
  - Default: **on** (missing key is treated as enabled).
  - When off: `camera.*` commands return `CAMERA_DISABLED`.

### Permissions

- Android requires runtime permissions:
  - `CAMERA` for both `camera.snap` and `camera.clip`.
  - `RECORD_AUDIO` for `camera.clip` when `includeAudio=true`.

If permissions are missing, the app will prompt when possible; if denied, `camera.*` requests fail with a
`*_PERMISSION_REQUIRED` error.

### Android foreground requirement

就像 `canvas.*` 一樣，Android 節點只允許在 **前景 (foreground)** 中執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 指令 (透過 Gateway `node.invoke`)

- `camera.list`
  - 回應 Payload：
    - `devices`: `{ id, name, position, deviceType }` 的陣列

### Payload 防護

照片會經過重新壓縮，以將 base64 payload 保持在 5 MB 以下。

## macOS 應用程式

### 使用者設定 (預設關閉)

macOS 伴隨應用程式提供了一個核取方塊：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`)
  - 預設：**關閉 (off)**
  - 當關閉時：相機請求會傳回「Camera disabled by user」。

### CLI 輔助工具 (節點呼叫)

使用主要的 `openclaw` CLI 在 macOS 節點上叫用相機指令。

範例：

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

備註：

- `openclaw nodes camera snap` 預設為 `maxWidth=1600`，除非另有覆寫。
- 在 macOS 上，`camera.snap` 會在暖機/曝光穩定後等待 `delayMs` (預設 2000ms) 再進行擷取。
- 照片 Payload 會經過重新壓縮，以將 base64 保持在 5 MB 以下。

## 安全性 + 實務限制

- 相機和麥克風存取會觸發標準的 OS 權限提示 (並且需要在 Info.plist 中提供使用說明字串)。
- 影片片段設有上限 (目前為 `<= 60s`)，以避免過大的節點 payload (base64 開銷 + 訊息限制)。

## macOS 螢幕影片 (OS 層級)

對於 _螢幕_ 影片 (非相機)，請使用 macOS 伴隨應用程式：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

備註：

- 需要 macOS **Screen Recording** 權限 (TCC)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
