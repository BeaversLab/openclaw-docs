---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為和操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

狀態：透過 WhatsApp Web (Baileys) 可投入生產。Gateway 擁有連結的工作階段。

## 安裝（按需）

- 首次選取 WhatsApp 外掛程式時，入門 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會提示您安裝。
- 當外掛程式尚未存在時，`openclaw channels login --channel whatsapp` 也會提供安裝流程。
- Dev channel + git checkout：預設為本機外掛程式路徑。
- Stable/Beta：首先從 ClawHub 安裝官方 `@openclaw/whatsapp` 插件，
  並以 npm 作為備選。
- WhatsApp 執行環境是分發在核心 OpenClaw npm 套件之外，因此
  WhatsApp 特定的執行環境相依性會保留在外部外掛程式中。

手動安裝仍然可用：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

僅當您需要註冊表備選時，才使用裸 npm 包 (`@openclaw/whatsapp`)。僅當您需要可重現的安裝時，才鎖定確切版本。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    對於未知發送者，預設的私訊 (DM) 政策為配對。
  </Card>
  <Card title="管道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨管道診斷與修復手冊。
  </Card>
  <Card title="閘道設定" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的管道設定模式與範例。
  </Card>
</CardGroup>

## 快速設定

<Steps>
  <Step title="設定 WhatsApp 存取政策">

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

    針對特定帳號：

```bash
openclaw channels login --channel whatsapp --account work
```

    若要在登入前附加現有/自訂的 WhatsApp Web 認證目錄：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
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

    配對請求將在 1 小時後過期。每個管道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在單獨的號碼上運行 WhatsApp。（通道元數據和設置流程已針對該設置進行優化，但也支持個人號碼設置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼 (建議)">
    這是最乾淨的營運模式：

    - OpenClaw 使用專屬的 WhatsApp 身分
    - 更清晰的私訊 (DM) 白名單和路由邊界
    - 降低與自己聊天混淆的機率

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
    入職支援個人號碼模式，並寫入對自訊息友好的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自訊息保護機制以連結的自我號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="僅 WhatsApp Web 頻道範圍">
    在目前的 OpenClaw 頻道架構中，訊息平台頻道是基於 WhatsApp Web (`Baileys`)。

    在內建的聊天頻道註冊表中，沒有獨立的 Twilio WhatsApp 訊息頻道。

  </Accordion>
</AccordionGroup>

## 運行時模型

- Gateway 擁有 WhatsApp 套接字和重連循環。
- 重連看門狗使用 WhatsApp Web 傳輸活動，而不僅僅是入站應用消息量，因此安靜的關聯設備會話不會僅因為最近沒有人發送消息而重啟。如果傳輸幀不斷到來但在看門狗窗口內沒有處理應用消息，更長的應用靜默上限仍會強制重連；在對最近活動的會話進行瞬態重連後，該應用靜默檢查在第一個恢復窗口內使用正常的消息超時。
- Baileys socket 的時序在 `web.whatsapp.*` 下有明確定義：`keepAliveIntervalMs` 控制 WhatsApp Web 應用程式的 ping，`connectTimeoutMs` 控制開啟交握逾時，而 `defaultQueryTimeoutMs` 控制 Baileys 查詢逾時。
- 外寄發送需要目標帳戶有作用中的 WhatsApp 監聽器。
- 當權杖符合目前的 WhatsApp 參與者中繼資料時（包括 LID 支援的群組），群組發送會為文字和媒體說明中的 `@+<digits>` 和 `@<digits>` 權杖附加原生提及中繼資料。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 重新連線監看程式遵循 WhatsApp Web 傳輸活動，而不僅僅是入站應用程式訊息量：安靜的連結裝置會話會在傳輸幀持續時保持連線，但傳輸停頓會在較遠的遠端中斷連線路徑之前很久就強制重新連線。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設 `main` 會將 DM 折疊至代理主會話)。
- 群組會話是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp 頻道/電子報可以作為明確的傳出目標，並使用其原生的 `@newsletter` JID。傳出電子報發送使用頻道會話中繼資料 (`agent:<agentId>:whatsapp:channel:<jid>`)，而非 DM 會話語意。
- WhatsApp Web 傳輸在閘道主機上遵守標準代理伺服器環境變數 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小寫變體)。建議優先使用主機層級的代理設定，而非頻道專屬的 WhatsApp 代理設定。
- 當啟用 `messages.removeAckAfterReply` 時，OpenClaw 會在傳送可見回覆後清除 WhatsApp 確認反應。

## Plugin hooks and privacy

WhatsApp 傳入訊息可能包含個人訊息內容、電話號碼、群組識別碼、寄件者名稱和會話關聯欄位。因此，除非您明確選擇加入，否則 WhatsApp 不會將傳入的 `message_received` hook 負載廣播給外掛程式：

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

您可以將選擇加入範圍限制為單一帳戶：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

僅針對您信任能接收傳入 WhatsApp 訊息內容和識別碼的外掛程式啟用此選項。

## 存取控制與啟用

<Tabs>
  <Tab title="DM 政策">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會進行正規化)。

    `allowFrom` 是 DM 寄件者存取控制清單。它不會阻擋明確傳送至 WhatsApp 群組 JID 或 `@newsletter` 頻道 JID 的外傳訊息。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (和 `allowFrom`) 優先於該帳號的頻道層級預設值。

    執行時期行為詳情：

    - 配對會持久儲存在頻道允許存放區中，並與設定的 `allowFrom` 合併
    - 排程自動化和心跳接收者回退使用明確的傳送目標或設定的 `allowFrom`；DM 配對核准不是隱含的 cron 或心跳接收者
    - 如果未設定允許清單，連結的自我號碼預設為允許
    - OpenClaw 永不自動配對外傳 `fromMe` DM (您從連結裝置傳送給自己的訊息)

  </Tab>

  <Tab title="群組政策 + 允許列表">
    群組存取有兩個層級：

    1. **群組成員允許列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，所有群組都符合資格
       - 如果存在 `groups`，它會作為群組允許列表 (允許 `"*"`)

    2. **群組傳送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過傳送者允許列表
       - `allowlist`：傳送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入訊息

    傳送者允許列表後備機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退到 `allowFrom`
    - 傳送者允許列表會在提及/回覆啟動之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，執行時群組政策後備機制為 `allowlist` (並帶有警告日誌)，即使已設定 `channels.defaults.groupPolicy` 也一樣。

  </Tab>

  <Tab title="提及 + /啟動">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人身分的明確 WhatsApp 提及
    - 已設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 已授權群組訊息的傳入語音訊息文字記錄
    - 隱含的回覆機器人偵測 (回覆傳送者符合機器人身分)

    安全性說明：

    - 引用/回覆僅滿足提及閘門；它並 **不** 授予傳送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非允許列表中的傳送者仍會被封鎖，即使他們回覆允許列表使用者的訊息也一樣

    階段層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新階段狀態 (而非全域設定)。它受擁有者閘門保護。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也存在於 `allowFrom` 時，WhatsApp 自我聊天保護機制會啟動：

- 跳過自我聊天的已讀回執
- 否則會 ping 您自己的提及 JID 自動觸發行為。
- 如果 `messages.responsePrefix` 未設定，自訊息回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回覆上下文">
    傳入的 WhatsApp 訊息會被封裝在共用的入站信封中。

    如果存在引用回覆，上下文會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元資料欄位也會在可用時填入 (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164)。
    當引用回覆目標是可下載的媒體時，OpenClaw 會透過
    正常的入站媒體儲存來保存它，並將其公開為 `MediaPath`/`MediaType`，以便
    Agent 可以檢查參照的圖片，而不僅僅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒體佔位符與位置/聯絡人提取">
    僅包含媒體的入站訊息會使用諸如以下的佔位符進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    當內容僅為 `<media:audio>` 時，授權的群組語音訊息會在提及門控之前進行轉錄，因此在語音訊息中說出 bot 提及可以觸發回覆。如果轉錄文本仍然未提及 bot，則轉錄文本會保留在待處理的群組歷史記錄中，而不是原始佔位符。

    位置內容使用簡潔的座標文字。位置標籤/註釋和聯絡人/vCard 詳細資訊會呈現為圍欄式的不受信任元資料，而非內聯提示文字。

  </Accordion>

  <Accordion title="待處理群組歷史記錄注入">
    對於群組，未處理的訊息可以被緩衝，並在 bot 最終被觸發時作為上下文注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    已接受的 WhatsApp 訊息預設啟用已讀回執。

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

    即使已全域啟用，自訂聊天仍會略過已讀回執。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設區塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後回退至長度安全的區塊分割

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支援圖片、影片、音訊（PTT 語音訊息）和文件載荷
    - 音訊媒體透過 Baileys `audio` 載荷並帶有 `ptt: true` 發送，因此 WhatsApp 用戶端會將其呈現為按住通話語音訊息
    - 回覆載荷會保留 `audioAsVoice`；WhatsApp 的 TTS 語音訊息輸出即使在供應商返回 MP3 或 WebM 時也會保持在 PTT 路徑上
    - 原生 Ogg/Opus 音訊會作為 `audio/ogg; codecs=opus` 發送，以確保與語音訊息的相容性
    - 非 Ogg 音訊（包括 Microsoft Edge TTS MP3/WebM 輸出）會在 PTT 傳送前使用 `ffmpeg` 轉碼為 48 kHz 單聲道 Ogg/Opus
    - `/tts latest` 將最新的助理回覆作為一條語音訊息發送，並抑制對同一回覆的重複發送；`/tts chat on|off|default` 控制目前 WhatsApp 聊天的自動 TTS
    - 影片發送時透過 `gifPlayback: true` 支援動畫 GIF 播放
    - `forceDocument` / `asDocument` 透過 Baileys 文件載荷發送 outbound 圖片、GIF 和影片，以避免 WhatsApp 媒體壓縮，同時保留解析後的檔名和 MIME 類型
    - 發送多媒體回覆載荷時，說明文字會套用於第一個媒體項目，但 PTT 語音訊息會先發送音訊，然後分開發送可見文字，因為 WhatsApp 用戶端對語音訊息說明文字的呈現不一致
    - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑

  </Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 輸入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 輸出媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳戶的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 影像會自動最佳化（調整大小/質量掃描）以符合限制，除非 `forceDocument` / `asDocument` 要求以文件方式傳送
    - 當媒體傳送失敗時，首項後備機制會發送文字警告，而不是靜默捨棄回應

  </Accordion>
</AccordionGroup>

## 回覆引用

WhatsApp 支援原生回覆引用功能，其中輸出回覆會明顯地引用輸入訊息。使用 `channels.whatsapp.replyToMode` 進行控制。

| 數值        | 行為                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 永不引用；以純文字訊息傳送                   |
| `"first"`   | 僅引用第一個連出回覆區塊                     |
| `"all"`     | 引用每個出站回覆區塊                         |
| `"batched"` | 引用佇列的批次回覆，同時保持立即回覆不被引用 |

預設值為 `"off"`。每個帳戶的覆寫使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 反應等級

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符號反應的廣泛程度：

| 等級          | Ack 反應 | 代理發起的反應 | 描述                           |
| ------------- | -------- | -------------- | ------------------------------ |
| `"off"`       | 否       | 否             | 完全沒有反應                   |
| `"ack"`       | 是       | 否             | 僅限 Ack 反應（回覆前回條）    |
| `"minimal"`   | 是       | 是（保守）     | Ack + 代理反應，並提供保守指導 |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 代理反應，並提供鼓勵指導 |

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

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對輸入的收據進行立即的 ack 反應。
Ack 反應由 `reactionLevel` 控制——當 `reactionLevel` 為 `"off"` 時，這些反應會被抑制。

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

行為說明：

- 在接受傳入訊息後立即發送（回覆前）
- 失敗會被記錄，但不會阻擋正常的回覆傳送
- 群組模式 `mentions` 會在提及觸發的輪次中做出反應；群組啟動 `always` 作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 生命週期狀態反應

設定 `messages.statusReactions.enabled: true` 讓 WhatsApp 在一輪對話中取代 ack 反應，而不是留下靜態的收據 emoji。啟用後，OpenClaw 會針對佇列中、思考中、工具活動、壓縮、完成和錯誤等生命週期狀態，使用同一個傳入訊息反應槽。

```json5
{
  messages: {
    statusReactions: {
      enabled: true,
      emojis: {
        deploy: "🛫",
        build: "🏗️",
        concierge: "💁",
      },
    },
  },
}
```

行為註記：

- `channels.whatsapp.ackReaction` 仍然控制狀態反應是否適用於直接訊息和群組。
- WhatsApp 每則訊息只有一個機器人反應槽，因此生命週期更新會就地取代目前的反應。
- `messages.removeAckAfterReply: true` 會在設定的完成/錯誤保留時間後清除最終狀態反應。
- 工具 emoji 類別包括 `tool`、`coding`、`web`、`deploy`、`build` 和 `concierge`。

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選擇與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選擇：如果存在 `default` 則優先使用，否則使用第一個設定的帳號 ID（已排序）
    - 帳號 ID 會在內部正規化以利查詢

  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的驗證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設驗證資訊仍會被識別/遷移，以用於預設帳號流程

  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳號的 WhatsApp 驗證狀態。

    當 Gateway 可連線時，登出會先停止所選帳號的 WhatsApp 即時監聽器，這樣連結的工作階段就不會在下次重啟前持續接收訊息。`openclaw channels remove --channel whatsapp` 也會在停用或刪除帳號設定前停止即時監聽器。

    在舊版驗證目錄中，Baileys 驗證檔案被移除時，`oauth.json` 會被保留。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- 代理工具支援包括 WhatsApp 回應動作 (`react`)。
- 動作閘道：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的配置寫入預設為啟用（透過 `channels.whatsapp.configWrites=false` 停用）。

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

  <Accordion title="已連結但斷線 / 重新連線迴圈">
    症狀：已連結的帳號持續斷線或嘗試重新連線。

    安靜的帳號可能在正常訊息逾時後仍保持連線；當 WhatsApp Web 傳輸活動停止、socket 關閉，或應用層級活動在較長的安全視窗外保持靜止時，看門狗會重新啟動。

    如果日誌顯示重複的 `status=408 Request Time-out Connection was lost`，請在 `web.whatsapp` 下調整 Baileys socket 時序。首先將 `keepAliveIntervalMs` 縮短至低於您網路的閒置逾時，並在緩慢或容易遺失封包的連線上增加 `connectTimeoutMs`：

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    修正方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 顯示 `Gateway inactive`，但 `openclaw gateway status` 和 `openclaw channels status --probe` 顯示閘道和 WhatsApp 狀態正常，請執行 `openclaw doctor`。在 Linux 上，doctor 會警告舊版的 crontab 項目仍然會呼叫 `~/.openclaw/bin/ensure-whatsapp.sh`；請使用 `crontab -e` 移除那些過時的項目，因為 cron 可能缺少 systemd user-bus 環境，導致該舊腳本錯誤回報閘道健康狀態。

    如果需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="QR 登入在代理伺服器後方逾時">
    症狀：`openclaw channels login --channel whatsapp` 在顯示可用的 QR 碼之前失敗，並出現 `status=408 Request Time-out` 或 TLS 通訊端中斷連線。

    WhatsApp Web 登入會使用閘道主機的標準代理伺服器環境 (`HTTPS_PROXY`、`HTTP_PROXY`、小寫變體以及 `NO_PROXY`)。請驗證閘道程序是否繼承了代理伺服器環境變數，以及 `NO_PROXY` 是否不符合 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽器">
    當目標帳戶沒有作用中的閘道監聽器時，傳送作業會快速失敗。

    請確保閘道正在執行，且帳戶已連結。

  </Accordion>

  <Accordion title="回覆出現在記錄中但不出現在 WhatsApp 中">
    記錄列會記錄代理程式產生的內容。WhatsApp 傳遞會單獨檢查：OpenClaw 只有在 Baileys 為至少一次可見的文字或媒體傳送回傳外寄訊息 ID 後，才會將自動回覆視為已傳送。

    Ack 反應是獨立的回覆前收據。成功的反應並不證明後續的文字或媒體回覆已被 WhatsApp 接受。

    請檢查閘道紀錄中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 許可清單項目
    - 提及閘控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵值：後續項目會覆蓋先前的項目，因此請在每個作用域中保留單一的 `groupPolicy`

    如果存在 `channels.whatsapp.groups`，WhatsApp 仍然可以觀察到來自其他群組的訊息，但 OpenClaw 會在會話路由之前將其丟棄。請將群組 JID 新增至 `channels.whatsapp.groups`，或新增 `groups["*"]` 以允許所有群組，同時在 `groupPolicy` 和 `groupAllowFrom` 下保持發送者授權。

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示

WhatsApp 透過 `groups` 和 `direct` 映射，支援針對群組和直接聊天傳送類似 Telegram 風格的系統提示。

群組訊息的解析層級：

首先會決定有效的 `groups` 映射：如果帳戶定義了自己的 `groups`，它會完全取代根層 `groups` 映射（不進行深度合併）。然後會在結果的單一映射上執行提示查找：

1. **特定群組系統提示** (`groups["<groupId>"].systemPrompt`)：當映射中存在特定群組項目 **並且** 定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不套用任何系統提示。
2. **群組萬用字元系統提示** (`groups["*"].systemPrompt`)：當映射中完全不存在特定群組項目，或者存在但未定義 `systemPrompt` 鍵時使用。

直接訊息的解析層級：

首先會決定有效的 `direct` 映射：如果帳戶定義了自己的 `direct`，它會完全取代根層 `direct` 映射（不進行深度合併）。然後會在結果的單一映射上執行提示查找：

1. **特定對象的系統提示詞** (`direct["<peerId>"].systemPrompt`)：當對應的特定對象條目存在於對照表中 **並且** 定義了其 `systemPrompt` 金鑰時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不會套用任何系統提示詞。
2. **特定對象的萬用字元系統提示詞** (`direct["*"].systemPrompt`)：當對應的特定對象條目完全不存在於對照表中時，或是條目存在但未定義 `systemPrompt` 金鑰時使用。

<Note>
`dms` 保持為輕量級的每個私訊 (DM) 歷史記錄覆寫區塊 (`dms.<id>.historyLimit`)。提示詞覆寫則位於 `direct` 之下。
</Note>

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，根層級的 `groups` 會在多帳號設定中對所有帳號刻意隱藏——即便是那些未自行定義 `groups` 的帳號——以防止機器人接收到它不屬於的群組訊息。WhatsApp 不會套用此防護：根層級的 `groups` 和根層級的 `direct` 總是會被未定義帳號層級覆寫的帳號繼承，無論配置了多少個帳號。在多帳號 WhatsApp 設定中，如果您想要每個帳號擁有獨立的群組或私訊提示詞，請明確地在每個帳號下定義完整的對照表，而不要依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是每個群組的設定對照表，也是聊天層級的群組允許清單。無論是在根層級還是帳號範圍內，`groups["*"]` 都代表該範圍「允許所有群組」。
- 僅當您已經希望該範圍允許所有群組時，才新增萬用字元群組 `systemPrompt`。如果您仍然只希望有一組固定的群組 ID 符合資格，請不要針對提示詞預設值使用 `groups["*"]`。請改為將提示詞重複套用於每個明確加入允許清單的群組條目上。
- 群組許可和發送者授權是分開的檢查。`groups["*"]` 擴展了可以到達群組處理的群組集，但它本身並不授權這些群組中的每個發送者。發送者存取仍然由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對於直接訊息（DM）沒有相同的副作用。`direct["*"]` 僅在直接訊息已被 `dmPolicy` 加上 `allowFrom` 或配對儲存（pairing-store）規則允許後，提供預設的直接聊天配置。

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

## 配置參考指針

主要參考：

- [配置參考 - WhatsApp](/zh-Hant/gateway/config-channels#whatsapp)

高優先級 WhatsApp 字段：

- 存取：`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 傳遞：`textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- 多帳號：`accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號層級覆寫
- 操作：`configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- 會話行為：`session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- 提示詞：`groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [故障排除](/zh-Hant/channels/troubleshooting)
