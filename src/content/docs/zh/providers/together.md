---
title: "Together AI"
summary: "Together AI 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 通过统一的 API 提供对领先的开源模型的访问，包括 Llama、DeepSeek、Kimi 等。

- 提供商: `together`
- 身份验证: `TOGETHER_API_KEY`
- API： 与 OpenAI 兼容
- 基础 URL: `https://api.together.xyz/v1`

## 快速开始

1. 设置 API 密钥（推荐：将其存储在 Gateway(网关) 中）：

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

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `TOGETHER_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。

## 内置目录

OpenClaw 目前随附此捆绑的 Together 目录：

| 模型参考                                                     | 名称                                   | 输入       | 上下文     | 备注                 |
| ------------------------------------------------------------ | -------------------------------------- | ---------- | ---------- | -------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | 文本, 图像 | 262,144    | 默认模型；已启用推理 |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | 文本       | 202,752    | 通用文本模型         |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | 文本       | 131,072    | 快速指令模型         |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | 文本, 图像 | 10,000,000 | 多模态               |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | 文本, 图像 | 20,000,000 | 多模态               |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | 文本       | 131,072    | 通用文本模型         |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | 文本       | 131,072    | 推理模型             |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | 文本       | 262,144    | 辅助 Kimi 文本模型   |

新手引导预设将 `together/moonshotai/Kimi-K2.5` 设置为默认模型。

## 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型: `together/Wan-AI/Wan2.2-T2V-A14B`
- 模式：文本生成视频和单图参考流程
- 支持 `aspectRatio` 和 `resolution`

要将 Together 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

关于共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/en/tools/video-generation)。
