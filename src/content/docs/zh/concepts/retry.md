---
summary: "出站提供程序调用的重试策略"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "重试策略"
---

## 目标

- 针对每个 HTTP 请求进行重试，而不是针对多步骤工作流。
- 通过仅重试当前步骤来保持顺序。
- 避免重复非幂等操作。

## 默认值

- 尝试次数：3
- 最大延迟上限：30000 毫秒
- 抖动：0.1（10%）
- 提供商默认值：
  - Telegram 最小延迟：400 毫秒
  - Discord 最小延迟：500 毫秒

## 行为

### 模型提供商

- OpenClaw 允许提供商 SDK 处理正常的短期重试。
- 对于基于 Stainless 的 SDK（例如 Anthropic 和 OpenAI），可重试的响应
  (`408`、`409`、`429` 和 `5xx`) 可能包含 `retry-after-ms` 或
  `retry-after`。当该等待时间超过 60 秒时，OpenClaw 会注入
  `x-should-retry: false`，以便 SDK 立即显示错误，并且模型
  故障转移可以轮换到其他身份验证配置文件或回退模型。
- 使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>` 覆盖上限。
  将其设置为 `0`、`false`、`off`、`none` 或 `disabled`，以允许 SDK 在内部执行长
  `Retry-After` 休眠。

### Discord

- 仅对速率限制错误 (HTTP 429) 进行重试。
- 如果可用，使用 Discord `retry_after`，否则使用指数退避。

### Telegram

- 对瞬时错误进行重试（429、超时、连接/重置/关闭、暂时不可用）。
- 如果可用，使用 `retry_after`，否则使用指数退避。
- Markdown 解析错误不会重试；它们会回退到纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中为每个提供商设置重试策略：

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## 注意事项

- 重试应用于每个请求（消息发送、媒体上传、反应、投票、贴纸）。
- 复合工作流不会重试已完成的步骤。

## 相关

- [模型故障转移](/zh/concepts/model-failover)
- [命令队列](/zh/concepts/queue)
