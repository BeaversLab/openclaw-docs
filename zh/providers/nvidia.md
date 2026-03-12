---
summary: "在 OpenClaw 中使用 NVIDIA 兼容 OpenAI 的 API"
read_when:
  - You want to use NVIDIA models in OpenClaw
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 为 Nemotron 和 NeMo 模型提供兼容 OpenAI 的 API。使用来自 [NVIDIA NGC](https://catalog.ngc.nvidia.com/) 的 API 密钥进行身份验证。

## CLI 设置

导出密钥一次，然后运行入职流程并设置一个 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

如果你仍然传递 `--token`，请记住它会记录在 shell 历史记录和 `ps` 输出中；尽可能首选环境变量。

## 配置代码片段

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

- 兼容 OpenAI 的 `/v1` 端点；使用来自 NVIDIA NGC 的 API 密钥。
- 当设置 `NVIDIA_API_KEY` 时，提供程序会自动启用；使用静态默认值（131,072 令牌上下文窗口，最大 4,096 个令牌）。
