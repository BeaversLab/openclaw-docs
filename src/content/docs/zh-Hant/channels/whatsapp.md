---
summary: "WhatsApp 頻道支援、存取控制、遞送行為與操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 達到生產就緒狀態。閘道擁有連結的工作階段。

## 安裝 (按需)

- 導入流程 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您首次選取 WhatsApp 外掛程式時提示您進行安裝。
- 當外掛程式尚未安裝時，`openclaw channels login --channel whatsapp` 也會提供安裝流程。
- Dev channel + git checkout：預設為本地端外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    針對未知寄件者的預設 DM 原則為配對。
  </Card>
  <Card title="管道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
    跨管道診斷與修復手冊。
  </Card>
  <Card title="閘道器設定" icon="settings" href="/en/gateway/configuration">
    完整的通道設定模式和範例。
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

    對於特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動閘道器">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准第一個配對請求（如果使用配對模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。每個通道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在獨立的號碼上運行 WhatsApp。（通道元數據和設置流程針對該設置進行了優化，但也支持個人號碼設置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    這是最乾淨的操作模式：

    - OpenClaw 使用獨立的 WhatsApp 身份
    - 更清晰的 DM 白名單和路由邊界
    - 更低的自聊混淆風險

    最小策略模式：

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
    入門支援個人號碼模式，並寫入友善自我聊天的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自我聊天保護機制以連結的自我號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web (`Baileys`) 的。

    內建的聊天通道註冊表中沒有獨立的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- Gateway 擁有 WhatsApp socket 和重新連線迴圈。
- 傳送出站訊息需要目標帳戶有一個作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設的 `main` 會將 DM 折疊至代理主會話)。
- 群組會話是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會標準化)。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (和 `allowFrom`) 對該帳號優先於通道層級的預設值。

    執行時期行為細節：

    - 配對會保存在通道允許存放區中，並與設定的 `allowFrom` 合併
    - 如果未設定允許清單，連結的自我號碼預設為允許
    - 外送 `fromMe` DM 絕不會自動配對

  </Tab>

  <Tab title="群組政策 + 許可清單">
    群組存取有兩個層級：

    1. **群組成員資格許可清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組均符合資格
       - 如果存在 `groups`，則它會充當群組許可清單 (僅允許 `"*"`)

    2. **群組傳送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：略過傳送者許可清單
       - `allowlist`：傳送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入訊息

    傳送者許可清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退到 `allowFrom`
    - 傳送者許可清單會在提及/回覆啟用之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，執行時群組政策後備機制為 `allowlist` (並附帶警告記錄)，即使設定了 `channels.defaults.groupPolicy` 也是如此。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人身分的明確 WhatsApp 提及
    - 已設定的提及正則表達式模式（`agents.list[].groupChat.mentionPatterns`，後援 `messages.groupChat.mentionPatterns`）
    - 隱含的回覆機器人偵測（回覆傳送者符合機器人身分）

    安全性備註：

    - 引用/回覆僅滿足提及閘門；並**不**授予傳送者授權
    - 若使用 `groupPolicy: "allowlist"`，即使非白名單傳送者回覆白名單使用者的訊息，仍會被封鎖

    層級啟用指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新會話狀態（非全域設定）。它受擁有者閘門控制。

  </Tab>
</Tabs>

## 個人號碼與自聊行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天保護機制會啟用：

- 跳過自聊輪次的已讀回執
- 忽略會 ping 您自己的提及-JID 自動觸發行為
- 如果 `messages.responsePrefix` 未設定，自我聊天回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    傳入的 WhatsApp 訊息會被封裝在共用的 inbound envelope 中。

    如果存在引用回覆，上下文會以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元數據欄位也會在可用時填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、sender JID/E.164）。

  </Accordion>

  <Accordion title="媒體佔位符以及位置/聯絡人資訊擷取">
    純媒體的傳入訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人的 Payload 會在路由之前正規化為文字內容。

  </Accordion>

  <Accordion title="待處理群組歷史記錄注入">
    針對群組，未處理的訊息可以緩衝並在機器人最終觸發時作為語境注入。

    - 預設限制： `50`
    - 設定： `channels.whatsapp.historyLimit`
    - 後備： `messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已讀回執">
    針對已接受的 WhatsApp 傳入訊息，已讀回執預設為啟用。

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

    帳號特定覆寫：

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

    自聊回合會略過已讀回執，即使全域已啟用亦然。

  </Accordion>
</AccordionGroup>

## 傳送、分塊與媒體

<AccordionGroup>
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後回退到長度安全的分塊
  </Accordion>

<Accordion title="傳出媒體行為">- 支援圖片、影片、音訊（PTT 語音訊息）和文件承載 - `audio/ogg` 會被重寫為 `audio/ogg; codecs=opus` 以相容語音訊息 - 支援透過 `gifPlayback: true` 在發送影片時播放動畫 GIF - 發送多媒體回覆承載時，說明文字會套用到第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑</Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 輸入媒體儲存上限： `channels.whatsapp.mediaMaxMb` （預設 `50` ）
    - 輸出媒體發送上限： `channels.whatsapp.mediaMaxMb` （預設 `50` ）
    - 帳號特定覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體發送失敗時，首項後備機制會發送文字警告，而不是無聲地捨棄回應
  </Accordion>
</AccordionGroup>

## 確認反應

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 在接收輸入訊息時立即回應 ack 反應。

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
- 群組模式 `mentions` 會在提及觸發的輪次中回應；群組啟動 `always` 則作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版的 `messages.ackReaction`）

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在 `default` 則使用它，否則使用第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 會在內部正規化以供查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的驗證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設驗證仍會被識別/遷移，以用於預設帳戶流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 認證狀態。

    在舊版認證目錄中，`oauth.json` 會被保留，而 Baileys 認證檔案則會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包括 WhatsApp 回應動作 (`react`)。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 預設啟用頻道發起的設定寫入（透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR Code）">
    症狀：頻道狀態回報未連結。

    修復方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但已斷線 / 重新連線循環">
    症狀：已連結的帳號不斷斷線或嘗試重新連線。

    修復方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="發送時沒有作用中的監聽器">
    當目標帳號沒有作用中的閘道監聽器時，發送會快速失敗。

    請確保閘道正在執行且帳號已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按以下順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單條目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複鍵：後面的條目會覆蓋前面的條目，因此在每個作用域內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 設定參考指南

主要參考：

- [組態參考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

重要 WhatsApp 欄位：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相關

- [配對](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [疑難排解](/en/channels/troubleshooting)
