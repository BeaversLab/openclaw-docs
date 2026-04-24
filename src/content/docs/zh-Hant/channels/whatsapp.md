---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為與操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 達到生產就緒狀態。閘道擁有連結的工作階段。

## 安裝 (按需)

- Onboarding (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您首次選取時提示安裝 WhatsApp 外掛程式。
- `openclaw channels login --channel whatsapp` 也提供安裝流程，
  當外掛程式尚未安裝時。
- Dev channel + git checkout：預設為本地端外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知寄件者的預設 DM 原則為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="Gateway 設定" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道設定模式與範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="設定 WhatsApp 存取原則">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="連結 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    針對特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動 gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配對請求 (若使用配對模式)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。擱置中的請求每個頻道上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能使用獨立號碼執行 WhatsApp。（頻道的元資料和設定流程已針對此設定進行最佳化，但也支援個人號碼的設定。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼 (建議)">
    這是最乾淨的操作模式：

    - 為 OpenClaw 使用獨立的 WhatsApp 身分
    - 更清晰的 DM 許可清單與路由邊界
    - 降低與自己聊天混淆的機率

    最小原則模式：

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Personal-number fallback">
    入職支援個人號碼模式並寫入對自訊息友善的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自訊息防護機制會根據連結的自我號碼和 `allowFrom` 進行鍵值比對。

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web 的 (`Baileys`)。

    在內建聊天通道註冊表中，沒有獨立的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時模型

- 閘道擁有 WhatsApp 通訊端和重新連線循環。
- 傳出訊息需要目標帳戶有作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設 `main` 會將 DM 折疊至代理主會話)。
- 群組會話是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp Web 傳輸會遵守閘道主機上的標準代理環境變數 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小寫變體)。建議優先使用主機層級的代理設定，而非通道特定的 WhatsApp 代理設定。

## Access control and activation

<Tabs>
  <Tab title="DM 政策">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權限：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部標準化)。

    多帳號覆蓋：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號優先於頻道層級的預設值。

    執行時期行為詳情：

    - 配對會保存在頻道允許存儲 (channel allow-store) 中，並與設定的 `allowFrom` 合併
    - 如果未設定允許清單，預設允許連結的自我號碼
    - 傳出 `fromMe` DM 永不會自動配對

  </Tab>

  <Tab title="群組政策 + 允許清單">
    群組存取權限有兩層：

    1. **群組成員資格允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組都符合資格
       - 如果存在 `groups`，它將充當群組允許清單 (`"*"` 已允許)

    2. **群組傳送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：傳送者允許清單被略過
       - `allowlist`：傳送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入

    傳送者允許清單回退 (fallback)：

    - 如果未設定 `groupAllowFrom`，執行時期會在可用時回退到 `allowFrom`
    - 傳送者允許清單會在提及/回覆啟動之前評估

    注意：如果根本不存在 `channels.whatsapp` 區塊，即使設定了 `channels.defaults.groupPolicy`，執行時期群組政策回退也是 `allowlist` (並帶有警告日誌)。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包含：

    - 對機器人身分的明確 WhatsApp 提及
    - 已設定的提及正規表示式模式（`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`）
    - 隱含的回覆機器人偵測（回覆傳送者符合機器人身分）

    安全性備註：

    - 引用/回覆僅滿足提及閘門；它並**不**授予傳送者授權
    - 使用 `groupPolicy: "allowlist"` 時，未列入允許清單的傳送者仍會被封鎖，即使他們回覆了允許清單使用者的訊息

    Session 層級啟用指令：

    - `/activation mention`
    - `/activation always`

    `activation` 會更新 session 狀態（而非全域設定）。它受限於擁有者權限。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天防護機制會啟動：

- 跳過自我聊天輪次的已讀回執
- 忽略會提及自身的 JID 自動觸發行為，否則會 ping 到您自己
- 如果未設定 `messages.responsePrefix`，自我聊天回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與語境

<AccordionGroup>
  <Accordion title="入站信封 + 回覆上下文">
    傳入的 WhatsApp 訊息會包裝在共用的入站信封中。

    如果存在引用回覆，上下文會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆中繼資料欄位也會在可用時被填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、傳送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒體佔位符與位置/聯絡人提取">
    累媒體的入站訊息會使用諸如以下的佔位符進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置與聯絡人負載會在路由前正規化為文字上下文。

  </Accordion>

  <Accordion title="Pending group history injection">
    對於群組，未處理的訊息可以被緩衝，並在機器人最終被觸發時作為上下文注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    對於已接受的傳入 WhatsApp 訊息，已讀回據預設為啟用。

    全域停用：

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    每個帳號覆寫：

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    即使全域啟用，自聊回合也會跳過已讀回據。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設區塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式優先使用段落邊界（空白行），然後回退到長度安全的區塊分割
  </Accordion>

<Accordion title="Outbound media behavior">- 支援圖片、影片、音訊（PTT 語音備忘錄）和文件承載 - `audio/ogg` 會被重寫為 `audio/ogg; codecs=opus` 以相容語音備忘錄 - 動畫 GIF 播放透過 `gifPlayback: true` 在影片發送上提供支援 - 發送多媒體回復承載時，字幕會套用至第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑</Accordion>

  <Accordion title="媒體大小限制與後援行為">
    - 輸入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 輸出媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體傳送失敗時，首項後援會發送文字警告，而不是靜默捨棄回應
  </Accordion>
</AccordionGroup>

## 回覆引用

WhatsApp 支援原生回覆引用，其中輸出的回覆會明確地顯示引用輸入訊息。請使用 `channels.whatsapp.replyToMode` 進行控制。

| 數值     | 行為                                               |
| -------- | -------------------------------------------------- |
| `"auto"` | 當提供商支援時引用輸入訊息；否則跳過引用           |
| `"on"`   | 總是引用輸入訊息；如果引用被拒絕，則退回為一般傳送 |
| `"off"`  | 永不引用；以一般訊息傳送                           |

預設為 `"auto"`。每個帳號的覆寫使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "on",
    },
  },
}
```

## 反應等級

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符號反應的廣泛程度：

| 等級          | Ack 反應 | 代理發起的反應 | 說明                        |
| ------------- | -------- | -------------- | --------------------------- |
| `"off"`       | 否       | 否             | 完全沒有反應                |
| `"ack"`       | 是       | 否             | 僅限 Ack 反應（回覆前回執） |
| `"minimal"`   | 是       | 是（保守）     | Ack + 具保守指引的代理反應  |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 具鼓勵指引的代理反應  |

預設：`"minimal"`。

每個帳號的覆寫使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## 確認反應

WhatsApp 透過 `channels.whatsapp.ackReaction` 支援在輸入收據上立即發出 ack 反應。
Ack 反應受 `reactionLevel` 閘控——當 `reactionLevel` 為 `"off"` 時會予以抑制。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

行為備註：

- 在接受輸入後立即發送（回覆前）
- 失敗會被記錄下來，但不會阻擋一般回覆的傳遞
- 群組模式 `mentions` 會對提及觸發的輪次做出反應；群組啟動 `always` 則作為此檢查的旁路
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多重帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選擇與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選擇：如果存在 `default` 則優先使用，否則使用第一個設定的帳號 ID（已排序）
    - 帳號 ID 在內部會正規化以供查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被識別/遷移，用於預設帳號流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳號的 WhatsApp 認證狀態。

    在舊版認證目錄中，Baileys 認證檔案被移除時，`oauth.json` 會被保留。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 反應動作（`react`）。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR Code）">
    症狀：通道狀態回報未連結。

    修正方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重新連線迴圈">
    症狀：已連結帳號重複斷線或嘗試重新連線。

    修正方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="發送時沒有有效的監聽器">
    當目標帳戶沒有有效的網關監聽器時，外寄發送會快速失敗。

    請確保網關正在運行且帳戶已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按以下順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 許可清單條目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複金鑰：後面的條目會覆蓋前面的條目，因此請在每個範圍內保持單一的 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 網關執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 網關操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示詞

WhatsApp 支援透過 `groups` 和 `direct` 映射，為群組和直接聊天使用 Telegram 風格的系統提示詞。

群組訊息的解析層級：

首先決定有效的 `groups` 映射：如果帳戶定義了自己的 `groups`，它將完全取代根層級的 `groups` 映射（不進行深度合併）。然後在產生的單一映射上執行提示詞查詢：

1. **特定群組的系統提示詞** (`groups["<groupId>"].systemPrompt`)：如果特定群組條目定義了 `systemPrompt`，則使用此提示詞。
2. **群組萬用字元系統提示詞** (`groups["*"].systemPrompt`)：當特定群組條目不存在或未定義 `systemPrompt` 時使用。

直接訊息的解析層級：

首先決定有效的 `direct` 映射：如果帳戶定義了自己的 `direct`，它將完全取代根層級的 `direct` 映射（不進行深度合併）。然後在產生的單一映射上執行提示詞查詢：

1. **直接特定系統提示** (`direct["<peerId>"].systemPrompt`)：如果特定的對等項目定義了 `systemPrompt`，則使用此項。
2. **直接萬用字元系統提示** (`direct["*"].systemPrompt`)：當特定對等項目不存在或未定義 `systemPrompt` 時使用。

注意：`dms` 仍然是輕量級的每個 DM 歷史覆寫貯體 (`dms.<id>.historyLimit`)；提示覆寫位於 `direct` 之下。

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，根層級的 `groups` 在多帳號設定中會對所有帳號刻意隱藏 — 即使是那些未定義自己的 `groups` 的帳號 — 以防止機器人接收到不屬於它的群組訊息。WhatsApp 不套用此防護：未定義帳號層級覆寫的帳號總是會繼承根層級的 `groups` 和根層級的 `direct`，無論設定了多少個帳號。在多帳號 WhatsApp 設定中，如果您想要每個帳號的群組或直接提示，請在每個帳號下明確定義完整的映射，而不是依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是每個群組的設定映射，也是聊天層級的群組允許清單。無論是在根層級還是帳號範圍，`groups["*"]` 都表示「該範圍允許所有群組」。
- 僅當您已經希望該範圍接受所有群組時，才新增萬用字元群組 `systemPrompt`。如果您仍然只希望一組固定的群組 ID 符合資格，請勿將 `groups["*"]` 用於提示預設值。相反，請在每個明確允許清單中的群組項目上重複該提示。
- 群組准入和傳送者授權是分開的檢查。`groups["*"]` 擴大了可以到達群組處理的群組集合，但它本身並不授權這些群組中的每個傳送者。傳送者存取權仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對於私訊並沒有相同的副作用。`direct["*"]` 僅在私訊已被 `dmPolicy` 加上 `allowFrom` 或配對存儲規則接納後，提供預設的直接聊天配置。

範例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // Use only if all groups should be admitted at the root scope.
        // Applies to all accounts that do not define their own groups map.
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // Applies to all accounts that do not define their own direct map.
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // This account defines its own groups, so root groups are fully
            // replaced. To keep a wildcard, define "*" explicitly here too.
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // Use only if all groups should be admitted in this account.
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // This account defines its own direct map, so root direct entries are
            // fully replaced. To keep a wildcard, define "*" explicitly here too.
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## 配置參考指標

主要參考：

- [配置參考 - WhatsApp](/zh-Hant/gateway/configuration-reference#whatsapp)

高優先級 WhatsApp 欄位：

- 存取權：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`、`reactionLevel`
- 多帳號：`accounts.<id>.enabled`、`accounts.<id>.authDir`、帳號級別覆寫
- 操作：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`
- 會話行為：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`
- 提示詞：`groups.<id>.systemPrompt`、`groups["*"].systemPrompt`、`direct.<id>.systemPrompt`、`direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
