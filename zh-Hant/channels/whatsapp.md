---
summary: "WhatsApp 頻道支援、存取控制、遞送行為與作業"
read_when:
  - 處理 WhatsApp/Web 頻道行為或收件匣路由
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 已達生產就緒。閘道擁有連線的工作階段。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    預設的私人訊息策略為對未知寄件者進行配對。
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

  <Step title="連結 WhatsApp (QR Code)">

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

  <Step title="核准首次配對請求 (如使用配對模式)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求在 1 小時後過期。待處理請求每個頻道最多 3 個。

  </Step>
</Steps>

<Note>
  OpenClaw 建議盡可能在獨立號碼上執行
  WhatsApp。(頻道詮釋資料與設定流程已針對此設定進行最佳化，但也支援個人號碼設定。)
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼 (建議)">
    這是最乾淨的作業模式：

    - OpenClaw 的獨立 WhatsApp 身分
    - 更清楚的私人訊息允許清單與路由界限
    - 降低自我聊天混淆的機率

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

  <Accordion title="個人號碼備案">
    入站支援個人號碼模式，並寫入友善自我聊天的基準：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行階段，自我聊天保護會根據連結的自我號碼與 `allowFrom` 運作。

  </Accordion>

  <Accordion title="僅限 WhatsApp Web 的通道範圍">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web 的 (`Baileys`)。

    在內建的聊天通道註冊表中，沒有獨立的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- 閘道擁有 WhatsApp socket 和重連迴圈。
- 傳送出站訊息需要目標帳號有啟動中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設 `main` 會將 DM 折疊至代理主要會話)。
- 群組會話是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 存取控制與啟用

<Tabs>
  <Tab title="DM 政策">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權限：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會進行標準化)。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號的優先順序高於通道層級的預設值。

    執行時期行為詳細資訊：

    - 配對會保存在通道允許存放區中，並與設定的 `allowFrom` 合併
    - 如果未設定允許清單，連結的自我號碼預設為允許
    - 傳出 `fromMe` DM 絕不會自動配對

  </Tab>

  <Tab title="群組原則 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組均符合資格
       - 如果存在 `groups`，它將充當群組允許清單 (僅允許 `"*"`)

    2. **群組發送者原則** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組 inbound

    發送者允許清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，即使已設定 `channels.defaults.groupPolicy`，執行時群組原則回退值仍為 `allowlist` (並附帶警告日誌)。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人身分的明確 WhatsApp 提及
    - 設定的提及正則表示式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人偵測 (回覆發送者符合機器人身分)

    安全性說明：

    - 引用/回覆僅滿足提及閘門條件；並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，即使非允許清單上的發送者回覆允許清單使用者的訊息，仍會被封鎖

    會話層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 會更新會話狀態 (而非全域設定)。此動作受到擁有者限制。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天保護機制會啟動：

- 略過自我聊天的已讀回執
- 忽略否則會 ping 您自己的提及 JID 自動觸發行為
- 如果未設定 `messages.responsePrefix`，自我聊天回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    傳入的 WhatsApp 訊息會包裝在共用的輸入信封中。

    如果存在引用回覆，則會以以下形式附加上下文：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元數據欄位也會在可用時填入 (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164)。

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    僅包含媒體的輸入訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人酬載會在路由之前正規化為文字上下文。

  </Accordion>

  <Accordion title="Pending group history injection">
    對於群組，未處理的訊息可以緩衝，並在機器人最終被觸發時作為上下文注入。

    - default limit: `50`
    - config: `channels.whatsapp.historyLimit`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    Injection markers:

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    對於已接受的輸入 WhatsApp 訊息，已讀回執預設為啟用。

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

    帳號層級覆寫：

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

    即使全域啟用，自聊回合也會跳過已讀回執。

  </Accordion>

</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - default chunk limit: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界 (空白行)，然後回退至長度安全的分塊
  </Accordion>

<Accordion title="外傳媒體行為">
  - 支援圖片、影片、音訊（PTT 語音訊息）和文件載荷 - 為了相容語音訊息，`audio/ogg` 會被重寫為
  `audio/ogg; codecs=opus` - 可透過影片傳送上的 `gifPlayback: true` 支援動畫 GIF 播放 -
  傳送多媒體回覆載荷時，說明文字會套用至第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://`
  或本機路徑
</Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 輸入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 輸出媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳戶的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體傳送失敗時，第一項目的後援機制會傳送文字警告，而不是無聲地捨棄回應
  </Accordion>
</AccordionGroup>

## 確認回應

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對輸入訊息進行即時 Ack 回應。

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
- 群組模式 `mentions` 會在提及觸發的輪次中做出回應；群組啟用 `always` 則作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在則為 `default`，否則為第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 在內部會被標準化以利查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被識別/遷移以用於預設帳戶流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 驗證狀態。

    在舊版驗證目錄中，`oauth.json` 會被保留，同時移除 Baileys 驗證檔案。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 反應動作 (`react`)。
- 動作閘道：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 預設啟用通道發起的組態寫入 (可透過 `channels.whatsapp.configWrites=false` 停用)。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結 (需要 QR Code)">
    症狀：通道狀態回報未連結。

    修正方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但中斷連線 / 重新連線迴圈">
    症狀：已連結的帳戶重複中斷連線或嘗試重新連線。

    修正方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽器">
    當目標帳戶沒有作用中的閘道監聽器時，外寄傳送會快速失敗。

    請確保閘道正在執行且帳戶已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依此順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複鍵：後續項目會覆蓋先前的項目，因此請在每個範圍內保持單一的 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行階段警告">
    WhatsApp 閘道執行階段應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 設定參考指標

主要參考：

- [組態參考 - WhatsApp](/zh-Hant/gateway/configuration-reference#whatsapp)

高重要性 WhatsApp 欄位：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
