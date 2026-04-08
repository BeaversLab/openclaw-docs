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

  <Step title="技能教導代理程式何時與如何">
    技能是一個注入到系統提示詞中的 markdown 檔案 (`SKILL.md`)。
    技能為代理程式提供了有效使用工具的背景、限制和逐步指導。
    技能存在於您的工作區、共享資料夾中，或隨插件打包發布。

    [技能參考](/en/tools/skills) | [建立技能](/en/tools/creating-skills)

  </Step>

  <Step title="插件將所有內容打包在一起">
    插件是一個可以註冊任何功能組合的套件：
    頻道、模型提供者、工具、技能、語音、即時轉錄、
    即時語音、媒體理解、影像生成、影片生成、
    網路擷取、網路搜尋等等。有些插件是 **核心** 的（隨 OpenClaw 附帶），
    其他則是 **外部** 的（由社群在 npm 上發布）。

    [安裝並配置插件](/en/tools/plugin) | [建立您自己的插件](/en/plugins/building-plugins)

  </Step>
</Steps>

## 內建工具

這些工具隨 OpenClaw 附帶，無需安裝任何外掛即可使用：

| 工具                                       | 功能說明                                     | 頁面                                           |
| ------------------------------------------ | -------------------------------------------- | ---------------------------------------------- |
| `exec` / `process`                         | 執行 Shell 指令，管理背景程序                | [Exec](/en/tools/exec)                         |
| `code_execution`                           | 執行沙盒化遠端 Python 分析                   | [Code Execution](/en/tools/code-execution)     |
| `browser`                                  | 控制 Chromium 瀏覽器（導航、點擊、截圖）     | [Browser](/en/tools/browser)                   |
| `web_search` / `x_search` / `web_fetch`    | 搜尋網路、搜尋 X 帖文、擷取頁面內容          | [Web](/en/tools/web)                           |
| `read` / `write` / `edit`                  | 工作區內的檔案 I/O                           |                                                |
| `apply_patch`                              | 多區塊檔案修補                               | [Apply Patch](/en/tools/apply-patch)           |
| `message`                                  | 跨所有頻道傳送訊息                           | [Agent Send](/en/tools/agent-send)             |
| `canvas`                                   | 驅動節點 Canvas (呈現、評估、快照)           |                                                |
| `nodes`                                    | 發現並指定配對裝置                           |                                                |
| `cron` / `gateway`                         | 管理排程工作；檢查、修補、重新啟動或更新閘道 |                                                |
| `image` / `image_generate`                 | 分析或生成圖片                               | [Image Generation](/en/tools/image-generation) |
| `music_generate`                           | 生成音樂曲目                                 | [Music Generation](/en/tools/music-generation) |
| `video_generate`                           | 生成影片                                     | [Video Generation](/en/tools/video-generation) |
| `tts`                                      | 一次性文字轉語音轉換                         | [TTS](/en/tools/tts)                           |
| `sessions_*` / `subagents` / `agents_list` | 會話管理、狀態和子代理程式協調               | [Sub-agents](/en/tools/subagents)              |
| `session_status`                           | 輕量級 `/status` 風格的回放與會話模型覆蓋    | [Session Tools](/en/concepts/session-tool)     |

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

- [Lobster](/en/tools/lobster) — 具有可恢復審批功能的型別化工作流程執行環境
- [LLM Task](/en/tools/llm-task) — 用於結構化輸出的純 JSON LLM 步驟
- [Music Generation](/en/tools/music-generation) — 具有工作流程支援提供者的共享 `music_generate` 工具
- [Diffs](/en/tools/diffs) — 差異查看器和渲染器
- [OpenProse](/en/prose) — 以 markdown 為主的工作流程編排

## 工具配置

### 允許和拒絕列表

透過設定中的 `tools.allow` / `tools.deny` 控制代理程式可以呼叫的工具。拒絕規則的優先順序始終高於允許規則。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具設定檔

`tools.profile` 在應用 `allow`/`deny` 之前設定一個基礎允許列表。
每個代理程式的覆寫設定：`agents.list[].tools.profile`。

| 設定檔      | 包含內容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 無限制（等同於未設定）                                                                                                                            |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 僅限 `session_status`                                                                                                                             |

### 工具群組

在允許/拒絕列表中使用 `group:*` 簡寫：

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
| `group:openclaw`   | 所有內建 OpenClaw 工具（不包括外掛程式工具）                                                              |

`sessions_history` 傳回有界的、經過安全過濾的檢索視圖。它會從助理文字中移除思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊）、降級的工具呼叫腳手架、外洩的 ASCII/全形模型控制權杖以及格式錯誤的 MiniMax 工具呼叫 XML，然後套用編輯/截斷以及可能的超大行佔位符，而不是作為原始記錄傾印。

### 供應商特定限制

使用 `tools.byProvider` 來限制特定供應商的工具，而不變更全域預設值：

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
