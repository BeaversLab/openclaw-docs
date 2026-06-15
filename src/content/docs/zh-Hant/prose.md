---
title: "OpenProse"
sidebarTitle: "OpenProse"
summary: "OpenProse 是一種以 Markdown 為優先的多代理 AI 工作階段工作流程格式。在 OpenClaw 中，它作為一個外掛程式提供，並包含 /prose 斜線指令和一個技能套件。"
read_when:
  - You want to run or write .prose workflow files
  - You want to enable the OpenProse plugin
  - You need to understand how OpenProse maps to OpenClaw primitives
---

OpenProse 是一種可攜、以 Markdown 為優先的工作流程格式，用於協調 AI 工作階段。在 OpenClaw 中，它以一個外掛程式的形式提供，會安裝 OpenProse 技能套件和一個 `/prose` 斜線指令。程式位於 `.prose` 檔案中，並可產生具有明確控制流程的多個子代理程式。

<CardGroup cols={3}>
  <Card title="安裝" icon="download" href="#install">
    啟用 OpenProse 外掛程式並重新啟動 Gateway。
  </Card>
  <Card title="執行程式" icon="play" href="#slash-command">
    使用 `/prose run` 來執行 `.prose` 檔案或遠端程式。
  </Card>
  <Card title="撰寫程式" icon="pencil" href="#example">
    撰寫包含平行和循序步驟的多代理工作流程。
  </Card>
</CardGroup>

## 安裝

<Steps>
  <Step title="啟用外掛程式">
    內建的外掛程式預設為停用。啟用 OpenProse：

    ```bash
    openclaw plugins enable open-prose
    ```

  </Step>
  <Step title="重新啟動 Gateway">
    ```bash
    openclaw gateway restart
    ```
  </Step>
  <Step title="驗證">
    ```bash
    openclaw plugins list | grep prose
    ```

    您應該會看到 `open-prose` 已啟用。`/prose` 技能指令現在
    可在聊天中使用。

  </Step>
</Steps>

若為本機複本： `openclaw plugins install ./path/to/local/open-prose-plugin`

## 斜線指令

OpenProse 註冊 `/prose` 為使用者可叫用的技能指令：

```text
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

`/prose run <handle/slug>` 解析為 `https://p.prose.md/<handle>/<slug>`。
直接 URL 會使用 `web_fetch` 工具原樣擷取。

## 功能

- 具有明確並行性的多代理研究和綜合。
- 可重複、需核准的工作流程（程式碼審查、事件分類、內容管線）。
- 可重複使用的 `.prose` 程式，您可以在支援的代理執行環境中執行。

## 範例：並行研究與綜合

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

## OpenClaw 執行時期映射

OpenProse 程式映射到 OpenClaw 原語：

| OpenProse 概念          | OpenClaw 工具    |
| ----------------------- | ---------------- |
| 產生工作階段 / 任務工具 | `sessions_spawn` |
| 檔案讀取 / 寫入         | `read` / `write` |
| 網頁擷取                | `web_fetch`      |

<Warning>如果您的工具允許清單阻擋了 `sessions_spawn`、`read`、`write` 或 `web_fetch`，OpenProse 程式將會失敗。請檢查您的 [tools allowlist config](/zh-Hant/gateway/config-tools)。</Warning>

## 檔案位置

OpenProse 將狀態保存在您工作區的 `.prose/` 下：

```text
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

使用者層級的持續代理位於：

```text
~/.prose/agents/
```

## 狀態後端

<AccordionGroup>
  <Accordion title="filesystem (default)">
    狀態會寫入工作區中的 `.prose/runs/...`。不需要額外
    相依性。
  </Accordion>
  <Accordion title="in-context">
    狀態保存在內容視窗中。適用於小型、短暫
    的程式。
  </Accordion>
  <Accordion title="sqlite (experimental)">
    需要 `PATH` 上的 `sqlite3` 二進位檔案。
  </Accordion>
  <Accordion title="postgres (experimental)">
    需要 `psql` 和連線字串。

    <Warning>
      Postgres 憑證會流向子代理記錄檔。請使用專用的、
      最低權限的資料庫。
    </Warning>

  </Accordion>
</AccordionGroup>

## 安全性

將 `.prose` 檔案視為程式碼。執行前請先審閱。使用 OpenClaw 工具允許清單和批准閘道來控制副作用。若需要確定性、需經批准的工作流程，請與 [Lobster](/zh-Hant/tools/lobster) 進行比較。

## 相關

<CardGroup cols={2}>
  <Card title="技能參考" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    OpenProse 的技能套件如何載入以及適用哪些閘道。
  </Card>
  <Card title="子代理" href="/zh-Hant/tools/subagents" icon="users">
    OpenClaw 的原生多代理協調層。
  </Card>
  <Card title="文字轉語音" href="/zh-Hant/tools/tts" icon="volume-high">
    為您的工作流程新增音訊輸出。
  </Card>
  <Card title="斜線指令" href="/zh-Hant/tools/slash-commands" icon="terminal">
    所有可用的聊天指令，包括 /prose。
  </Card>
</CardGroup>

官方網站：[https://www.prose.md](https://www.prose.md)
