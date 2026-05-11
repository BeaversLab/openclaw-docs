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

Use [internal hooks](/zh-Hant/automation/hooks) instead when you want a small
operator-installed `HOOK.md` script for command and Gateway events such as
`/new`, `/reset`, `/stop`, `agent:bootstrap`, or `gateway:startup`.

## Quick start

Register typed plugin hooks with `api.on(...)` from your plugin entry:

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

Hook handlers run sequentially in descending `priority`. Same-priority hooks
keep registration order.

## Hook catalog

Hooks are grouped by the surface they extend. Names in **bold** accept a
decision result (block, cancel, override, or require approval); all others are
observation-only.

**Agent turn**

- `before_model_resolve` — override provider or model before session messages load
- `before_prompt_build` — add dynamic context or system-prompt text before the model call
- `before_agent_start` — compatibility-only combined phase; prefer the two hooks above
- **`before_agent_reply`** — short-circuit the model turn with a synthetic reply or silence
- **`before_agent_finalize`** — inspect the natural final answer and request one more model pass
- `agent_end` — observe final messages, success state, and run duration

**Conversation observation**

- `model_call_started` / `model_call_ended` — observe sanitized provider/model call metadata, timing, outcome, and bounded request-id hashes without prompt or response content
- `llm_input` — observe provider input (system prompt, prompt, history)
- `llm_output` — observe provider output

**Tools**

- **`before_tool_call`** — 重寫工具參數、封鎖執行或要求批准
- `after_tool_call` — 觀察工具結果、錯誤和持續時間
- **`tool_result_persist`** — 重寫由工具結果產生的助理訊息
- **`before_message_write`** — 檢查或封鎖正在進行的訊息寫入（罕見）

**訊息與傳遞**

- **`inbound_claim`** — 在代理路由之前聲明傳入訊息（合成回覆）
- `message_received` — 觀察傳入內容、發送者、執行緒和中繼資料
- **`message_sending`** — 重寫傳出內容或取消傳遞
- `message_sent` — 觀察傳出傳遞成功或失敗
- **`before_dispatch`** — 在通道移交之前檢查或重寫傳出分派
- **`reply_dispatch`** — 參與最終回覆分派管線

**工作階段與壓縮**

- `session_start` / `session_end` — 追蹤工作階段生命週期邊界
- `before_compaction` / `after_compaction` — 觀察或標註壓縮週期
- `before_reset` — 觀察工作階段重置事件（`/reset`、程式化重置）

**子代理**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — 協調子代理路由和完成傳遞

**生命週期**

- `gateway_start` / `gateway_stop` — 隨 Gateway 啟動或停止外掛擁有的服務
- **`before_install`** — 檢查技能或外掛安裝掃描並選擇性封鎖

## 工具呼叫政策

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 選用 `event.runId`
- 選用 `event.toolCallId`
- 諸如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驅動的執行中設定）等上下文字段，以及診斷 `ctx.trace`

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

- `block: true` 是終止的，並跳過較低優先級的處理程序。
- `block: false` 被視為未做出決定。
- `params` 會重寫工具參數以用於執行。
- `requireApproval` 會暫停代理程式執行，並透過外掛程式
  批准請求使用者。`/approve` 指令可以批准執行和外掛程式批准。
- 優先級較低的 `block: true` 仍可在優先級較高的掛鉤
  請求批准後進行封鎖。
- `onResolution` 會接收已解析的批准決定 —— `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

### 工具結果持久化

工具結果可以包含結構化的 `details`，用於 UI 渲染、診斷、
媒體路由或外掛程式擁有的元資料。請將 `details` 視為執行時期元資料，
而非提示詞內容：

- OpenClaw 會在供應商重播和壓縮輸入之前移除 `toolResult.details`，
  以免元資料成為模型上下文。
- 持久化的會話條目僅保留有界的 `details`。過大的詳細資訊
  會被替換為簡明的摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 會在最終
  持久化上限之前執行。掛鉤仍應保持返回的 `details` 較小，並避免
  僅將與提示詞相關的文字放在 `details` 中；請將模型可見的工具輸出
  放在 `content` 中。

## 提示詞與模型掛鉤

針對新外掛程式，使用特定階段的掛鉤：

- `before_model_resolve`：僅接收當前提示詞和附件
  元資料。返回 `providerOverride` 或 `modelOverride`。
- `before_prompt_build`：接收目前的提示詞和工作階段訊息。
  傳回 `prependContext`、`systemPrompt`、`prependSystemContext` 或
  `appendSystemContext`。

`before_agent_start` 保留用於相容性。建議優先使用上述明確的 hooks，
讓您的插件不會相依於傳統的合併階段。

`before_agent_start` 和 `agent_end` 會在 OpenClaw 能
識別活躍執行時包含 `event.runId`。同樣的值也可以在 `ctx.runId` 上取得。
Cron 驅動的執行也會公開 `ctx.jobId` (來源的 cron job id)，讓
plugin hooks 可以將指標、副作用或狀態限定於特定的排程
工作。

針對不應接收原始提示詞、歷史記錄、回應、標頭、請求
主體或提供者請求 ID 的提供者呼叫遙測，請使用 `model_call_started` 和 `model_call_ended`。這些 hooks 包含穩定的元數據，例如
`runId`、`callId`、`provider`、`model`、選用的 `api`/`transport`、終端
`durationMs`/`outcome`，以及當 OpenClaw 可推導出
有邊界的提供者請求-id 雜湊時的 `upstreamRequestIdHash`。

`before_agent_finalize` 僅在 harness 即將接受自然的
最終助理回答時執行。它不是 `/stop` 取消路徑，也不會
在使用者中止回合時執行。傳回 `{ action: "revise", reason }` 以要求
harness 在最終確定前再進行一次模型傳遞，傳回 `{ action:
"finalize", reason? }` 以強制最終確定，或省略結果以繼續。
Codex 原生 `Stop` hooks 會被中繼至此 hook 作為 OpenClaw
`before_agent_finalize` 決策。

需要 `llm_input`、`llm_output`、
`before_agent_finalize` 或 `agent_end` 的非封裝插件必須設定：

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

可以針對每個插件使用
`plugins.entries.<id>.hooks.allowPromptInjection=false` 來停用提示詞修改 hooks。

## 訊息 hooks

使用訊息鉤子進行通道層級的路由和傳遞策略：

- `message_received`：觀察輸入內容、發送者、`threadId`、`messageId`、
  `senderId`、選用的執行/會話關聯以及中繼資料。
- `message_sending`：重寫 `content` 或回傳 `{ cancel: true }`。
- `message_sent`：觀察最終的成功或失敗。

對於僅音訊的 TTS 回覆，即使通道載荷沒有可見的文字/字幕，`content` 也可能包含隱藏的口述轉錄。
重寫該 `content` 僅會更新鉤子可見的轉錄；它不會被呈現為
媒體字幕。

訊息鉤子內容會在可用時公開穩定的關聯欄位：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在讀取舊版中繼資料之前，
請優先考慮這些一級欄位。

在使用通道特定的中繼資料之前，請優先考慮類型化的 `threadId` 和 `replyToId` 欄位。

決策規則：

- 帶有 `cancel: true` 的 `message_sending` 是終端操作。
- 帶有 `cancel: false` 的 `message_sending` 被視為未作決定。
- 重寫後的 `content` 會繼續傳遞給優先級較低的鉤子，除非後續的鉤子
  取消傳遞。

## 安裝鉤子

`before_install` 在內建技能和外掛程式安裝掃描之後執行。
回傳其他發現結果或 `{ block: true, blockReason }` 以停止
安裝。

`block: true` 是終端操作。`block: false` 被視為未作決定。

## Gateway 生命週期

對需要 Gateway 擁有狀態的外掛服務使用 `gateway_start`。該上下文公開了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 以進行 cron 檢查和更新。使用 `gateway_stop` 來清理長時間執行的資源。

不要依賴內部 `gateway:startup` hook 來處理外掛擁有的執行時服務。

## 即將棄用

一些與 hook 相關的功能已被棄用但仍然受支援。請在下一個主要版本發布之前遷移：

- `inbound_claim` 和 `message_received` 處理程序中的 **純文字通道信封 (Plaintext channel envelopes)**。請閱讀 `BodyForAgent` 和結構化使用者上下文區塊，而不是解析扁平的信封文字。請參閱 [Plaintext channel envelopes → BodyForAgent](/zh-Hant/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 為了相容性而保留。新的外掛應該使用 `before_model_resolve` 和 `before_prompt_build` 來取代組合階段。
- **`before_tool_call` 中的 `onResolution`** 現在使用類型化的 `PluginApprovalResolution` 聯合 (`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`)，而不是自由形式的 `string`。

如需完整清單 — 記憶體功能註冊、提供者思考設定檔 (provider thinking profile)、外部驗證提供者、提供者探索類型、任務執行時存取器，以及 `command-auth` → `command-status` 重新命名 — 請參閱 [Plugin SDK migration → Active deprecations](/zh-Hant/plugins/sdk-migration#active-deprecations)。

## 相關

- [Plugin SDK migration](/zh-Hant/plugins/sdk-migration) — 目前棄用項目與移除時間表
- [Building plugins](/zh-Hant/plugins/building-plugins)
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)
- [Plugin entry points](/zh-Hant/plugins/sdk-entrypoints)
- [Internal hooks](/zh-Hant/automation/hooks)
- [Plugin architecture internals](/zh-Hant/plugins/architecture-internals)
