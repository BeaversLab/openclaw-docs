---
title: "Together AI"
summary: "Together AI 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) 通过统一的 API 提供对领先开源模型的访问，包括 Llama、DeepSeek、Kimi 等。

| 属性     | 值                            |
| -------- | ----------------------------- |
| 提供商   | `together`                    |
| 认证     | `TOGETHER_API_KEY`            |
| API      | OpenAI-兼容                   |
| 基础 URL | `https://api.together.xyz/v1` |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 创建 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "together/moonshotai/Kimi-K2.5" },
        },
      },
    }
    ```
  </Step>
</Steps>

### 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>新手引导预设将 `together/moonshotai/Kimi-K2.5` 设置为默认 模型。</Note>

## 内置目录

OpenClaw 附带了此捆绑的 Together 目录：

| 模型引用                                                     | 名称                                   | 输入       | 上下文     | 备注                 |
| ------------------------------------------------------------ | -------------------------------------- | ---------- | ---------- | -------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | 文本、图像 | 262,144    | 默认模型；启用了推理 |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | 文本       | 202,752    | 通用文本模型         |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | 文本       | 131,072    | 快速指令模型         |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | 文本、图像 | 10,000,000 | 多模态               |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | 文本、图像 | 20,000,000 | 多模态               |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | 文本       | 131,072    | 通用文本模型         |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | 文本       | 131,072    | 推理模型             |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | 文本       | 262,144    | 备用 Kimi 文本模型   |

## 视频生成

捆绑的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成功能。

| 属性         | 值                                    |
| ------------ | ------------------------------------- |
| 默认视频模型 | `together/Wan-AI/Wan2.2-T2V-A14B`     |
| 模式         | text-to-video, single-image reference |
| 支持的参数   | `aspectRatio`, `resolution`           |

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

<Tip>请参阅[视频生成](/en/tools/video-generation)以了解共享的 工具 参数、提供商选择和故障转移行为。</Tip>

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保
    `TOGETHER_API_KEY` 对该进程可用（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对守护进程管理的
    gateway 进程不可见。使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持久可用。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 验证您的密钥是否有效：`openclaw models list --provider together`
    - 如果模型未出现，请确认 API 密钥已在您的 Gateway(网关) 进程的正确环境中设置。
    - 模型引用使用格式 `together/<model-id>`。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/en/concepts/model-providers" icon="layers">
    提供商规则、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/en/tools/video-generation" icon="video">
    共享的视频生成 工具 参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/en/gateway/configuration-reference" icon="gear">
    包括提供商设置在内的完整配置架构。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Together AI 仪表板、API 文档和定价。
  </Card>
</CardGroup>
