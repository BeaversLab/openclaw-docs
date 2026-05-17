---
summary: "WhatsApp 頻道支援、存取控制、傳遞行為和操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

狀態：透過 WhatsApp Web (Baileys) 可投入生產。Gateway 擁有連結的工作階段。

## 安裝（按需）

- 入門引導 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  會在您首次選取它時提示您安裝 WhatsApp 外掛程式。
- `openclaw channels login --channel whatsapp` 也在外掛程式尚未存在時提供安裝流程。
- Dev channel + git checkout：預設為本機外掛程式路徑。
- Stable/Beta：會先從 ClawHub 安裝官方 `@openclaw/whatsapp` 外掛程式，並將 npm 作為備援方案。
- WhatsApp 執行環境是分發在核心 OpenClaw npm 套件之外，因此
  WhatsApp 特定的執行環境相依性會保留在外部外掛程式中。

手動安裝仍然可用：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

僅在您需要 registry 備援時才使用純 npm 套件 (`@openclaw/whatsapp`)。僅在您需要可重現的安裝時才鎖定確切版本。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    對於未知發送者的預設 DM 政策是配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復手冊。
  </Card>
  <Card title="閘道設定" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道設定模式和範例。
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

    針對特定帳戶：

```bash
openclaw channels login --channel whatsapp --account work
```

    若要在登入前附加現有/自訂的 WhatsApp Web 驗證目錄：

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

  <Step title="批准首次配對請求（如果使用配對模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配對請求在 1 小時後過期。待處理請求每個通道上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在單獨的號碼上運行 WhatsApp。（通道元數據和設置流程已針對該設置進行優化，但也支持個人號碼設置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼（推薦）">
    這是最乾淨的操作模式：

    - OpenClaw 使用單獨的 WhatsApp 身份
    - 更清晰的 DM 許可清單和路由邊界
    - 降低自聊混淆的機率

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

  <Accordion title="個人號碼備選方案">
    入學支持個人號碼模式並寫入對自聊友好的基線：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在運行時，自聊保護基於關聯的自號碼和 `allowFrom`。

  </Accordion>

  <Accordion title="僅限 WhatsApp Web 的通道範圍">
    在當前的 OpenClaw 通道架構中，消息平台通道基於 WhatsApp Web (`Baileys`)。

    內置聊天通道註冊表中沒有單獨的 Twilio WhatsApp 消息通道。

  </Accordion>
</AccordionGroup>

## 運行時模型

- Gateway 擁有 WhatsApp 套接字和重連循環。
- 重連看門狗使用 WhatsApp Web 傳輸活動，而不僅僅是入站應用消息量，因此安靜的關聯設備會話不會僅因為最近沒有人發送消息而重啟。如果傳輸幀不斷到來但在看門狗窗口內沒有處理應用消息，更長的應用靜默上限仍會強制重連；在對最近活動的會話進行瞬態重連後，該應用靜默檢查在第一個恢復窗口內使用正常的消息超時。
- Baileys socket timings 在 `web.whatsapp.*` 下是明確的：`keepAliveIntervalMs` 控制 WhatsApp Web 應用程式 ping，`connectTimeoutMs` 控制開啟握手逾時，而 `defaultQueryTimeoutMs` 控制 Baileys 查詢逾時。
- 外寄發送需要目標帳戶有作用中的 WhatsApp 監聽器。
- 群組發送會在文字和媒體標題中，為 `@+<digits>` 和 `@<digits>` token 附加原生提及元數據，當 token 符合目前的 WhatsApp 參與者元數據時，包括 LID 支援的群組。
- 狀態和廣播聊天會被忽略 (`@status`, `@broadcast`)。
- 重新連線監看程式遵循 WhatsApp Web 傳輸活動，而不僅僅是入站應用程式訊息量：安靜的連結裝置會話會在傳輸幀持續時保持連線，但傳輸停頓會在較遠的遠端中斷連線路徑之前很久就強制重新連線。
- 直接聊天使用 DM 會話規則 (`session.dmScope`；預設 `main` 會將 DM 折疊至代理程式主會話)。
- 群組會話是獨立的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp 頻道/電子報可使用其原生 `@newsletter` JID 作為明確的外寄目標。外寄電子報發送使用頻道會話元數據 (`agent:<agentId>:whatsapp:channel:<jid>`)，而不是 DM 會話語意。
- WhatsApp Web 傳輸會遵守閘道主機上的標準代理伺服器環境變數 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小寫變體)。建議優先使用主機層級的代理設定，而非通道特定的 WhatsApp 代理設定。
- 當啟用 `messages.removeAckAfterReply` 時，OpenClaw 會在傳送可見回覆後清除 WhatsApp ack 反應。

## Plugin hooks and privacy

WhatsApp 入站訊息可能包含個人訊息內容、電話號碼、
群組識別碼、寄件者名稱和會話關聯欄位。因此，
除非您明確選擇加入，否則 WhatsApp 不會將入站 `message_received` hook 負載廣播給外掛程式：

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
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權限：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部會進行正規化)。

    `allowFrom` 是 DM 傳送者存取控制清單。它不會限制對 WhatsApp 群組 JID 或 `@newsletter` 頻道 JID 的明確傳出傳送。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號而言優先順序高於頻道層級的預設值。

    執行時期行為詳細資訊：

    - 配對會保存在頻道允許存放區中，並與設定的 `allowFrom` 合併
    - 排程自動化和心跳接收者後援使用明確的傳遞目標或設定的 `allowFrom`；DM 配對核准並非隱含的 cron 或心跳接收者
    - 如果未設定允許清單，連結的自我號碼預設為允許
    - OpenClaw 永遠不自動配對傳出 `fromMe` DM (您從連結裝置傳送給自己的訊息)

  </Tab>

  <Tab title="群組政策 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，所有群組都符合資格
       - 如果存在 `groups`，它會作為群組允許清單 (`"*"` 允許)

    2. **群組發送者政策** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：繞過發送者允許清單
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組傳入訊息

    發送者允許清單後援機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退到 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前進行評估

    注意：如果完全不存在 `channels.whatsapp` 區塊，執行時群組政策回退值為 `allowlist` (並附帶警告日誌)，即使已設定 `channels.defaults.groupPolicy`。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包括：

    - 對機器人身份的明確 WhatsApp 提及
    - 設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後援 `messages.groupChat.mentionPatterns`)
    - 已授權群組訊息的傳入語音備忘錄文字稿
    - 隱式回覆機器人偵測 (回覆發送者符合機器人身份)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非允許清單中的發送者仍會被封鎖，即使他們回覆允許清單使用者的訊息

    會話層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新會話狀態 (而非全域設定)。它受擁有者閘門控制。

  </Tab>
</Tabs>

## 個人號碼與自我聊天行為

當連結的自我號碼也出現在 `allowFrom` 中時，WhatsApp 自我聊天安全防護會啟動：

- 跳過自我聊天的已讀回執
- 否則會 ping 您自己的提及 JID 自動觸發行為。
- 如果 `messages.responsePrefix` 未設定，自聊天回覆預設為 `[{identity.name}]` 或 `[openclaw]`

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

    回覆中繼資料欄位也會在可用時填入 (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164)。
    當引用回覆目標是可下載的媒體時，OpenClaw 會透過
    一般的 inbound media store 儲存它，並將其公開為 `MediaPath`/`MediaType`，以便
    Agent 可以檢查引用的圖像，而不僅僅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    僅包含媒體的傳入訊息會使用佔位符進行正規化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    當主體僅為 `<media:audio>` 時，已授權的群組語音訊息會在提及閘控前進行轉錄，因此在語音訊息中提及 bot 可以觸發回覆。如果轉錄內容仍未提及 bot，則會將轉錄內容保留在待處理的群組歷史記錄中，而不是原始的佔位符。

    Location 主體使用簡短的座標文字。Location 標籤/註解和連絡人/vCard 詳細資訊會被呈現為圍欄式的不受信任中繼資料，而非內嵌提示文字。

  </Accordion>

  <Accordion title="待處理群組歷史記錄注入">
    對於群組，未處理的訊息可以被緩衝，並在機器人最終被觸發時作為上下文注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備方案：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已讀回執">
    對於已接受的 WhatsApp 傳入訊息，預設會啟用已讀回執。

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

    自聊對話會跳過已讀回執，即使已全域啟用。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後後備至長度安全的分塊

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支援圖片、影片、音訊（PTT 語音訊息）和文件承載
    - 音訊媒體透過 Baileys `audio` 承載搭配 `ptt: true` 發送，因此 WhatsApp 用戶端會將其算繪為按住對講語音訊息
    - 回覆承載會保留 `audioAsVoice`；WhatsApp 的 TTS 語音訊息輸出即使在供應商傳回 MP3 或 WebM 時也會維持此 PTT 路徑
    - 原生 Ogg/Opus 音訊會以 `audio/ogg; codecs=opus` 形式發送以確保語音訊息相容性
    - 非 Ogg 音訊（包括 Microsoft Edge TTS MP3/WebM 輸出）會在 PTT 傳送前使用 `ffmpeg` 轉碼為 48 kHz 單聲道 Ogg/Opus
    - `/tts latest` 會將最新的助理回覆作為一則語音訊息發送，並針對同一則回覆抑制重複發送；`/tts chat on|off|default` 控制目前 WhatsApp 聊天的自動 TTS
    - 動畫 GIF 播放透過影片發送時的 `gifPlayback: true` 來支援
    - 發送多媒體回覆承載時，標題說明會套用至第一個媒體項目；但 PTT 語音訊息會先發送音訊，然後分開發送可見文字，因為 WhatsApp 用戶端對語音訊息標題說明的算繪不一致
    - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑

  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 連入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 連出媒體傳送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳戶的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（重新調整大小/品質掃描）以符合限制
    - 當媒體傳送失敗時，第一項目的後援機制會傳送文字警示，而不是無聲地捨棄回應

  </Accordion>
</AccordionGroup>

## 回覆引用

WhatsApp 支援原生回覆引用，其中連出回覆會明確引用連入訊息。您可以使用 `channels.whatsapp.replyToMode` 來控制此功能。

| 數值        | 行為                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 永不引用；以純文字訊息傳送                   |
| `"first"`   | 僅引用第一個連出回覆區塊                     |
| `"all"`     | 引用每個出站回覆區塊                         |
| `"batched"` | 引用佇列的批次回覆，同時保持立即回覆不被引用 |

預設為 `"off"`。每個帳戶的覆寫使用 `channels.whatsapp.accounts.<id>.replyToMode`。

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

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符號反應的範圍：

| 等級          | Ack 反應 | 代理發起的反應 | 描述                           |
| ------------- | -------- | -------------- | ------------------------------ |
| `"off"`       | 否       | 否             | 完全沒有反應                   |
| `"ack"`       | 是       | 否             | 僅限 Ack 反應（回覆前回條）    |
| `"minimal"`   | 是       | 是（保守）     | Ack + 代理反應，並提供保守指導 |
| `"extensive"` | 是       | 是（鼓勵）     | Ack + 代理反應，並提供鼓勵指導 |

預設值： `"minimal"`。

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

WhatsApp 透過 `channels.whatsapp.ackReaction` 支援對傳入訊息進行立即確認反應。
確認反應受 `reactionLevel` 控制 — 當 `reactionLevel` 為 `"off"` 時，這些反應會被抑制。

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
- 群組模式 `mentions` 會在觸發提及的輪次中做出反應；群組啟用 `always` 可作為此檢查的繞過方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多帳戶與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在則為 `default`，否則為第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 會在內部進行正規化以供查詢

  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前的驗證路徑： `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案： `creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設驗證仍會被識別/遷移，用於預設帳戶流程

  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 驗證狀態。

    當 Gateway 可連線時，登出會先停止所選帳戶的即時 WhatsApp 監聽器，這樣連線的會話就不會在下次重新啟動前持續接收訊息。 `openclaw channels remove --channel whatsapp` 也會在停用或刪除帳戶設定前停止即時監聽器。

    在舊版驗證目錄中， `oauth.json` 會被保留，而 Baileys 驗證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包含 WhatsApp 回應動作 (`react`)。
- 動作閘道：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 預設啟用通道發起的設定寫入 (可透過 `channels.whatsapp.configWrites=false` 停用)。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結 (需要 QR code)">
    症狀：通道狀態回報未連結。

    解決方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重連迴圈">
    症狀：已連結的帳戶持續斷線或嘗試重連。

    安靜的帳戶可以保持連結超過正常的訊息逾時時間；當 WhatsApp Web 傳輸活動停止、socket 關閉，或應用層級的活動在較長的安全視窗內保持沈默時，看門狗會重新啟動。

    如果日誌顯示重複的 `status=408 Request Time-out Connection was lost`，請調整 `web.whatsapp` 下的 Baileys socket 時序。首先將 `keepAliveIntervalMs` 縮短至低於您網路的閒置逾時時間，並在緩慢或易遺失的連線上增加 `connectTimeoutMs`：

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
    openclaw doctor
    openclaw logs --follow
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 顯示 `Gateway inactive` 但 `openclaw gateway status` 和 `openclaw channels status --probe` 顯示 Gateway 和 WhatsApp 狀態良好，請執行 `openclaw doctor`。在 Linux 上，doctor 會警告仍然呼叫 `~/.openclaw/bin/ensure-whatsapp.sh` 的舊版 crontab 項目；請使用 `crontab -e` 移除那些過時的項目，因為 cron 可能缺少 systemd user-bus 環境，導致該舊腳本錯誤報告 Gateway 的健康狀態。

    如有必要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="在 Proxy 後方的 QR 登入逾時">
    症狀：`openclaw channels login --channel whatsapp` 在顯示可用的 QR 碼之前失敗，並出現 `status=408 Request Time-out` 或 TLS socket 中斷連線。

    WhatsApp Web 登入使用 Gateway 主機的標準 Proxy 環境（`HTTPS_PROXY`、`HTTP_PROXY`、小寫變體以及 `NO_PROXY`）。請驗證 Gateway 程序繼承了 Proxy 環境變數，且 `NO_PROXY` 不符合 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="傳送時無作用中的監聽器">
    當目標帳戶沒有作用中的 Gateway 監聽器時，外寄傳送會快速失敗。

    請確保 Gateway 正在執行且帳戶已連結。

  </Accordion>

  <Accordion title="回覆出現在對話紀錄中，但未出現在 WhatsApp">
    對話紀錄行記錄了代理程式產生的內容。WhatsApp 的遞送狀態是分開檢查的：只有在 Baileys 針對至少一個可見的文字或媒體發送返回外寄訊息 ID 後，OpenClow 才會將自動回覆視為已傳送。

    Ack 反應是獨立的前置回覆收據。成功的反應並不證明後續的文字或媒體回覆已被 WhatsApp 接受。

    請檢查閘道日誌中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵：後面的項目會覆蓋前面的，因此在每個範圍內保持單一的 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示詞

WhatsApp 支援透過 `groups` 和 `direct` 映射，為群組和直接聊天提供 Telegram 風格的系統提示詞。

群組訊息的解析層級：

首先決定有效的 `groups` 映射：如果帳號定義了自己的 `groups`，它會完全取代根層級的 `groups` 映射（不進行深層合併）。然後會在產生的單一映射上執行提示詞查詢：

1. **特定群組的系統提示詞** (`groups["<groupId>"].systemPrompt`)：當映射中存在特定群組項目**並**且定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元且不套用系統提示詞。
2. **群組萬用字元系統提示** (`groups["*"].systemPrompt`)：當對應表中完全缺少特定的群組條目，或者該條目存在但未定義 `systemPrompt` 鍵時使用。

私訊的解析階層：

首先確定有效的 `direct` 對應表：如果帳號定義了自己的 `direct`，它將完全取代根層級的 `direct` 對應表（不進行深度合併）。然後在產生的單一對應表上執行提示查找：

1. **特定私訊系統提示** (`direct["<peerId>"].systemPrompt`)：當對應表中存在特定的對等條目 **並且** 定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元且不套用任何系統提示。
2. **私訊萬用字元系統提示** (`direct["*"].systemPrompt`)：當對應表中完全缺少特定的對等條目，或者該條目存在但未定義 `systemPrompt` 鍵時使用。

<Note>
`dms` 仍是輕量級的每個私訊歷史覆寫桶 (`dms.<id>.historyLimit`)。提示覆寫位於 `direct` 之下。
</Note>

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，在多帳號設置中，會刻意為所有帳號抑制根層級 `groups` —— 即使是那些未定義自己 `groups` 的帳號 —— 以防止機器人接收其不屬於的群組訊息。WhatsApp 不套用此防護：對於未定義帳號層級覆寫的帳號，無論配置了多少個帳號，根層級 `groups` 和根層級 `direct` 總是會被繼承。在多帳號 WhatsApp 設置中，如果您想要每個帳號的群組或私訊提示，請明確地在每個帳號下定義完整的對應表，而不是依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是每個群組的配置對應表，也是聊天層級的群組允許清單。在根層級或帳號範圍內，`groups["*"]` 表示該範圍「允許所有群組」。
- 僅當您已希望該範圍允許所有群組時，才新增萬用字元群組 `systemPrompt`。如果您仍只希望一組固定的群組 ID 符合資格，請勿在提示預設值中使用 `groups["*"]`。取而代之的是，在每個明確列入白名單的群組條目上重複提示。
- 群組准入與傳送者授權是分開的檢查。`groups["*"]` 擴大了可到達群組處理的群組集合，但其本身並未授權這些群組中的每個傳送者。傳送者存取權仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對於私訊沒有相同的副作用。`direct["*"]` 僅在私訊已透過 `dmPolicy` 加上 `allowFrom` 或配對儲存庫規則准許後，提供預設的直接聊天設定。

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

## 設定參考指標

主要參考資料：

- [設定參考資料 - WhatsApp](/zh-Hant/gateway/config-channels#whatsapp)

高重要性 WhatsApp 欄位：

- 存取權：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 遞送：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`、`reactionLevel`
- 多帳號：`accounts.<id>.enabled`、`accounts.<id>.authDir`、帳號層級覆寫
- 操作：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`、`web.whatsapp.*`
- 階段作業行為：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`
- 提示：`groups.<id>.systemPrompt`、`groups["*"].systemPrompt`、`direct.<id>.systemPrompt`、`direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
