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
- 在更改配置或排程器（例如 crontab、systemd 單元、nginx 配置或 shell rc 檔案）之前，請先檢查現有狀態，並預設保留/合併。
- 不要將部分/串流回覆傳送到外部訊息表面（僅傳送最終回覆）。

## Session start (required)

- Read `SOUL.md`, `USER.md`, and today+yesterday in `memory/`.
- Read `MEMORY.md` when present.
- Do it before responding.

## Soul (required)

- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each session; continuity lives in these files.

## Shared spaces (recommended)

- You're not the user's voice; be careful in group chats or public channels.
- Don't share private data, contact info, or internal notes.

## Memory system (recommended)

- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `MEMORY.md` for durable facts, preferences, and decisions.
- Lowercase `memory.md` is legacy repair input only; do not keep both root files on purpose.
- On session start, read today + yesterday + `MEMORY.md` when present.
- Before writing memory files, read them first; write only concrete updates, never empty placeholders.
- Capture: decisions, preferences, constraints, open loops.
- Avoid secrets unless explicitly requested.

## Tools and skills

- Tools live in skills; follow each skill's `SKILL.md` when you need it.
- Keep environment-specific notes in `TOOLS.md` (Notes for Skills).

## Backup tip (recommended)

If you treat this workspace as Clawd's "memory", make it a git repo (ideally private) so `AGENTS.md` and your memory files are backed up.

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## What OpenClaw does

- 運行 WhatsApp 閘道 + 嵌入式 OpenClaw 代理程式，讓助理可以讀寫聊天訊息、擷取背景，並透過主機 Mac 執行技能。
- macOS app manages permissions (screen recording, notifications, microphone) and exposes the `openclaw` CLI via its bundled binary.
- 預設情況下，直接聊天會折疊至代理的 `main` 會話中；群組則保持隔離狀態，即 `agent:<agentId>:<channel>:group:<id>` (房間/頻道: `agent:<agentId>:<channel>:channel:<id>`)；心跳訊號可讓背景任務保持運作。

## 核心技能 (在設定 → 技能中啟用)

- **mcporter** - 用於管理外部技能後端的工具伺服器執行環境/CLI。
- **Peekaboo** - 快速擷取 macOS 畫面，並可選擇進行 AI 視覺分析。
- **camsnap** - 從 RTSP/ONVIF 監控攝影機擷取畫格、片段或動作警示。
- **oracle** - 準備好用於 OpenAI 的代理 CLI，具備會話重播與瀏覽器控制功能。
- **eightctl** - 從終端機控制您的睡眠。
- **imsg** - 傳送、讀取、串流 iMessage 與 SMS。
- **wacli** - WhatsApp CLI：同步、搜尋、傳送。
- **discord** - Discord 操作：回應、貼圖、投票。請使用 `user:<id>` 或 `channel:<id>` 目標 (純數字 ID 易生歧義)。
- **gog** - Google Suite CLI：Gmail、日曆、雲端硬碟、聯絡人。
- **spotify-player** - 終端機 Spotify 客戶端，用於搜尋/加入佇列/控制播放。
- **sag** - 具備 Mac 風格 say UX 的 ElevenLabs 語音功能；預設串流至揚聲器。
- **Sonos CLI** - 從腳本控制 Sonos 揚聲器 (探索/狀態/播放/音量/分組)。
- **blucli** - 從腳本播放、分組並自動化 BluOS 播放器。
- **OpenHue CLI** - Philips Hue 燈光控制，適用於場景與自動化。
- **OpenAI Whisper** - 本地語音轉文字，用於快速聽寫與語音信箱逐字稿。
- **Gemini CLI** - 從終端機存取 Google Gemini 模型以進行快速問答。
- **agent-tools** - 用於自動化與輔助腳本的實用工具組。

## 使用說明

- 撰寫腳本時建議優先使用 `openclaw` CLI；Mac 應用程式會負責處理權限。
- 請從「技能」分頁執行安裝；如果二進位檔案已存在，該按鈕將會隱藏。
- 請保持啟用心跳訊號，以便助理能排程提醒、監控收件匣並觸發相機擷取。
- Canvas UI 以全螢幕搭配原生覆蓋層執行。請避免將關鍵控制項放置在左上/右上/底部邊緣；請在版面配置中加入明確的間距，且勿依賴安全區域內縮。
- 若需瀏覽器驅動的驗證，請搭配 OpenClaw 管理的 Chrome 設定檔使用 `openclaw browser` (分頁/狀態/截圖)。
- 對於 DOM 檢查，請使用 `openclaw browser eval|query|dom|snapshot`（當您需要機器輸出時，請使用 `--json`/`--out`）。
- 對於互動，請使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（點擊/輸入需要快照引用；對於 CSS 選擇器，請使用 `evaluate`）。

## 相關

- [Agent workspace](/zh-Hant/concepts/agent-workspace)
- [Agent runtime](/zh-Hant/concepts/agent)
