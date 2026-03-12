---
title: 出站会话镜像重构 (Issue #1520)
description: 跟踪出站会话镜像重构的笔记、决策、测试和未完成项。
summary: "将出站发送镜像到目标通道会话的重构笔记"
read_when:
  - Working on outbound transcript/session mirroring behavior
  - Debugging sessionKey derivation for send/message tool paths
---

# 出站会话镜像重构 (Issue #1520)

## 状态

- 进行中。
- 核心 + 插件通道路由已针对出站镜像进行了更新。
- 网关发送现在会在省略 sessionKey 时派生目标会话。

## 背景

出站发送被镜像到了_当前_代理会话（工具会话键），而不是目标通道会话。入站路由使用通道/对等会话键，因此出站响应落入了错误的会话，并且首次联系的目标通常缺少会话条目。

## 目标

- 将出站消息镜像到目标通道会话键。
- 在出站时缺失时创建会话条目。
- 保持线程/主题范围与入站会话键一致。
- 覆盖核心通道及捆绑的扩展。

## 实现摘要

- 新的出站会话路由辅助工具：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey` (dmScope + identityLinks) 构建目标 sessionKey。
  - `ensureOutboundSessionEntry` 通过 `recordSessionMetaFromInbound` 写入最小的 `MsgContext`。
- `runMessageAction` (send) 派生目标 sessionKey 并将其传递给 `executeSendAction` 进行镜像。
- `message-tool` 不再直接镜像；它仅从当前会话键解析 agentId。
- 插件发送路径使用派生的 sessionKey 通过 `appendAssistantMessageToSessionTranscript` 进行镜像。
- 网关发送在未提供会话键（默认代理）时派生目标会话键，并确保会话条目存在。

## 线程/主题处理

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (后缀)。
- Discord: threadId/replyTo -> `resolveThreadSessionKeys`，并带有 `useSuffix=false` 以匹配入站（线程通道 ID 已限定会话范围）。
- Telegram: 主题 ID 通过 `buildTelegramGroupPeerId` 映射到 `chatId:topic:<id>`。

## 覆盖的扩展

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- 备注：
  - Mattermost 目标现在会去除 `@` 以进行 DM 会话密钥路由。
  - Zalo Personal 对 1:1 目标使用 DM peer kind（仅当存在 `group:` 时使用群组）。
  - BlueBubbles 群组目标会去除 `chat_*` 前缀以匹配入站会话密钥。
  - Slack 自动线程镜像不区分大小写地匹配频道 ID。
  - 网关发送在镜像之前会将提供的会话密钥转换为小写。

## 决策

- **网关发送会话推导**：如果提供了 `sessionKey`，则使用它。如果省略，则从目标 + 默认代理推导会话密钥并在那里进行镜像。
- **会话条目创建**：始终使用 `recordSessionMetaFromInbound`，并将 `Provider/From/To/ChatType/AccountId/Originating*` 对齐到入站格式。
- **目标规范化**：出站路由在可用时使用解析后的目标（`resolveChannelTarget` 之后）。
- **会话密钥大小写**：在写入和迁移期间将会话密钥规范化为小写。

## 已添加/更新的测试

- `src/infra/outbound/outbound.test.ts`
  - Slack 线程会话密钥。
  - Telegram 主题会话密钥。
  - Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从会话密钥推导 agentId（不传递会话密钥）。
- `src/gateway/server-methods/send.test.ts`
  - 在省略时推导会话密钥并创建会话条目。

## 待办事项 / 后续跟进

- 语音通话插件使用自定义 `voice:<phone>` 会话密钥。此处未标准化出站映射；如果消息工具应支持语音通话发送，请添加显式映射。
- 确认是否有任何外部插件使用捆绑集合之外的非标准 `From/To` 格式。

## 涉及的文件

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 测试位于：
  - `src/infra/outbound/outbound.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
