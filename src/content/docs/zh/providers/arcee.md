---
title: "Arcee AI"
summary: "Arcee AI 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) 通过与 OpenAI 兼容的 API 提供对 Trinity 专家混合模型系列的访问。所有 Trinity 模型均采用 Apache 2.0 许可证。

可以直接通过 Arcee 平台或通过 [OpenRouter](/en/providers/openrouter) 访问 Arcee AI 模型。

- 提供商：`arcee`
- 身份验证：`ARCEEAI_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）
- API：OpenAI 兼容
- 基础 URL：`https://api.arcee.ai/api/v1`（直接）或 `https://openrouter.ai/api/v1`（OpenRouter）

## 快速开始

1. 从 [Arcee AI](https://chat.arcee.ai/) 或 [API](https://openrouter.ai/keys) 获取 OpenRouter 密钥。

2. 设置 API 密钥（推荐：将其存储在 Gateway(网关) 中）：

```bash
# Direct (Arcee platform)
openclaw onboard --auth-choice arceeai-api-key

# Via OpenRouter
openclaw onboard --auth-choice arceeai-openrouter
```

3. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "arcee/trinity-large-thinking" },
    },
  },
}
```

## 非交互式示例

```bash
# Direct (Arcee platform)
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-api-key \
  --arceeai-api-key "$ARCEEAI_API_KEY"

# Via OpenRouter
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-openrouter \
  --openrouter-api-key "$OPENROUTER_API_KEY"
```

## 环境注意事项

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `ARCEEAI_API_KEY`
（或 `OPENROUTER_API_KEY`）对该进程可用（例如，在
`~/.openclaw/.env` 中或通过 `env.shellEnv`）。

## 内置目录

OpenClaw 目前附带此捆绑的 Arcee 目录：

| 模型参考                       | 名称                   | 输入 | 上下文 | 成本（每 1M 输入/输出） | 备注                         |
| ------------------------------ | ---------------------- | ---- | ------ | ----------------------- | ---------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | 文本 | 256K   | $0.25 / $0.90           | 默认模型；启用推理           |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | 文本 | 128K   | $0.25 / $1.00           | 通用；400B 参数，13B 激活    |
| `arcee/trinity-mini`           | Trinity Mini 26B       | 文本 | 128K   | $0.045 / $0.15          | 快速且具有成本效益；函数调用 |

相同的模型参考适用于直接和 OpenRouter 设置（例如 `arcee/trinity-large-thinking`）。

新手引导预设将 `arcee/trinity-large-thinking` 设置为默认模型。

## 支持的功能

- 流式传输
- 工具使用 / 函数调用
- 结构化输出（JSON 模式和 JSON 架构）
- 扩展思考（Trinity Large Thinking）
