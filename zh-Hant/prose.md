---
summary: "OpenProse：OpenClaw 中的 .prose 工作流、斜線指令與狀態"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

# OpenProse

OpenProse 是一種可攜式、以 Markdown 為優先的工作流格式，用於協調 AI 會話。在 OpenClaw 中，它以插件形式提供，會安裝 OpenProse 技能套件以及一個 `/prose` 斜線指令。程式存放於 `.prose` 檔案中，並可透過明確的控制流程產生多個子代理程式。

官方網站：[https://www.prose.md](https://www.prose.md)

## 功能

- 具有明確平行處理的多代理程式研究與綜合。
- 可重複、安全的審核工作流（程式碼審查、事件分類、內容管道）。
- 可重複使用的 `.prose` 程式，您可以在支援的代理程式執行環境中執行。

## 安裝與啟用

套件隨附的插件預設為停用。請啟用 OpenProse：

```bash
openclaw plugins enable open-prose
```

啟用插件後，請重新啟動 Gateway。

開發/本機簽出：`openclaw plugins install ./extensions/open-prose`

相關文件：[Plugins](/zh-Hant/tools/plugin)、[Plugin manifest](/zh-Hant/plugins/manifest)、[Skills](/zh-Hant/tools/skills)。

## 斜線指令

OpenProse 將 `/prose` 註冊為使用者可叫用的技能指令。它會路由至 OpenProse VM 指令，並在底層使用 OpenClaw 工具。

常用指令：

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

```prose
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

OpenProse 將狀態儲存在您工作區的 `.prose/` 下：

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

- **filesystem** (預設)：`.prose/runs/...`
- **in-context**：暫時性的，用於小型程式
- **sqlite** (實驗性)：需要 `sqlite3` 二進位檔案
- **postgres** (實驗性)：需要 `psql` 和連線字串

備註：

- sqlite/postgres 為選用且實驗性的功能。
- postgres 憑證會流向子代理程式日誌；請使用專用且權限最小的資料庫。

## 遠端程式

`/prose run <handle/slug>` 解析為 `https://p.prose.md/<handle>/<slug>`。
直接 URL 將按原樣獲取。這使用 `web_fetch` 工具（或用於 POST 的 `exec`）。

## OpenClaw 執行時對應

OpenProse 程式對應到 OpenClaw 基本指令：

| OpenProse 概念          | OpenClaw 工具    |
| ----------------------- | ---------------- |
| 產生工作階段 / 任務工具 | `sessions_spawn` |
| 檔案讀取/寫入           | `read` / `write` |
| 網頁擷取                | `web_fetch`      |

如果您的工具允許清單封鎖了這些工具，OpenProse 程式將會失敗。請參閱 [Skills config](/zh-Hant/tools/skills-config)。

## 安全性 + 審核

將 `.prose` 檔案視為程式碼。執行前請先檢閱。使用 OpenClaw 工具允許清單和審核閘道來控制副作用。

對於確定性、經審核閘道的工作流程，請與 [Lobster](/zh-Hant/tools/lobster) 比較。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
