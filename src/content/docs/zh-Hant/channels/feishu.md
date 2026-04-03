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

造訪 [飛書開放平台](https://open.feishu.cn/app) 並登入。

Lark（全球版）租戶應使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 並在飛書配置中設定 `domain: "lark"`。

### 2. 建立應用程式

1. 按一下 **建立企業應用程式**
2. 填寫應用程式名稱和描述
3. 選擇應用程式圖示

![Create enterprise app](/images/feishu-step2-create-app.png)

### 3. 複製憑證

從 **憑證與基本資訊** 中，複製：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：** 請勿公開 App Secret。

![Get credentials](/images/feishu-step3-credentials.png)

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

![Configure permissions](/images/feishu-step4-permissions.png)

### 5. 啟用機器人功能

在 **應用程式能力** > **機器人** 中：

1. 啟用機器人功能
2. 設定機器人名稱

![Enable bot capability](/images/feishu-step5-bot-capability.png)

### 6. 配置事件訂閱

⚠️ **重要提示：** 在設置事件訂閱之前，請確保：

1. 您已針對飛書執行了 `openclaw channels add`
2. Gateway 正在執行中（`openclaw gateway status`）

在 **事件訂閱** 中：

1. 選擇 **使用長連接接收事件** (WebSocket)
2. 新增事件：`im.message.receive_v1`
3. （可選）針對雲端文件評論工作流程，同時新增：`drive.notice.comment_add_v1`

⚠️ 如果 Gateway 未在執行中，長連線設定可能無法儲存。

![Configure event subscription](/images/feishu-step6-event-subscription.png)

### 7. 發布應用程式

1. 在 **版本管理與發布** 中建立版本
2. 提交審核並發布
3. 等待管理員核准（企業應用程式通常會自動核准）

---

## 步驟 2：設定 OpenClaw

### 使用精靈設定（推薦）

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
          name: "My AI assistant",
        },
      },
    },
  },
}
```

如果您使用 `connectionMode: "webhook"`，請同時設定 `verificationToken` 和 `encryptKey`。飛書 webhook 伺服器預設綁定至 `127.0.0.1`；僅在您刻意需要不同的綁定位址時才設定 `webhookHost`。

#### 驗證 Token 和加密金鑰（webhook 模式）

使用 webhook 模式時，請在設定中同時設定 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。若要取得這些值：

1. 在飛書開放平台中，開啟您的應用程式
2. 前往 **開發配置** → **事件與回調**（Development → Events & Callbacks）
3. 開啟 **加密策略** 分頁（Encryption）
4. 複製 **驗證 Token** 和 **加密金鑰**（Verification Token 和 Encrypt Key）

下方的螢幕截圖顯示了在哪裡可以找到 **Verification Token**。**Encrypt Key** 則列在同一個 **Encryption** 區塊中。

![Verification Token location](/images/feishu-verification-token.png)

### 透過環境變數設定

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（全球）網域

如果您的租戶使用的是 Lark（國際版），請將網域設為 `lark`（或完整的網域字串）。您可以透過 `channels.feishu.domain` 或針對每個帳戶（`channels.feishu.accounts.<id>.domain`）進行設定。

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

### 配額優化旗標

您可以使用兩個可選旗標來減少 Feishu API 的使用量：

- `typingIndicator`（預設為 `true`）：當 `false` 時，跳過輸入反應（typing reaction）呼叫。
- `resolveSenderNames`（預設為 `true`）：當 `false` 時，跳過發送者資料查詢呼叫。

您可以在頂層或針對每個帳戶進行設定：

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

### 2. 發送測試訊息

在 Feishu 中，找到您的機器人並發送訊息。

### 3. 核准配對

預設情況下，機器人會回覆一個配對碼。請核准它：

```bash
openclaw pairing approve feishu <CODE>
```

核准後，您就可以正常聊天了。

---

## 概覽

- **Feishu 機器人頻道**：由閘道管理的 Feishu 機器人
- **確定性路由**：回覆總是返回到 Feishu
- **會話隔離**：私訊共用一個主會話；群組則是隔離的
- **WebSocket 連線**：透過 Feishu SDK 進行長連線，不需要公開 URL

---

## 存取控制

### 私訊

- **預設**：`dmPolicy: "pairing"`（未知使用者會收到配對碼）
- **核准配對**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **白名單模式**：設定 `channels.feishu.allowFrom` 並填入允許的 Open ID

### 群組聊天

**1. 群組政策**（`channels.feishu.groupPolicy`）：

- `"open"` = 允許群組中的所有人
- `"allowlist"` = 僅允許 `groupAllowFrom`
- `"disabled"` = 停用群組訊息

預設：`allowlist`

**2. 提及要求**（`channels.feishu.requireMention`，可透過 `channels.feishu.groups.<chat_id>.requireMention` 覆寫）：

- 明確設為 `true` = 需要 @提及
- 明確設為 `false` = 無需提及即可回應
- 未設定且 `groupPolicy: "open"` = 預設為 `false`
- 未設定且 `groupPolicy` 不是 `"open"` = 預設為 `true`

---

## 群組配置範例

### 允許所有群組，不需要 @提及（開放群組的預設值）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允許所有群組，但仍需 @提及

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

### 限制哪些傳送者可以在群組中發送訊息（傳送者白名單）

除了允許群組本身之外，該群組中的**所有訊息**都會根據傳送者的 open_id 進行過濾：只有列在 `groups.<chat_id>.allowFrom` 中的使用者的訊息會被處理；來自其他成員的訊息將被忽略（這是完整的傳送者層級過濾，不僅限於 /reset 或 /new 等控制指令）。

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

<a id="get-groupuser-ids"></a>

## 取得群組/使用者 ID

### 群組 ID (chat_id)

群組 ID 看起來像 `oc_xxx`。

**方法 1（推薦）**

1. 啟動閘道並在群組中 @提及機器人
2. 執行 `openclaw logs --follow` 並尋找 `chat_id`

**方法 2**

使用 Feishu API 除錯工具列出群組聊天。

### 使用者 ID (open_id)

使用者 ID 看起來像 `ou_xxx`。

**方法 1（推薦）**

1. 啟動閘道並私訊機器人
2. 執行 `openclaw logs --follow` 並尋找 `open_id`

**方法 2**

檢查配對請求以取得使用者 Open ID：

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

> 注意：Feishu 尚不支援原生指令選單，因此必須以文字形式傳送指令。

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

1. 請確認已將機器人加入群組
2. 請確認您有 @提及機器人（預設行為）
3. 檢查 `groupPolicy` 未設定為 `"disabled"`
4. 檢查日誌：`openclaw logs --follow`

### Bot 未收到訊息

1. 確保 App 已發布並獲批准
2. 確保事件訂閱包含 `im.message.receive_v1`
3. 確保已啟用 **長連線**
4. 確保 App 權限完整
5. 確保閘道正在執行：`openclaw gateway status`
6. 檢查日誌：`openclaw logs --follow`

### App Secret 洩漏

1. 在飛書開放平台重置 App Secret
2. 在您的設定中更新 App Secret
3. 重新啟動閘道

### 訊息發送失敗

1. 確保 App 具有 `im:message:send_as_bot` 權限
2. 確保 App 已發布
3. 檢查日誌以了解詳細錯誤

---

## 進階設定

### 多個帳戶

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

`defaultAccount` 控制當傳出 API 未明確指定 `accountId` 時使用哪個飛書帳戶。

### 訊息限制

- `textChunkLimit`：傳出文字區塊大小（預設：2000 個字元）
- `mediaMaxMb`：媒體上傳/下載限制（預設：30MB）

### 串流

飛書支援透過互動卡片進行串流回覆。啟用後，Bot 會在產生文字時更新卡片。

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

飛書對以下內容支援 ACP：

- 私訊
- 群組主題對話

飛書 ACP 由文字指令驅動。沒有原生的斜線指令選單，因此請直接在對話中使用 `/acp ...` 訊息。

#### 永久 ACP 綁定

使用頂層類型化的 ACP 綁定將飛書私訊或主題對話固定到永久 ACP 會話。

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

#### 從聊天中產生執行緒綁定的 ACP

在飛書私訊或主題對話中，您可以就地產生並綁定 ACP 會話：

```text
/acp spawn codex --thread here
```

注意事項：

- `--thread here` 適用於私訊和飛書主題。
- 綁定的私訊/主題中的後續訊息會直接路由到該 ACP 會話。
- v1 不針對一般非主題群組聊天。

### 多 Agent 路由

使用 `bindings` 將飛書私訊或群組路由到不同的 Agent。

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

- `match.channel`: `"feishu"`
- `match.peer.kind`: `"direct"` 或 `"group"`
- `match.peer.id`：使用者 Open ID（`ou_xxx`）或群組 ID（`oc_xxx`）

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
| `channels.feishu.accounts.<id>.appId`             | App ID                         | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                     | -                |
| `channels.feishu.accounts.<id>.domain`            | 各帳戶 API 網域覆蓋            | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私訊 (DM) 政策                 | `pairing`        |
| `channels.feishu.allowFrom`                       | 私訓允許清單（open_id 清單）   | -                |
| `channels.feishu.groupPolicy`                     | 群組政策                       | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群組允許清單                   | -                |
| `channels.feishu.requireMention`                  | 預設需要 @提及                 | 有條件           |
| `channels.feishu.groups.<chat_id>.requireMention` | 各群組需要 @提及覆蓋           | 繼承             |
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
| `"disabled"`  | 停用 DM                                           |

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
- ✅ 互動式卡片
- ⚠️ 豐富文字 (貼文樣式格式與卡片，而非飛書任意的編輯功能)

### 主題串與回覆

- ✅ 內聯回覆
- ✅ 當飛書公開 `reply_in_thread` 時的主題串回覆
- ✅ 當回覆主題串/主題訊息時，媒體回覆會保持主題串感知

## 雲端文件留言

當有人在飛書雲端文件（文件、試算表
等）上新增留言時，飛書可以觸發代理程式。代理程式會收到留言文字、文件內容以及留言主題串，以便
在主題串中回覆或編輯文件。

需求：

- 在您的飛書應用程式事件訂閱設定中訂閱 `drive.notice.comment_add_v1`
  （以及現有的 `im.message.receive_v1`）
- 雲端文件工具預設為啟用；使用 `channels.feishu.tools.drive: false` 停用

`feishu_drive` 工具公開了這些留言動作：

| 動作                   | 描述                   |
| ---------------------- | ---------------------- |
| `list_comments`        | 列出文件上的留言       |
| `list_comment_replies` | 列出留言主題串中的回覆 |
| `add_comment`          | 新增頂層留言           |
| `reply_comment`        | 回覆現有的留言主題串   |

當代理程式處理雲端文件留言事件時，它會收到：

- 留言文字和發送者
- 文件中繼資料（標題、類型、URL）
- 用於主題串內回覆的留言主題串內容

在編輯文件後，Agent 會被引導使用 `feishu_drive.reply_comment` 通知評論者，然後輸出 `NO_REPLY` 以避免重複發送。

## 執行時操作介面

飛書目前公開了這些執行時操作：

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
- 當在配置中啟用了表情反應時，`react` 和 `reactions`
- `feishu_drive` 評論操作：`list_comments`、`list_comment_replies`、`add_comment`、`reply_comment`

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊認證和配對流程
- [群組](/en/channels/groups) — 群聊行為和提及控制
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型和加固
