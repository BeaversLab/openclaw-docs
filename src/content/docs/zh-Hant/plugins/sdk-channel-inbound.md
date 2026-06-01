---
summary: "通道外掛程式的連入事件輔助程式：情境建構、共享執行器協調、會話記錄及預先準備的回覆分派"
title: "通道連入 API"
read_when:
  - You are building or refactoring a messaging channel plugin receive path
  - You need shared inbound context construction, session recording, or prepared reply dispatch
  - You are migrating old channel turn helpers to inbound/message APIs
---

通道外掛程式應使用連入和訊息名詞來對接收路徑進行建模：

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

使用 `openclaw/plugin-sdk/channel-inbound` 進行連入事件正規化、
格式化、根設定和協調。使用
`openclaw/plugin-sdk/channel-outbound` 進行原生
傳送、收據、持續交付和即時預覽行為。

## 核心輔助程式

```ts
import { buildChannelInboundEventContext, runChannelInboundEvent, dispatchChannelInboundReply } from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`：將正規化的通道事
  實投射到提示/會話情境中。
- `runChannelInboundEvent(...)`：對單一連入平台事件執行
  擷取、分類、預檢、解析、記錄、分派和完成。
- `dispatchChannelInboundReply(...)`：使用傳遞配接器記錄
  並分派已組裝的連入回覆。

對於已接收執行時期物件的捆綁/原生通道，注入的外掛程式執行時期會在
`runtime.channel.inbound.*` 下公開相同的高層級輔助程式。

```ts
await runtime.channel.inbound.run({
  channel: "demo",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest: normalizePlatformEvent,
    resolveTurn: resolveInboundReply,
  },
});
```

相容性分派器應組裝 `dispatchChannelInboundReply(...)`
輸入，並將平台傳遞保留在傳遞配接器中。新的傳送路徑應優先
使用訊息配接器和持續性訊息輔助程式。

## 移轉

舊的 `runtime.channel.turn.*` 執行時期別名已被移除。請使用：

- `runtime.channel.inbound.run(...)` 用於原始連入事件。
- `runtime.channel.inbound.dispatchReply(...)` 用於已組裝的回覆情境。
- `runtime.channel.inbound.buildContext(...)` 用於連入情境負載。
- `runtime.channel.inbound.runPreparedReply(...)` 僅用於通道擁有的預先準備
  分派路徑，這些路徑已自行組裝分派閉包。

新的外掛程式碼不應引入 `turn` 命名的通道 API。請將模型或
代理人回合詞彙保留在代理人/提供者程式碼中；通道外掛程式使用連入、
訊息、傳遞和回覆術語。
