---
summary: "Meeting Notes 外掛程式：從 Discord 語音和匯入的會議來源擷取逐字稿，然後撰寫摘要"
read_when:
  - You want OpenClaw to take meeting notes
  - You are wiring Discord voice, Google Meet, Slack huddles, or another meeting source into notes
  - You need the meeting_notes tool contract
title: "Meeting Notes 外掛程式"
---

Meeting Notes 外掛程式是即時通話和匯入的會議逐字稿的通用筆記層。它負責逐字稿儲存、摘要轉譯以及 `meeting_notes` 工具。頻道外掛程式負責擷取、驗證和平台特定的會議加入。

當您希望 OpenClaw 今天擷取 Discord 語音筆記、從其他會議系統匯入逐字稿，或當您正在建置 Google Meet、Slack huddle、Zoom 或日曆擁有的來源提供者時，請使用此頁面。

## 來源模型

會議來源透過外掛程式 SDK 註冊 `meetingNotesSourceProviders`。
第一個即時提供者是 `discord-voice`；內建的 `manual-transcript`
提供者會匯入會議後的逐字稿。

- `live-audio`：來源加入或接聽通話，並串流最終的發言內容。
- `live-caption`：來源從瀏覽器或會議介面讀取字幕。
- `posthoc-transcript`：來源在會議後匯入逐字稿或筆記構件。
- `recording-stt`：來源在匯入發言內容之前將錄音轉錄為文字。

這使得 Discord、Google Meet、Slack huddles 和未來的會議介面遠離筆記引擎。每個來源提供標記說話者的發言內容；Meeting Notes 則撰寫構件和摘要。

## 安裝並啟用

Meeting Notes 是此儲存庫中的外部來源外掛程式。它不是核心 OpenClaw npm 套件的一部分，只有當外掛程式作為外掛程式安裝或從包含
`extensions/meeting-notes` 的來源检出載入時，才會變成可用狀態。

載入外掛程式後，除非以下設定之一封鎖它，否則預設為啟用：

- `plugins.enabled: false` 會停用所有外掛程式。
- `plugins.deny` 包含 `meeting-notes`。
- `plugins.allow` 已設定且不包含 `meeting-notes`。
- `plugins.entries.meeting-notes.enabled: false` 會停用此外掛程式項目。
- `plugins.entries.meeting-notes.config.enabled: false` 會讓外掛保持載入
  但會停用 `meeting_notes` 工具與自動啟動服務。

一般的使用者設定檔是 `~/.openclaw/openclaw.json`。`plugins`
區段控制外掛載入，而巢狀的 `entries.<pluginId>.config`
物件會當作外掛專屬設定傳給該外掛。預期在 `meeting-notes`
下會有一個獨立的 `config: { ... }` 區塊；這是外掛在不新增核心設定鍵的情況下接收自身選項的方式。

當您的設定有外掛允許清單時，請使用此格式：

```json5
{
  plugins: {
    allow: ["discord", "meeting-notes"],
    entries: {
      "meeting-notes": {
        enabled: true,
        config: {
          enabled: true,
          maxUtterances: 2000,
          autoStart: [],
        },
      },
    },
  },
}
```

編輯後請執行設定檢查：

```bash
openclaw config validate
```

Gateway 設定熱重新載入會套用外掛允許清單與外掛項目的變更。
如果您同時在變更來源外掛本身、安裝
新外掛檔案，或變更 Discord 語音憑證，請重新啟動 Gateway。

## 設定

Meeting Notes 有三個外掛設定欄位：

- `enabled`：預設為 `true`。設定 `false` 可保留外掛已安裝但
  停用工具與自動啟動服務。
- `maxUtterances`：預設為 `2000`。摘要生成僅會讀取
  `transcript.jsonl` 中最新的 N 個發言；有效值會限制在 `1` 至
  `10000` 之間。
- `autoStart`：預設為空。當 Gateway 啟動或重新載入外掛時，每個項目都會啟動一個即時筆記來源。

`autoStart` 項目接受：

- `providerId`：必要。Discord 語音請使用 `discord-voice`。
- `enabled`：選用，預設為 `true`。設定 `false` 可保留項目而不啟動它。
- `sessionId`：選用。若省略，OpenClaw 會產生帶時間戳記的 ID。
- `title`：用於摘要與 CLI 輸出的選用人類可讀標題。
- `accountId`：當存在多個帳號時的選用來源帳號 ID。
- `guildId`：供應商特定的 Discord 公會 ID。
- `channelId`：特定於提供者的 Discord 語音頻道 ID。
- `meetingUrl`：瀏覽器或行事曆來源的特定提供者會議 URL。

當 OpenClaw 應在閘道啟動時自動開始擷取筆記時，請使用 `autoStart`：

```json5
{
  plugins: {
    entries: {
      "meeting-notes": {
        config: {
          autoStart: [
            {
              providerId: "discord-voice",
              guildId: "123",
              channelId: "456",
              title: "Weekly planning",
            },
          ],
        },
      },
    },
  },
}
```

自動啟動會以五秒延遲重試啟動失敗最多 12 次。這讓筆記服務能夠等待 Discord 等頻道外掛程式完成初始化。當外掛程式服務乾淨地停止時，由自動啟動開始的會議將會停止並產生摘要。

Discord 語音擷取仍然需要正常的 Discord 語音設定和權限。請參閱 [Discord voice](/zh-Hant/channels/discord#voice-mode)。

## Discord 語音

Discord 是第一個即時來源。Discord 外掛程式擁有語音連線、說話者偵測、音訊解碼和轉錄。Meeting Notes 接收最終標記說話者的語句並將其保存。

對於 Discord 即時擷取：

- 先啟用並設定 Discord 外掛程式。
- 設定 Discord 語音模式，以便 OpenClaw 可以加入目標語音頻道。
- 使用 `providerId: "discord-voice"`。
- 提供 `guildId` 和 `channelId`。
- 僅當您執行多個 Discord 帳號時，才新增 `accountId`。

轉錄模型不是由 Meeting Notes 選擇的。在 Discord `stt-tts` 語音模式中，STT 使用 `tools.media.audio`；`voice.model` 控制代理程式回覆模型，而非轉錄。在即時語音模式中，轉錄會遵循設定的即時提供者和模型。如需目前的 Discord 語音模型和提供者控制項，請參閱 [Discord voice](/zh-Hant/channels/discord#voice-mode)。

## Google Meet、Slack huddles 和其他來源

Meeting Notes 有意設計為來源中立。Google Meet、Slack huddles、Zoom、行事曆錄音或瀏覽器字幕擷取應該是向外掛程式 SDK 註冊的獨立來源提供者。

推薦的來源選擇：

- Google Meet 即時瀏覽器/字幕支援：實作一個接受 `meetingUrl` 並發出最終字幕語句的 `live-caption` 提供者。
- Google Meet 錄製或下載的文字記錄：實作
  `posthoc-transcript` 或使用 `manual-transcript` 直到存在提供者為止。
- Slack huddles 目前：匯入會議後的 huddle 註記或文字記錄成品。
  Slack 未公開一般機器人加入即時 huddle 音訊的 API。
- Slack huddles 未來：讓 Slack 擁有的來源提供者負責
  Slack 驗證、成品查詢和文字記錄正規化。

註記引擎不應包含平台加入、瀏覽器自動化、Slack
API 輪詢或 Discord 語音邏輯。這些屬於擁有的來源外掛程式。

## 工具

搭配 `action` 使用 `meeting_notes`：

- `status`：列出已註冊的提供者和作用中工作階段。
- `start`：啟動即時註記工作階段。
- `stop`：停止即時工作階段並寫入 `summary.md`。
- `import`：匯入文字記錄並寫入 `summary.md`。
- `summarize`：為現有工作階段重新產生摘要。

Discord 即時註記需要 `providerId: "discord-voice"`，加上 `guildId` 和
`channelId`。當只有一個 Discord 帳號作用中時，`accountId` 為選用。

```json
{
  "action": "start",
  "providerId": "discord-voice",
  "guildId": "123",
  "channelId": "456",
  "title": "Weekly planning"
}
```

依工作階段 ID 停止：

```json
{
  "action": "stop",
  "sessionId": "meeting-2026-05-22T10-00-00-000Z-a1b2c3d4"
}
```

匯入文字記錄：

```json
{
  "action": "import",
  "providerId": "manual-transcript",
  "title": "Design review",
  "transcript": "Alex: We decided to ship the Discord source first.\nSam: Action item: add Slack huddle import later."
}
```

`manual-transcript` 將純文字記錄文字分割為發言。將其用於
複製的 Google Meet 註記、Slack huddle 摘要、行事曆文字記錄，或任何
已產生文字的來源。

## 儲存配置

成品儲存在 OpenClaw 狀態目錄下：

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

如果未設定 `OPENCLAW_STATE_DIR`，預設狀態目錄為
`~/.openclaw`。因此，一般的本機安裝會在
`~/.openclaw/meeting-notes/...` 下寫入註記。

每個檔案有一項工作：

- `metadata.json`：工作階段 ID、來源提供者、標題、開始時間、停止時間
  和提供者中繼資料。
- `transcript.jsonl`：僅附加的發言者發言。每一行是一個 JSON
  物件，包含發言文字和工作階段 ID。
- `summary.json`：工具使用的結構化摘要資料，包括
  用於產生摘要的發言者標記文字記錄視窗。
- `summary.md`：適用於終端機、編輯器和文件工作流程的
  人类可讀筆記，包括帶有發言者標記的逐字稿部分。

日期目錄來自會話開始時間，因此一天內的多次會議會保持分組。如果人工會話 ID 在數天內重複，請使用
來自 `openclaw meeting-notes list` 的日期限定選擇器，例如
`2026-05-22/standup`。

默認情況下，OpenClaw 會生成帶有時間戳的會話 ID：

```text
meeting-2026-05-22T10-00-00-000Z-a1b2c3d4
```

這意味著同一天的十次會議會成為十個同級目錄：

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  meeting-2026-05-22T13-00-00-000Z-c3d4e5f6/
```

僅當該 ID 在一天中是唯一時，才配置 `sessionId`。諸如
`standup` 之類的人工 ID 適用於每天一次的定期會議。如果同一 ID 出現在
多天，請在 CLI 中使用日期限定選擇器。

## CLI 存取

使用唯讀 CLI 來尋找或列印儲存的摘要：

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes path <session>
openclaw meeting-notes path <session> --transcript
```

請參閱 [Meeting Notes CLI](/zh-Hant/cli/meeting-notes) 以取得完整的指令參考。

## 長時間會議

對於長時間會議，話語會在到達時附加到 `transcript.jsonl`。
摘要生成會讀取由
`plugins.entries.meeting-notes.config.maxUtterances` 控制的受限視窗（預設值：`2000`），因此
數小時的通話不需要無限制的摘要記憶體。

這意味著逐字稿可以繼續在磁碟上增長，而摘要生成則保持
受限。當您需要更多多小時會議的內容以包含在
生成的摘要和帶有發言者標記的逐字稿部分時，請增加 `maxUtterances`。當
摘要太慢或太大時，請減少它。

當會話停止、匯入之後，或當執行
`summarize` 動作時，會生成當前摘要。它們不會針對每句
話語連續重寫。

## 疑難排解

### `meeting_notes` 遺失

請檢查外掛程式是否已安裝或從原始碼載入，以及外掛程式
載入是否未將其排除：

```bash
openclaw config validate
openclaw meeting-notes list
```

如果設定了 `plugins.allow`，則必須包含 `meeting-notes`。如果 `plugins.deny`
包含 `meeting-notes`，請將其移除。

### 自動啟動無法加入 Discord

確認 `autoStart` 項目使用 `providerId: "discord-voice"` 且包含
`guildId` 和 `channelId` 兩者。如果您執行多個 Discord 帳號，請包含
`accountId`。同時透過 Discord 語音指令加入相同的語音頻道，以驗證 Discord 語音在 Meeting Notes 之外正常運作。

### 摘要遺失

即時會話在停止時會寫入 `summary.md`。使用
`meeting_notes` 動作 `stop` 停止會話，然後檢查它：

```bash
openclaw meeting-notes list
openclaw meeting-notes path <session>
```

使用 `meeting_notes` 動作 `summarize` 為現有的
儲存會話重新生成 `summary.md`。

### 選擇器模稜兩可

如果您重複使用了人類可讀的會話 ID（例如 `standup`），請使用 `openclaw meeting-notes list` 顯示的日期限定選擇器：

```bash
openclaw meeting-notes show 2026-05-22/standup
```

## 相關

- [Meeting Notes CLI](/zh-Hant/cli/meeting-notes)
- [Discord 語音](/zh-Hant/channels/discord#voice-mode)
- [外掛程式管理](/zh-Hant/tools/plugin)
- [外掛程式架構](/zh-Hant/plugins/architecture)
