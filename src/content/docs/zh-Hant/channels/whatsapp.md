---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為與操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

狀態：透過 WhatsApp Web (Baileys) 可投入生產。Gateway 擁有連結的工作階段。

## 安裝（按需）

- 入門流程 (`openclaw onboard`) 與 `openclaw channels add --channel whatsapp`
  會在您首次選取 WhatsApp 外掛時提示您安裝。
- `openclaw channels login --channel whatsapp` 也在外掛尚未安裝時提供安裝流程。
- Dev channel + git checkout：預設為本機外掛程式路徑。
- 穩定版/Beta 版：優先從 ClawHub 安裝官方 `@openclaw/whatsapp` 外掛，
  並以 npm 作為備援。
- WhatsApp 執行環境是分發在核心 OpenClaw npm 套件之外，因此
  WhatsApp 特定的執行環境相依性會保留在外部外掛程式中。

手動安裝仍然可用：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

僅在需要 registry 備援時才使用純 npm 套件 (`@openclaw/whatsapp`)。僅在需要可重現安裝時釘選特定版本。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知寄件者的預設 DM 政策為配對。
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

  <Step title="連結 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    目前的登入方式為 QR 碼。在遠端或無介面環境中，請確保您
    在開始登入之前，有可靠的方式將即時 QR 碼傳送給將掃描
    它的手機。

    針對特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

    若要在登入前掛載現有的/自訂 WhatsApp Web 認證目錄：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動 Gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配對請求（如果使用配對模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求會在 1 小時後過期。每個通道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在單獨的號碼上運行 WhatsApp。（通道元數據和設置流程已針對該設置進行優化，但也支持個人號碼設置。）</Note>

<Warning>目前的 WhatsApp 設定流程僅支援 QR Code。終端機呈現的 QR Code、螢幕截圖、 PDF 或聊天附件在從遠端機器轉傳時可能會過期或變得無法讀取。 對於遠端/無介面主機，建議優先採用直接的 QR Code 圖片傳遞路徑，而非手動擷取終端機畫面。</Warning>

## 部署模式

<AccordionGroup>
  <Accordion title="專屬號碼（建議）">
    這是最乾淨的操作模式：

    - 為 OpenClaw 使用獨立的 WhatsApp 身份
    - 更清晰的 DM 許可清單和路由邊界
    - 降低自我聊天混淆的機率

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

  <Accordion title="個人號碼備援方案">
    入站支援個人號碼模式，並寫入有利於自我聊天的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自我聊天保護機制會以連結的自我號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="僅限 WhatsApp Web 的通道範圍">
    在目前的 OpenClaw 通道架構中，訊息平台通道是基於 WhatsApp Web 的（`Baileys`）。

    在內建的聊天通道註冊表中，沒有個別的 Twilio WhatsApp 訊息通道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- Gateway 擁有 WhatsApp socket 和重新連線循環。
- 重新連線監控程式使用 WhatsApp Web 傳輸活動，而不僅僅是入站應用程式訊息量，因此安靜的連結裝置階段不會僅因為最近沒有人傳送訊息而重新啟動。如果傳輸幀持續到達但在監控視窗內沒有處理任何應用程式訊息，較長的應用程式靜默上限仍會強制重新連線；在針對最近活躍階段進行暫時性重新連線後，該應用程式靜默檢查會在第一個復原視窗使用正常的訊息逾時。
- Baileys socket 時序在 `web.whatsapp.*` 下明確定義：`keepAliveIntervalMs` 控制 WhatsApp Web 應用程式 ping，`connectTimeoutMs` 控制開啟握手逾時，而 `defaultQueryTimeoutMs` 控制 Baileys 查詢逾時。
- 傳出訊息傳送需要目標帳戶的 WhatsApp 作用中監聽器。
- 群組傳送會為文字與媒體標題中的 `@+<digits>` 和 `@<digits>` token 附加原生提及元數據，前提是該 token 符合目前的 WhatsApp 參與者元數據，包括 LID 支援的群組。
- 狀態與廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 重連看門狗是追蹤 WhatsApp Web 傳輸活動，而不僅是傳入應用程式訊息量：當傳輸幀持續時，安靜的連結裝置工作階段會保持運作，但傳輸停滯會在遠端斷線路徑觸發之前很久就強制重連。
- 直接聊天使用 DM 工作階段規則 (`session.dmScope`；預設 `main` 會將 DM 折疊至代理程式主工作階段)。
- 群組工作階段是隔離的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp 頻道/電子報可以透過其原生 `@newsletter` JID 作為明確的傳出目標。傳出電子報傳送使用頻道工作階段元數據 (`agent:<agentId>:whatsapp:channel:<jid>`)，而非 DM 工作階段語意。
- WhatsApp Web 傳輸會遵守閘道主機上的標準代理伺服器環境變數 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小寫變體)。優先使用主機層級的代理伺服器設定，而非通道專屬的 WhatsApp 代理伺服器設定。
- 啟用 `messages.removeAckAfterReply` 時，OpenClaw 會在傳送可見的回覆後清除 WhatsApp ack 回應。

## 核准提示

WhatsApp 可以使用 `👍` / `👎` 回應來呈現 exec 與外掛程式核准提示。傳遞是由頂層核准轉發設定控制：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session",
    },
    plugin: {
      enabled: true,
      mode: "targets",
      targets: [{ channel: "whatsapp", to: "+15551234567" }],
    },
  },
}
```

`approvals.exec` 和 `approvals.plugin` 是獨立的。將 WhatsApp 啟用為頻道僅會連結傳輸；除非啟用了相符的核准系列並路由至 WhatsApp，否則它不會傳送核准提示。會話模式僅針對源自 WhatsApp 的核准傳送原生表情符號核准。目標模式對於明確的 WhatsApp 目標使用共用的轉發管道，並不會建立個別的核准者-DM 分散發送。

WhatsApp 核准反應需要來自 `allowFrom` 或 `"*"` 的明確 WhatsApp 核准者。
`defaultTo` 控制一般預設訊息目標；它不是核准者。手動
`/approve` 指令在解析核准之前仍需通過正常的 WhatsApp 傳送者授權路徑。

## Plugin hooks and privacy

WhatsApp 傳入訊息可能包含個人訊息內容、電話號碼、
群組識別碼、傳送者名稱和會話關聯欄位。因此，
除非您明確選擇加入，否則 WhatsApp 不會將傳入的 `message_received` hook 負載廣播給外掛程式：

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

您可以將選擇加入的範圍限制在單一帳戶：

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

僅對您信任能接收傳入 WhatsApp 訊息
內容和識別碼的外掛程式啟用此功能。

## Access control and activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權限：

    - `pairing`（預設）
    - `allowlist`
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼（在內部標準化）。

    `allowFrom` 是 DM 發送者的存取控制清單。它不會阻擋明確發送至 WhatsApp 群組 JID 或 `@newsletter` 頻道 JID 的外寄訊息。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）會優先於該帳號的頻道層級預設值。

    執行時期行為詳情：

    - 配對會保存在頻道允許存放區中，並與已設定的 `allowFrom` 合併
    - 排程自動化和心跳收件者備援會使用明確的傳遞目標或已設定的 `allowFrom`；DM 配對核准不會是隱含的 cron 或心跳收件者
    - 如果未設定允許清單，預設允許連結的自我號碼
    - OpenClaw 永遠不會自動配對外寄 `fromMe` DM（您從連結裝置傳送給自己的訊息）

  </Tab>

  <Tab title="群組政策 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，所有群組都符合資格
       - 如果存在 `groups`，它會作為群組允許清單 (`"*"` 已允許)

    2. **群組發送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組 inbound

    發送者允許清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時期會在可用時後備至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，即使設定了 `channels.defaults.groupPolicy`，執行時期群組政策後備機制仍是 `allowlist` (並帶有警告日誌)。

  </Tab>

  <Tab title="提及 + /啟動">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人身分的明確 WhatsApp 提及
    - 已配置的提及 Regex 模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 已授權群組訊息的 inbound 語音備忘錄文字紀錄
    - 隱含回覆至機器人的偵測 (回覆發送者符合機器人身分)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；它並**不**授與發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，即使非允許清單中的發送者回覆允許清單使用者的訊息，仍會被封鎖

    會話層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新會話狀態 (非全域配置)。它受擁有者閘門保護。

  </Tab>
</Tabs>

## 個人號碼和自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天安全防護會啟動：

- 略過自我聊天的已讀回執
- 忽略提及 JID 的自動觸發行為，否則會傳送訊息給自己
- 如果 `messages.responsePrefix` 未設定，自訊息回覆預設為 `[{identity.name}]` 或 `[openclaw]`

## 訊息正規化與語境

<AccordionGroup>
  <Accordion title="入站信封 + 回覆語境">
    傳入的 WhatsApp 訊息會被包裝在共用的入站信封中。

    如果存在引用回覆，語境會以這種形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回覆元數據欄位在可用時也會被填入 (`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164)。
    當引用回覆目標是可下載的媒體時，OpenClaw 會透過
    正常的入站媒體儲存庫來儲存它，並將其顯示為 `MediaPath`/`MediaType`，以便
    代理程式可以檢查參照的圖像，而不僅僅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒體佔位符與位置/連絡人擷取">
    僅包含媒體的入站訊息會使用諸如以下的佔位符進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    當內容僅為 `<media:audio>` 時，授權群組的語音訊息會在提及閘道之前進行轉錄，因此
    在語音訊息中說出 bot 提及可以觸發回覆。如果轉錄內容仍然沒有提及 bot，
    則轉錄內容會保留在待處理的群組歷史記錄中，而不是原始佔位符。

    位置內容使用簡潔的座標文字。位置標籤/評論和連絡人/vCard 詳細資訊會呈現為圍欄的不受信任元數據，而不是內聯提示文字。

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
    對於已接受的 WhatsApp 傳入訊息，已讀回執預設為啟用。

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

    即使全域啟用，自訊息回合也會跳過已讀回執。

  </Accordion>
</AccordionGroup>

## 傳送、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空行），然後後備至長度安全的分塊

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支援圖片、影片、音訊 (PTT 語音訊息) 和文件載荷
    - 音訊媒體透過 Baileys `audio` 載荷搭配 `ptt: true` 發送，因此 WhatsApp 用戶端會將其渲染為按鍵通話語音訊息
    - 回覆載荷會保留 `audioAsVoice`；WhatsApp 的 TTS 語音訊息輸出即使供應商回傳 MP3 或 WebM，也會維持在此 PTT 路徑上
    - 原生 Ogg/Opus 音訊會作為 `audio/ogg; codecs=opus` 發送以相容語音訊息
    - 非 Ogg 音訊，包括 Microsoft Edge TTS MP3/WebM 輸出，會在 PTT 傳送前使用 `ffmpeg` 轉碼為 48 kHz 單聲道 Ogg/Opus
    - `/tts latest` 會將最新的助理回覆作為單一語音訊息發送，並對相同回覆抑制重複發送；`/tts chat on|off|default` 控制目前 WhatsApp 聊天的自動 TTS
    - 影片傳送時透過 `gifPlayback: true` 支援動畫 GIF 播放
    - `forceDocument` / `asDocument` 會透過 Baileys 文件載荷發送出站圖片、GIF 和影片，以避免 WhatsApp 媒體壓縮，同時保留解析後的檔名和 MIME 類型
    - 發送多媒體回覆載荷時，標題會套用至第一個媒體項目，但 PTT 語音訊息除外，因為 WhatsApp 用戶端對語音訊息標題的渲染不一致，因此會先發送音訊，然後單獨發送可見文字
    - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑

  </Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 輸入媒體儲存上限： `channels.whatsapp.mediaMaxMb` （預設 `50` ）
    - 輸出媒體傳送上限： `channels.whatsapp.mediaMaxMb` （預設 `50` ）
    - 每個帳戶的覆蓋設定使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制，除非 `forceDocument` / `asDocument` 要求以文件傳遞
    - 當媒體傳送失敗時，首項後備機制會傳送文字警告，而不是靜默捨棄回應

  </Accordion>
</AccordionGroup>

## 回覆引用

WhatsApp 支援原生回覆引用，其中輸出回覆會顯示引用輸入訊息。您可以使用 `channels.whatsapp.replyToMode` 進行控制。

| 數值        | 行為                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 從不引用；作為純訊息傳送                     |
| `"first"`   | 僅引用第一個輸出回覆區塊                     |
| `"all"`     | 引用每個輸出回覆區塊                         |
| `"batched"` | 引用佇列的批次回覆，同時保留立即回覆不被引用 |

預設值為 `"off"` 。每個帳戶的覆蓋設定使用 `channels.whatsapp.accounts.<id>.replyToMode` 。

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

| 等級          | 確認反應 | 代理發起的反應 | 描述                            |
| ------------- | -------- | -------------- | ------------------------------- |
| `"off"`       | 否       | 否             | 完全沒有反應                    |
| `"ack"`       | 是       | 否             | 僅有確認反應（回覆前回執）      |
| `"minimal"`   | 是       | 是（保守）     | 確認 + 代理反應，並採用保守指導 |
| `"extensive"` | 是       | 是（鼓勵）     | 確認 + 代理反應，並採用鼓勵指導 |

預設值： `"minimal"` 。

每個帳戶的覆蓋設定使用 `channels.whatsapp.accounts.<id>.reactionLevel` 。

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

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 在輸入回執上立即進行確認反應。
確認反應受 `reactionLevel` 控制 —— 當 `reactionLevel` 為 `"off"` 時，這些反應會被抑制。

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
- 失敗會被記錄下來，但不會阻擋正常回覆的傳遞
- 群組模式 `mentions` 會在提及觸發的輪次中做出反應；群組啟用 `always` 則作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 生命週期狀態反應

設定 `messages.statusReactions.enabled: true` 讓 WhatsApp 在輪次期間替換確認反應，而不是保留靜態的已讀表情符號。啟用後，OpenClaw 會針對佇列中、思考中、工具活動中、壓縮中、完成和錯誤等生命週期狀態，使用同一個入站訊息反應位置。

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

行為備註：

- `channels.whatsapp.ackReaction` 仍然控制狀態反應是否適用於直接訊息和群組。
- WhatsApp 每則訊息只有一個機器人反應位置，因此生命週期更新會就地取代目前的反應。
- `messages.removeAckAfterReply: true` 會在設定的完成/錯誤保留時間後清除最終狀態反應。
- 工具表情符號類別包括 `tool`、`coding`、`web`、`deploy`、`build` 和 `concierge`。

## 多帳號與憑證

<AccordionGroup>
  <Accordion title="帳號選取與預設值">
    - 帳號 ID 來自 `channels.whatsapp.accounts`
    - 預設帳號選取：若存在則為 `default`，否則為第一個設定的帳號 ID（經排序）
    - 帳號 ID 會在內部標準化以利查詢

  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前認證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設認證仍會被預設帳號流程辨識/遷移

  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 驗證狀態。

    當 Gateway 可連線時，登出會先停止所選帳戶的即時 WhatsApp 監聽器，以便連結的會話在下次重新啟動前不會持續接收訊息。`openclaw channels remove --channel whatsapp` 在停用或刪除帳戶設定之前也會停止即時監聽器。

    在舊版驗證目錄中，`oauth.json` 會被保留，同時移除 Baileys 驗證檔案。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包括 WhatsApp 反應動作 (`react`)。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 預設啟用通道發起的設定寫入 (透過 `channels.whatsapp.configWrites=false` 停用)。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結 (需要 QR Code)">
    症狀：通道狀態回報未連結。

    修正方式：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重新連線迴圈">
    症狀：已連結的帳號重複斷線或嘗試重新連線。

    安靜的帳號連線時間可能超過正常的訊息逾時；看門狗會在 WhatsApp Web 傳輸活動停止、Socket 關閉，或應用層級的活動在較長的安全視窗內保持靜默時重新啟動。

    如果日誌顯示重複的 `status=408 Request Time-out Connection was lost`，請調整 `web.whatsapp` 下的 Baileys socket 時序。首先縮短 `keepAliveIntervalMs` 使其低於您網路的閒置逾時，並在緩慢或高封包遺失的連線上增加 `connectTimeoutMs`：

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

    修復方法：

    ```bash
    openclaw channels status --probe
    openclaw doctor
    openclaw logs --follow
    openclaw gateway status
    ```

    如果在主機連線和時序問題解決後迴圈仍然存在，請備份帳號認證目錄並重新連結該帳號：

    ```bash
    cp -a ~/.openclaw/credentials/whatsapp/<accountId> \
      ~/.openclaw/credentials/whatsapp/<accountId>.bak
    openclaw channels logout --channel whatsapp --account <accountId>
    openclaw channels login --channel whatsapp --account <accountId>
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 顯示 `Gateway inactive`，但 `openclaw gateway status` 和 `openclaw channels status --probe` 顯示閘道和 WhatsApp 狀態正常，請執行 `openclaw doctor`。在 Linux 上，doctor 會警告仍舊叫用 `~/.openclaw/bin/ensure-whatsapp.sh` 的舊版 crontab 項目；請使用 `crontab -e` 移除這些過時項目，因為 cron 可能缺少 systemd user-bus 環境，導致該舊腳本錯誤回報閘道健康狀態。

    如果需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="在 Proxy 後方 QR 登入逾時">
    症狀：`openclaw channels login --channel whatsapp` 在顯示可用的 QR 碼之前失敗，並出現 `status=408 Request Time-out` 或 TLS socket 中斷連線。

    WhatsApp Web 登入使用閘道主機的標準 Proxy 環境 (`HTTPS_PROXY`、`HTTP_PROXY`、小寫變體以及 `NO_PROXY`)。請驗證閘道程序繼承了 Proxy 環境變數，且 `NO_PROXY` 不符合 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽器">
    當目標帳號沒有作用中的閘道監聽器時，傳送會快速失敗。

    請確保閘道正在執行，且帳號已連結。

  </Accordion>

  <Accordion title="回覆顯示在逐字稿中但未出現在 WhatsApp">
    逐字稿紀錄會記錄代理人產生的內容。WhatsApp 傳遞狀態是分開檢查的：OpenClaw 只有在 Baileys 針對至少一個可見的文字或媒體傳送返回外寄訊息 ID 後，才會將自動回覆視為已傳送。

    Ack 反應是獨立於回覆之前的收據。成功的反應並不證明後續的文字或媒體回覆已被 WhatsApp 接受。

    請檢查閘道紀錄中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請按此順序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘門 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複金鑰：後面的項目會覆寫前面的，因此請在每個範圍內保持單一的 `groupPolicy`

    如果存在 `channels.whatsapp.groups`，WhatsApp 仍然可以觀察來自其他群組的訊息，但 OpenClaw 會在會話路由之前將其丟棄。將群組 JID 加入 `channels.whatsapp.groups` 或新增 `groups["*"]` 以接受所有群組，同時在 `groupPolicy` 和 `groupAllowFrom` 下保持傳送者授權。

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示詞

WhatsApp 透過 `groups` 和 `direct` 映射，支援群組和直接聊天的 Telegram 風格系統提示詞。

群組訊息的解析層級：

首先決定有效的 `groups` 對應：如果帳號定義了自己的 `groups`，它將完全替換根層級的 `groups` 對應（不進行深度合併）。然後在產生的單一對應上執行提示詞查找：

1. **特定群組的系統提示詞** (`groups["<groupId>"].systemPrompt`)：當對應中存在特定群組項目**並且**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不套用任何系統提示詞。
2. **群組萬用字元系統提示詞** (`groups["*"].systemPrompt`)：當對應中完全沒有特定群組項目，或者當該項目存在但未定義 `systemPrompt` 鍵時使用。

直接訊息的解析層級：

首先決定有效的 `direct` 對應：如果帳號定義了自己的 `direct`，它將完全替換根層級的 `direct` 對應（不進行深度合併）。然後在產生的單一對應上執行提示詞查找：

1. **特定直接訊息的系統提示詞** (`direct["<peerId>"].systemPrompt`)：當對應中存在特定對等項目**並且**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不套用任何系統提示詞。
2. **直接訊息萬用字元系統提示詞** (`direct["*"].systemPrompt`)：當對應中完全沒有特定對等項目，或者當該項目存在但未定義 `systemPrompt` 鍵時使用。

<Note>
`dms` 仍然是輕量級的每個直接訊息 (per-DM) 歷史覆寫區段 (`dms.<id>.historyLimit`)。提示詞覆寫位於 `direct` 之下。
</Note>

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，在多帳號設定下，會刻意為所有帳號隱藏根層級 `groups` —— 即使是那些未定義自身 `groups` 的帳號也是如此 —— 這是為了防止機器人接收到其不屬於的群組訊息。WhatsApp 不會套用此防護：對於未定義帳號層級覆寫的帳號，無論配置了多少個帳號，根層級 `groups` 和根層級 `direct` 總是會被繼承。在多帳號 WhatsApp 設定中，如果您想要每個帳號都有各自的群組或直接訊息提示，請在每個帳號下明確定義完整的對應關係，而不是依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是每個群組的配置對應，也是聊天層級的群組許可清單。無論是在根層級還是帳號範圍內，`groups["*"]` 都表示該範圍「允許所有群組」。
- 僅當您已經希望該範圍允許所有群組時，才加入萬用群組 `systemPrompt`。如果您仍只希望一組固定的群組 ID 符合資格，請勿對提示預設值使用 `groups["*"]`。相反，請在每個明確列入許可清單的群組項目上重複該提示。
- 群組准入與傳送者授權是分開的檢查項目。`groups["*"]` 擴大了可以到達群組處理的群組集合，但它本身並不授權這些群組中的每個傳送者。傳送者的存取權仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對直接訊息 (DM) 沒有相同的副作用。`direct["*"]` 僅在 DM 已被 `dmPolicy` 加上 `allowFrom` 或配對儲存庫 規則准許之後，提供預設的直接聊天配置。

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

- [配置參考 - WhatsApp](/zh-Hant/gateway/config-channels#whatsapp)

高重要性 WhatsApp 欄位：

- 存取權： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [故障排除](/zh-Hant/channels/troubleshooting)
