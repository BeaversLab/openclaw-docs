---
summary: "runtime.channel.turn -- 捆綁和第三方通道插件用來記錄、分派和完成代理回合的共用入站事件核心"
title: "通道轉向核心"
sidebarTitle: "通道轉向"
read_when:
  - You are building a channel plugin and want the shared inbound event lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

通道輪次核心是一個共用的入站狀態機，它會將標準化的平台事件轉換為代理輪次。通道外掛程式提供平台事實與傳遞回呼。核心擁有編排權限：攝入、分類、預檢、解析、授權、組裝、記錄、分派與完成。

當您的插件位於傳入訊息熱路徑上時，請使用此功能。對於非訊息事件（斜線指令、模態框、按鈕互動、生命週期事件、反應、語音狀態），請將其保留在插件本地。核心僅擁有那些可能成為代理文字回合的事件。

<Info>透過注入的插件執行環境作為 `runtime.channel.turn.*` 可以存取該核心。插件執行環境類型從 `openclaw/plugin-sdk/core` 匯出，因此第三方原生插件可以像捆綁通道插件一樣使用這些進入點。</Info>

## 為什麼需要共享核心

頻道插件重複相同的傳入流程：正規化、路由、閘道、建構上下文、記錄會話元資料、分派代理回合、完成傳遞狀態。如果沒有共享核心，對提及閘道、僅工具可見回覆、會話元資料、待處理歷程記錄或分派完成的變更，必須套用到每個頻道。

內核刻意將四個概念區分開來：

- `ConversationFacts`：訊息來自何處
- `RouteFacts`：應由哪個代理和工作階段處理它
- `ReplyPlanFacts`：可見的回覆應發往何處
- `MessageFacts`：代理應看到什麼內文和補充背景

Slack 直接訊息、Telegram 主題、Matrix 貼文串和飛書主題會話在實踐中都會區分這些概念。將其視為同一個識別符會隨時間導致差異。

## 階段生命週期

無論是何種管道，內核都執行相同的固定流程：

1. `ingest` -- 配接器將原始平台事件轉換為 `NormalizedTurnInput`
2. `classify` -- 配接器宣告此事件是否能啟動代理回合
3. `preflight` -- 配接器執行去重、自我回顯、補水、防抖、解密、部分事實預填
4. `resolve` -- 配接器傳回一個完全組裝的回合（路由、回覆計畫、訊息、傳送）
5. `authorize` -- 對組裝好的事實套用私訊、群組、提及和指令政策
6. `assemble` -- 透過 `buildContext` 從事實建立 `FinalizedMsgContext`
7. `record` -- 入站工作階段元資料和最後一條路由被持續化
8. `dispatch` -- 代理回合透過緩衝區塊分派器執行
9. `finalize` -- 配接器 `onFinalize` 即使在分派錯誤時也會執行

當提供 `log` 回呼時，每個階段都會發出結構化日誌事件。請參閱[可觀測性](#observability)。

## 准入種類

當回合被閘控時，核心不會拋出錯誤。它會傳回一個 `ChannelTurnAdmission`：

| 種類          | 時機                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `dispatch`    | 輪次被准許。代理輸次執行並使用可見的回覆路徑。                                                          |
| `observeOnly` | 輪次端到端執行，但傳遞介接卡不發送任何可見內容。用於廣播觀察者代理和其他被動多代理流程。                |
| `handled`     | 平台事件在本地被消耗（生命週期、反應、按鈕、模態框）。核心跳過分發。                                    |
| `drop`        | 跳過路徑。可選地 `recordHistory: true` 將訊息保留在待處理的群組歷史記錄中，以便日後提及時能獲得上下文。 |

准入可能來自 `classify`（事件類別表示其無法啟動輪次）、來自 `preflight`（去重、自我回顯、帶有歷史記錄的缺失提及），或來自 `resolveTurn` 本身。

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

當您的通道可以將其入站流程表達為 `ChannelTurnAdapter<TRaw>` 時使用。適配器具有 `ingest`、可選的 `classify`、可選的 `preflight`、強制的 `resolveTurn` 和可選的 `onFinalize` 的回調。

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

當通道具有較小的適配器邏輯並且透過鉤子擁有生命週期能受益時，`run` 是正確的形式。

### runAssembled

當通道已經解析了路由、建構了 `FinalizedMsgContext`，並且只需要共享的記錄、回覆管道、分派和最終處理順序時使用。這是簡單的打包入站路徑的首選形式，否則這些路徑將重複 `createChannelMessageReplyPipeline(...)` 和 `runPrepared(...)` 樣板代碼。

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

當唯一的通道擁有的分流行為是最終負載傳遞加上可選的輸入中、回覆選項、持久傳遞或錯誤日誌記錄時，請選擇 `runAssembled` 而不是 `runPrepared`。

### runPrepared

當通道具有複雜的本地分派器（具有預覽、重試、編輯或線程引導）且必須保持通道擁有時使用。核心仍在分派之前記錄入站會話並呈現統一的 `DispatchedChannelTurnResult`。

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

豐富通道（Matrix、Mattermost、Microsoft Teams、飛書、QQ 機器人）使用 `runPrepared`，因為它們的分派器協調核心不應知曉的平台特定行為。

### buildContext

一個將事實包映射到 `FinalizedMsgContext` 的純函數。當您的通道手動滾動管道的一部分但希望保持一致的上下文形狀時使用它。

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

當為 `run` 組裝輪次時，`buildContext` 在 `resolveTurn` 回調內部也很有用。

<Note>已棄用的 SDK 輔助函式（例如 `dispatchInboundReplyWithBase`）仍會透過組合輪次輔助函式進行橋接。新的外掛程式碼應使用 `run` 或 `runPrepared`。</Note>

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
| `kind`                 | `message`、`command`、`interaction`、`reaction`、`lifecycle`、`unknown` |
| `canStartAgentTurn`    | 如果為 false，核心會回傳 `{ kind: "handled" }`                          |
| `requiresImmediateAck` | 給需要在分派前進行 ACK 的適配器之提示                                   |

### SenderFacts

| 欄位           | 用途                                                |
| -------------- | --------------------------------------------------- |
| `id`           | 穩定的平台發送者 ID                                 |
| `name`         | 顯示名稱                                            |
| `username`     | 若與 `name` 不同則處理                              |
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
| `routePeer`       | 用於 `resolveAgentRoute` 查找的對等節點                 |

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
| `to`                      | 寫入上下文 `To` 的邏輯回覆目標                   |
| `originatingTo`           | 起始上下文目標 (`OriginatingTo`)                 |
| `nativeChannelId`         | 用於傳遞的平台原生頻道 ID                        |
| `replyTarget`             | 如果與 `to` 不同，則為最終的可見回覆目的地       |
| `deliveryTarget`          | 底層傳遞覆蓋                                     |
| `replyToId`               | 引用/錨定訊息 ID                                 |
| `replyToIdFull`           | 當平台同時擁有兩者時的完整格式引用 ID            |
| `messageThreadId`         | 傳遞時的執行緒 ID                                |
| `threadParentId`          | 執行緒的父訊息 ID                                |
| `sourceReplyDeliveryMode` | `thread`、`reply`、`channel`、`direct` 或 `none` |

### AccessFacts

`AccessFacts` 攜帶授權階段所需的布林值。身分匹配保留在通道中：核心僅消費結果。

| 欄位       | 用途                                               |
| ---------- | -------------------------------------------------- |
| `dm`       | DM 允許/配對/拒絕決定及 `allowFrom` 清單           |
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

補充上下文涵蓋引用、轉發和線程啟動上下文。核心應用已配置的 `contextVisibility` 策略。通道適配器僅提供事實和 `senderAllowed` 標誌，以便跨通道策略保持一致。

### InboundMediaFacts

媒體採用事實形狀。平台下載、驗證、SSRF 策略、CDN 規則和解密保留在通道本地。核心將事實映射到 `MediaPath`、`MediaUrl`、`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes` 和 `MediaTranscribedIndexes`。

當您的通道具有已解析的媒體清單並且僅需要附加通用事實時，請使用來自 `openclaw/plugin-sdk/channel-inbound` 的 `toInboundMediaFacts(...)`：

```typescript
media: toInboundMediaFacts(resolvedMedia, {
  kind: "image",
  messageId: input.id,
});
```

如果媒體混合了本地檔案和僅限 URL 的條目，請將該列表保留為媒體事實。
Core 在寫入舊版上下文欄位時會保留陣列索引，以便下游的
媒體理解、轉錄標記和提示註記繼續引用
同一個附件。

對於應該可供稍後提及使用的已跳過群組訊息，請透過轉動的 `preflight.media` 欄位傳遞媒體事實。Kernel 會在記錄之前將這些
事實轉換為有界的歷史媒體條目：

```typescript
preflight(input) {
  return {
    admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
    media: () => toInboundMediaFacts(resolveLocalImages(input), {
      kind: "image",
      messageId: input.id,
    }),
    history: {
      key: historyKey,
      limit: historyLimit,
      mediaLimit: 4,
      shouldRecord: () => stillCurrent(input),
    },
  };
}
```

歷史媒體是有意保守設計的：目前僅限圖片，僅限本機可讀取路徑，
受設定的媒體限制約束，並且仍然綁定到
頻道歷史金鑰。經過身份驗證的提供者 URL 應該由插件
在下載後，才能成為模型可見的媒體。

## 歷史視窗

訊息轉動程式碼應該使用 `createChannelHistoryWindow(...)`，而不是
直接呼叫低階的 `reply-history` map 輔助函式。舊的 map 輔助函式
仍然可以作為已棄用的相容性匯出匯入，但新的插件執行時期
程式碼不應該呼叫它們。視窗外觀將文字上下文、結構化的
`InboundHistory`、歷史媒體正規化和清除保持在
一個 Core 擁有的 API 背後，同時仍然允許頻道選擇
如何呈現歷史行。

```typescript
const history = createChannelHistoryWindow({ historyMap: groupHistories });

await history.recordWithMedia({
  historyKey,
  limit: historyLimit,
  entry,
  media: () =>
    toInboundMediaFacts(resolvedImages, {
      kind: "image",
      messageId: entry.messageId,
    }),
});

const combinedBody = history.buildPendingContext({
  historyKey,
  limit: historyLimit,
  currentMessage,
  formatEntry: (entry) => `${entry.sender}: ${entry.body}`,
});
```

較舊的 `buildPendingHistoryContextFromMap`、
`buildInboundHistoryFromMap`、`recordPendingHistoryEntry*` 和
`clearHistoryEntries*` 匯出作為已棄用的相容性保留，供尚未
遷移的插件使用。新的頻道工作應該使用視窗或轉動
Kernel 的 record/finalize 選項。

## 常見訊息模式

僅含文字且需要提及的群組：

```typescript
preflight(input) {
  const decision = resolveInboundMentionDecision({ facts, policy });
  if (decision.shouldSkip) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      history: { key: historyKey, limit: historyLimit },
    };
  }
  return { access: { mentions: decision } };
}
```

僅含圖片的訊息，後面接著稍後的提及：

```typescript
preflight(input) {
  if (!wasMentioned && resolvedImages.length > 0) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      media: () => toInboundMediaFacts(resolvedImages, {
        kind: "image",
        messageId: input.id,
      }),
      history: { key: historyKey, limit: historyLimit, mediaLimit: 4 },
    };
  }
  return {};
}
```

明確回覆圖片：

```typescript
resolveTurn(input, _eventClass, preflight) {
  return {
    ...assembled,
    media: toInboundMediaFacts([...currentMedia, ...referencedReplyMedia]),
    supplemental: {
      quote: preflight.supplemental?.quote,
    },
  };
}
```

帶有歷史記錄的直接訊息：

```typescript
resolveTurn(input) {
  return {
    ...assembled,
    history: undefined,
    message: {
      rawBody: input.rawText,
      bodyForAgent: input.textForAgent,
    },
  };
}
```

## 配接器合約

對於完整的 `run`，配接器形狀為：

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` 會傳回 `ChannelTurnResolved`，這是具有可選准入種類的 `AssembledChannelTurn`。傳回 `{ admission: { kind: "observeOnly" } }` 會執行轉動而不產生可見輸出。配接器仍然擁有傳遞回呼；它對於該轉動只是變成無操作。

`onFinalize` 在每個結果上運行，包括分派錯誤。使用它來清除待處理的群組歷史、移除 ack 反應、停止狀態指示器並刷新本地狀態。

## 傳遞適配器

核心不直接呼叫平台。通道將 `ChannelEventDeliveryAdapter` 傳遞給核心：

```typescript
type ChannelEventDeliveryAdapter = {
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

`deliver` 會針對每個緩衝的回覆區塊呼叫一次。在訊息生命週期遷移期間，組裝後的通道事件傳遞預設由通道擁有：省略 `durable` 欄位表示核心必須直接呼叫 `deliver` 且不得透過通用 outbound 傳遞進行路由。僅在通道經過稽核證明通用傳送路徑保留了舊的傳遞行為（包括回覆/執行緒目標、媒體處理、已傳送訊息/自我回顯快取、狀態清理以及傳回的訊息 ID）之後，才設定 `durable`。`durable: false` 仍是「使用通道擁有的回呼」的相容拼寫，但未遷移的通道不需要新增它。當通道擁有平台訊息 ID 時請傳回它們，以便分派器可以保留執行緒錨點並編輯後續區塊；較新的傳遞路徑也應傳回 `receipt`，以便復原、預覽最終化和重複抑制可以從 `messageIds` 移出。對於僅觀察的回合，請傳回 `{ visibleReplySent: false }` 或使用 `createNoopChannelEventDeliveryAdapter()`。

使用 `runPrepared` 且具有完全通道擁有之分派器的通道沒有 `ChannelEventDeliveryAdapter`。這些分派器預設不具有持久性。它們應保持其直接傳遞路徑，直到它們明確選擇加入具有完整目標、重放安全適配器、收據合約和通道副作用鉤子的新傳送上下文。

諸如 `recordInboundSessionAndDispatchReply`、`dispatchInboundReplyWithBase` 和直接 DM 輔助程式等公開相容性輔助程式在遷移期間必須保持行為不變。它們不應在呼叫者擁有的 `deliver` 或 `reply` 回呼之前呼叫通用持久傳遞。

## 記錄選項

Record 階段封裝了 `recordInboundSession`。大多數通道可以使用預設值。透過 `record` 覆寫：

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

分派器會等待 Record 階段。如果 Record 拋出錯誤，Kernel 會執行 `onPreDispatchFailure`（當提供給 `runPrepared` 時）並重新拋出。

## 可觀測性

當提供 `log` 回呼時，每個階段都會發出一個結構化事件：

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

已記錄的階段：`ingest`、`classify`、`preflight`、`resolve`、`authorize`、`assemble`、`record`、`dispatch`、`finalize`。避免記錄原始主體；請使用 `MessageFacts.preview` 來取得簡短的修訂預覽。

## 什麼保持通道本機

Kernel 擁有協調流程。通道仍然擁有：

- 平台傳輸（gateway、REST、websocket、polling、webhooks）
- 身分解析和顯示名稱匹配
- 原生指令、斜線指令、自動完成、模態、按鈕、語音狀態
- 卡片、模態和自適應卡片轉譯
- 媒體驗證、CDN 規則、加密媒體、轉錄
- 編輯、反應、修訂和狀態 API
- 回填和平台端歷史記錄提取
- 需要平台特定驗證的配對流程

如果兩個通道開始需要針對其中一項使用相同的輔助程式，請提取一個共用的 SDK 輔助程式，而不是將其推入 Kernel。

## 穩定性

`runtime.channel.turn.*` 是公開外掛執行階段介面的一部分。事實類型（`SenderFacts`、`ConversationFacts`、`RouteFacts`、`ReplyPlanFacts`、`AccessFacts`、`MessageFacts`、`SupplementalContextFacts`、`InboundMediaFacts`）和准入形狀（`ChannelTurnAdmission`、`ChannelEventClass`）可透過 `PluginRuntime` 從 `openclaw/plugin-sdk/core` 存取。

適用向後相容性規則：新的事實欄位為累加性、准入種類不會重新命名，且進入點名稱保持穩定。需要非累加性變更的新通道需求必須通過外掛程式 SDK 遷移程序。

## 相關

- 計劃中將包覆此核心的傳送/接收/即時生命週期的 [訊息生命週期重構](/zh-Hant/concepts/message-lifecycle-refactor)
- 關於更廣泛通道外掛程式合約的 [建置通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)
- 關於其他 `runtime.*` 介面的 [外掛程式執行時期協助程式](/zh-Hant/plugins/sdk-runtime)
- 關於載入管線與登錄機制的 [外掛程式內部機制](/zh-Hant/plugins/architecture-internals)
