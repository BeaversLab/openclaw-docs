---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - "You want to use OpenAI models in OpenClaw"
  - "You want Codex subscription auth instead of API keys"
title: "OpenAI"
---

# OpenAI

OpenAI 为 GPT 模型提供开发者 API。Codex 支持 **ChatGPT 登录**以获取订阅访问权限，或 **API 密钥**登录以获取按使用量付费的访问权限。Codex cloud 需要 ChatGPT 登录。

## 选项 A：OpenAI API 密钥（OpenAI Platform）

**适用场景：**直接 API 访问和按使用量计费。
从 OpenAI 控制台获取 API 密钥。

### CLI 设置

```bash
openclaw onboard --auth-choice openai-api-key
# 或非交互模式
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置代码段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
}
```

## 选项 B：OpenAI Code (Codex) 订阅

**适用场景：**使用 ChatGPT/Codex 订阅访问权限而不是 API 密钥。
Codex cloud 需要 ChatGPT 登录，而 Codex CLI 支持 ChatGPT 或 API 密钥登录。

### CLI 设置

```bash
# 在向导中运行 Codex OAuth
openclaw onboard --auth-choice openai-codex

# 或直接运行 OAuth
openclaw models auth login --provider openai-codex
```

### 配置代码段

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } },
}
```

## 注意事项

- 模型引用始终使用 `provider/model`（参阅 [/concepts/models](/zh/concepts/models)）。
- 身份验证详细信息和重用规则位于 [/concepts/oauth](/zh/concepts/oauth)。
