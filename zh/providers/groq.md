---
title: "Groq"
summary: "Groq 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) 使用自定义 LPU 硬件在开源模型（Llama、Gemma、Mistral 等）上提供超快的推理能力。OpenClaw 通过其 OpenAI 兼容的 API 连接到 Groq。

- 提供商: `groq`
- 身份验证: `GROQ_API_KEY`
- API: OpenAI-compatible

## 快速开始

1. 从 [console.groq.com/keys](https://console.groq.com/keys) 获取 API 密钥。

2. 设置 API 密钥:

```bash
export GROQ_API_KEY="gsk_..."
```

3. 设置默认模型:

```json5
{
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 配置文件示例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 音频转录

Groq 还提供基于 Whisper 的快速音频转录。当配置为媒体理解提供商时，OpenClaw 使用 Groq 的 `whisper-large-v3-turbo` 模型来转录语音消息。

```json5
{
  media: {
    understanding: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

## 环境说明

如果 Gateway(网关) 作为守护进程运行，请确保该进程可以访问 `GROQ_API_KEY`（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

## 可用模型

Groq 的模型目录经常变化。运行 `openclaw models list | grep groq` 查看当前可用的模型，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models)。

热门选择包括:

- **Llama 3.3 70B Versatile** - 通用型，大上下文
- **Llama 3.1 8B Instant** - 快速，轻量级
- **Gemma 2 9B** - 紧凑，高效
- **Mixtral 8x7B** - MoE 架构，推理能力强

## 链接

- [Groq Console](https://console.groq.com)
- [API 文档](https://console.groq.com/docs)
- [模型列表](https://console.groq.com/docs/models)
- [定价](https://groq.com/pricing)

import zh from "/components/footer/zh.mdx";

<zh />
