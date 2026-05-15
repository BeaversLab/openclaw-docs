---
summary: "通道外掛程式的訊息生命週期 API，包括持久傳送、收據、即時預覽、接收確認策略以及舊版遷移"
title: "通道訊息 API"
read_when:
  - You are building or refactoring a messaging channel plugin
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from legacy reply pipeline or inbound reply dispatch helpers
---

通道外掛程式應該從 `openclaw/plugin-sdk/channel-message` 中公開一個 `message` 介面卡。該介面卡描述了平台支援的原生訊息生命週期：

```text
receive -> route and record -> agent turn -> durable final send
send -> render batch -> platform I/O -> receipt -> lifecycle side effects
live preview -> final edit or fallback -> receipt
```

核心擁有佇列、持久性、通用重試策略、掛鉤、收據以及共用的 `message` 工具。外掛程式擁有原生傳送/編輯/刪除呼叫、目標正規化、平台執行緒、選取的引述、通知標誌、帳戶狀態以及平台特定的副作用。

請將此頁面與[建立通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)搭配使用。

`channel-message` 子路徑經過特意設計，其開銷極低，適合用於熱外掛程式引導檔案（例如 `channel.ts`）：它公開了介面卡合約、功能證明、收據和相容性外觀，而不需要載入傳遞功能。執行階段傳遞協助器可從 `openclaw/plugin-sdk/channel-message-runtime` 取得，適用於已經在執行非同步訊息 I/O 的監控/傳送程式碼路徑。

新的頻道和外掛程式傳送程式碼應使用來自 `openclaw/plugin-sdk/channel-message-runtime` 的訊息生命週期協助器：`sendDurableMessageBatch`、`withDurableMessageSendContext` 或 `deliverInboundReplyWithMessageSendContext`。`openclaw/plugin-sdk/outbound-runtime` 中較舊的 `deliverOutboundPayloads(...)` 協助器已過時，它是用於傳出內部元件、復原和舊版介面卡的相容性/執行階段基質。請勿在新的頻道或外掛程式傳送路徑中使用它。

`sendDurableMessageBatch(...)` 返回一個明確的生命週期結果：

- `sent` - 至少一個可見的平台訊息已送達。
- `suppressed` - 沒有任何平台訊息應被視為遺失。穩定
  的原因包括 `cancelled_by_message_sending_hook`、
  `empty_after_message_sending_hook`、`no_visible_payload`、
  `adapter_returned_no_identity` 以及舊版 `no_visible_result`。
- `partial_failed` - 在後續
  載荷或副作用失敗之前，至少有一個平台訊息已送達。結果包含已送達的收據前綴
  以及失敗資訊。
- `failed` - 未產生任何平台收據。

當批次混合了已發送、已抑制和失敗的載荷時，請使用 `payloadOutcomes`。
切勿透過檢查舊的直接傳遞陣列是否為空來推斷 Hook 是否已取消。

仍需要緩衝回覆調度器（buffered reply dispatcher）的相容性調度器應使用 `createChannelMessageReplyPipeline(...)` 來建構回覆前綴選項（reply-prefix options），該函式來自 `openclaw/plugin-sdk/channel-message`，然後呼叫執行時期的 `channel.turn.runPrepared(...)`。這樣可以在共享的週期生命週期上保持會話記錄和調度順序，而無需新增另一個公開的週期包裝器（turn wrapper）。

## 最小介面卡

大多數新的頻道外掛可以從一個小型介面卡開始：

```typescript
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-message";

export const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  durableFinal: {
    capabilities: {
      text: true,
      replyTo: true,
      thread: true,
      messageSendingHooks: true,
    },
  },
  send: {
    text: async ({ cfg, to, text, accountId, replyToId, threadId, signal }) => {
      const sent = await sendDemoMessage({
        cfg,
        to,
        text,
        accountId: accountId ?? undefined,
        replyToId: replyToId ?? undefined,
        threadId: threadId == null ? undefined : String(threadId),
        signal,
      });

      return {
        receipt: createMessageReceiptFromOutboundResults({
          results: [{ channel: "demo", messageId: sent.id, conversationId: to }],
          kind: "text",
          threadId: threadId == null ? undefined : String(threadId),
          replyToId: replyToId ?? undefined,
        }),
      };
    },
  },
});
```

然後將其附加到頻道外掛：

```typescript
export const demoPlugin = createChatChannelPlugin({
  base: {
    id: "demo",
    message: demoMessageAdapter,
    // other channel plugin fields
  },
});
```

僅聲明介面卡真正保留的功能。每個聲明的功能都應該有合約測試（contract test）。

## 輸出橋接

如果該頻道已經有相容的 `outbound` 介面卡，請優先衍生訊息介面卡，而不是重複發送程式碼：

```typescript
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";

const demoMessageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound: demoOutboundAdapter,
});
```

橋接器將舊的輸出發送結果轉換為 `MessageReceipt` 值。新程式碼應端到端傳遞收據，並僅在與 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 的相容性邊緣衍生舊版 ID。
如果未提供接收策略，`createChannelMessageAdapterFromOutbound(...)` 將使用 `manual` 接收確認策略。這使得外掛擁有的平台確認變得明確，而不會改變在通用接收上下文之外確認 webhooks、sockets 或輪詢偏移量的頻道。

## 訊息工具發送

共用的 `message(action="send")` 路徑應使用與最終回覆相同的核心傳遞生命週期。如果頻道需要針對工具發送進行提供者特定的塑形，請實作 `actions.prepareSendPayload(...)`，而不是從 `actions.handleAction(...)` 發送。

`prepareSendPayload(...)` 接收標準化的核心 `ReplyPayload` 以及
完整的動作上下文。在 `payload.channelData.<channel>` 中返回包含特定通道資料的
載荷，並讓核心呼叫 `sendMessage(...)`、
訊息生命週期執行時、預寫日誌佇列、訊息發送攔截器、
重試、恢復和確認清理。生命週期執行時可能會在內部
呼叫 `deliverOutboundPayloads(...)` 作為相容性底層，但通道
外掛不應直接呼叫它來執行新的發送行為。

僅當發送無法表示為持久載荷時（例如因為它包含不可序列化的元件工廠）才
返回 `null`。核心為了相容性將保留
傳統外掛動作後備方案，但新的通道發送
功能應可表示為持久載荷資料。

```typescript
export const demoActions: ChannelMessageActionAdapter = {
  describeMessageTool: () => ({ actions: ["send"], capabilities: ["presentation"] }),
  prepareSendPayload: ({ ctx, payload }) => {
    if (ctx.action !== "send") {
      return null;
    }
    return {
      ...payload,
      channelData: {
        ...payload.channelData,
        demo: {
          ...(payload.channelData?.demo as object | undefined),
          nativeCard: ctx.params.card,
        },
      },
    };
  },
};
```

然後出站介面卡會讀取 `sendPayload` 內的 `payload.channelData.demo`。這能將平台特定的渲染保留在插件中，同時核心仍負責持久化、重試、復原、掛鉤和確認。

準備好的 `message(action="send")` Payload 和通用最終回覆交付預設使用核心交付，並搭配盡力而為（best-effort）的佇列機制。只有在核心驗證頻道能夠調解崩潰後結果未知的發送操作後，才支援強制性的持久佇列。如果介面卡無法實作 `reconcileUnknownSend`，請讓準備發送路徑維持盡力而為；核心仍會嘗試預寫日誌佇列，但佇列持久化或不確定的崩潰復原並非必要交付合約的一部分。

## 持久最終能力

持久化最終交付是針對每個副作用選擇加入的。只有在適配器宣告了載荷和交付選項所需的所有能力時，Core 才會使用通用的持久化交付。

| 能力                   | 宣告時機                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `text`                 | 適配器可以發送文字並返回回據。                                         |
| `media`                | 媒體發送會為每個可見的平台訊息返回回據。                               |
| `payload`              | 適配器保留豐富的回覆載荷語義，而不僅僅是文字和一個媒體 URL。           |
| `replyTo`              | 原生回覆目標會到達平台。                                               |
| `thread`               | 原生串列、主題或頻道串列目標會到達平台。                               |
| `silent`               | 通知抑制會到達平台。                                                   |
| `nativeQuote`          | 選取的引用元資料會到達平台。                                           |
| `messageSendingHooks`  | 核心發送訊息的 Hook 可以在平台 I/O 之前取消或重寫內容。                |
| `batch`                | 多部分渲染的批次可作為一個持久計畫重新播放。                           |
| `reconcileUnknownSend` | 配接器可以在不進行盲目重新播放的情況下解析 `unknown_after_send` 復原。 |
| `afterSendSuccess`     | 通道本地的發送後副作用僅執行一次。                                     |
| `afterCommit`          | 通道本地的提交後副作用僅執行一次。                                     |

盡力而為的最終傳遞不需要 `reconcileUnknownSend`；當配接器保留載荷的可見語意時，它會使用共用的生命週期，如果佇列持久性不可用，則回退到直接平台 I/O。所需的持久最終傳遞必須明確要求 `reconcileUnknownSend`。如果配接器無法確定已啟動/未知的傳送是否已到達平台，請勿宣告該功能；核心會在進入佇列之前拒絕所需的持久傳遞。

當呼叫者需要持久傳遞時，請推導需求而不是手動建立映射：

```typescript
import { deriveDurableFinalDeliveryRequirements } from "openclaw/plugin-sdk/channel-message";

const requiredCapabilities = deriveDurableFinalDeliveryRequirements({
  payload,
  replyToId,
  threadId,
  silent,
  payloadTransport: true,
  extraCapabilities: {
    nativeQuote: hasSelectedQuote(payload),
  },
});
```

預設情況下需要 `messageSendingHooks`。僅對於故意無法執行全域訊息傳送掛鉤的路徑設定 `messageSendingHooks: false`。

## 持久傳送契約

持久的最終傳送比舊版的通道擁有傳遞具有更嚴格的語意：

- 在平台 I/O 之前建立持久意圖。
- 如果持久化傳遞返回已處理的結果，請不要回退到舊版發送。
- 將掛鉤取消和無發送結果視為終態。
- 將 `unsupported` 僅視為預意圖結果。
- 對於必需的持久性，如果佇列無法記錄平台發送已開始，請在平台 I/O 之前失敗。
- 對於必需的最終傳遞和必需的已準備訊息工具發送，請預檢 `reconcileUnknownSend`；恢復機制必須能夠確認已發送的訊息，或僅在適配器證明原始發送未發生後重播。
- 對於 `best_effort`，佇列寫入失敗可能會回退到直接平台 I/O。
- 將中止信號轉發到媒體載入和平台發送。
- 在佇列確認之後執行提交後掛鉤；直接的最佳努力回退會在成功的平台 I/O 之後執行它們，因為沒有持久化佇列提交。
- 為每個可見的平台訊息 ID 返回收據。
- 當平台可以檢查不確定的發送是否已經到達用戶時，請使用 `reconcileUnknownSend`。

此合約可避免在崩潰後重複發送，並避免繞過訊息發送取消掛鉤 (cancellation hooks)。

## 收據

`MessageReceipt` 是平台接受內容的新內部記錄：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  sentAt: number;
  raw?: readonly MessageReceiptSourceResult[];
};
```

在調整現有發送結果時，請使用 `createMessageReceiptFromOutboundResults(...)`。當即時預覽訊息成為最終收據時，請使用 `createPreviewMessageReceipt(...)`。避免新增所有者本地的 `messageIds` 欄位。舊版的 `ChannelDeliveryResult.messageIds` 仍會在相容性邊緣產生。

## 即時預覽

串流草稿預覽或進度更新的頻道應該宣告即時功能 (live capabilities)：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  live: {
    capabilities: {
      draftPreview: true,
      previewFinalization: true,
      progressUpdates: true,
      quietFinalization: true,
    },
    finalizer: {
      capabilities: {
        finalEdit: true,
        normalFallback: true,
        discardPending: true,
        previewReceipt: true,
        retainOnAmbiguousFailure: true,
      },
    },
  },
});
```

使用 `defineFinalizableLivePreviewAdapter(...)` 和
`deliverWithFinalizableLivePreviewAdapter(...)` 進行執行時期最終處理。最終處理器會決定最終回覆是就地編輯預覽、發送
正常的後備方案、捨棄擱置中的預覽狀態、保留模稜兩可的失敗編輯
而不重複訊息，並傳回最終收據。

## 接收確認原則

控制平台確認時機的輸入接收器應宣告
接收原則：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  receive: {
    defaultAckPolicy: "after_agent_dispatch",
    supportedAckPolicies: ["after_receive_record", "after_agent_dispatch"],
  },
});
```

未宣告接收原則的適配器預設為：

```typescript
{
  receive: {
    defaultAckPolicy: "manual",
    supportedAckPolicies: ["manual"],
  },
}
```

當平台沒有需要延後的確認、已在非同步處理前
完成確認，或需要通訊協定特定的回應
語意時，請使用預設值。僅當接收器實際
使用接收內容來延後平台確認時，才宣告其中一個分階段原則。

原則：

| 原則                   | 使用時機                                         |
| ---------------------- | ------------------------------------------------ |
| `after_receive_record` | 平台可以在解析並記錄入站事件後被確認。           |
| `after_agent_dispatch` | 平台應該等待，直到代理調度已被接受。             |
| `after_durable_send`   | 平台應該等待，直到最終交付具有持久化決策。       |
| `manual`               | 外掛程式擁有確認權，因為平台語義不符合通用階段。 |

在延遲 ack 狀態的接收器中使用 `createMessageReceiveContext(...)`，並在接收器需要測試某個階段是否滿足配置的策略時使用 `shouldAckMessageAfterStage(...)`。

## 合約測試

功能宣告是外掛程式合約的一部分。請用測試來支援它們：

```typescript
import { verifyChannelMessageAdapterCapabilityProofs, verifyChannelMessageLiveCapabilityAdapterProofs, verifyChannelMessageLiveFinalizerProofs, verifyChannelMessageReceiveAckPolicyAdapterProofs } from "openclaw/plugin-sdk/channel-message";

it("backs declared message capabilities", async () => {
  await expect(
    verifyChannelMessageAdapterCapabilityProofs({
      adapterName: "demo",
      adapter: demoMessageAdapter,
      proofs: {
        text: async () => {
          const result = await demoMessageAdapter.send!.text!(textCtx);
          expect(result.receipt.platformMessageIds).toContain("msg-1");
        },
        replyTo: async () => {
          await demoMessageAdapter.send!.text!({ ...textCtx, replyToId: "parent-1" });
          expect(sendDemoMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              replyToId: "parent-1",
            }),
          );
        },
        messageSendingHooks: () => {
          expect(demoMessageAdapter.durableFinal!.capabilities!.messageSendingHooks).toBe(true);
        },
      },
    }),
  ).resolves.toContainEqual({ capability: "text", status: "verified" });
});
```

當配接器宣告這些功能時，請添加即時和接收證明套件。缺少證明應導致測試失敗，而不是默默地擴大持久化範圍。

## 已棄用的相容性 API

這些 API 仍可供匯入以協助第三方相容性。請勿在新的頻道程式碼中使用它們。

| 已棄用的 API                                 | 取代項目                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/channel-reply-pipeline` | `openclaw/plugin-sdk/channel-message`                                                                                  |
| `createChannelTurnReplyPipeline(...)`        | 用於相容性分派器的 `createChannelMessageReplyPipeline(...)`，或是用於新頻道程式碼的 `message` 介接卡                   |
| `buildChannelMessageReplyDispatchBase(...)`  | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或是用於新頻道程式碼的 `message` 介接卡 |
| `dispatchChannelMessageReplyWithBase(...)`   | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或是用於新頻道程式碼的 `message` 介接卡 |
| `recordChannelMessageReplyDispatch(...)`     | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或針對新頻道程式碼使用 `message` 配接器 |
| `deliverOutboundPayloads(...)`               | 從 `channel-message-runtime` 取得 `sendDurableMessageBatch(...)` 或 `deliverInboundReplyWithMessageSendContext(...)`   |
| `deliverDurableInboundReplyPayload(...)`     | 從 `openclaw/plugin-sdk/channel-message-runtime` 取得 `deliverInboundReplyWithMessageSendContext(...)`                 |
| `dispatchInboundReplyWithBase(...)`          | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或針對新頻道程式碼使用 `message` 配接器 |
| `recordInboundSessionAndDispatchReply(...)`  | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或針對新頻道程式碼使用 `message` 配接器 |
| `resolveChannelSourceReplyDeliveryMode(...)` | `resolveChannelMessageSourceReplyDeliveryMode(...)`                                                                    |
| `deliverFinalizableDraftPreview(...)`        | `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)`                        |
| `DraftPreviewFinalizerDraft`                 | `LivePreviewFinalizerDraft`                                                                                            |
| `DraftPreviewFinalizerResult`                | `LivePreviewFinalizerResult`                                                                                           |

相容性分派器仍可透過訊息外觀使用 `createReplyPrefixContext(...)`、
`createReplyPrefixOptions(...)` 和 `createTypingCallbacks(...)`。
新的生命週期程式碼應避免使用舊的
`channel-reply-pipeline` 子路徑。

## 遷移檢查清單

1. 將 `message: defineChannelMessageAdapter(...)` 或
   `message: createChannelMessageAdapterFromOutbound(...)` 新增至頻道外掛。
2. 從文字、媒體和負載發送傳回 `MessageReceipt`。
3. 僅宣告由原生行為和測試支援的功能。
4. 將手寫的持久需求對應表替換為
   `deriveDurableFinalDeliveryRequirements(...)`。
5. 當頻道就地編輯草稿訊息時，請透過即時預覽協助程式來移動預覽最終處理。
6. 僅當接收者確實可以延遲平台確認時，才宣告接收確認策略。
7. 僅在相容性邊緣保留舊版回覆分派協助程式。
