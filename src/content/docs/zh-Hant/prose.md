---
summary: "OpenProse：OpenClaw 中的 .prose 工作流程、斜線指令與狀態"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

# OpenProse

OpenProse 是一種便攜、以 Markdown 為優先的工作流程格式，用於編排 AI 對話。在 OpenClaw 中，它作為一個插件提供，安裝 OpenProse 技能包以及 `/prose` 斜線指令。程式存在於 `.prose` 檔案中，並可以產生多個具有明確控制流程的子代理。

官方網站：[https://www.prose.md](https://www.prose.md)

## 功能介紹

- 具有明確平行處理的多代理研究與綜合。
- 可重複、安全的審核工作流程（程式碼審查、事件分級、內容管線）。
- 可重複使用的 `.prose` 程式，您可以在支援的代理執行時間上執行。

## 安裝與啟用

預設會停用隨附的外掛程式。啟用 OpenProse：

```exec
openclaw plugins enable open-prose
```

啟用外掛程式後，請重新啟動 Gateway。

開發/本地端簽出：`openclaw plugins install ./extensions/open-prose`

相關文件：[外掛程式](/zh-Hant/tools/plugin)、[外掛程式資訊清單](/zh-Hant/plugins/manifest)、[技能](/zh-Hant/tools/skills)。

## 斜線指令

OpenProse 註冊 `/prose` 為使用者可叫用的技能指令。它會路由至 OpenProse VM 指令，並在底層使用 OpenClaw 工具。

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

OpenProse 會將狀態保留在工作區的 `.prose/` 下：

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

使用者層級的永續代理程式位於：

```
~/.prose/agents/
```

## 狀態模式

OpenProse 支援多種狀態後端：

- **filesystem** (預設)：`.prose/runs/...`
- **in-context**：暫時性的，適用於小型程式
- **sqlite** (實驗性): 需要 `sqlite3` 二進位文件
- **postgres** (實驗性): 需要 `psql` 和連接字符串

備註:

- sqlite/postgres 為選用且實驗性功能。
- postgres 憑證會流入子代理程式日誌; 請使用專用、最小權限的資料庫。

## 遠端程式

`/prose run <handle/slug>` 解析為 `https://p.prose.md/<handle>/<slug>`。
直接 URL 按原樣獲取。這使用 `web_fetch` 工具 (或用於 POST 的 `exec`)。

## OpenClaw 執行時映射

OpenProse 程式映射到 OpenClaw 原語:

| OpenProse 概念      | OpenClaw 工具    |
| ------------------- | ---------------- |
| 生成會話 / 任務工具 | `sessions_spawn` |
| 檔案讀寫            | `read` / `write` |
| 網路擷取            | `web_fetch`      |

如果您的工具允許清單封鎖了這些工具，OpenProse 程式將會失敗。請參閱 [Skills config](/zh-Hant/tools/skills-config)。

## 安全性 + 審核

請將 `.prose` 檔案視為程式碼。執行前請先審查。使用 OpenClaw 工具允許清單和審核閘道來控制副作用。

若是針對確定性、需經審核的工作流程，請與 [Lobster](/zh-Hant/tools/lobster) 比較。
