---
title: "模型提供商快速入门"
summary: "OpenClaw 支持的模型提供商（LLM）"
read_when:
  - 想选择模型提供商
  - 需要快速的 LLM 认证 + 模型选择示例
---

# 模型提供商

OpenClaw 可使用多种 LLM 提供商。选择一个、完成认证，然后将默认模型设置为 `provider/model`。

## 亮点：Venice（Venice AI）

Venice 是我们推荐的 Venice AI 配置，主打隐私优先推理，并可选用 Opus 处理最难任务。

- 默认：`venice/llama-3.3-70b`
- 综合最佳：`venice/claude-opus-45`（Opus 仍然最强）

参见 [Venice AI](/zh/providers/venice)。

## 快速开始（两步）

1. 认证 provider（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
}
```

## 支持的 provider（入门集合）

- [OpenAI (API + Codex)](/zh/providers/openai)
- [Anthropic (API + Claude Code CLI)](/zh/providers/anthropic)
- [OpenRouter](/zh/providers/openrouter)
- [Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [Synthetic](/zh/providers/synthetic)
- [OpenCode Zen](/zh/providers/opencode)
- [Z.AI](/zh/providers/zai)
- [GLM models](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Venice (Venice AI)](/zh/providers/venice)
- [Amazon Bedrock](/zh/bedrock)

完整 provider 目录（xAI、Groq、Mistral 等）与高级配置，参见 [模型 providers](/zh/concepts/model-providers)。
