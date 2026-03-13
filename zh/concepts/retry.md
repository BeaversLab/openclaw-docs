---
summary: "出站提供程序调用的重试策略"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "重试策略"
---

# 重试策略

## 目标

- 针对每个 HTTP 请求进行重试，而不是针对多步骤流程。
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

### Discord

- 仅在速率限制错误（HTTP 429）时重试。
- 尽可能使用 Discord `retry_after`，否则使用指数退避。

### Telegram

- 在瞬时错误（429、超时、连接/重置/关闭、暂时不可用）时重试。
- 尽可能使用 `retry_after`，否则使用指数退避。
- Markdown 解析错误不会重试；它们会回退到纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中为每个提供程序设置重试策略：

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

- 重试适用于每个请求（消息发送、媒体上传、回应、投票、贴纸）。
- 复合流程不会重试已完成的步骤。

import zh from '/components/footer/zh.mdx';

<zh />
