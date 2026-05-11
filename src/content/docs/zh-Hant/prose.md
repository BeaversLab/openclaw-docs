---
summary: "OpenProse：OpenClaw 中的 .prose 工作流程、斜線指令與狀態"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

OpenProse 是一種便攜、以 Markdown 優先的工作流程格式，用於協調 AI 會話。在 OpenClaw 中，它作為一個插件提供，該插件會安裝 OpenProse 技能包以及一個 `/prose` 斜線指令。程式存放在 `.prose` 檔案中，並可以透過明確的控制流程產生多個子代理程式。

官方網站：[https://www.prose.md](https://www.prose.md)

## 它能做什麼

- 具有明確並行性的多代理程式研究與綜合。
- 可重複、經過審批安全的工作流程（程式碼審查、事件分級、內容管線）。
- 可重複使用的 `.prose` 程式，您可以在支援的代理程式執行環境中執行。

## 安裝 + 啟用

打包的插件預設為停用。請啟用 OpenProse：

```bash
openclaw plugins enable open-prose
```

啟用插件後，請重新啟動 Gateway。

開發/本機檢出： `openclaw plugins install ./path/to/local/open-prose-plugin`

相關文件：[插件](/zh-Hant/tools/plugin)、[插件清單](/zh-Hant/plugins/manifest)、[技能](/zh-Hant/tools/skills)。

## 斜線指令

OpenProse 將 `/prose` 註冊為使用者可呼叫的技能指令。它會路由到 OpenProse VM 指令，並在底層使用 OpenClaw 工具。

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

## 範例：一個簡單的 `.prose` 檔案

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

OpenProse 將狀態保存在您工作區的 `.prose/` 下：

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
- **in-context**：暫時性的，適用於小型程式
- **sqlite** (實驗性)：需要 `sqlite3` 二進位檔案
- **postgres** (實驗性)：需要 `psql` 和連線字串

備註：

- sqlite/postgres 需選擇加入，且屬實驗性功能。
- postgres 憑證會流入子代理程式記錄中；請使用專用、最小權限的資料庫。

## 遠端程式

`/prose run <handle/slug>` 會解析為 `https://p.prose.md/<handle>/<slug>`。
直接的 URL 會按原樣擷取。這會使用 `web_fetch` 工具 (或用於 POST 的 `exec`)。

## OpenClaw 執行環境對應

OpenProse 程式會對應到 OpenClaw 原語：

| OpenProse 概念      | OpenClaw 工具    |
| ------------------- | ---------------- |
| 產生會話 / 任務工具 | `sessions_spawn` |
| 檔案讀取/寫入       | `read` / `write` |
| 網頁獲取            | `web_fetch`      |

如果您的工具允許清單封鎖了這些工具，OpenProse 程式將會失敗。請參閱 [Skills config](/zh-Hant/tools/skills-config)。

## 安全性 + 審核

將 `.prose` 檔案視為程式碼。執行前請先審查。使用 OpenClaw 工具允許清單和審核閘道來控制副作用。

對於確定性、需經審核的工作流程，請與 [Lobster](/zh-Hant/tools/lobster) 進行比較。

## 相關

- [文字轉語音](/zh-Hant/tools/tts)
- [Markdown 格式](/zh-Hant/concepts/markdown-formatting)
