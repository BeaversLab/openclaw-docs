---
summary: "在 OpenClaw 中使用 NVIDIA 兼容 OpenAI 的 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供与 OpenAI 兼容的 API，免费提供开放模型。使用来自 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。

## CLI 设置

导出密钥一次，然后运行入职流程并设置一个 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
```

如果您仍然传递 `--token`，请记住它会保存在 Shell 历史记录和 `ps` 输出中；尽可能使用环境变量。

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
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 模型 ID

| 模型参考                                   | 名称                         | 上下文  | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192    |

## 注意

- 与 OpenAI 兼容的 `/v1` 端点；使用来自 [build.nvidia.com](https://build.nvidia.com/) 的 API 密钥。
- 设置 `NVIDIA_API_KEY` 后，提供商将自动启用。
- 捆绑的目录是静态的；源中的成本默认为 `0`。
