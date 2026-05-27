---
summary: "Plugin hooks: intercept agent, tool, message, session, and Gateway lifecycle events"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Plugin hooks are in-process extension points for OpenClaw plugins. Use them
when a plugin needs to inspect or change agent runs, tool calls, message flow,
session lifecycle, subagent routing, installs, or Gateway startup.

如果您想要一個由操作員安裝的小型 `HOOK.md` 腳本來處理指令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`），請改用[內部掛鉤](/zh-Hant/automation/hooks)。

## Quick start

從您的插件入口使用 `api.on(...)` 註冊類型化的插件 hooks：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "Run web search",
            description: `Allow search query: ${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

Hook 處理程式會依照遞減的 `priority` 順序執行。相同優先級的 hooks 會保持註冊順序。

`api.on(name, handler, opts?)` 接受：

- `priority` - 處理程式排序（數值較高者先執行）。
- `timeoutMs` - 可選的每個 hook 預算。設定後，當預算耗盡時，hook 執行器會中止該處理程式並繼續執行下一個，而不是讓緩慢的設定或召回工作耗用呼叫者設定的模型逾時時間。省略此項以使用 hook 執行器通用套用的預設觀察/決策逾時時間。

操作員也可以在不修改插件程式碼的情況下設定 hook 預算：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` 會覆寫 `hooks.timeoutMs`，後者會覆寫插件作者的 `api.on(..., { timeoutMs })` 數值。每個設定的數值必須是不超過 600000 毫秒的正整數。針對已知的緩慢 hooks 優先使用每個 hook 的覆寫設定，這樣單一插件就不會到處都獲得較長的預算。

每個 hook 都會接收 `event.context.pluginConfig`，即註冊該處理程式之插件的解析設定。將其用於需要當前插件選項的 hook 決策；OpenClaw 會為每個處理程式注入它，而不會改變其他插件看到的共享事件物件。

## Hook 目錄

Hooks 依其擴展的表面分組。**粗體**名稱接受決策結果（封鎖、取消、覆寫或要求核准）；其他所有名稱僅供觀察。

**Agent 週期**

- `before_model_resolve` - 在載入 session 訊息之前覆寫供應商或模型
- `agent_turn_prepare` - 消費佇列中的插件回合注入，並在提示詞掛鉤之前新增同輪次上下文
- `before_prompt_build` - 在模型呼叫之前新增動態上下文或系統提示詞文本
- `before_agent_start` - 僅用於相容性的合併階段；建議優先使用上述兩個掛鉤
- **`before_agent_run`** - 在模型提交之前檢查最終提示詞和會話訊息，並可選擇阻斷執行
- **`before_agent_reply`** - 使用合成回覆或靜默來短路模型回合
- **`before_agent_finalize`** - 檢查自然的最終答案並請求再進行一次模型傳遞
- `agent_end` - 觀察最終訊息、成功狀態和執行持續時間
- `heartbeat_prompt_contribution` - 為背景監控和生命週期外掛程式新增僅心跳上下文

**對話觀察**

- `model_call_started` / `model_call_ended` - 觀察經過清理的提供者/模型呼叫元資料、計時、結果和受限的請求 ID 雜湊，不包含提示詞或回應內容
- `llm_input` - 觀察提供者輸入（系統提示詞、提示詞、歷史記錄）
- `llm_output` - 觀察提供者輸出、使用量以及已解析的 `contextTokenBudget`（如果可用）

**工具**

- **`before_tool_call`** - 重寫工具參數、封鎖執行或要求核准
- `after_tool_call` - 觀察工具結果、錯誤和持續時間
- **`tool_result_persist`** - 重寫從工具結果產生的助理訊息
- **`before_message_write`** - 檢查或封鎖正在進行的訊息寫入（罕見）

**訊息與傳遞**

- **`inbound_claim`** - 在 Agent 路由之前認領傳入訊息（合成回覆）
- `message_received` - 觀察傳入內容、發送者、執行緒和中繼資料
- **`message_sending`** - 重寫傳出內容或取消傳遞
- `message_sent` - 觀察傳出傳遞成功或失敗
- **`before_dispatch`** - 在通道交出之前檢查或重寫傳出分派
- **`reply_dispatch`** - 參與最終回覆分派管線

**會話與壓縮**

- `session_start` / `session_end` - 追蹤 session 生命週期邊界。該事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。當 session 仍處於活動狀態時程序停止或重新啟動時，`shutdown` 和 `restart` 值會從 Gateway 關閉終結器觸發，因此下游外掛（例如記憶體或文字記錄儲存）可以完成那些否則會在重新啟動後保持開啟狀態的幽靈資料列。終結器是有界的，因此緩慢的外掛無法阻擋 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 觀察或標註壓縮週期
- `before_reset` - 觀察 session 重置事件（`/reset`，程式化重置）

**Subagents**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 協調子代理路由和完成交付

**Lifecycle**

- `gateway_start` / `gateway_stop` - 使用 Gateway 啟動或停止外掛擁有的服務
- `deactivate` - `gateway_stop` 的已棄用相容性別名；在新外掛中使用 `gateway_stop`
- `cron_changed` - 觀察 Gateway 擁有的 cron 生命週期變更（已新增、已更新、已移除、已啟動、已完成、已排程）
- **`before_install`** - 檢查技能或外掛安裝掃描並選擇性阻擋

## 除錯執行時掛鉤

當外掛需要為代理回合切換提供者或模型時，請使用 `before_model_resolve`。它在模型解析之前執行；`llm_output` 僅在模型嘗試產生助理輸出後執行。

若要驗證有效的會話模型，請檢查執行時期的註冊情況，然後使用 `openclaw sessions` 或 Gateway 的 session/status 介面。當除錯提供者 payloads 時，請使用 `--raw-stream` 和 `--raw-stream-path <path>` 啟動 Gateway；這些標誌會將原始的模型串流事件寫入 l 檔案。

## 工具呼叫政策

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用的 `event.toolKind` 和 `event.toolInputKind`，這是主機授權的識別符，用於刻意共享名稱的工具；例如，外部程式碼模式 `exec` 呼叫會使用 `toolKind: "code_mode_exec"`，並在已知輸入語言時包含 `toolInputKind: "javascript" | "typescript"`
- 選用的 `event.derivedPaths`，包含主機衍生的目標路徑提示（僅限盡力而為），適用於知名工具封包（例如 `apply_patch`）；當存在這些路徑時，它們可能不完整，或者可能過度概括工具實際會存取的範圍（例如，輸入格式錯誤或僅有部分輸入時）
- 選用的 `event.runId`
- 選用的 `event.toolCallId`
- 上下文欄位，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驅動的執行中設定）、`ctx.toolKind`、
  `ctx.toolInputKind` 和診斷 `ctx.trace`

它可以返回：

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

類型化生命週期掛鉤的 Hook guard 行為：

- `block: true` 是終止的，會跳過優先級較低的處理程式。
- `block: false` 被視為未作決定。
- `params` 會為執行重寫工具參數。
- `requireApproval` 會暫停代理執行並透過外掛程式核准向詢問使用者。`/approve` 指令可以同時核准執行和外掛程式核准。
- 即使較高優先級的掛鉤請求了核准，優先級較低的 `block: true` 仍可阻止執行。
- `onResolution` 會接收已解決的批准決策 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主機層級策略的隨附外掛程式可以使用 `api.registerTrustedToolPolicy(...)` 註冊受信任的工具策略。
這些策略會在一般的 `before_tool_call` Hook 和外部外掛程式決策之前執行。
僅將其用於主機信任的閘道，例如工作區策略、預算強制執行或保留的工作流程安全性。
外部外掛程式應使用一般的 `before_tool_call` Hook。

### 工具結果持久性

工具結果可以包含結構化的 `details`，用於 UI 渲染、診斷、
媒體路由或外掛程式擁有的中繼資料。請將 `details` 視為執行階段中繼資料，
而非提示內容：

- OpenClaw 會在提供者重播和壓縮輸入之前移除 `toolResult.details`，
  以免中繼資料成為模型內容。
- 持久的會話項目僅保留有限的 `details`。過大的細節
  會被替換為精簡摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 會在最終
  持久性上限之前執行。Hook 應保持返回的 `details` 輕小，並避免
  僅將提示相關的文字放在 `details` 中；請將模型可見的工具輸出
  放在 `content` 中。

## 提示和模型 Hook

請為新的外掛程式使用特定階段的 Hook：

- `before_model_resolve`：僅接收目前的提示和附件
  中繼資料。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收目前的提示、已準備的會話訊息，
  以及為此會話排空的任何單次佇列注入。返回
  `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收目前的提示詞和會話訊息。
  傳回 `prependContext`、`appendContext`、`systemPrompt`、
  `prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：僅在心跳回合執行並傳回
  `prependContext` 或 `appendContext`。它適用於需要摘要目前狀態
  但不變更使用者發起回合的背景監控器。

`before_agent_start` 保留用於相容性。建議優先使用上述明確的掛鉤，
讓您的外掛程式不依賴舊版的合併階段。

`before_agent_run` 在提示詞建構之後、任何模型輸入之前執行，
包括提示詞本地的圖片載入和 `llm_input` 觀察。它接收
目前的使用者輸入作為 `prompt`，加上載入的會話記錄於 `messages`
以及作用中的系統提示詞。傳回 `{ outcome: "block", reason, message? }`
可在模型讀取提示詞前停止執行。`reason` 是內部使用；
`message` 是使用者可見的取代項目。唯一支援的結果為
`pass` 和 `block`；不支援的決策形狀將會封閉式失敗。

當執行被封鎖時，OpenClaw 僅將取代文字儲存在
`message.content` 中，加上非敏感的封鎖元數據，例如封鎖外掛程式
ID 和時間戳記。原始使用者文字不會保留在文字記錄或未來
內容中。內部封鎖原因被視為敏感資訊，並從
文字記錄、記錄、廣播、日誌和診斷酬載中排除。可觀測性
應使用經過清理的欄位，例如封鎖者 ID、結果、時間戳記或安全的
類別。

`before_agent_start` 和 `agent_end` 在 OpenClaw 能夠
識別作用中的執行時會包含 `event.runId`。相同的值也可在 `ctx.runId` 上取得。
Cron 驅動的執行也會公開 `ctx.jobId`（來源 cron 任務 ID），讓
外掛程式掛鉤能將指標、副作用或狀態範圍限定在特定排程
任務。

對於來自通道的執行，`ctx.messageProvider` 是提供者介面，例如 `discord` 或 `telegram`，而當 OpenClaw 可以從會話金鑰或傳遞中繼資料衍生出來時，`ctx.channelId` 則是對話目標識別碼。

`agent_end` 是一個觀察鉤子。Gateway 和持久性線束路徑在回合結束後以「發後即忘」的方式執行它，而短暫的一次性 CLI 路徑則會在程序清理前等待鉤子承諾，以便受信任的外掛可以沖刷終端機可觀測性或捕獲狀態。鉤子執行器會套用 30 秒的逾時，因此卡住的外掛或嵌入端點無法讓鉤子承諾永遠處於擱置狀態。逾時會被記錄下來，OpenClaw 會繼續執行；除非外掛也使用自己的中止訊號，否則它不會取消外掛擁有的網路工作。

使用 `model_call_started` 和 `model_call_ended` 進行不應接收原始提示、歷史記錄、回應、標頭、請求主體或提供者請求 ID 的提供者呼叫遙測。這些鉤子包含穩定的中繼資料，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端機 `durationMs`/`outcome`，以及當 OpenClaw 可以衍生出有界的提供者請求 ID 雜湊時的 `upstreamRequestIdHash`。當執行時已解析上下文視窗中繼資料時，鉤子事件和上下文也包含 `contextTokenBudget`（模型/設定/代理上限後的有效 token 預算），以及當套用了較低上限時的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 僅在控制項準備接受自然的最终助手回答時運行。它不是 `/stop` 取消路徑，並且當用戶中斷一輪對話時不會運行。返回 `{ action: "revise", reason }` 以請求控制項在最終確定之前再進行一次模型傳遞，`{ action: "finalize", reason? }` 以強制最終確定，或省略結果以繼續。Codex 原生 `Stop` 鉤子將作為 OpenClaw `before_agent_finalize` 決策轉發到此鉤子中。

當返回 `action: "revise"` 時，外掛程式可以包含 `retry` 元數據，以使額外的模型傳遞受限且可重放安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到發送給控制項的修訂原因。`idempotencyKey` 允許主機計算跨等效最終確定決策對同一外掛程式請求的重試次數，而 `maxAttempts` 則限制了主機在繼續自然最終答案之前允許的額外傳遞次數。

需要原始對話鉤子（`before_model_resolve`、`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end` 或 `before_agent_run`）的非捆綁外掛程式必須設定：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

提示變異鉤子和持久性的下一輪注入可以針對每個外掛程式通過 `plugins.entries.<id>.hooks.allowPromptInjection=false` 來禁用。

### 會話擴展和下一輪注入

工作流外掛程式可以使用 `api.registerSessionExtension(...)` 保持小型 JSON 相容的會話狀態，並通過 Gateway `sessions.pluginPatch` 方法進行更新。會話行通過 `pluginExtensions` 投影已註冊的擴展狀態，允許 Control UI 和其他客戶端渲染外掛程式擁有的狀態，而無需了解外掛程式內部細節。

當外掛需要持久化的上下文以便在下一輪模型轉換中精確觸發一次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示詞掛鉤之前排出排隊的注入、丟棄過期的注入，並按每個外掛的 `idempotencyKey` 進行去重。這是處理審批恢復、策略摘要、背景監控增量以及指令延續的恰當位置，這些內容應在下一輪對模型可見，但不應成為永久的系統提示詞文字。

清理語義是契約的一部分。會話擴展清理和運行時生命週期清理回調會接收 `reset`、`delete`、`disable` 或 `restart`。對於重置/刪除/停用，主機會移除擁有外掛的持久會話擴展狀態和待處理的下一輪注入；重啟則保留持久會話狀態，而清理回調允許外掛釋放排程器任務、運行上下文以及舊運行時生成帶的其他非同步資源。

## 訊息掛鉤

使用訊息掛鉤進行通道級別的路由和傳遞策略控制：

- `message_received`：觀察入站內容、發送者、`threadId`、`messageId`、
  `senderId`、可選的執行/會話關聯以及元數據。
- `message_sending`：重寫 `content` 或返回 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於僅音訊的 TTS 回覆，`content` 可能包含隱藏的口語逐字稿，即使通道載荷沒有可見的文字/字幕。重寫該 `content` 僅更新掛鉤可見的逐字稿；它不會被渲染為媒體字幕。

訊息掛鉤上下文在可用時會公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取舊版元資料之前，請優先使用這些一等欄位。

在使用特定頻道的元資料之前，請優先使用類型化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- 帶有 `cancel: true` 的 `message_sending` 為終止決策。
- 帶有 `cancel: false` 的 `message_sending` 被視為未做決策。
- 重寫的 `content` 會繼續傳遞給優先級較低的掛鉤，除非後續掛鉤取消傳遞。
- `message_sending` 可以傳回 `cancelReason` 和帶有取消標記的受限 `metadata`。新的訊息生命週期 API 將此公開為原因為 `cancelled_by_message_sending_hook` 的被抑制傳遞結果；舊版直接傳遞為了相容性，會繼續傳回空結果陣列。
- `message_sent` 僅供觀察。處理程序失敗會被記錄下來，但不會改變傳遞結果。

## 安裝掛鉤

`before_install` 在內建掃描技能和外掛程式安裝之後執行。傳回額外的發現或 `{ block: true, blockReason }` 以停止安裝。

`block: true` 為終止決策。`block: false` 被視為未做決策。

## Gateway 生命週期

對於需要 Gateway 所擁有狀態的外掛程式服務，請使用 `gateway_start`。上下文公開了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 以供 cron 檢查和更新。請使用 `gateway_stop` 清理長期執行的資源。

不要依賴內部的 `gateway:startup` 掛鉤來處理外掛程式所擁有的執行時期服務。

`cron_changed` 針對 gateway 擁有的 cron 生命週期事件觸發，其類型化的事件承載涵蓋 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。該事件攜帶 `PluginHookGatewayCronJob` 快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 以及出現時的 `state.lastError`）以及 `PluginHookGatewayCronDeliveryStatus`，其為 `not-requested` | `delivered` | `not-delivered` | `unknown`。已移除的事件仍會攜帶已刪除的作業快照，以便外部排程器協調狀態。在同步外部喚醒排程器時，請使用執行階段內容中的 `ctx.getCron?.()` 和 `ctx.config`，並將 OpenClaw 作為到期檢查與執行的唯一事實來源。

## 即將棄用的功能

少數與 hook 相關的介面已被標記為棄用，但仍然受到支援。請在下一個主要版本發布前進行移轉：

- `inbound_claim` 和 `message_received` 處理程序中的 **純文字通道信封**。請讀取 `BodyForAgent` 和結構化的使用者內容區塊，而不是解析扁平的信封文字。請參閱 [Plaintext channel envelopes → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 基於相容性原因而保留。新的外掛應使用 `before_model_resolve` 和 `before_prompt_build`，而不是合併的階段。
- **`deactivate`** 作為已棄用的清理相容性別名保留，直至 2026-08-16 之後。新的外掛應使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 現在使用類型化的 `PluginApprovalResolution` 聯集（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`），而不是自由形式的 `string`。

如需完整列表 — 包括記憶能力註冊、提供者思考設定檔、外部驗證提供者、提供者探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 重新命名 — 請參閱[Plugin SDK 移轉 → 即將淘汰的功能](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK 移轉](/zh-Hant/plugins/sdk-migration) - 目前淘汰項目與移除時間表
- [建置外掛](/zh-Hant/plugins/building-plugins)
- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Plugin 進入點](/zh-Hant/plugins/sdk-entrypoints)
- [內部 Hooks](/zh-Hant/automation/hooks)
- [Plugin 架構內部機制](/zh-Hant/plugins/architecture-internals)
