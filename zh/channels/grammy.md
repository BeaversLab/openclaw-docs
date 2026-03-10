---
summary: "通过 grammY 集成 Telegram Bot API，包含设置说明"
read_when:
  - "Working on Telegram or grammY pathways"
title: "grammY"
---

# grammY Integration (Telegram Bot API)

# 为什么选择 grammY

- 优先支持 TypeScript 的 Bot API 客户端，内置长轮询和 webhook 辅助方法、中间件、错误处理和速率限制器。
- 比手写 fetch + FormData 更简洁的媒体辅助方法；支持所有 Bot API 方法。
- 可扩展：通过自定义 fetch 支持代理、会话中间件（可选）、类型安全的上下文。

# 我们提供的功能

- **单一客户端路径：** 基于 fetch 的实现已移除；grammY 现在是唯一的 Telegram 客户端（发送和 Gateway），默认启用 grammY 限流器。
- **Gateway：** `monitorTelegramProvider` 构建 grammY `Bot`，连接提及/白名单过滤、通过 `getFile`/`download` 下载媒体，并使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 发送回复。支持通过 `webhookCallback` 进行长轮询或 webhook。
- **代理：** 可选的 `channels.telegram.proxy` 通过 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支持：** `webhook-set.ts` 封装 `setWebhook/deleteWebhook`；`webhook.ts` 托管回调，具有健康检查和优雅关闭功能。当设置 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` 时，Gateway 启用 webhook 模式（否则使用长轮询）。
- **会话：** 直接对话折叠到代理主会话（`agent:<agentId>:<mainKey>`）；群组使用 `agent:<agentId>:telegram:group:<chatId>`；回复路由回同一频道。
- **配置选项：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups`（白名单和提及默认值）、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿流式传输：** 可选的 `channels.telegram.streamMode` 在私有主题聊天中使用 `sendMessageDraft`（Bot API 9.3+）。这与频道块流式传输是分开的。
- **测试：** grammy 模拟覆盖了私信和群组提及过滤以及出站发送；仍然欢迎更多媒体/webhook 测试用例。

待解决的问题

- 如果遇到 Bot API 429 错误，可选的 grammY 插件（限流器）。
- 添加更多结构化媒体测试（贴纸、语音笔记）。
- 使 webhook 监听端口可配置（目前固定为 8787，除非通过 Gateway 连接）。
