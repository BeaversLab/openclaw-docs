---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為以及操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 頻道)

狀態：透過 WhatsApp Web (Baileys) 已達到生產就緒狀態。Gateway 擁有已連結的工作階段。

## 安裝 (按需)

- Onboarding (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您第一次選取時提示安裝 WhatsApp 外掛程式。
- `openclaw channels login --channel whatsapp` 也在外掛程式尚未存在時提供安裝流程。
- Dev 頻道 + git checkout：預設為本地外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍然可用：

```exec
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知發送者，預設的 DM 政策為配對。
  </Card>
  <Card title="通道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨通道診斷與修復操作手冊。
  </Card>
  <Card title="閘道器配置" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的通道配置模式與範例。
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

```exec
openclaw channels login --channel whatsapp
```

    針對特定帳戶：

```exec
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動閘道器">

```exec
openclaw gateway
```

  </Step>

  <Step title="批准首次配对请求（如果使用配对模式）">

```exec
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求将在 1 小时后过期。待处理的请求每个频道最多为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的电话号码上运行 WhatsApp。（频道元数据和设置流程已针对该设置进行了优化，但也支持使用个人号码的设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最简洁的运营模式：

    - OpenClaw 拥有独立的 WhatsApp 身份
    - 更清晰的私信允许列表和路由边界
    - 降低自我聊天混淆的几率

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
    入群支援個人號碼模式，並寫入對自聊友善的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行階段，自聊保護機制依據連結的自我號碼與 `allowFrom` 進行辨識。

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web (`Baileys`) 的。

    內建聊天通道註冊表中沒有獨立的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行階段模型

- 閘道擁有 WhatsApp socket 與重新連線迴圈。
- 發送訊息需要目標帳號有作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 會話規則 (`session.dmScope`; 預設 `main` 會將 DM 折疊至代理主會話)。
- 群組會話是獨立的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 存取控制和啟用

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部正規化)。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號而言優先於頻道層級的預設值。

    執行時期行為細節：

    - 配對會保留在頻道允許存放區中，並與設定的 `allowFrom` 合併
    - 如果未設定允許清單，預設允許連結的自身號碼
    - 外送 `fromMe` 私訊從不自動配對

  </Tab>

  <Tab title="群組原則 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員資格允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，所有群組都符合資格
       - 如果存在 `groups`，它會充當群組允許清單 (允許 `"*"`)

    2. **群組發送者原則** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組進入流量

    發送者允許清單回退：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退到 `allowFrom`
    - 發送者允許清單會在提及/回覆啟用之前進行評估

    注意：如果完全沒有 `channels.whatsapp` 區塊存在，即使已設定 `channels.defaults.groupPolicy`，執行時群組原則回退仍為 `allowlist` (並附帶警告日誌)。

  </Tab>

  <Tab title="提及 + /啟動">
    群組回覆預設需要提及。

    提及偵測包含：

    - 明確的 WhatsApp 機器人身份提及
    - 設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱式回覆機器人偵測（回覆發送者符合機器人身份）

    安全說明：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非白名單發送者仍會被封鎖，即使他們回覆了白名單使用者的訊息

    層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新會話狀態（非全域配置）。它受到擁有者限制。

  </Tab>
</Tabs>

## 個人號碼與自聊行為

當連結的自我號碼也存在於 `allowFrom` 時，WhatsApp 自我聊天保護機制會啟動：

- 跳過自我聊天輪次的已讀回執
- 忽略提及其他 JID 的自動觸發行為，該行為否則會 Ping 您自己
- 如果未設定 `messages.responsePrefix`，自我聊天回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回覆上下文">
    傳入的 WhatsApp 訊息會被封裝在共用的入站信封中。

    如果存在引用回覆，上下文會以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    可用時也會填入回覆元資料欄位（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒體佔位符以及位置/聯絡人擷取">
    僅包含媒體的入站訊息會使用如下的佔位符進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和聯絡人承載會在路由之前正規化為文字內容。

  </Accordion>

  <Accordion title="待處理的群組歷史記錄注入">
    對於群組，未處理的訊息可以進行緩衝，並在機器人最終被觸發時作為上下文注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="讀取回執">
    對於已接受的傳入 WhatsApp 訊息，預設會啟用讀取回執。

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

    即使全域啟用，自聊輪次也會跳過讀取回執。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後回退到長度安全的分塊
  </Accordion>

<Accordion title="傳出媒體行為">- 支援圖片、影片、音訊（PTT 語音訊息）和文件 Payload - `audio/ogg` 會被重寫為 `audio/ogg; codecs=opus` 以相容語音訊息 - 動畫 GIF 播放是透過 `gifPlayback: true` 在發送影片時支援的 - 發送多媒體回覆 Payload 時，標題會套用至第一個媒體項目 - 媒體來源可以是 HTTP(S)、`file://` 或本地路徑</Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 入站媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 出站媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體傳送失敗時，首項後備機制會傳送文字警告，而不是靜默捨棄回應
  </Accordion>
</AccordionGroup>

## 確認反應

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 在接收入站訊息時立即發送確認反應。

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

- 在接受入站訊息後立即傳送（回覆前）
- 失敗會被記錄下來，但不會阻擋正常回覆的傳送
- 群組模式 `mentions` 會對提及觸發的輪次做出反應；群組啟動 `always` 作為此檢查的繞過方式
- WhatsApp 使用 `channels.whatsapp.ackReaction` （此處不使用舊版 `messages.ackReaction`）

## 多重帳戶與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：若存在 `default` 則使用，否則使用第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 在內部會被正規化以供查詢
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前 auth 路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設 auth 仍會被識別/遷移，用於預設帳戶流程
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp auth 狀態。

    在舊版 auth 目錄中，`oauth.json` 會被保留，而 Baileys auth 檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 反應動作 (`react`)。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 頻道發起的配置寫入預設為啟用（可透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結（需要 QR Code）">
    症狀：頻道狀態回報未連結。

    修正方法：

    ```exec
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但中斷連線 / 重新連線迴圈">
    症狀：已連結的帳號出現重複中斷連線或嘗試重新連線的情況。

    修正方法：

    ```exec
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽器">
    當目標帳號沒有作用中的 Gateway 監聽器時，外傳傳送會快速失敗。

    請確保 Gateway 正在運行，且帳號已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按此順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單條目
    - 提及限制（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵：後續條目會覆蓋先前的條目，因此在每個作用域內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 組態參考指標

主要參考：

- [組態參考 - WhatsApp](/zh-Hant/gateway/configuration-reference#whatsapp)

高優先級 WhatsApp 欄位：

- 存取： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 遞送： `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- 多帳號： `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- 操作： `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 會話行為： `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
