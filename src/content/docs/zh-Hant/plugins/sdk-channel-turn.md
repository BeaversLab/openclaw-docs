---
summary: "runtime.channel.turn -- 內建與第三方通道外掛程式用來記錄、分派與完成代理輪次的共用入站輪次核心"
title: "通道輪次核心"
sidebarTitle: "通道輪次"
read_when:
  - You are building a channel plugin and want the shared inbound turn lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

通道輪次核心是一個共用的入站狀態機，它會將標準化的平台事件轉換為代理輪次。通道外掛程式提供平台事實與傳遞回呼。核心擁有編排權限：攝入、分類、預檢、解析、授權、組裝、記錄、分派與完成。

當您的插件位於傳入訊息熱路徑上時，請使用此功能。對於非訊息事件（斜線指令、模態框、按鈕互動、生命週期事件、反應、語音狀態），請將其保留在插件本地。核心僅擁有那些可能成為代理文字回合的事件。

<Info>透過注入的插件執行時期作為 `runtime.channel.turn.*` 即可到達核心。插件執行時期類型是從 `openclaw/plugin-sdk/core` 匯出的，因此第三方原生插件可以使用這些進入點，就像內建頻道插件一樣。</Info>

## 為什麼需要共享核心

頻道插件重複相同的傳入流程：正規化、路由、閘道、建構上下文、記錄會話元資料、分派代理回合、完成傳遞狀態。如果沒有共享核心，對提及閘道、僅工具可見回覆、會話元資料、待處理歷程記錄或分派完成的變更，必須套用到每個頻道。

內核刻意將四個概念區分開來：

- `ConversationFacts`：訊息來自何處
- `RouteFacts`：應由哪個代理和會話來處理
- `ReplyPlanFacts`：可見的回覆應發往何處
- `MessageFacts`：代理應看到什麼主體和補充上下文

Slack 直接訊息、Telegram 主題、Matrix 貼文串和飛書主題會話在實踐中都會區分這些概念。將其視為同一個識別符會隨時間導致差異。

## 階段生命週期

無論是何種管道，內核都執行相同的固定流程：

1. `ingest` —— 介接器將原始平台事件轉換為 `NormalizedTurnInput`
2. `classify` —— 介接器聲明此事件是否可以啟動代理輪次
3. `preflight` -- adapter 會執行去重、自我回顯、補全、防抖、解密以及部分事實預填充
4. `resolve` -- adapter 會返回一個完全組裝好的回合（route、reply plan、message、delivery）
5. `authorize` -- 針對已組裝事實應用 DM、群組、提及和指令策略
6. `assemble` -- 透過 `buildContext` 從事實構建 `FinalizedMsgContext`
7. `record` -- 入站會話元資料和最後一條路由已持久化
8. `dispatch` -- 代理回合透過緩衝區塊分發器執行
9. `finalize` -- 即使在分發錯誤時，adapter `onFinalize` 也會執行

當提供 `log` 回呼時，每個階段都會發出結構化日誌事件。請參閱[可觀測性](#observability)。

## 准入種類

當輪次被閘控時，核心不會拋出錯誤。它會傳回 `ChannelTurnAdmission`：

| 種類          | 時機                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `dispatch`    | 輪次被准許。代理輸次執行並使用可見的回覆路徑。                                                        |
| `observeOnly` | 輪次端到端執行，但傳遞介接卡不發送任何可見內容。用於廣播觀察者代理和其他被動多代理流程。              |
| `handled`     | 平台事件在本地被消耗（生命週期、反應、按鈕、模態框）。核心跳過分發。                                  |
| `drop`        | 跳過路徑。可選地 `recordHistory: true` 會將訊息保留在待處理群組歷史記錄中，以便未來提及時擁有上下文。 |

准入可能來自 `classify`（事件類別表示它無法開始回合），來自 `preflight`（重複資料刪除、自我回顯、具有歷史記錄的遺漏提及），或者來自 `resolveTurn` 本身。

## 進入點

執行時期公開了三個首選的進入點，以便配接器可以根據符合頻道的層級進行選擇。

```typescript
runtime.channel.turn.run(...)             // adapter-driven full pipeline
runtime.channel.turn.runAssembled(...)    // already-built context + delivery adapter
runtime.channel.turn.runPrepared(...)     // channel owns dispatch; kernel runs record + finalize
runtime.channel.turn.buildContext(...)    // pure facts to FinalizedMsgContext mapping
```

為了與 Plugin SDK 相容，保留了兩個較舊的執行時期輔助函式：

```typescript
runtime.channel.turn.runResolved(...)      // deprecated compatibility alias; prefer run
runtime.channel.turn.dispatchAssembled(...) // deprecated compatibility alias; prefer runAssembled
```

### run

當您的頻道可以將其輸入流程表示為 `ChannelTurnAdapter<TRaw>` 時使用。配接器具有 `ingest`、可選的 `classify`、可選的 `preflight`、強制性的 `resolveTurn` 以及可選的 `onFinalize` 的回呼函式。

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

當頻道的介面邏輯較少，且受益於透過 hooks 擁有生命週期時，`run` 是正確的形式。

### runAssembled

當頻道已經解析路由，建構了 `FinalizedMsgContext`，
且只需要共用記錄、回覆管線、分派和完成
順序時使用。對於簡單的捆綁入站路徑，這是首選形式，
因為這些路徑否則將重複 `createChannelMessageReplyPipeline(...)` 和
`runPrepared(...)` 樣板程式碼。

```typescript
await runtime.channel.turn.runAssembled({
  cfg,
  channel: "irc",
  accountId,
  agentId: route.agentId,
  routeSessionKey: route.sessionKey,
  storePath,
  ctxPayload,
  recordInboundSession: runtime.channel.session.recordInboundSession,
  dispatchReplyWithBufferedBlockDispatcher: runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
  delivery: {
    deliver: async (payload) => {
      await sendPlatformReply(payload);
    },
    onError: (err, info) => {
      runtime.error?.(`reply ${info.kind} failed: ${String(err)}`);
    },
  },
});
```

當唯一的頻道擁有之分派行為是最終負載傳遞加上可選的輸入中、回覆選項、持久
傳遞或錯誤記錄時，請選擇 `runAssembled` 而非 `runPrepared`。

### runPrepared

當通道具有複雜的本機分派器，且包含預覽、重試、編輯或執行緒啟動，並且這些功能必須保持由通道擁有時，請使用此方法。核心仍會在分派前記錄傳入的會話，並提供統一的 `DispatchedChannelTurnResult`。

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

豐富通道（Matrix、Mattermost、Microsoft Teams、飛書、QQ 機器人）使用 `runPrepared`，因為它們的分派器會編排核心不應得知的平台特定行為。

### buildContext

一個將事實包映射到 `FinalizedMsgContext` 的純函數。當您的通道自行實作部分管線，但希望保持一致的上下文形狀時，請使用它。

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

`buildContext` 在為 `run` 組裝輪次時，於 `resolveTurn` 回調內也很有用。

<Note>諸如 `dispatchInboundReplyWithBase` 等已棄用的 SDK 輔助程式仍然透過已組裝回合的輔助程式進行橋接。新的外掛程式碼應該使用 `run` 或 `runPrepared`。</Note>

## 事實類型

核心從您的配接器消耗的事實與平台無關。在將平台物件交給核心之前，請將其轉換為這些形狀。

### NormalizedTurnInput

| 欄位              | 用途                                             |
| ----------------- | ------------------------------------------------ |
| `id`              | 用於去重和日誌的穩定訊息 ID                      |
| `timestamp`       | 可選的 epoch 毫秒時間                            |
| `rawText`         | 從平台接收到的內容                               |
| `textForAgent`    | 供代理使用的可選清理後內容（移除提及、修剪輸入） |
| `textForCommands` | 用於 `/command` 解析的可選內容                   |
| `raw`             | 適配器回呼的可選傳遞參考，需要原始資料時使用     |

### ChannelEventClass

| 欄位                   | 用途                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `kind`                 | `message`, `command`, `interaction`, `reaction`, `lifecycle`, `unknown` |
| `canStartAgentTurn`    | 若為 false，核心會回傳 `{ kind: "handled" }`                            |
| `requiresImmediateAck` | 給需要在分派前進行 ACK 的適配器之提示                                   |

### SenderFacts

| 欄位           | 用途                                                |
| -------------- | --------------------------------------------------- |
| `id`           | 穩定的平台發送者 ID                                 |
| `name`         | 顯示名稱                                            |
| `username`     | 若與 `name` 不同則為代碼                            |
| `tag`          | Discord 風格的鑑別符或平台標籤                      |
| `roles`        | 角色 ID，用於成員角色允許清單匹配                   |
| `isBot`        | 當發送者是已知的機器人時為 True（內核用於丟棄訊息） |
| `isSelf`       | 當發送者是被設定的代理本身時為 True                 |
| `displayLabel` | 用於信封文字的預先渲染標籤                          |

### ConversationFacts

| 欄位              | 用途                                                    |
| ----------------- | ------------------------------------------------------- |
| `kind`            | `direct`、`group` 或 `channel`                          |
| `id`              | 用於路由的對話 ID                                       |
| `label`           | 信封的人類可讀標籤                                      |
| `spaceId`         | 可選的外部空間識別碼（Slack 工作區、Matrix 家庭伺服器） |
| `parentId`        | 當這是執行緒時的外部對話 ID                             |
| `threadId`        | 當此訊息位於執行緒內時的執行緒 ID                       |
| `nativeChannelId` | 當與路由 ID 不同時的平台原生頻道 ID                     |
| `routePeer`       | 用於 `resolveAgentRoute` 查詢的對等節點                 |

### RouteFacts

| 欄位                    | 用途                                             |
| ----------------------- | ------------------------------------------------ |
| `agentId`               | 應處理此輪次的代理程式                           |
| `accountId`             | 選用覆寫（多帳戶頻道）                           |
| `routeSessionKey`       | 用於路由的工作階段金鑰                           |
| `dispatchSessionKey`    | 當與路由金鑰不同時，在分派階段使用的工作階段金鑰 |
| `persistedSessionKey`   | 寫入至持續性工作階段中繼資料的工作階段金鑰       |
| `parentSessionKey`      | 分支/執行緒工作階段的父層                        |
| `modelParentSessionKey` | 分支工作階段的模型端父層                         |
| `mainSessionKey`        | 直接交談的主要 DM 擁有者釘選                     |
| `createIfMissing`       | 允許記錄步驟建立缺失的會話資料列                 |

### ReplyPlanFacts

| 欄位                      | 用途                                             |
| ------------------------- | ------------------------------------------------ |
| `to`                      | 寫入內容 `To` 的邏輯回覆目標                     |
| `originatingTo`           | 原始內容目標 (`OriginatingTo`)                   |
| `nativeChannelId`         | 用於傳遞的平台原生頻道 ID                        |
| `replyTarget`             | 如果與 `to` 不同，則為最終的可見回覆目標         |
| `deliveryTarget`          | 底層傳遞覆蓋                                     |
| `replyToId`               | 引用/錨定訊息 ID                                 |
| `replyToIdFull`           | 當平台同時擁有兩者時的完整格式引用 ID            |
| `messageThreadId`         | 傳遞時的執行緒 ID                                |
| `threadParentId`          | 執行緒的父訊息 ID                                |
| `sourceReplyDeliveryMode` | `thread`、`reply`、`channel`、`direct` 或 `none` |

### AccessFacts

`AccessFacts` 攜帶了授權階段所需的布林值。身分匹配保留在通道內：核心僅消費結果。

| 欄位       | 用途                                               |
| ---------- | -------------------------------------------------- |
| `dm`       | DM 允許/配對/拒絕決策以及 `allowFrom` 清單         |
| `group`    | 群組原則、路由允許、發送者允許、允許清單、提及需求 |
| `commands` | 跨配置授權器的指令授權                             |
| `mentions` | 是否可以進行提及檢測以及代理是否被提及             |

### MessageFacts

| 欄位             | 用途                                     |
| ---------------- | ---------------------------------------- |
| `body`           | 最終信封主體（已格式化）                 |
| `rawBody`        | 原始傳入主體                             |
| `bodyForAgent`   | 代理人看到的主體                         |
| `commandBody`    | 用於指令解析的主體                       |
| `envelopeFrom`   | 信封的預先渲染發送者標籤                 |
| `senderLabel`    | 已渲染發送者的可選覆寫                   |
| `preview`        | 用於日誌的簡短編輯預覽                   |
| `inboundHistory` | 當通道保留緩衝區時的最近傳入歷史記錄條目 |

### SupplementalContextFacts

補充上下文涵蓋引用、轉發和執行緒啟動上下文。內核會套用已設定的 `contextVisibility` 原則。通道配接器僅提供事實和 `senderAllowed` 標誌，以便跨通道原則保持一致。

### InboundMediaFacts

Media is fact-shaped. Platform download, auth, SSRF policy, CDN rules, and decryption stay channel-local. The kernel maps facts into `MediaPath`, `MediaUrl`, `MediaType`, `MediaPaths`, `MediaUrls`, `MediaTypes`, and `MediaTranscribedIndexes`.

## Adapter contract

For full `run`, the adapter shape is:

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` returns a `ChannelTurnResolved`, which is an `AssembledChannelTurn` with an optional admission kind. Returning `{ admission: { kind: "observeOnly" } }` runs the turn without producing visible output. The adapter still owns the delivery callback; it just becomes a no-op for that turn.

`onFinalize` 會在每個結果上執行，包括分派錯誤。使用它來清除待處理的群組歷史記錄、移除 ack 反應、停止狀態指示器，並清除本地狀態。

## 傳遞配接器

核心不會直接呼叫平台。頻道會將 `ChannelTurnDeliveryAdapter` 傳遞給核心：

```typescript
type ChannelTurnDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
  durable?: false | DurableInboundReplyDeliveryOptions;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  receipt?: MessageReceipt;
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

`deliver` 會針對每個緩衝的回覆區塊被呼叫一次。在訊息生命週期遷移期間，組裝後的 channel-turn 傳送預設由 channel 擁有：如果省略 `durable` 欄位，表示 kernel 必須直接呼叫 `deliver` 且不得透過通用 outbound 傳送進行路由。只有在 channel 經過稽核證明通用發送路徑保留了舊的傳送行為（包括回覆/執行緒目標、媒體處理、已傳送訊息/自我回顯快取、狀態清理和傳回的訊息 ID）之後，才設定 `durable`。`durable: false` 仍然是「使用 channel 擁有的回呼」的相容拼寫，但未遷移的 channel 應該不需要新增它。當 channel 擁有平台訊息 ID 時請將其傳回，以便調度器可以保留執行緒錨點並編輯後續區塊；較新的傳送路徑也應該傳回 `receipt`，以便復原、預覽最終化和重複抑制可以從 `messageIds` 移出。對於僅觀察的回合，請傳回 `{ visibleReplySent: false }` 或使用 `createNoopChannelTurnDeliveryAdapter()`。

使用 `runPrepared` 且具有完全由通道擁有的調度器的通道沒有 `ChannelTurnDeliveryAdapter`。這些調度器預設不是持久的。它們應保持其直接傳遞路徑，直到它們明確選擇加入新的發送上下文，該上下文具有完整的目標、重放安全的適配器、收據契約和通道副作用掛鉤。

在遷移期間，諸如 `recordInboundSessionAndDispatchReply`、`dispatchInboundReplyWithBase` 和直接 DM 輔助函式之類的公開兼容性輔助函式必須保持行為不變。它們不應在調用者擁有的 `deliver` 或 `reply` 回調之前調用通用持久傳遞。

## 記錄選項

記錄階段包裝 `recordInboundSession`。大多數通道可以使用預設值。通過 `record` 覆蓋：

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

調度器會等待記錄階段。如果記錄拋出錯誤，核心會執行 `onPreDispatchFailure` （當提供給 `runPrepared` 時）並重新拋出。

## 可觀測性

當提供 `log` 回調時，每個階段都會發出一個結構化事件：

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

已記錄的階段：`ingest`、`classify`、`preflight`、`resolve`、`authorize`、`assemble`、`record`、`dispatch`、`finalize`。避免記錄原始內容；請使用 `MessageFacts.preview` 進行簡短的編輯預覽。

## 什麼保持通道本地化

核心擁有編排權。通道仍然擁有：

- 平台傳輸（gateway、REST、websocket、polling、webhooks）
- 身分解析與顯示名稱匹配
- 原生指令、斜線指令、自動完成、模態視窗、按鈕、語音狀態
- 卡片、模態視窗和自適應卡片的呈現
- 媒體驗證、CDN 規則、加密媒體、轉錄
- 編輯、回應、刪除和上線狀態 API
- 回填與平台端歷史記錄擷取
- 需要平台特定驗證的配對流程

如果兩個通道開始需要針對上述其中一項使用相同的輔助工具，請提取一個共用的 SDK 輔助工具，而不是將其推入核心中。

## 穩定性

`runtime.channel.turn.*` 是公開外掛執行時介面的一部分。事實類型（`SenderFacts`、`ConversationFacts`、`RouteFacts`、`ReplyPlanFacts`、`AccessFacts`、`MessageFacts`、`SupplementalContextFacts`、`InboundMediaFacts`）和准入形狀（`ChannelTurnAdmission`、`ChannelEventClass`）可以透過 `openclaw/plugin-sdk/core` 中的 `PluginRuntime` 來取得。

適用向後相容性規則：新的事實欄位屬於新增性質，准入種類不會重新命名，且進入點名稱保持穩定。需要非新增性變更的新通道需求，必須通過外掛 SDK 遷移程序。

## 相關

- [訊息生命週期重構](/zh-Hant/concepts/message-lifecycle-refactor)，針對計劃中的 send/receive/live 生命週期，該生命週期將包裝此核心
- [建構通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)，針對更廣泛的通道外掛程式合約
- [外掛程式執行時期輔助程式](/zh-Hant/plugins/sdk-runtime)，針對其他 `runtime.*` 介面
- 用於載入管道和登錄機制的 [Plugin internals](/zh-Hant/plugins/architecture-internals)
