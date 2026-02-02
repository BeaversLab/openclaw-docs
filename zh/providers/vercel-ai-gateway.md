> [!NOTE]
> 本页正在翻译中。

---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 配置（认证 + 模型选择）"
read_when:
  - 想在 OpenClaw 中使用 Vercel AI Gateway
  - 需要 API key 环境变量或 CLI 认证选项
---
# Vercel AI Gateway

[ Vercel AI Gateway](https://vercel.com/ai-gateway) 提供统一 API，可通过单一端点访问数百个模型。

- Provider：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- API：兼容 Anthropic Messages

## 快速开始

1) 设置 API key（建议存储给 Gateway 使用）：

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2) 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.5" }
    }
  }
}
```

## 非交互示例

```bash
openclaw onboard --non-interactive   --mode local   --auth-choice ai-gateway-api-key   --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 环境说明

如果 Gateway 以守护进程运行（launchd/systemd），请确保 `AI_GATEWAY_API_KEY`
对该进程可见（例如放在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
