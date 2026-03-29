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

  <Step title="技能教導代理人時機與方法">
    技能是注入到系統提示詞中的 Markdown 檔案（`SKILL.md`）。
    技能為代理人提供有效使用工具的情境、限制和逐步指導。
    技能存在於您的工作區、共享資料夾中，或隨外掛附帶。

    [技能參考](/en/tools/skills) | [建立技能](/en/tools/creating-skills)

  </Step>

  <Step title="外掛將一切打包在一起">
    外掛是可以註冊任何功能組合的套件：
    頻道、模型提供者、工具、技能、語音、影像生成等等。
    部分外掛是 **核心**（隨 OpenClaw 附帶），其他的則是 **外部**
   （由社群在 npm 上發布）。

    [安裝與設定外掛](/en/tools/plugin) | [自行建置](/en/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛即可使用：

| 工具                         | 功能說明                                 | 頁面                                 |
| ---------------------------- | ---------------------------------------- | ------------------------------------ |
| `exec` / `process`           | 執行 Shell 指令，管理背景程序            | [Exec](/en/tools/exec)               |
| `browser`                    | 控制 Chromium 瀏覽器（導航、點擊、截圖） | [瀏覽器](/en/tools/browser)          |
| `web_search` / `web_fetch`   | 搜尋網路、取得頁面內容                   | [網頁](/en/tools/web)                |
| `read` / `write` / `edit`    | 工作區中的檔案 I/O                       |                                      |
| `apply_patch`                | 多區塊檔案修補                           | [套用修補](/en/tools/apply-patch)    |
| `message`                    | 在所有頻道中傳送訊息                     | [代理程式傳送](/en/tools/agent-send) |
| `canvas`                     | 驅動節點 Canvas（展示、評估、快照）      |                                      |
| `nodes`                      | 探索並指定配對裝置                       |                                      |
| `cron` / `gateway`           | 管理排程工作、重新啟動閘道               |                                      |
| `image` / `image_generate`   | 分析或生成圖像                           |                                      |
| `sessions_*` / `agents_list` | 工作階段管理、子代理程式                 | [子代理程式](/en/tools/subagents)    |

對於圖像工作，請使用 `image` 進行分析，並使用 `image_generate` 進行生成或編輯。如果您指定 `openai/*`、`google/*`、`fal/*` 或其他非預設的圖像提供者，請先設定該提供者的驗證/API 金鑰。

### 外掛程式提供的工具

外掛程式可以註冊額外的工具。例如：

- [Lobster](/en/tools/lobster) — 具有可恢復核准功能的型別化工作流程執行時期
- [LLM Task](/en/tools/llm-task) — 用於結構化輸出的僅 JSON LLM 步驟
- [Diffs](/en/tools/diffs) — 差異檢視器和轉譯器
- [OpenProse](/en/prose) — 以 Markdown 為優先的工作流程協調

## 工具設定

### 允許和拒絕清單

透過設定中的 `tools.allow` / `tools.deny`
控制代理程式可以呼叫哪些工具。拒絕的優先順序永遠高於允許。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具設定檔

`tools.profile` 在套用 `allow`/`deny` 之前設定了一個基本允許清單。
個別代理覆寫：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                 |
| ----------- | ---------------------------------------- |
| `full`      | 所有工具（預設）                         |
| `coding`    | 檔案 I/O、執行時、工作階段、記憶體、圖片 |
| `messaging` | 訊息傳送、工作階段列表/歷史/傳送/狀態    |
| `minimal`   | 僅限 `session_status`                    |

### 工具群組

在允許/拒絕清單中使用 `group:*` 簡寫：

| 群組               | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, process                                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, web_fetch                                                                                     |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:openclaw`   | 所有內建的 OpenClaw 工具（不包含外掛工具）                                                                |

### 供應商特定限制

使用 `tools.byProvider` 來限制特定供應商的工具，而無需
變更全域預設值：

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
