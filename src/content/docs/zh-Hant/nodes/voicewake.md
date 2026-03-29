---
summary: "全域語音喚醒詞（由 Gateway 擁有）及其在節點間的同步方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "語音喚醒"
---

# 語音喚醒（全域喚醒詞）

OpenClaw 將**喚醒詞視為由 **Gateway** 擁有的一個單一全域清單**。

- **沒有針對各個節點的自訂喚醒詞**。
- **任何節點/應用程式 UI 都可以編輯**該清單；變更會由 Gateway 持久化並廣播給所有人。
- macOS 和 iOS 會保留本地的**語音喚醒啟用/停用**切換開關（本地 UX 與權限不同）。
- Android 目前將語音喚醒保持關閉，並在 Voice 分頁中使用手動麥克風流程。

## 儲存（Gateway 主機）

喚醒詞儲存在閘道機器上的：

- `~/.openclaw/settings/voicewake.json`

形狀：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 協定

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 搭配參數 `{ triggers: string[] }` → `{ triggers: string[] }`

備註：

- 觸發詞會被正規化（去除空白、移除空值）。空清單會回退為預設值。
- 會為安全執行限制（計數/長度上限）。

### 事件

- `voicewake.changed` payload `{ triggers: string[] }`

接收者：

- 所有 WebSocket 用戶端（macOS app、WebChat 等）
- 所有已連線的節點（iOS/Android），並在節點連線時作為初始「目前狀態」推送。

## 用戶端行為

### macOS app

- 使用全域清單來過濾 `VoiceWakeRuntime` 觸發器。
- 在語音喚醒設定中編輯「觸發詞」會呼叫 `voicewake.set`，然後依賴廣播來讓其他用戶端保持同步。

### iOS 節點

- 使用全域清單進行 `VoiceWakeManager` 觸發器偵測。
- 在設定中編輯喚醒詞會呼叫 `voicewake.set`（透過 Gateway WS），並保持本地喚醒詞偵測的即時性。

### Android 節點

- Android 執行時/設定中目前已停用語音喚醒。
- Android 語音功能會在 Voice 分頁中使用手動麥克風擷取，而不是喚醒詞觸發器。
