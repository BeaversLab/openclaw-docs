---
summary: "Together AI 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 通过统一的 API 提供对领先的开源模型的访问，包括 Llama、DeepSeek、Kimi 等。

- 提供商：`together`
- 身份验证：`TOGETHER_API_KEY`
- API：兼容 OpenAI

## 快速开始

1. 设置 API 密钥（推荐：将其存储在网关中）：

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

这会将 `together/moonshotai/Kimi-K2.5` 设置为默认模型。

## 环境注意事项

如果网关作为守护进程（launchd/systemd）运行，请确保该进程可以访问 `TOGETHER_API_KEY`
（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 可用模型

Together AI 提供对许多热门开源模型的访问：

- **GLM 4.7 Fp8** - 具有 200K 上下文窗口的默认模型
- **Llama 3.3 70B Instruct Turbo** - 快速、高效的指令遵循
- **Llama 4 Scout** - 具有图像理解能力的视觉模型
- **Llama 4 Maverick** - 高级视觉和推理
- **DeepSeek V3.1** - 强大的编码和推理模型
- **DeepSeek R1** - 高级推理模型
- **Kimi K2 Instruct** - 具有 262K 上下文窗口的高性能模型

所有模型都支持标准聊天补全，并且兼容 OpenAI API。

import zh from '/components/footer/zh.mdx';

<zh />
