---
summary: "OpenClaw 如何區分模型供應商、模型、管道和 Agent 執行時"
title: "Agent 執行時"
read_when:
  - You are choosing between OpenClaw, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

**Agent 執行時**是擁有一個已準備模型迴圈的元件：它接收提示、驅動模型輸出、處理原生工具呼叫，並將完成的回合返回給 OpenClaw。

執行時容易與提供者混淆，因為兩者都出現在模型設定附近。它們是不同的層：

| 層           | 範例                                         | 含義                                              |
| ------------ | -------------------------------------------- | ------------------------------------------------- |
| 提供者       | `openai`, `anthropic`, `openai-codex`        | OpenClaw 如何進行驗證、探索模型以及命名模型參考。 |
| 模型         | `gpt-5.5`, `claude-opus-4-6`                 | 為 Agent 回合選擇的模型。                         |
| Agent 執行時 | `openclaw`, `codex`, `copilot`, `claude-cli` | 執行已準備回合的低層級迴圈或後端。                |
| 通道         | Telegram、Discord、Slack、WhatsApp           | 訊息進入和離開 OpenClaw 的地方。                  |

您也會在程式碼中看到 **harness** 這個詞。Harness 是提供 Agent 執行時的實作。例如，內建的 Codex harness 實作了 `codex` 執行時。公開設定在供應商或模型條目上使用 `agentRuntime.id`；整個 Agent 的執行時鍵值是舊版且已被忽略。`openclaw doctor --fix` 會移除舊的整個 Agent 執行時釘選，並在需要時將舊版執行時模型參照重寫為標準的供應商/模型參照，加上模型範圍的執行時策略。

有兩個執行時系列：

- **Embedded harnesses** 在 OpenClaw 的準備 Agent 迴圈內執行。目前這是內建的 `openclaw` 執行時加上註冊的外掛 harness，例如 `codex` 和 `copilot`。
- **CLI backends** 執行本機 CLI 程序，同時保持模型參照為標準格式。例如，`anthropic/claude-opus-4-8` 搭配模型範圍的 `agentRuntime.id: "claude-cli"` 意指「選擇 Anthropic 模型，透過 Claude CLI 執行」。`claude-cli` 不是一個 embedded harness ID，且不得傳遞給 AgentHarness 選擇。

`copilot` harness 是一個獨立的選用外掛 harness，專用於 GitHub Copilot CLI；請參閱 [GitHub Copilot agent runtime](/zh-Hant/plugins/copilot) 以了解 PI、Codex 和 GitHub Copilot agent runtime 之間的使用者層面決策。

## Codex 介面

大多數的混淆來自於數個不同的介面共用 Codex 這個名稱：

| 介面                                    | OpenClaw 名稱/設定                   | 作用                                                                                   |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| 原生 Codex app-server 執行時            | `openai/*` 模型參照                  | 透過 Codex app-server 執行 OpenAI 內建 Agent 輪次。這是一般的 ChatGPT/Codex 訂閱設定。 |
| Codex OAuth 設定檔                      | `openai-codex` 驗證提供者            | 儲存 Codex 應用程式伺服器套件使用的 ChatGPT/Codex 訂閱驗證。                           |
| Codex ACP 配接器                        | `runtime: "acp"`, `agentId: "codex"` | 透過外部 ACP/acpx 控制平面執行 Codex。僅在明確要求使用 ACP/acpx 時使用。               |
| 原生 Codex 聊天控制指令集               | `/codex ...`                         | 從聊天中綁定、恢復、導向、停止和檢查 Codex 應用程式伺服器執行緒。                      |
| 適用於非代理表面的 OpenAI 平台 API 路由 | `openai/*` 加上 API 金鑰驗證         | 用於直接的 OpenAI API，例如圖像、嵌入、語音和即時功能。                                |

這些表面是故意獨立的。啟用 `codex` 外掛程式可讓原生應用程式伺服器功能可供使用；`openclaw doctor --fix` 負責舊版 `openai-codex/*` 路由修復和過期會話 Pin 清理。目前為代理模型選擇 `openai/*` 意味著「透過 Codex 執行此操作」，除非正在使用非代理 OpenAI API 表面。

常見的 ChatGPT/Codex 訂閱設定使用 Codex OAuth 進行驗證，但將模型參照保持為 `openai/*` 並選擇 `codex` 執行時期：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

這意味著 OpenClaw 選擇一個 OpenAI 模型參照，然後要求 Codex 應用程式伺服器執行時期執行內嵌的代理回合。這並不意味著「使用 API 計費」，也不意味著管道、模型提供者目錄或 OpenClaw 會話儲存會變成 Codex。

當啟用內建的 `codex` 外掛程式時，自然語言 Codex 控制應該使用原生 `/codex` 指令表面 (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) 而非 ACP。僅當使用者明確要求 ACP/acpx 或正在測試 ACP 配接器路徑時，才針對 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 和類似的外部套件仍使用 ACP。

這是面向代理的決策樹：

1. 如果用戶要求 **Codex bind/control/thread/resume/steer/stop**，當啟用內建的 `codex` 外掛程式時，請使用原生的 `/codex` 指令介面。
2. 如果用戶要求 **Codex 作為嵌入式執行時** 或想要一般的訂閱支援 Codex 代理程式體驗，請使用 `openai/<model>`。
3. 如果用戶明確選擇 **OpenClaw 用於 OpenAI 模型**，請將模型參照保持為 `openai/<model>`，並將提供者/模型執行時原則設定為 `agentRuntime.id: "openclaw"`。選取的 `openai-codex` 驗證設定檔會透過 OpenClaw 的 Codex-auth 傳輸層在內部進行路由。
4. 如果舊版設定仍包含 **`openai-codex/*` model refs**，請使用 `openclaw doctor --fix` 將其修復為 `openai/<model>`；doctor 會透過在舊模型參照隱含的地方新增提供者/模型範圍的 `agentRuntime.id: "codex"`，來保留 Codex 驗證路由。舊版 **`codex-cli/*` model refs** 會修復至相同的 `openai/<model>` Codex 應用程式伺服器路由；OpenClaw 不再保留內建的 Codex CLI 後端。
5. 如果用戶明確提到 **ACP**、**acpx** 或 **Codex ACP adapter**，請使用 ACP 搭配 `runtime: "acp"` 和 `agentId: "codex"`。
6. 如果請求是針對 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或其他外部套件**，請使用 ACP/acpx，而非原生子代理程式執行時。

| 您的意思是...                            | 使用...                                  |
| ---------------------------------------- | ---------------------------------------- |
| Codex 應用程式伺服器聊天/執行緒控制      | 來自內建 `codex` 外掛程式的 `/codex ...` |
| Codex 應用程式伺服器嵌入式代理程式執行時 | `openai/*` 代理程式模型參照              |
| OpenAI Codex OAuth                       | `openai-codex` 驗證設定檔                |
| Claude Code 或其他外部套件               | ACP/acpx                                 |

關於 OpenAI 系列前置詞的區分，請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Model providers](/zh-Hant/concepts/model-providers)。關於 Codex 執行時支援合約，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

## 執行時所有權

不同的執行時擁有不同程度的迴圈控制權。

| 介面                  | OpenClaw 內建                     | Codex 應用程式伺服器                              |
| --------------------- | --------------------------------- | ------------------------------------------------- |
| 模型迴圈擁有者        | OpenClaw 透過 OpenClaw 內建執行器 | Codex 應用程式伺服器                              |
| Canonical 執行緒狀態  | OpenClaw 逐字稿                   | Codex 執行緒，加上 OpenClaw 逐字稿鏡像            |
| OpenClaw 動態工具     | 原生 OpenClaw 工具迴圈            | 透過 Codex 配接器橋接                             |
| 原生 shell 和檔案工具 | OpenClaw 路徑                     | Codex 原生工具，在支援的情況下透過原生 hooks 橋接 |
| Context 引擎          | 原生 OpenClaw context 組裝        | OpenClaw 將專案組裝的 context 投射到 Codex 回合中 |
| 壓縮                  | OpenClaw 或選定的 context 引擎    | Codex 原生壓縮，並附帶 OpenClaw 通知和鏡像維護    |
| 管道傳遞              | OpenClaw                          | OpenClaw                                          |

此所有權劃分是主要設計規則：

- 如果 OpenClaw 擁有該介面，OpenClaw 可以提供正常的 plugin hook 行為。
- 如果原生 runtime 擁有該介面，OpenClaw 需要 runtime 事件或原生 hooks。
- 如果原生 runtime 擁有 Canonical 執行緒狀態，OpenClaw 應鏡像並投射 context，而非重寫不支援的內部機制。

## Runtime 選擇

OpenClaw 在解析提供者和模型後選擇一個內嵌 runtime：

1. 模型範圍的 runtime 原則優先。這可以位於已設定的提供者模型條目中或
   `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime` 中。提供者萬用字元
   例如 `agents.defaults.models["vllm/*"].agentRuntime` 會在精確
   模型原則之後套用，因此動態探索的提供者模型可以共用一個
   runtime 而不覆寫精確的各個模型例外。
2. 提供者範圍的 runtime 原則接下來套用於
   `models.providers.<provider>.agentRuntime`。
3. 在 `auto` 模式下，已註冊的 plugin runtime 可以宣告支援的提供者/模型
   配對。
4. 如果在 `auto` 模式下沒有 runtime 宣告某個回合，OpenClaw 會使用 `openclaw` 作為
   相容性 runtime。當執行必須嚴格時，請使用明確的 runtime id。

全階段和全 agent 的 runtime 固定會被忽略。這包括
`OPENCLAW_AGENT_RUNTIME`、階段 `agentHarnessId`/`agentRuntimeOverride` 狀態、
`agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。執行
`openclaw doctor --fix` 以移除陳舊的全 agent runtime 設定，並轉換
遺留 runtime 模型參照，其中 OpenClaw 可以保留意圖。

明確指定的提供者/模型插件運行時採用封閉式失敗策略。例如，在提供者或模型上使用 `agentRuntime.id: "codex"` 意味著使用 Codex 或導致明確的選擇/運行時錯誤；它絕不會被靜默路由回 OpenClaw。

CLI 後端別名與嵌入式 harness ID 不同。首選的 Claude CLI 形式為：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-8",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

諸如 `claude-cli/claude-opus-4-7` 的舊版引用為了相容性仍受支援，但新配置應保持提供者/模型的規範性，並將執行後端置於提供者/模型運行時策略中。

舊版 `codex-cli/*` 引用則有所不同：doctor 會將其遷移至 `openai/*`，以便它們透過 Codex app-server harness 執行，而不是保留 Codex CLI 後端。

`auto` 模式對大多數提供者而言是刻意保守的。OpenAI 代理模型是例外：未設定的運行時和 `auto` 都會解析為 Codex harness。明確的 OpenClaw 運行時配置仍然是 `openai/*` 代理回合的可選相容性途徑；當與選定的 `openai-codex` 驗證配置檔案配對時，OpenClaw 會在內部透過 Codex-auth 傳輸路由該路徑，同時將公開模型引用保持為 `openai/*`。過時的 OpenAI 運行時會話釘選會被運行時選擇忽略，並可使用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 警告啟用了 `codex` 插件但配置中仍保留 `openai-codex/*`，請將其視為舊版路由狀態。請執行 `openclaw doctor --fix` 將其重寫為帶有 Codex 運行時的 `openai/*`。

## GitHub Copilot 代理運行時

隨附的 `copilot` 擴充功能註冊了一個可選的 `copilot` 運行時，該運行時由 GitHub Copilot CLI (`@github/copilot-sdk`) 支援。它聲稱擁有規範的訂閱 `github-copilot` 提供者，並且 **絕不** 會被 `auto` 選中。可透過 `agentRuntime.id` 針對每個模型或每個提供者選擇加入：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

駝具在 `extensions/copilot/doctor-contract-api.ts` 中聲明其提供者、執行時、CLI 會話金鑰和驗證設定檔前綴，而 `openclaw doctor` 會自動載入該檔案。關於組態、驗證、對話記錄鏡像、壓縮、doctor probe 介面，以及更廣泛的 PI vs Codex vs Copilot SDK 決策，請參閱 [GitHub Copilot agent runtime](/zh-Hant/plugins/copilot)。

## 相容性合約

當執行時不是 OpenClaw 時，它應記錄其支援的 OpenClaw 介面。請使用此格式作為執行時文件：

| 問題                        | 重要性                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| 誰擁有模型循環？            | 決定重試、工具延續和最終答案決策發生的位置。                                              |
| 誰擁有標準執行緒歷史？      | 決定 OpenClaw 是可以編輯歷史還是只能鏡像歷史。                                            |
| OpenClaw 動態工具是否運作？ | 訊息傳遞、會話、cron 和 OpenClaw 擁有的工具皆依賴此功能。                                 |
| 動態工具掛勾是否運作？      | 外掛程式期望 `before_tool_call`、`after_tool_call` 以及圍繞 OpenClaw 擁有工具的中介軟體。 |
| 原生工具掛勾是否運作？      | Shell、修補和執行時擁有的工具需要原生掛勾支援以進行政策和觀測。                           |
| 內容引擎生命週期是否運行？  | 記憶體和內容外掛程式依賴組裝、攝取、回合後和壓縮生命週期。                                |
| 揭露了什麼壓縮資料？        | 某些外掛程式只需要通知，而其他外掛程式則需要保留/丟棄的中繼資料。                         |
| 什麼是有意不支援的？        | 在原生執行時擁有更多狀態的情況下，使用者不應假設與 OpenClaw 等效。                        |

Codex 執行時支援合約記錄於
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

## 狀態標籤

狀態輸出可能會同時顯示 `Execution` 和 `Runtime` 標籤。請將它們視為診斷訊息，而非提供者名稱。

- 模型參照（例如 `openai/gpt-5.5`）會告訴您選取的提供者/模型。
- 執行時 ID（例如 `codex`）會告訴您哪個循環正在執行該回合。
- 頻道標籤（例如 Telegram 或 Discord）會告訴您對話發生的位置。

如果執行仍顯示非預期的執行時，請先檢查選取的提供者/模型執行時政策。舊版會話執行時固定釘選不再決定路由。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [GitHub Copilot agent runtime](/zh-Hant/plugins/copilot)
- [OpenAI](/zh-Hant/providers/openai)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Agent loop](/zh-Hant/concepts/agent-loop)
- [Models](/zh-Hant/concepts/models)
- [Status](/zh-Hant/cli/status)
