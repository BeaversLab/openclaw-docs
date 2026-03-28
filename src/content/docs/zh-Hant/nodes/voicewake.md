---
summary: "全域語音喚醒詞（由閘道器擁有）及其在各節點間的同步方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "語音喚醒"
---

# 語音喚醒（全域喚醒詞）

OpenClaw 將 **喚醒詞視為由 **閘道器** 擁有的單一全域列表**。

- **沒有各節點自訂的喚醒詞**。
- **任何節點/應用程式 UI 都可以編輯**該列表；變更由閘道器保存並廣播給所有人。
- macOS 和 iOS 保留本機 **語音喚醒啟用/停用** 切換開關（本機 UX + 權限不同）。
- Android 目前將語音喚醒保持關閉，並在語音標籤中使用手動麥克風流程。

## 儲存（閘道器主機）

喚醒詞儲存在閘道器機器上的：

- `~/.openclaw/settings/voicewake.json`

結構：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 通訊協定

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 帶參數 `{ triggers: string[] }` → `{ triggers: string[] }`

註記：

- 觸發詞會經過正規化處理（修剪、移除空白）。空列表會回退為預設值。
- 為了安全起見，會執行限制（計數/長度上限）。

### 事件

- `voicewake.changed` 負載 `{ triggers: string[] }`

接收對象：

- 所有 WebSocket 客戶端（macOS app、WebChat 等）
- 所有已連線的節點（iOS/Android），並且在節點連線時作為初始「目前狀態」推送。

## 客戶端行為

### macOS app

- 使用全域列表來過濾 `VoiceWakeRuntime` 觸發器。
- 在 Voice Wake 設定中編輯「觸發詞」會呼叫 `voicewake.set`，然後依賴廣播來讓其他客戶端保持同步。

### iOS 節點

- 使用全域列表進行 `VoiceWakeManager` 觸發偵測。
- 在設定中編輯喚醒詞會呼叫 `voicewake.set`（透過 Gateway WS），同時保持本機喚醒詞檢測的即時性。

### Android 節點

- 語音喚醒目前在 Android 執行環境/設定中已停用。
- Android 語音功能在語音標籤頁中使用手動麥克風錄音，而不是透過喚醒詞觸發。
