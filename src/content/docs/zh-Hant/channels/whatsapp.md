---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為和作業"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

狀態：透過 WhatsApp Web (Baileys) 可投入生產。Gateway 擁有連結的工作階段。

## 安裝（按需）

- Onboarding (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您第一次選擇 WhatsApp 外掛程式時提示您進行安裝。
- 當外掛程式尚未存在時，`openclaw channels login --channel whatsapp` 也提供安裝流程。
- Dev channel + git checkout：預設為本機外掛程式路徑。
- Stable/Beta：預設為 npm 套件 `@openclaw/whatsapp`。

手動安裝仍可使用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知寄件者的預設 DM 原則為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復指南。
  </Card>
  <Card title="Gateway 設定" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道設定模式和範例。
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

    若要在登入之前附加現有的/自訂 WhatsApp Web 認證目錄：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="啟動 gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配對請求（如果使用配對模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求在 1 小時後過期。每個頻道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能使用獨立號碼執行 WhatsApp。（管道中繼資料和設定流程已針對此設定進行最佳化，但也支援個人號碼設定。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    這是最乾淨的操作模式：

    - OpenClaw 使用獨立的 WhatsApp 身分
    - 更清楚的 DM 允許清單和路由邊界
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

  <Accordion title="Personal-number fallback">
    入站支援個人號碼模式，並寫入有利於自我聊天的基準：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自我聊天保護機制依連結的自我號碼和 `allowFrom` 運作。

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    在目前的 OpenClaw 管道架構中，訊息平台管道是基於 WhatsApp Web 的（`Baileys`）。

    在內建的聊天管道註冊表中，沒有獨立的 Twilio WhatsApp 訊息管道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- 閘道擁有 WhatsApp socket 和重新連線迴圈。
- 重新連線看門狗使用 WhatsApp Web 傳輸活動，而不僅是傳入的應用程式訊息量，因此安靜的連結裝置工作階段不會僅因為最近沒有人傳送訊息而重新啟動。如果傳輸訊框持續到達，但在看門狗視窗內沒有處理任何應用程式訊息，較長的應用程式靜默上限仍會強制重新連線。
- 傳出訊息需要目標帳戶有作用中的 WhatsApp 監聽器。
- 狀態和廣播聊天會被忽略（`@status`、 `@broadcast`）。
- 直接聊天使用 DM 工作階段規則（`session.dmScope`；預設 `main` 將 DM 折疊至代理程式主工作階段）。
- 群組工作階段是隔離的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp Web 傳輸會遵守閘道主機上的標準代理伺服器環境變數 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小寫變體)。建議優先使用主機層級的代理設定，而非通道專屬的 WhatsApp 代理設定。
- 當啟用 `messages.removeAckAfterReply` 時，OpenClaw 會在傳送可見的回覆後清除 WhatsApp 確認反應。

## 外掛程式掛鉤與隱私

WhatsApp 傳入訊息可能包含個人訊息內容、電話號碼、群組識別碼、發送者名稱和會話關聯欄位。因此，除非您明確選擇加入，否則 WhatsApp 不會將傳入 `message_received` 掛鉤負載廣播給外掛程式：

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

僅針對您信任能接收傳入 WhatsApp 訊息內容和識別碼的外掛程式啟用此功能。

## 存取控制與啟用

<Tabs>
  <Tab title="DM 政策">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會進行正規化)。

    多帳戶覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (和 `allowFrom`) 優先於該帳戶的通道層級預設值。

    執行時行為詳細資訊：

    - 配對會保存在通道允許存放區中，並與設定的 `allowFrom` 合併
    - 如果未設定允許清單，預設允許連結的自我號碼
    - OpenClaw 永遠不會自動配對傳出 `fromMe` 私訊 (您從連結裝置傳送給自己的訊息)

  </Tab>

  <Tab title="群組政策 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，所有群組都符合資格
       - 如果存在 `groups`，它將充當群組允許清單 (`"*"` 已允許)

    2. **群組發送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：發送者允許清單被繞過
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入訊息

    發送者允許清單後援機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時後援至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟用之前進行評估

    注意：如果完全沒有 `channels.whatsapp` 區塊存在，即使設定了 `channels.defaults.groupPolicy`，執行時群組政策後援仍是 `allowlist` (並帶有警告日誌)。

  </Tab>

  <Tab title="提及 + /啟用">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對 bot 身份的明確 WhatsApp 提及
    - 已設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後援 `messages.groupChat.mentionPatterns`)
    - 已授權群組訊息的傳入語音備忘錄文字稿
    - 隱式回覆 bot 偵測 (回覆發送者符合 bot 身份)

    安全性說明：

    - 引用/回覆僅滿足提及閘門；它並 **不** 授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非允許清單上的發送者仍會被封鎖，即使他們回覆了允許清單使用者的訊息

    工作階段層級啟用指令：

    - `/activation mention`
    - `/activation always`

    `activation` 會更新工作階段狀態 (而非全域設定)。它受到擁有者閘門控管。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天保護機制會啟用：

- 跳過自我聊天輪次的已讀回執
- 忽略提及 JID 的自動觸發行為，否則會傳送訊息給您自己
- 如果未設定 `messages.responsePrefix`，自聊回覆預設為 `[{identity.name}]` 或 `[openclaw]`

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

    回覆中繼資料欄位也會在可用時被填入 (`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164)。

  </Accordion>

  <Accordion title="媒體預留位置與位置/聯絡人提取">
    僅包含媒體的入站訊息會使用諸如以下的預留位置進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    當內容僅為 `<media:audio>` 時，授權群組語音備忘錄會在提及閘控之前進行文字轉錄，因此在語音備忘錄中說出 bot 提及可以觸發回覆。如果轉錄內容仍未提及 bot，則轉錄內容會保留在待處理群組記錄中，而不是原始預留位置。

    位置內容使用簡略的座標文字。位置標籤/評論和聯絡人/vCard 詳細資料會呈現為圍欄式不受信任的中繼資料，而非內聯提示文字。

  </Accordion>

  <Accordion title="待處理群組記錄注入">
    對於群組，未處理的訊息可以被緩衝，並在 bot 最終被觸發時作為語境注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    對於已接受的傳入 WhatsApp 訊息，已啟用讀取回執。

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

    自訂聊天即使已全域啟用，也會略過讀取回執。

  </Accordion>
</AccordionGroup>

## 傳送、分塊與媒體

<AccordionGroup>
  <Accordion title="Text chunking">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後回退至長度安全的分塊
  </Accordion>

<Accordion title="Outbound media behavior">
  - 支援圖片、影片、音訊（PTT 語音訊息）和文件負載 - 音訊媒體透過 Baileys `audio` 負載搭配 `ptt: true` 發送，因此 WhatsApp 用戶端會將其轉譯為按鍵通話語音訊息 - 回覆負載會保留 `audioAsVoice`；WhatsApp 的 TTS 語音訊息輸出即使在提供者返回 MP3 或 WebM 時，也會維持在此 PTT 路徑上 - 原生 Ogg/Opus 音訊會作為 `audio/ogg; codecs=opus` 發送，以保持語音訊息相容性 - 非-Ogg 音訊（包括 Microsoft Edge TTS
  MP3/WebM 輸出）會在 PTT 傳送前透過 `ffmpeg` 轉碼為 48 kHz 單聲道 Ogg/Opus - `/tts latest` 會將最新的助理回覆作為一條語音訊息發送，並抑制對同一回覆的重複發送；`/tts chat on|off|default` 控制目前 WhatsApp 聊天的自動 TTS - 支援透過影片發送時的 `gifPlayback: true` 播放動畫 GIF - 發送多媒體回覆負載時，標題會套用至第一個媒體項目，但 PTT 語音訊息除外，因為 WhatsApp
  用戶端對語音訊息標題的轉譯不一致，所以 PTT 會先發送音訊，然後分開發送可見文字 - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑
</Accordion>

  <Accordion title="媒體大小限制與後備行為">
    - 輸入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 輸出媒體發送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 當媒體發送失敗時，首項後備機制會發送文字警告，而不是無聲地捨棄回應
  </Accordion>
</AccordionGroup>

## 回覆引用

WhatsApp 支援原生回覆引用，輸出的回覆會顯示引用輸入的訊息。使用 `channels.whatsapp.replyToMode` 來控制它。

| 數值        | 行為                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 永不引用；作為一般訊息發送                   |
| `"first"`   | 僅引用第一個輸出回覆區塊                     |
| `"all"`     | 引用每個輸出回覆區塊                         |
| `"batched"` | 引用佇列的批次回覆，同時保持立即回覆不被引用 |

預設為 `"off"`。每個帳號的覆寫使用 `channels.whatsapp.accounts.<id>.replyToMode`。

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

| 等級          | Ack 反應 | 代理發起的反應 | 描述                         |
| ------------- | -------- | -------------- | ---------------------------- |
| `"off"`       | 否       | 否             | 完全沒有反應                 |
| `"ack"`       | 是       | 否             | 僅 Ack 反應（回覆前回條）    |
| `"minimal"`   | 是       | 是（保守）     | Ack + 具有保守指導的代理反應 |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 具有鼓勵指導的代理反應 |

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

WhatsApp 支援透過 `channels.whatsapp.ackReaction` 對輸入收據進行立即的 ack 反應。
Ack 反應由 `reactionLevel` 閘控 — 當 `reactionLevel` 為 `"off"` 時會被抑制。

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

- 在接受輸入後立即發送（回覆前）
- 失敗會被記錄但不會阻擋正常回覆的遞送
- 群組模式 `mentions` 會對提及觸發的輪次做出反應；群組啟用 `always` 則作為此檢查的繞過方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳戶與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在 `default`，則選擇該項，否則選擇第一個設定的帳戶 ID（經排序）
    - 帳戶 ID 會在內部正規化以便查找
  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前驗證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設驗證仍會被預設帳戶流程識別/遷移
  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 驗證狀態。

    在舊版驗證目錄中，`oauth.json` 會被保留，同時移除 Baileys 驗證檔案。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- 代理程式工具支援包含 WhatsApp 反應動作 (`react`)。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（透過 `channels.whatsapp.configWrites=false` 停用）。

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

  <Accordion title="已連結但斷線 / 重連迴圈">
    症狀：已連結的帳戶重複斷線或嘗試重連。

    安靜的帳戶可能會在正常訊息逾時後保持連線；當 WhatsApp Web 傳輸活動停止、socket 關閉，或應用層級活動在較長的安全視窗內保持沈默時，監看程式會重新啟動。

    修復方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="在 Proxy 後 QR 登入逾時">
    症狀：`openclaw channels login --channel whatsapp` 在顯示可用的 QR 碼之前失敗，並出現 `status=408 Request Time-out` 或 TLS socket 中斷連線。

    WhatsApp Web 登入使用閘道主機的標準 proxy 環境 (`HTTPS_PROXY`, `HTTP_PROXY`, 小寫變體, 和 `NO_PROXY`)。請驗證閘道行程是否繼承了 proxy 環境變數，以及 `NO_PROXY` 不符合 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="傳送時沒有作用中的監聽程式">
    當目標帳戶沒有作用中的閘道監聽程式時，外傳傳送會快速失敗。

    請確保閘道正在執行，且帳戶已連結。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重複索引鍵：後面的項目會覆寫前面的項目，因此請在每個範圍內保持單一 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行環境警告">
    WhatsApp 閘道執行環境應該使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示

WhatsApp 支援透過 `groups` 和 `direct` 映射，針對群組和直接聊天使用 Telegram 風格的系統提示。

群組訊息的解析層級：

首先判定有效的 `groups` 映射：如果帳戶定義了自己的 `groups`，它將完全取代根層級的 `groups` 映射（不進行深度合併）。然後在產生的單一映射上執行提示查找：

1. **特定群組系統提示** (`groups["<groupId>"].systemPrompt`)：當映射中存在特定群組項目**並**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元並且不套用系統提示。
2. **群組萬用字元系統提示** (`groups["*"].systemPrompt`)：當映射中完全沒有特定群組項目時，或者當它存在但未定義 `systemPrompt` 鍵時使用。

直接訊息的解析層級：

首先判定有效的 `direct` 映射：如果帳戶定義了自己的 `direct`，它將完全取代根層級的 `direct` 映射（不進行深度合併）。然後在產生的單一映射上執行提示查找：

1. **特定對象系統提示** (`direct["<peerId>"].systemPrompt`)：當映射中存在特定對像項目**並**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元並且不套用系統提示。
2. **對象萬用字元系統提示** (`direct["*"].systemPrompt`)：當映射中完全沒有特定對像項目時，或者當它存在但未定義 `systemPrompt` 鍵時使用。

<Note>
`dms` 仍然是用於每個 DM 歷史記錄覆寫的輕量級桶 (`dms.<id>.historyLimit`)。提示覆寫位於 `direct` 下。
</Note>

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，在多帳號設定下，會刻意為所有帳號抑制根層級的 `groups` — 即使是那些未定義自己 `groups` 的帳號 — 以防止機器人接收到它不屬於的群組的訊息。WhatsApp 不會套用此防護：對於未定義帳號層級覆寫的帳號，無論設定了多少個帳號，根層級的 `groups` 和根層級的 `direct` 總是會被繼承。在多帳號 WhatsApp 設定中，如果您想要每個帳號各自的群組或直接提示，請在每個帳號下明確定義完整的映射，而不是依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是一個每個群組的配置映射，也是聊天層級的群組允許列表。在根層級或帳號範圍內，`groups["*"]` 表示該範圍「允許所有群組」。
- 僅當您已經希望該範圍允許所有群組時，才新增萬用字元群組 `systemPrompt`。如果您仍然只希望一組固定的群組 ID 符合資格，請勿將 `groups["*"]` 用作提示預設值。相反，請在每個明確允許列表的群組項目上重複該提示。
- 群組准入和發送者授權是分開的檢查。`groups["*"]` 擴大了可以到達群組處理的群組集合，但它本身並不授權這些群組中的每個發送者。發送者存取權仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對於 DM（私訊）沒有相同的副作用。`direct["*"]` 僅在 DM 已透過 `dmPolicy` 加上 `allowFrom` 或配對存儲規則允許進入後，提供預設的直接聊天配置。

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

高優先級 WhatsApp 欄位：

- 存取權：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
