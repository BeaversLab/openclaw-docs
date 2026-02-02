> [!NOTE]
> 本页正在翻译中。

---
title: 出站会话镜像重构（Issue #1520）
description: 记录出站会话镜像重构的说明、决策、测试与待办事项。
---

# 出站会话镜像重构（Issue #1520）

## 状态
- 进行中。
- 核心与插件频道路由已更新以支持出站镜像。
- Gateway send 在省略 sessionKey 时会派生目标会话。

## 背景
出站发送被镜像到 **当前** 代理会话（tool session key），而不是目标频道会话。入站路由使用 channel/peer session key，因此出站回复落在错误会话中，且首次联系的目标经常缺少会话条目。

## 目标
- 将出站消息镜像到目标频道 session key。
- 出站缺失时创建会话条目。
- 保持 thread/topic 范围与入站 session key 对齐。
- 覆盖核心频道与内置扩展。

## 实现摘要
- 新增出站会话路由助手：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey`（dmScope + identityLinks）构建目标 sessionKey。
  - `ensureOutboundSessionEntry` 通过 `recordSessionMetaFromInbound` 写入最小 `MsgContext`。
- `runMessageAction`（send）派生目标 sessionKey，并传给 `executeSendAction` 用于镜像。
- `message-tool` 不再直接镜像；仅从当前 session key 解析 agentId。
- 插件发送路径通过 `appendAssistantMessageToSessionTranscript` 使用派生的 sessionKey 镜像。
- Gateway send 在未提供 session key 时派生目标 session key（默认 agent），并确保创建会话条目。

## Thread/Topic 处理
- Slack：replyTo/threadId -> `resolveThreadSessionKeys`（后缀）。
- Discord：threadId/replyTo -> `resolveThreadSessionKeys` 且 `useSuffix=false` 以匹配入站（thread channel id 已限定会话）。
- Telegram：topic ID 通过 `buildTelegramGroupPeerId` 映射为 `chatId:topic:<id>`。

## 覆盖的扩展
- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 说明：
  - Mattermost 目标现在会移除 `@` 以路由 DM 会话 key。
  - Zalo Personal 对 1:1 目标使用 DM peer kind（仅当存在 `group:` 时才视为群组）。
  - BlueBubbles 群组目标会移除 `chat_*` 前缀以匹配入站 session key。
  - Slack 自动 thread 镜像按 channel id 不区分大小写匹配。
  - Gateway send 在镜像前将提供的 session key 统一转小写。

## 决策
- **Gateway send 会话派生**：若提供 `sessionKey` 则使用；若省略，则基于目标 + 默认 agent 派生 sessionKey 并镜像到该会话。
- **会话条目创建**：始终使用 `recordSessionMetaFromInbound`，确保 `Provider/From/To/ChatType/AccountId/Originating*` 与入站格式对齐。
- **目标规范化**：可用时，出站路由使用解析后的目标（`resolveChannelTarget` 之后）。
- **会话 key 大小写**：写入时与迁移时统一转小写。

## 新增/更新测试
- `src/infra/outbound/outbound-session.test.ts`
  - Slack thread session key。
  - Telegram topic session key。
  - Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从 session key 派生 agentId（不传递 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 省略 session key 时派生并创建会话条目。

## 待办 / 后续
- voice-call 插件使用自定义 `voice:<phone>` session key。此处未标准化出站映射；如 message-tool 要支持 voice-call 发送，应添加显式映射。
- 确认是否有外部插件使用非标准 `From/To` 格式（超出内置集合）。

## 涉及文件
- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 测试文件：
  - `src/infra/outbound/outbound-session.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
