---
summary: "Feishu 機器人概述、功能和設定"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: 飛書
---

# 飛書機器人

飛書（Lark）是企業用於訊息傳遞和協作的團隊聊天平台。此外掛程式透過平台的 WebSocket 事件訂閱將 OpenClaw 連線到飛書/Lark 機器人，因此無需公開公開的 webhook URL 即可接收訊息。

---

## 隨附的外掛程式

飛書隨附於目前的 OpenClaw 版本中，因此無需單獨安裝外掛程式。

如果您使用的是較舊的版本或未包含隨附飛書的自訂安裝，請手動安裝：

```bash
openclaw plugins install @openclaw/feishu
```

---

## 快速入門

有兩種方式可以新增飛書頻道：

### 方法 1：入門（建議）

如果您剛安裝 OpenClaw，請執行入門程式：

```bash
openclaw onboard
```

精靈會引導您完成以下操作：

1. 建立飛書應用程式並收集憑證
2. 在 OpenClaw 中設定應用程式憑證
3. 啟動閘道

✅ **設定完成後**，檢查閘道狀態：

- `openclaw gateway status`
- `openclaw logs --follow`

### 方法 2：CLI 設定

如果您已完成初始安裝，請透過 CLI 新增頻道：

```bash
openclaw channels add
```

選擇 **Feishu**，然後輸入 App ID 和 App Secret。

✅ **設定完成後**，管理閘道：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## 步驟 1：建立飛書應用程式

### 1. 開啟飛書開放平台

造訪[飛書開放平台](https://open.feishu.cn/app)並登入。

Lark（全球）租戶應使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 並在飛書設定中設定 `domain: "lark"`。

### 2. 建立應用程式

1. 按一下 **建立企業應用程式**
2. 填寫應用程式名稱和描述
3. 選擇應用程式圖示

![建立企業應用程式](/images/feishu-step2-create-app.png)

### 3. 複製憑證

從 **憑證與基本資訊** 中，複製：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：** 請勿公開 App Secret。

![取得憑證](/images/feishu-step3-credentials.png)

### 4. 設定權限

在 **權限** 上，按一下 **批次匯入** 並貼上：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![設定權限](/images/feishu-step4-permissions.png)

### 5. 啟用機器人功能

在 **應用程式能力** > **機器人** 中：

1. 啟用機器人功能
2. 設定機器人名稱

![啟用機器人能力](/images/feishu-step5-bot-capability.png)

### 6. 配置事件訂閱

⚠️ **重要提示：** 在設置事件訂閱之前，請確保：

1. 您已經為飛書運行了 `openclaw channels add`
2. 閘道正在運行 (`openclaw gateway status`)

在 **事件訂閱** 中：

1. 選擇 **使用長連接接收事件** (WebSocket)
2. 添加事件：`im.message.receive_v1`

⚠️ 如果閘道未運行，長連接設置可能會保存失敗。

![配置事件訂閱](/images/feishu-step6-event-subscription.png)

### 7. 發布應用

1. 在 **版本管理與發布** 中創建版本
2. 提交審核並發布
3. 等待管理員批准（企業應用通常會自動批准）

---

## 步驟 2：配置 OpenClaw

### 使用精靈配置（推薦）

```bash
openclaw channels add
```

選擇 **Feishu** 並粘貼您的 App ID + App Secret。

### 通過配置文件配置

編輯 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "My AI assistant",
        },
      },
    },
  },
}
```

如果您使用 `connectionMode: "webhook"`，請同時設置 `verificationToken` 和 `encryptKey`。飛書 webhook 伺服器默認綁定到 `127.0.0.1`；僅當您有意需要不同的綁定地址時才設置 `webhookHost`。

#### 驗證令牌和加密密鑰 (webhook 模式)

使用 webhook 模式時，請在配置中設置 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。要獲取這些值：

1. 在飛書開放平台中，打開您的應用
2. 前往 **開發配置** → **事件與回調** (Development → Events & Callbacks)
3. 打開 **加密策略** 標籤 (Encryption)
4. 複製 **驗證令牌** 和 **加密密鑰**

下方的截圖顯示了在哪裡可以找到 **驗證令牌**。**加密密鑰** 列在同一個 **加密策略** 部分中。

![驗證令牌位置](/images/feishu-verification-token.png)

### 通過環境變量配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark (全球版) 域名

如果您的租戶使用的是 Lark (國際版)，請將域名設置為 `lark` (或完整的域名字符串)。您可以在 `channels.feishu.domain` 或每個帳戶 (`channels.feishu.accounts.<id>.domain`) 中設置它。

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### 配額優化標誌

您可以通過兩個可選標誌減少飛書 API 的使用：

- `typingIndicator` (預設 `true`)：當 `false` 時，跳過正在輸入反應呼叫。
- `resolveSenderNames` (預設 `true`)：當 `false` 時，跳過傳送者個人資料查詢呼叫。

在最上層或每個帳戶設定它們：

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## 步驟 3：啟動 + 測試

### 1. 啟動閘道

```bash
openclaw gateway
```

### 2. 傳送測試訊息

在飛書中，尋找您的機器人並傳送訊息。

### 3. 核准配對

根據預設，機器人會回覆配對碼。請核准它：

```bash
openclaw pairing approve feishu <CODE>
```

核准後，您就可以正常聊天。

---

## 概覽

- **飛書機器人頻道**：由閘道管理的飛書機器人
- **確定性路由**：回覆總是返回飛書
- **會話隔離**：私人訊息共用一個主會話；群組是隔離的
- **WebSocket 連線**：透過飛書 SDK 的長連線，不需要公開 URL

---

## 存取控制

### 私人訊息

- **預設**：`dmPolicy: "pairing"` (未知使用者會收到配對碼)
- **核准配對**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **白名單模式**：設定 `channels.feishu.allowFrom` 填入允許的 Open ID

### 群組聊天

**1. 群組原則** (`channels.feishu.groupPolicy`)：

- `"open"` = 允許群組中的所有人
- `"allowlist"` = 僅允許 `groupAllowFrom`
- `"disabled"` = 停用群組訊息

預設：`allowlist`

**2. 提及要求** (`channels.feishu.requireMention`，可透過 `channels.feishu.groups.<chat_id>.requireMention` 覆寫)：

- 明確設定 `true` = 需要 @提及
- 明確設定 `false` = 無需提及即可回應
- 未設定且 `groupPolicy: "open"` = 預設為 `false`
- 未設定且 `groupPolicy` 不是 `"open"` = 預設為 `true`

---

## 群組配置範例

### 允許所有群組，不需要 @提及 (開放群組的預設值)

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
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制群組中哪些傳送者可以傳送訊息 (傳送者白名單)

除了允許群組本身外，該群組中的**所有訊息**都會根據發送者的 open_id 進行過濾：只有列在 `groups.<chat_id>.allowFrom` 中的使用者，其訊息才會被處理；來自成員的訊息會被忽略（這是完整的發送者級別過濾，不僅限於 /reset 或 /new 等控制指令）。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // Feishu user IDs (open_id) look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## 取得群組/使用者 ID

### 群組 ID (chat_id)

群組 ID 看起來像 `oc_xxx`。

**方法 1（推薦）**

1. 啟動閘道並在群組中 @提及 機器人
2. 執行 `openclaw logs --follow` 並尋找 `chat_id`

**方法 2**

使用 Feishu API 除錯工具列出群組聊天。

### 使用者 ID (open_id)

使用者 ID 看起來像 `ou_xxx`。

**方法 1（推薦）**

1. 啟動閘道並私訊（DM）機器人
2. 執行 `openclaw logs --follow` 並尋找 `open_id`

**方法 2**

檢查配對請求中的使用者 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用指令

| 指令      | 說明           |
| --------- | -------------- |
| `/status` | 顯示機器人狀態 |
| `/reset`  | 重置會話       |
| `/model`  | 顯示/切換模型  |

> 注意：Feishu 尚不支援原生指令選單，因此必須以文字形式發送指令。

## 閘道管理指令

| 指令                       | 說明              |
| -------------------------- | ----------------- |
| `openclaw gateway status`  | 顯示閘道狀態      |
| `openclaw gateway install` | 安裝/啟動閘道服務 |
| `openclaw gateway stop`    | 停止閘道服務      |
| `openclaw gateway restart` | 重新啟動閘道服務  |
| `openclaw logs --follow`   | 追蹤閘道日誌      |

---

## 疑難排解

### 機器人在群組聊天中無回應

1. 確保機器人已加入群組
2. 確保您 @提及 機器人（預設行為）
3. 檢查 `groupPolicy` 未設為 `"disabled"`
4. 檢查日誌：`openclaw logs --follow`

### 機器人未收到訊息

1. 確保應用程式已發佈並通過審核
2. 確保事件訂閱包含 `im.message.receive_v1`
3. 確保已啟用 **長連線**
4. 確保應用程式權限完整
5. 確保閘道正在執行：`openclaw gateway status`
6. 檢查日誌：`openclaw logs --follow`

### App Secret 外洩

1. 在 Feishu 開放平台重設 App Secret
2. 在您的設定中更新 App Secret
3. 重新啟動閘道

### 訊息發送失敗

1. 確保應用程式具有 `im:message:send_as_bot` 權限
2. 確保應用程式已發布
3. 檢查日誌以獲取詳細錯誤資訊

---

## 進階設定

### 多重帳號

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

當輸出 API 未明確指定 `accountId` 時，`defaultAccount` 控制使用哪個飛書帳號。

### 訊息限制

- `textChunkLimit`：輸出文字區塊大小（預設：2000 個字元）
- `mediaMaxMb`：媒體上傳/下載限制（預設：30MB）

### 串流

飛書透過互動式卡片支援串流回覆。啟用後，機器人會在產生文字時更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

設定 `streaming: false` 以在發送前等待完整回覆。

### ACP 會話

飛書支援以下 ACP：

- 私人訊息 (DM)
- 群組主題對話

飛書 ACP 是由文字指令驅動的。沒有原生的斜線指令選單，因此請直接在對話中使用 `/acp ...` 訊息。

#### 持續性 ACP 綁定

使用頂層類型化的 ACP 綁定，將飛書私人訊息或主題對話固定到持續性 ACP 會話。

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

#### 從聊天中產生線程綁定的 ACP

在飛書私人訊息或主題對話中，您可以就地產生並綁定 ACP 會話：

```text
/acp spawn codex --thread here
```

備註：

- `--thread here` 適用於私人訊息和飛書主題。
- 已綁定私人訊息/主題中的後續訊息會直接路由至該 ACP 會話。
- v1 不針對一般的非主題群組聊天。

### 多重代理程式路由

使用 `bindings` 將飛書私人訊息或群組路由至不同的代理程式。

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
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
- `match.peer.kind`：`"direct"` 或 `"group"`
- `match.peer.id`：使用者 Open ID (`ou_xxx`) 或群組 ID (`oc_xxx`)

請參閱 [取得群組/使用者 ID](#get-groupuser-ids) 以了解查詢提示。

---

## 設定參考

完整設定：[Gateway configuration](/en/gateway/configuration)

主要選項：

| 設定                                              | 描述                           | 預設值           |
| ------------------------------------------------- | ------------------------------ | ---------------- |
| `channels.feishu.enabled`                         | 啟用/停用頻道                  | `true`           |
| `channels.feishu.domain`                          | API 網域（`feishu` 或 `lark`） | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件傳輸模式                   | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的預設帳戶 ID          | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式所需               | -                |
| `channels.feishu.encryptKey`                      | Webhook 模式所需               | -                |
| `channels.feishu.webhookPath`                     | Webhook 路由路徑               | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 綁定主機               | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 綁定連接埠             | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | 應用程式 ID                    | -                |
| `channels.feishu.accounts.<id>.appSecret`         | 應用程式金鑰                   | -                |
| `channels.feishu.accounts.<id>.domain`            | 各帳戶 API 網域覆寫            | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私訊策略                       | `pairing`        |
| `channels.feishu.allowFrom`                       | 私訊允許名單（open_id 清單）   | -                |
| `channels.feishu.groupPolicy`                     | 群組策略                       | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群組允許名單                   | -                |
| `channels.feishu.requireMention`                  | 預設需要 @提及                 | 有條件           |
| `channels.feishu.groups.<chat_id>.requireMention` | 各群組需要 @提及覆寫           | 繼承             |
| `channels.feishu.groups.<chat_id>.enabled`        | 啟用群組                       | `true`           |
| `channels.feishu.textChunkLimit`                  | 訊息區塊大小                   | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒體大小限制                   | `30`             |
| `channels.feishu.streaming`                       | 啟用串流卡片輸出               | `true`           |
| `channels.feishu.blockStreaming`                  | 啟用區塊串流                   | `true`           |

---

## dmPolicy 參考

| 數值          | 行為                                              |
| ------------- | ------------------------------------------------- |
| `"pairing"`   | **預設。** 未知使用者會收到配對代碼；必須經過核准 |
| `"allowlist"` | 僅 `allowFrom` 中的使用者可以聊天                 |
| `"open"`      | 允許所有使用者（allowFrom 中需要 `"*"`）          |
| `"disabled"`  | 停用私人訊息 (DMs)                                |

---

## 支援的訊息類型

### 接收

- ✅ 文字
- ✅ 豐富格式文字 (貼文)
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 貼圖

### 發送

- ✅ 文字
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 互動式卡片
- ⚠️ 豐富格式文字 (貼文樣式格式和卡片，非任意的飛書編輯功能)

### 主題串與回覆

- ✅ 內聯回覆
- ✅ 當飛書公開 `reply_in_thread` 時的主題串回覆
- ✅ 當回覆主題串/主題訊息時，媒體回覆會保持主題串感知

## 執行時動作介面

飛書目前公開這些執行時動作：

- `send`
- `read`
- `edit`
- `thread-reply`
- `pin`
- `list-pins`
- `unpin`
- `member-info`
- `channel-info`
- `channel-list`
- 當在設定中啟用反應時的 `react` 和 `reactions`
