---
summary: "以安全注意事項將 OpenClaw 作為個人助理運行的端到端指南"
read_when:
  - Onboarding a new assistant instance
  - Reviewing safety/permission implications
title: "個人助理設定"
---

OpenClaw 是一個自託管的閘道，將 Discord、Google Chat、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo 等連接到 AI 代理。本指南涵蓋「個人助理」設定：一個專用的 WhatsApp 號碼，其行為就像您隨時待命的 AI 助理。

## ⚠️ 安全第一

您將代理置於能夠執行以下操作的位置：

- 在您的機器上執行指令（視您的工具原則而定）
- 讀取/寫入您工作區中的檔案
- 透過 WhatsApp/Telegram/Discord/Mattermost 和其他捆綁頻道傳送訊息

從保守開始：

- 務必設定 `channels.whatsapp.allowFrom`（切勿在您的個人 Mac 上執行對外公開的服務）。
- 為助理使用專用的 WhatsApp 號碼。
- 心跳現預設為每 30 分鐘一次。透過設定 `agents.defaults.heartbeat.every: "0m"` 將其停用，直到您信任此設定為止。

## 先決條件

- 已安裝並完成 OpenClaw 入門導覽 —— 若尚未完成，請參閱[入門指南](/zh-Hant/start/getting-started)
- 助理的第二個電話號碼（SIM/eSIM/預付卡）

## 雙手機設定（建議）

您需要這樣：

```mermaid
flowchart TB
    A["<b>Your Phone (personal)<br></b><br>Your WhatsApp<br>+1-555-YOU"] -- message --> B["<b>Second Phone (assistant)<br></b><br>Assistant WA<br>+1-555-ASSIST"]
    B -- linked via QR --> C["<b>Your Mac (openclaw)<br></b><br>AI agent"]
```

如果您將您的個人 WhatsApp 連結到 OpenClaw，發給您的每條訊息都會變成「代理輸入」。這通常不是您想要的。

## 5 分鐘快速入門

1. 配對 WhatsApp Web（顯示 QR Code；使用助理手機掃描）：

```bash
openclaw channels login
```

2. 啟動閘道（保持其運行）：

```bash
openclaw gateway --port 18789
```

3. 在 `~/.openclaw/openclaw.json` 中放入一個最小設定：

```json5
{
  gateway: { mode: "local" },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

現在從您的允許清單手機向助理號碼發送訊息。

當入門導覽完成時，OpenClaw 會自動開啟儀表板並列印一個乾淨（非 Token 化）的連結。如果儀表板提示進行身份驗證，請將設定的共用金鑰貼上至 Control UI 設定中。入門導覽預設使用 Token (`gateway.auth.token`)，但如果您將 `gateway.auth.mode` 切換為 `password`，密碼驗證也可行。若稍後要重新開啟：`openclaw dashboard`。

## 給代理一個工作區 (AGENTS)

OpenClaw 從其工作區目錄讀取操作指令和「記憶」。

預設情況下，OpenClaw 使用 `~/.openclaw/workspace` 作為代理工作區，並會在設定/首次代理執行時自動建立它（以及初始的 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`）。`BOOTSTRAP.md` 僅在工作區是全新的時候建立（您刪除它後它不應該再出現）。`MEMORY.md` 是選用的（不會自動建立）；當存在時，它會在一般工作階段中載入。子代理工作階段僅會注入 `AGENTS.md` 和 `TOOLS.md`。

<Tip>將此資料夾視為 OpenClaw 的記憶體，並將其設為 git repo（最好是私有的），以便您的 `AGENTS.md` 和記憶體檔案都能備份。如果已安裝 git，全新的工作區會自動初始化。</Tip>

```bash
openclaw setup
```

完整的工作區佈局 + 備份指南：[代理工作區](/zh-Hant/concepts/agent-workspace)
記憶體工作流程：[記憶體](/zh-Hant/concepts/memory)

選用：使用 `agents.defaults.workspace` 選擇不同的工作區（支援 `~`）。

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

如果您已經從儲存庫部署自己的工作區檔案，您可以完全停用引導檔案的建立：

```json5
{
  agents: {
    defaults: {
      skipBootstrap: true,
    },
  },
}
```

## 將其變成「助理」的設定

OpenClaw 預設為良好的助理設定，但您通常會想要調整：

- [`SOUL.md`](/zh-Hant/concepts/soul) 中的 persona/instructions
- thinking 預設值（如果需要的話）
- heartbeats（一旦您信任它）

範例：

```json5
{
  logging: { level: "info" },
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      workspace: "~/.openclaw/workspace",
      thinkingDefault: "high",
      timeoutSeconds: 1800,
      // Start with 0; enable later.
      heartbeat: { every: "0m" },
    },
    list: [
      {
        id: "main",
        default: true,
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    ],
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080,
    },
  },
}
```

## 會話與記憶體

- Session 檔案：`~/.openclaw/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- Session 元資料（token 使用量、最近路由等）：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（舊版：`~/.openclaw/sessions/sessions.json`）
- `/new` 或 `/reset` 會為該聊天啟動一個新的 session（可透過 `resetTriggers` 設定）。如果單獨發送，OpenClaw 將確認重置而不呼叫模型。
- `/compact [instructions]` 會壓縮 session 上下文並報告剩餘的上下文預算。

## Heartbeats（主動模式）

根據預設，OpenClaw 每 30 分鐘執行一次心跳，提示為：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
設定 `agents.defaults.heartbeat.every: "0m"` 以停用。

- 如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 將跳過心跳執行以節省 API 呼叫。
- 如果檔案不存在，心跳檢測仍會執行，由模型決定要做什麼。
- 如果 agent 回覆 `HEARTBEAT_OK`（可選帶有短填充；請參閱 `agents.defaults.heartbeat.ackMaxChars`），OpenClaw 將抑制該心跳的輸出傳遞。
- 根據預設，允許將心跳傳遞至 DM 風格的 `user:<id>` 目標。設定 `agents.defaults.heartbeat.directPolicy: "block"` 以在保持心跳執行啟用的同時抑制直接目標傳遞。
- 心跳檢測會執行完整的代理週期——較短的間隔會消耗更多的 tokens。

```json5
{
  agents: {
    defaults: {
      heartbeat: { every: "30m" },
    },
  },
}
```

## 媒體輸入與輸出

傳入的附件（圖片/音訊/文件）可以透過模板顯示給您的指令：

- `{{MediaPath}}`（本機暫存檔案路徑）
- `{{MediaUrl}}`（虛擬 URL）
- `{{Transcript}}`（如果啟用了音訊轉錄）

來自 agent 的輸出附件：在單獨一行中包含 `MEDIA:<path-or-url>`（無空格）。該指令必須以純文字開頭該行，位於程式碼區塊之外，且不包含 Markdown 包裝器（例如粗體或內聯程式碼）。範例：

```
Here's the screenshot.
MEDIA:https://example.com/screenshot.png
```

OpenClaw 會提取這些內容，並將其隨文字一併作為媒體發送。

這些形式不是附件指令，並將作為普通文字傳送：

```md
**MEDIA:https://example.com/screenshot.png**
`MEDIA:https://example.com/screenshot.png`
Here is the screenshot: MEDIA:https://example.com/screenshot.png
```

本機路徑行為遵循與 agent 相同的檔案讀取信任模型：

- 如果 `tools.fs.workspaceOnly` 是 `true`，輸出的 `MEDIA:` 本機路徑將僅限於 OpenClaw 暫存根目錄、媒體快取、agent 工作區路徑以及沙箱產生的檔案。
- 如果 `tools.fs.workspaceOnly` 是 `false`，出站 `MEDIA:` 可以使用代理程式已有權限讀取的主機本機檔案。
- 本機路徑可以是絕對路徑、相對於工作區的路徑，或使用 `~/` 的相對於家目錄的路徑。
- 主機本機發送仍然僅允許媒體和安全文件類型（圖片、音訊、影片、PDF 和 Office 文件）。純文字和類似秘密的檔案不會被視為可發送的媒體。

這意味著當您的檔案系統策略已允許這些讀取時，在工作區之外產生的圖片/檔案現在可以發送，而不會重新開放任意的主機文字附件外洩風險。

## 操作檢查清單

```bash
openclaw status          # local status (creds, sessions, queued events)
openclaw status --all    # full diagnosis (read-only, pasteable)
openclaw status --deep   # asks the gateway for a live health probe with channel probes when supported
openclaw health --json   # gateway health snapshot (WS; default can return a fresh cached snapshot)
```

日誌儲存在 `/tmp/openclaw/` 下（預設：`openclaw-YYYY-MM-DD.log`）。

## 下一步

- WebChat：[WebChat](/zh-Hant/web/webchat)
- Gateway 操作：[Gateway runbook](/zh-Hant/gateway)
- Cron + 喚醒：[Cron jobs](/zh-Hant/automation/cron-jobs)
- macOS 選單列伴隨應用程式：[OpenClaw macOS app](/zh-Hant/platforms/macos)
- iOS 節點應用程式：[iOS app](/zh-Hant/platforms/ios)
- Android 節點應用程式：[Android app](/zh-Hant/platforms/android)
- Windows 狀態：[Windows (WSL2)](/zh-Hant/platforms/windows)
- Linux 狀態：[Linux app](/zh-Hant/platforms/linux)
- 安全性：[Security](/zh-Hant/gateway/security)

## 相關

- [Getting started](/zh-Hant/start/getting-started)
- [Setup](/zh-Hant/start/setup)
- [Channels overview](/zh-Hant/channels)
