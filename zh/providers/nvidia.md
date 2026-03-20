---
summary: "在 OpenAI 中使用 NVIDIA 与 API 兼容的 OpenClaw"
read_when:
  - 您想在 OpenClaw 中使用 NVIDIA 模型
  - 您需要设置 NVIDIA_API_KEY
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了与 OpenAI 兼容的 API，用于 Nemotron 和 NeMo 模型。请使用来自 [NVIDIA NGC](https://catalog.ngc.nvidia.com/) 的 API 密钥进行身份验证。

## CLI 设置

导出密钥一次，然后运行 新手引导 并设置一个 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

如果您仍然传递 `--token`，请记住它会保存在 shell 历史记录和 `ps` 输出中；尽可能使用环境变量。

## 配置片段

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/llama-3.1-nemotron-70b-instruct" },
    },
  },
}
```

## 模型 ID

- `nvidia/llama-3.1-nemotron-70b-instruct` (默认)
- `meta/llama-3.3-70b-instruct`
- `nvidia/mistral-nemo-minitron-8b-8k-instruct`

## 注意事项

- 与 OpenAI 兼容的 API 端点 `/v1`；使用来自 NVIDIA NGC 的 API 密钥。
- 当设置了 `NVIDIA_API_KEY` 时，提供程序会自动启用；使用静态默认值（131,072 令牌上下文窗口，4,096 最大令牌数）。

import zh from "/components/footer/zh.mdx";

<zh />
