---
summary: "Feishu 機器人概覽、功能和配置"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu 機器人

Feishu (Lark) 是企業用於通訊和協作的團隊聊天平台。此外掛程式透過平台的 WebSocket 事件訂閱將 OpenClaw 連線到 Feishu/Lark 機器人，以便在無需公開公開 Webhook URL 的情況下接收訊息。

---

## 隨附外掛程式

目前的 OpenClaw 版本內建了 Feishu，因此無需單獨安裝外掛程式。

如果您使用的是未包含內建 Feishu 的舊版本或自訂安裝，請手動安裝：

```bash
openclaw plugins install @openclaw/feishu
```

---

## 快速入門

有兩種方法可以新增 Feishu 頻道：

### 方法 1：導入 (推薦)

如果您剛安裝 OpenClaw，請執行導入程序：

```bash
openclaw onboard
```

精靈將引導您完成以下步驟：

1. 建立 Feishu 應用程式並收集憑證
2. 在 OpenClaw 中設定應用程式憑證
3. 啟動閘道

✅ **完成配置後**，請檢查 Gateway 狀態：

- `openclaw gateway status`
- `openclaw logs --follow`

### 方法 2：CLI 設定

如果您已經完成了初始安裝，請透過 CLI 新增頻道：

```bash
openclaw channels add
```

選擇 **Feishu**，然後輸入 App ID 和 App Secret。

✅ **完成配置後**，管理 Gateway：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## 步驟 1：建立 Feishu 應用程式

### 1. 開啟 Feishu 開放平台

造訪 [Feishu 開放平台](https://open.feishu.cn/app) 並登入。

Lark (全球版) 租戶應使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 並在 Feishu 設定中設定 `domain: "lark"`。

### 2. 建立應用程式

1. 點擊 **Create enterprise app**
2. 填寫應用程式名稱 + 描述
3. 選擇應用程式圖示

![Create enterprise app](../images/feishu-step2-create-app.png)

### 3. 複製憑證

從 **Credentials & Basic Info** 複製：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：** 請妥善保管 App Secret，不要公開。

![Get credentials](../images/feishu-step3-credentials.png)

### 4. 設定權限

在 **權限 (Permissions)** 頁面，點擊 **批量匯入** 並貼上：

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

![Configure permissions](../images/feishu-step4-permissions.png)

### 5. 啟用機器人功能

在 **App 能力 (App Capability)** > **機器人 (Bot)** 中：

1. 啟用機器人能力
2. 設定機器人名稱

![Enable bot capability](../images/feishu-step5-bot-capability.png)

### 6. 設定事件訂閱

⚠️ **重要：** 在設定事件訂閱之前，請確認：

1. 您已經針對 Feishu 執行了 `openclaw channels add`
2. Gateway 正在運行中 (`openclaw gateway status`)

在 **事件訂閱 (Event Subscription)** 中：

1. 選擇 **使用長連線接收事件** (WebSocket)
2. 新增事件：`im.message.receive_v1`

⚠️ 如果閘道未運行，長連線設定可能無法儲存。

![設定事件訂閱](../images/feishu-step6-event-subscription.png)

### 7. 發布應用程式

1. 在 **版本管理與發布** 中建立一個版本
2. 提交審核並發布
3. 等待管理員審批（企業應用程式通常會自動審批）

---

## 步驟 2：設定 OpenClaw

### 使用精靈設定（建議）

```bash
openclaw channels add
```

選擇 **Feishu** 並貼上您的 App ID + App Secret。

### 透過設定檔設定

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
          botName: "My AI assistant",
        },
      },
    },
  },
}
```

如果您使用 `connectionMode: "webhook"`，請同時設定 `verificationToken` 和 `encryptKey`。Feishu webhook 伺服器預設綁定至 `127.0.0.1`；僅在您刻意需要不同的綁定位址時才設定 `webhookHost`。

#### 驗證權杖與加密金鑰（webhook 模式）

使用 webhook 模式時，請在設定中同時設定 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。若要取得數值：

1. 在飛書開放平台中，開啟您的應用程式
2. 前往 **Development** → **Events & Callbacks** (開發配置 → 事件與回調)
3. 開啟 **Encryption** 分頁 (加密策略)
4. 複製 **Verification Token** 和 **Encrypt Key**

下圖顯示了 **Verification Token** 的位置。**Encrypt Key** 列於同一個 **Encryption** 區塊中。

![Verification Token location](../images/feishu-verification-token.png)

### 透過環境變數進行設定

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark (全球) 網域

如果您的租戶位於 Lark (國際版)，請將網域設為 `lark` (或完整的網域字串)。您可以在 `channels.feishu.domain` 或每個帳戶 (`channels.feishu.accounts.<id>.domain`) 中進行設定。

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

### 配額最佳化旗標

您可以使用兩個可選標誌來減少 Feishu API 使用量：

- `typingIndicator`（預設 `true`）：當 `false` 時，跳過輸入反應呼叫。
- `resolveSenderNames`（預設 `true`）：當 `false` 時，跳過發送者資料查找呼叫。

在頂層或每個帳戶設置它們：

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

### 1. 啟動網關

```bash
openclaw gateway
```

### 2. 發送測試訊息

在 Feishu 中，找到您的機器人並發送訊息。

### 3. 批准配對

預設情況下，機器人會回復配對代碼。請批准它：

```bash
openclaw pairing approve feishu <CODE>
```

批准後，您可以正常聊天。

---

## 概覽

- **Feishu 機器人頻道**：由網關管理的 Feishu 機器人
- **確定性路由**：回覆總是返回 Feishu
- **會話隔離**：私訊共享一個主會話；群組是隔離的
- **WebSocket 連線**：通過 Feishu SDK 的長連線，無需公開 URL

---

## 存取控制

### 私人訊息

- **預設值**：`dmPolicy: "pairing"`（未知用戶會收到配對代碼）
- **批准配對**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **白名單模式**：使用允許的 Open ID 設定 `channels.feishu.allowFrom`

### 群組聊天

**1. 群組政策** (`channels.feishu.groupPolicy`)：

- `"open"` = 允許群組中的所有人（預設）
- `"allowlist"` = 僅允許 `groupAllowFrom`
- `"disabled"` = 停用群組訊息

**2. 提及要求** (`channels.feishu.groups.<chat_id>.requireMention`)：

- `true` = 需要 @提及（預設）
- `false` = 無需提及即可回應

---

## 群組配置範例

### 允許所有群組，需要 @提及（預設）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // Default requireMention: true
    },
  },
}
```

### 允許所有群組，不需要 @提及

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
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

### 限制群組中哪些發送者可以發送訊息（發送者白名單）

除了允許該群組本身外，該群組中的 **所有訊息** 都會由傳送者的 open_id 進行過濾：只有列在 `groups.<chat_id>.allowFrom` 中的使用者，其訊息才會被處理；來自其他成員的訊息將被忽略（這是完整的傳送者級別過濾，而不僅適用於 /reset 或 /new 等控制指令）。

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

使用 Feishu API 除錯工具來列出群組聊天。

### 使用者 ID (open_id)

使用者 ID 看起來像 `ou_xxx`。

**方法 1（推薦）**

1. 啟動閘道並傳送私訊 (DM) 給機器人
2. 執行 `openclaw logs --follow` 並尋找 `open_id`

**方法 2**

檢查配對請求以取得使用者 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用指令

| 指令      | 描述           |
| --------- | -------------- |
| `/status` | 顯示機器人狀態 |
| `/reset`  | 重置會話       |
| `/model`  | 顯示/切換模型  |

> 注意：飛書尚不支援原生指令選單，因此必須以文字形式傳送指令。

## 閘道管理指令

| 指令                       | 描述              |
| -------------------------- | ----------------- |
| `openclaw gateway status`  | 顯示閘道狀態      |
| `openclaw gateway install` | 安裝/啟動閘道服務 |
| `openclaw gateway stop`    | 停止閘道服務      |
| `openclaw gateway restart` | 重啟閘道服務      |
| `openclaw logs --follow`   | 追蹤閘道日誌      |

---

## 故障排除

### 機器人在群組聊天中無回應

1. 確保機器人已加入群組
2. 確保您 @提及了機器人（預設行為）
3. 檢查 `groupPolicy` 是否未設為 `"disabled"`
4. 檢查日誌：`openclaw logs --follow`

### Bot 未接收訊息

1. 確保應用程式已發佈並已核准
2. 確保事件訂閱包含 `im.message.receive_v1`
3. 確保已啟用 **長連接**
4. 確保應用程式權限完整
5. 確保閘道正在執行：`openclaw gateway status`
6. 檢查日誌：`openclaw logs --follow`

### App Secret 洩漏

1. 在飛書開放平台重設 App Secret
2. 在您的設定中更新 App Secret
3. 重啟閘道

### 訊息發送失敗

1. 確保應用程式擁有 `im:message:send_as_bot` 權限
2. 確保應用程式已發佈
3. 檢查日誌以取得詳細錯誤資訊

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
          botName: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制當輸出 API 未明確指定 `accountId` 時使用哪個飛書帳號。

### 訊息限制

- `textChunkLimit`：輸出文字區塊大小（預設：2000 字元）
- `mediaMaxMb`：媒體上傳/下載限制（預設：30MB）

### 串流

飛書支援透過互動卡片進行串流回覆。啟用後，機器人會在產生文字時更新卡片。

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

設定 `streaming: false` 以在傳送前等待完整回覆。

### ACP 會話

飛書支援 ACP 的項目：

- 私訊
- 群組主題交談

飛書 ACP 是由文字指令驅動的。沒有原生的斜線指令選單，因此請直接在交談中使用 `/acp ...` 訊息。

#### 持續性 ACP 綁定

使用頂層類型化的 ACP 綁定，將飛書私訊或主題交談釘選到持續性的 ACP 會話。

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

#### 從聊天產生的執行緒綁定 ACP

在飛書私訊或主題交談中，您可以就地產生並綁定 ACP 會話：

```text
/acp spawn codex --thread here
```

備註：

- `--thread here` 適用於私人訊息和飛書話題。
- 綁定的私人訊息/話題中的後續訊息會直接路由到該 ACP 會話。
- v1 不針對通用非話題群組聊天。

### 多智能體路由

使用 `bindings` 將飛書私人訊息或群組路由到不同的智能體。

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

路由字段：

- `match.channel`： `"feishu"`
- `match.peer.kind`： `"direct"` 或 `"group"`
- `match.peer.id`：用戶 Open ID (`ou_xxx`) 或群組 ID (`oc_xxx`)

查看 [Get group/user IDs](#get-groupuser-ids) 瞭解查找提示。

---

## 配置參考

完整配置： [Gateway configuration](/zh-Hant/gateway/configuration)

關鍵選項：

| 設置                                              | 描述                           | 預設             |
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
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                     | -                |
| `channels.feishu.accounts.<id>.domain`            | 每個帳號的 API 網域覆蓋        | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私訊政策                       | `pairing`        |
| `channels.feishu.allowFrom`                       | 私訊白名單 (open_id 列表)      | -                |
| `channels.feishu.groupPolicy`                     | 群組政策                       | `open`           |
| `channels.feishu.groupAllowFrom`                  | 群組白名單                     | -                |
| `channels.feishu.groups.<chat_id>.requireMention` | 要求 @提及                     | `true`           |
| `channels.feishu.groups.<chat_id>.enabled`        | 啟用群組                       | `true`           |
| `channels.feishu.textChunkLimit`                  | 訊息區塊大小                   | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒體大小限制                   | `30`             |
| `channels.feishu.streaming`                       | 啟用串流卡片輸出               | `true`           |
| `channels.feishu.blockStreaming`                  | 啟用區塊串流                   | `true`           |

---

## dmPolicy 參考

| 數值          | 行為                                          |
| ------------- | --------------------------------------------- |
| `"pairing"`   | **預設。** 未知用戶會收到配對碼；必須經過核准 |
| `"allowlist"` | 僅 `allowFrom` 中的用戶可以聊天               |
| `"open"`      | 允許所有用戶（需要在 allowFrom 中設定 `"*"`） |
| `"disabled"`  | 停用私訊                                      |

---

## 支援的訊息類型

### 接收

- ✅ 文字
- ✅ 富文字（貼文）
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
- ⚠️ 富文字（貼文樣式格式和卡片，而非任意 Feishu 編輯功能）

### 主題與回覆

- ✅ 行內回覆
- ✅ 飛書提供 `reply_in_thread` 的話題主串回覆
- ✅ 回覆話題/主題訊息時，媒體回覆會保持主串意識

## 執行時動作介面

飛書目前公開了這些執行時動作：

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
- 當在配置中啟用反應時的 `react` 和 `reactions`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
