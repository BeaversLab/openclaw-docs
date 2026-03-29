---
summary: "WhatsApp 頻道支援、存取控制、遞送行為與操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 達到生產就緒狀態。閘道擁有連結的工作階段。

## 安裝 (按需)

- Onboarding (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您第一次選取時提示安裝 WhatsApp 外掛程式。
- 當外掛程式尚未存在時，`openclaw channels login --channel whatsapp` 也會提供安裝流程。
- Dev channel + git checkout：預設為本地端外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    針對未知寄件者的預設 DM 原則是配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
  <Card title="閘道組態" icon="settings" href="/en/gateway/configuration">
    完整的頻道組態模式與範例。
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

  <Step title="批准首次配對請求 (若使用配對模式)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求在 1 小時後過期。待處理請求每個頻道上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在獨立號碼上執行 WhatsApp。(頻道中繼資料和設定流程已針對此設定最佳化，但個人號碼設定也受支援。)</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼（推薦）">
    這是最乾淨的操作模式：

    - OpenClaw 使用獨立的 WhatsApp 身份
    - 更清晰的 DM 白名單和路由邊界
    - 降低自聊混淆的機率

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
    入職支援個人號碼模式並寫入自聊友好的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自聊保護機制以連結的自號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="僅 WhatsApp Web 頻道範圍">
    在目前的 OpenClaw 頻道架構中，訊息平台頻道是基於 WhatsApp Web 的（`Baileys`）。

    在內建的聊天頻道登錄表中，沒有個別的 Twilio WhatsApp 訊息頻道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- Gateway 擁有 WhatsApp socket 和重新連線迴圈。
- 傳送出站訊息需要目標帳戶有一個作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略（`@status`、`@broadcast`）。
- 直接聊天使用 DM 會話規則（`session.dmScope`；預設 `main` 會將 DM 折疊至代理主會話）。
- 群組會話是隔離的（`agent:<agentId>:whatsapp:group:<jid>`）。

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會進行正規化)。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 的優先順序高於該帳號的通道層級預設值。

    執行時期行為細節：

    - 配對會保留在通道 allow-store 中，並與已設定的 `allowFrom` 合併
    - 如果未設定允許清單，連結的自我號碼預設為允許
    - 外寄 `fromMe` DM 永遠不會自動配對

  </Tab>

  <Tab title="Group policy + allowlists">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，所有群組皆符合資格
       - 如果存在 `groups`，它會作為群組允許清單 (`"*"` 被允許)

    2. **群組發送者原則** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組外送

    發送者允許清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時期會在可用時後退至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，執行時期群組原則後退值為 `allowlist` (並記錄警告)，即使已設定 `channels.defaults.groupPolicy` 亦然。

  </Tab>

  <Tab title="Mentions + /activation">
    預設情況下，群組回覆需要提及。

    提及偵測包含：

    - 對機器人身分的明確 WhatsApp 提及
    - 已設定的提及正則表達式模式（`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`）
    - 隱含的回覆機器人偵測（回覆發送者與機器人身分相符）

    安全性備註：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 啟用 `groupPolicy: "allowlist"` 時，即使非白名單發送者回覆了白名單使用者的訊息，仍會被封鎖

    層級級啟用指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新會話狀態（而非全域設定）。它受到所有者權限控管。

  </Tab>
</Tabs>

## 個人號碼與自聊行為

當連結的自我號碼也存在於 `allowFrom` 時，會啟動 WhatsApp 自聊安全防護：

- 跳過自聊輪次的已讀回執
- 忽略會 ping 您自己的提及-JID 自動觸發行為
- 如果未設定 `messages.responsePrefix`，自聊回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    傳入的 WhatsApp 訊息會被封裝在共用的入站封套中。

    如果存在引用回覆，會以以下形式附加上下文：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元資料欄位也會在可用時填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164）。

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    純媒體的入站訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人有效負載會在路由前正規化為文字上下文。

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
    對於已接受的 WhatsApp 輸入訊息，已讀回執預設為啟用。

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

    每個帳號覆蓋：

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

## 傳送、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空行），然後回退到長度安全的分塊
  </Accordion>

<Accordion title="Outbound media behavior">- 支援圖片、影片、音訊（PTT 語音訊息）和檔案 Payload - 為了相容語音訊息，`audio/ogg` 會被重寫為 `audio/ogg; codecs=opus` - 動態 GIF 播放透過影片發送時的 `gifPlayback: true` 支援 - 發送多媒體回覆 Payload 時，標題會套用到第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑</Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 入站媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 出站媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 各帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體傳送失敗時，首項後備會傳送文字警告，而非靜默捨棄回應
  </Accordion>
</AccordionGroup>

## 確認反應

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對入站收據進行立即確認反應。

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

- 在入站訊息被接受後立即傳送（回覆前）
- 失敗會被記錄下來，但不會阻擋正常回覆的傳送
- 群組模式 `mentions` 會對提及觸發的回合做出反應；群組啟動 `always` 則作為此檢查的繞行機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選擇與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選擇：若有 `default` 則優先使用，否則使用第一個設定的帳號 ID（已排序）
    - 帳號 ID 在內部會經過正規化以利查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被識別/遷移，以用於預設帳號流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳號的 WhatsApp 認證狀態。

    在舊版認證目錄中，`oauth.json` 會被保留，而 Baileys 認證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- 代理程式工具支援包含 WhatsApp 反應動作（`react`）。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（可透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR code）">
    症狀：通道狀態回報未連結。

    修正方式：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但已斷線 / 重新連線迴圈">
    症狀：已連結的帳號重複斷線或嘗試重新連線。

    修正方式：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="傳送時無作用中的監聽器">
    當目標帳號沒有作用中的 Gateway 監聽器時，傳出訊息會快速失敗。

    請確保 Gateway 正在執行且帳號已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依此順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵：後續項目會覆蓋先前的項目，因此請在每個範圍內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行環境警告">
    WhatsApp Gateway 執行環境應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram Gateway 操作不相容。
  </Accordion>
</AccordionGroup>

## 設定參考指南

主要參考：

- [設定參考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

重要 WhatsApp 欄位：

- 存取權：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`
- 多帳號： `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- 操作： `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 會話行為： `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)
