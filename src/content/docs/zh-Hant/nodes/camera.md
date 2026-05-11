---
summary: "供代理使用的相機擷取（iOS/Android 節點與 macOS 應用程式）：照片（jpg）與短影片片段（mp4）"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "相機擷取"
---

OpenClaw 支援代理工作流程的 **相機擷取**：

- **iOS 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短片** (`mp4`，可選音訊)。
- **Android 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短片** (`mp4`，可選音訊)。
- **macOS 應用程式**（透過 Gateway 的節點）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短片** (`mp4`，可選音訊)。

所有相機存取皆受限於 **使用者控制的設定**。

## iOS 節點

### 使用者設定（預設為開啟）

- iOS 設定分頁 → **相機** → **允許相機** (`camera.enabled`)
  - 預設值：**開啟**（缺少鍵值視為已啟用）。
  - 當關閉時：`camera.*` 指令會回傳 `CAMERA_DISABLED`。

### 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回傳內容：
    - `devices`: `{ id, name, position, deviceType }` 的陣列

- `camera.snap`
  - 參數：
    - `facing`: `front|back`（預設值：`front`）
    - `maxWidth`: number（選用；iOS 節點上的預設值為 `1600`）
    - `quality`: `0..1`（選用；預設值為 `0.9`）
    - `format`: 目前僅限 `jpg`
    - `delayMs`: number（選用；預設值為 `0`）
    - `deviceId`: string（選用；來自 `camera.list`）
  - 回傳內容：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload 防護：照片會重新壓縮，以將 base64 payload 保持在 5 MB 以下。

- `camera.clip`
  - 參數：
    - `facing`: `front|back` (預設：`front`)
    - `durationMs`: number (預設 `3000`，限制最大值為 `60000`)
    - `includeAudio`: boolean (預設 `true`)
    - `format`: 目前 `mp4`
    - `deviceId`: string (選填；來自 `camera.list`)
  - 回應酬載：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前景要求

與 `canvas.*` 類似，iOS 節點僅允許在**前景**執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 助手 (暫存檔案 + MEDIA)

取得附件最簡單的方式是透過 CLI 助手，它會將解碼後的媒體寫入暫存檔案並列印 `MEDIA:<path>`。

範例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

備註：

- `nodes camera snap` 預設為 **both** (雙向) 面向，以提供代理程式兩種視角。
- 輸出檔案是暫時的 (位於 OS 暫存目錄中)，除非您建立自己的包裝程式。

## Android 節點

### Android 使用者設定 (預設開啟)

- Android Settings sheet → **Camera** → **Allow Camera** (`camera.enabled`)
  - 預設：**on** (缺少索引鍵會視為已啟用)。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 權限

- Android 需要執行階段權限：
  - `CAMERA` 用於 `camera.snap` 和 `camera.clip` 兩者。
  - 當 `includeAudio=true` 時，`camera.clip` 需要 `RECORD_AUDIO`。

如果缺少權限，應用程式會盡可能提示；如果被拒絕，`camera.*` 請求會失敗並出現
`*_PERMISSION_REQUIRED` 錯誤。

### Android 前景要求

與 `canvas.*` 類似，Android 節點僅允許在**前景**執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回應承載：
    - `devices`: `{ id, name, position, deviceType }` 的陣列

### 承載保護

照片會經過重新壓縮，以將 base64 承載保持在 5 MB 以下。

## macOS 應用程式

### 使用者設定（預設關閉）

macOS 配套應用程式提供了一個核取方塊：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`)
  - 預設值：**關閉**
  - 關閉時：相機請求會回傳「Camera disabled by user」。

### CLI 助手 (node invoke)

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

- `openclaw nodes camera snap` 預設為 `maxWidth=1600`，除非另有覆蓋。
- 在 macOS 上，`camera.snap` 會在暖機/曝光設定後等待 `delayMs`（預設 2000ms）再進行擷取。
- 照片承載會經過重新壓縮，以將 base64 保持在 5 MB 以下。

## 安全性與實際限制

- 存取相機和麥克風會觸發標準的 OS 權限提示（並且需要在 Info.plist 中加入使用說明字串）。
- 影片片段會受到上限限制（目前為 `<= 60s`），以避免節點承載過大（base64 開銷 + 訊息限制）。

## macOS 螢幕影片（OS 層級）

若是 _螢幕_ 影片（非相機），請使用 macOS 配套應用程式：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

備註：

- 需要 macOS **Screen Recording** 權限 (TCC)。

## 相關

- [圖片與媒體支援](/zh-Hant/nodes/images)
- [媒體理解](/zh-Hant/nodes/media-understanding)
- [位置指令](/zh-Hant/nodes/location-command)
