---
summary: "通过 grammY 集成 Telegram Bot API（含设置说明）"
read_when:
  - 开发 Telegram 或 grammY 路径
title: grammY
---

# grammY 集成（Telegram Bot API）


# 为什么是 grammY
- TS 优先的 Bot API 客户端，内置长轮询 + webhook 辅助、中间件、错误处理、限流。
- 比手写 fetch + FormData 更干净的媒体辅助；支持全部 Bot API 方法。
- 可扩展：通过自定义 fetch 支持代理，可选会话中间件，类型安全上下文。

# 已实现内容
- **单一客户端路径：** 已移除基于 fetch 的实现；grammY 成为唯一 Telegram 客户端（发送 + gateway），默认启用 grammY throttler。
- **Gateway：** `monitorTelegramProvider` 构建 grammY `Bot`，接入提及/allowlist 门控，通过 `getFile`/`download` 下载媒体，并用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 投递回复。支持长轮询或 `webhookCallback`。
- **代理：** 可选 `channels.telegram.proxy`，通过 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支持：** `webhook-set.ts` 封装 `setWebhook/deleteWebhook`；`webhook.ts` 托管回调并提供健康检查与优雅关停。若设置了 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret`，gateway 会启用 webhook 模式（否则长轮询）。
- **会话：** 私聊合并到 agent 主会话（`agent:<agentId>:<mainKey>`）；群聊使用 `agent:<agentId>:telegram:group:<chatId>`；回复回到相同频道。
- **配置项：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups`（allowlist + 默认提及）、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿流式：** 可选 `channels.telegram.streamMode` 在私聊话题中使用 `sendMessageDraft`（Bot API 9.3+）。这与频道分块流式是不同机制。
- **测试：** grammY mocks 覆盖 DM + 群提及门控与出站发送；仍欢迎补充媒体/webhook 相关测试夹具。

未决问题
- 若遇到 Bot API 429，是否需要可选 grammY 插件（throttler）。
- 增加更结构化的媒体测试（贴纸、语音消息）。
- 使 webhook 监听端口可配置（目前固定为 8787，除非经由 gateway 接线）。
