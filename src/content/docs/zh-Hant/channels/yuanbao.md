---
summary: "YuanBao 機器人概述、功能和配置"
read_when:
  - You want to connect a YuanBao bot
  - You are configuring the YuanBao channel
title: YuanBao
---

# YuanBao

YuanBao 是騰訊的 AI 助手平台，支援透過即時通訊進行機器人整合。機器人可以透過私訊和群組聊天與使用者互動。

**狀態：**機器人私訊 + 群組聊天已生產就緒。WebSocket 是唯一支援的連線模式。

---

## 快速開始

> **需要 OpenClaw 2026.4.10 或以上版本。**執行 `openclaw --version` 以檢查。使用 `openclaw update` 升級。

<Steps>
  <Step title="使用您的憑證新增 YuanBao 頻道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 值使用冒號分隔的 `appKey:appSecret` 格式。您可以透過在 YuanBao APP 的應用程式設定中建立機器人來取得這些資訊。
  </Step>

  <Step title="設定完成後，重新啟動閘道以套用變更">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### 互動式設定（替代方案）

您也可以使用互動式精靈：

```bash
openclaw channels login --channel yuanbao
```

依照提示輸入您的 App ID 和 App Secret。

---

## 存取控制

### 私訊

設定 `dmPolicy` 以控制誰可以私訊機器人：

- `"pairing"` — 未知使用者會收到配對碼；透過 CLI 核准
- `"allowlist"` — 只有列在 `allowFrom` 中的使用者可以聊天
- `"open"` — 允許所有使用者（預設）
- `"disabled"` — 停用所有私訊

**核准配對請求：**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### 群組聊天

**提及要求** (`channels.yuanbao.requireMention`):

- `true` — 需要 @提及（預設）
- `false` — 回應時不需要 @提及

在群組聊天中回覆機器人的訊息被視為隱含提及。

---

## 設定範例

### 具有開放私訊政策的基本設定

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

### 將私訊限制為特定使用者

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

### 在群組中停用 @提及要求

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### 最佳化外傳訊息傳遞

```json5
{
  channels: {
    yuanbao: {
      // Send each chunk immediately without buffering
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### 調整合併文字策略

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // buffer until this many chars
      maxChars: 3000, // force split above this limit
      idleMs: 5000, // auto-flush after idle timeout (ms)
    },
  },
}
```

---

## 常用指令

| 指令       | 說明           |
| ---------- | -------------- |
| `/help`    | 顯示可用指令   |
| `/status`  | 顯示機器人狀態 |
| `/new`     | 開始新對話     |
| `/stop`    | 停止當前運行   |
| `/restart` | 重啟 OpenClaw  |
| `/compact` | 壓縮對話上下文 |

> YuanBao 支援原生斜線指令選單。當閘道啟動時，指令會自動同步到平台。

---

## 疑難排解

### 機器人在群組中無回應

1. 請確認機器人已加入群組
2. 請確認你有 @提及 機器人（預設為必填）
3. 檢查日誌：`openclaw logs --follow`

### 機器人未收到訊息

1. 請確認機器人已在 YuanBao APP 中建立並通過審核
2. 請確認 `appKey` 和 `appSecret` 已正確設定
3. 請確認閘道正在執行：`openclaw gateway status`
4. 檢查日誌：`openclaw logs --follow`

### 機器人發送空回覆或備用回覆

1. 檢查 AI 模型是否回傳有效內容
2. 預設的備用回覆為：「暫時無法解答，你可以換個問題問問我哦」
3. 透過 `channels.yuanbao.fallbackReply` 自訂

### App Secret 外洩

1. 在 YuanBao APP 中重設 App Secret
2. 更新設定中的數值
3. 重啟閘道：`openclaw gateway restart`

---

## 進階設定

### 多個帳戶

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

當輸出 API 未指定 `accountId` 時，`defaultAccount` 控制要使用哪個帳戶。

### 訊息限制

- `maxChars` — 單則訊息最大字元數（預設：`3000` 個字元）
- `mediaMaxMb` — 媒體上傳/下載限制（預設：`20` MB）
- `overflowPolicy` — 當訊息超過限制時的行為：`"split"`（預設）或 `"stop"`

### 串流輸出

YuanBao 支援區塊層級的串流輸出。啟用後，機器人會在生成文字時分段發送。

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

設定 `disableBlockStreaming: true` 以在一則訊息中發送完整回覆。

### 群組聊天歷史上下文

控制 AI 上下文中包含多少歷史訊息：

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // default: 100, set 0 to disable
    },
  },
}
```

### 回覆模式

控制機器人在群組中回覆時引用訊息的方式：

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| 數值      | 行為                                     |
| --------- | ---------------------------------------- |
| `"off"`   | 無引用回覆                               |
| `"first"` | 僅針對每條傳入訊息引用第一次回覆（預設） |
| `"all"`   | 引用每一次回覆                           |

### Markdown 提示注入

預設情況下，機器人會在系統提示詞中注入指令，以防止 AI 模型將整個回覆包裝在 markdown 程式碼區塊中。

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // default: true
    },
  },
}
```

### 除錯模式

為特定機器人 ID 啟用未經清理的日誌輸出：

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### 多代理程式路由

使用 `bindings` 將 YuanBao 私訊或群組路由到不同的代理程式。

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
  ],
}
```

路由欄位：

- `match.channel`: `"yuanbao"`
- `match.peer.kind`: `"direct"` (私訊) 或 `"group"` (群組聊天)
- `match.peer.id`: 使用者 ID 或群組代碼

---

## 組態參考

完整組態：[Gateway configuration](/zh-Hant/gateway/configuration)

| 設定                                       | 描述                                      | 預設值                                 |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | 啟用/停用頻道                             | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 外寄路由的預設帳戶                        | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key (用於簽名和 ticket 產生)          | —                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret (用於簽名)                     | —                                      |
| `channels.yuanbao.accounts.<id>.token`     | 預先簽名的令牌 (跳過自動 ticket 簽名)     | —                                      |
| `channels.yuanbao.accounts.<id>.name`      | 帳戶顯示名稱                              | —                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | 啟用/停用特定帳戶                         | `true`                                 |
| `channels.yuanbao.dm.policy`               | 私訊政策                                  | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | 私訊允許清單 (使用者 ID 列表)             | —                                      |
| `channels.yuanbao.requireMention`          | 在群組中要求 @提及                        | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 長訊息處理 (`split` 或 `stop`)            | `split`                                |
| `channels.yuanbao.replyToMode`             | 群組回覆策略 (`off`, `first`, `all`)      | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略 (`merge-text` 或 `immediate`)    | `merge-text`                           |
| `channels.yuanbao.minChars`                | 合併文字：觸發發送的最小字元數            | `2800`                                 |
| `channels.yuanbao.maxChars`                | 合併文字：每則訊息的最大字元數            | `3000`                                 |
| `channels.yuanbao.idleMs`                  | 合併文字：自動重新整理前的閒置逾時 (毫秒) | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒體大小限制 (MB)                         | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群組聊天記錄內容項目                      | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 停用區塊層級串流輸出                      | `false`                                |
| `channels.yuanbao.fallbackReply`           | 當 AI 未回傳內容時的備援回覆              | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 Markdown 防換行指示                  | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 除錯白名單機器人 ID (未經過濾的日誌)      | `[]`                                   |

---

## 支援的訊息類型

### 接收

- ✅ 文字
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊 / 語音
- ✅ 影片
- ✅ 貼圖 / 自訂表情
- ✅ 自訂元素 (連結卡片等)

### 發送

- ✅ 文字 (支援 Markdown)
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片
- ✅ 貼圖

### 主題串與回覆

- ✅ 引用回覆 (可透過 `replyToMode` 設定)
- ❌ 主題串回覆 (平台不支援)

---

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及控制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化
