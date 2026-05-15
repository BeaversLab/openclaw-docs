---
summary: "預設的 OpenClaw 代理程式指令與個人助理設置技能清單"
title: "預設 AGENTS.md"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

## 首次執行（推薦）"

OpenClaw 為代理使用專用的工作區目錄。預設值：`~/.openclaw/workspace`（可透過 `agents.defaults.workspace` 配置）。

1. 建立工作區（如果尚未存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 將預設工作區範本複製到工作區中：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可選：如果您想要個人助理技能名單，請用此檔案替換 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可選：透過設定 `agents.defaults.workspace` 來選擇不同的工作區（支援 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全預設值

- 不要將目錄或機密傾倒到聊天中。
- 除非明確要求，否則不要執行破壞性指令。
- 不要將部分/串流回覆發送到外部訊息表面（僅發送最終回覆）。

## 會話開始（必需）

- 閱讀 `SOUL.md`、`USER.md` 以及 `memory/` 中的今天和昨天。
- 當存在時，閱讀 `MEMORY.md`。
- 在回應之前執行此操作。

## 靈魂（必需）

- `SOUL.md` 定義了身份、語氣和邊界。請保持其為最新狀態。
- 如果您變更了 `SOUL.md`，請告知使用者。
- 您在每個會話中都是一個全新的實例；連續性存在於這些檔案中。

## 共享空間（推薦）

- 您不是使用者的聲音；在群組聊天或公開頻道中請小心。
- 不要分享私人資料、聯絡資訊或內部備註。

## 記憶系統（推薦）

- 每日日誌：`memory/YYYY-MM-DD.md`（如果需要，建立 `memory/`）。
- 長期記憶：`MEMORY.md` 用於持久的事實、偏好和決策。
- 小寫 `memory.md` 僅用於舊版修復輸入；請勿故意同時保留這兩個根檔案。
- 會話開始時，閱讀今天 + 昨天 + 存在時的 `MEMORY.md`。
- 擷取：決策、偏好、約束、未結事項。
- 除非明確要求，否則避免記錄機密。

## 工具和技能

- 工具存在於技能中；當您需要時，請遵循每個技能的 `SKILL.md`。
- 將特定於環境的筆記保留在 `TOOLS.md`（技能筆記）中。

## 備份提示（推薦）

如果您將此工作區視為 Clawd 的「記憶」，請將其設為 git 儲存庫（最好為私有的），以便 `AGENTS.md` 和您的記憶檔案都能備份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 執行 WhatsApp 閘道 + Pi 編碼代理程式，讓助理可以讀取/寫入聊天記錄、擷取上下文，並透過主機 Mac 執行技能。
- macOS 應用程式管理權限（螢幕錄製、通知、麥克風），並透過其內建的二進位檔公開 `openclaw` CLI。
- 直接聊天預設會合併到代理程式的 `main` 工作階段中；群組則保持隔離為 `agent:<agentId>:<channel>:group:<id>` (房間/頻道：`agent:<agentId>:<channel>:channel:<id>`)；心跳訊號讓背景任務保持運作。

## 核心技能（在 Settings → Skills 中啟用）

- **mcporter** - 用於管理外部技能後端的工具伺服器執行環境/CLI。
- **Peekaboo** - 快速的 macOS 螢幕截圖，並可選擇進行 AI 視覺分析。
- **camsnap** - 從 RTSP/ONVIF 監控攝影機擷取影格、片段或動作警報。
- **oracle** - 準備好與 OpenAI 搭配使用的代理程式 CLI，具有工作階段重播和瀏覽器控制功能。
- **eightctl** - 從終端機控制您的睡眠。
- **imsg** - 傳送、讀取、串流 iMessage 和 SMS。
- **wacli** - WhatsApp CLI：同步、搜尋、傳送。
- **discord** - Discord 操作：回應、貼圖、投票。使用 `user:<id>` 或 `channel:<id>` 目標（純數字 ID 會有歧義）。
- **gog** - Google Suite CLI：Gmail、日曆、雲端硬碟、聯絡人。
- **spotify-player** - 終端機 Spotify 用戶端，用於搜尋/加入佇列/控制播放。
- **sag** - ElevenLabs 語音，具備 mac 風格的 say UX；預設串流到喇叭。
- **Sonos CLI** - 從腳本控制 Sonos 喇叭（探索/狀態/播放/音量/群組）。
- **blucli** - 從腳本播放、分組和自動化 BluOS 播放器。
- **OpenHue CLI** - Philips Hue 燈光控制，用於場景和自動化。
- **OpenAI Whisper** - 本地語音轉文字，用於快速聽寫和語音信箱逐字稿。
- **Gemini CLI** - 從終端機使用 Google Gemini 模型進行快速問答。
- **agent-tools** - 用於自動化和輔助腳本的實用工具組。

## 使用說明

- 撰寫腳本時建議使用 `openclaw` CLI；mac 應用程式會處理權限。
- 從 Skills 分頁執行安裝；如果二進位檔已存在，它會隱藏按鈕。
- 保持啟用心跳，以便助理能夠排程提醒、監控收件匣並觸發相機擷取。
- Canvas UI 以全螢幕模式運行並搭配原生覆蓋層。請避免在左上角/右上角/底部邊緣放置關鍵控制項；在佈局中加入明確的間距，並且不要依賴安全區域內插距。
- 對於瀏覽器驅動的驗證，請使用 `openclaw browser` (分頁/狀態/擷圖) 並搭配 OpenClaw 管理的 Chrome 設定檔。
- 對於 DOM 檢查，請使用 `openclaw browser eval|query|dom|snapshot` (當您需要機器輸出時，則使用 `--json`/`--out`)。
- 對於互動操作，請使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (點擊/輸入需要快照參照；針對 CSS 選擇器請使用 `evaluate`)。

## 相關

- [Agent workspace](/zh-Hant/concepts/agent-workspace)
- [Agent runtime](/zh-Hant/concepts/agent)
