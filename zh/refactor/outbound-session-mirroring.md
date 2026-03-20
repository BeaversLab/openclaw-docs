---
title: 出站会话镜像重构 (Issue #1520)
description: 跟踪出站会话镜像重构的注释、决策、测试和未完成项。
summary: "将出站发送镜像到目标渠道会话的重构注释"
read_when:
  - 处理出站记录/会话镜像行为
  - 调试发送/消息工具路径的 sessionKey 派生
---

# 出站会话镜像重构 (Issue #1520)

## 状态

- 进行中。
- 核心 + 插件通道路由已针对出站镜像进行了更新。
- Gateway 网关 发送现在会在省略 sessionKey 时派生目标会话。

## 背景

出站发送被镜像到了*当前*代理会话（工具会话键），而不是目标通道会话。入站路由使用通道/对等会话键，因此出站响应落入了错误的会话，并且首次联系的目标通常缺少会话条目。

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
- `runMessageAction` (发送) 派生目标 sessionKey 并将其传递给 `executeSendAction` 以进行镜像。
- `message-tool` 不再直接镜像；它仅从当前会话 key 解析 agentId。
- 插件发送路径使用派生的 sessionKey 通过 `appendAssistantMessageToSessionTranscript` 进行镜像。
- Gateway(网关) send 在未提供目标会话密钥时（默认代理），会推导出一个目标会话密钥，并确保存在一个会话条目。

## 线程/主题处理

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (后缀)。
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` 并带有 `useSuffix=false` 以匹配入站 (线程渠道 ID 已对会话进行限定)。
- Telegram: 主题 ID 通过 `buildTelegramGroupPeerId` 映射到 `chatId:topic:<id>`。

## 涵盖的扩展

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- 备注：
  - Mattermost 目标现在剥离 `@` 用于 私信 会话 key 路由。
  - Zalo 个人版对 1:1 目标使用 私信 对端类型 (仅当存在 `group:` 时为群组)。
  - BlueBubbles 群组目标剥离 `chat_*` 前缀以匹配入站会话 keys。
  - Slack 自动线程镜像不区分大小写地匹配 渠道 id。
  - Gateway(网关) send lowercases provided 会话 keys before mirroring.

## 决策

- **Gateway(网关) 发送会话派生**：如果提供了 `sessionKey`，则使用它。如果省略，则从目标 + 默认代理派生 sessionKey 并在那里进行镜像。
- **会话条目创建**：始终使用带有 `Provider/From/To/ChatType/AccountId/Originating*` 的 `recordSessionMetaFromInbound`，其中 `Provider/From/To/ChatType/AccountId/Originating*` 与入站格式一致。
- **目标标准化**：出站路由在可用时使用解析后的目标 (`resolveChannelTarget` 之后)。
- **会话键大小写**：在写入和迁移期间将会话键规范化为小写。

## 已添加/更新的测试

- `src/infra/outbound/outbound.test.ts`
  - Slack 线程会话密钥。
  - Telegram 话题会话密钥。
  - 使用 Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从会话键派生 agentId（不传递 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 在省略时派生会话键并创建会话条目。

## 未决事项 / 后续跟进

- 语音通话插件使用自定义 `voice:<phone>` 会话密钥。此处未标准化出站映射；如果 message 工具应支持语音通话发送，请添加显式映射。
- 确认是否有任何外部插件使用非标准的 `From/To` 格式（内置集合之外）。

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

import zh from "/components/footer/zh.mdx";

<zh />
