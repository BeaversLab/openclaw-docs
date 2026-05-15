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
- 穩定版/Beta 版：在目前官方
  發行標籤上使用 npm 套件 `@openclaw/whatsapp`。

手動安裝仍可使用：

```bash
openclaw plugins install @openclaw/whatsapp
```

使用基本套件以追蹤目前的官方發行標籤。僅在您需要可重現的安裝時才釘選特定版本。

在 Windows 上，WhatsApp 外掛程式在 npm install 期間需要 Git 在 `PATH` 上，因為
其 Baileys/libsignal 相依性之一是從 git URL 取得的。安裝
適用於 Windows 的 Git，然後重新啟動 Shell 並重新執行安裝：

```powershell
winget install --id Git.Git -e
```

如果可攜式 Git 的 `bin` 目錄在 `PATH` 上，它也可以使用。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    針對未知發送者的預設 DM 政策為配對。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復手冊。
  </Card>
  <Card title="閘道組態" icon="settings" href="/zh-Hant/gateway/configuration">
    完整的頻道組態模式和範例。
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

    若要在登入之前附加現有/自訂的 WhatsApp Web 驗證目錄：

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

    配對請求會在 1 小時後過期。每個頻道的待處理請求上限為 3 個。

  </Step>
</Steps>

<Note>OpenClaw 建議盡可能在單獨的號碼上運行 WhatsApp。（頻道元資料和設定流程已針對該設定進行最佳化，但也支援個人號碼設定。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="專用號碼（推薦）">
    這是最乾淨的營運模式：

    - 為 OpenClaw 使用獨立的 WhatsApp 身份
    - 更清晰的 DM 許可清單和路由邊界
    - 降低自聊混淆的機率

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

  <Accordion title="個人號碼備用方案">
    入學流程支援個人號碼模式，並會寫入對自聊友善的基準設定：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的個人號碼
    - `selfChatMode: true`

    在執行時期，自聊保護機制以連結的自我號碼和 `allowFrom` 為依據。

  </Accordion>

  <Accordion title="僅 WhatsApp Web 的頻道範圍">
    在目前的 OpenClaw 頻道架構中，訊息平台頻道是基於 WhatsApp Web（`Baileys`）的。

    內建的聊天頻道註冊表中沒有單獨的 Twilio WhatsApp 訊息頻道。

  </Accordion>
</AccordionGroup>

## 執行時期模型

- Gateway 擁有 WhatsApp socket 和重新連線迴圈。
- 重新連線看門狗會使用 WhatsApp Web 傳輸活動，而不僅僅是入站應用程式訊息量，因此安靜的連結裝置工作階段不會僅因為最近沒有人發送訊息而重新啟動。如果傳輸幀持續到達，但在看門狗視窗內未處理任何應用程式訊息，較長的應用程式靜默上限仍會強制重新連線；對於最近活動的工作階段進行短暫重新連線後，該應用程式靜默檢查會在第一個恢復視窗內使用正常的訊息逾時時間。
- Baileys socket 時序在 `web.whatsapp.*` 下有明確定義：`keepAliveIntervalMs` 控制 WhatsApp Web 應用程式 ping，`connectTimeoutMs` 控制開啟連線握手逾時，而 `defaultQueryTimeoutMs` 控制查詢逾時。
- 傳送訊息需要目標帳號有一個使用中的 WhatsApp 監聽器。
- 當群組傳送中的文字與媒體標題內的 `@+<digits>` 與 `@<digits>` 權杖符合目前 WhatsApp 參與者中繼資料時（包括 LID 支援的群組），系統會附加原生提及中繼資料。
- 狀態與廣播聊天會被忽略（`@status`、`@broadcast`）。
- 重新連線監控程式會追蹤 WhatsApp Web 傳輸活動，而不僅是傳入的應用程式訊息量：只要傳輸幀持續，安靜的連結裝置工作階段就會保持連線，但傳輸停滯會在遠端斷線路徑觸發前很久就強制重新連線。
- 直接聊天使用 DM 工作階段規則（`session.dmScope`；預設的 `main` 會將 DM 折疊至代理主要工作階段）。
- 群組工作階段是隔離的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp 頻道/電子報可透過其原生 `@newsletter` JID 作為明確的傳送目標。傳出電子報傳送使用頻道工作階段中繼資料（`agent:<agentId>:whatsapp:channel:<jid>`），而非 DM 工作階段語意。
- WhatsApp Web 傳輸會遵守閘道主機上的標準代理伺服器環境變數（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小寫變體）。建議優先使用主機層級的代理設定，而非通道特定的 WhatsApp 代理設定。
- 當啟用 `messages.removeAckAfterReply` 時，OpenClaw 會在傳送可見回覆後清除 WhatsApp ack 回應。

## Plugin hooks and privacy

WhatsApp 傳入訊息可能包含個人訊息內容、電話號碼、
群組識別碼、發送者名稱和工作階段關聯欄位。基於此原因，
除非您明確選擇加入，否則 WhatsApp 不會將傳入的 `message_received` hook 載荷廣播給外掛程式：

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

您可以將選擇加入的範圍限定為單一帳號：

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

僅對您信任能接收傳入 WhatsApp 訊息內容和識別碼的外掛程式啟用此功能。

## 存取控制與啟用

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天存取權限：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的號碼 (內部正規化)。

    `allowFrom` 是 DM 發送者存取控制清單。它不會封鎖傳送到 WhatsApp 群組 JID 或 `@newsletter` 頻道 JID 的明確傳出發送。

    多帳號覆寫：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 對該帳號而言，優先於頻道層級的預設值。

    執行時期行為細節：

    - 配對會保存在頻道允許儲存區 並與設定的 `allowFrom` 合併
    - 排程自動化和心跳收件者後援使用明確的傳送目標或設定的 `allowFrom`；DM 配對核准不是隱含的 cron 或心跳收件者
    - 如果未設定允許清單，預設允許連結的自我號碼
    - OpenClaw 永不自動配對傳出 `fromMe` DM (您從連結裝置傳送給自己的訊息)

  </Tab>

  <Tab title="群組原則 + 允許清單">
    群組存取有兩個層級：

    1. **群組成員允許清單** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，則所有群組均符合資格
       - 如果存在 `groups`，它會作為群組允許清單 (`"*"` 已允許)

    2. **群組發送者原則** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：發送者允許清單被略過
       - `allowlist`：發送者必須符合 `groupAllowFrom` (或 `*`)
       - `disabled`：封鎖所有群組進入訊息

    發送者允許清單後備機制：

    - 如果未設定 `groupAllowFrom`，執行時會在可用時回退至 `allowFrom`
    - 發送者允許清單會在提及/回覆啟動之前進行評估

    注意：如果完全不存在任何 `channels.whatsapp` 區塊，即使設定了 `channels.defaults.groupPolicy`，執行時群組原則回退值仍為 `allowlist` (並附帶警告日誌)。

  </Tab>

  <Tab title="提及 + /activation">
    群組回覆預設需要提及。

    提及偵測包含：

    - 對機器人身分的明確 WhatsApp 提及
    - 設定的提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 已授權群組訊息的進行語音訊息逐字稿
    - 隱性回覆機器人偵測 (回覆發送者符合機器人身分)

    安全性注意：

    - 引用/回覆僅滿足提及閘門；它並**不**授予發送者授權
    - 使用 `groupPolicy: "allowlist"` 時，非允許清單中的發送者即使回覆允許清單使用者的訊息，仍會被封鎖

    會話層級啟動指令：

    - `/activation mention`
    - `/activation always`

    `activation` 會更新會話狀態 (非全域設定)。它受到擁有者權限管控。

  </Tab>
</Tabs>

## 個人號碼與自訊息行為

當連結的自我號碼也出現在 `allowFrom` 中時，會啟動 WhatsApp 自訊息保護機制：

- 略過自訊息回合的已讀回執
- 忽略提及 JID 的自動觸發行為，否則會向您自己發送通知
- 如果未設定 `messages.responsePrefix`，自訊息回覆預設為 `[{identity.name}]` 或 `[openclaw]`

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

    回覆元資料欄位也會在可用時被填入（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、發送者 JID/E.164）。
    當引用回覆的目標是可下載的媒體時，OpenClaw 會透過
    正常的入站媒體儲存來保存它，並將其顯示為 `MediaPath`/`MediaType`，
    以便代理人可以檢查參考的圖像，而不僅僅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒體佔位符與位置/聯絡人提取">
    僅包含媒體的入站訊息會使用諸如以下的佔位符進行正規化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    當訊息主體僅為 `<media:audio>` 時，已授權的群組語音訊息會在提及閘控之前進行轉錄，
    因此在語音訊息中說出機器人提及可以觸發回覆。如果轉錄內容仍然沒有提及機器人，
    則轉錄內容會保留在待處理的群組歷史記錄中，而不是原始的佔位符。

    位置訊息主體使用簡短的座標文字。位置標籤/註解和聯絡人/vCard 詳細資訊會渲染為圍欄式的不受信任元資料，而非行內提示文字。

  </Accordion>

  <Accordion title="待處理的群組歷史記錄注入">
    針對群組，未處理的訊息可以進行緩衝，並在機器人最終被觸發時作為語境注入。

    - 預設限制：`50`
    - 設定：`channels.whatsapp.historyLimit`
    - 後備方案：`messages.groupChat.historyLimit`
    - `0` 停用

    注入標記：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已讀回執">
    對於已接受的傳入 WhatsApp 訊息，預設會啟用已讀回執。

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

    即使全域已啟用，自訊息回合（Self-chat turns）也會跳過已讀回執。

  </Accordion>
</AccordionGroup>

## 傳遞、分塊與媒體

<AccordionGroup>
  <Accordion title="文字分塊">
    - 預設分塊限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式偏好段落邊界（空白行），然後回退到長度安全的分塊

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支援圖片、影片、音訊（PTT 語音訊息）和文件載荷
    - 音訊透過 Baileys `audio` 載荷搭配 `ptt: true` 發送，因此 WhatsApp 用戶端會將其渲染為按住對講語音訊息
    - 回覆載荷會保留 `audioAsVoice`；WhatsApp 的 TTS 語音訊息輸出即使供應商傳回 MP3 或 WebM，也會維持在此 PTT 路徑上
    - 原生 Ogg/Opus 音訊會以 `audio/ogg; codecs=opus` 發送，以相容語音訊息
    - 非 Ogg 音訊（包括 Microsoft Edge TTS MP3/WebM 輸出）會在 PTT 發送前使用 `ffmpeg` 轉碼為 48 kHz 單聲道 Ogg/Opus
    - `/tts latest` 會將最新的助理回覆作為單一語音訊息發送，並抑制同一回覆的重複發送；`/tts chat on|off|default` 控制目前 WhatsApp 聊天的自動 TTS
    - 動畫 GIF 播放透過影片發送時的 `gifPlayback: true` 支援
    - 發送多媒體回覆載荷時，說明文字會套用至第一個媒體項目，但 PTT 語音訊息會先發送音訊並分開發送可見文字，因為 WhatsApp 用戶端對語音訊息說明文字的渲染不一致
    - 媒體來源可以是 HTTP(S)、`file://` 或本機路徑

  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 輸入媒體儲存上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 輸出媒體發送上限：`channels.whatsapp.mediaMaxMb`（預設 `50`）
    - 每個帳號的覆寫使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 圖片會自動最佳化（調整大小/品質掃描）以符合限制
    - 媒體發送失敗時，首項後備機制會發送文字警告，而不是靜默捨棄回應

  </Accordion>
</AccordionGroup>

## 回覆引言

WhatsApp 支援原生回覆引言，其中輸出回覆會可見地引言輸入訊息。使用 `channels.whatsapp.replyToMode` 進行控制。

| 數值        | 行為                                       |
| ----------- | ------------------------------------------ |
| `"off"`     | 從不引言；作為純文字訊息發送               |
| `"first"`   | 僅引言第一個輸出回覆區塊                   |
| `"all"`     | 引用每個傳出回覆區塊                       |
| `"batched"` | 引用排程的批次回覆，同時保留立即回覆不引用 |

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

`channels.whatsapp.reactionLevel` 控制代理程式在 WhatsApp 上使用 emoji 反應的廣泛程度：

| 等級          | Ack 反應 | 代理程式發起的反應 | 說明                           |
| ------------- | -------- | ------------------ | ------------------------------ |
| `"off"`       | 否       | 否                 | 完全沒有反應                   |
| `"ack"`       | 是       | 否                 | 僅 Ack 反應（回覆前收據）      |
| `"minimal"`   | 是       | 是（保守）         | Ack + 代理程式反應，採保守指引 |
| `"extensive"` | 是       | 是（鼓勵）         | Ack + 代理程式反應，採鼓勵指引 |

預設：`"minimal"`。

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

WhatsApp 透過 `channels.whatsapp.ackReaction` 支援在接收訊息時立即傳送 Ack 反應。
Ack 反應由 `reactionLevel` 控制 —— 當 `reactionLevel` 為 `"off"` 時，這些反應會被抑制。

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

- 在接收入站訊息後立即傳送（回覆前）
- 失敗會被記錄下來，但不會阻擋正常回覆的傳送
- 群組模式 `mentions` 會在提及觸發的輪次中做出反應；群組啟動 `always` 可作為此檢查的繞過機制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此處不使用舊版 `messages.ackReaction`）

## 多重帳戶與憑證

<AccordionGroup>
  <Accordion title="帳戶選擇與預設值">
    - 帳戶 ID 來自 `channels.whatsapp.accounts`
    - 預設帳戶選擇：如果存在則為 `default`，否則為第一個設定的帳戶 ID（已排序）
    - 帳戶 ID 在內部會被正規化以便查詢

  </Accordion>

  <Accordion title="憑證路徑與舊版相容性">
    - 目前驗證路徑：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 備份檔案：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的舊版預設驗證仍然會被識別/遷移，用於預設帳戶流程

  </Accordion>

  <Accordion title="登出行為">
    `openclaw channels logout --channel whatsapp [--account <id>]` 會清除該帳戶的 WhatsApp 驗證狀態。

    當 Gateway 可連線時，登出會先停止所選帳戶的即時 WhatsApp 監聽器，以便連結的會話在下次重啟之前不會繼續接收訊息。`openclaw channels remove --channel whatsapp` 在停用或刪除帳戶設定之前也會停止即時監聽器。

    在舊版驗證目錄中，`oauth.json` 會被保留，而 Baileys 驗證檔案會被移除。

  </Accordion>
</AccordionGroup>

## 工具、動作與設定寫入

- Agent 工具支援包括 WhatsApp 回應動作 (`react`)。
- 動作閘門：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道發起的設定寫入預設為啟用（透過 `channels.whatsapp.configWrites=false` 停用）。

## 疑難排解

<AccordionGroup>
  <Accordion title="未連結 (需要 QR Code)">
    症狀：通道狀態顯示未連結。

    解決方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已連結但斷線 / 重新連線迴圈">
    症狀：已連結的帳號出現重複斷線或嘗試重新連線的情況。

    安靜的帳號可以在正常訊息逾時後保持連線；當 WhatsApp Web 傳輸活動停止、socket 關閉，或應用層級活動在較長的安全視窗內保持靜默時，看門狗會重新啟動。

    如果日誌顯示重複的 `status=408 Request Time-out Connection was lost`，請調整 `web.whatsapp` 下的 Baileys socket 時序。首先將 `keepAliveIntervalMs` 縮短至低於您網路的閒置逾時，並在緩慢或易遺失的連線上增加 `connectTimeoutMs`：

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

    如果 `~/.openclaw/logs/whatsapp-health.log` 顯示 `Gateway inactive`，但 `openclaw gateway status` 和 `openclaw channels status --probe` 顯示閘道和 WhatsApp 均正常，請執行 `openclaw doctor`。在 Linux 上，doctor 會警告舊版的 crontab 項目仍然在呼叫 `~/.openclaw/bin/ensure-whatsapp.sh`；請使用 `crontab -e` 移除這些過時的項目，因為 cron 可能缺少 systemd user-bus 環境，導致該舊腳本錯誤回報閘道狀態。

    如果需要，請使用 `channels login` 重新連結。

  </Accordion>

  <Accordion title="QR 登入在 Proxy 後逾時">
    症狀：`openclaw channels login --channel whatsapp` 在顯示可用的 QR 碼之前失敗，並出現 `status=408 Request Time-out` 或 TLS socket 中斷連線。

    WhatsApp Web 登入使用閘道主機的標準 proxy 環境 (`HTTPS_PROXY`、`HTTP_PROXY`、小寫變體，以及 `NO_PROXY`)。請驗證閘道程序是否繼承了 proxy 環境，以及 `NO_PROXY` 是否不符合 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="發送時沒有作用中的聆聽器">
    當目標帳號沒有作用中的閘道聆聽器時，傳出訊息會快速失敗。

    請確保閘道正在執行，且帳號已連結。

  </Accordion>

  <Accordion title="回覆顯示在對話記錄中但未顯示在 WhatsApp">
    對話記錄行記錄了代理程式產生的內容。WhatsApp 的傳送狀態是分開檢查的：只有在 Baileys 針對至少一次可見的文字或多媒體傳送返回傳出訊息 ID 後，OpenClow 才會將自動回覆視為已傳送。

    Ack 反應是獨立的前置回覆收據。成功的反應並不能證明後續的文字或多媒體回覆已被 WhatsApp 接受。

    請檢查閘道日誌中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群組訊息意外被忽略">
    請依序檢查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允許清單項目
    - 提及閘控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重複鍵：後面的項目會覆蓋前面的項目，因此請在每個範圍內保持單一的 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 執行時期警告">
    WhatsApp 閘道執行時期應使用 Node。Bun 被標記為與穩定的 WhatsApp/Telegram 閘道操作不相容。
  </Accordion>
</AccordionGroup>

## 系統提示

WhatsApp 支援透過 `groups` 和 `direct` 映射，為群組和直接聊天使用 Telegram 風格的系統提示。

群組訊息的解析優先順序：

首先決定有效的 `groups` 映射：如果帳號定義了自己的 `groups`，它將完全取代根 `groups` 映射（不進行深度合併）。然後在產生的單一映射上執行提示查找：

1. **特定群組的系統提示**（`groups["<groupId>"].systemPrompt`）：當映射中存在特定群組項目**並且**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串（`""`），則會抑制萬用字元且不套用系統提示。
2. **群組萬用字元系統提示詞** (`groups["*"].systemPrompt`)：當對應表中完全缺少特定群組項目時使用，或者當該項目存在但未定義 `systemPrompt` 金鑰時使用。

直接訊息的解析層級：

首先會確定有效的 `direct` 對應表：如果帳號定義了自己的 `direct`，它將完全取代根層級的 `direct` 對應表（不進行深度合併）。然後會在產生的單一對應表上執行提示詞查詢：

1. **直接訊息專用系統提示詞** (`direct["<peerId>"].systemPrompt`)：當對應表中存在特定對等端項目 **且** 定義了其 `systemPrompt` 金鑰時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不套用任何系統提示詞。
2. **直接訊息萬用字元系統提示詞** (`direct["*"].systemPrompt`)：當對應表中完全缺少特定對等端項目時使用，或者當該項目存在但未定義 `systemPrompt` 金鑰時使用。

<Note>
`dms` 仍然是輕量級的每個直接訊息 (per-DM) 歷史覆寫儲存區 (`dms.<id>.historyLimit`)。提示詞覆寫位於 `direct` 之下。
</Note>

**與 Telegram 多帳號行為的差異：** 在 Telegram 中，對於多帳號設置中的所有帳號（甚至是那些未定義自己 `groups` 的帳號），會刻意抑制根層級 `groups`，以防止機器人接收其不屬於的群組的群組訊息。WhatsApp 不會套用此防護：對於未定義帳號層級覆寫的帳號，無論配置了多少個帳號，都會繼承根層級 `groups` 和根層級 `direct`。在多帳號 WhatsApp 設置中，如果您想要每個帳號的群組或直接訊息提示詞，請明確地在每個帳號下定義完整的對應表，而不是依賴根層級的預設值。

重要行為：

- `channels.whatsapp.groups` 既是每個群組的設定對應表，也是聊天層級的群組允許清單。無論是在根層級還是帳號範圍內，`groups["*"]` 都表示該範圍「允許所有群組」。
- 僅當您已經希望該範圍允許所有群組時，才添加萬用字元群組 `systemPrompt`。如果您仍然只希望一組固定的群組 ID 符合資格，請不要將 `groups["*"]` 用於提示詞預設值。相反，請在每個明確列入允許清單的群組項目上重複該提示詞。
- 群組准入和發送者授權是分開的檢查。`groups["*"]` 擴展了可以到達群組處理的群組集合，但它本身並不授權這些群組中的每個發送者。發送者存取權仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 分別控制。
- `channels.whatsapp.direct` 對於 DM（直接訊息）沒有相同的副作用。`direct["*"]` 僅在 DM 已透過 `dmPolicy` 加上 `allowFrom` 或配對存儲規則准入後，提供預設的直接聊天配置。

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

高信號 WhatsApp 欄位：

- 存取： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 傳遞： `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- 多帳號： `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帳號級別覆寫
- 操作： `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- 會話行為： `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- 提示詞： `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [多代理路由](/zh-Hant/concepts/multi-agent)
- [疑難排解](/zh-Hant/channels/troubleshooting)
