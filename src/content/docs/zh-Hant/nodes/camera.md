---
summary: "供代理使用的相機擷取（iOS/Android 節點與 macOS 應用程式）：照片（jpg）與短影片片段（mp4）"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "相機擷取"
---

# 相機擷取 (代理)

OpenClaw 支援代理工作流程的 **相機擷取**：

- **iOS 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短影片片段** (`mp4`，可選音訊)。
- **Android 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短影片片段** (`mp4`，可選音訊)。
- **macOS 應用程式**（透過 Gateway 的節點）：透過 `node.invoke` 擷取 **照片** (`jpg`) 或 **短影片片段** (`mp4`，可選音訊)。

所有相機存取權均受限於 **使用者控制的設定**。

## iOS 節點

### 使用者設定（預設開啟）

- iOS 設定分頁 → **相機** → **允許相機** (`camera.enabled`)
  - 預設值：**on**（缺少金鑰會被視為已啟用）。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 指令 (透過 Gateway `node.invoke`)

- `camera.list`
  - 回應承載：
    - `devices`: 陣列的 `{ id, name, position, deviceType }`

- `camera.snap`
  - 參數：
    - `facing`: `front|back` (預設值: `front`)
    - `maxWidth`: number (選填；iOS 節點上的預設值為 `1600`)
    - `quality`: `0..1` (選填；預設值為 `0.9`)
    - `format`: 目前為 `jpg`
    - `delayMs`: number (選填；預設值為 `0`)
    - `deviceId`: 字串 (選填；來自 `camera.list`)
  - 回應承載：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload guard: 照片會被重新壓縮，以將 base64 payload 保持在 5 MB 以下。

- `camera.clip`
  - 參數：
    - `facing`: `front|back` (預設值：`front`)
    - `durationMs`: number (預設值 `3000`，上限為 `60000`)
    - `includeAudio`: boolean (預設值 `true`)
    - `format`: 目前為 `mp4`
    - `deviceId`: string (可選；來自 `camera.list`)
  - 回應 payload：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前景要求

與 `canvas.*` 相同，iOS 節點僅允許在 **前景** 中執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 輔助程式 (暫存檔案 + MEDIA)

取得附件最簡單的方法是透過 CLI 輔助程式，它會將解碼後的媒體寫入暫存檔案並列印 `MEDIA:<path>`。

範例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

備註：

- `nodes camera snap` 預設為 **both** (雙向) 鏡頭，以提供代理程式兩個視角。
- 除非您自行建構包裝程式，否則輸出檔案是暫時的 (位於 OS 暫存目錄中)。

## Android 節點

### Android 使用者設定 (預設開啟)

- Android Settings sheet → **Camera** → **Allow Camera** (`camera.enabled`)
  - 預設值：**on** (缺少鍵值將視為已啟用)。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 權限

- Android 需要執行時期權限：
  - 針對 `camera.snap` 和 `camera.clip` 兩者都需要 `CAMERA`。
  - 當 `includeAudio=true` 時，`camera.clip` 需要 `RECORD_AUDIO`。

如果缺少權限，應用程式會盡可能提示；如果拒絕，`camera.*` 請求將會失敗並回傳
`*_PERMISSION_REQUIRED` 錯誤。

### Android 前景要求

與 `canvas.*` 類似，Android 節點僅允許在**前景**執行 `camera.*` 指令。背景調用會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回應內容：
    - `devices`：`{ id, name, position, deviceType }` 陣列

### 內容保護

照片會重新壓縮，以將 base64 內容保持在 5 MB 以下。

## macOS 應用程式

### 使用者設定（預設為關閉）

macOS 伴隨應用程式提供一個勾選框：

- **Settings → General → Allow Camera**（`openclaw.cameraEnabled`）
  - 預設值：**關閉**
  - 關閉時：相機請求會傳回「Camera disabled by user」。

### CLI 輔助工具（節點調用）

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

- 除非另有覆蓋，`openclaw nodes camera snap` 預設為 `maxWidth=1600`。
- 在 macOS 上，`camera.snap` 會在預熱/曝光穩定後等待 `delayMs`（預設 2000ms） 再拍攝。
- 照片內容會重新壓縮，以將 base64 保持在 5 MB 以下。

## 安全性與實務限制

- 相機和麥克風存取會觸發常見的 OS 權限提示（並且需要在 Info.plist 中加入使用說明字串）。
- 影片片段設有上限（目前為 `<= 60s`），以避免節點內容過大（base64 開銷 + 訊息限制）。

## macOS 螢幕影片（OS 層級）

若要錄製 _螢幕_ 影片（而非相機），請使用 macOS 伴隨應用程式：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

備註：

- 需要 macOS **Screen Recording** 權限（TCC）。
