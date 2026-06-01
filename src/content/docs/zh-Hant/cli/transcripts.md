---
summary: "CLI 參考指南 `openclaw transcripts`（列出、顯示和定位已儲存的逐字稿）"
read_when:
  - You want to read stored transcript summaries from the terminal
  - You need the path to a transcripts markdown summary
  - You are debugging the core transcripts storage layout
title: "Transcripts CLI"
---

# `openclaw transcripts`

檢視由 OpenClaw 核心 `transcripts` 工具所寫入的逐字稿。此 CLI 為唯讀；擷取、匯入和摘要功能均由代理程式工具及設定的自動啟動來源負責。

當您想要尋找昨天的筆記、在編輯器中開啟 Markdown 檔案、將逐字稿提供給其他工具，或是偵錯會話儲存在磁碟上的位置時，請使用此 CLI。它不會啟動或停止擷取。

成品位於 OpenClaw 狀態目錄下：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

預設狀態目錄為 `~/.openclaw`；請設定 `OPENCLAW_STATE_DIR` 以使用不同的目錄。日期目錄來自會話開始時間，而會話目錄則是從會話 ID 衍生而來的安全檔案系統片段。

## 指令

```bash
openclaw transcripts list
openclaw transcripts show <session>
openclaw transcripts show YYYY-MM-DD/<session>
openclaw transcripts path <session>
openclaw transcripts path YYYY-MM-DD/<session>
openclaw transcripts path <session> --dir
openclaw transcripts path <session> --metadata
openclaw transcripts path <session> --transcript
openclaw transcripts list --json
openclaw transcripts show <session> --json
openclaw transcripts path <session> --json
```

- `list`：列出已儲存的會話、日期限定選擇器、開始時間、標題和 `summary.md` 路徑。
- `show <session>`：列印已儲存的 `summary.md`。
- `path <session>`：列印 `summary.md` 路徑。
- `path <session> --dir`：列印會話目錄。
- `path <session> --metadata`：列印 `metadata.json`。
- `path <session> --transcript`：列印 `transcript.jsonl`。
- `--json`：列印機器可讀輸出。

當人類可讀的會話 ID 在數日間重複出現時，請使用 `list` 中的日期限定選擇器，例如 `openclaw transcripts show 2026-05-22/standup`。預設會話 ID 包含時間戳記和隨機後綴；僅當固定會話 ID 在當日內唯一時才加以設定。

## 輸出

`list` 每行列印一個會話：

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/transcripts/2026-05-22/standup/summary.md
```

輸出內容以 Tab 字元分隔。欄位依序為選擇器、開始時間、標題和摘要路徑。選擇器是回傳給 `show` 或 `path` 時最安全的值。

`list --json` 列印包含以下內容的物件：

- `sessionId`
- `selector`
- `date`
- `title`
- `startedAt`
- `stoppedAt`
- `source`
- `path`
- `summaryPath`
- `hasSummary`

`show --json` 會傳回儲存的 session 中繼資料、選擇器、session 目錄、摘要路徑以及摘要 Markdown 文字。`path --json` 會傳回選取的路徑以及該檔案是否存在。

## 每天多次會議

Transcripts 會依照日期，然後依照 session ID 來將 sessions 分組。一天內的十場會議會變成十個同層級資料夾：

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

對於大多數的自動化，請使用預設產生的 IDs。僅當同一個 ID 在同一天內不會被重複使用時，才使用固定的 ID，例如 `standup`。

## 缺少摘要

即時 sessions 會在 session 停止時寫入 `summary.md`。匯入的 transcripts 會在匯入後立即寫入 `summary.md`。當擷取功能正在運作、提供者在停止期間失敗，或是在任何語句到達前就已寫入中繼資料時，session 仍可能出現在 `list` 中而沒有摘要。

使用 `path <session> --transcript` 來檢查僅附加的 transcript，並使用 `transcripts` 工具動作 `summarize` 來重新產生 Markdown 摘要。

## 設定

Transcript 擷取功能是選擇加入的，因為即時來源可以加入並錄製會議音訊。請使用頂層 `transcripts.enabled` 來啟用此工具：

```json
{
  "transcripts": {
    "enabled": true,
    "maxUtterances": 2000
  }
}
```

請在 `openclaw.json` 中使用 `transcripts.autoStart` 來設定自動啟動來源。只要項目存在就會啟用；省略某個項目即可停用該來源。

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "guildId": "1234567890",
        "channelId": "2345678901"
      },
      {
        "providerId": "slack-huddle",
        "accountId": "workspace",
        "channelId": "C123"
      }
    ]
  }
}
```
