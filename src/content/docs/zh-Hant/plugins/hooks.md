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

當您需要一個由操作員安裝的小型 `HOOK.md` 腳本來處理指令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）時，請改用 [內部掛鉤](/zh-Hant/automation/hooks)。

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
- `message_received` — 觀察傳入內容、發送者、執行緒和元數據
- **`message_sending`** — 重寫傳出內容或取消傳遞
- **`reply_payload_sending`** — 在傳遞之前變更或取消標準化的回覆負載
- `message_sent` — 觀察傳出傳遞的成功或失敗
- **`before_dispatch`** - 在通道移交之前檢查或重寫傳出分派
- **`reply_dispatch`** - 參與最終回覆分派管線

**會話和壓縮**

- `session_start` / `session_end` - 追蹤會話生命週期邊界。事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。`shutdown` 和 `restart` 值會在程序停止或重新啟動且會話仍處於作用中時，從 Gateway 關閉完成器觸發，因此下游插件（如記憶體或文字記錄存放區）可以完成那些否則會在重新啟動之間保持開啟狀態的虛擬資料列。完成器是有界的，因此緩慢的插件無法封鎖 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 觀察或標註壓縮週期
- `before_reset` - 觀察會話重設事件（`/reset`、程式設計重設）

**子代理程式**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 協調子代理路由和完成交付

**生命週期**

- `gateway_start` / `gateway_stop` - 隨 Gateway 啟動或停止外掛程式擁有的服務
- `deactivate` - `gateway_stop` 的已棄用相容性別名；在新外掛程式中請使用 `gateway_stop`
- `cron_changed` - 觀察 Gateway 擁有的 cron 生命週期變更（已新增、已更新、已移除、已啟動、已完成、已排程）
- **`before_install`** - 檢查技能或外掛程式安裝掃描並選擇性地封鎖

## 偵錯執行時期 Hooks

當外掛程式需要為代理轉換提供者或模型時，請使用 `before_model_resolve`。它會在模型解析之前執行；`llm_output` 僅在模型嘗試產生助理輸出後執行。

若要證明有效的工作階段模型，請檢查執行時期註冊，然後使用 `openclaw sessions` 或 Gateway 工作階段/狀態介面。偵錯提供者 Payload 時，請使用 `--raw-stream` 和 `--raw-stream-path <path>` 啟動 Gateway；這些旗標會將原始模型串流事件寫入 l 檔案。

## 工具呼叫政策

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用的 `event.toolKind` 和 `event.toolInputKind`，這是主機權威的識別符，用於故意共用名稱的工具；例如，外層程式碼模式 `exec` 呼叫會使用 `toolKind: "code_mode_exec"`，並在已知輸入語言時包含 `toolInputKind: "javascript" | "typescript"`
- 選用的 `event.derivedPaths`，包含知名信封（例如 `apply_patch`）的盡力主機衍生目標路徑提示；如果存在，這些路徑可能不完整，或者可能過度預估工具實際會接觸的內容（例如，當輸入格式錯誤或不完整時）
- 選用的 `event.runId`
- 選用的 `event.toolCallId`
- 諸如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驅動的執行中設定）、`ctx.toolKind`、
  `ctx.toolInputKind` 等內容欄位，以及診斷用的 `ctx.trace`

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
    allowedDecisions?: Array<"allow-once" | "allow-always" | "deny">;
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

類型化生命週期 Hook 的 Hook guard 行為：

- `block: true` 為終止狀態，會跳過優先順序較低的處理程序。
- `block: false` 被視為未做決定。
- `params` 會重寫工具參數以供執行。
- `requireApproval` 會暫停代理執行並透過外掛
  核准向使用者詢問。`/approve` 指令可以核准執行和
  外掛核准。在 Codex app-server 報告模式的原生 `PreToolUse` 轉發中，
  此作業會延後至相符的 app-server 核准請求；請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#hook-boundaries)。
- 當優先順序較高的 Hook 要求核准後，優先順序較低的 `block: true` 仍可進行阻擋。
- `onResolution` 會接收已解析的核准決定 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

關於核准路由、決定行為，以及何時應使用 `requireApproval` 而非
選用工具或執行核准，請參閱 [Plugin permission requests](/zh-Hant/plugins/plugin-permission-requests)。

需要主機層級政策的捆綁外掛，可以使用 `api.registerTrustedToolPolicy(...)` 註冊受信任的工具政策。
這些會在一般的 `before_tool_call` Hook 和外部外掛決定之前執行。
請僅將其用於主機信任的閘道，例如工作區政策、預算強制執行或保留的工作流程安全性。
外部外掛應使用一般的 `before_tool_call` Hook。

### 工具結果持續性

Tool results can include structured `details` for UI rendering, diagnostics,
media routing, or plugin-owned metadata. Treat `details` as runtime metadata,
not prompt content:

- OpenClaw strips `toolResult.details` before provider replay and compaction
  input so metadata does not become model context.
- Persisted session entries keep only bounded `details`. Oversized details are
  replaced with a compact summary and `persistedDetailsTruncated: true`.
- `tool_result_persist` and `before_message_write` run before the final
  persistence cap. Hooks should still keep returned `details` small and avoid
  placing prompt-relevant text only in `details`; put model-visible tool output
  in `content`.

## Prompt and model hooks

Use the phase-specific hooks for new plugins:

- `before_model_resolve`: receives only the current prompt and attachment
  metadata. Return `providerOverride` or `modelOverride`.
- `agent_turn_prepare`: receives the current prompt, prepared session messages,
  and any exactly-once queued injections drained for this session. Return
  `prependContext` or `appendContext`.
- `before_prompt_build`: receives the current prompt and session messages.
  Return `prependContext`, `appendContext`, `systemPrompt`,
  `prependSystemContext`, or `appendSystemContext`.
- `heartbeat_prompt_contribution`: runs only for heartbeat turns and returns
  `prependContext` or `appendContext`. It is intended for background monitors
  that need to summarize current state without changing user-initiated turns.

`before_agent_start` remains for compatibility. Prefer the explicit hooks above
so your plugin does not depend on a legacy combined phase.

`before_agent_run` 在建構提示之後以及任何模型輸入之前運行，包括載入提示本機圖片和 `llm_input` 觀察。它會接收目前的用戶輸入作為 `prompt`，以及 `messages` 中已載入的會話歷史記錄和啟用的系統提示。傳回 `{ outcome: "block", reason, message? }` 以在模型讀取提示之前停止執行。`reason` 是內部使用的；`message` 是供用戶使用的替代品。唯一支援的結果是 `pass` 和 `block`；不支援的決定形狀將會封閉式失敗。

當執行被阻擋時，OpenClaw 僅在 `message.content` 中儲存替代文字，以及非敏感的阻擋元數據（例如阻擋外掛程式 ID 和時間戳記）。原始用戶文字不會保留在逐字稿或未來的上下文中。內部阻擋原因被視為敏感資訊，並會從逐字稿、歷史記錄、廣播、日誌和診斷酬載中排除。可觀測性應使用清理後的欄位，例如阻擋者 ID、結果、時間戳記或安全的類別。

當 OpenClaw 能夠識別啟用的執行時，`before_agent_start` 和 `agent_end` 會包含 `event.runId`。相同的值也可以在 `ctx.runId` 上取得。Cron 驅動的執行也會公開 `ctx.jobId`（來源的 cron 工作 ID），以便外掛程式掛鉤可以將指標、副作用或狀態範圍限定在特定的排程工作內。

對於來自頻道的執行，`ctx.messageProvider` 是提供者介面，例如 `discord` 或 `telegram`，而當 OpenClaw 可以從會話金鑰或遞送元數據推導出來時，`ctx.channelId` 是對話目標識別碼。

`agent_end` 是一個觀測 Hook。Gateway 和持久化 harness 路徑在回合結束後以「即發即棄」方式執行它，而短暫的一次性 CLI 路徑則會在程序清理前等待 Hook promise，以便受信任的外掛能刷新終端機可觀測性或捕獲狀態。Hook 執行器會套用 30 秒逾時，因此卡住的外掛或嵌入端點無法讓 Hook promise 永遠處於擱置狀態。逾時會被記錄下來，OpenClaw 會繼續執行；除非外掛也使用了自己的中止訊號，否則它不會取消外掛所擁有的網路工作。

針對不應接收原始提示、歷史、回應、標頭、請求主體或提供者請求 ID 的提供者呼叫遙測，請使用 `model_call_started` 和 `model_call_ended`。這些 Hook 包含穩定的元數據，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端 `durationMs`/`outcome`，以及當 OpenClaw 可推導出有界的提供者請求 ID 雜湊時的 `upstreamRequestIdHash`。當執行時已解析上下文視窗元數據時，Hook 事件和上下文也會包含 `contextTokenBudget`（即模型/配置/代理限制後的有效 Token 預算），以及當套用了較低上限時的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 僅在 harness 準備接受自然的最終助理回覆時執行。它不是 `/stop` 取消路徑，也不會在使用者中止回合時執行。傳回 `{ action: "revise", reason }` 以要求 harness 在最終確定之前再進行一次模型傳遞，傳回 `{ action: "finalize", reason? }` 以強制最終確定，或省略結果以繼續。Codex 原生 `Stop` hooks 會作為 OpenClaw `before_agent_finalize` 決策被轉發至此 Hook。

當傳回 `action: "revise"` 時，外掛可以包含 `retry` 元數據，以使額外的模型傳遞變成有界且可重播安全的：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到發送到 harness 的修訂原因。
`idempotencyKey` 讓主機能夠針對跨等最終決定的相同插件請求計算重試次數，而 `maxAttempts` 則限制主機在繼續進行自然最終答案之前所允許的額外通過次數。

需要原始對話 hooks (`before_model_resolve`, `before_agent_reply`, `llm_input`, `llm_output`, `before_agent_finalize`, `agent_end`, 或 `before_agent_run`) 的非綑綁插件必須設定：

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 針對每個插件停用修改提示的 hooks 和持久的下一輪注入。

### 會話擴充和下一輪注入

工作流程插件可以使用 `api.registerSessionExtension(...)` 保存小型 JSON 相容的會話狀態，並透過 Gateway 的 `sessions.pluginPatch` 方法進行更新。會話行會透過 `pluginExtensions` 投影註冊的擴充狀態，讓 Control UI 和其他用戶端能夠呈現插件擁有的狀態，而無需了解插件內部細節。

當插件需要持續性上下文以精確一次地到達下一個模型輪次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示 hooks 之前排空已排隊的注入，捨棄過期的注入，並針對每個插件依 `idempotencyKey` 去重。這是核准恢復、策略摘要、背景監控增量以及指令繼續執行的正確縫合位置，這些內容應該在下一輪對模型可見，但不應變成永久的系統提示文字。

清除語意是契約的一部分。會話擴充清除和執行時期生命週期清除回呼會接收 `reset`、`delete`、`disable` 或 `restart`。針對重置/刪除/停用，主機會移除擁有插件的持久會話擴充狀態和待處理的下一輪注入；重新啟動會保留持久會話狀態，而清除回呼則讓插件能夠釋放排程器工作、執行上下文以及舊執行時期世代的其他頻外資源。

## 訊息 hooks

使用訊息鉤子來處理通道層級的路由和傳遞原則：

- `message_received`：觀察輸入內容、發送者、`threadId`、`messageId`、
  `senderId`、選用的執行/會話關聯，以及元資料。
- `message_sending`：改寫 `content` 或傳回 `{ cancel: true }`。
- `reply_payload_sending`：改寫標準化的 `ReplyPayload` 物件（包括
  `presentation`、`delivery`、媒體參照和文字）或傳回 `{ cancel: true }`。
- `message_sent`：觀察最終成功或失敗。

對於僅限音訊的 TTS 回覆，即使通道酬載沒有可見的文字/字幕，`content` 也可能包含隱藏的口說文字稿。改寫該
`content` 只會更新鉤子可見的文字稿；它不會被轉譯為媒體字幕。

訊息鉤子內容會在可用時公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取舊版元資料之前，請優先
使用這些一級欄位。

在使用通道特定的元資料之前，請優先使用類型化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- 帶有 `cancel: true` 的 `message_sending` 是終止的。
- 帶有 `cancel: false` 的 `message_sending` 被視為未做決策。
- 改寫後的 `content` 會繼續傳遞給優先級較低的鉤子，除非後續的鉤子
  取消傳遞。
- `reply_payload_sending` 在酬載標準化之後、通道傳遞之前執行，包括路由回原始通道的回覆。處理程式
  依序執行，且每個處理程式都能看到由優先級較高的處理程式產生的最新酬載。
- `reply_payload_sending` 載荷不會公開執行時信任標記，例如
  `trustedLocalMedia`；外掛程式可以編輯載荷形狀，但無法授予本機
  媒體信任。
- `message_sending` 可以透過取消傳回 `cancelReason` 和有界的 `metadata`。新的訊息生命週期 API 將此公開為原因為 `cancelled_by_message_sending_hook` 的已隱藏傳遞
  結果；為了相容性，舊版直接傳遞會繼續傳回空結果陣列。
- `message_sent` 僅供觀察。處理程式失敗會被記錄下來，且不會
  改變傳遞結果。

## 安裝掛鉤

`before_install` 在內建的技能和外掛程式安裝掃描之後執行。
傳回額外的發現結果或 `{ block: true, blockReason }` 以停止
安裝。

`block: true` 是終止的。`block: false` 被視為未做決定。

## Gateway 生命週期

對於需要 Gateway 擁有狀態的外掛程式服務，請使用 `gateway_start`。該
上下文公開了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 以用於
cron 檢查和更新。使用 `gateway_stop` 清理長時間執行
的資源。

不要依賴內部 `gateway:startup` 掛鉤來處理外掛程式擁有的執行
時服務。

`cron_changed` 會針對 Gateway 擁有的 cron 生命週期事件觸發，其類型化的事件承載涵蓋了 `added`、`updated`、`removed`、`started`、`finished`
以及 `scheduled` 等原因。該事件帶有 `PluginHookGatewayCronJob`
的快照（包括存在的 `state.nextRunAtMs`、`state.lastRunStatus` 和
`state.lastError`）以及 `PluginHookGatewayCronDeliveryStatus`
的 `not-requested` | `delivered` | `not-delivered` | `unknown`。移除事件
仍會帶有已刪除的工作快照，以便外部排程器
能協調狀態。當同步外部喚醒排程器時，請使用執行
環境中的 `ctx.getCron?.()` 和 `ctx.config`，並讓 OpenClaw 作為到期檢查和執行的單一真實來源。

## 即將廢棄的功能

少數與 Hook 相關的功能已標記為廢棄，但仍受支援。請在下一個主要版本發布前進行遷移：

- `inbound_claim` 和 `message_received`
  處理程序中的 **純文字通道信封**。請讀取 `BodyForAgent` 和結構化的使用者內容區塊
  而非解析扁平的信封文字。請參閱
  [Plaintext channel envelopes → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 為了相容性而保留。新的外掛應使用
  `before_model_resolve` 和 `before_prompt_build` 取代這個
  合併階段。
- **`deactivate`** 在 2026-08-16 之前仍作為已廢棄的清理相容性別名保留。
  新的外掛應使用 `gateway_stop`。
- **`onResolution` in `before_tool_call`** 現在使用類型化的
  `PluginApprovalResolution` 聯集 (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`)，而非自由形式的 `string`。

如需完整清單——包括記憶能力註冊、提供者思考設定檔、外部驗證提供者、提供者探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 的重新命名——請參閱 [Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK migration](/zh-Hant/plugins/sdk-migration) - 目前廢止項目與移除時間表
- [Building plugins](/zh-Hant/plugins/building-plugins)
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)
- [Plugin entry points](/zh-Hant/plugins/sdk-entrypoints)
- [Internal hooks](/zh-Hant/automation/hooks)
- [Plugin architecture internals](/zh-Hant/plugins/architecture-internals)
