---
summary: "通过 grammY 集成 Telegram Bot API，包含设置说明"
read_when:
  - Working on Telegram or grammY pathways
title: grammY
---

# grammY 集成 (Telegram Bot API)

# 为什么选择 grammY

- 优先支持 TS 的 Bot API 客户端，内置长轮询 + Webhook 助手、中间件、错误处理和速率限制器。
- 比手动构建 fetch + FormData 更简洁的媒体助手；支持所有 Bot API 方法。
- 可扩展：通过自定义 fetch 支持代理、会话中间件（可选）、类型安全上下文。

# 我们交付了什么

- **单一客户端路径：** 移除了基于 fetch 的实现；grammY 现在是唯一的 Telegram 客户端（发送 + 网关），默认启用 grammY 限流器。
- **网关：** `monitorTelegramProvider` 构建 grammY `Bot`，连接提及/白名单门控，通过 `getFile`/`download` 下载媒体，并使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 传递回复。通过 `webhookCallback` 支持长轮询或 Webhook。
- **代理：** 可选的 `channels.telegram.proxy` 通过 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支持：** `webhook-set.ts` 封装 `setWebhook/deleteWebhook`；`webhook.ts` 承载具有健康检查 + 优雅关机的回调。当设置了 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` 时，网关启用 Webhook 模式（否则进行长轮询）。
- **会话：** 直接对话折叠到 Agent 主会话（`agent:<agentId>:<mainKey>`）中；群组使用 `agent:<agentId>:telegram:group:<chatId>`；回复路由回同一频道。
- **配置选项：** `channels.telegram.botToken`, `channels.telegram.dmPolicy`, `channels.telegram.groups` (allowlist + mention defaults), `channels.telegram.allowFrom`, `channels.telegram.groupAllowFrom`, `channels.telegram.groupPolicy`, `channels.telegram.mediaMaxMb`, `channels.telegram.linkPreview`, `channels.telegram.proxy`, `channels.telegram.webhookSecret`, `channels.telegram.webhookUrl`.
- **草稿流式传输：** 可选的 `channels.telegram.streamMode` 在私有主题聊天中使用 `sendMessageDraft` (Bot API 9.3+)。这不同于频道块流式传输。
- **测试：** grammy 模拟覆盖了 DM + 群组提及门控和出站发送；欢迎更多媒体/webhook 测试固件。

待解决问题

- 如果我们遇到 Bot API 429 错误，使用可选的 grammY 插件 (throttler)。
- 添加更多结构化的媒体测试（贴纸、语音笔记）。
- 使 webhook 监听端口可配置（除非通过网关连接，目前固定为 8787）。
