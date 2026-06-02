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

- `subagent_spawned` / `subagent_ended` - 觀察子代理的啟動和完成。
- `subagent_delivery_target` - 當沒有核心會話綁定可以投射路由時，用於傳遞完成的相容性掛鉤。
- `subagent_spawning` - 已棄用的相容性掛鉤。核心現在會在 `subagent_spawned` 觸發之前，透過通道會話綁定配接器準備 `thread: true` 子代理綁定。
- 當 OpenClaw 在啟動前解析了子會話的原生模型時，`subagent_spawned` 會包含 `resolvedModel` 和 `resolvedProvider`。

**生命週期**

- `gateway_start` / `gateway_stop` - 隨 Gateway 啟動或停止外掛程式擁有的服務
- `deactivate` - `gateway_stop` 的已棄用相容性別名；在新外掛程式中請使用 `gateway_stop`
- `cron_changed` - 觀察 Gateway 擁有的 cron 生命週期變更（已新增、已更新、已移除、已開始、已完成、已排程）
- **`before_install`** - 檢查技能或外掛程式安裝掃描並選擇性封鎖

## 偵錯執行時掛鉤

當外掛程式需要為代理回合切換提供者或模型時，請使用 `before_model_resolve`。它在模型解析之前執行；`llm_output` 僅在模型嘗試產生助理輸出之後執行。

若要證實有效的會話模型，請檢查執行時註冊，然後使用 `openclaw sessions` 或 Gateway 會話/狀態介面。偵錯提供者負載時，請使用 `--raw-stream` 和 `--raw-stream-path <path>` 啟動 Gateway；這些旗標會將原始模型串流事件寫入 l 檔案。

## 工具呼叫原則

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用的 `event.toolKind` 和 `event.toolInputKind`，這是主機授權的工具鑑別器，
  用於有意共用名稱的工具；例如，外層代碼模式的 `exec` 呼叫使用 `toolKind: "code_mode_exec"` 並在
  已知輸入語言時包含 `toolInputKind: "javascript" | "typescript"`
- 選用的 `event.derivedPaths`，包含盡力而為的主機衍生目標路徑
  提示，用於諸如 `apply_patch` 等知名工具封套；當存在時，
  這些路徑可能不完整，或者可能過度估算工具實際會
  觸碰的內容（例如，在輸入格式錯誤或部分的情況下）
- 選用的 `event.runId`
- 選用的 `event.toolCallId`
- 上下文欄位，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驅動的執行上設定）、`ctx.toolKind`、
  `ctx.toolInputKind`，以及診斷用的 `ctx.trace`

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

類型化生命週期 Hook 的 Hook 防護行為：

- `block: true` 是終止的，並跳過較低優先級的處理程序。
- `block: false` 被視為未做決定。
- `params` 會重寫用於執行的工具參數。
- `requireApproval` 會暫停代理程式執行，並透過外掛程式
  批准詢問使用者。`/approve` 指令可以批准 exec 和外掛程式批准。
  在 Codex app-server report-mode 原生 `PreToolUse` 中繼中，這會延遲
  到相符的 app-server 批准請求；請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#hook-boundaries)。
- 在較高優先級 Hook 要求批准後，較低優先級的 `block: true` 仍可進行封鎖。
- `onResolution` 會接收已解析的批准決定 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

關於審核路由、決策行為以及何時應使用 `requireApproval` 而非選用工具或執行審核，請參閱[外掛程式權限請求](/zh-Hant/plugins/plugin-permission-requests)。

需要主機層級原則的打包外掛程式可以使用 `api.registerTrustedToolPolicy(...)` 註冊受信任的工具原則。這些原則在一般的 `before_tool_call` 掛鉤和外部外掛程式決策之前執行。僅將其用於主機信任的閘道，例如工作區原則、預算強制執行或保留的工作流程安全性。外部外掛程式應使用一般的 `before_tool_call` 掛鉤。

### 工具結果持久性

工具結果可以包含結構化的 `details`，用於 UI 渲染、診斷、媒體路由或外掛程式擁有的中繼資料。請將 `details` 視為執行階段中繼資料，而非提示內容：

- OpenClaw 會在提供者重播和壓縮輸入之前移除 `toolResult.details`，以免中繼資料變成模型上下文。
- 持久化的會話項目僅保留有界的 `details`。過大的詳細資料會被替換為精簡摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最終持久性上限之前執行。掛鉤仍應保持傳回的 `details` 為小，並避免僅將提示相關文字放在 `details` 中；請將模型可見的工具輸出放在 `content` 中。

## 提示與模型掛鉤

針對新的外掛程式，請使用特定階段的掛鉤：

- `before_model_resolve`：僅接收目前的提示和附件中繼資料。傳回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收目前的提示、已準備的會話訊息，以及為此會話排空的任何一次佇列注入。傳回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收目前的提示和會話訊息。傳回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：僅針對心跳回合執行，並回傳
  `prependContext` 或 `appendContext`。它是專為背景監控設計的，
  需要總結當前狀態而不變更使用者發起的回合。

`before_agent_start` 保留以維持相容性。建議優先使用上述明確的 hooks，
以便您的插件不會依賴舊版的合併階段。

`before_agent_run` 在提示詞建構之後、任何模型輸入之前執行，
包括提示詞本地的圖片載入和 `llm_input` 觀測。它接收
當前使用者輸入作為 `prompt`，加上已載入的對話紀錄於 `messages`
以及啟用的系統提示詞。回傳 `{ outcome: "block", reason, message? }`
以在模型讀取提示詞之前停止執行。`reason` 是內部使用；
`message` 是對使用者公開的替代方案。唯一支援的結果是
`pass` 和 `block`；不支援的決策形狀將會封閉式失敗。

當執行被阻擋時，OpenClaw 僅將替換文字儲存在
`message.content` 中，加上非敏感的阻擋中繼資料，例如阻擋插件
ID 和時間戳記。原始使用者文字不會保留在紀錄或未來
的上下文中。內部阻擋原因被視為敏感資訊，並從
紀錄、歷史、廣播、日誌和診斷酬載中排除。可觀測性
應使用經過清理的欄位，例如阻擋者 ID、結果、時間戳記或安全的
類別。

`before_agent_start` 和 `agent_end` 在 OpenClaw 能
識別執行中的執行時會包含 `event.runId`。同樣的值也可在 `ctx.runId` 上取得。
Cron 驅動的執行也會公開 `ctx.jobId` (來源 cron 工作 ID)，以便
plugin hooks 能將指標、副作用或狀態限定在特定的排程
工作中。

對於來自通道的運行，`ctx.messageProvider` 是提供者介面，例如 `discord` 或 `telegram`，而當 OpenClaw 可以從 session 金鑰或傳遞元資料推導出來時，`ctx.channelId` 是對話目標識別碼。

`agent_end` 是一個觀測 hook。Gateway 和持久性駝鳥路徑在回合之後會以「發後即忘」的方式執行它，而短期一次性 CLI 路徑會在程序清理之前等待 hook promise，以便受信任的外掛可以沖刷終端機可觀測性或捕獲狀態。Hook 執行器會套用 30 秒逾時，因此卡住的外掛或嵌入端點無法讓 hook promise 永久處於擱置狀態。逾時會被記錄下來，OpenClaw 會繼續執行；除非外掛也使用了自己的中止訊號，否則它不會取消外掛擁有的網路工作。

針對不應接收原始提示、歷史記錄、回應、標頭、請求主體或提供者請求 ID 的提供者呼叫遙測，請使用 `model_call_started` 和 `model_call_ended`。這些 hook 包括穩定的元資料，例如 `runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端 `durationMs`/`outcome`，以及當 OpenClaw 可以推導出有界的提供者請求 ID 雜湊時的 `upstreamRequestIdHash`。當執行時已解析內容視窗元資料時，hook 事件和內容也包括 `contextTokenBudget`，即模型/配置/代理上限後的有效 token 預算，以及在套用較低上限時的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 僅在 harness 準備接受自然的最終助理回答時執行。它不是 `/stop` 取消路徑，並且當使用者中止回合時不會執行。傳回 `{ action: "revise", reason }` 以在完成前要求 harness 再進行一次模型傳遞，`{ action: "finalize", reason? }` 以強制完成，或省略結果以繼續。Codex 原生 `Stop` hooks 會作為 OpenClaw `before_agent_finalize` 決策轉發至此 hook。

當傳回 `action: "revise"` 時，外掛程式可以包含 `retry` 元資料，使額外的模型傳遞受限且重放安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 會附加到傳送至 harness 的修訂原因。`idempotencyKey` 讓主機能夠在等效的完成決策中計算相同外掛程式請求的重試次數，而 `maxAttempts` 則限制主機在繼續進行自然最終回答之前允許的額外傳遞次數。

需要原始對話 hooks (`before_model_resolve`, `before_agent_reply`, `llm_input`, `llm_output`, `before_agent_finalize`, `agent_end`, 或 `before_agent_run`) 的非捆綁式外掛程式必須設定：

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 針對每個外掛程式停用提示修改 hooks 和持久的下一回合注入。

### Session extensions and next-turn injections

Workflow 外掛程式可以使用 `api.registerSessionExtension(...)` 持續保存少量 JSON 相容的 session 狀態，並透過 Gateway `sessions.pluginPatch` 方法進行更新。Session 列透過 `pluginExtensions` 投影已註冊的擴充狀態，讓 Control UI 和其他用戶端能夠呈現外掛程式擁有的狀態，而無需了解外掛程式內部細節。

當外掛需要持久上下文以在下一次模型轉換中精確到達一次時，請使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 會在提示掛鉤之前排空排隊的注入，丟棄過期的注入，並按 `idempotencyKey` 對每個外掛進行去重。這是恢復審批、策略摘要、背景監控增量以及應在下一次轉換中對模型可見但不應成為永久系統提示文字的命令繼續的正確接縫。

清理語義是合約的一部分。會話擴展清理和執行時生命週期清理回呼會接收 `reset`、`delete`、`disable` 或 `restart`。主機會移除擁有外掛的持久會話擴展狀態和待處理的下一次轉換注入以進行重置/刪除/停用；重新啟動會保留持久會話狀態，而清理回呼允許外掛釋放排程器作業、執行上下文以及舊執行時生成的其他頻外資源。

## 訊息掛鉤

使用訊息掛鉤進行通道級路由和傳遞策略：

- `message_received`：觀察輸入內容、發送者、`threadId`、`messageId`、`senderId`、可選的執行/會話關聯以及元數據。
- `message_sending`：重寫 `content` 或返回 `{ cancel: true }`。
- `reply_payload_sending`：重寫標準化的 `ReplyPayload` 物件（包括 `presentation`、`delivery`、媒體參考和文字）或返回 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於僅音訊 TTS 回覆，`content` 可能包含隱藏的口語逐字稿，即使通道載荷沒有可見的文字/標題。重寫該 `content` 僅更新掛鉤可見的逐字稿；它不會被渲染為媒體標題。

訊息掛鉤上下文會在可用時公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取舊版中繼資料之前，請優先使用這些一級欄位。

在使用特定頻道的中繼資料之前，請優先使用具類型的 `threadId` 和 `replyToId` 欄位。

決策規則：

- `message_sending` 搭配 `cancel: true` 為終止狀態。
- `message_sending` 搭配 `cancel: false` 被視為未做決策。
- 重寫的 `content` 會繼續傳遞給較低優先順序的掛鉤，除非後續掛鉤取消傳遞。
- `reply_payload_sending` 在載荷正規化之後以及頻道傳遞之前執行，包括路由回原始頻道的回覆。處理程序會循序執行，且每個處理程序都會看到由較高優先順序處理程序產生的最新載荷。
- `reply_payload_sending` 載荷不會公開執行時信任標記，例如 `trustedLocalMedia`；外掛程式可以編輯載荷形狀，但無法授予本機媒體信任。
- `message_sending` 可以傳回 `cancelReason` 和有界的 `metadata` 進行取消。新的訊息生命週期 API 將其公開為具有理由 `cancelled_by_message_sending_hook` 的已抑制傳遞結果；舊版直接傳遞為了相容性，會繼續傳回空結果陣列。
- `message_sent` 僅供觀察。處理程序失敗會被記錄下來，且不會變更傳遞結果。

## 安裝掛鉤

`before_install` 在內建掃描技能和外掛程式安裝之後執行。
傳回額外的發現項目或 `{ block: true, blockReason }` 以停止安裝。

`block: true` 為終止狀態。`block: false` 被視為未做決策。

## 閘道生命週期

對需要 Gateway 所擁有狀態的 plugin 服務使用 `gateway_start`。
context 揭露了 `ctx.config`、`ctx.workspaceDir` 和
`ctx.getCron?.()` 以供 cron 檢查與更新。使用 `gateway_stop`
來清理長期執行的資源。

不要依賴內部的 `gateway:startup` hook 來處理 plugin 所擁有的
runtime 服務。

`cron_changed` 會針對 Gateway 所擁有的 cron 生命週期事件觸發，並攜帶
類型化的事件 payload，涵蓋 `added`、`updated`、`removed`、`started`、`finished`
和 `scheduled` 等原因。該事件攜帶一個 `PluginHookGatewayCronJob`
快照（當存在時包含 `state.nextRunAtMs`、`state.lastRunStatus` 和
`state.lastError`）加上一個 `PluginHookGatewayCronDeliveryStatus`
包含 `not-requested` | `delivered` | `not-delivered` | `unknown`。移除
事件仍會攜帶已刪除的工作快照，以便外部排程器
協調狀態。同步外部喚醒排程器時，請使用 runtime context 中的
`ctx.getCron?.()` 和 `ctx.config`，並將 OpenClaw 作為到期檢查與執行的
唯一真實來源。

## 即將棄用的功能

少數與 hook 相關的介面已棄用但仍受支援。請在下一個主要版本發布前
進行移轉：

- `inbound_claim` 和 `message_received`
  處理程序中的 **純文字通道信封 (Plaintext channel envelopes)**。請讀取
  `BodyForAgent` 和結構化的使用者內容區塊，
  而非解析扁平的信封文字。請參閱
  [Plaintext channel envelopes → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 基於相容性而保留。新 plugins 應使用
  `before_model_resolve` 和 `before_prompt_build` 取代這個
  合併階段。
- **`subagent_spawning`** 為了與較舊的外掛程式相容而保留，但
  新的外掛程式不應從它返回執行緒路由。Core 會在 `subagent_spawned` 觸發前，透過通道會話綁定介面卡準備
  `thread: true` 子代理程式綁定。
- **`deactivate`** 作為已棄用的清理相容別名保留，直到
  2026-08-16 之後。新的外掛程式應該使用 `gateway_stop`。
- `before_tool_call` 中的 **`onResolution`** 現在使用型別化的
  `PluginApprovalResolution` 聯集 (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`)，而不是自由形式的 `string`。

如需完整清單——記憶體功能註冊、提供者思考設定檔、外部驗證提供者、提供者探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 重新命名——請參閱
[Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK migration](/zh-Hant/plugins/sdk-migration) - 目前已棄用項目與移除時程
- [Building plugins](/zh-Hant/plugins/building-plugins)
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)
- [Plugin entry points](/zh-Hant/plugins/sdk-entrypoints)
- [Internal hooks](/zh-Hant/automation/hooks)
- [Plugin architecture internals](/zh-Hant/plugins/architecture-internals)
