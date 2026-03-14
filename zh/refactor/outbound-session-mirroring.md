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
- `runMessageAction` (send) 推导目标 sessionKey 并将其传递给 `executeSendAction` 以进行镜像。
- `message-tool` 不再直接镜像；它仅从当前 会话 key 解析 agentId。
- 插件发送路径使用推导出的 sessionKey 通过 `appendAssistantMessageToSessionTranscript` 进行镜像。
- Gateway(网关) send 在未提供目标会话密钥时（默认代理），会推导出一个目标会话密钥，并确保存在一个会话条目。

## 线程/主题处理

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (后缀)。
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` 并带有 `useSuffix=false` 以匹配入站（线程 渠道 id 已限定会话范围）。
- Telegram: 主题 ID 通过 `buildTelegramGroupPeerId` 映射到 `chatId:topic:<id>`。

## 涵盖的扩展

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- 备注：
  - Mattermost 目标现在移除 `@` 用于 私信 会话密钥路由。
  - Zalo Personal 对 1:1 目标使用 私信 peer kind（仅在存在 `group:` 时使用 group）。
  - BlueBubbles 群组目标移除 `chat_*` 前缀以匹配入站 会话 keys。
  - Slack 自动线程镜像不区分大小写地匹配 渠道 id。
  - Gateway(网关) send lowercases provided 会话 keys before mirroring.

## 决策

- **Gateway(网关) 发送会话派生**：如果提供了 `sessionKey`，则使用它。如果省略，则从目标 + 默认代理派生 sessionKey 并在其中进行镜像。
- **会话条目创建**：始终使用 `recordSessionMetaFromInbound`，其中 `Provider/From/To/ChatType/AccountId/Originating*` 与入站格式对齐。
- **目标规范化**：出站路由在可用时使用解析后的目标（post `resolveChannelTarget`）。
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

- 语音通话插件使用自定义 `voice:<phone>` 会话键。此处未对出站映射进行标准化；如果 message-工具 应支持语音通话发送，请添加显式映射。
- 确认是否有任何外部插件使用非标准的 `From/To` 格式（超出内置集）。

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

import zh from '/components/footer/zh.mdx';

<zh />
