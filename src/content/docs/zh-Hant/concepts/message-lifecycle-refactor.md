---
summary: "統一的持續性訊息接收、發送、預覽、編輯與串流生命週期設計方案"
read_when:
  - Refactoring channel send or receive behavior
  - Changing channel turn, reply dispatch, outbound queue, preview streaming, or plugin SDK message APIs
  - Designing a new channel plugin that needs durable sends, receipts, previews, edits, or retries
title: "訊息生命週期重構"
---

本頁面是目標設計，旨在用一個持續性的訊息生命週期來取代分散的通道輪次、回覆派發、預覽串流以及輸出傳遞輔助函式。

簡而言之：

- 核心原語應該是 **receive**（接收）和 **send**（發送），而不是 **reply**（回覆）。
- 回覆僅是輸出訊息上的一種關聯。
- 輪次 只是輸入處理的便利措施，並非傳遞的擁有者。
- 發送必須基於情境：`begin`、轉譯、預覽或串流、最終發送、提交、失敗。
- 接收也必須基於情境：正規化、去重、路由、記錄、派發、平台確認、失敗。
- 公開的插件 SDK 應精簡為一個小型的通道訊息介面。

## 問題

目前的通道堆疊源於幾個合理的本地需求：

- 簡單的輸入適配器使用 `runtime.channel.turn.run`。
- 豐富的適配器使用 `runtime.channel.turn.runPrepared`。
- 舊版輔助函式使用 `dispatchInboundReplyWithBase`、
  `recordInboundSessionAndDispatchReply`、回覆載荷輔助函式、回覆分塊、
  回覆參照以及輸出執行時輔助函式。
- 預覽串流存在於特定通道的派發器中。
- 最終傳遞的持續性正圍繞現有的回覆載荷路徑添加。

這種結構雖然修復了本地錯誤，但也讓 OpenClaw 留下了過多的公開概念，以及過多可能導致傳遞語義偏離的位置。

暴露此問題的可靠性問題如下：

```text
Telegram polling update acked
  -> assistant final text exists
  -> process restarts before sendMessage succeeds
  -> final response is lost
```

目標不變性比 Telegram 更廣泛：一旦核心決定應存在一個可見的輸出訊息，則在嘗試平台發送之前，該意圖必須是持續性的，且成功後必須提交平台回執。這賦予了 OpenClaw 至少一次 的恢復能力。僅當適配器能夠證明原生冪等性，或在重播前將發送後未知 的嘗試與平台狀態進行協調時，才存在恰好一次 的行為。

這是此次重構的最終狀態，並非描述每個當前的路徑。在遷移期間，當盡力而為的佇列寫入失敗時，現有的輸出輔助程式仍然可以回退到直接發送。只有當持久的最終發送在失敗時封閉處理，或透過文件化的非持久策略明確選擇退出時，重構才算完成。

## 目標

- 所有頻道訊息接收和發送路徑的一個核心生命週期。
- 在適配器宣告可重播安全行為後，新的訊息生命週期中預設採用持久的最終發送。
- 共享的預覽、編輯、串流、最終確定、重試、恢復和接收語意。
- 一個小型的外掛 SDK 介面，方便第三方外掛學習和維護。
- 在遷移期間與現有的 `channel.turn` 呼叫端相容。
- 針對新頻道功能的清晰擴充點。
- 核心中沒有特定於平台的分支。
- 沒有 token-delta 頻道訊息。頻道串流保持為訊息預覽、編輯、追加或完成的區塊傳遞。
- 針對操作/系統輸出的結構化 OpenClaw 來源元數據，以便可見的閘道失敗不會作為新的提示重新進入共用的啟用機器人房間。

## 非目標

- 不要在第一階段移除 `runtime.channel.turn.*`。
- 不要強迫每個頻道採用相同的原生傳輸行為。
- 不要在核心中教導 Telegram 主題、Slack 原生串流、Matrix 紅訊、飛書卡片、QQ 語音或 Teams 活動。
- 不要將所有內部遷移輔助程式發佈為穩定的 SDK API。
- 不要讓重試重放已完成的非等冪平台操作。

## 參考模型

Vercel Chat 有一個很好的公開心智模型：

- `Chat`
- `Thread`
- `Channel`
- `Message`
- 適配器方法，例如 `postMessage`、`editMessage`、`deleteMessage`、
  `stream`、`startTyping` 和歷史記錄提取
- 用於去重、鎖定、佇列和持久化的狀態適配器

OpenClaw 應該借用詞彙，而不是複製表面。

OpenClaw 在該模型之外的額外需求：

- 在直接傳輸呼叫之前的持久輸出發送意圖。
- 具有開始、提交和失敗的明確發送上下文。
- 了解平台確認策略的接收上下文。
- 能在重啟後存留並驅動編輯、刪除、恢復和重複抑制的收據。
- 更小的公開 SDK。捆綁的插件可以使用內部執行時輔助程式，但第三方插件應該看到一個一致的訊息 API。
- Agent 專屬的行為：sessions、transcripts、區塊串流、工具進度、核准、媒體指令、無聲回覆，以及群組提及歷史。

`thread.post()` 風格的 promises 對 OpenClaw 來說是不夠的。它們隱藏了決定發送是否可恢復的事務邊界。

## 核心模型

新的領域應該位於一個內部核心命名空間下，例如 `src/channels/message/*`。

它有四個概念：

```typescript
core.messages.receive(...)
core.messages.send(...)
core.messages.live(...)
core.messages.state(...)
```

`receive` 擁有入站生命週期。

`send` 擁有出站生命週期。

`live` 擁有預覽、編輯、進度和串流狀態。

`state` 擁有持久意圖儲存、收據、等冪性、恢復、鎖定和去重。

## 訊息術語

### 訊息

標準化的訊息是平台中立的：

```typescript
type ChannelMessage = {
  id: string;
  channel: string;
  accountId?: string;
  direction: "inbound" | "outbound";
  target: MessageTarget;
  sender?: MessageActor;
  body?: MessageBody;
  attachments?: MessageAttachment[];
  relation?: MessageRelation;
  origin?: MessageOrigin;
  timestamp?: number;
  raw?: unknown;
};
```

### 目標

目標描述了訊息所在的位置：

```typescript
type MessageTarget = {
  kind: "direct" | "group" | "channel" | "thread";
  id: string;
  label?: string;
  spaceId?: string;
  parentId?: string;
  threadId?: string;
  nativeChannelId?: string;
};
```

### 關係

回覆是一種關係，而不是 API 根節點：

```typescript
type MessageRelation =
  | {
      kind: "reply";
      inboundMessageId?: string;
      replyToId?: string;
      threadId?: string;
      quote?: MessageQuote;
    }
  | {
      kind: "followup";
      sessionKey?: string;
      previousMessageId?: string;
    }
  | {
      kind: "broadcast";
      reason?: string;
    }
  | {
      kind: "system";
      reason: "approval" | "task" | "hook" | "cron" | "subagent" | "message_tool" | "cli" | "control_ui" | "automation" | "error";
    };
```

這讓相同的發送路徑能夠處理正常回覆、cron 通知、核准提示、任務完成、訊息工具發送、CLI 或 Control UI 發送、subagent 結果以及自動化發送。

### 來源

來源描述了誰產生了訊息，以及 OpenClaw 應如何處理該訊息的回響。它與關係分開：一則訊息可以是對使用者的回覆，但仍然是由 OpenClaw 產生的運營輸出。

```typescript
type MessageOrigin =
  | {
      source: "openclaw";
      schemaVersion: 1;
      kind: "gateway_failure";
      code: "agent_failed_before_reply" | "missing_api_key" | "model_login_expired";
      echoPolicy: "drop_bot_room_echo";
    }
  | {
      source: "user" | "external_bot" | "platform" | "unknown";
    };
```

Core 擁有 OpenClaw 產生之輸出的含義。Channels 擁有將該來源編碼到其傳輸中的方式。

第一個必須的用途是閘道失敗輸出。人類應該仍然能看到諸如「Agent 在回覆前失敗」或「缺少 API 金鑰」之類的訊息，但在啟用 `allowBots` 時，在共用聊天室中不得將標記為 OpenClaw 運營輸出的內容視為 bot 撰寫的輸入。

### 收據

收據是一等公民：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  sentAt: number;
  raw?: unknown;
};

type MessageReceiptPart = {
  platformMessageId: string;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  index: number;
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  raw?: unknown;
};
```

收據是從持久意圖通往未來編輯、刪除、預覽最終確定、重複抑制和恢復的橋樑。

回執可以描述一個平台訊息或多部分傳遞。分塊文字、媒體加文字、語音加文字以及卡片後備必須保留所有平台 ID，同時仍要公開主要 ID 以用於串接和後續編輯。

## 接收上下文

接收不應只是一個單純的輔助函式呼叫。核心需要一個能夠處理去重、路由、會話記錄和平台確認政策的上下文。

```typescript
type MessageReceiveContext = {
  id: string;
  channel: string;
  accountId?: string;
  input: ChannelMessage;
  ack: ReceiveAckController;
  route: MessageRouteController;
  session: MessageSessionController;
  log: MessageLifecycleLogger;

  dedupe(): Promise<ReceiveDedupeResult>;
  resolve(): Promise<ResolvedInboundMessage>;
  record(resolved: ResolvedInboundMessage): Promise<RecordResult>;
  dispatch(recorded: RecordResult): Promise<DispatchResult>;
  commit(result: DispatchResult): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

接收流程：

```text
platform event
  -> begin receive context
  -> normalize
  -> classify
  -> dedupe and self-echo gate
  -> route and authorize
  -> record inbound session metadata
  -> dispatch agent run
  -> durable outbound sends happen through send context
  -> commit receive
  -> ack platform when policy allows
```

Ack（確認）並非單一事物。接收契約必須將這些訊號分開：

- **Transport ack（傳輸確認）：** 告知平台 webhook 或 socket OpenClaw 已接受
  事件信封。某些平台在分發前要求此確認。
- **Polling offset ack（輪詢偏移確認）：** 前進游標以免再次取得相同事件。
  此動作不得前進超過無法恢復的工作。
- **Inbound record ack（入站記錄確認）：** 確認 OpenClaw 已保留足夠的入站元資料以
  對重新傳遞進行去重和路由。
- **User-visible receipt（使用者可見回執）：** 選用的已讀/狀態/輸入中行為；絕非
  持久性邊界。

`ReceiveAckPolicy` 僅控制傳輸或輪詢確認。它必須
不被重複用於已讀回執或狀態反應。

在機器人授權之前，當管道能夠解碼訊息來源元資料時，接收必須應用共用的 OpenClaw 回應策略：

```typescript
function shouldDropOpenClawEcho(params: { origin?: MessageOrigin; isBotAuthor: boolean; isRoomish: boolean }): boolean {
  return params.isBotAuthor && params.isRoomish && params.origin?.source === "openclaw" && params.origin.kind === "gateway_failure" && params.origin.echoPolicy === "drop_bot_room_echo";
}
```

此丟棄是基於標籤而非文字。一條具有相同可見的閘道失敗文字但沒有 OpenClaw 來源元資料的機器人發送之房間訊息，仍然會經過正常的 `allowBots` 授權。

Ack 策略是明確的：

```typescript
type ReceiveAckPolicy = { kind: "immediate"; reason: "webhook-timeout" | "platform-contract" } | { kind: "after-record" } | { kind: "after-durable-send" } | { kind: "manual" };
```

Telegram 輪詢現在使用接收上下文 ack 策略來處理其持久化的重新啟動水位線。追蹤器仍然在 grammY 更新進入中介軟體鏈時進行觀察，但 OpenClaw 僅在成功分發後保留安全完成的更新 ID，使失敗或較低的待處理更新能在重新啟動後重播。Telegram 的上游 `getUpdates` 取得偏移量仍由輪詢程式庫控制，因此如果除了 OpenClaw 的重新啟動水位線之外，我們還需要平台層級的重新傳遞，那麼其餘更深的切入就是一個完全持久的輪詢來源。Webhook 平台可能需要立即的 HTTP 確認，但它們仍需要入站去重和持久的出站傳送意圖，因為 webhook 可能會重新傳遞。

## 傳送上下文

傳送也是基於上下文的：

```typescript
type MessageSendContext = {
  id: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  intent: DurableSendIntent;
  attempt: number;
  signal: AbortSignal;
  previousReceipt?: MessageReceipt;
  preview?: LiveMessageState;
  log: MessageLifecycleLogger;

  render(): Promise<RenderedMessageBatch>;
  previewUpdate(rendered: RenderedMessageBatch): Promise<LiveMessageState>;
  send(rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit(receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete(receipt: MessageReceipt): Promise<void>;
  commit(receipt: MessageReceipt): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

偏好的協調流程：

```typescript
await core.messages.withSendContext(message, async (ctx) => {
  const rendered = await ctx.render();

  if (ctx.preview?.canFinalizeInPlace) {
    return await ctx.edit(ctx.preview.receipt, rendered);
  }

  return await ctx.send(rendered);
});
```

該輔助函式會展開為：

```text
begin durable intent
  -> render
  -> optional preview/edit/stream work
  -> mark sending
  -> final platform send or final edit
  -> mark committing with raw receipt
  -> commit receipt
  -> ack durable intent
  -> fail durable intent on classified failure
```

意圖必須在傳輸 I/O 之前存在。在 begin 之後但在 commit 之前的重啟是可恢復的。

危險的邊界是在平台成功之後和回執提交之前。如果進程在那裡終止，除非適配器提供原生冪等性或回執對帳路徑，否則 OpenClaw 無法知道平台訊息是否存在。這些嘗試必須在 `unknown_after_send` 中恢復，而不是盲目重播。沒有對帳功能的頻道可以選擇至少一次重播，僅當重複的可見訊息對該頻道和關係來說是可接受的、有文檔記錄的權衡時。當前的 SDK 對帳橋接器要求適配器聲明 `reconcileUnknownSend`，然後要求 `durableFinal.reconcileUnknownSend` 將未知條目分類為 `sent`、`not_sent` 或 `unresolved`；只有 `not_sent` 允許重播，並且未解決的條目保持終止狀態或僅重試對帳檢查。

持久性策略必須是顯式的：

```typescript
type MessageDurabilityPolicy = "required" | "best_effort" | "disabled";
```

`required` 意味著當核心無法寫入持久化意圖時必須關閉失效。`best_effort` 可以在持久化不可用時通過。`disabled` 保持舊的直接發送行為。在遷移期間，舊的包裝器和公共兼容性助手默認為 `disabled`；它們絕不能根據頻道具有通用出站適配器這一事實推斷出 `required`。

發送上下文也擁有頻道本地的發送後效果。如果持久化傳遞繞過了以前附加到頻道直接發送路徑的本地行為，則遷移是不安全的。例子包括自我回顯抑制快取、線程參與標記、原生編輯錨點、模型簽名渲染以及平台特定的重複守護。這些效果必須在該頻道啟用持久化通用最終傳遞之前移動到發送適配器、渲染適配器或命名發送上下文掛鉤中。

傳送輔助程式必須將回執一直傳回給呼叫者。持久包裝器不能吞掉訊息 ID 或將通道傳遞結果替換為 `undefined`；緩衝分發器使用這些 ID 作為執行緒錨點、後續編輯、預覽最終化和重複抑制。

後備傳送是在批次上運作，而非單一負載。靜默回覆重寫、媒體後備、卡片後備和區塊投影都可能產生多個可傳送的訊息，因此傳送內容必須傳遞整個投影批次，或明確記錄為何僅有一個負載有效。

```typescript
type RenderedMessageBatch = {
  units: RenderedMessageUnit[];
  atomicity: "all_or_retry_remaining" | "best_effort_parts";
  idempotencyKey: string;
};

type RenderedMessageUnit = {
  index: number;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  payload: unknown;
  required: boolean;
};
```

當此類後備具備持久性時，整個投影批次必須由一個持久傳送意圖或另一個原子批次計畫表示。逐一記錄每個負載是不夠的：負載之間的當機可能會導致部分可見的後備，而剩餘負載沒有持久記錄。恢復機制必須知道哪些單元已有回執，並僅重播缺失的單元，或將批次標記為 `unknown_after_send`，直到配接器協調完畢。

## 即時內容

預覽、編輯、進度和串流行為應為一個選用的生命週期。

```typescript
type MessageLiveAdapter = {
  begin?(ctx: MessageSendContext): Promise<LiveMessageState>;
  update?(ctx: MessageSendContext, state: LiveMessageState, update: LiveMessageUpdate): Promise<LiveMessageState>;
  finalize?(ctx: MessageSendContext, state: LiveMessageState, final: RenderedMessageBatch): Promise<MessageReceipt>;
  cancel?(ctx: MessageSendContext, state: LiveMessageState, reason: LiveCancelReason): Promise<void>;
};
```

即時狀態應具備足夠的持久性以進行復原或抑制重複：

```typescript
type LiveMessageState = {
  mode: "partial" | "block" | "progress" | "native";
  receipt?: MessageReceipt;
  visibleSince?: number;
  canFinalizeInPlace: boolean;
  lastRenderedHash?: string;
  staleAfterMs?: number;
};
```

這應涵蓋目前的行為：

- Telegram 傳送加上編輯預覽，在過時預覽期限後提供新的最終內容。
- Discord 傳送加上編輯預覽，在媒體/錯誤/明確回覆時取消。
- Slack 原生串流或根據執行緒形狀提供草稿預覽。
- Mattermost 草稿貼文最終化。
- Matrix 草稿事件最終化或在不符時撤銷。
- Teams 原生進度串流。
- QQ 機器人串流或累積後備。

## 配接器介面

公開 SDK 目標應為單一子路徑：

```typescript
import { defineChannelMessageAdapter } from "openclaw/plugin-sdk/channel-message";
```

目標形狀：

```typescript
type ChannelMessageAdapter = {
  receive?: MessageReceiveAdapter;
  send: MessageSendAdapter;
  live?: MessageLiveAdapter;
  origin?: MessageOriginAdapter;
  render?: MessageRenderAdapter;
  capabilities: MessageCapabilities;
};
```

傳送配接器：

```typescript
type MessageSendAdapter = {
  send(ctx: MessageSendContext, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit?(ctx: MessageSendContext, receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  classifyError?(ctx: MessageSendContext, error: unknown): DeliveryFailureKind;
  reconcileUnknownSend?(ctx: MessageSendContext): Promise<MessageReceipt | null>;
  afterSendSuccess?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  afterCommit?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
};
```

接收配接器：

```typescript
type MessageReceiveAdapter<TRaw = unknown> = {
  normalize(raw: TRaw, ctx: MessageNormalizeContext): Promise<ChannelMessage>;
  classify?(message: ChannelMessage): Promise<MessageEventClass>;
  preflight?(message: ChannelMessage, event: MessageEventClass): Promise<MessagePreflightResult>;
  ackPolicy?(message: ChannelMessage, event: MessageEventClass): ReceiveAckPolicy;
};
```

在預先授權之前，只要 `origin.decode` 返回 OpenClaw 來源元數據，核心必須執行共用的 OpenClaw 回謂詞。接收配接器提供平台事實，例如機器人作者和房間形狀；核心擁有丟棄決策和排序，以便通道不會重新實作文字過濾器。

來源配接器：

```typescript
type MessageOriginAdapter<TRaw = unknown, TNative = unknown> = {
  encode?(origin: MessageOrigin): TNative | undefined;
  decode?(raw: TRaw): MessageOrigin | undefined;
};
```

Core sets `MessageOrigin`。Channels only translate it to and from native
transport metadata. Slack maps this to `chat.postMessage({ metadata })` and
inbound `message.metadata`; Matrix can map it to extra event content; channels
without native metadata can use a receipt/outbound registry when that is the
best available approximation.

Capabilities:

```typescript
type MessageCapabilities = {
  text: { maxLength?: number; chunking?: boolean };
  attachments?: {
    upload: boolean;
    remoteUrl: boolean;
    voice?: boolean;
  };
  threads?: {
    reply: boolean;
    topic?: boolean;
    nativeThread?: boolean;
  };
  live?: {
    edit: boolean;
    delete: boolean;
    nativeStream?: boolean;
    progress?: boolean;
  };
  delivery?: {
    idempotencyKey?: boolean;
    retryAfter?: boolean;
    receiptRequired?: boolean;
  };
};
```

## Public SDK reduction

The new public surface should absorb or deprecate these conceptual areas:

- `reply-runtime`
- `reply-dispatch-runtime`
- `reply-reference`
- `reply-chunking`
- `reply-payload`
- `inbound-reply-dispatch`
- `channel-reply-pipeline`
- most public uses of `outbound-runtime`
- ad hoc draft stream lifecycle helpers

Compatibility subpaths can remain as wrappers, but new third-party plugins
should not need them.

Bundled plugins may keep internal helper imports through reserved runtime
subpaths while migrating. Public docs should steer plugin authors to
`plugin-sdk/channel-message` once it exists.

## Relationship to channel turn

`runtime.channel.turn.*` should stay during migration.

It should become a compatibility adapter:

```text
channel.turn.run
  -> messages.receive context
  -> session dispatch
  -> messages.send context for visible output
```

`channel.turn.runPrepared` should also remain initially:

```text
channel-owned dispatcher
  -> messages.receive record/finalize bridge
  -> messages.live for preview/progress
  -> messages.send for final delivery
```

After all bundled plugins and known third-party compatibility paths are bridged,
`channel.turn` can be deprecated. It should not be removed until there is a
published SDK migration path and contract tests proving old plugins still work
or fail with a clear version error.

## Compatibility guardrails

During migration, generic durable delivery is opt-in for any channel whose
existing delivery callback has side effects beyond "send this payload".

Legacy entry points are non-durable by default:

- `channel.turn.run` and `dispatchAssembledChannelTurn` use the channel's
  delivery callback unless that channel explicitly supplies an audited durable
  policy/options object.
- `channel.turn.runPrepared` stays channel-owned until the prepared dispatcher
  explicitly calls the send context.
- Public compatibility helpers such as `recordInboundSessionAndDispatchReply`,
  `dispatchInboundReplyWithBase`, and direct-DM helpers never inject generic
  durable delivery before the caller-provided `deliver` or `reply` callback.

For migration bridge types, `durable: undefined` means "not durable". The
durable path is enabled only by an explicit policy/options value. `durable:
false` can remain as a compatibility spelling, but implementation should not
require every unmigrated channel to add it.

Current bridge code must keep the durability decision explicit:

- Durable final delivery returns a discriminated status. `handled_visible` and
  `handled_no_send` are terminal; `unsupported` and `not_applicable` may fall
  back to channel-owned delivery; `failed` propagates the send failure.
- Generic durable final delivery is gated by adapter capabilities such as
  silent delivery, reply target preservation, native quote preservation, and
  message-sending hooks. Missing parity should choose channel-owned delivery,
  not a generic send that changes user-visible behavior.
- Queue-backed durable sends expose a delivery intent reference. Existing
  `pendingFinalDelivery*` session fields can carry the intent id during the
  transition; the end state is a `MessageSendIntent` store instead of frozen
  reply text plus ad hoc context fields.

Do not enable the generic durable path for a channel until all of these are
true:

- The generic send adapter executes the same rendering and transport behavior as
  the old direct path.
- Local post-send side effects are preserved through the send context.
- The adapter returns receipts or delivery results with all platform message
  ids.
- Prepared dispatcher paths either call the new send context or stay documented
  as outside the durable guarantee.
- Fallback delivery handles every projected payload, not only the first one.
- Durable fallback delivery records the whole projected payload array as one
  replayable intent or batch plan.

Concrete migration hazards to preserve:

- iMessage 監視器在成功發送後，會將已發送訊息的遞送記錄儲存在回音快取中。持久的最終發送仍必須填充該快取，否則 OpenClaw 可能會將其自己的最終回覆重新攝取為入站使用者訊息。
- Tlon 會在群組回覆後附加可選的模型簽章並記錄參與的執行緒。通用的持久遞送不得繞過這些效果；要麼將其移動到 Tlon 的 render/send/finalize 介面卡中，要麼將 Tlon 保留在通道擁有的路徑上。
- Discord 和其他已準備的發送器已經擁有直接的遞送和預覽行為。在它們的已準備發送器透過發送上下文明確路由最終訊息之前，它們不受組合回合持久性保證的涵蓋。
- Telegram 靜默後備遞送必須傳遞完整的投影 payload 陣列。單一 payload 的捷徑可能會在投影後丟失額外的後備 payload。
- LINE、Zalo、Nostr 和其他現有的組合/輔助路徑可能具有回覆 token 處理、媒體代理、已發送訊息快取、載入/狀態清理或僅回調目標。在這些語意由發送介面卡表示並透過測試驗證之前，它們必須保留在通道擁有的遞送上。
- Direct-DM 輔助程式可能具有回調，這是唯一正確的傳輸目標。通用的出站傳輸不得從 `OriginatingTo` 或 `To` 猜測並跳過該回調。
- OpenClaw 閘道失敗輸出必須保持對人類可見，但標記為機器人撰寫的房間回音必須在 `allowBots` 授權之前被丟棄。通道不得使用可見文字前綴過濾器來實現此功能，除非作為短期的緊急權宜之計；持久性合約是結構化的來源元資料。

## 內部儲存

持久佇列應儲存訊息發送意圖，而不是回覆 payload。

```typescript
type DurableSendIntent = {
  id: string;
  idempotencyKey: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  batch?: RenderedMessageBatch;
  liveState?: LiveMessageState;
  status: "pending" | "sending" | "committing" | "unknown_after_send" | "sent" | "failed" | "cancelled";
  attempt: number;
  nextAttemptAt?: number;
  receipt?: MessageReceipt;
  partialReceipt?: MessageReceipt;
  failure?: DeliveryFailure;
  createdAt: number;
  updatedAt: number;
};
```

恢復循環：

```text
load pending or sending intents
  -> acquire idempotency lock
  -> skip if receipt already committed
  -> reconstruct send context
  -> render if needed
  -> reconcile unknown_after_send if needed
  -> call adapter send/edit/finalize
  -> commit receipt, mark unknown_after_send, or schedule retry
```

佇列應保留足夠的身分識別，以便在重新啟動後透過相同的帳戶、執行緒、目標、格式化策略和媒體規則進行重播。

## 失敗類別

通道介面卡將傳輸失敗分類為封閉類別：

```typescript
type DeliveryFailureKind = "transient" | "rate_limit" | "auth" | "permission" | "not_found" | "invalid_payload" | "conflict" | "cancelled" | "unknown";
```

核心策略：

- 重試 `transient` 和 `rate_limit`。
- 除非存在呈現後備，否則不要重試 `invalid_payload`。
- 在配置變更之前，不要重試 `auth` 或 `permission`。
- 對於 `not_found`，當管道聲明安全時，讓即時最終化從編輯回退到全新傳送。
- 對於 `conflict`，使用回據/冪等規則來判斷訊息是否已存在。
- 在適配器可能已完成平台 I/O 但在回據提交之後發生的任何錯誤都會變成 `unknown_after_send`，除非適配器能證明平台操作未發生。

## 管道對應

| 管道            | 目標遷移                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram        | 接收確認原則加上持久的最終傳送。即時適配器負責傳送加上編輯預覽、過時預覽最終傳送、主題、引用回覆預覽跳過、媒體回退以及重試後處理。                                                                                                           |
| Discord         | 傳送適配器包裝現有的持續性負載傳送。即時適配器負責草稿編輯、進度草稿、媒體/錯誤預覽取消、回覆目標保留以及訊息 ID 回據。稽核機器人在共享房間中的閘道失敗回聲；如果 Discord 無法在正常訊息上攜帶來源元數據，則使用出站註冊表或其他原生等效項。 |
| Slack           | 傳送適配器處理正常聊天貼文。即時適配器在執行緒形狀支援時選擇原生串流，否則選擇草稿預覽。回據保留執行緒時間戳記。來源適配器將 OpenClaw 閘道失敗映射到 Slack `chat.postMessage.metadata`，並在 `allowBots` 授權之前丟棄標記的機器人房間回聲。  |
| WhatsApp        | 傳送適配器負責具有持久最終意圖的文字/媒體傳送。接收適配器處理群組提及和發送者身分。在 WhatsApp 具有可編輯傳輸之前，即時可以保持缺席。                                                                                                        |
| Matrix          | 即時適配器負責草稿事件編輯、最終化、刪除、加密媒體約束以及回覆目標不匹配回退。接收適配器負責加密事件補水和去重。來源適配器應將 OpenClaw 閘道失敗來源編碼到 Matrix 事件內容中，並在 `allowBots` 處理之前丟棄已配置機器人房間的回聲。          |
| Mattermost      | 即時適配器負責一個草稿貼文、進度/工具折疊、就地最終化以及全新傳送回退。                                                                                                                                                                      |
| Microsoft Teams | Live adapter 負責原生進度和區塊串流行為。Send adapter 負責活動以及附件/卡片回執。                                                                                                                                                            |
| 飛書            | Render adapter 負責文字/卡片/原始渲染。Live adapter 負責串流卡片和重複最終抑制。Send adapter 負責評論、主題會話、媒體和語音抑制。                                                                                                            |
| QQ 機器人       | Live adapter 負責 C2C 串流、累加器逾時和備用最終發送。Render adapter 負責媒體標籤和文字轉語音。                                                                                                                                              |
| Signal          | 簡單的接收加發送 adapter。除非 signal-cli 增加可靠的編輯支援，否則沒有 Live adapter。                                                                                                                                                        |
| iMessage        | 簡單的接收加發送 adapter。iMessage 發送必須在持久化最終訊息能繞過監視器傳遞之前，保持監視器回聲快取的填充。                                                                                                                                  |
| Google Chat     | 簡單的接收加發送 adapter，將回覆關聯對應至空間和執行緒 ID。稽核 `allowBots=true` 房間行為，以處理標記的 OpenClaw 閘道失敗回聲。                                                                                                              |
| LINE            | 簡單的接收加發送 adapter，將 reply-token 限制建模為目標/關聯能力。                                                                                                                                                                           |
| Nextcloud Talk  | SDK 接收橋接器加發送 adapter。                                                                                                                                                                                                               |
| IRC             | 簡單的接收加發送 adapter，沒有持久化編輯回執。                                                                                                                                                                                               |
| Nostr           | 用於加密 DM 的接收加發送 adapter；回執是事件 ID。                                                                                                                                                                                            |
| QA 頻道         | 用於接收、發送、即時、重試和恢復行為的合約測試 adapter。                                                                                                                                                                                     |
| Synology Chat   | 簡單的接收加發送 adapter。                                                                                                                                                                                                                   |
| Tlon            | Send adapter 必須在啟用通用持久化最終傳遞之前，保持模型簽章渲染和參與執行緒追蹤。                                                                                                                                                            |
| Twitch          | 具有速率限制分類的簡單接收加發送 adapter。                                                                                                                                                                                                   |
| Zalo            | 簡單的接收加發送 adapter。                                                                                                                                                                                                                   |
| Zalo 個人版     | 簡單的接收加發送 adapter。                                                                                                                                                                                                                   |

## 遷移計畫

### 階段 1：內部訊息域

- 新增 `src/channels/message/*` 類型，用於訊息、目標、關聯、來源、回執、能力、持久化意圖、接收上下文、發送上下文、即時上下文和失敗類別。
- 將 `origin?: MessageOrigin` 新增至目前回覆傳遞所使用的遷移橋接器負載類型，然後在重構取代回覆負載時，將該欄位移至 `ChannelMessage` 和已渲染訊息類型。
- 在 adapter 和測試證明形狀之前，保持此內部狀態。
- 新增用於狀態轉換和序列化的純單元測試。

### 階段 2：持久化發送核心

- 將現有的輸出佇列從回覆持久性轉移到持久化訊息發送意圖。
- 讓持久化發送意圖攜帶預測的有效負載陣列或批次計畫，而不僅僅是一個回覆有效負載。
- 透過相容性轉換保留目前的佇列恢復行為。
- 讓 `deliverOutboundPayloads` 呼叫 `messages.send`。
- 在最終發送持久性方面，將其設為預設值，並在配接器聲明重播安全性後，若在新的訊息生命週期中無法寫入持久化意圖，則以失敗關閉處理。在此階段，既有的通道回合和 SDK 相容性路徑預設仍保持直接發送。
- 一致地記錄收據。
- 將收據和遞送結果返回給原始的分派器呼叫者，而不是將持久化發送視為終端副作用。
- 透過持久化發送意圖保存訊息來源，以便恢復、重播和分塊發送能夠保留 OpenClaw 的操作來源。

### 階段 3：通道回合橋接

- 在 `messages.receive` 和 `messages.send` 之上重新實作 `channel.turn.run` 和 `dispatchAssembledChannelTurn`。
- 保持目前的事實類型穩定。
- 預設保留舊版行為。組合回合通道僅在其配接器明確選擇具備重播安全性的持久化策略時，才會變為持久化。
- 將 `durable: false` 作為相容性緊急出口，用於那些完成原生編輯且尚無法安全重播的路徑，但不要依賴 `false` 標記來保護未遷移的通道。
- 僅在新的訊息生命週期中預設組合回合持久性，在通道對映證明通用發送路徑保留了舊的通道遞送語意之後。

### 階段 4：準備好的分派器橋接

- 用發送上下文橋接替換 `deliverDurableInboundReplyPayload`。
- 將舊的輔助函式保留為包裝器。
- 優先移植 Telegram、WhatsApp、Slack、Signal、iMessage 和 Discord，因為它們已經具備持久化最終工作或較簡單的發送路徑。
- 在每個準備好的分派器明確選擇加入發送上下文之前，將其視為未覆蓋。文件和變更日誌條目必須說明「組合通道回合」或命名已遷移的通道路徑，而不是聲稱所有自動最終回覆。
- 保持 `recordInboundSessionAndDispatchReply`、direct-DM 輔助函式以及類似的公開相容性輔助函式不變更行為。它們之後可能會提供明確的 send-context 選用加入功能，但在呼叫者擁有的傳遞回呼之前，不得自動嘗試通用的永久性傳遞。

### 階段 5：統一的即時生命週期

- 建構 `messages.live` 並搭配兩個驗證配接器：
  - Telegram 用於發送、編輯以及過期的最終發送。
  - Matrix 用於草稿定案以及撤銷後備。
- 然後遷移 Discord、Slack、Mattermost、Teams、QQ Bot 和飛書。
- 僅在每個頻道都有同等測試後，才刪除重複的預覽定案程式碼。

### 階段 6：公開 SDK

- 新增 `openclaw/plugin-sdk/channel-message`。
- 將其記錄為首選的頻道外掛 API。
- 更新 package exports、入口點清單、生成的 API 基準以及外掛 SDK 文件。
- 將 `MessageOrigin`、origin encode/decode hooks 以及共享的 `shouldDropOpenClawEcho` 述詞包含在 channel-message SDK 表面中。
- 保留舊子路徑的相容性包裝函式。
- 在捆綁外掛遷移後，將命名為 reply 的 SDK 輔助函式在文件中標記為已棄用。

### 階段 7：所有發送者

將所有非回覆的輸出生產者移至 `messages.send`：

- cron 和心跳通知
- 任務完成
- hook 結果
- 核准提示和核准結果
- 訊息工具發送
- 子代理完成公告
- 明確的 CLI 或 Control UI 發送
- 自動化/廣播路徑

在此，模型將不再是「代理回覆」，而變成「OpenClaw 發送訊息」。

### 階段 8：棄用 Turn

- 至少在一個相容性視窗內，將 `channel.turn` 作為包裝函式保留。
- 發布遷移說明。
- 針對舊的匯入執行外掛 SDK 相容性測試。
- 僅在沒有捆綁外掛需要舊內部輔助函式，且第三方合約有穩定的替代方案時，才移除或隱藏它們。

## 測試計畫

單元測試：

- 永久性發送意圖序列化和還原。
- 等冪性金鑰重複使用和重複抑制。
- 回據提交和重放略過。
- 當配接器支援協調時，在重放之前進行協調的 `unknown_after_send` 還原。
- 失敗分類政策。
- 接收確認政策排序。
- 針對回覆、後續、系統和廣播發送的關聯映射。
- 閘道失敗來源工廠和 `shouldDropOpenClawEcho` 述詞。
- 在載荷正規化、分塊、持久化佇列序列化和恢復過程中保留來源。

整合測試：

- `channel.turn.run` 簡單介面卡仍會記錄並發送。
- 舊版組合輪次遞送除非頻道明確加入，否則不會變為持久化。
- `channel.turn.runPrepared` 橋接器仍會記錄並完成。
- 公開相容性輔助函式預設會呼叫呼叫者擁有的遞送回呼，並且在這些回呼之前不進行通用發送。
- 持久化後備遞送會在重啟後重播整個投影的載荷陣列，並且不能在早期崩潰後留下未記錄的後續載荷。
- 持久化組合輪次遞送會將平台訊息 ID 傳回給緩衝分發器。
- 當持久化遞送被停用或不可用時，自訂遞送掛鉤仍會傳回平台訊息 ID。
- 最終回覆在助理完成和平台發送之間的重啟中得以保留。
- 預覽草稿在允許的情況下就地完成。
- 當媒體/錯誤/回覆目標不匹配需要正常遞送時，預覽草稿會被取消或編輯。
- 區塊串流和預覽串流不會兩者都遞送相同的文字。
- 早期串流的媒體不會在最終遞送中重複。

頻道測試：

- Telegram 主題回覆的輪詢確認會延遲到接收上下文的安全完成水位線。
- 針對已接受但未遞送的更新，Telegram 輪詢恢復由持久化的安全完成偏移模型覆蓋。
- Telegram 陳舊預覽會發送新的最終訊息並清理預覽。
- Telegram 靜默後備會發送每個投影的後備載荷。
- Telegram 靜默後備持久性會以原子方式記錄完整的投影後備陣列，而不是在每次迴圈迭代中記錄一個單一載荷的持久意圖。
- Discord 預覽在媒體/錯誤/明確回覆時取消。
- Discord 準備好的分發器最終訊息在文件或變更日誌聲稱 Discord 最終回覆持久性之前，會通過發送上下文路由。
- iMessage 持久化最終發送會填充監視器的已發送訊息回聲快取。
- LINE、Zalo 和 Nostr 的舊版遞送路徑不會被通用持久化發送繞過，直到它們的介面同等測試存在。
- 除非明確遷移至完整的訊息目標和可重播安全的發送介面卡，否則 Direct-DM/Nostr 回調傳遞仍保持權威性。
- Slack 標記的 OpenClaw 閘道失敗訊息保持可見的出站狀態，標記的機器人房間回聲在 `allowBots` 之前丟棄，而具有相同可見文字的未標記機器人訊息仍遵循正常的機器人授權。
- Slack 原生串流在頂層 DM 中回退至草稿預覽。
- Matrix 預覽最終確定與撤銷回退。
- 來自已設定機器人帳戶的 Matrix 標記 OpenClaw 閘道失敗房間回聲，在 `allowBots` 處理之前丟棄。
- Discord 和 Google Chat 共用房間的閘道失敗串連審計涵蓋 `allowBots` 模式，然後才聲稱通用保護。
- Mattermost 草稿最終確定與新發送回退。
- Teams 原生進度最終確定。
- Feishu 重複最終抑制。
- QQ Bot 累加器逾時後備。
- Tlon 持久最終發送保留模型簽名渲染和參與的執行緒追蹤。
- WhatsApp、Signal、iMessage、Google Chat、LINE、IRC、Nostr、Nextcloud Talk、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal 的簡單持久最終發送。

驗證：

- 開發期間針對特定的 Vitest 檔案。
- Testbox 中的 `pnpm check:changed` 用於測試完整的變更範圍。
- 在完成重構落地之前，或在公開 SDK/匯出變更之後，在 Testbox 中進行更廣泛的 `pnpm check`。
- 在移除相容性包裝器之前，對至少一個支援編輯的頻道和一個僅簡單發送的頻道進行即時或 qa-channel 冒煙測試。

## 未解決的問題

- Telegram 最終是否應該用一個完全持久的輪詢來源（polling source）取代 grammY runner 來源，該來源能夠控制平台層級的重新投遞，而不僅僅是 OpenClaw 的持久化重新啟動水位標記（restart watermark）。
- 持久的即時預覽（live preview）狀態應該儲存在與最終發送意圖（send intent）相同的佇列記錄中，還是儲存在一個兄弟即時狀態儲存（live-state store）中。
- 在 `plugin-sdk/channel-message` 發布後，相容性包裝器（compatibility wrappers）應該在文件中保留多久。
- 第三方插件應該直接實作接收配接器（receive adapters），還是僅透過 `defineChannelMessageAdapter` 提供正規化（normalize）/發送（send）/即時（live）掛鉤（hooks）。
- 哪些收據欄位可以安全地在公開 SDK 中暴露，相對於內部運行時狀態。
- 諸如 self-echo 快取和參與執行緒標記等副作用，應該建模為 send-context hooks、adapter 擁有的 finalize 步驟，還是 receipt subscribers。
- 哪些通道具有原生 origin 元資料，哪些需要持久的出站註冊表，以及哪些無法提供可靠的跨 bot echo 抑制。

## 驗收標準

- 每個捆綁的訊息通道都透過 `messages.send` 發送最終的可見輸出。
- 每個入站訊息通道都透過 `messages.receive` 或文件化的相容性包裝器進入。
- 每個預覽/編輯/串流通道都使用 `messages.live` 來處理草稿狀態和最終確定。
- `channel.turn` 僅是一個包裝器。
- 以 Reply 命名的 SDK 輔助函式是相容性匯出，而非建議的路徑。
- 持久恢復可以在重啟後重播待處理的最終發送，而不會丟失最終回應或重複已提交的發送；平台結果未知的發送會在重播前進行協調，或針對該配接器記錄為至少一次。
- 當無法寫入持久意圖時，持久最終發送會失敗關閉，除非呼叫者明確選擇了文件化的非持久模式。
- 舊版的通道輪替和 SDK 相容性輔助函式預設為直接的通道擁有的傳遞；通用持久發送僅限明確選擇加入。
- 收據會保留所有平台訊息 ID 以用於多部分傳遞，並保留一個主要 ID 以方便執行緒/編輯。
- 持久包裝器在替換直接傳遞回呼之前，會保留通道本地的副作用。
- 準備好的分派器在其最終傳遞路徑明確使用發送上下文之前，不被計算為持久。
- 後援傳遞會處理每個投射的 payload。
- 持久後援傳遞會在一個可重播的意圖或批次計劃中記錄每個投射的 payload。
- OpenClaw 發起的閘道失敗輸出對人類可見，但在宣告支援 origin 合約的通道上，標記為 bot 作者的房間 echo 會在 bot 授權之前被丟棄。
- 文件說明 send、receive、live、state、receipts、relations、失敗策略、遷移和測試覆蓋範圍。

## 相關

- [訊息](/zh-Hant/concepts/messages)
- [串流與分塊](/zh-Hant/concepts/streaming)
- [進度草稿](/zh-Hant/concepts/progress-drafts)
- [重試原則](/zh-Hant/concepts/retry)
- [通道輪次核心](/zh-Hant/plugins/sdk-channel-turn)
