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

您還會在程式碼中看到 **harness** 這個詞。Harness 是提供 Agent 執行時的實作。例如，內建的 Codex harness 實作了 `codex` 執行時。公開設定使用 `agentRuntime.id`；`openclaw
doctor --fix` 會將較舊的 runtime-policy 金鑰重寫為該格式。

有兩個執行時系列：

- **Embedded harnesses** 在 OpenClaw 已準備的 Agent 迴圈內執行。目前這是內建的 `pi` 執行時加上已註冊的外掛 harness，例如 `codex`。
- **CLI backends** 執行本機 CLI 程序，同時保持模型參考為標準格式。例如，`anthropic/claude-opus-4-7` 搭配 `agentRuntime.id: "claude-cli"` 表示「選取 Anthropic 模型，透過 Claude CLI 執行」。`claude-cli` 不是一個 embedded harness ID，不得傳遞給 AgentHarness 選擇。

## 三個命名為 Codex 的東西

大多數混淆來自於三個不同的介面共用 Codex 這個名稱：

| 介面                                               | OpenClaw 名稱/設定                   | 作用                                                                            |
| -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Codex OAuth 提供者路由                             | `openai-codex/*` 模型參考            | 透過正常的 OpenClaw PI 執行器使用 ChatGPT/Codex 訂閱 OAuth。                    |
| 原生 Codex app-server 執行期                       | `agentRuntime.id: "codex"`           | 透過隨附的 Codex app-server harness 執行嵌入式 agent 週期。                     |
| Codex ACP 介面卡                                   | `runtime: "acp"`, `agentId: "codex"` | 透過外部 ACP/acpx 控制平面執行 Codex。僅在明確要求使用 ACP/acpx 時使用。        |
| 原生 Codex chat-control 指令集                     | `/codex ...`                         | 從聊天中綁定、恢復、導引、停止和檢查 Codex app-server 執行緒。                  |
| 用於 GPT/Codex 樣式模型的 OpenAI Platform API 路由 | `openai/*` 模型參考                  | 使用 OpenAI API 金鑰驗證，除非執行期覆寫（例如 `runtime: "codex"`）執行該週期。 |

這些介面是有意設計為獨立的。啟用 `codex` 外掛程式會讓原生 app-server 功能可供使用；它不會將
`openai-codex/*` 重寫為 `openai/*`，不會變更現有工作階段，也不會
將 ACP 設為 Codex 的預設值。選取 `openai-codex/*` 表示「使用 Codex
OAuth 提供者路由」，除非您另外強制指定執行期。

常見的 Codex 設定會使用 `openai` 提供者與 `codex` 執行期：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

這表示 OpenClaw 選取 OpenAI 模型參考，然後要求 Codex app-server
執行期執行嵌入式 agent 週期。這不代表通道、模型
提供者目錄或 OpenClaw 工作階段存放區會變成 Codex。

當啟用隨附的 `codex` 外掛程式時，自然語言 Codex 控制
應使用原生 `/codex` 指令介面（`/codex bind`、`/codex threads`、
`/codex resume`、`/codex steer`、`/codex stop`）而非 ACP。僅在使用者明確要求使用 ACP/acpx
或正在測試 ACP 介面卡路徑時，才對 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor
和類似的外部 harness 仍會使用 ACP。

這是 agent 導向的決策樹：

1. 如果使用者要求 **Codex bind/control/thread/resume/steer/stop**，請在啟用內建的 `codex` 外掛程式時，使用原生的 `/codex` 指令介面。
2. 如果使用者要求 **Codex 作為嵌入式執行時環境**，請搭配 `agentRuntime.id: "codex"` 使用 `openai/<model>`。
3. 如果使用者在一般的 OpenClaw 執行器上要求 **Codex OAuth/subscription auth**，請使用 `openai-codex/<model>` 並將執行時環境保留為 PI。
4. 如果使用者明確提到 **ACP**、**acpx** 或 **Codex ACP adapter**，請搭配 `runtime: "acp"` 和 `agentId: "codex"` 使用 ACP。
5. 如果請求是針對 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或其他外部套件**，請使用 ACP/acpx，而非原生子代理程式執行時環境。

| 您的意思是...                           | 請使用...                                |
| --------------------------------------- | ---------------------------------------- |
| Codex app-server chat/thread control    | 來自內建 `codex` 外掛程式的 `/codex ...` |
| Codex app-server embedded agent runtime | `agentRuntime.id: "codex"`               |
| PI 執行器上的 OpenAI Codex OAuth        | `openai-codex/*` 模型參照                |
| Claude Code 或其他外部套件              | ACP/acpx                                 |

關於 OpenAI 系列前綴的區分，請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [模型提供者](/zh-Hant/concepts/model-providers)。關於 Codex 執行時環境支援合約，請參閱 [Codex 套件](/zh-Hant/plugins/codex-harness#v1-support-contract)。

## 執行時環境擁有權

不同的執行時環境擁有不同數量的迴圈。

| 介面                  | OpenClaw PI embedded               | Codex app-server                                 |
| --------------------- | ---------------------------------- | ------------------------------------------------ |
| 模型迴圈擁有者        | 透過 PI embedded 執行器的 OpenClaw | Codex app-server                                 |
| 標準執行緒狀態        | OpenClaw 轉錄                      | Codex 執行緒，加上 OpenClaw 轉錄鏡像             |
| OpenClaw 動態工具     | 原生 OpenClaw 工具迴圈             | 透過 Codex 轉接器橋接                            |
| 原生 Shell 和檔案工具 | PI/OpenClaw 路徑                   | Codex 原生工具，在支援的情況下透過原生攔截器橋接 |
| 內容引擎              | 原生 OpenClaw 內容組裝             | OpenClaw 將專案組裝的內容放入 Codex 回合中       |
| 壓縮                  | OpenClaw 或選定的內容引擎          | Codex 原生壓縮，並包含 OpenClaw 通知和鏡像維護   |
| 管道傳遞              | OpenClaw                           | OpenClaw                                         |

此擁有權區分是主要設計原則：

- 如果 OpenClaw 擁有表面控制權，OpenClaw 即可提供正常的插件掛鉤行為。
- 如果原生執行時擁有表面控制權，OpenClaw 需要執行時事件或原生掛鉤。
- 如果原生執行時擁有標準的線程狀態，OpenClaw 應鏡像並投射上下文，而不是重寫不支援的內部結構。

## 執行時選擇

OpenClaw 在解析供應商和模型之後選擇嵌入式執行時：

1. 會話記錄的執行時優先。配置變更不會將現有
   轉錄熱切換到不同的原生線程系統。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 強制新會話或重置後的會話使用該執行時。
3. `agents.defaults.agentRuntime.id` 或 `agents.list[].agentRuntime.id` 可以設定
   `auto`、`pi`、註冊的嵌入式 harness ID（例如 `codex`），或
   支援的 CLI 後端別名（例如 `claude-cli`）。
4. 在 `auto` 模式下，註冊的插件執行時可以認領支援的供應商/模型
   配對。
5. 如果在 `auto` 模式下沒有執行時認領輪次，並且設定了 `fallback: "pi"`
   （預設值），OpenClaw 將使用 PI 作為相容性後備方案。設定
   `fallback: "none"` 可以改為讓不匹配的 `auto` 模式選擇失敗。

顯式指定的插件執行時預設會以失敗封閉。例如，
`runtime: "codex"` 表示 Codex 或明確的選擇錯誤，除非您在同一個覆蓋範圍內設定
`fallback: "pi"`。執行時覆蓋不會繼承
更廣泛的後備設定，因此代理層級的 `runtime: "codex"` 不會僅因預設值使用了 `fallback: "pi"` 而被靜默
路由回 PI。

CLI 後端別名與嵌入式 harness ID 不同。首選的
Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

舊式引用（如 `claude-cli/claude-opus-4-7`）仍為了
相容性而獲得支援，但新配置應保持供應商/模型的標準形式，並將
執行後端置於 `agentRuntime.id` 中。

`auto` 模式是有意保守的。外掛程式執行時可以聲明它們理解的提供者/模型配對，但 Codex 外掛程式不會在 `auto` 模式下聲明 `openai-codex` 提供者。這能將 `openai-codex/*` 保留為明確的 PI Codex OAuth 路由，並避免將訂閱驗證配置無聲地移動到原生應用程式伺服器綁定上。

如果 `openclaw doctor` 警告在 `openai-codex/*` 仍透過 PI 路由時啟用了 `codex` 外掛程式，請將其視為診斷，而不是遷移。當您需要的是 PI Codex OAuth 時，請保持配置不變。僅當您需要原生 Codex 應用程式伺服器執行時，才切換到 `openai/<model>` 加上 `agentRuntime.id: "codex"`。

## 相容性合約

當執行時不是 PI 時，它應該記錄它支援哪些 OpenClaw 介面。請使用此格式來撰寫執行時文件：

| 問題                        | 為何重要                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| 誰擁有模型迴圈？            | 決定重試、工具延續和最終答案決策發生的位置。                                                |
| 誰擁有正規執行緒歷史？      | 決定 OpenClaw 是可以編輯歷史，還是只能反映歷史。                                            |
| OpenClaw 動態工具是否運作？ | 訊息傳遞、工作階段、排程和 OpenClaw 擁有的工具依賴於此。                                    |
| 動態工具掛鉤是否運作？      | 外掛程式期望在 OpenClaw 擁有的工具周圍有 `before_tool_call`、`after_tool_call` 和中介軟體。 |
| 原生工具掛鉤是否運作？      | Shell、修補和執行時擁有的工具需要原生掛鉤支援來進行原則和觀察。                             |
| 內文引擎生命週期是否執行？  | 記憶體和內文外掛程式依賴於組裝、攝取、回合後和壓縮生命週期。                                |
| 公開了哪些壓縮資料？        | 有些外掛程式只需要通知，而其他的則需要保留/捨棄的中繼資料。                                 |
| 什麼是故意不支援的？        | 在原生執行時擁有更多狀態的情況下，使用者不應假設與 PI 等效。                                |

Codex 執行時支援合約記錄在 [Codex 綁定](/zh-Hant/plugins/codex-harness#v1-support-contract) 中。

## 狀態標籤

狀態輸出可能會同時顯示 `Execution` 和 `Runtime` 標籤。請將它們視為診斷，而不是提供者名稱。

- 模型參考（model ref）例如 `openai/gpt-5.5` 會告訴您所選的提供者/模型。
- 執行時期 ID（runtime id）例如 `codex` 會告訴您哪個迴圈正在執行該回合。
- 頻道標籤（例如 Telegram 或 Discord）會告訴您對話發生的位置。

如果在變更執行時期配置後，工作階段仍然顯示 PI，請使用 `/new` 開啟新的工作階段，或使用 `/reset` 清除目前的工作階段。現有的工作階段會保留其記錄的執行時期，因此對話紀錄不會在兩個不相容的原生工作階段系統之間重新播放。

## 相關

- [Codex 套件](/zh-Hant/plugins/codex-harness)
- [OpenAI](/zh-Hant/providers/openai)
- [Agent 套件外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [Agent 迴圈](/zh-Hant/concepts/agent-loop)
- [模型](/zh-Hant/concepts/models)
- [狀態](/zh-Hant/cli/status)
