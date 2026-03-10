---
title: "出站会话镜像重构（问题 #1520）"
description: "记录出站会话镜像重构：笔记、决策、测试和待办事项。"
---

# 出站会话镜像重构（问题 #1520）

## 状态

- 进行中。
- 核心和插件通道路由已更新以支持出站镜像。
- Gateway发送在省略 sessionKey 时派生目标会话。

## 背景

出站发送被镜像到**当前**代理会话（工具会话密钥），而不是目标通道会话。入站路由使用通道/对等会话密钥，因此出站回复会落入错误的会话，并且首次联系的目标通常缺少会话条目。

## 目标

- 将出站消息镜像到目标通道会话密钥。
- 在出站缺失时创建会话条目。
- 保持线程/主题范围与入站会话密钥对齐。
- 覆盖核心通道和内置扩展。

## 实现摘要

- 新的出站会话路由辅助函数：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey` 构建目标 sessionKey（dmScope + identityLinks）。
  - `ensureOutboundSessionEntry` 通过 `MsgContext` 写入最小的 `recordSessionMetaFromInbound`。
- `runMessageAction` (send) 派生目标 sessionKey 并传递给 `executeSendAction` 进行镜像。
- `message-tool` 不再直接镜像；仅从当前会话密钥解析 agentId。
- 插件发送路径通过 `appendAssistantMessageToSessionTranscript` 使用派生的 sessionKey 进行镜像。
- Gateway发送在未提供会话密钥时派生目标会话密钥（默认代理），并确保创建会话条目。

## 线程/主题处理

- Slack：replyTo/threadId -> `resolveThreadSessionKeys`（后缀）。
- Discord：threadId/replyTo -> `resolveThreadSessionKeys` 和 `useSuffix=false` 以匹配入站（线程通道 ID 已限定会话范围）。
- Telegram：主题 ID 通过 `chatId:topic:<id>` 映射到 `buildTelegramGroupPeerId`。

## 覆盖的扩展

- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 注意：
  - Mattermost 目标现在移除 `@` 以路由 DM 会话密钥。
  - Zalo Personal 对 1:1 目标使用 DM 对等类型（仅在存在 `group:` 时才视为群组）。
  - BlueBubbles 群组目标移除 `chat_*` 前缀以匹配入站会话密钥。
  - Slack 自动线程镜像按通道 ID 不区分大小写匹配。
  - Gateway发送在镜像前将提供的会话密钥转换为小写。

## 决策

- **Gateway发送会话派生**：如果提供了 `sessionKey` 则使用；如果省略，则基于目标 + 默认代理派生 sessionKey 并镜像到该会话。
- **会话条目创建**：始终使用 `recordSessionMetaFromInbound`，确保 `Provider/From/To/ChatType/AccountId/Originating*` 与入站格式对齐。
- **目标规范化**：出站路由在可用时使用已解析的目标（在 `resolveChannelTarget` 之后）。
- **会话密钥大小写**：在写入和迁移时规范化为小写。

## 新增/更新的测试

- `src/infra/outbound/outbound-session.test.ts`
  - Slack 线程会话密钥。
  - Telegram 主题会话密钥。
  - Discord dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从会话密钥派生 agentId（未传递 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 在省略会话密钥时派生并创建会话条目。

## 待办事项 / 后续工作

- voice-call 插件使用自定义 `voice:<phone>` 会话密钥。此处未标准化出站映射；如果 message-tool 需要支持 voice-call 发送，应添加显式映射。
- 确认是否有任何外部插件使用非标准的 `From/To` 格式（超出内置集合）。

## 涉及的文件

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 测试文件：
  - `src/infra/outbound/outbound-session.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
