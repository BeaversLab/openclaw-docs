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

  <Step title="技能教代理何時以及如何">
    技能是一個注入到系統提示中的 Markdown 文件 (`SKILL.md`)。
    技能為代理提供上下文、約束以及有效使用工具的逐步指導。技能存在於您的工作區、共享資料夾中，或打包在外掛程式中。

    [技能參考](/zh-Hant/tools/skills) | [建立技能](/zh-Hant/tools/creating-skills)

  </Step>

  <Step title="外掛程式將所有內容打包在一起">
    外掛程式是一個可以註冊任何功能組合的套件：
    頻道、模型提供者、工具、技能、語音、即時轉錄、
    即時語音、媒體理解、圖像生成、視頻生成、
    Web 抓取、Web 搜索等等。有些外掛程式是 **核心**（隨
    OpenClaw 附帶），其他是 **外部**（由社群發佈在 npm 上）。

    [安裝和配置外掛程式](/zh-Hant/tools/plugin) | [建立您自己的外掛程式](/zh-Hant/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛即可使用：

| 工具                                       | 功能說明                                     | 頁面                                                               |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `exec` / `process`                         | 執行 Shell 指令，管理背景程序                | [Exec](/zh-Hant/tools/exec)、[Exec Approvals](/zh-Hant/tools/exec-approvals) |
| `code_execution`                           | 執行沙盒化遠端 Python 分析                   | [Code Execution](/zh-Hant/tools/code-execution)                         |
| `browser`                                  | 控制 Chromium 瀏覽器（導航、點擊、截圖）     | [Browser](/zh-Hant/tools/browser)                                       |
| `web_search` / `x_search` / `web_fetch`    | 搜尋網路、搜尋 X 帖文、擷取頁面內容          | [Web](/zh-Hant/tools/web)、[Web Fetch](/zh-Hant/tools/web-fetch)             |
| `read` / `write` / `edit`                  | 工作區內的檔案 I/O                           |                                                                    |
| `apply_patch`                              | 多區塊檔案修補                               | [Apply Patch](/zh-Hant/tools/apply-patch)                               |
| `message`                                  | 跨所有頻道傳送訊息                           | [Agent Send](/zh-Hant/tools/agent-send)                                 |
| `canvas`                                   | 驅動節點 Canvas (呈現、評估、快照)           |                                                                    |
| `nodes`                                    | 發現並指定配對裝置                           |                                                                    |
| `cron` / `gateway`                         | 管理排程工作；檢查、修補、重新啟動或更新閘道 |                                                                    |
| `image` / `image_generate`                 | 分析或生成圖片                               | [Image Generation](/zh-Hant/tools/image-generation)                     |
| `music_generate`                           | 生成音樂曲目                                 | [Music Generation](/zh-Hant/tools/music-generation)                     |
| `video_generate`                           | 生成影片                                     | [Video Generation](/zh-Hant/tools/video-generation)                     |
| `tts`                                      | 一次性文字轉語音轉換                         | [TTS](/zh-Hant/tools/tts)                                               |
| `sessions_*` / `subagents` / `agents_list` | 會話管理、狀態和子代理程式協調               | [Sub-agents](/zh-Hant/tools/subagents)                                  |
| `session_status`                           | 輕量級 `/status` 風格的回放與會話模型覆蓋    | [Session Tools](/zh-Hant/concepts/session-tool)                         |

對於影像工作，請使用 `image` 進行分析，並使用 `image_generate` 進行生成或編輯。如果您以 `openai/*`、`google/*`、`fal/*` 或其他非預設的影像提供者為目標，請先設定該提供者的 auth/API 金鑰。

對於音樂工作，請使用 `music_generate`。如果您以 `google/*`、`minimax/*` 或其他非預設的音樂提供者為目標，請先設定該提供者的 auth/API 金鑰。

對於影片工作，請使用 `video_generate`。如果您以 `qwen/*` 或其他非預設的影片提供者為目標，請先設定該提供者的 auth/API 金鑰。

對於工作流程驅動的音訊生成，當諸如 ComfyUI 之類的外掛程式註冊 `music_generate` 時，請使用它。這與 `tts` 不同，後者是用於文字轉語音。

`session_status` 是會話群組中輕量級的狀態/回讀工具。它回答有關目前會話的 `/status` 風格問題，並可選擇設定每個會話的模型覆寫；`model=default` 會清除該覆寫。就像 `/status` 一樣，它可以從最新的逐字稿使用項目中回填稀疏的 token/cache 計數器以及執行時期模型標籤。

`gateway` 是僅限擁有者用於閘道操作的執行時期工具：

- 在編輯之前，用於一個路徑範圍的配置子樹 `config.schema.lookup`
- 用於目前的配置快照 + 雜湊 `config.get`
- 用於部分配置更新並重新啟動 `config.patch`
- 僅用於完整配置替換 `config.apply`
- 用於明確的自我更新並重新啟動 `update.run`

對於部分變更，建議先 `config.schema.lookup` 再 `config.patch`。僅當您有意替換整個配置時，才使用 `config.apply`。該工具也拒絕變更 `tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑。

### 外掛程式提供的工具

外掛程式可以註冊額外的工具。例如：

- [Diffs](/zh-Hant/tools/diffs) — 差異查看器和渲染器
- [LLM Task](/zh-Hant/tools/llm-task) — 用於結構化輸出的純 JSON LLM 步驟
- [Lobster](/zh-Hant/tools/lobster) — 具有可恢復審批的類型化工作流程運行時
- [Music Generation](/zh-Hant/tools/music-generation) — 共享的 `music_generate` 工具，具有工作流程支援的提供者
- [OpenProse](/zh-Hant/prose) — 以 markdown 為先的工作流程編排
- [Tokenjuice](/zh-Hant/tools/tokenjuice) — 緊湊的雜訊 `exec` 和 `bash` 工具結果

## 工具配置

### 允許和拒絕清單

透過組態中的 `tools.allow` / `tools.deny` 控制代理可以呼叫的工具。拒絕清單優先於允許清單。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具設定檔

`tools.profile` 在應用 `allow`/`deny` 之前設定基礎允許清單。
個別代理覆寫：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 無限制（與未設定相同）                                                                                                                            |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 僅限 `session_status`                                                                                                                             |

`coding` 和 `messaging` 設定檔也允許在外掛程式金鑰 `bundle-mcp` 下的已設定套件 MCP 工具。
當您希望設定檔保留其正常內建工具但隱藏所有已設定的 MCP 工具時，請新增 `tools.deny: ["bundle-mcp"]`。
`minimal` 設定檔不包含套件 MCP 工具。

### 工具群組

在允許/拒絕清單中使用 `group:*` 簡寫：

| 群組               | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution（`bash` 被接受為 `exec` 的別名）                                            |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有內建的 OpenClaw 工具（不包括外掛程式工具）                                                            |

`sessions_history` 會傳回一個受限且經過安全過濾的檢視。它會從助理文字中剝離
思考標籤、`<relevant-memories>` 支援結構、純文字工具呼叫 XML
承載（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）、
降級的工具呼叫支援結構、外洩的 ASCII/全形模型控制權杖，
以及格式錯誤的 MiniMax 工具呼叫 XML，然後套用
編輯/截斷和可能的超大行佔位符，而不是作為原始紀錄傾印。

### 提供者特定限制

使用 `tools.byProvider` 來限制特定提供者的工具，而無需
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
