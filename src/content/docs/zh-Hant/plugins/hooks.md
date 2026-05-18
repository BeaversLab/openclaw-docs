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

當您需要一個小型操作員安裝的 `HOOK.md` 腳本來處理指令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）時，請改用 [內部 hooks](/zh-Hant/automation/hooks)。

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
- 選用的 `event.derivedPaths`，包含針對已知工具封包（例如 `apply_patch`）所提供的盡力而為的主機衍生的目標路徑提示；當這些提示存在時，路徑可能不完整，或者可能高估工具實際會觸碰的範圍（例如，輸入格式錯誤或輸入不完整時）
- 選用的 `event.runId`
- 選用的 `event.toolCallId`
- 欄位等情境欄位，以及診斷用的 `ctx.agentId``ctx.sessionKey``ctx.sessionId``ctx.runId``ctx.jobId``ctx.trace`

它可以回傳：

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

針對類型化生命週期 Hook 的 Hook guard 行為：

- `block: true` 是終止性的，會跳過優先順序較低的處理程序。
- `block: false` 被視為未做決定。
- `params` 會重寫執行所需的工具參數。
- `requireApproval` 會暫停代理執行並透過外掛程式審核請求使用者。`/approve` 指令可以批准執行和外掛程式審核。
- 即使優先順序較高的 Hook 請求了審核，優先順序較低的 `block: true` 仍可以進行阻擋。
- `onResolution` 接收解析後的審核決定——`allow-once`、`allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主機層級策略的捆綁式外掛可以透過 `api.registerTrustedToolPolicy(...)` 註冊受信任的工具策略。這些會在一般的 `before_tool_call` hooks 之前以及外部外掛決策之前執行。請僅將它們用於主機信任的閘道，例如工作區策略、預算執行或保留的工作流程安全性。外部外掛應該使用一般的 `before_tool_call` hooks。

### 工具結果持久性

工具結果可以包含用於 UI 渲染、診斷、媒體路由或外掛擁有之中繼資料的結構化 `details`。請將 `details` 視為執行時期中繼資料，而非提示內容：

- OpenClaw 會在提供者重播和壓縮輸入之前移除 `toolResult.details`，以免中繼資料變成模型內容。
- 持久化的工作區條目僅保留有界的 `details`。過大的詳細資訊會被替換為精簡摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 會在最終持久性限制之前執行。Hook 仍應保持傳回的 `details` 為小型，並避免僅將提示相關文字放在 `details` 中；請將模型可見的工具輸出放在 `content` 中。

## 提示與模型 Hook

請針對新外掛使用特定階段的 Hook：

- `before_model_resolve`：僅接收目前的提示和附件中繼資料。傳回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收目前的提示、準備好的工作區訊息，以及為此工作區耗盡的任何僅執行一次的佇列注入。傳回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收目前的提示和工作區訊息。傳回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：僅針對心跳回合運行並回傳
  `prependContext` 或 `appendContext`。它旨在供需要總結目前狀態
  而不變更使用者啟動回合的背景監視器使用。

`before_agent_start` 保留用於相容性。請優先使用上述明確的掛鉤
讓您的插件不依賴舊版的合併階段。

`before_agent_run` 在建構提示之後、任何模型輸入之前運行，
包括提示本地的影像載入和 `llm_input` 觀察。它接收
目前的使用者輸入作為 `prompt`，以及在 `messages` 中的載入
會話歷史和啟用的系統提示。回傳 `{ outcome: "block", reason, message? }`
以便在模型讀取提示之前停止執行。`reason` 是內部使用；
`message` 是面向使用者的替代方案。唯一支援的結果是
`pass` 和 `block`；不支援的決策形狀將會封閉式失敗。

當執行被阻擋時，OpenClaw 只會在
`message.content` 中儲存替代文字，以及非敏感的阻擋元資料，例如阻擋插件
ID 和時間戳記。原始使用者文字不會保留在逐字稿或未來的
內容中。內部阻擋原因被視為敏感資訊，並排除在
逐字稿、歷史、廣播、日誌和診斷酬載之外。可觀測性
應使用已清理的欄位，例如阻擋器 ID、結果、時間戳記或安全的
類別。

當 OpenClaw 能識別啟用的執行時，
`before_agent_start` 和 `agent_end` 會包含 `event.runId`。
相同的值也可在 `ctx.runId` 上取得。
Cron 驅動的執行也會公開 `ctx.jobId` (原始 cron 工作 ID)，以便
插件掛鉤可以將指標、副作用或狀態範圍限定至特定的排程
工作。

對於源自通道的運行，`ctx.messageProvider` 是提供者介面，例如 `discord` 或 `telegram`，而當 OpenClaw 可以從會話金鑰或傳遞元數據推導出目標時，`ctx.channelId` 是對話目標識別碼。

`agent_end` 是一個觀察鉤子，並在該輪次之後以即發即忘的方式運行。鉤子運行器會套用 30 秒的超時時間，以防止卡住的插件或嵌入端點讓鉤子 promise 永久處於擱置狀態。超時會被記錄下來，OpenClaw 會繼續執行；除非插件也使用了自己的中止訊號，否則它不會取消插件擁有的網路工作。

使用 `model_call_started` 和 `model_call_ended` 來處理不應接收原始提示、歷史記錄、回應、標頭、請求主體或提供者請求 ID 的提供者呼叫遙測。這些鉤子包含穩定的元數據，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端機 `durationMs`/`outcome`，以及當 OpenClaw 可以推導出有界的提供者請求 ID 雜湊時的 `upstreamRequestIdHash`。當運行時已解析上下文視窗元數據時，鉤子事件和上下文也會包含 `contextTokenBudget`，即在模型/配置/代理上限之後的有效 token 預算，加上當套用較低上限時的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 僅在駕駛程式即將接受自然的最终助理回應時運行。它不是 `/stop` 取消路徑，並且當使用者中止輪次時不會運行。傳回 `{ action: "revise", reason }` 以要求駕駛程式在最終確定之前再進行一次模型傳遞，傳回 `{ action:
"finalize", reason? }` 以強制最終確定，或省略結果以繼續。Codex 原生 `Stop` 鉤子會作為 OpenClaw `before_agent_finalize` 決策中繼到此鉤子中。

當返回 `action: "revise"` 時，外掛程式可以包含 `retry` 中繼資料，以使額外的模型傳遞受限制且可重播安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到發送至套件的修訂原因。`idempotencyKey` 讓主機能夠在等效的最終決策中，計算針對同一外掛程式請求的重試次數，而 `maxAttempts` 則限制了主機在繼續使用自然最終答案之前所允許的額外傳遞次數。

需要原始對話钩子（`before_model_resolve`、
`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、
`agent_end` 或 `before_agent_run`）的非捆綁外掛程式必須設定：

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 針對每個外掛程式停用提示變更钩子和持久的下一輪注入。

### 會話延伸和下一輪注入

工作流程外掛程式可以使用 `api.registerSessionExtension(...)` 持續保存小型相容 JSON 的會話狀態，並透過 Gateway
`sessions.pluginPatch` 方法進行更新。會話行透過 `pluginExtensions` 投影註冊的延伸狀態，讓控制 UI 和其他用戶端能夠
呈現外掛程式擁有的狀態，而無需了解外掛程式內部結構。

當外掛程式需要持久的上下文以確切一次到達下一個模型輪次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示钩子之前排空佇列中的注入，捨棄過期的注入，並按 `idempotencyKey` 對每個外掛程式進行去重。這是批准恢復、策略摘要、背景監控增量以及命令續行的正確縫合點，它們應該在下一輪對模型可見，但不應成為永久性的系統提示文字。

清理語義是合約的一部分。會話擴展清理和運行時生命週期清理回調會接收 `reset`、`delete`、`disable` 或
`restart`。主機會移除擁有該外掛程式的持久化會話擴展狀態和待處理的下一輪注入，以進行重設/刪除/停用；重啟會保留持久的會話狀態，而清理回調允許外掛程式釋放舊運行時產生的排程器工作、執行上下文和其他頻外資源。

## 訊息鉤子

使用訊息鉤子來處理通道層級的路由和傳遞策略：

- `message_received`：觀察傳入內容、發送者、`threadId`、`messageId`、
  `senderId`、可選的執行/會話關聯以及元數據。
- `message_sending`：重寫 `content` 或回傳 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於純音訊的 TTS 回覆，`content` 可能包含隱藏的口說逐字稿，即使通道承載沒有可見的文字/字幕。重寫該
`content` 僅會更新鉤子可見的逐字稿；它不會被呈現為媒體字幕。

訊息鉤子上下文會在可用時公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取舊版元數據之前，請優先使用這些一級欄位。

在使用特定通道的元數據之前，請優先使用型別化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- `message_sending` 搭配 `cancel: true` 是終止決策。
- `message_sending` 搭配 `cancel: false` 被視為未做決策。
- 重寫後的 `content` 會繼續傳遞給優先級較低的 hooks，除非後續的 hook 取消傳遞。
- `message_sending` 可以隨取消操作返回 `cancelReason` 和有界的 `metadata`。新的訊息生命週期 API 將其公開為原因為 `cancelled_by_message_sending_hook` 的被抑制傳遞結果；舊版直接傳遞則繼續返回空結果陣列以保持相容性。
- `message_sent` 僅供觀察。處理程式失敗會被記錄，但不會改變傳遞結果。

## 安裝 hooks

`before_install` 在內建對技能和外掛程式安裝的掃描之後執行。返回其他發現或 `{ block: true, blockReason }` 以停止安裝。

`block: true` 是終止性的。`block: false` 被視為未做決定。

## Gateway 生命週期

對於需要 Gateway 擁有狀態的外掛程式服務，請使用 `gateway_start`。上下文公開了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 用於 cron 檢查和更新。使用 `gateway_stop` 來清理長期執行的資源。

請勿依賴內部的 `gateway:startup` hook 來處理外掛程式擁有的執行時服務。

`cron_changed` 針對 Gateway 擁有的 cron 生命週期事件觸發，其類型化的事件承載涵蓋 `added`、`updated`、`removed`、`started`、`finished`
及 `scheduled` 原因。該事件攜帶 `PluginHookGatewayCronJob`
快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 與
`state.lastError`，若存在）以及 `PluginHookGatewayCronDeliveryStatus`
`not-requested` | `delivered` | `not-delivered` | `unknown`。移除
事件仍會攜帶已刪除的作業快照，以便外部排程器
協調狀態。在同步外部喚醒排程器時，請使用來自執行
環境的 `ctx.getCron?.()` 與 `ctx.config`，並讓 OpenClaw 作為
到期檢查與執行的唯一事實來源。

## 即將棄用

部分與 Hook 相關的介面已棄用但仍受支援。請在下一個主要版本發布前進行遷移：

- `inbound_claim` 與 `message_received`
  處理程式中的 **純文字通道信封 (Plaintext channel envelopes)**。請讀取 `BodyForAgent` 與結構化使用者內容區塊，
  而非解析扁平的信封文字。請參閱
  [純文字通道信封 → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 基於相容性而保留。新外掛應使用
  `before_model_resolve` 與 `before_prompt_build` 取代此合併
  階段。
- **`deactivate`** 作為已棄用的清理相容性別名保留，直至
  2026-08-16 之後。新外掛應使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 現在使用類型化
  `PluginApprovalResolution` 聯集（`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`），而非自由形式的 `string`。

如需完整清單——包括記憶體功能註冊、提供者思考設定檔、外部驗證提供者、提供者探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 的重新命名——請參閱
[Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK migration](/zh-Hant/plugins/sdk-migration) - 目前的棄用項目與移除時間表
- [Building plugins](/zh-Hant/plugins/building-plugins)
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)
- [Plugin entry points](/zh-Hant/plugins/sdk-entrypoints)
- [Internal hooks](/zh-Hant/automation/hooks)
- [Plugin architecture internals](/zh-Hant/plugins/architecture-internals)
