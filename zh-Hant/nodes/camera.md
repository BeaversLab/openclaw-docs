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
- **macOS app** (透過 Gateway 的節點)：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短視訊片段** (`mp4`，可選音訊)。

所有的相機存取都受限於 **使用者控制的設定**。

## iOS 節點

### 使用者設定 (預設開啟)

- iOS 設定分頁 → **Camera** → **Allow Camera** (`camera.enabled`)
  - 預設值：**on** (遺失的金鑰會被視為已啟用)。
  - 關閉時：`camera.*` 指令會回傳 `CAMERA_DISABLED`。

### 指令 (透過 Gateway `node.invoke`)

- `camera.list`
  - 回傳內容：
    - `devices`：`{ id, name, position, deviceType }` 的陣列

- `camera.snap`
  - 參數：
    - `facing`：`front|back` (預設：`front`)
    - `maxWidth`: 數字（可選；在 iOS 節點上預設為 `1600`）
    - `quality`: `0..1`（可選；預設 `0.9`）
    - `format`: 目前為 `jpg`
    - `delayMs`: 數字（可選；預設 `0`）
    - `deviceId`: 字串（可選；來自 `camera.list`）
  - 回應載荷：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - 載荷防護：照片會重新壓縮以將 base64 載荷保持在 5 MB 以下。

- `camera.clip`
  - 參數：
    - `facing`: `front|back` (預設值: `front`)
    - `durationMs`: 數字 (預設值 `3000`，最大值限制為 `60000`)
    - `includeAudio`: 布林值 (預設值 `true`)
    - `format`: 目前為 `mp4`
    - `deviceId`: 字串 (選填; 來自 `camera.list`)
  - 回應承載:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前景需求

就像 `canvas.*` 一樣，iOS 節點僅允許在 **前景** 中執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 輔助工具（暫存檔案 + MEDIA）

取得附件最簡單的方法是透過 CLI 輔助工具，它會將解碼後的媒體寫入暫存檔案並列印 `MEDIA:<path>`。

範例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

備註：

- `nodes camera snap` 預設為 **both**（雙向），以便提供代理程式雙向視野。
- 除非您建構自己的包裝程式，否則輸出檔案是暫時性的（位於 OS 暫存目錄中）。

## Android 節點

### Android 使用者設定（預設開啟）

- Android 設定頁面 → **Camera** → **Allow Camera** (`camera.enabled`)
  - 預設：**on**（遺漏的索引鍵會被視為已啟用）。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 權限

- Android 需要執行時權限：
  - 對於 `camera.snap` 和 `camera.clip`，都需要 `CAMERA`。
  - 當 `includeAudio=true` 時，需要為 `camera.clip` 提供 `RECORD_AUDIO`。

如果缺少權限，應用程式會盡可能提示；如果被拒絕，`camera.*` 請求將失敗並返回
`*_PERMISSION_REQUIRED` 錯誤。

### Android 前景需求

與 `canvas.*` 類似，Android 節點僅允許在 **前景** 執行 `camera.*` 指令。背景調用將返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回應內容：
    - `devices`：`{ id, name, position, deviceType }` 的陣列

### 內容保護

照片會被重新壓縮，以將 base64 載荷保持在 5 MB 以下。

## macOS 應用程式

### 使用者設定（預設關閉）

macOS 配套應用程式提供了一個核取方塊：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`)
  - 預設：**關閉**
  - 當關閉時：相機請求會回傳「Camera disabled by user」。

### CLI 輔助程式（節點調用）

使用主要的 `openclaw` CLI 在 macOS 節點上調用相機指令。

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
- 在 macOS 上，`camera.snap` 會在暖機/曝光穩定後等待 `delayMs`（預設 2000ms）再進行拍攝。
- 照片載荷會被重新壓縮，以將 base64 保持在 5 MB 以下。

## 安全性 + 實務限制

- 存取相機和麥克風會觸發通常的 OS 權限提示（並且需要在 Info.plist 中提供使用說明字串）。
- 影片片段受限（目前為 `<= 60s`），以避免節點承載過大（base64 開銷 + 訊息限制）。

## macOS 螢幕影片（作業系統層級）

對於*螢幕*影片（非相機），請使用 macOS 伴隨程式：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

注意：

- 需要 macOS **螢幕錄製** 權限 (TCC)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
