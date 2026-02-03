---
title: "OpenAI"
summary: "在 OpenClaw 中通过 API key 或 Codex 订阅使用 OpenAI"
read_when:
  - 想在 OpenClaw 中使用 OpenAI 模型
  - 想使用 Codex 订阅认证而非 API key
---

# OpenAI

OpenAI 提供 GPT 模型的开发者 API。Codex 支持 **ChatGPT 登录**（订阅访问）或 **API key** 登录（按量计费）。Codex 云端要求 ChatGPT 登录。

## 方案 A：OpenAI API key（OpenAI Platform）

**适用：** 直接 API 访问与按量计费。
在 OpenAI Dashboard 获取 API key。

### CLI 设置

```bash
openclaw onboard --auth-choice openai-api-key
# 或非交互式
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
}
```

## 方案 B：OpenAI Code（Codex）订阅

**适用：** 使用 ChatGPT/Codex 订阅访问而非 API key。
Codex 云端需要 ChatGPT 登录，Codex CLI 支持 ChatGPT 或 API key 登录。

### CLI 设置

```bash
# 在向导中运行 Codex OAuth
openclaw onboard --auth-choice openai-codex

# 或直接运行 OAuth
openclaw models auth login --provider openai-codex
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } },
}
```

## 说明

- 模型引用始终使用 `provider/model`（见 [/concepts/models](/zh/concepts/models)）。
- 认证细节与复用规则见 [/concepts/oauth](/zh/concepts/oauth)。
