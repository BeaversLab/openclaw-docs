---
summary: "使用 OpenClaw 作為個人助理的端到端指南，並包含安全注意事項"
read_when:
  - 入門新的助理實例
  - 審查安全性/權限影響
title: "個人助理設定"
---

# 使用 OpenClaw 建構個人助理

OpenClaw 是 **Pi** 代理程式的 WhatsApp + Telegram + Discord + iMessage 閘道。外掛程式增加了 Mattermost。本指南是「個人助理」設定：一個專屬的 WhatsApp 號碼，表現得像您永遠在線的代理程式。

## ⚠️ 安全第一

您正在將代理程式置於可以執行以下操作的位置：

- 在您的機器上執行指令（視您的 Pi 工具設定而定）
- 讀取/寫入您工作區中的檔案
- 透過 WhatsApp/Telegram/Discord/Mattermost（外掛程式）傳回訊息

從保守開始：

- 請務必設定 `channels.whatsapp.allowFrom`（切勿在您的個人 Mac 上對全世界開放執行）。
- 為助理使用專屬的 WhatsApp 號碼。
- 心跳預設現在為每 30 分鐘一次。在您信任此設定之前，請透過設定 `agents.defaults.heartbeat.every: "0m"` 來停用它。

## 先決條件

- 已安裝並上線 OpenClaw — 如果還沒進行，請參閱[入門指南](/zh-Hant/start/getting-started)
- 專門給助理使用的第二個電話號碼 (SIM/eSIM/預付卡)

## 雙手機設定（推薦）

您想要這樣做：

```mermaid
flowchart TB
    A["<b>Your Phone (personal)<br></b><br>Your WhatsApp<br>+1-555-YOU"] -- message --> B["<b>Second Phone (assistant)<br></b><br>Assistant WA<br>+1-555-ASSIST"]
    B -- linked via QR --> C["<b>Your Mac (openclaw)<br></b><br>Pi agent"]
```

如果您將您的個人 WhatsApp 連結到 OpenClaw，每則發給您的訊息都會變成「代理輸入」。這通常不是您想要的。

## 5 分鐘快速入門

1. 配對 WhatsApp Web（顯示 QR Code；使用助理手機掃描）：

```bash
openclaw channels login
```

2. 啟動 Gateway（讓它保持運作）：

```bash
openclaw gateway --port 18789
```

3. 將最小設定放在 `~/.openclaw/openclaw.json` 中：

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

現在從您的允許清單手機傳訊息給助理號碼。

當入職流程完成後，我們會自動開啟儀表板並列印一個乾淨（未記號化）的連結。如果提示進行身份驗證，請將 `gateway.auth.token` 的貼上代幣貼上到 Control UI 設定中。若要稍後重新開啟：`openclaw dashboard`。

## 給予代理程式一個工作區（AGENTS）

OpenClaw 會從其工作區目錄讀取操作指令和「記憶」。

預設情況下，OpenClaw 使用 `~/.openclaw/workspace` 作為代理工作區，並會在設置/首次代理執行時自動建立它（以及初始的 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`）。`BOOTSTRAP.md` 僅在工作區是全新的時候建立（在您刪除它之後不應該再次出現）。`MEMORY.md` 是可選的（不會自動建立）；如果存在，它會在正常會話中載入。子代理會話僅會注入 `AGENTS.md` 和 `TOOLS.md`。

提示：將此資料夾視為 OpenClaw 的「記憶」，並將其設為 git repo（最好是私有的），以便您的 `AGENTS.md` + 記憶檔案得到備份。如果已安裝 git，全新的工作空間將會自動初始化。

```bash
openclaw setup
```

完整的工作空間佈局 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)
記憶工作流程：[Memory](/zh-Hant/concepts/memory)

選用：使用 `agents.defaults.workspace` 選擇不同的工作空間（支援 `~`）。

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

如果您已經從 repo 提供自己的工作空間檔案，可以完全停用 bootstrap 檔案的建立：

```json5
{
  agent: {
    skipBootstrap: true,
  },
}
```

## 將其轉變為「助理」的設定

OpenClaw 預設為良好的助理設定，但您通常會想要調整：

- `SOUL.md` 中的 persona/instructions
- thinking 預設值（如果需要）
- heartbeats（一旦您信任它之後）

範例：

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-6",
    workspace: "~/.openclaw/workspace",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // Start with 0; enable later.
    heartbeat: { every: "0m" },
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@openclaw", "openclaw"],
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

## Sessions and memory

- 會話檔案：`~/.openclaw/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- 會話元資料（token 使用量、最後路由等）：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（舊版：`~/.openclaw/sessions/sessions.json`）
- `/new` 或 `/reset` 會為該聊天啟動一個新的會話（可透過 `resetTriggers` 設定）。如果單獨發送，代理程式會回覆簡短的問候以確認重置。
- `/compact [instructions]` 會壓縮會話上下文並回報剩餘的上下文預算。

## 心跳（主動模式）

根據預設，OpenClaw 每 30 分鐘執行一次心跳，提示如下：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
設定 `agents.defaults.heartbeat.every: "0m"` 即可停用。

- 如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和標題之類的 markdown 標題，例如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
- 如果檔案遺失，心跳仍然會運作，由模型決定該做什麼。
- 如果代理回覆 `HEARTBEAT_OK`（可選帶有短填充；請參閱 `agents.defaults.heartbeat.ackMaxChars`），OpenClaw 將抑制該心跳的傳出傳遞。
- 預設情況下，允許將心跳傳遞至 DM 風格的 `user:<id>` 目標。設定 `agents.defaults.heartbeat.directPolicy: "block"` 以抑制直接目標傳遞，同時保持心跳運作啟用。
- 心跳會執行完整的代理回合 — 間隔越短會消耗更多 token。

```json5
{
  agent: {
    heartbeat: { every: "30m" },
  },
}
```

## 媒體輸入與輸出

輸入的附件（圖片/音訊/文件）可以透過模板提供給您的指令：

- `{{MediaPath}}`（本機暫存檔案路徑）
- `{{MediaUrl}}`（偽 URL）
- `{{Transcript}}`（如果啟用了音訊轉錄）

來自代理的輸出附件：將 `MEDIA:<path-or-url>` 單獨放在一行（無空格）。例如：

```
Here’s the screenshot.
MEDIA:https://example.com/screenshot.png
```

OpenClaw 會提取這些內容，並將其隨文字一併以媒體形式發送。

## 操作檢查清單

```bash
openclaw status          # local status (creds, sessions, queued events)
openclaw status --all    # full diagnosis (read-only, pasteable)
openclaw status --deep   # adds gateway health probes (Telegram + Discord)
openclaw health --json   # gateway health snapshot (WS)
```

日誌位於 `/tmp/openclaw/` 之下（預設值：`openclaw-YYYY-MM-DD.log`）。

## 下一步

- WebChat：[WebChat](/zh-Hant/web/webchat)
- Gateway 操作：[Gateway runbook](/zh-Hant/gateway)
- Cron + 喚醒：[Cron jobs](/zh-Hant/automation/cron-jobs)
- macOS 選單列伴隨程式：[OpenClaw macOS app](/zh-Hant/platforms/macos)
- iOS 節點應用程式：[iOS app](/zh-Hant/platforms/ios)
- Android 節點應用程式：[Android app](/zh-Hant/platforms/android)
- Windows 狀態：[Windows (WSL2)](/zh-Hant/platforms/windows)
- Linux 狀態：[Linux app](/zh-Hant/platforms/linux)
- 安全性：[Security](/zh-Hant/gateway/security)

import en from "/components/footer/en.mdx";

<en />
