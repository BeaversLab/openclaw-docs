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
  會在您第一次選取時提示安裝 WhatsApp 外掛程式。
- `openclaw channels login --channel whatsapp` 也在尚未安裝外掛程式時提供安裝流程。
- Dev channel + git checkout：預設為本地端外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    針對未知寄件者的預設 DM 政策為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道設定" icon="settings" href="/en/gateway/configuration">
    完整的頻道設定模式與範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="Configure WhatsApp access policy">

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

    若為特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動閘道">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配對請求 (若使用配對模式)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。每個頻道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在獨立的號碼上運行 WhatsApp。（通道元數據和設置流程針對該設置進行了優化，但也支持個人號碼設置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼 (建議)">
    這是最乾淨的作業模式：

    - OpenClaw 使用獨立的 WhatsApp 身分
    - DM 白名單與路由邊界更清晰
    - 降低與自訊息交談混淆的機率

    最小政策模式：

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

  <Accordion title="個人號碼後備">
    入職支援個人號碼模式，並寫入一個對自訊對話友好的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時，自訊對話保護機制以連結的自訊號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="僅 WhatsApp Web 通道範圍">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web (`Baileys`)。

    在內建的聊天通道註冊表中，沒有單獨的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- Gateway 擁有 WhatsApp socket 和重新連線迴圈。
- 傳送出站訊息需要目標帳戶有一個作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設 `main` 會將 DM 折疊到代理主會話中)。
- 群組會話是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp Web 傳輸會遵循閘道主機上的標準 Proxy 環境變數 (`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小寫變體)。建議優先使用主機層級的 Proxy 設定，而非特定頻道的 WhatsApp Proxy 設定。

## 存取控制與啟用

<Tabs>
  <Tab title="DM 原則">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部正規化)。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號的優先順序高於頻道層級的預設值。

    執行時期行為細節：

    - 配對會保存在頻道 allow-store 中，並與已設定的 `allowFrom` 合併
    - 若未設定允許清單，連結的自我號碼預設為允許
    - 傳出 `fromMe` DM 永遠不會自動配對

  </Tab>

  <Tab title="群組政策 + 許可清單">
    群組存取有兩個層級：

    1. **群組成員許可清單** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，則所有群組都符合資格
       - 如果存在 `groups`，則它會作為群組許可清單 (允許 `"*"`)

    2. **群組發送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：略過發送者許可清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組入站訊息

    發送者許可清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退至 `allowFrom`
    - 發送者許可清單會在提及/回覆啟動之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，即使設定了 `channels.defaults.groupPolicy`，執行時群組政策回退值仍為 `allowlist` (並附上警告日誌)。

  </Tab>

  <Tab title="提及 + /啟動">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對 bot 身份的明確 WhatsApp 提及
    - 設定的提及 Regex 模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱式回覆-bots 偵測 (回覆發送者符合 bot 身份)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，未在許可清單中的發送者即使回覆了許可清單使用者的訊息，仍會被封鎖

    Session 層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 會更新 session 狀態 (而非全域設定)。它受到所有者閘門保護。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也存在於 `allowFrom` 時，WhatsApp 自我聊天安全機制會啟動：

- 跳過自我聊天的已讀回執
- 忽略提及 JID 的自動觸發行為，否則這會 ping 到您自己
- 如果 `messages.responsePrefix` 未設定，自聊回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回覆上下文">
    傳入的 WhatsApp 訊息會被封裝在共享的入站信封中。

    如果存在引用回覆，上下文會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆中繼資料欄位也會在可用時填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒體預留位置與位置/聯絡人擷取">
    僅包含媒體的入站訊息會使用諸如以下的預留位置進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人 Payload 會在路由之前正規化為文字上下文。

  </Accordion>

  <Accordion title="待處理群組歷史紀錄注入">
    對於群組，未處理的訊息可以進行緩衝，並在機器人最終被觸發時作為上下文注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已讀回執">
    對於已接受的入站 WhatsApp 訊息，已讀回執預設為啟用。

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

    每個帳號的覆寫：

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

    即使全域啟用，自聊輪次也會跳過已讀回執。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空行），然後回退到安全的長度分塊
  </Accordion>

<Accordion title="出站媒體行為">- 支援圖片、影片、音訊（PTT 語音訊息）和文件酬載 - `audio/ogg` 會被重寫為 `audio/ogg; codecs=opus` 以相容語音訊息 - 支援透過影片發送時的 `gifPlayback: true` 播放動畫 GIF - 發送多媒體回覆酬載時，說明文字會套用至第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑</Accordion>

  <Accordion title="媒體大小限制與回退行為">
    - 入站媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 出站媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳戶的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/質量掃描）以符合限制
    - 媒體傳送失敗時，首項回退會發送文字警告，而不是靜默捨棄回應
  </Accordion>
</AccordionGroup>

## 反應等級

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符號反應的廣泛程度：

| 等級          | Ack 反應 | 代理發起的反應 | 描述                        |
| ------------- | -------- | -------------- | --------------------------- |
| `"off"`       | 否       | 否             | 完全沒有反應                |
| `"ack"`       | 是       | 否             | 僅限 Ack 反應（回覆前回執） |
| `"minimal"`   | 是       | 是（保守）     | Ack + 保守引導的代理反應    |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 鼓勵引導的代理反應    |

預設值：`"minimal"`。

每個帳戶的覆寫使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

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

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對入站收據進行立即的 ack 回應。
Ack 回應由 `reactionLevel` 控制 — 當 `reactionLevel` 為 `"off"` 時，它們會被抑制。

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

- 在接收入站後立即發送（回覆前）
- 失敗會被記錄但不會阻擋正常的回覆傳遞
- 群組模式 `mentions` 會在提及觸發的輪次中做出回應；群組啟用 `always` 則作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多重帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選擇與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選擇：如果存在則為 `default`，否則為第一個設定的帳號 ID（已排序）
    - 帳號 ID 在內部會被正規化以便查找
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被辨識/遷移以用於預設帳號流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳號的 WhatsApp 認證狀態。

    在舊版認證目錄中，`oauth.json` 會被保留，而 Baileys 認證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 回應動作（`react`）。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（可透過 `channels.whatsapp.configWrites=false` 停用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未連結（需要 QR code）">
    症狀：通道狀態回報未連結。

    解決方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重新連線循環">
    症狀：已連結的帳號重複斷線或嘗試重新連線。

    修復方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="發送時沒有作用中的監聽器">
    當目標帳號沒有作用中的閘道監聽器時，外寄發送會快速失敗。

    請確保閘道正在執行且帳號已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按以下順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單條目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複金鑰：後面的條目會覆蓋前面的條目，因此在每個範圍內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 組態參考指引

主要參考：

- [組態參考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

高信號 WhatsApp 欄位：

- 存取：`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 傳遞：`textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- 多帳號：`accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- 操作：`configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 會話行為：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
