---
summary: "用于渠道插件的入站事件助手：上下文构建、共享运行器编排、会话记录和准备好的回复分发"
title: "API渠道入站 API"
read_when:
  - You are building or refactoring a messaging channel plugin receive path
  - You need shared inbound context construction, session recording, or prepared reply dispatch
  - You are migrating old channel turn helpers to inbound/message APIs
---

渠道插件应使用入站和消息名词来建模接收路径：

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

使用 `openclaw/plugin-sdk/channel-inbound` 进行入站事件规范化、
格式化、根设置和编排。使用
`openclaw/plugin-sdk/channel-outbound` 进行原生
发送、回执、持久化传递和实时预览行为。

## 核心助手

```ts
import { buildChannelInboundEventContext, runChannelInboundEvent, dispatchChannelInboundReply } from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`：将规范化的渠道事实投影到
  提示/会话上下文中。
- `runChannelInboundEvent(...)`：针对一个入站平台事件运行摄入、分类、预检、解析、
  记录、分发和完成。
- `dispatchChannelInboundReply(...)`：使用传递适配器记录和分发已组装的
  入站回复。

注入的插件运行时在 `runtime.channel.inbound.*` 下公开了相同的高级助手，
供那些已经接收运行时对象的捆绑/原生渠道使用。

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

兼容性分发器应组装 `dispatchChannelInboundReply(...)`
输入，并将平台传递保留在传递适配器中。新的发送路径应
首选消息适配器和持久化消息助手。

## 迁移

旧的 `runtime.channel.turn.*` 运行时别名已被移除。请使用：

- `runtime.channel.inbound.run(...)` 用于原始入站事件。
- `runtime.channel.inbound.dispatchReply(...)` 用于已组装的回复上下文。
- `runtime.channel.inbound.buildContext(...)` 用于入站上下文负载。
- `runtime.channel.inbound.runPreparedReply(...)` 仅用于渠道拥有的准备
  分发路径，这些路径已经组装了自己的分发闭包。

新的插件代码不应引入 `turn` 命名的渠道 API。将模型或
代理轮次词汇保留在代理/提供商代码中；渠道插件使用入站、
消息、传递和回复术语。
