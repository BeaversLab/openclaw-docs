---
summary: "OpenProse：OpenClaw 中的 .prose 工作流程、斜線指令與狀態"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

# OpenProse

OpenProse 是一種可攜式、以 Markdown 為優先的工作流程格式，用於編排 AI 工作階段。在 OpenClaw 中，它以插件形式提供，會安裝 OpenProse 技能套件以及一個 `/prose` 斜線指令。程式存放在 `.prose` 檔案中，並可透過明確的控制流程產生多個子代理程式。

官方網站：[https://www.prose.md](https://www.prose.md)

## 功能

- 具備明確平行處理能力的多代理程式研究與綜合。
- 可重複且安全經核准的工作流程（程式碼審查、事件分類、內容管線）。
- 可重複使用的 `.prose` 程式，您可以在支援的代理程式執行環境中執行。

## 安裝 + 啟用

內建插件預設為停用。啟用 OpenProse：

```bash
openclaw plugins enable open-prose
```

啟用插件後，請重新啟動 Gateway。

開發/本機結帳： `openclaw plugins install ./extensions/open-prose`

相關文件：[Plugins](/en/tools/plugin)、[Plugin manifest](/en/plugins/manifest)、[Skills](/en/tools/skills)。

## 斜線指令

OpenProse 將 `/prose` 註冊為使用者可呼叫的技能指令。它會路由至 OpenProse VM 指令，並在底層使用 OpenClaw 工具。

常見指令：

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## 範例：簡單的 `.prose` 檔案

```text
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## 檔案位置

OpenProse 會將狀態保存在您工作區的 `.prose/` 下：

```
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

使用者層級的持久化代理程式位於：

```
~/.prose/agents/
```

## 狀態模式

OpenProse 支援多種狀態後端：

- **filesystem** (預設)： `.prose/runs/...`
- **in-context**：暫時性，適用於小型程式
- **sqlite** (實驗性)：需要 `sqlite3` 二進位檔
- **postgres** (實驗性)：需要 `psql` 和連線字串

注意事項：

- sqlite/postgres 為選用功能且屬實驗性質。
- postgres 憑證會流入子代理程式記錄中；請使用專用且權限最低的資料庫。

## 遠端程式

`/prose run <handle/slug>` 解析為 `https://p.prose.md/<handle>/<slug>`。
直接 URL 會按原樣獲取。這使用 `web_fetch` 工具（對於 POST 則使用 `exec`）。

## OpenClaw 執行時對應

OpenProse 程式對應到 OpenClaw 基元：

| OpenProse 概念      | OpenClaw 工具    |
| ------------------- | ---------------- |
| 生成會話 / 任務工具 | `sessions_spawn` |
| 檔案讀寫            | `read` / `write` |
| Web 獲取            | `web_fetch`      |

如果您的工具允許清單阻擋了這些工具，OpenProse 程式將會失敗。請參閱 [Skills config](/en/tools/skills-config)。

## 安全性 + 審核

請將 `.prose` 檔案視為程式碼。執行前請進行審查。使用 OpenClaw 工具允許清單和審核閘門來控制副作用。

對於確定性、需經審核的工作流程，請與 [Lobster](/en/tools/lobster) 進行比較。
