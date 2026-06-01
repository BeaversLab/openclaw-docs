---
summary: "適用於外掛程式的通道外寄訊息生命週期 API：配接器、收據、持久性傳送、即時預覽和回覆管線協助程式"
title: "通道外寄 API"
read_when:
  - You are building or refactoring a messaging channel plugin send path
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from channel-message, channel-message-runtime, or legacy reply dispatch helpers
---

通道外掛程式應透過
`openclaw/plugin-sdk/channel-outbound` 公開外寄訊息行為。請使用
`openclaw/plugin-sdk/channel-inbound` 進行接收/內容/分派協調。

核心系統擁有佇列、持久性、一般重試原則、勾點、收據以及共用
`message` 工具。外掛程式擁有原生傳送/編輯/刪除呼叫、目標
正規化、平台執行緒、選取的引文、通知旗標、帳戶
狀態以及平台特定的副作用。

## 配接器

大多數外掛程式會定義一個 `message` 配接器：

```ts
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-outbound";

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

請僅宣告原生傳輸實際保留的功能。請使用從此子路徑匯出的合約協助程式，來涵蓋每個
已宣告的傳送、收據、即時預覽以及接收確認功能。

## 現有外寄配接器

如果通道已有相容的 `outbound` 配接器，請衍生訊息
配接器，而非重複傳送程式碼：

```ts
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-outbound";

export const messageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound,
  durableFinal: {
    capabilities: {
      text: true,
      media: true,
    },
  },
});
```

## 持久性傳送

執行階段傳送協助程式也位於 `channel-outbound` 上：

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- 草稿串流/進度協助程式，例如 `resolveChannelStreamingPreviewChunk(...)`

`sendDurableMessageBatch(...)` 會傳回一個明確結果：

- `sent`：至少已傳送一則可見的平台訊息。
- `suppressed`：不應將任何平台訊息視為遺失。
- `partial_failed`：在後續
  載荷或副作用失敗之前，至少已傳送一則平台訊息。
- `failed`：未產生任何平台收據。

當批次混合了已傳送、已隱藏和失敗的載荷時，請使用 `payloadOutcomes`。
切勿從空的舊版直接傳送結果推斷勾點已取消。

## 相容性分派

入站回覆調度應透過來自 `channel-inbound` 的 `dispatchChannelInboundReply(...)` 進行組裝。請將平台遞送保留在遞送介面卡中；對於訊息介面卡、持久傳送、回執、即時預覽和回覆管線選項，請使用 `channel-outbound`。
