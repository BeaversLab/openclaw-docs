---
summary: "全域語音喚醒詞（由閘道器擁有）及其在節點間的同步方式"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "語音喚醒"
---

# 語音喚醒（全域喚醒詞）

OpenClaw 將**喚醒詞視為由 **閘道器** 擁有的一個單一全域清單**。

- **沒有各節點自訂的喚醒詞**。
- **任何節點/應用程式 UI 都可以編輯**該清單；變更會由閘道器保存，並廣播給所有人。
- macOS 和 iOS 會保留本機的**語音喚醒啟用/停用**切換開關（本機 UX 與權限不同）。
- Android 目前將語音喚醒設為關閉，並在語音分頁中使用手動麥克風流程。

## 儲存（閘道器主機）

喚醒詞儲存在閘道器機器的以下位置：

- `~/.openclaw/settings/voicewake.json`

結構：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 通訊協定

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 搭配參數 `{ triggers: string[] }` → `{ triggers: string[] }`

備註：

- 觸發器會經過正規化處理（去除空白、移除空值）。空清單會回復為預設值。
- 為了安全起見，會強制執行限制（數量/長度上限）。

### 事件

- `voicewake.changed` payload `{ triggers: string[] }`

接收對象：

- 所有 WebSocket 用戶端（macOS 應用程式、WebChat 等）
- 所有已連線的節點（iOS/Android），並且在節點連線時作為初始「目前狀態」推送。

## 用戶端行為

### macOS 應用程式

- 使用全域清單來控管 `VoiceWakeRuntime` 觸發器。
- 在語音喚醒設定中編輯「觸發詞」會呼叫 `voicewake.set`，然後依賴廣播來保持其他用戶端同步。

### iOS 節點

- 使用全域清單進行 `VoiceWakeManager` 觸發偵測。
- 在設定中編輯喚醒詞會呼叫 `voicewake.set`（透過閘道器 WS），並且保持本機喚醒詞偵測的即時回應。

### Android 節點

- Android 執行環境/設定中目前已停用語音喚醒。
- Android 語音功能使用語音分頁中的手動麥克風擷取，而非喚醒詞觸發。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
