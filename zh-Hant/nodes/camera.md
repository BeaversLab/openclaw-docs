---
summary: "相機擷取（iOS/Android 節點 + macOS 應用程式）供代理程式使用：照片（jpg）和短影片片段（mp4）"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "相機擷取"
---

# 相機擷取（代理程式）

OpenClaw 支援用於代理程式工作流程的**相機擷取**：

- **iOS 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取**照片** (`jpg`) 或**短影片片段** (`mp4`，可選音訊)。
- **Android 節點**（透過 Gateway 配對）：透過 `node.invoke` 擷取**照片** (`jpg`) 或**短影片片段** (`mp4`，可選音訊)。
- **macOS 應用程式**（透過 Gateway 作為節點）：透過 `node.invoke` 擷取**照片** (`jpg`) 或**短影片片段** (`mp4`，可選音訊)。

所有相機存取都受限於**使用者控制的設定**。

## iOS 節點

### 使用者設定（預設開啟）

- iOS 設定分頁 → **相機** → **允許相機** (`camera.enabled`)
  - 預設：**開啟**（缺少的金鑰會被視為已啟用）。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回應承載：
    - `devices`: `{ id, name, position, deviceType }` 的陣列

- `camera.snap`
  - 參數：
    - `facing`: `front|back`（預設值：`front`）
    - `maxWidth`: 數字（可選；iOS 節點上預設為 `1600`）
    - `quality`: `0..1`（可選；預設 `0.9`）
    - `format`: 目前 `jpg`
    - `delayMs`: 數字（可選；預設 `0`）
    - `deviceId`: 字串（可選；來自 `camera.list`）
  - 回應承載：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload 防護：照片會被重新壓縮，以將 base64 payload 控制在 5 MB 以下。

- `camera.clip`
  - 參數：
    - `facing`: `front|back` (預設: `front`)
    - `durationMs`: 數字 (預設 `3000`，限制最大值為 `60000`)
    - `includeAudio`: 布林值 (預設 `true`)
    - `format`: 目前 `mp4`
    - `deviceId`: 字串 (選用; 來自 `camera.list`)
  - 回應 payload：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前景需求

與 `canvas.*` 類似，iOS 節點僅允許在 **前景** 執行 `camera.*` 指令。背景呼叫會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 輔助工具 (暫存檔案 + MEDIA)

取得附件最簡單的方法是透過 CLI 輔助工具，它會將解碼後的媒體寫入暫存檔案並列印 `MEDIA:<path>`。

範例：

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

備註：

- `nodes camera snap` 預設值為 **both** (兩者)，以提供代理程式雙向視圖。
- 除非您自行建立包裝程式，否則輸出檔案為暫時性的 (位於 OS 暫存目錄中)。

## Android 節點

### Android 使用者設定 (預設為開啟)

- Android 設定頁面 → **相機** → **允許相機** (`camera.enabled`)
  - 預設值：**on** (缺少鍵值會被視為已啟用)。
  - 關閉時：`camera.*` 指令會傳回 `CAMERA_DISABLED`。

### 權限

- Android 需要執行時期權限：
  - 針對 `camera.snap` 和 `camera.clip` 兩者都需要 `CAMERA`。
  - 當 `includeAudio=true` 時，針對 `camera.clip` 需要 `RECORD_AUDIO`。

如果缺少權限，應用程式會盡可能提示；如果拒絕，`camera.*` 請求將會失敗並回傳
`*_PERMISSION_REQUIRED` 錯誤。

### Android 前景需求

與 `canvas.*` 相同，Android 節點僅允許在**前景**中執行 `camera.*` 指令。背景調用會傳回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 指令（透過 Gateway `node.invoke`）

- `camera.list`
  - 回應 Payload：
    - `devices`：`{ id, name, position, deviceType }` 的陣列

### Payload 防護

照片會經過重新壓縮，以將 base64 payload 保持在 5 MB 以下。

## macOS 應用程式

### 使用者設定（預設關閉）

macOS 伴隨應用程式顯示一個核取方塊：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`)
  - 預設：**關閉**
  - 關閉時：相機請求會傳回「Camera disabled by user」。

### CLI 輔助工具（節點調用）

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

- 除非有覆寫，否則 `openclaw nodes camera snap` 預設為 `maxWidth=1600`。
- 在 macOS 上，`camera.snap` 會在暖機/曝光穩定後等待 `delayMs`（預設 2000ms） 再進行拍攝。
- 照片 payload 會經過重新壓縮，以將 base64 保持在 5 MB 以下。

## 安全性與實際限制

- 存取相機和麥克風會觸發標準的 OS 權限提示（並且需要在 Info.plist 中加入使用說明字串）。
- 影片片段會有長度上限（目前為 `<= 60s`），以避免節點 payload 過大（base64 開銷 + 訊息限制）。

## macOS 螢幕影片（OS 層級）

若要錄製「螢幕」影片（而非相機），請使用 macOS 伴隨應用程式：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

備註：

- 需要 macOS **Screen Recording** 權限 (TCC)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
