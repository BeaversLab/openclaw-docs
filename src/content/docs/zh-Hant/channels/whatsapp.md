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
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知寄件者的預設 DM 政策為配對。
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

  <Step title="啟動閘道">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配對請求（若使用配對模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。每個頻道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能使用獨立號碼執行 WhatsApp。（頻道的元資料和設定流程已針對此設定進行最佳化，但也支援個人號碼的設定。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼（建議）">
    這是最乾淨的操作模式：

    - OpenClaw 使用獨立的 WhatsApp 身分
    - 更清晰的 DM 許可清單和路由邊界
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

  <Accordion title="個人號碼後備方案">
    入站流程支援個人號碼模式，並會寫入對自我聊天友善的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時，自我聊天保護機制會依據連結的自我號碼和 `allowFrom` 進行。

  </Accordion>

  <Accordion title="僅限 WhatsApp Web 的頻道範圍">
    在目前的 OpenClaw 頻道架構中，訊息平台頻道是基於 WhatsApp Web (`Baileys`) 的。

    內建的聊天頻道註冊表中沒有獨立的 Twilio WhatsApp 訊息頻道。

  </Accordion>
</AccordionGroup>

## 執行時模型

- 閘道擁有 WhatsApp 通訊端和重新連線循環。
- 傳出訊息需要目標帳戶有作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- Direct chats use DM session rules (`session.dmScope`; default `main` collapses DMs to the agent main session).
- Group sessions are isolated (`agent:<agentId>:whatsapp:group:<jid>`).
- WhatsApp Web transport honors standard proxy environment variables on the gateway host (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / lowercase variants). Prefer host-level proxy config over channel-specific WhatsApp proxy settings.

## Access control and activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` controls direct chat access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

    `allowFrom` accepts E.164-style numbers (normalized internally).

    Multi-account override: `channels.whatsapp.accounts.<id>.dmPolicy` (and `allowFrom`) take precedence over channel-level defaults for that account.

    Runtime behavior details:

    - pairings are persisted in channel allow-store and merged with configured `allowFrom`
    - if no allowlist is configured, the linked self number is allowed by default
    - outbound `fromMe` DMs are never auto-paired

  </Tab>

  <Tab title="群組政策 + 許可清單">
    群組存取有兩個層級：

    1. **群組成員資格許可清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組都符合資格
       - 如果存在 `groups`，它將作為群組許可清單 (允許 `"*"`)

    2. **群組發送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者許可清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入訊息

    發送者許可清單回退機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退至 `allowFrom`
    - 發送者許可清單會在提及/回覆啟動之前評估

    注意：如果完全沒有 `channels.whatsapp` 區塊，即使設定了 `channels.defaults.groupPolicy`，執行時的群組政策回退值仍為 `allowlist` (並附帶警告日誌)。

  </Tab>

  <Tab title="提及 + /啟動">
    群組回覆預設需要提及。

    提及偵測包括：

    - 明確提及機器人身分的 WhatsApp 提及
    - 設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆給機器人偵測 (回覆發送者符合機器人身分)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非許可清單上的發送者即使回覆許可清單使用者的訊息，仍會被封鎖

    工作階段層級的啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新工作階段狀態 (非全域設定)。它受擁有者權限管控。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也存在於 `allowFrom` 時，WhatsApp 自我聊天保護機制會啟動：

- 跳過自我聊天輪次的已讀回執
- 忽略會提及自身的 JID 自動觸發行為，否則會 ping 到您自己
- 如果 `messages.responsePrefix` 未設定，自聊回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與語境

<AccordionGroup>
  <Accordion title="入站信封 + 回覆語境">
    傳入的 WhatsApp 訊息會被封裝在共用的入站信封中。

    如果存在引用回覆，語境會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元數據欄位也會在可用時填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒體佔位符與位置/聯絡人提取">
    純媒體入站訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置與聯絡人承載在路由之前會被正規化為文字語境。

  </Accordion>

  <Accordion title="待處理群組歷史紀錄注入">
    對於群組，未處理的訊息可以被緩衝，並在機器人最終被觸發時作為語境注入。

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
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式優先使用段落邊界（空行），然後回退到長度安全的分塊
  </Accordion>

<Accordion title="傳出媒體行為">- 支援圖片、影片、音訊（PTT 語音訊息）和文件承載 - `audio/ogg` 被重寫為 `audio/ogg; codecs=opus` 以相容語音訊息 - 透過傳送影片時的 `gifPlayback: true` 支援動畫 GIF 播放 - 傳送多媒體回覆承載時，字幕會套用到第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑</Accordion>

  <Accordion title="媒體大小限制與回退行為">
    - 傳入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 傳出媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳戶的覆蓋使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 如果媒體傳送失敗，第一項回退會傳送文字警告，而不是無聲地捨棄回應
  </Accordion>
</AccordionGroup>

## 反應等級

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符號反應的廣泛程度：

| 等級          | Ack 反應 | 代理發起的反應 | 描述                         |
| ------------- | -------- | -------------- | ---------------------------- |
| `"off"`       | 否       | 否             | 完全沒有反應                 |
| `"ack"`       | 是       | 否             | 僅限 Ack 反應（回覆前回執）  |
| `"minimal"`   | 是       | 是（保守）     | Ack + 帶有保守指導的代理反應 |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 帶有鼓勵指導的代理反應 |

預設值：`"minimal"`。

每個帳戶的覆蓋使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

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

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對接收到的訊息進行立即確認反應。
確認反應受 `reactionLevel` 限制 —— 當 `reactionLevel` 為 `"off"` 時，它們會被抑制。

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

- 在接受入站訊息後立即發送（回覆前）
- 失敗會被記錄下來，但不會阻擋正常的回覆傳遞
- 群組模式 `mentions` 會對提及觸發的輪次做出反應；群組啟動 `always` 則作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選擇與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選擇：若存在 `default` 則使用之，否則使用第一個設定的帳號 ID（已排序）
    - 帳號 ID 在內部會被正規化以便查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證對於預設帳號流程仍會被識別/遷移
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳號的 WhatsApp 認證狀態。

    在舊版認證目錄中，`oauth.json` 會被保留，而 Baileys 認證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 反應動作 (`react`)。
- 動作閘道：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 預設情況下，通道發起的設定寫入已啟用（可透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR Code）">
    症狀：通道狀態顯示未連結。

    解決方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重新連線迴圈">
    症狀：已連結的帳號重複斷線或嘗試重新連線。

    修正方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="發送時沒有作用中的監聽器">
    當目標帳號沒有作用中的閘道監聽器時，外傳發送會快速失敗。

    請確保閘道正在執行並且帳號已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 白名單項目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複鍵：後面的項目會覆寫前面的項目，因此請在每個範圍內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 組態參考指標

主要參考：

- [組態參考 - WhatsApp](/zh-Hant/gateway/configuration-reference#whatsapp)

高重要性 WhatsApp 欄位：

- 存取： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 遞送： `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- 多帳號： `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- 操作： `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 會話行為：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
