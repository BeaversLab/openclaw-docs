---
summary: "飛書機器人概覽、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: 飛書
---

# 飛書 / Lark

飛書/Lark 是一個一體化的協作平台，團隊可以在其中聊天、分享文件、管理日曆並協同完成工作。

**狀態：** 機器人私訊 (DM) + 群組聊天功能已可用於生產環境。WebSocket 是預設模式；webhook 模式為可選。

---

## 快速開始

> **需要 OpenClaw 2026.4.10 或更高版本。** 執行 `openclaw --version` 進行檢查。使用 `openclaw update` 進行升級。

<Steps>
  <Step title="執行通道設定精靈">```bash openclaw channels login --channel feishu ``` 使用您的飛書/Lark 行動應用程式掃描 QR Code，以自動建立飛書/Lark 機器人。</Step>

  <Step title="設定完成後，重新啟動閘道以套用變更">```bash openclaw gateway restart ```</Step>
</Steps>

---

## 存取控制

### 直接訊息 (DM)

設定 `dmPolicy` 以控制誰可以傳送私訊給機器人：

- `"pairing"` — 未知使用者會收到配對碼；透過 CLI 批准
- `"allowlist"` — 只有列在 `allowFrom` 中的使用者可以聊天 (預設：僅機器人擁有者)
- `"open"` — 允許所有使用者
- `"disabled"` — 停用所有私訊

**批准配對請求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群組聊天

**群組政策** (`channels.feishu.groupPolicy`)：

| 數值          | 行為                             |
| ------------- | -------------------------------- |
| `"open"`      | 回應群組中的所有訊息             |
| `"allowlist"` | 僅回應 `groupAllowFrom` 中的群組 |
| `"disabled"`  | 停用所有群組訊息                 |

預設值： `allowlist`

**提及需求** (`channels.feishu.requireMention`)：

- `true` — 需要 @提及 (預設)
- `false` — 無需 @提及 即可回應
- 各群組覆寫： `channels.feishu.groups.<chat_id>.requireMention`

---

## 群組設定範例

### 允許所有群組，不需要 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允許所有群組，但仍需要 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 僅允許特定群組

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制群組內的傳送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // User open_ids look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## 取得群組/使用者 ID

### 群組 ID (`chat_id`，格式：`oc_xxx`)

在飛書/Lark 中開啟該群組，點擊右上角的選單圖示，並前往**設定**。群組 ID (`chat_id`) 列於設定頁面上。

![取得群組 ID](/images/feishu-get-group-id.png)

### 使用者 ID (`open_id`，格式：`ou_xxx`)

啟動 Gateway，發送私訊給機器人，然後檢查日誌：

```bash
openclaw logs --follow
```

在日誌輸出中尋找 `open_id`。您也可以檢查待處理的配對請求：

```bash
openclaw pairing list feishu
```

---

## 常用指令

| 指令      | 說明               |
| --------- | ------------------ |
| `/status` | 顯示機器人狀態     |
| `/reset`  | 重設目前的工作階段 |
| `/model`  | 顯示或切換 AI 模型 |

> 飛書/Lark 不支援原生斜線指令選單，請將這些以純文字訊息發送。

---

## 疑難排解

### 機器人在群組中無回應

1. 確保機器人已加入群組
2. 確保您有 @提及 機器人（預設為必要）
3. 驗證 `groupPolicy` 未設定為 `"disabled"`
4. 檢查日誌：`openclaw logs --follow`

### 機器人未收到訊息

1. 確保機器人已在飛書開放平台 / Lark Developer 上發佈並審核通過
2. 確保事件訂閱包含 `im.message.receive_v1`
3. 確保已選取**持久連線** (WebSocket)
4. 確保已授予所有必要的權限範圍
5. 確保 Gateway 正在運作：`openclaw gateway status`
6. 檢查日誌：`openclaw logs --follow`

### App Secret 外洩

1. 在飛書開放平台 / Lark Developer 重設 App Secret
2. 更新您的設定檔中的數值
3. 重新啟動 Gateway：`openclaw gateway restart`

---

## 進階設定

### 多個帳號

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

當 outbound APIs 未指定 `accountId` 時，`defaultAccount` 控制要使用哪個帳號。

### 訊息限制

- `textChunkLimit` — 出站文字區塊大小（預設：`2000` 字元）
- `mediaMaxMb` — 媒體上傳/下載限制（預設：`30` MB）

### 串流

Feishu/Lark 支援透過互動卡片進行串流回覆。啟用後，機器人會在產生文字時即時更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // enable block-level streaming (default: true)
    },
  },
}
```

設定 `streaming: false` 以在單一訊息中傳送完整回覆。

### 配額優化

使用兩個可選旗標來減少 Feishu/Lark API 呼叫次數：

- `typingIndicator` (預設 `true`)：設定 `false` 以跳過輸入反應呼叫
- `resolveSenderNames` (預設 `true`)：設定 `false` 以跳過傳送者個人資料查詢

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### ACP 會話

Feishu/Lark 支援 DM 和群組訊息串的 ACP。Feishu/Lark ACP 由文字指令驅動 — 沒有原生斜線指令選單，因此請直接在對話中使用 `/acp ...` 訊息。

#### 持續性 ACP 繫結

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 從聊天啟動 ACP

在 Feishu/Lark DM 或訊息串中：

```text
/acp spawn codex --thread here
```

`--thread here` 適用於 DM 和 Feishu/Lark 訊息串。繫結對話中的後續訊息會直接路由至該 ACP 會話。

### 多代理路由

使用 `bindings` 將 Feishu/Lark DM 或群組路由至不同的代理。

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由欄位：

- `match.channel`：`"feishu"`
- `match.peer.kind`：`"direct"` (DM) 或 `"group"` (群組聊天)
- `match.peer.id`：使用者 Open ID (`ou_xxx`) 或群組 ID (`oc_xxx`)

請參閱 [取得群組/使用者 ID](#get-groupuser-ids) 以取得查詢提示。

---

## 組態參考

完整組態：[Gateway configuration](/en/gateway/configuration)

| 設定                                              | 說明                                | 預設             |
| ------------------------------------------------- | ----------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 啟用/停用頻道                       | `true`           |
| `channels.feishu.domain`                          | API 網域 (`feishu` 或 `lark`)       | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件傳輸 (`websocket` 或 `webhook`) | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的預設帳戶                  | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式必填                    | —                |
| `channels.feishu.encryptKey`                      | Webhook 模式必填                    | —                |
| `channels.feishu.webhookPath`                     | Webhook 路由路徑                    | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 綁定主機                    | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 綁定連接埠                  | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                              | —                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                          | —                |
| `channels.feishu.accounts.<id>.domain`            | 每個帳號的網域覆寫                  | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私信 (DM) 政策                      | `allowlist`      |
| `channels.feishu.allowFrom`                       | 私信 (DM) 白名單 (open_id 列表)     | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | 群組政策                            | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群組白名單                          | —                |
| `channels.feishu.requireMention`                  | 群組中需要 @提及                    | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | 每個群組的 @提及 覆寫               | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | 啟用/停用特定群組                   | `true`           |
| `channels.feishu.textChunkLimit`                  | 訊息區塊大小                        | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒體大小限制                        | `30`             |
| `channels.feishu.streaming`                       | 串流卡片輸出                        | `true`           |
| `channels.feishu.blockStreaming`                  | 區塊層級串流                        | `true`           |
| `channels.feishu.typingIndicator`                 | 傳送正在輸入反應                    | `true`           |
| `channels.feishu.resolveSenderNames`              | 解析發送者顯示名稱                  | `true`           |

---

## 支援的訊息類型

### 接收

- ✅ 文字
- ✅ 豐富文字 (貼文)
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 貼圖

### 傳送

- ✅ 文字
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 互動卡片 (包括串流更新)
- ⚠️ 豐富文字 (貼文樣式格式; 不支援完整的 Feishu/Lark 編輯功能)

### 主題與回覆

- ✅ 內聯回覆
- ✅ 主題回覆
- ✅ 回覆主題訊息時，媒體回覆會保持主題感知

---

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證與配對流程
- [群組](/en/channels/groups) — 群聊行為與提及門檻
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與加固
