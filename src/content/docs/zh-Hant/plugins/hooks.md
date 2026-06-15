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

如果您想要一個由操作員安裝的小型 `HOOK.md` 腳本來處理命令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`），請改用 [內部掛鉤](/zh-Hant/automation/hooks)。

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
- `resolve_exec_env` - 貢獻插件擁有的環境變數給 `exec`
- **`tool_result_persist`** - 重寫由工具結果產生的助理訊息
- **`before_message_write`** - 檢查或阻止正在進行的訊息寫入（罕見）

**訊息與傳遞**

- **`inbound_claim`** - 在代理路由之前認領傳入訊息（合成回覆）
- `message_received` — 觀察傳入內容、發送者、執行緒和中繼資料
- **`message_sending`** — 重寫輸出內容或取消發送
- **`reply_payload_sending`** — 在發送前變更或取消標準化的回應承載
- `message_sent` — 觀察輸出發送的成功或失敗
- **`before_dispatch`** - 在通道移交之前檢查或重寫輸出分派
- **`reply_dispatch`** - 參與最終的回應分派管道

**會話與壓縮**

- `session_start` / `session_end` - 追蹤 Session 生命週期邊界。該事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。當 Session 仍處於活動狀態時程序停止或重新啟動，`shutdown` 和 `restart` 值會從 Gateway 關閉終結器觸發，因此下游插件（例如記憶體或文字記錄存儲）可以最終化那些否則會在重新啟動之間保持開啟狀態的「幽靈」行。該終結器是有界的，因此緩慢的插件無法阻擋 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 觀察或註解壓實週期
- `before_reset` - 觀察 session-reset 事件（`/reset`、程式化重置）

**子代理**

- `subagent_spawned` / `subagent_ended` - 觀察子代理啟動與完成。
- `subagent_delivery_target` - 當沒有核心 session 繫結可以投射路由時，用於完成傳遞的相容性 hook。
- `subagent_spawning` - 已棄用的相容性 hook。核心現在會透過通道 session-binding 配接器，在 `subagent_spawned` 觸發之前準備 `thread: true` 子代理繫結。
- 當 OpenClaw 在啟動前解析子 session 的原生模型時，`subagent_spawned` 會包含 `resolvedModel` 和 `resolvedProvider`。

**生命週期**

- `gateway_start` / `gateway_stop` - 與 Gateway 一起啟動或停止外掛程式擁有的服務
- `deactivate` - `gateway_stop` 的已棄用相容性別名；在新外掛程式中請使用 `gateway_stop`
- `cron_changed` - 觀察 Gateway 擁有的 cron 生命週期變更（已新增、已更新、已移除、已啟動、已結束、已排程）
- **`before_install`** - 檢查技能或外掛程式安裝掃描並選擇性地封鎖

## Debug runtime hooks

當外掛程式需要為代理程式回合切換提供者或模型時，請使用 `before_model_resolve`。它在模型解析之前執行；`llm_output` 僅在模型嘗試產生助理輸出之後執行。

為了驗證有效的 session model，請檢查執行時期註冊，然後使用 `openclaw sessions` 或 Gateway session/status 介面。在除錯 provider payloads 時，請使用 `--raw-stream` 和 `--raw-stream-path <path>` 啟動 Gateway；這些標誌會將原始 model stream 事件寫入 l 檔案。

## Tool call policy

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用的 `event.toolKind` 和 `event.toolInputKind`，主機授權的區別符，用於故意共享名稱的工具；例如，外部 code-mode `exec` 呼叫使用 `toolKind: "code_mode_exec"` 並在已知輸入語言時包含 `toolInputKind: "javascript" | "typescript"`
- 選填 `event.derivedPaths`，包含針對知名工具封包（例如 `apply_patch`）盡力而為的主機衍生目標路徑提示；當存在時，這些路徑可能不完整，或者可能過度估算工具實際會觸及的範圍（例如，遇到格式錯誤或部分的輸入）
- 選填 `event.runId`
- 選填 `event.toolCallId`
- 上下文欄位，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（設於 cron 驅動的執行）、`ctx.toolKind`、
  `ctx.toolInputKind` 以及診斷 `ctx.trace`

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

- `block: true` 是終止的，並會跳過優先順序較低的處理程序。
- `block: false` 被視為不做決定。
- `params` 會為執行重寫工具參數。
- `requireApproval` 會暫停代理程式執行並透過外掛程式核准向使用者詢問。`/approve` 指令可以核准執行和外掛程式核准。在 Codex app-server 報告模式原生 `PreToolUse` 轉發中，這會延遲到對應的 app-server 核准請求；請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#hook-boundaries)。
- 較低優先級的 `block: true` 在較高優先級的 Hook 要求核准後仍可以封鎖。
- `onResolution` 接收解析後的審批決定 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

請參閱 [外掛程式權限請求](/zh-Hant/plugins/plugin-permission-requests) 以了解
審批路由、決策行為，以及何時應使用 `requireApproval` 而非
選用工具或 exec 審批。

需要主機層級策略的隨附外掛程式可以使用 `api.registerTrustedToolPolicy(...)` 註冊受信任工具策略。
這些策略會在一般 `before_tool_call` hook 和外部外掛程式決策之前執行。
僅將其用於主機信任的閘道，例如工作區策略、預算強制執行或
保留的工作流程安全性。外部外掛程式應使用一般的 `before_tool_call`
hooks。

### Exec 環境 hook

`resolve_exec_env` 允外掛程式在建立基礎執行環境之後、命令執行之前，貢獻環境變數給 `exec` 工具叫用。它接收：

- `event.sessionKey`
- `event.toolName`，目前總是 `"exec"`
- `event.host`，為 `"gateway"`、`"sandbox"` 或 `"node"` 之一
- 諸如 `ctx.agentId`、`ctx.sessionKey`、
  `ctx.messageProvider` 和 `ctx.channelId` 等上下文欄位

傳回一個 `Record<string, string>` 以合併到執行環境中。處理程式按優先順序執行，且後續的 Hook 結果會覆寫相同鍵的先前 Hook 結果。

Hook 輸出在合併前會透過主機執行環境金鑰策略進行過濾。無效的金鑰、`PATH` 以及危險的主機覆寫金鑰（例如 `LD_*`、`DYLD_*`、`NODE_OPTIONS`）、Proxy 變數和 TLS 覆寫變數都會被捨棄。過濾後的外掛程式環境會包含在 Gateway 核准/稽核中繼資料中，並轉送至節點主機執行請求。

### Tool 結果持久性

Tool 結果可以包含用於 UI 呈現、診斷、媒體路由或外掛程式擁有之中繼資料的結構化 `details`。請將 `details` 視為執行階段中繼資料，而非提示內容：

- OpenClaw 會在提供者重放和壓縮輸入前移除 `toolResult.details`，以免中繼資料成為模型上下文。
- 持久化的會話條目僅保留有界的 `details`。過大的詳情會
  被替換為精簡摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最終
  持久化上限之前執行。Hook 仍應保持返回的 `details` 較小，並避免
  僅將提示相關的文字放在 `details` 中；請將模型可見的工具輸出
  放在 `content` 中。

## 提示和模型 Hook

對於新外掛，請使用特定階段的 Hook：

- `before_model_resolve`：僅接收當前提示和附件
  元數據。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收當前提示、準備好的會話訊息，以及為此會話耗盡的所有僅執行一次的佇列注入。傳回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收當前提示和會話訊息。傳回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：僅針對心跳回合執行並傳回 `prependContext` 或 `appendContext`。此功能適用於需要總結當前狀態而不變更使用者發起回合的背景監視器。

`before_agent_start` 保留以維持相容性。請優先使用上述明確的掛鉤，
以免您的外掛程式依賴舊版的合併階段。

`before_agent_run` 在提示詞建構之後、任何模型輸入之前執行，
包括提示詞本機圖像載入和 `llm_input` 觀察。它接收
當前的使用者輸入作為 `prompt`，加上載入的會話紀錄於 `messages`
以及活動的系統提示詞。回傳 `{ outcome: "block", reason, message? }`
可在模型讀取提示詞之前停止執行。`reason` 是內部使用；
`message` 是供使用者使用的替代方案。唯一支援的結果為
`pass` 和 `block`；不支援的決策形狀將會封閉式失敗。

當執行被封鎖時，OpenClow 只會將替換文字儲存在 `message.content` 中，加上非敏感的封鎖中繼資料，例如封鎖外掛程式 ID 和時間戳記。原始使用者文字不會保留在記錄或未來內容中。內部封鎖原因會被視為敏感資訊，並從記錄、歷史、廣播、記錄檔和診斷酬載中排除。可觀測性應使用經過清理的欄位，例如封鎖者 ID、結果、時間戳記或安全類別。

`before_agent_start` 和 `agent_end` 在 OpenClaw 能夠識別使用中執行時會包含 `event.runId`。相同的值也可在 `ctx.runId` 上取得。Cron 驅動的執行也會公開 `ctx.jobId` (來源 cron 工作 ID)，以便外掛程式掛鉤可以將指標、副作用或狀態的範圍限制在特定的排程工作中。

對於源自管道的執行，`ctx.messageProvider` 是提供者介面（例如 `discord` 或 `telegram`），而當 OpenClaw 可以從會話金鑰或遞送中繼資料衍生出來時，`ctx.channelId` 則是對話目標識別碼。

`agent_end` 是一個觀察掛鉤。Gateway 和持久性器路徑會在輪次之後以「即發即棄」的方式運行它，而短暫的一次性 CLI 路徑則會在程序清理前等待掛鉤承諾，以便受信任的外掛程式可以清除終端機可觀測性或擷取狀態。掛鉤執行器會套用 30 秒逾時，因此卡住的外掛程式或嵌入端點無法讓掛鉤承諾永遠處於擱置狀態。逾時會被記錄下來，OpenClaw 會繼續執行；除非外掛程式也使用自己的中止訊號，否則它不會取消外掛程式擁有的網路工作。

對於不應接收原始提示、歷史記錄、回應、標頭、要求主體或提供者請求 ID 的提供者呼叫遙測，請使用 `model_call_started` 和 `model_call_ended`。這些掛鉤包括穩定的元資料，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端機 `durationMs`/`outcome`，以及當 OpenClaw 可以推導出有界的提供者請求 ID 雜湊時的 `upstreamRequestIdHash`。當執行時期解析了內容視窗元資料時，掛鉤事件和內容也會包含 `contextTokenBudget`（即在模型/組態/代理程式上限之後的有效 Token 預算），以及當套用較低上限時的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 僅在器即将接受自然的最终助手答案时运行。它不是 `/stop` 取消路径，并且在用户中止轮次时不会运行。返回 `{ action: "revise", reason }` 以要求器在最终确定之前再进行一次模型传递，`{ action: "finalize", reason? }` 以强制最终确定，或者省略结果以继续。Codex 原生 `Stop` 挂钩作为 OpenClaw `before_agent_finalize` 决策被中继到此挂钩中。

返回 `action: "revise"` 時，外掛程式可以包含 `retry` 元資料，使額外的模型傳遞具有界限且可安全重播：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到發送至 harness 的修訂原因。
`idempotencyKey` 讓主機能夠計算跨等最終決策的相同插件請求重試次數，而 `maxAttempts` 限制了主機在繼續使用自然最終答案之前所允許的額外傳遞次數。

需要原始對話掛鉤（`before_model_resolve`、
`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、
`agent_end` 或 `before_agent_run`）的非捆綁插件必須設定：

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 針對每個插件停用提示變異掛鉤和持久的下一輪注入。

### Session extensions and next-turn injections

工作流程插件可以使用 `api.registerSessionExtension(...)` 持續保存小型 JSON 相容的會話狀態，並透過 Gateway
`sessions.pluginPatch` 方法進行更新。會話資料列透過 `pluginExtensions` 投射註冊的擴充狀態，
讓 Control UI 和其他用戶端能夠呈現插件擁有的狀態，而無需了解插件內部細節。

當插件需要持久的上下文以在下一個模型輪次中只執行一次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示掛鉤之前排空已排隊的注入，捨棄過期的注入，並根據 `idempotencyKey`
針對每個插件進行去重。這是核準恢復、策略摘要、背景監控增量以及命令延續的正確介入點，這些內容應在下一輪對模型可見，但不應成為永久性的系統提示文字。

清理語義是契約的一部分。會話擴充清理和運行時生命週期清理回呼會接收 `reset`、`delete`、`disable` 或
`restart`。對於重置/刪除/停用，主機會移除擁有插件的持久會話擴充狀態和待處理的下一輪注入；重新啟動則保留持久會話狀態，而清理回呼允許插件釋放舊運行時產生的排程器工作、運行上下文和其他帶外資源。

## Message hooks

使用訊息鉤子來進行通道層級的路由和傳遞策略：

- `message_received`：觀察傳入內容、發送者、`threadId`、`messageId`、
  `senderId`、可選的執行/會話關聯以及元資料。
- `message_sending`：重寫 `content` 或傳回 `{ cancel: true }`。
- `reply_payload_sending`：重寫標準化的 `ReplyPayload` 物件（包括
  `presentation`、`delivery`、媒體參照和文字）或傳回 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於純音訊的 TTS 回覆，即使通道承載沒有可見的文字/字幕，`content` 可能包含隱藏的口語逐字稿。
重寫該 `content` 僅更新鉤子可見的逐字稿；它不會被渲染為
媒體字幕。

訊息鉤子上下文會在可用時公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。傳入
和 `before_dispatch` 上下文也會在通道具有可見性過濾的引用訊息資料時公開回覆元資料：`replyToId`、`replyToBody` 和
`replyToSender`。在讀取舊版元資料之前，請優先使用這些一級欄位。

在使用通道特定的元資料之前，請優先使用型別化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- 具有 `cancel: true` 的 `message_sending` 為終止。
- 具有 `cancel: false` 的 `message_sending` 被視為未作決策。
- 重寫的 `content` 會繼續流向優先順序較低的鉤子，除非後續的鉤子
  取消傳遞。
- `reply_payload_sending` 在載荷正規化之後以及通道傳遞之前執行，包括路由回原始通道的回覆。處理程式按順序執行，每個處理程式都能看到由高優先級處理程式產生的最新載荷。
- `reply_payload_sending` 載荷不會公開執行時信任標記，例如 `trustedLocalMedia`；外掛可以編輯載荷形狀但無法授予本機媒體信任。
- `message_sending` 可以在取消時返回 `cancelReason` 和有界的 `metadata`。新的訊息生命週期 API 將其公開為原因為 `cancelled_by_message_sending_hook` 的已抑制傳遞結果；舊版直接傳遞為了相容性會繼續返回空結果陣列。
- `message_sent` 僅供觀察。處理程式失敗會被記錄，但不會改變傳遞結果。

## 安裝鉤子

`before_install` 在內建的技能和外掛安裝掃描之後執行。返回額外的發現或 `{ block: true, blockReason }` 以停止安裝。

`block: true` 是終止狀態。`block: false` 被視為未作決定。

## Gateway 生命週期

對於需要 Gateway 擁有狀態的外掛服務，請使用 `gateway_start`。上下文公開了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 以進行 cron 檢查和更新。使用 `gateway_stop` 來清理長期執行的資源。

請勿依賴內部的 `gateway:startup` 鉤子用於外掛擁有的執行時服務。

`cron_changed` 針對 Gateway 擁有的 cron 生命週期事件觸發，並帶有涵蓋 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因的類型化事件載荷。該事件攜帶 `PluginHookGatewayCronJob` 快照（包含 `state.nextRunAtMs`、`state.lastRunStatus` 以及存在時的 `state.lastError`），外加 `not-requested` | `delivered` | `not-delivered` | `unknown` 的 `PluginHookGatewayCronDeliveryStatus`。移除事件仍會攜帶已刪除的工作快照，以便外部排程器能協調狀態。在同步外部喚醒排程器時，請使用執行階段內容中的 `ctx.getCron?.()` 和 `ctx.config`，並將 OpenClaw 作為到期檢查與執行的單一事實來源。

## 即將廢棄的功能

少數與 hook 相關的介面已被標記為廢棄，但仍受支援。請在下一次
主要版本發布前進行遷移：

- `inbound_claim` 和 `message_received` 處理程序中的
  **純文字通道信封**。請讀取 `BodyForAgent` 和結構化使用者環境區塊
  ，而不要解析扁平的信封文字。請參閱
  [純文字通道信封 → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 為了相容性而保留。新的外掛程式應該使用
  `before_model_resolve` 和 `before_prompt_build`，而不是使用組合
  階段。
- **`subagent_spawning`** 保留是為了與舊版外掛程式相容，但
  新的外掛程式不應從中返回 thread routing。Core 會在
  `subagent_spawned` 觸發之前，透過通道 session-binding 介面卡準備
  `thread: true` 子代理程式繫結。
- **`deactivate`** 作為已棄用的清理相容別名保留，直到
  2026-08-16 之後。新的外掛程式應該使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 現在使用類型化的
  `PluginApprovalResolution` 聯集 (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`)，而不是自由格式的 `string`。

如需完整清單 - 包括記憶體功能註冊、供應商思考設定檔、外部驗證供應商、供應商探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 的重新命名 - 請參閱[Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK migration](/zh-Hant/plugins/sdk-migration) - 目前已棄用項目與移除時間表
- [Building plugins](/zh-Hant/plugins/building-plugins)
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)
- [Plugin entry points](/zh-Hant/plugins/sdk-entrypoints)
- [Internal hooks](/zh-Hant/automation/hooks)
- [Plugin architecture internals](/zh-Hant/plugins/architecture-internals)
