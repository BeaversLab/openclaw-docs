---
summary: "OpenClaw 工具和外掛概覽：代理人可以執行哪些操作以及如何進行擴充"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "工具和外掛程式"
---

Agent 除了生成文字之外的所有動作都是透過 **工具** 進行的。
工具是 Agent 讀取檔案、執行指令、瀏覽網頁、傳送
訊息以及與裝置互動的方式。

## 工具、技能和外掛程式

OpenClaw 有三個協同運作的層級：

<Steps>
  <Step title="工具是 Agent 呼叫的物件">
    工具是 Agent 可以叫用的具型別函式（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 附帶一組 **內建工具**，
    而外掛程式可以註冊額外的工具。

    Agent 將工具視為傳送至模型 API 的結構化函式定義。

  </Step>

  <Step title="技能教導 Agent 何時以及如何使用">
    技能是注入到系統提示詞中的 Markdown 檔案（`SKILL.md`）。
    技能為 Agent 提供有效使用工具的背景、限制和逐步指引。
    技能存在於您的工作區、共用的資料夾中，或隨外掛程式一起發布。

    [技能參考](/zh-Hant/tools/skills) | [建立技能](/zh-Hant/tools/creating-skills)

  </Step>

  <Step title="外掛程式將所有內容包裝在一起">
    外掛程式是可以註冊任何功能組合的套件：
    頻道、模型提供者、工具、技能、語音、即時轉錄、
    即時語音、媒體理解、圖像生成、視訊生成、
    網頁擷取、網頁搜尋等等。有些外掛程式是 **核心**（隨 OpenClaw 附帶），
    其他則是 **外部**（由社群在 npm 上發布）。

    [安裝和設定外掛程式](/zh-Hant/tools/plugin) | [建置您自己的外掛程式](/zh-Hant/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛程式即可使用：

| 工具                                       | 功能                                         | 頁面                                                          |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| `exec` / `process`                         | 執行 Shell 指令、管理背景程序                | [Exec](/zh-Hant/tools/exec)、[Exec 核准](/zh-Hant/tools/exec-approvals) |
| `code_execution`                           | 執行沙箱遠端 Python 分析                     | [代碼執行](/zh-Hant/tools/code-execution)                          |
| `browser`                                  | 控制 Chromium 瀏覽器（導航、點擊、截圖）     | [瀏覽器](/zh-Hant/tools/browser)                                   |
| `web_search` / `x_search` / `web_fetch`    | 搜尋網路、搜尋 X 帖文、擷取頁面內容          | [網路](/zh-Hant/tools/web), [網路擷取](/zh-Hant/tools/web-fetch)        |
| `read` / `write` / `edit`                  | 工作區中的檔案 I/O                           |                                                               |
| `apply_patch`                              | 多區塊檔案補丁                               | [套用補丁](/zh-Hant/tools/apply-patch)                             |
| `message`                                  | 透過所有頻道傳送訊息                         | [代理程式傳送](/zh-Hant/tools/agent-send)                          |
| `canvas`                                   | 驅動節點畫布（呈現、評估、快照）             |                                                               |
| `nodes`                                    | 探索並指定配對裝置                           |                                                               |
| `cron` / `gateway`                         | 管理排程工作；檢查、修補、重新啟動或更新閘道 |                                                               |
| `image` / `image_generate`                 | 分析或生成圖像                               | [圖像生成](/zh-Hant/tools/image-generation)                        |
| `music_generate`                           | 生成音樂曲目                                 | [音樂生成](/zh-Hant/tools/music-generation)                        |
| `video_generate`                           | 生成影片                                     | [影片生成](/zh-Hant/tools/video-generation)                        |
| `tts`                                      | 一次性文字轉語音轉換                         | [TTS](/zh-Hant/tools/tts)                                          |
| `sessions_*` / `subagents` / `agents_list` | 工作階段管理、狀態和子代理程式編排           | [子代理程式](/zh-Hant/tools/subagents)                             |
| `session_status`                           | 輕量級 `/status` 風格回放和工作階段模型覆寫  | [工作階段工具](/zh-Hant/concepts/session-tool)                     |

對於圖像工作，使用 `image` 進行分析，使用 `image_generate` 進行生成或編輯。如果您目標是 `openai/*`、`google/*`、`fal/*` 或其他非預設圖像提供者，請先配置該提供者的 auth/API 金鑰。

對於音樂工作，使用 `music_generate`。如果您目標是 `google/*`、`minimax/*` 或其他非預設音樂提供者，請先配置該提供者的 auth/API 金鑰。

對於影片工作，使用 `video_generate`。如果您目標是 `qwen/*` 或其他非預設影片提供者，請先配置該提供者的 auth/API 金鑰。

對於工作流程驅動的音訊生成，當 ComfyUI 等外掛程式註冊 `music_generate` 時請使用它。這與 `tts` 分開，後者是文字轉語音。

`session_status` 是會議群組中的輕量級狀態/回讀工具。它回答關於當前會議的 `/status` 樣式問題，並可選擇設定每個會議的模型覆寫；`model=default` 清除該覆寫。像 `/status` 一樣，它可以從最新的逐字稿使用記錄中回填稀疏的 token/快取計數器和活動運行時模型標籤。

`gateway` 是僅限擁有者用於閘道操作的運行時工具：

- `config.schema.lookup` 用於編輯前的一個路徑範圍配置子樹
- `config.get` 用於當前配置快照 + 雜湊
- `config.patch` 用於需要重新啟動的部分配置更新
- `config.apply` 僅用於完整配置替換
- `update.run` 用於顯式自我更新 + 重新啟動

對於部分變更，優先使用 `config.schema.lookup` 然後使用 `config.patch`。僅在您有意替換整個設定時才使用 `config.apply`。
如需更廣泛的設定文件，請閱讀 [Configuration](/zh-Hant/gateway/configuration) 和
[Configuration reference](/zh-Hant/gateway/configuration-reference)。
此工具也拒絕變更 `tools.exec.ask` 或 `tools.exec.security`；
舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑。

### 外掛程式提供的工具

外掛程式可以註冊額外的工具。一些範例：

- [Diffs](/zh-Hant/tools/diffs) — 差異檢視器和渲染器
- [LLM Task](/zh-Hant/tools/llm-task) — 用於結構化輸出的純 JSON LLM 步驟
- [Lobster](/zh-Hant/tools/lobster) — 具有可恢復核准功能的型別工作流程執行階段
- [Music Generation](/zh-Hant/tools/music-generation) — 共享的 `music_generate` 工具，搭配工作流程支援的提供者
- [OpenProse](/zh-Hant/prose) — 以 markdown 為優先的工作流程協調
- [Tokenjuice](/zh-Hant/tools/tokenjuice) — 緊湊的嘈雜 `exec` 和 `bash` 工具結果

## 工具配置

### 允許和拒絕列表

透過設定中的 `tools.allow` / `tools.deny` 控製代理程式可以呼叫的工具。拒絕清單的優先順序總是高於允許清單。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

當明確的允許清單解析為沒有可呼叫工具時，OpenClaw 會以封閉式失敗 (fail closed) 處理。
例如，`tools.allow: ["query_db"]` 只有在載入的外掛程式實際
註冊 `query_db` 時才有效。如果沒有內建、外掛程式或內建的 MCP 工具符合
允許清單，執行會在模型呼叫之前停止，而不是繼續作為可能
會產生工具結果幻覺的純文字執行。

### 工具設定檔

`tools.profile` 在套用 `allow`/`deny` 之前設定基礎允許清單。
每個代理程式的覆寫：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 無限制（與未設定相同）                                                                                                                            |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 僅 `session_status`                                                                                                                               |

`coding` 包含輕量級網路工具（`web_search`、`web_fetch`、`x_search`）
但不包含完整的瀏覽器控制工具。瀏覽器自動化可以驅動真實
會話和已登入的設定檔，因此請使用
`tools.alsoAllow: ["browser"]` 或個別 Agent 的
`agents.list[].tools.alsoAllow: ["browser"]` 明確新增它。

`coding` 和 `messaging` 設定檔也允許在插件鍵 `bundle-mcp` 下使用已配置的套件 MCP 工具。
當您希望設定檔保留其正常的內建工具但隱藏所有已配置的 MCP 工具時，請新增 `tools.deny: ["bundle-mcp"]`。
`minimal` 設定檔不包含套件 MCP 工具。

### 工具群組

在允許/拒絕清單中使用 `group:*` 簡寫：

| 群組               | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec、process、code_execution（`bash` 被接受為 `exec` 的別名）                                            |
| `group:fs`         | read、write、edit、apply_patch                                                                            |
| `group:sessions`   | sessions_list、sessions_history、sessions_send、sessions_spawn、sessions_yield、subagents、session_status |
| `group:memory`     | memory_search、memory_get                                                                                 |
| `group:web`        | web_search、x_search、web_fetch                                                                           |
| `group:ui`         | browser、canvas                                                                                           |
| `group:automation` | cron、gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有內建的 OpenClaw 工具（不包括外掛程式工具）                                                            |

`sessions_history` 返回一個有界的、經過安全過濾的回顧視圖。它會從助理文字中剝離思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊）、降級的工具呼叫腳手架、洩漏的 ASCII/全形模型控制權杖以及格式錯誤的 MiniMax 工具呼叫 XML，然後應用編修/截斷和可能的超大行佔位符，而不是作為原始轉錄檔傾印。

### 提供者特定的限制

使用 `tools.byProvider` 來限制特定提供者的工具，而無需更改全域預設值：

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
