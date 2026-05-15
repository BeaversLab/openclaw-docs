---
summary: "APIOpenClaw使用 DeepInfra 的统一 API 在 OpenClaw 中访问最受欢迎的开源和前沿模型"
read_when:
  - You want a single API key for the top open source LLMs
  - You want to run models via DeepInfra's API in OpenClaw
title: "DeepInfra"
---

DeepInfra 提供了一个 **统一 API**，将请求路由到最受欢迎的开源和前沿模型，这些模型位于单一
端点和 API 密钥之后。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 获取 API 密钥

1. 前往 [https://deepinfra.com/](https://deepinfra.com/)
2. 登录或创建账户
3. 导航至 Dashboard / Keys 并生成一个新的 API 密钥或使用自动创建的那个

## CLI 设置

```bash
openclaw onboard --deepinfra-api-key <key>
```

或设置环境变量：

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## 配置片段

```json5
{
  env: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V3.2" },
    },
  },
}
```

## 支持的 OpenClaw 表面

捆绑的插件会注册所有符合当前
OpenClaw 提供商合同的 DeepInfra 表面：

| 表面              | 默认模型                           | OpenClaw 配置/工具                                        |
| ----------------- | ---------------------------------- | --------------------------------------------------------- |
| 聊天 / 模型提供商 | `deepseek-ai/DeepSeek-V3.2`        | `agents.defaults.model`                                   |
| 图像生成/编辑     | `black-forest-labs/FLUX-1-schnell` | `image_generate`， `agents.defaults.imageGenerationModel` |
| 媒体理解          | 用于图像的 `moonshotai/Kimi-K2.5`  | 入站图像理解                                              |
| 语音转文本        | `openai/whisper-large-v3-turbo`    | 入站音频转录                                              |
| 文本转语音        | `hexgrad/Kokoro-82M`               | `messages.tts.provider: "deepinfra"`                      |
| 视频生成          | `Pixverse/Pixverse-T2V`            | `video_generate`， `agents.defaults.videoGenerationModel` |
| 记忆嵌入          | `BAAI/bge-m3`                      | `agents.defaults.memorySearch.provider: "deepinfra"`      |

DeepInfra 还公开了重排序、分类、对象检测和其他
原生模型类型。OpenClaw 目前还没有针对这些类别的
一流提供商合同，因此此插件尚未注册它们。

## 可用模型

OpenClaw 在启动时动态发现可用的 DeepInfra 模型。使用
OpenClaw`/models deepinfra` 查看可用模型的完整列表。

[DeepInfra.com](https://deepinfra.com/) 上提供的任何模型都可以与 `deepinfra/` 前缀一起使用：

```
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/moonshotai/Kimi-K2.5
deepinfra/zai-org/GLM-5.1
...and many more
```

## 注意事项

- 模型引用为 `deepinfra/<provider>/<model>`（例如，`deepinfra/Qwen/Qwen3-Max`）。
- 默认模型：`deepinfra/deepseek-ai/DeepSeek-V3.2`
- 基础 URL：`https://api.deepinfra.com/v1/openai`
- 原生视频生成使用 `https://api.deepinfra.com/v1/inference/<model>`。

## 相关

- [模型提供商](/zh/concepts/model-providers)
- [所有提供商](/zh/providers/index)
