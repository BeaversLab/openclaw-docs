---
summary: "出站 provider 调用的重试策略"
read_when:
  - 更新 provider 重试行为或默认值
  - 排查 provider 发送错误或限流
title: "重试策略"
---

# 重试策略（Retry policy）

## 目标
- 每个 HTTP 请求重试，而不是多步流程。
- 仅重试当前步骤以保持顺序。
- 避免重复非幂等操作。

## 默认值
- Attempts：3
- Max delay cap：30000 ms
- Jitter：0.1（10%）
- Provider 默认值：
  - Telegram 最小延迟：400 ms
  - Discord 最小延迟：500 ms

## 行为

### Discord
- 仅在限流错误（HTTP 429）时重试。
- 有 `retry_after` 时优先使用，否则指数退避。

### Telegram
- 在暂态错误时重试（429、超时、连接/重置/关闭、暂时不可用）。
- 有 `retry_after` 时优先使用，否则指数退避。
- Markdown 解析错误不重试；会回退为纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中按 provider 设置重试策略：

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

## 备注
- 重试按请求生效（消息发送、媒体上传、反应、投票、贴纸）。
- 复合流程不会重试已完成步骤。
