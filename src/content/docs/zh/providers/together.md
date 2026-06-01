---
summary: "Together AI 设置（身份验证 + 模型选择）"
title: "Together AI"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Together AI](https://together.ai) 通过统一的 API 提供对领先的开源模型（包括 Llama、DeepSeek、Kimi 等）的访问。

| 属性     | 值                            |
| -------- | ----------------------------- |
| 提供商   | `together`                    |
| 身份验证 | `TOGETHER_API_KEY`            |
| API      | 与 OpenAI 兼容                |
| 基础 URL | `https://api.together.xyz/v1` |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys) 创建一个 API 密钥。
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
          model: {
            primary: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
          },
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

<Note>新手引导预设会将 `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` 设置为默认模型。</Note>

## 内置目录

OpenClaw 附带了此捆绑的 Together 目录：

| 模型引用                                           | 名称                         | 输入       | 上下文  | 备注          |
| -------------------------------------------------- | ---------------------------- | ---------- | ------- | ------------- |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B Instruct Turbo | 文本       | 131,072 | 默认模型      |
| `together/moonshotai/Kimi-K2.6`                    | Kimi K2.6 FP4                | 文本, 图像 | 262,144 | Kimi 推理模型 |
| `together/deepseek-ai/DeepSeek-V4-Pro`             | DeepSeek V4 Pro              | 文本       | 512,000 | 推理文本模型  |
| `together/Qwen/Qwen2.5-7B-Instruct-Turbo`          | Qwen2.5 7B Instruct Turbo    | 文本       | 32,768  | 快速文本模型  |
| `together/zai-org/GLM-5.1`                         | GLM 5.1 FP4                  | 文本       | 202,752 | 推理文本模型  |

## 视频生成

内置的 `together` 插件还通过共享的 `video_generate` 工具注册了视频生成功能。

| 属性         | 值                                                              |
| ------------ | --------------------------------------------------------------- |
| 默认视频模型 | `together/Wan-AI/Wan2.2-T2V-A14B`                               |
| 模式         | text-to-video; 仅当使用 `Wan-AI/Wan2.2-I2V-A14B` 时支持单图参考 |
| 支持的参数   | `aspectRatio`, `resolution`                                     |

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

<Tip>请参阅 [视频生成](/zh/tools/video-generation) 了解共享工具参数、 提供商选择和故障转移行为。</Tip>

<AccordionGroup>
  <Accordion title="环境说明"Gateway(网关)>
    如果Gateway(网关)作为守护进程（launchd/systemd）运行，请确保
    `TOGETHER_API_KEY` 对该进程可用（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 Shell 中设置的密钥对于守护进程管理的
    网关进程是不可见的。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持久可用。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 验证您的密钥是否有效：`openclaw models list --provider together`APIGateway(网关)
    - 如果模型未显示，请确认 API 密钥已在您的 Gateway(网关) 进程的正确
      环境中设置。
    - 模型引用使用格式 `together/<model-id>`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    提供商规则、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频生成工具参数和提供商选择。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包括提供商设置的完整配置架构。
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square" API>
    Together AI 仪表板、API 文档和定价。
  </Card>
</CardGroup>
