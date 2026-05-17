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

當您需要一個由操作員安裝的小型 `HOOK.md` 腳本來處理命令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）時，請改用 [內部 hooks](/zh-Hant/automation/hooks)。

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
- `llm_output` - 觀察提供者輸出

**工具**

- **`before_tool_call`** - 重寫工具參數、阻斷執行或要求核准
- `after_tool_call` - 觀察工具結果、錯誤和持續時間
- **`tool_result_persist`** - 重寫由工具結果產生的助手訊息
- **`before_message_write`** - 檢查或阻斷正在進行的訊息寫入（罕見）

**訊息與傳遞**

- **`inbound_claim`** - 在代理程式路由之前認領傳入訊息（合成回覆）
- `message_received` - 觀察傳入內容、發送者、執行緒和元資料
- **`message_sending`** - 重寫傳出內容或取消傳遞
- `message_sent` - 觀察傳出傳遞成功或失敗
- **`before_dispatch`** - 在通道移交之前檢查或重寫傳出調度
- **`reply_dispatch`** - 參與最終回覆調度管線

**會話與壓縮**

- `session_start` / `session_end` - 追蹤 session 生命週期邊界。該事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。當程序在 session 仍處於活動狀態時停止或重新啟動時，`shutdown` 和 `restart` 值會從 Gateway 關閉終結器觸發，因此下游插件（例如記憶體或文字記錄存儲）可以完成原本會在重新啟動之間保持開啟狀態的 ghost rows。該終結器是有界的，因此緩慢的插件無法阻擋 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 觀察或註解壓縮循環
- `before_reset` - 觀察 session 重置事件（`/reset`，程式化重置）

**Subagents**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 協調子代理程式路由和完成交付

**Lifecycle**

- `gateway_start` / `gateway_stop` - 隨 Gateway 啟動或停止插件擁有的服務
- `cron_changed` - 觀察 Gateway 擁有的 cron 生命週期變更（已新增、已更新、已移除、已啟動、已完成、已排程）
- **`before_install`** - 檢查技能或插件安裝掃描並選擇性地封鎖

## 工具呼叫原則

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用性 `event.derivedPaths`，包含針對知名工具封包（例如 `apply_patch`）所提供的最佳嘗試主機衍生目標路徑提示；當存在時，這些路徑可能不完整，或者可能高估工具實際會觸及的範圍（例如，遇到格式錯誤或部分輸入的情況）
- 選用性 `event.runId`
- 選用性 `event.toolCallId`
- 情境欄位，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驅動的執行中設定）以及診斷 `ctx.trace`

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

規則：

- `block: true` 是終止狀態，並會跳過較低優先級的處理程序。
- `block: false` 被視為未做決定。
- `params` 會重寫工具參數以供執行。
- `requireApproval` 會暫停代理執行並透過外掛程式核准機制詢問使用者。`/approve` 指令可以同時核准執行和外掛程式核准。
- 即使較高優先級的掛鉤請求了核准，較低優先級的 `block: true` 仍可以阻止執行。
- `onResolution` 會接收已解析的核准決定 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主機層級原則的配套外掛程式可以使用 `api.registerTrustedToolPolicy(...)` 註冊受信任的工具原則。這些原則會在一般的 `before_tool_call` 掛鉤和外部外掛程式決定之前執行。請僅將其用於主機信任的閘道，例如工作區原則、預算執行或保留的工作流程安全性。外部外掛程式應使用一般 `before_tool_call`
掛鉤。

### 工具結果持久性

工具結果可以包含結構化的 `details` 以供 UI 轉譯、診斷、媒體路由或外掛程式擁有的中繼資料使用。請將 `details` 視為執行階段中繼資料，而非提示內容：

- OpenClaw 會在提供者重播和壓縮輸入之前移除 `toolResult.details`，以免中繼資料變成模型的情境內容。
- 持續化的工作階段條目僅保留有界的 `details`。過大的細節會被替換為精簡摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最終持續化限制之前執行。Hook 應保持傳回的 `details` 較小，並避免僅將提示相關的文字放在 `details` 中；請將模型可見的工具輸出放在 `content` 中。

## 提示與模型 hooks

請為新外掛使用特定階段的 hooks：

- `before_model_resolve`：僅接收當前提示和附件元數據。傳回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收當前提示、已準備的工作階段訊息，以及為此工作階段排空的任何恰好一次佇列注入。傳回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收當前提示和工作階段訊息。傳回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：僅對心跳回合執行並傳回 `prependContext` 或 `appendContext`。此項目適用於需要總結當前狀態但不變更使用者起始回合的背景監視器。

`before_agent_start` 保留以用於相容性。建議優先使用上述明確的 Hook，以便您的插件不依賴舊版的合併階段。

`before_agent_run` 在提示詞構建之後、任何模型輸入之前運行，包括提示詞本地圖片載入和 `llm_input` 觀察。它接收當前使用者輸入作為 `prompt`，以及在 `messages` 中的已載入會話歷史記錄和活動系統提示詞。傳回 `{ outcome: "block", reason, message? }` 以在模型讀取提示詞之前停止執行。`reason` 是內部的；`message` 是面向使用者的替代品。唯一支援的結果是 `pass` 和 `block`；不支援的決策形狀將導致關閉並失敗。

當執行被阻擋時，OpenClaw 僅將替代文字儲存在 `message.content` 中，加上非敏感的阻擋元數據，例如阻擋外掛程式 ID 和時間戳記。原始使用者文字不會保留在逐字稿或未來的上下文中。內部阻擋原因被視為敏感資訊，並從逐字稿、歷史記錄、廣播、日誌和診斷負載中排除。可觀測性應使用經過清理的欄位，例如阻擋器 ID、結果、時間戳記或安全類別。

當 OpenClaw 能識別活動執行時，`before_agent_start` 和 `agent_end` 包含 `event.runId`。相同的值也可在 `ctx.runId` 上取得。Cron 驅動的執行也會公開 `ctx.jobId` (原始 cron 工作 ID)，以便外掛程式 Hook 可以將指標、副作用或狀態範圍限定為特定的排程工作。

對於來自通道的執行，`ctx.messageProvider` 是提供者表面，例如 `discord` 或 `telegram`，而當 OpenClaw 可以從會話金鑰或傳遞元數據推導出對話目標識別符時，`ctx.channelId` 即為該識別符。

`agent_end` 是一個觀測 Hook，並在回合後以即發即棄 (fire-and-forget) 方式運行。Hook 執行器套用 30 秒逾時，因此卡住的外掛程式或嵌入端點無法讓 Hook Promise 永久擱置。逾時會被記錄下來，OpenClaw 會繼續執行；除非外掛程式也使用自己的中止訊號，否則它不會取消外掛程式擁有的網路工作。

當供應商調用遙測不應接收原始提示、歷史記錄、回應、標頭、請求主體或供應商請求 ID 時，請使用 `model_call_started` 和 `model_call_ended`。這些鉤子包括穩定的中繼資料，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端 `durationMs`/`outcome`，以及當 OpenClaw 可推導出有界的供應商請求 ID 雜湊時的 `upstreamRequestIdHash`。

`before_agent_finalize` 僅在機制 即將接受自然的最終助理回答時執行。它不是 `/stop` 取消路徑，並且當使用者中斷輪次時不會執行。傳回 `{ action: "revise", reason }` 以在完成前要求機制再進行一次模型傳遞，傳回 `{ action: "finalize", reason? }` 以強制完成，或省略結果以繼續。Codex 原生 `Stop` 鉤子會作為 OpenClaw `before_agent_finalize` 決策轉發至此鉤子。

當傳回 `action: "revise"` 時，外掛程式可以包含 `retry` 中繼資料，以使額外的模型傳遞具備邊界且可安全重放：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到傳送至機制的修訂原因。`idempotencyKey` 允許主機跨等效的完成決策計算同一外掛程式請求的重試次數，而 `maxAttempts` 則限制主機在繼續自然最終回答之前允許的額外傳遞次數。

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 針對每個外掛程式停用提示變異鉤子和持久的下一輪注入。

### 會話擴充和下一輪注入

Workflow 外掛程式可以使用 `api.registerSessionExtension(...)` 持久化小型與 JSON 相容的工作階段狀態，並透過 Gateway 的 `sessions.pluginPatch` 方法進行更新。工作階段資料列透過 `pluginExtensions` 投射已註冊的擴充狀態，讓 Control UI 和其他用戶端能夠呈現外掛程式擁有的狀態，而無需了解外掛程式的內部細節。

當外掛程式需要持久化的內容以在下一個模型回合中精確地到達一次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示 hooks 之前排空佇列中的注入、捨棄過期的注入，並按每個外掛程式的 `idempotencyKey` 進行去重。這是適用於核准恢復、原則摘要、背景監視器差異以及命令延續的正確介入點，這些內容應在下一個回合中對模型可見，但不應成為永久的系統提示文字。

清理語義是契約的一部分。工作階段擴充清理和執行階段生命週期清理回呼會接收 `reset`、`delete`、`disable` 或 `restart`。針對重置/刪除/停用，主機會移除擁有外掛程式的持久化工作階段擴充狀態和擱置中的下一回合注入；重新啟動則會保留持久化的工作階段狀態，同時清理回呼允許外掛程式釋放排程器工作、執行內容以及舊執行階段世代的其他帶外資源。

## 訊息 Hook

使用訊息 Hook 進行通道層級的路由和傳遞策略：

- `message_received`：觀察傳入內容、傳送者、`threadId`、`messageId`、`senderId`、選用的執行/工作階段關聯以及中繼資料。
- `message_sending`：重寫 `content` 或傳回 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於僅音訊的 TTS 回覆，即使通道載荷沒有可見的文字/字幕，`content` 可能包含隱藏的口語逐字稿。重寫該 `content` 僅會更新 hook 可見的逐字稿；它不會被呈現為媒體字幕。

訊息 Hook 上下文在可用時會公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取
舊版元資料之前，請優先使用這些一等欄位。

在使用特定頻道的元資料之前，請優先使用類型化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- 帶有 `cancel: true` 的 `message_sending` 為終止狀態。
- 帶有 `cancel: false` 的 `message_sending` 被視為無決定。
- 重寫後的 `content` 會繼續傳遞至較低優先順序的 Hook，除非後續的 Hook
  取消傳遞。
- `message_sending` 可以傳回 `cancelReason` 和帶有
  取消動作的有界 `metadata`。新的訊息生命週期 API 將此公開為具有原因 `cancelled_by_message_sending_hook` 的已
  抑制傳遞結果；舊版直接傳遞為了相容性會繼續傳回空結果陣列。
- `message_sent` 僅供觀察。處理程序失敗會被記錄下來，但不會
  變更傳遞結果。

## 安裝掛鉤

`before_install` 在內建的技能和外掛程式安裝掃描之後執行。
傳回額外的發現或 `{ block: true, blockReason }` 以停止
安裝。

`block: true` 為終止狀態。`block: false` 被視為無決定。

## Gateway 生命週期

對於需要 Gateway 所擁有狀態的外掛程式服務，請使用 `gateway_start`。上下文公開了
用於 cron 檢查和更新的 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()`。
請使用 `gateway_stop` 來清理長期執行的資源。

不要依賴內部的 `gateway:startup` Hook 來處理外掛程式所擁有的執行時
服務。

`cron_changed` 針對 Gateway 擁有的 cron 生命週期事件觸發，其類型化的事件承載涵蓋 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。該事件攜帶 `PluginHookGatewayCronJob` 快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`，當存在時）以及 `PluginHookGatewayCronDeliveryStatus` 的 `not-requested` | `delivered` | `not-delivered` | `unknown`。已移除的事件仍會攜帶已刪除的作業快照，以便外部排程器可以協調狀態。在同步外部喚醒排程器時，請使用執行時期上下文中的 `ctx.getCron?.()` 和 `ctx.config`，並將 OpenClaw 保持為到期檢查和執行的真實來源。

## 即將棄用的功能

少數與 hook 相關的介面已棄用但仍受支援。請在
下一個主要版本發布之前進行移轉：

- **純文字通道信封** 位於 `inbound_claim` 和 `message_received` 處理程式中。請讀取 `BodyForAgent` 和結構化使用者上下文區塊，而不是解析扁平的信封文字。請參閱 [純文字通道信封 → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 基於相容性而保留。新的外掛應該使用 `before_model_resolve` 和 `before_prompt_build`，而不是合併的階段。
- **`onResolution` 於 `before_tool_call` 中** 現在使用類型化的 `PluginApprovalResolution` 聯集（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`），而不是自由形式的 `string`。

如需完整清單——記憶體功能註冊、提供者思考設定檔、外部驗證提供者、提供者探索類型、任務執行時期存取器，以及 `command-auth` → `command-status` 重新命名——請參閱 [Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK 遷移](/zh-Hant/plugins/sdk-migration) - 積極棄用與移除的時間表
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [外掛程式進入點](/zh-Hant/plugins/sdk-entrypoints)
- [內部 Hooks](/zh-Hant/automation/hooks)
- [外掛程式架構內部](/zh-Hant/plugins/architecture-internals)
