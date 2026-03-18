---
title: "預設 AGENTS.md"
summary: "個人助理設定的預設 OpenClaw 代理指令和技能清單"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md — OpenClaw 個人助理（預設）

## 首次執行（建議）

OpenClaw 會使用專用的工作目錄給代理。預設值：`~/.openclaw/workspace`（可透過 `agents.defaults.workspace` 設定）。

1. 建立工作區（如果尚未存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 將預設的工作區範本複製到工作區中：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 選用：如果您想要個人助理技能清單，請用此檔案取代 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 選用：透過設定 `agents.defaults.workspace` 來選擇不同的工作區（支援 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全性預設值

- 不要將目錄或機密傾倒到聊天中。
- 除非明確要求，否則不要執行破壞性指令。
- 不要將部分/串流回覆傳送到外部傳訊介面（僅限最終回覆）。

## 會話啟動（必要）

- 讀取 `SOUL.md`、`USER.md` 以及 `memory/` 中的今天+昨天。
- 當存在時讀取 `MEMORY.md`；僅在 `MEMORY.md` 不存在時退回至小寫 `memory.md`。
- 在回應之前執行此動作。

## 靈魂（必要）

- `SOUL.md` 定義了身分、語氣和界線。請保持最新狀態。
- 如果您變更了 `SOUL.md`，請告知使用者。
- 您在每次會話中都是一個全新的實例；連續性存在於這些檔案中。

## 共享空間（建議）

- 您不是使用者的聲音；在群組聊天或公開頻道中請小心。
- 不要分享私人資料、聯絡資訊或內部備註。

## 記憶系統（建議）

- 每日日誌：`memory/YYYY-MM-DD.md`（如果需要則建立 `memory/`）。
- 長期記憶：`MEMORY.md` 用於持久性事實、偏好設定和決策。
- 小寫 `memory.md` 僅作為舊版備案；請勿故意保留兩個根檔案。
- 會話啟動時，讀取今天 + 昨天 + `MEMORY.md`（如果存在），否則讀取 `memory.md`。
- 記錄：決策、偏好、限制、未結事項。
- 除非明確要求，否則避免記錄秘密。

## 工具與技能

- 工具位於技能中；當您需要時，請遵循每個技能的 `SKILL.md`。
- 將環境特定的說明保留在 `TOOLS.md`（技能說明）中。

## 備份提示（建議）

如果您將此工作區視為 Clawd 的「記憶」，請將其設為 git 儲存庫（最好是私有的），以便 `AGENTS.md` 和您的記憶檔案都能備份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 執行 WhatsApp 閘道 + Pi 編碼代理，以便助理可以讀取/寫入聊天、獲取上下文，並透過主機 Mac 執行技能。
- macOS 應用程式管理權限（螢幕錄製、通知、麥克風），並透過其捆綁的二進位檔案公開 `openclaw` CLI。
- 預設情況下，私人聊天會合併到代理的 `main` 工作階段中；群組則保持獨立為 `agent:<agentId>:<channel>:group:<id>`（房間/頻道：`agent:<agentId>:<channel>:channel:<id>`）；心跳訊號使背景任務保持運作。

## 核心技能（在設定 → 技能中啟用）

- **mcporter** — 用於管理外部技能後端的工具伺服器執行環境/CLI。
- **Peekaboo** — 快速的 macOS 螢幕截圖，可選擇搭配 AI 視覺分析。
- **camsnap** — 從 RTSP/ONVIF 監控攝影機擷取畫格、剪輯或動作警示。
- **oracle** — 具備工作階段重播和瀏覽器控制功能的 OpenAI 就緒代理 CLI。
- **eightctl** — 從終端機控制您的睡眠。
- **imsg** — 傳送、讀取、串流 iMessage 和 SMS。
- **wacli** — WhatsApp CLI：同步、搜尋、傳送。
- **discord** — Discord 動作：回應、貼圖、投票。使用 `user:<id>` 或 `channel:<id>` 目標（純數字 ID 容易產生歧義）。
- **gog** — Google Suite CLI：Gmail、日曆、雲端硬碟、聯絡人。
- **spotify-player** — 終端機 Spotify 客戶端，用於搜尋/加入佇列/控制播放。
- **sag** — ElevenLabs 語音合成，採用 mac 風格的 say UX；預設串流至喇叭。
- **Sonos CLI** — 從腳本控制 Sonos 喇叭（探索/狀態/播放/音量/分組）。
- **blucli** — 從腳本播放、分組和自動化 BluOS 播放器。
- **OpenHue CLI** — 適用於場景和自動化的 Philips Hue 燈光控制。
- **OpenAI Whisper** — 本地語音轉文字，用於快速聽寫和語音信箱逐字稿。
- **Gemini CLI** — Google Gemini 模型，用於終端機中的快速問答。
- **agent-tools** — 用於自動化和輔助腳本的實用工具包。

## 使用說明

- 建議優先使用 `openclaw` CLI 進行腳本編寫；Mac 應用程式負責處理權限。
- 請從「技能」分頁執行安裝；如果二進位檔案已存在，按鈕將會隱藏。
- 請保持心跳功能啟用，以便助理能夠排程提醒、監控收件匣並觸發相機擷取。
- Canvas UI 以全螢幕模式執行，並具有原生覆蓋層。請避免將關鍵控制項放置在左上、右上或底部邊緣；請在佈局中加入明確的邊距，並且不要依賴安全區域插入。
- 若要進行瀏覽器驅動的驗證，請使用 `openclaw browser` (分頁/狀態/螢幕擷圖) 搭配 OpenClaw 管理的 Chrome 設定檔。
- 若要檢查 DOM，請使用 `openclaw browser eval|query|dom|snapshot` (當您需要機器輸出時，請使用 `--json`/`--out`)。
- 若要進行互動，請使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (點擊/輸入需要快照參照；若要使用 CSS 選擇器，請使用 `evaluate`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
