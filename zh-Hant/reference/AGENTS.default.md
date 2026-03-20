---
title: "Default AGENTS.md"
summary: "Default OpenClaw agent instructions and skills roster for the personal assistant setup"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md - OpenClaw Personal Assistant (default)

## First run (recommended)

OpenClaw uses a dedicated workspace directory for the agent. Default: `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

1. Create the workspace (if it doesn’t already exist):

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copy the default workspace templates into the workspace:

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Optional: if you want the personal assistant skill roster, replace AGENTS.md with this file:

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optional: choose a different workspace by setting `agents.defaults.workspace` (supports `~`):

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Safety defaults

- Don’t dump directories or secrets into chat.
- Don’t run destructive commands unless explicitly asked.
- Don’t send partial/streaming replies to external messaging surfaces (only final replies).

## Session start (required)

- Read `SOUL.md`, `USER.md`, and today+yesterday in `memory/`.
- Read `MEMORY.md` when present; only fall back to lowercase `memory.md` when `MEMORY.md` is absent.
- Do it before responding.

## Soul (required)

- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each session; continuity lives in these files.

## Shared spaces (recommended)

- You’re not the user’s voice; be careful in group chats or public channels.
- Don’t share private data, contact info, or internal notes.

## Memory system (recommended)

- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `MEMORY.md` for durable facts, preferences, and decisions.
- Lowercase `memory.md` is legacy fallback only; do not keep both root files on purpose.
- On session start, read today + yesterday + `MEMORY.md` when present, otherwise `memory.md`.
- 記錄：決策、偏好、約束、待辦事項。
- 除非明確要求，否則避免記錄秘密。

## 工具與技能

- 工具內建於技能中；需要時請遵循各個技能的 `SKILL.md`。
- 將環境特定的說明保留在 `TOOLS.md`（技能說明）中。

## 備份提示（建議）

如果您將此工作區視為 Clawd 的「記憶」，請將其設為 git 儲存庫（最好為私有的），以便 `AGENTS.md` 和您的記憶檔案都能備份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 執行 WhatsApp 閘道 + Pi 編碼代理，讓助理可以讀取/寫入聊天、獲取上下文，並透過主機 Mac 執行技能。
- macOS 應用程式管理權限（螢幕錄製、通知、麥克風），並透過其內建的二進位檔暴露 `openclaw` CLI。
- 私人聊天預設會合併到代理的 `main` 會話中；群組則保持隔離為 `agent:<agentId>:<channel>:group:<id>`（房間/頻道：`agent:<agentId>:<channel>:channel:<id>`）；心跳訊號保持背景任務運作。

## 核心技能（在設定 → 技能中啟用）

- **mcporter** — 用於管理外部技能後端的工具伺服器執行時/CLI。
- **Peekaboo** — 快速的 macOS 螢幕截圖，並可選擇 AI 視覺分析。
- **camsnap** — 從 RTSP/ONVIF 監控攝影機擷取影格、片段或動作警報。
- **oracle** — 準備好使用 OpenAI 的代理 CLI，具有會話重播和瀏覽器控制功能。
- **eightctl** — 從終端機控制您的睡眠。
- **imsg** — 傳送、讀取、串流 iMessage 和 SMS。
- **wacli** — WhatsApp CLI：同步、搜尋、傳送。
- **discord** — Discord 操作：回應、貼圖、投票。使用 `user:<id>` 或 `channel:<id>` 目標（純數字 id 有歧義）。
- **gog** — Google Suite CLI：Gmail、日曆、雲端硬碟、聯絡人。
- **spotify-player** — 終端機 Spotify 用戶端，用於搜尋/加入佇列/控制播放。
- **sag** — ElevenLabs 語音，具有 Mac 風格的說出 UX；預設串流到揚聲器。
- **Sonos CLI** — 從腳本控制 Sonos 揚聲器（發現/狀態/播放/音量/分組）。
- **blucli** — 從腳本播放、分組和自動化 BluOS 播放器。
- **OpenHue CLI** — Philips Hue 照明控制，用於場景和自動化。
- **OpenAI Whisper** — 本地語音轉文字，用於快速聽寫和語音信箱轉錄。
- **Gemini CLI** — 終端機中的 Google Gemini 模型，用於快速問答。
- **agent-tools** — 用於自動化和輔助程式碼的實用工具套件。

## 使用說明

- 腳本撰寫請優先使用 `openclaw` CLI；mac 應用程式負責處理權限。
- 從「技能」分頁執行安裝；如果二進位檔案已存在，按鈕會隱藏。
- 保持啟用心跳訊號，以便助理能排程提醒、監控收件匣並觸發相機擷取。
- Canvas UI 以全螢幕模式執行並配有原生覆蓋層。請避免將關鍵控制項放置在左上角/右上角/底部邊緣；在佈局中加入明確的間隙，並不要依賴安全區域內縮。
- 對於瀏覽器驅動的驗證，請使用 `openclaw browser` (分頁/狀態/螢幕擷圖) 搭配 OpenClaw 管理的 Chrome 設定檔。
- 對於 DOM 檢查，請使用 `openclaw browser eval|query|dom|snapshot` (當您需要機器輸出時，則使用 `--json`/`--out`)。
- 對於互動操作，請使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (點擊/輸入需要快照參照；CSS 選擇器請使用 `evaluate`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
