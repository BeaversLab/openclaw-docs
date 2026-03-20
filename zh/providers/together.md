---
title: "Together AI"
summary: "Together AI setup (auth + 模型 selection)"
read_when:
  - 您想将 Together AI 与 OpenClaw 结合使用
  - 您需要 API 密钥环境变量或 CLI 身份验证选项
---

# Together AI

[Together AI](https://together.ai) 通过统一的 API 提供对包括 Llama、DeepSeek、Kimi 等领先开源模型的访问。

- 提供商: `together`
- 身份验证: `TOGETHER_API_KEY`
- API: 与 OpenAI 兼容

## 快速开始

1. 设置 API 密钥（建议：将其存储用于 Gateway(网关)）：

```bash
openclaw onboard --auth-choice together-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

这将把 `together/moonshotai/Kimi-K2.5` 设置为默认模型。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `TOGETHER_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 可用模型

Together AI 提供对许多流行开源模型的访问：

- **GLM 4.7 Fp8** - 具有 200K 上下文窗口的默认模型
- **Llama 3.3 70B Instruct Turbo** - 快速、高效的指令遵循
- **Llama 4 Scout** - 具有图像理解功能的视觉模型
- **Llama 4 Maverick** - 高级视觉和推理
- **DeepSeek V3.1** - 强大的编码和推理模型
- **DeepSeek R1** - 高级推理模型
- **Kimi K2 Instruct** - 具有 262K 上下文窗口的高性能模型

所有模型均支持标准聊天补全，并与 OpenAI API 兼容。

import zh from "/components/footer/zh.mdx";

<zh />
