---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為與營運"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 已達生產就緒。閘道擁有連線的工作階段。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知發送者的預設 DM 政策為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道設定" icon="settings" href="/zh-Hant/gateway/configuration">
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

    針對特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動閘道">

```bash
openclaw gateway
```

  </Step>

  <Step title="核准首次配對請求 (若使用配對模式)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。每個頻道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>
  OpenClaw 建議盡可能在獨立號碼上執行
  WhatsApp。(頻道的詮釋資料與設定流程已針對此設定最佳化，但也支援個人號碼設定。)
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼 (建議)">
    這是最乾淨的營運模式：

    - OpenClaw 使用獨立的 WhatsApp 身分
    - 更清晰的 DM 允許清單與路由邊界
    - 降低自我對話混淆的機率

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

  <Accordion title="個人號碼後援">
    入站支援個人號碼模式，並寫入適合自聊的基線配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自聊保護機制依據連結的自有號碼與 `allowFrom` 運作。

  </Accordion>

  <Accordion title="僅限 WhatsApp Web 的通道範圍">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web 的（`Baileys`）。

    在內建的聊天通道註冊表中，沒有獨立的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- 閘道擁有 WhatsApp socket 和重連迴圈。
- 傳送出站訊息需要目標帳號有啟動中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略（`@status`、`@broadcast`）。
- 直接聊天使用 DM 會話規則（`session.dmScope`；預設 `main` 將 DM 折疊至代理主會話）。
- 群組會話是獨立的（`agent:<agentId>:whatsapp:group:<jid>`）。

## 存取控制與啟用

<Tabs>
  <Tab title="DM 政策">
    `channels.whatsapp.dmPolicy` 控制直接聊天的存取權：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼（內部會進行正規化）。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）對該帳號而言，優先順位高於通道層級的預設值。

    執行時期行為細節：

    - 配對會保留在通道允許存放區中，並與已配置的 `allowFrom` 合併
    - 若未設定允許清單，連結的自有號碼預設為允許
    - 出站 `fromMe` DM 永遠不會自動配對

  </Tab>

  <Tab title="群組原則 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員資格允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組都符合資格
       - 如果存在 `groups`，則它會作為群組允許清單 (`"*"` 已允許)

    2. **群組發送者原則** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組連入

    發送者允許清單後援：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時後援至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，執行時群組原則後援為 `allowlist` (並附帶警告日誌)，即使已設定 `channels.defaults.groupPolicy` 亦然。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人識別的明確 WhatsApp 提及
    - 設定的提及正則表示式模式 (`agents.list[].groupChat.mentionPatterns`，後援 `messages.groupChat.mentionPatterns`)
    - 隱含回覆給機器人的偵測 (回覆發送者符合機器人識別)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非允許清單中的發送者即使回覆允許清單使用者的訊息仍會被封鎖

    工作階段層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新工作階段狀態 (非全域設定)。它受到擁有者閘門控制。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天安全防護會啟動：

- 略過自我聊天的已讀回執
- 忽略否則會 ping 您自己的提及 JID 自動觸發行為
- 如果 `messages.responsePrefix` 未設定，自訊息回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    傳入的 WhatsApp 訊息會被封裝在共用的 inbound envelope 中。

    如果存在引用回覆，上下文會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元資料欄位也會在可用時被填入（`ReplyToId`, `ReplyToBody`, `ReplyToSender`, 發送者 JID/E.164）。

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    純媒體的傳入訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人酬載會在路由前被正規化為文字上下文。

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

    自訊息輪次會跳過已讀回據，即使全域已啟用。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設區塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空行），然後回退到長度安全的區塊分割
  </Accordion>

<Accordion title="Outbound media behavior">
  - 支援圖片、影片、音訊（PTT 語音訊息）和檔案承載 - `audio/ogg` 會被重寫 為 `audio/ogg;
  codecs=opus` 以相容語音訊息 - 透過影片發送時支援 `gifPlayback: true` 播放動畫 GIF -
  發送多媒體回覆承載時，字幕會套用至第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑
</Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 入站媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 出站媒體發送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 媒體發送失敗時，首項回退會發送文字警告，而不是無聲地捨棄回應
  </Accordion>
</AccordionGroup>

## 確認回應

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對入站收據進行即時確認回應。

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

- 在接受入站後立即發送（回覆前）
- 失敗會被記錄下來，但不會阻擋正常回應的遞送
- 群組模式 `mentions` 會對提及觸發的輪次進行回應；群組啟用 `always` 作為此檢查的繞過
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在 `default` 則使用該值，否則使用第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 在內部會進行正規化以利查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被識別/遷移，以用於預設帳戶流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 認證狀態。

    在舊版認證目錄中，`oauth.json` 會被保留，而 Baileys 認證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 回應動作 (`react`)。
- 動作閘道：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（可透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR Code）">
    症狀：通道狀態回報未連結。

    解決方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但中斷連線 / 重新連線迴圈">
    症狀：已連結的帳戶出現重斷斷線或嘗試重新連線的情況。

    解決方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽器">
    當目標帳戶沒有作用中的 Gateway 監聽器時，外寄傳送會快速失敗。

    請確保 Gateway 正在執行且帳戶已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按此順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵：後面的項目會覆蓋前面的項目，因此請在每個作用域中保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 設定參考指標

主要參考：

- [設定參考 - WhatsApp](/zh-Hant/gateway/configuration-reference#whatsapp)

高重要性 WhatsApp 欄位：

- 存取：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`
- 多帳號：`accounts.<id>.enabled`、`accounts.<id>.authDir`、帳號層級覆寫
- 操作：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`
- 工作階段行為：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
