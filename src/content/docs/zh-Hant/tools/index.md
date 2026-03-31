---
summary: "OpenClaw 工具和外掛概覽：代理人可以執行哪些操作以及如何進行擴充"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "工具與外掛"
---

# 工具與外掛

代理人在生成文字之外執行的所有操作都是透過 **工具** 完成的。
工具是代理人讀取檔案、執行指令、瀏覽網頁、傳送
訊息以及與裝置互動的方式。

## 工具、技能與外掛

OpenClaw 有三個協同運作的層級：

<Steps>
  <Step title="工具是代理人呼叫的對象">
    工具是代理人可以叫用的型別函式（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 內建了一組 **內建工具**，
    而外掛可以註冊額外的工具。

    代理人將工具視為傳送至模型 API 的結構化函式定義。

  </Step>

  <Step title="技能教導 Agent 何時與如何">
    技能是一個插入系統提示詞中的 Markdown 檔案 (`SKILL.md`)。
    技能為 Agent 提供背景、約束以及有效使用工具的逐步指導。
    技能存在於您的工作區、共享資料夾中，或隨外掛程式一起打包。

    [技能參考](/en/tools/skills) | [建立技能](/en/tools/creating-skills)

  </Step>

  <Step title="外掛將所有內容打包在一起">
    外掛是一個可以註冊任何功能組合的套件：
    頻道、模型提供商、工具、技能、語音、圖像生成等等。
    有些外掛是 **核心**（隨 OpenClaw 附帶），其他是 **外部**（由社群在 npm 上發布）。

    [安裝並配置外掛](/en/tools/plugin) | [建立你自己的外掛](/en/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛即可使用：

| 工具                                    | 功能說明                                 | 頁面                                   |
| --------------------------------------- | ---------------------------------------- | -------------------------------------- |
| `exec` / `process`                      | 執行 Shell 指令，管理背景程序            | [Exec](/en/tools/exec)                 |
| `code_execution`                        | 執行沙盒化遠端 Python 分析               | [程式碼執行](/en/tools/code-execution) |
| `browser`                               | 控制 Chromium 瀏覽器（導航、點擊、截圖） | [瀏覽器](/en/tools/browser)            |
| `web_search` / `x_search` / `web_fetch` | 搜尋網路、搜尋 X 帖文、擷取頁面內容      | [網路](/en/tools/web)                  |
| `read` / `write` / `edit`               | 工作區內的檔案 I/O                       |                                        |
| `apply_patch`                           | 多區塊檔案修補                           | [套用修補](/en/tools/apply-patch)      |
| `message`                               | 跨所有頻道傳送訊息                       | [Agent Send](/en/tools/agent-send)     |
| `canvas`                                | 驅動節點 Canvas (呈現、評估、快照)       |                                        |
| `nodes`                                 | 發現並指定配對裝置                       |                                        |
| `cron` / `gateway`                      | 管理排程工作、重新啟動閘道               |                                        |
| `image` / `image_generate`              | 分析或生成圖片                           |                                        |
| `sessions_*` / `agents_list`            | 會話管理、子代理                         | [子代理](/en/tools/subagents)          |

對於圖片工作，請使用 `image` 進行分析，使用 `image_generate` 進行生成或編輯。如果您目標是 `openai/*`、`google/*`、`fal/*` 或其他非預設圖片提供商，請先配置該提供商的 auth/API 金鑰。

### 外掛提供的工具

外掛可以註冊額外的工具。一些範例：

- [Lobster](/en/tools/lobster) — 具有可恢復核准功能的類型化工作流程執行時
- [LLM Task](/en/tools/llm-task) — 用於結構化輸出的純 JSON LLM 步驟
- [Diffs](/en/tools/diffs) — 差異檢視與渲染器
- [OpenProse](/en/prose) — 以 Markdown 為先的工作流程編排

## 工具設定

### 允許與拒絕列表

透過設定中的 `tools.allow` / `tools.deny`
控制代理可以呼叫哪些工具。拒絕列表的優先度始終高於允許列表。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具設定檔

`tools.profile` 在套用 `allow`/`deny`
之前設定基礎允許列表。個別代理覆寫：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                 |
| ----------- | ---------------------------------------- |
| `full`      | 所有工具（預設）                         |
| `coding`    | 檔案 I/O、執行時、工作階段、記憶體、影像 |
| `messaging` | 訊息傳遞、工作階段列表/歷史/傳送/狀態    |
| `minimal`   | 僅限 `session_status`                    |

### 工具組

在允許/拒絕清單中使用 `group:*` 簡寫：

| 群組               | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, process, code_execution                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:openclaw`   | 所有內建 OpenClaw 工具（不包括外掛工具）                                                                  |

### 供應商特定限制

使用 `tools.byProvider` 針對特定提供者限制工具，而無需變更全域預設值：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
