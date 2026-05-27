---
summary: "CLI 參考手冊 `openclaw meeting-notes`（列出、顯示及定位儲存的會議紀錄）"
read_when:
  - You want to read stored meeting note summaries from the terminal
  - You need the path to a meeting notes markdown summary
  - You are debugging the meeting-notes plugin storage layout
title: "會議紀錄 CLI"
---

# `openclaw meeting-notes`

檢視由外部 `meeting-notes` 外掛程式所撰寫的會議紀錄。此 CLI
是唯讀的，並在該外掛程式安裝或從來源載入時
可供使用。擷取、匯入和摘要是由 `meeting_notes`
代理程式工具以及設定的自動啟動來源所負責。

當您想要尋找昨天的紀錄、在編輯器中開啟
Markdown 檔案、將逐字稿傳送給其他工具，或除錯工作階段儲存在
磁碟上的位置時，請使用此 CLI。它不會啟動或停止擷取。

成品存放於 OpenClaw 狀態目錄下：

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

預設的狀態目錄是 `~/.openclaw`；請設定 `OPENCLAW_STATE_DIR` 以使用
不同的目錄。日期目錄來自工作階段開始時間，而
工作階段目錄是衍生自工作階段 ID 的安全檔案系統區段。

## 指令

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes show YYYY-MM-DD/<session>
openclaw meeting-notes path <session>
openclaw meeting-notes path YYYY-MM-DD/<session>
openclaw meeting-notes path <session> --dir
openclaw meeting-notes path <session> --metadata
openclaw meeting-notes path <session> --transcript
openclaw meeting-notes list --json
openclaw meeting-notes show <session> --json
openclaw meeting-notes path <session> --json
```

- `list`：列出儲存的工作階段、日期限定選擇器、開始時間、標題和 `summary.md` 路徑。
- `show <session>`：列印儲存的 `summary.md`。
- `path <session>`：列印 `summary.md` 路徑。
- `path <session> --dir`：列印工作階段目錄。
- `path <session> --metadata`：列印 `metadata.json`。
- `path <session> --transcript`：列印 `transcript.jsonl`。
- `--json`：列印機器可讀的輸出。

當人類可讀的工作階段 ID 在數日間重複出現時，請使用來自
`list` 的日期限定選擇器，例如 `openclaw meeting-notes show 2026-05-22/standup`。
預設的工作階段 ID 包含時間戳記和隨機後綴；僅當固定的工作階段 ID
在當日內是唯一時才加以設定。

## 輸出

`list` 每行列出一個工作階段：

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/meeting-notes/2026-05-22/standup/summary.md
```

輸出是以 Tab 分隔。欄位為選擇器、開始時間、標題和
摘要路徑。選擇器是傳回給 `show` 或 `path` 時最安全的值。

`list --json` 會印出具有以下內容的物件：

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

`show --json` 會傳回儲存的會話元資料、選擇器、會話目錄、摘要路徑以及摘要 Markdown 文字。`path --json` 會傳回選取的路徑以及該檔案是否存在。

## 一天多場會議

會議記錄會先依日期將會話分組，然後依會話 ID 分組。一天內的十場會議會變成十個同層級資料夾：

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

對於大部分自動化作業，請使用預設產生的 ID。僅當同一 ID 在同一天內不會被使用兩次時，才應使用固定 ID（例如 `standup`）。

## 缺少摘要

即時會話會在會話停止時寫入 `summary.md`。匯入的逐字稿會在匯入後立即寫入 `summary.md`。當擷取功能處於啟用狀態、提供者在停止期間失敗，或在任何語句到達前就已寫入元資料時，會話仍可能出現在 `list` 中但沒有摘要。

請使用 `path <session> --transcript` 來檢查僅限附加的逐字稿，並使用 `meeting_notes` 工具動作 `summarize` 來重新產生 Markdown 摘要。

請參閱 [會議記錄](/zh-Hant/plugins/meeting-notes) 以了解設定、自動啟動和來源提供者的詳細資訊。
