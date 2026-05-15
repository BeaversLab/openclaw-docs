---
summary: "全域語音喚醒詞（由 Gateway 擁有）及其在節點間同步的方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "語音喚醒"
---

OpenClaw 將 **喚醒詞視為由 **Gateway** 擁有的一個全域列表**。

- **沒有個別節點的自訂喚醒詞**。
- **任何節點/應用程式 UI 都可以編輯** 該列表；變更由 Gateway 持久化並廣播給所有人。
- macOS 和 iOS 保留了本地的 **語音喚醒啟用/停用** 切換開關（本機 UX 與權限不同）。
- Android 目前保持語音喚醒關閉，並在 Voice 分頁中使用手動麥克風流程。

## 存放位置（Gateway 主機）

喚醒詞儲存在閘道機器上的：

- `~/.openclaw/settings/voicewake.json`

結構：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 協定

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- 帶有參數 `{ triggers: string[] }` 的 `voicewake.set` → `{ triggers: string[] }`

備註：

- 觸發器會經過正規化（修剪、移除空值）。空列表會回退為預設值。
- 為了安全會執行限制（計數/長度上限）。

### 路由方法（觸發 → 目標）

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- 帶有參數 `{ config: VoiceWakeRoutingConfig }` 的 `voicewake.routing.set` → `{ config: VoiceWakeRoutingConfig }`

`VoiceWakeRoutingConfig` 結構：

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

路由目標僅支援以下其中一項：

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### 事件

- `voicewake.changed` 載荷 `{ triggers: string[] }`
- `voicewake.routing.changed` 載荷 `{ config: VoiceWakeRoutingConfig }`

接收者：

- 所有 WebSocket 客戶端（macOS 應用程式、WebChat 等）
- 所有連接的節點（iOS/Android），並且在節點連接時作為初始的「目前狀態」推送。

## 客戶端行為

### macOS 應用程式

- 使用全域列表來控管 `VoiceWakeRuntime` 觸發器。
- 在「語音喚醒」設定中編輯「觸發詞」會呼叫 `voicewake.set`，然後依賴廣播來保持其他用戶端同步。

### iOS 節點

- 使用全域列表進行 `VoiceWakeManager` 觸發偵測。
- 在設定中編輯喚醒詞會呼叫 `voicewake.set`（透過 Gateway WS），並且保持本機喚醒詞檢測的響應性。

### Android 節點

- Android 執行環境/設定中目前已停用語音喚醒。
- Android 語音功能使用語音分頁中的手動麥克風擷取，而不是喚醒詞觸發。

## 相關

- [對談模式](/zh-Hant/nodes/talk)
- [音訊與語音備註](/zh-Hant/nodes/audio)
- [媒體理解](/zh-Hant/nodes/media-understanding)
