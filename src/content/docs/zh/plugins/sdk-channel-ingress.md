---
summary: "API用于入站消息授权的实验性渠道入口 API"
read_when:
  - Building or migrating a messaging channel plugin
  - Changing DM or group allowlists, route gates, command auth, event auth, or mention activation
  - Reviewing channel ingress redaction or SDK compatibility boundaries
title: "API渠道入口 API"
sidebarTitle: "渠道入口"
---

# 渠道入口 API

渠道入口是入站渠道事件的实验性访问控制边界。请在接收路径中使用 `openclaw/plugin-sdk/channel-ingress-runtime`。
较旧的 `openclaw/plugin-sdk/channel-ingress` 子路径仍作为已弃用的兼容性外观导出，供第三方插件使用。

插件拥有平台事实和副作用。核心拥有通用策略：私信/组允许列表、配对存储私信条目、路由门、命令门、事件授权、提及激活、脱敏诊断以及准入。

## 运行时解析器

```ts
import { defineStableChannelIngressIdentity, resolveChannelMessageIngress } from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await resolveChannelMessageIngress({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});
```

不要预先计算有效允许列表、命令所有者或命令组。解析器会从原始允许列表、存储回调、路由描述符、访问组、策略和对话类型中推导它们。

## 结果

捆绑插件应直接使用现代投影：

- `ingress`：有序门决策和准入
- `senderAccess`：仅发送者/对话授权
- `routeAccess`：路由和路由发送者投影
- `commandAccess`：命令授权；当未运行命令门时为 false
- `activationAccess`：提及/激活结果

事件授权在有序的 `ingress.graph` 和决定性的 `ingress.reasonCode` 上仍然可用；不会发出单独的事件投影。

已弃用的第三方 SDK 辅助工具可能会在内部重建较旧的形状。新的捆绑接收路径不应将现代结果转换回本地 DTO。

## 访问组

`accessGroup:<name>` 条目保持脱敏状态。核心自行解析静态 `message.senders` 组，并仅对需要平台查找的动态组调用 `resolveAccessGroupMembership`。缺失、不受支持和失败的组将以失败关闭。

## 事件模式

| `authMode`       | 含义                               |
| ---------------- | ---------------------------------- |
| `inbound`        | 普通入站发送者网关                 |
| `command`        | 用于回调或作用域按钮的命令网关     |
| `origin-subject` | 参与者必须匹配原始消息主题         |
| `route-only`     | 仅用于路由范围受信任事件的路由网关 |
| `none`           | 插件拥有的内部事件绕过共享身份验证 |

使用 `mayPair: false` 处理表情回应、按钮、回调和本机命令。

## 路由与激活

对房间、主题、公会、线程或嵌套路由策略使用路由描述符：

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

当插件具有多个可选路由描述符时，使用 `channelIngressRoutes(...)`；它会过滤禁用的分支，同时保持路由事实通用，并按每个描述符的 `precedence` 排序。

提及筛选是一个激活网关。如果未命中提及，则返回 `admission: "skip"`，以便轮次内核不处理仅观察的轮次。大多数通道应在发送者和命令网关之后保留激活。当禁用文本命令绕过时，必须在发送者允许列表噪音之前静默未提及流量的公共聊天表面可以选择加入 `activation.order: "before-sender"`。具有隐式激活的通道（例如机器人线程中的回复）可以传递 `activation.allowedImplicitMentionKinds`；然后，投影的 `activationAccess.shouldBypassMention` 会报告命令或隐式激活何时绕过了显式提及。

## 编辑

原始发送者值和原始允许列表条目仅作为解析器输入。它们不得出现在已解析状态、决策、诊断、快照或兼容性事实中。请使用不透明主题 ID、条目 ID、路由 ID 和诊断 ID。

## 验证

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:check
```
