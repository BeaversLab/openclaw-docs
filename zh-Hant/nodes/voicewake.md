---
summary: "全域語音喚醒詞（由 Gateway 擁有）及其在各節點間的同步方式"
read_when:
  - 變更語音喚醒詞的行為或預設值
  - 新增需要喚醒詞同步的新節點平台
title: "Voice Wake"
---

# Voice Wake (全域喚醒詞)

OpenClaw 將喚醒詞視為由 **Gateway** 擁有的**單一全域清單**。

- **沒有針對各節點的自訂喚醒詞**。
- **任何節點/App UI 都可以編輯**該清單；變更會由 Gateway 保存並廣播給所有人。
- macOS 和 iOS 保留本地的 **Voice Wake 啟用/停用** 切換開關（本地 UX 和權限不同）。
- Android 目前將 Voice Wake 保持關閉，並在 Voice 分頁中使用手動麥克風流程。

## 儲存空間 (Gateway 主機)

喚醒詞儲存在閘道機器上的：

- `~/.openclaw/settings/voicewake.json`

格式：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 協定

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 搭配參數 `{ triggers: string[] }` → `{ triggers: string[] }`

備註：

- 觸發詞會經過正規化處理（修剪、移除空值）。空清單會回退至預設值。
- 為了安全會強制執行限制（數量/長度上限）。

### 事件

- `voicewake.changed` payload `{ triggers: string[] }`

誰會收到它：

- 所有 WebSocket 客戶端（macOS app、WebChat 等）
- 所有連線的節點（iOS/Android），並在節點連線時作為初始「目前狀態」推送。

## 客戶端行為

### macOS app

- 使用全域清單來控管 `VoiceWakeRuntime` 觸發詞。
- 在 Voice Wake 設定中編輯「觸發詞」會呼叫 `voicewake.set`，然後依賴廣播來保持其他客戶端同步。

### iOS 節點

- 使用全域清單進行 `VoiceWakeManager` 觸發詞偵測。
- 在設定中編輯 Wake Words 會呼叫 `voicewake.set`（透過 Gateway WS），並保持本地喚醒詞偵測的即時性。

### Android 節點

- Voice Wake 目前在 Android 執行環境/設定中已停用。
- Android 語音功能在 Voice 分頁中使用手動麥克風擷取，而不是喚醒詞觸發。

import en from "/components/footer/en.mdx";

<en />
