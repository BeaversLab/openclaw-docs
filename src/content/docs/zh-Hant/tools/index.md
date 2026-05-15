---
summary: "OpenClaw 工具和外掛程式總覽：代理程式可以執行的操作以及如何擴展它"
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
  <Step title="Tools are what the agent calls">
    工具是代理程式可以調用的類型化函式（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 提供了一組**內建工具**，
    並且外掛程式可以註冊額外的工具。

    對於代理程式而言，工具是發送到模型 API 的結構化函式定義。

  </Step>

  <Step title="Skills teach the agent when and how">
    技能是注入到系統提示詞中的 Markdown 檔案（`SKILL.md`）。
    技能為代理程式提供了有效使用工具的背景、約束和逐步指導。
    技能存在於您的工作區、共用資料夾中，或隨外掛程式一起發行。

    [技能參考](/zh-Hant/tools/skills) | [建立技能](/zh-Hant/tools/creating-skills)

  </Step>

  <Step title="Plugins package everything together">
    外掛程式是一個可以註冊任何組合功能的套件：
    通道、模型提供者、工具、技能、語音、即時轉錄、
    即時語音、媒體理解、圖像生成、影片生成、
    網頁獲取、網頁搜尋等等。有些外掛程式是**核心**（隨
    OpenClaw 發行），其他則是**外部**（由社群在 npm 上發布）。

    [安裝和配置外掛程式](/zh-Hant/tools/plugin) | [建構您自己的外掛程式](/zh-Hant/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛程式即可使用：

| 工具                                       | 功能                                         | 頁面                                                          |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| `exec` / `process`                         | 執行 Shell 指令、管理背景程序                | [Exec](/zh-Hant/tools/exec)、[Exec 核准](/zh-Hant/tools/exec-approvals) |
| `code_execution`                           | 執行沙箱遠端 Python 分析                     | [程式碼執行](/zh-Hant/tools/code-execution)                        |
| `browser`                                  | 控制 Chromium 瀏覽器（導航、點擊、截圖）     | [瀏覽器](/zh-Hant/tools/browser)                                   |
| `web_search` / `x_search` / `web_fetch`    | 搜尋網路、搜尋 X 帖文、擷取頁面內容          | [網頁](/zh-Hant/tools/web)、[網頁擷取](/zh-Hant/tools/web-fetch)        |
| `read` / `write` / `edit`                  | 工作區中的檔案 I/O                           |                                                               |
| `apply_patch`                              | 多區塊檔案補丁                               | [套用補丁](/zh-Hant/tools/apply-patch)                             |
| `message`                                  | 透過所有頻道傳送訊息                         | [代理程式傳送](/zh-Hant/tools/agent-send)                          |
| `nodes`                                    | 探索並指定配對的裝置                         |                                                               |
| `cron` / `gateway`                         | 管理排程工作；檢查、修補、重新啟動或更新閘道 |                                                               |
| `image` / `image_generate`                 | 分析或生成圖像                               | [圖像生成](/zh-Hant/tools/image-generation)                        |
| `music_generate`                           | 生成音樂曲目                                 | [音樂生成](/zh-Hant/tools/music-generation)                        |
| `video_generate`                           | 生成影片                                     | [影片生成](/zh-Hant/tools/video-generation)                        |
| `tts`                                      | 一次性文字轉語音轉換                         | [TTS](/zh-Hant/tools/tts)                                          |
| `sessions_*` / `subagents` / `agents_list` | 對話管理、狀態和子代理協調                   | [子代理](/zh-Hant/tools/subagents)                                 |
| `session_status`                           | 輕量級 `/status` 風格的回讀與對話模型覆寫    | [對話工具](/zh-Hant/concepts/session-tool)                         |

針對圖像工作，請使用 `image` 進行分析，使用 `image_generate` 進行生成或編輯。如果您指定 `openai/*`、`google/*`、`fal/*` 或其他非預設的圖像提供者，請先設定該提供者的驗證/API 金鑰。

針對音樂工作，請使用 `music_generate`。如果您指定 `google/*`、`minimax/*` 或其他非預設的音樂提供者，請先設定該提供者的驗證/API 金鑰。

針對影片工作，請使用 `video_generate`。如果您指定 `qwen/*` 或其他非預設的影片提供者，請先設定該提供者的驗證/API 金鑰。

對於工作流程驅動的音訊生成，當像 ComfyUI 這樣的外掛程式註冊 `music_generate` 時，請使用它。這與 `tts` 不同，後者是文字轉語音。

`session_status` 是 sessions 群組中的輕量級狀態/回報工具。它回答關於目前會話的 `/status` 風格問題，並可選擇設定每個會話的模型覆寫；`model=default` 會清除該覆寫。與 `/status` 一樣，它可以從最新的逐字稿使用記錄中回填稀疏的 token/cache 計數器和活躍的執行時模型標籤。

`gateway` 是僅供擁有者使用的閘道操作執行時工具：

- 在編輯之前，用於單一路徑範圍配置子樹的 `config.schema.lookup`
- 用於目前配置快照 + 雜湊的 `config.get`
- 用於帶有重新啟動的部分配置更新的 `config.patch`
- 僅用於完整配置替換的 `config.apply`
- 用於明確自我更新 + 重新啟動的 `update.run`

對於部分變更，建議優先使用 `config.schema.lookup`，然後使用 `config.patch`。僅當您有意替換整個配置時，才使用 `config.apply`。若需更廣泛的配置文件，請閱讀 [Configuration](/zh-Hant/gateway/configuration) 和 [Configuration reference](/zh-Hant/gateway/configuration-reference)。該工具也拒絕變更 `tools.exec.ask` 或 `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑。

### 外掛程式提供的工具

外掛程式可以註冊其他工具。一些範例：

- [Canvas](/zh-Hant/plugins/reference/canvas) — 用於節點 Canvas 控制和 A2UI 渲染的實驗性套件外掛程式
- [Diffs](/zh-Hant/tools/diffs) — 差異檢視器和渲染器
- [LLM Task](/zh-Hant/tools/llm-task) — 用於結構化輸出的純 JSON LLM 步驟
- [Lobster](/zh-Hant/tools/lobster) — 具有可恢復核准的類型工作流程執行時
- [Music Generation](/zh-Hant/tools/music-generation) — 共享的 `music_generate` 工具，支援工作流程支援的提供者
- [OpenProse](/zh-Hant/prose) — 以 Markdown 為優先的工作流程編排
- [Tokenjuice](/zh-Hant/tools/tokenjuice) — 緊湊的雜訊 `exec` 和 `bash` 工具結果

外掛工具仍然是使用 `api.registerTool(...)` 編寫的，並在外掛清單的 `contracts.tools` 列表中聲明。OpenClaw 會在探索期間捕獲經過驗證的工具描述符，並根據外掛來源和契約進行快取，因此後續的工具規劃可以跳過外掛執行時的載入。工具執行仍然會載入擁有者外掛並調用即時註冊的實作。

## 工具配置

### 允許和拒絕列表

透過組態中的 `tools.allow` / `tools.deny` 控制代理可以調用哪些工具。拒絕始終優先於允許。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

當明確的允許列表解析為沒有可調用的工具時，OpenClaw 會以封閉式失敗處理。例如，`tools.allow: ["query_db"]` 只有在已載入的外掛實際註冊了 `query_db` 時才有效。如果沒有內建、外掛或捆綁的 MCP 工具符合允許列表，執行會在模型調用之前停止，而不是繼續作為可能會產生工具結果幻覺的純文字執行。

### 工具設定檔

`tools.profile` 在應用 `allow`/`deny` 之前設定一個基礎允許列表。
每個代理的覆寫：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 所有核心和可選的外掛工具；用於更廣泛的命令/控制存取的無限制基準                                                                                   |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 僅限 `session_status`                                                                                                                             |

<Note>`tools.profile: "messaging"` 專為針對頻道的代理程式刻意設計得較為狹隘。它排除了更廣泛的命令/控制工具，例如檔案系統、執行環境、瀏覽器、畫布、節點、cron 和閘道控制。請將 `tools.profile: "full"` 作為更廣泛命令/控制存取的無限制基準，然後在需要時使用 `tools.allow` / `tools.deny` 來修剪存取權限。</Note>

`coding` 包含輕量級網頁工具（`web_search`、`web_fetch`、`x_search`）
但不包含完整的瀏覽器控制工具。瀏覽器自動化可以驅動真實
工作階段和已登入的設定檔，因此請使用
`tools.alsoAllow: ["browser"]` 或針對每個代理程式的
`agents.list[].tools.alsoAllow: ["browser"]` 明確新增它。

<Note>在限制性設定檔（`messaging`、`minimal`）下設定 `tools.exec` 或 `tools.fs` 並不會隱含地擴大該設定檔的允許清單。當您希望限制性設定檔使用那些已設定的區段時，請新增明確的 `tools.alsoAllow` 項目（例如針對 exec 的 `["exec", "process"]`，或針對 fs 的 `["read", "write", "edit"]`）。當設定區段存在但沒有相符的 `alsoAllow` 授權時，OpenClaw 會記錄啟動警告。</Note>

`coding` 和 `messaging` 設定檔也允許在外掛程式金鑰 `bundle-mcp` 下使用已設定的套件 MCP 工具。
當您希望設定檔保留其正常的內建工具但隱藏所有已設定的 MCP 工具時，請新增 `tools.deny: ["bundle-mcp"]`。
`minimal` 設定檔不包含套件 MCP 工具。

範例（預設情況下最廣泛的工具介面）：

```json5
{
  tools: {
    profile: "full",
  },
}
```

### 工具群組

在允許/拒絕清單中使用 `group:*` 簡寫：

| 群組               | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec、process、code_execution（`bash` 被接受為 `exec` 的別名）                                            |
| `group:fs`         | read、write、edit、apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas 當內建的 Canvas 外掛已啟用時                                                              |
| `group:automation` | heartbeat_respond, cron, gateway                                                                          |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list, update_plan                                                                                  |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有內建的 OpenClaw 工具（不包含外掛工具）                                                                |

`sessions_history` 會回傳一個受限的、經過安全過濾的檢索視圖。它會從助理文字中移除思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包含 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）、降級的工具呼叫腳手架、外洩的 ASCII/全形模型控制權杖，以及格式錯誤的 MiniMax 工具呼叫 XML，然後套用編修/截斷和可能的超大列佔位符，而不是作為原始逐字稿傾印。

### 供應商特定限制

使用 `tools.byProvider` 來限制特定供應商的工具，而無需變更全域預設值：

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
