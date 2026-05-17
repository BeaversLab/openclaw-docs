---
summary: "飛書機器人概述、功能和設定"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

Feishu/Lark 是一個一體化的協作平台，團隊可以在其中聊天、分享文件、管理日曆並協同完成工作。

**狀態：** 機器人私訊和群組聊天已具備生產環境可用性。WebSocket 是預設模式；webhook 模式為可選。

---

## 快速開始

<Note>需要 OpenClaw 2026.4.25 或更高版本。執行 `openclaw --version` 以檢查。使用 `openclaw update` 進行升級。</Note>

<Steps>
  <Step title="執行通道設定精靈">```bash openclaw channels login --channel feishu ``` 選擇手動設定以貼上來自飛書開放平台的 App ID 和 App Secret，或選擇 QR 設定以自動建立機器人。如果國內版飛書 App 沒有反應，請重新執行設定並選擇手動設定。</Step>

  <Step title="設定完成後，重新啟動閘道以套用變更">```bash openclaw gateway restart ```</Step>
</Steps>

---

## 存取控制

### 私訊

設定 `dmPolicy` 以控制誰可以私訊機器人：

- `"pairing"` - 未知使用者會收到配對碼；透過 CLI 核准
- `"allowlist"` - 只有列在 `allowFrom` 中的使用者可以聊天（預設：僅機器人擁有者）
- `"open"` - 僅當 `allowFrom` 包含 `"*"` 時才允許公開私訊；若有限制性條目，僅符合的使用者可以聊天
- `"disabled"` - 停用所有私訊

**核准配對請求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群組聊天

**群組原則** (`channels.feishu.groupPolicy`)：

| 數值          | 行為                                                               |
| ------------- | ------------------------------------------------------------------ |
| `"open"`      | 回應群組中的所有訊息                                               |
| `"allowlist"` | 僅回應 `groupAllowFrom` 中或在 `groups.<chat_id>` 下明確設定的群組 |
| `"disabled"`  | 停用所有群組訊息；明確的 `groups.<chat_id>` 條目不會覆寫此設定     |

預設： `allowlist`

**提及要求** (`channels.feishu.requireMention`)：

- `true` - 需要 @提及（預設）
- `false` - 無需 @提及即可回應
- 各群組覆寫： `channels.feishu.groups.<chat_id>.requireMention`
- 僅廣播 `@all` 和 `@_all` 不會被視為提及機器人。如果訊息同時提及了 `@all` 並直接提及機器人，仍算作提及機器人。

---

## 群組配置範例

### 允許所有群組，無需 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允許所有群組，仍需要 @提及

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

在 `allowlist` 模式下，您也可以通過添加顯式的 `groups.<chat_id>` 條目來允許一個群組。顯式條目不會覆蓋 `groupPolicy: "disabled"`。`groups.*` 下的通配符默認值會配置匹配的群組，但它們本身不會允許群組。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### 限制群組內的發送者

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

<a id="get-groupuser-ids"></a>

## 取得群組/使用者 ID

### 群組 ID (`chat_id`，格式：`oc_xxx`)

在 Feishu/Lark 中打開群組，點擊右上角的選單圖示，然後進入 **Settings**。群組 ID (`chat_id`) 會列在設定頁面上。

![取得群組 ID](/images/feishu-get-group-id.png)

### 使用者 ID (`open_id`，格式：`ou_xxx`)

啟動 gateway，傳送私訊給機器人，然後檢查日誌：

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

<Note>飛書/Lark 不支援原生的斜線指令選單，因此請將這些作為純文字訊息發送。</Note>

---

## 疑難排解

### 機器人在群組中不回應

1. 確保機器人已加入群組
2. 確保您有 @提及機器人（預設為必填）
3. 驗證 `groupPolicy` 不是 `"disabled"`
4. 檢查日誌：`openclaw logs --follow`

### 機器人未收到訊息

1. 確保機器人已在飛書開放平台 / Lark 開發者平台發布並核准
2. 確保事件訂閱包含 `im.message.receive_v1`
3. 確保已選取 **持久連線** (WebSocket)
4. 確保已授予所有必要的權限範圍
5. 確保閘道正在運行：`openclaw gateway status`
6. 檢查日誌：`openclaw logs --follow`

### 飛書 App 無法回應 QR 設定

1. 重新執行設定：`openclaw channels login --channel feishu`
2. 選擇手動設定
3. 在飛書開放平台，建立一個自建應用並複製其 App ID 和 App Secret
4. 將這些憑證貼入設定精靈

### App Secret 外洩

1. 在飛書開放平台 / Lark Developer 重設 App Secret
2. 更新您的設定中的值
3. 重新啟動閘道：`openclaw gateway restart`

---

## 進階設定

### 多帳號

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
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
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

`defaultAccount` 控制當輸出 API 未指定 `accountId` 時使用哪個帳號。
`accounts.<id>.tts` 使用與 `messages.tts` 相同的結構，並與全域 TTS 設定進行深度合併，因此多機器人飛書設定可以全域保留共享的供應商憑證，同時僅針對每個帳號覆寫語音、模型、角色或自動模式。

### 訊息限制

- `textChunkLimit` - 輸出文字區塊大小（預設：`2000` 字元）
- `mediaMaxMb` - 媒體上傳/下載限制（預設：`30` MB）

### 串流

飛書/Lark 支援透過互動卡片進行串流回覆。啟用後，機器人會在產生文字時即時更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // opt into completed-block streaming
    },
  },
}
```

設定 `streaming: false` 以在一則訊息中傳送完整回覆。`blockStreaming` 預設為關閉；僅在您希望在最終回覆之前清除已完成的助理區塊時才啟用它。

### 配額優化

使用兩個可選選項減少飛書/Lark API 呼叫次數：

- `typingIndicator`（預設 `true`）：設定 `false` 以跳過輸入中反應呼叫
- `resolveSenderNames`（預設 `true`）：設定 `false` 以跳過傳送者個人資料查詢

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

Feishu/Lark 支援私訊和群組串列訊息的 ACP。Feishu/Lark ACP 是由文字指令驅動的 - 沒有原生的斜線指令選單，因此請直接在對話中使用 `/acp ...` 訊息。

#### 持續性 ACP 綁定

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

#### 從聊天中啟動 ACP

在 Feishu/Lark 私訊或串列中：

```text
/acp spawn codex --thread here
```

`--thread here` 適用於私訊和 Feishu/Lark 串列訊息。綁定對話中的後續訊息會直接路由至該 ACP 會話。

### 多代理路由

使用 `bindings` 將 Feishu/Lark 私訊或群組路由到不同的代理。

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

- `match.channel`： `"feishu"`
- `match.peer.kind`： `"direct"` (私訊) 或 `"group"` (群組聊天)
- `match.peer.id`：使用者 Open ID (`ou_xxx`) 或群組 ID (`oc_xxx`)

查看 [取得群組/使用者 ID](#get-groupuser-ids) 以取得查詢提示。

---

## 配置參考

完整配置： [Gateway configuration](/zh-Hant/gateway/configuration)

| 設定                                              | 描述                                                                           | 預設值           |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------- |
| `channels.feishu.enabled`                         | 啟用/停用頻道                                                                  | `true`           |
| `channels.feishu.domain`                          | API 網域 (`feishu` 或 `lark`)                                                  | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件傳輸 (`websocket` 或 `webhook`)                                            | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的預設帳戶                                                             | `default`        |
| `channels.feishu.verificationToken`               | Webhook 模式所需                                                               | -                |
| `channels.feishu.encryptKey`                      | Webhook 模式所需                                                               | -                |
| `channels.feishu.webhookPath`                     | Webhook 路由路徑                                                               | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Webhook 綁定主機                                                               | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Webhook 綁定連接埠                                                             | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                                                                         | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                                                                     | -                |
| `channels.feishu.accounts.<id>.domain`            | 各帳戶的網域覆寫                                                               | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | 每個帳號的 TTS 覆蓋設定                                                        | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | 私訊政策                                                                       | `allowlist`      |
| `channels.feishu.allowFrom`                       | 私訊允許名單 (open_id 列表)                                                    | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | 群組政策                                                                       | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群組允許名單                                                                   | -                |
| `channels.feishu.requireMention`                  | 群組中需要 @提及                                                               | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | 各群組的 @提及覆蓋設定；在允許名單模式下，明確指定的 ID 也會將群組加入允許名單 | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | 啟用/停用特定群組                                                              | `true`           |
| `channels.feishu.textChunkLimit`                  | 訊息區塊大小                                                                   | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒體大小限制                                                                   | `30`             |
| `channels.feishu.streaming`                       | 串流卡片輸出                                                                   | `true`           |
| `channels.feishu.blockStreaming`                  | 已完成區塊回覆串流                                                             | `false`          |
| `channels.feishu.typingIndicator`                 | 發送輸入中反應                                                                 | `true`           |
| `channels.feishu.resolveSenderNames`              | 解析發送者顯示名稱                                                             | `true`           |

---

## 支援的訊息類型

### 接收

- ✅ 文字
- ✅ 富文字 (貼文)
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 貼圖

傳入的飛書/Lark 音訊訊息會被正規化為媒體佔位符，而不是原始的 `file_key` JSON。當配置了 `tools.media.audio` 時，OpenClaw 會下載語音資源並在代理程式輪次之前執行共享音訊轉錄，因此代理程式會收到口語轉錄文本。如果飛書直接在音訊載荷中包含轉錄文本，則會使用該文本而不進行另一次 ASR 呼叫。如果沒有音訊轉錄提供者，代理程式仍然會收到一個 `<media:audio>` 佔位符以及儲存的附件，而不是原始的飛書資源載荷。

### 傳送

- ✅ 文字
- ✅ 圖片
- ✅ 檔案
- ✅ 音訊
- ✅ 影片/媒體
- ✅ 互動式卡片 (包括串流更新)
- ⚠️ 豐富文字（帖子樣式格式；不支援完整的飛書/Lark 編寫功能）

飛書/Lark 原生音訊泡泡使用飛書 `audio` 訊息類型，並且需要
Ogg/Opus 上傳媒體 (`file_type: "opus"`)。現有的 `.opus` 和 `.ogg` 媒體
會直接作為原生音訊發送。MP3/WAV/M4A 和其他可能的音訊格式
僅在回覆請求語音遞送 (`audioAsVoice` / 訊息工具 `asVoice`，包括 TTS 語音筆記
回覆) 時，才會使用 `ffmpeg` 轉碼為 48kHz Ogg/Opus。普通的 MP3 附件保持為常規檔案。如果缺少 `ffmpeg` 或
轉換失敗，OpenClaw 將回退到檔案附件並記錄原因。

### 主題與回覆

- ✅ 內聯回覆
- ✅ 主題回覆
- ✅ 回覆主題訊息時，媒體回覆仍保持對主題的感知

對於 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，原生
飛書/Lark 主題群組使用事件 `thread_id` (`omt_*`) 作為規範的
主題會話金鑰。如果原生主題啟動事件省略了 `thread_id`，OpenClaw
會在路由該輪次之前從飛書獲取它。OpenClaw 轉換為主題的普通群組回覆繼續使用回覆根訊息 ID (`om_*`)，因此
第一輪和後續輪次保持在同一會話中。

---

## 相關

- [頻道概覽](/zh-Hant/channels) - 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) - 私訊身份驗證與配對流程
- [群組](/zh-Hant/channels/groups) - 群組聊天行為與提及控管
- [頻道路由](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) - 存取模型與加固
