---
summary: "OpenClaw 如何區分模型提供者、模型、通道和 Agent 執行時"
title: "Agent 執行時"
read_when:
  - You are choosing between PI, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

**Agent 執行時**是擁有一個已準備模型迴圈的元件：它接收提示、驅動模型輸出、處理原生工具呼叫，並將完成的回合返回給 OpenClaw。

執行時容易與提供者混淆，因為兩者都出現在模型設定附近。它們是不同的層：

| 層           | 範例                                  | 含義                                              |
| ------------ | ------------------------------------- | ------------------------------------------------- |
| 提供者       | `openai`、`anthropic`、`openai-codex` | OpenClaw 如何進行驗證、探索模型以及命名模型參考。 |
| 模型         | `gpt-5.5`、`claude-opus-4-6`          | 為 Agent 回合選擇的模型。                         |
| Agent 執行時 | `pi`、`codex`、`claude-cli`           | 執行已準備回合的低層級迴圈或後端。                |
| 通道         | Telegram、Discord、Slack、WhatsApp    | 訊息進入和離開 OpenClaw 的地方。                  |

您也會在程式碼中看到 **harness** 一詞。Harness 是提供
agent runtime 的實作。例如，內建的 Codex harness 實作了
`codex` runtime。公開設定在 provider 或 model 項目上使用
`agentRuntime.id`；整個 agent 的 runtime 金鑰已被棄用且會被忽略。
`openclaw doctor --fix` 會移除舊的整個 agent runtime 固定設定，並在需要時將舊的
runtime model 參照重寫為正式的 provider/model 參照加上 model-scoped
runtime policy。

有兩個執行時系列：

- **Embedded harnesses** 在 OpenClaw 的準備好的 agent 迴圈內執行。目前這包含
  內建的 `pi` runtime 以及已註冊的 plugin harness，例如
  `codex`。
- **CLI backends** 執行本地 CLI 程序，同時保持 model 參照
  為正式格式。例如，`anthropic/claude-opus-4-7` 搭配
  model-scoped 的 `agentRuntime.id: "claude-cli"` 表示「選擇 Anthropic
  model，透過 Claude CLI 執行」。`claude-cli` 不是 embedded harness id
  且不得傳遞給 AgentHarness 選擇邏輯。

## Codex surfaces

大多數的混淆來自於幾個不同的介面共用 Codex 這個名稱：

| 介面                                         | OpenClaw 名稱/設定                   | 作用                                                                                       |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| 原生 Codex app-server runtime                | `openai/*` model 參照                | 透過 Codex app-server 執行 OpenAI embedded agent 週期。這是常見的 ChatGPT/Codex 訂閱設定。 |
| Codex OAuth auth profiles                    | `openai-codex` auth provider         | 儲存 Codex app-server harness 所使用的 ChatGPT/Codex 訂閱驗證資訊。                        |
| Codex ACP 介面卡                             | `runtime: "acp"`、`agentId: "codex"` | 透過外部 ACP/acpx 控制平面執行 Codex。僅在明確要求使用 ACP/acpx 時使用。                   |
| 原生 Codex chat-control 指令集               | `/codex ...`                         | 從聊天中綁定、恢復、導引、停止和檢查 Codex app-server 執行緒。                             |
| 用於非 agent 介面的 OpenAI Platform API 路由 | `openai/*` 加上 API-key 驗證         | 用於直接的 OpenAI API，例如圖片、嵌入、語音和即時通訊。                                    |

這些介面是有意設計為獨立的。啟用 `codex` plugin 可讓
原生 app-server 功能可用；`openclaw doctor --fix` 負責舊版
`openai-codex/*` 路由修復和過期 session 固定清理。為
agent model 選擇 `openai/*` 現在表示「透過 Codex 執行此操作」，除非正在使用
非 agent 的 OpenAI API 介面。

常見的 ChatGPT/Codex 訂閱設定使用 Codex OAuth 進行驗證，但將
模型參照保留為 `openai/*` 並選擇 `codex` 執行時：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

這意味著 OpenClaw 選擇一個 OpenAI 模型參照，然後要求 Codex 應用程式伺服器
執行時來執行內嵌的代理程式輪次。這並不意味著「使用 API 計費」，
也不代表通道、模型提供者目錄或 OpenClaw 工作階段儲存空間
會變成 Codex。

當啟用隨附的 `codex` 外掛程式時，自然語言 Codex 控制
應使用原生 `/codex` 指令介面（`/codex bind`、`/codex threads`、
`/codex resume`、`/codex steer`、`/codex stop`）而非 ACP。僅在使用者明確要求使用 ACP/acpx
或正在測試 ACP 介面卡路徑時，才對 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor
和類似的外部 harness 仍會使用 ACP。

這是 agent 導向的決策樹：

1. 如果使用者要求 **Codex bind/control/thread/resume/steer/stop**，請在啟用內建的 `codex` 外掛程式時，使用原生的 `/codex` 指令介面。
2. 如果使用者要求 **Codex 作為內嵌執行時** 或想要正常的
   訂閱支援的 Codex 代理程式體驗，請使用 `openai/<model>`。
3. 如果使用者明確選擇 **PI 用於 OpenAI 模型**，請將模型參照
   保留為 `openai/<model>` 並將提供者/模型執行時原則設定為
   `agentRuntime.id: "pi"`。選取的 `openai-codex` 驗證設定檔會透過
   PI 的舊版 Codex-auth 傳輸在內部進行路由。
4. 如果舊版設定檔仍包含 **`openai-codex/*` model refs**，請將其修復為
   `openai/<model>` 並使用 `openclaw doctor --fix`；doctor 會透過在舊 model ref
   隱含的地方新增提供者/模型範圍的 `agentRuntime.id: "codex"` 來保留 Codex
   驗證路由。
   舊版 **`codex-cli/*` model refs** 會修復至相同的 `openai/<model>` Codex
   app-server 路由；OpenClaw 不再維護捆綁的 Codex CLI 後端。
5. 如果使用者明確提到 **ACP**、**acpx** 或 **Codex ACP adapter**，請使用
   ACP 並搭配 `runtime: "acp"` 與 `agentId: "codex"`。
6. 如果請求是針對 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或
   其他外部套件**，請使用 ACP/acpx，而不是原生子代理程式執行時。

| 您的意思是……                           | 使用……                                     |
| -------------------------------------- | ------------------------------------------ |
| Codex 應用程式伺服器聊天/執行緒控制    | 來自捆綁的 `codex` 外掛程式的 `/codex ...` |
| Codex 應用程式伺服器內嵌代理程式執行時 | `openai/*` agent model refs                |
| OpenAI Codex OAuth                     | `openai-codex` auth profiles               |
| Claude Code 或其他外部套件             | ACP/acpx                                   |

關於 OpenAI 系列的前綴分割，請參閱 [OpenAI](/zh-Hant/providers/openai) 和
[Model providers](/zh-Hant/concepts/model-providers)。關於 Codex 執行時期支援
合約，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

## 執行時擁有權

不同的執行時擁有不同數量的迴圈控制權。

| 介面                  | OpenClaw PI 內嵌              | Codex 應用程式伺服器                              |
| --------------------- | ----------------------------- | ------------------------------------------------- |
| 模型迴圈擁有者        | 透過 PI 內嵌執行器的 OpenClaw | Codex 應用程式伺服器                              |
| 標準執行緒狀態        | OpenClaw 逐字稿               | Codex 執行緒，加上 OpenClaw 逐字稿鏡像            |
| OpenClaw 動態工具     | 原生 OpenClaw 工具迴圈        | 透過 Codex 介接器橋接                             |
| 原生 Shell 和檔案工具 | PI/OpenClaw 路徑              | Codex 原生工具，在支援的情況下透過原生 Hooks 橋接 |
| 語境引擎              | 原生 OpenClaw 語境組裝        | OpenClaw 將專案組裝的語境放入 Codex 迴圈          |
| 壓縮                  | OpenClaw 或選定的語境引擎     | Codex 原生壓縮，並附帶 OpenClaw 通知和鏡像維護    |
| 通道傳遞              | OpenClaw                      | OpenClaw                                          |

此種所有權劃分是主要的設計原則：

- 若 OpenClaw 擁有 Surface，OpenClaw 即可提供正常的 Plugin Hook 行為。
- 若原生 Runtime 擁有 Surface，OpenClaw 需要依賴 Runtime 事件或原生 Hooks。
- 若原生 Runtime 擁有標準執行緒狀態，OpenClaw 應該鏡像並投射語境，而非重寫不支援的內部細節。

## Runtime 選擇

OpenClaw 在解析 Provider 和 Model 之後選擇嵌入式 Runtime：

1. 模型範圍的執行時期政策優先。這可以存在於已設定的提供者
   模型項目中，或在 `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime` 中。像
   `agents.defaults.models["vllm/*"].agentRuntime` 這類的提供者萬用字元會在精確模型政策之後套用，
   因此動態探索到的提供者模型可以共享一個執行時期，而不會
   覆寫精確的每個模型例外。
2. 接下來是提供者範圍的執行時期政策，位於
   `models.providers.<provider>.agentRuntime`。
3. 在 `auto` 模式中，已註冊的外掛程式執行時期可以宣告支援的提供者/模型
   配對。
4. 如果在 `auto` 模式中沒有執行時期宣告回合，OpenClaw 會將 PI 作為
   相容性執行時期。當執行必須嚴格時，請使用明確的執行時期 ID。

全工作階段和全 Agent 的執行時期釘選會被忽略。這包括
`OPENCLAW_AGENT_RUNTIME`、工作階段 `agentHarnessId`/`agentRuntimeOverride` 狀態、
`agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。請執行
`openclaw doctor --fix` 以移除過時的全 Agent 執行時期設定，並轉換
舊版執行時期 model refs，前提是 OpenClaw 能保留其意圖。

明確指定的提供者/模型外掛程式執行時採取封閉式失敗（fail closed）。例如，提供者或模型上的 `agentRuntime.id: "codex"` 意味著 Codex 或明確的選擇/執行時錯誤；它絕不會被無靜默地路由回 PI。

CLI 後端別名與嵌入式 Harness ID 不同。首選的
Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

諸如 `claude-cli/claude-opus-4-7` 的舊版引用為了相容性仍受支援，但新設定應保持提供者/模型的標準形式，並將執行後端置於提供者/模型執行時原則中。

舊版 `codex-cli/*` 引用則不同：doctor 會將其遷移至 `openai/*`，使其透過 Codex app-server harness 執行，而非保留 Codex CLI 後端。

對於大多數提供者，`auto` 模式特意採取保守態度。OpenAI agent 模型是例外：未設定的執行時和 `auto` 都會解析為 Codex harness。明確的 PI 執行時設定仍然是 `openai/*` agent 回合的可選相容性路徑；當與選定的 `openai-codex` 驗證設定檔配對時，OpenClaw 會在內部透過舊版 Codex-auth 傳輸路由 PI，同時將公開模型引用保持為 `openai/*`。過時的 OpenAI PI session pin 會被執行時選擇忽略，並可使用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 警告指出 `codex` 外掛程式已啟用，但設定中仍存在 `openai-codex/*`，請將其視為舊版路由狀態。請執行 `openclaw doctor --fix` 將其重寫為帶有 Codex 執行時的 `openai/*`。

## 相容性合約

當執行時不是 PI 時，它應記錄其支援的 OpenClaw 介面。請使用此格式作為執行時文件：

| 問題                           | 為何重要                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| 誰擁有模型循環？               | 決定重試、工具繼續和最終答案決策發生的位置。                                                |
| 誰擁有標準執行緒歷史記錄？     | 決定 OpenClaw 可以編輯歷史記錄還是只能鏡像歷史記錄。                                        |
| OpenClaw 動態工具有效嗎？      | 訊息傳遞、sessions、cron 和 OpenClaw 擁有的工具依賴此功能。                                 |
| 動態工具掛鉤有效嗎？           | 外掛程式期望圍繞 OpenClaw 擁有的工具具備 `before_tool_call`、`after_tool_call` 和中介軟體。 |
| 原生工具掛鉤有效嗎？           | Shell、patch 和 runtime 擁有的工具需要原生的 hook 支援以進行策略和觀察。                    |
| Context 引擎生命週期是否運行？ | Memory 和 context 外掛程式依賴於組裝、攝取、輪詢後和壓縮的生命週期。                        |
| 暴露了哪些壓縮資料？           | 某些外掛程式只需要通知，而其他外掛程式則需要保留/丟棄的元資料。                             |
| 什麼是故意不支援的？           | 在原生 runtime 擁有更多狀態的情況下，使用者不應假設與 PI 等價。                             |

Codex runtime 支援合約記錄於
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

## 狀態標籤

狀態輸出可能會同時顯示 `Execution` 和 `Runtime` 標籤。請將其視為
診斷資訊，而非提供者名稱。

- 模型參考（例如 `openai/gpt-5.5`）會告訴您所選的提供者/模型。
- Runtime ID（例如 `codex`）會告訴您哪個迴圈正在執行該輪次。
- 頻道標籤（例如 Telegram 或 Discord）會告訴您對話發生的位置。

如果執行仍顯示非預期的 runtime，請先檢查所選的提供者/模型
runtime 原則。舊版會話 runtime 固定值不再決定路由。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [OpenAI](/zh-Hant/providers/openai)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Agent loop](/zh-Hant/concepts/agent-loop)
- [Models](/zh-Hant/concepts/models)
- [Status](/zh-Hant/cli/status)
