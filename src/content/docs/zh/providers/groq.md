---
summary: "Groq 设置（身份验证 + 模型选择 + Whisper 转录）"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) 利用定制 LPU 硬件在开源权重模型（Llama、Gemma、Kimi、Qwen、GPT OSS 等）上提供超快推理。OpenClaw 包含一个捆绑的 Groq 插件，注册了兼容 OpenAI 的聊天提供商和音频媒体理解提供商。

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| 提供商 ID        | `groq`                             |
| 插件             | 捆绑，`enabledByDefault: true`     |
| 身份验证环境变量 | `GROQ_API_KEY`                     |
| 入门引导标志     | `--auth-choice groq-api-key`       |
| API              | 兼容 OpenAI (`openai-completions`) |
| 基础 URL         | `https://api.groq.com/openai/v1`   |
| 音频转录         | `whisper-large-v3-turbo` (默认)    |
| 建议的聊天默认值 | `groq/llama-3.3-70b-versatile`     |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在 [console.groq.com/keys](https://console.groq.com/keys) 创建 API 密钥。
  </Step>
  <Step title="设置 API 密钥">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice groq-api-key
```

```bash Env only
export GROQ_API_KEY=gsk_...
```

    </CodeGroup>

  </Step>
  <Step title="Set a default model">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
  <Step title="Verify the catalog is reachable">
    ```bash
    openclaw models list --provider groq
    ```
  </Step>
</Steps>

### 配置文件示例

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

## 内置目录

OpenClaw 附带一个基于清单的 Groq 目录，其中包含推理和非推理条目。运行 `openclaw models list --provider groq` 查看已安装版本的捆绑行，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models) 获取 Groq 的权威列表。

| 模型引用                                             | 名称                          | 推理 | 输入        | 上下文  |
| ---------------------------------------------------- | ----------------------------- | ---- | ----------- | ------- |
| `groq/llama-3.3-70b-versatile`                       | Llama 3.3 70B Versatile       | 否   | 文本        | 131,072 |
| `groq/llama-3.1-8b-instant`                          | Llama 3.1 8B Instant          | 否   | 文本        | 131,072 |
| `groq/meta-llama/llama-4-maverick-17b-128e-instruct` | Llama 4 Maverick 17B          | 否   | 文本 + 图像 | 131,072 |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct`     | Llama 4 Scout 17B             | 否   | 文本 + 图像 | 131,072 |
| `groq/llama3-70b-8192`                               | Llama 3 70B                   | 否   | 文本        | 8,192   |
| `groq/llama3-8b-8192`                                | Llama 3 8B                    | 否   | 文本        | 8,192   |
| `groq/gemma2-9b-it`                                  | Gemma 2 9B                    | 否   | 文本        | 8,192   |
| `groq/mistral-saba-24b`                              | Mistral Saba 24B              | 否   | 文本        | 32,768  |
| `groq/moonshotai/kimi-k2-instruct`                   | Kimi K2 Instruct              | 否   | 文本        | 131,072 |
| `groq/moonshotai/kimi-k2-instruct-0905`              | Kimi K2 Instruct 0905         | 否   | 文本        | 262,144 |
| `groq/openai/gpt-oss-120b`                           | GPT OSS 120B                  | 是   | 文本        | 131,072 |
| `groq/openai/gpt-oss-20b`                            | GPT OSS 20B                   | 是   | 文本        | 131,072 |
| `groq/openai/gpt-oss-safeguard-20b`                  | Safety GPT OSS 20B            | 是   | 文本        | 131,072 |
| `groq/qwen-qwq-32b`                                  | Qwen QwQ 32B                  | 是   | 文本        | 131,072 |
| `groq/qwen/qwen3-32b`                                | Qwen3 32B                     | 是   | 文本        | 131,072 |
| `groq/deepseek-r1-distill-llama-70b`                 | DeepSeek R1 Distill Llama 70B | 是   | 文本        | 131,072 |
| `groq/groq/compound`                                 | Compound                      | 是   | 文本        | 131,072 |
| `groq/groq/compound-mini`                            | Compound Mini                 | 是   | 文本        | 131,072 |

<Tip>目录随每个 OpenClaw 版本更新。`openclaw models list --provider groq` 显示您安装版本已知的行；请通过 [console.groq.com/docs/models](https://console.groq.com/docs/models) 交叉检查新增或已弃用的模型。</Tip>

## 推理模型

OpenClaw 将其共享的 `/think` 级别映射到 Groq 特定模型的 `reasoning_effort` 值：

- 对于 `qwen/qwen3-32b`，禁用思考发送 `none`，启用思考发送 `default`。
- 对于 Groq GPT OSS 推理模型（`openai/gpt-oss-*`），OpenClaw 根据 `/think` 级别发送 `low`、`medium` 或 `high`。禁用思考时会省略 `reasoning_effort`，因为这些模型不支持禁用值。
- DeepSeek R1 Distill、Qwen QwQ 和 Compound 使用 Groq 的原生推理表面；`/think` 控制可见性，但模型始终进行推理。

请参阅 [思考模式](/zh/tools/thinking) 了解共享的 `/think` 级别以及 OpenClaw 如何根据提供商进行转换。

## 音频转录

Groq 的捆绑插件还注册了一个 **audio media-understanding 提供商**，以便可以通过共享的 `tools.media.audio` 界面转录语音消息。

| 属性         | 值                                    |
| ------------ | ------------------------------------- |
| 共享配置路径 | `tools.media.audio`                   |
| 默认基础 URL | `https://api.groq.com/openai/v1`      |
| 默认模型     | `whisper-large-v3-turbo`              |
| 自动优先级   | 20                                    |
| API 端点     | OpenAI 兼容的 `/audio/transcriptions` |

要将 Groq 设置为默认音频后端：

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="守护进程的环境可用性">
    如果 Gateway(网关) 作为托管服务（launchd、systemd、Docker）运行，`GROQ_API_KEY` 对该进程必须可见——而不仅仅是对您的交互式 shell。

    <Warning>
      仅位于 `~/.profile` 中的密钥对 launchd 或 systemd 守护进程没有帮助，除非该环境也被导入到那里。在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 设置，以便网关进程可以读取它。
    </Warning>

  </Accordion>

  <Accordion title="自定义 Groq 模型 ID">
    OpenClaw 在运行时接受任何 Groq 模型 ID。使用 Groq 显示的确切 ID，并加上 `groq/` 前缀。捆绑目录涵盖了常见情况；未编目的 ID 会回退到默认的 OpenAI 兼容模板。

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/<your-model-id>" },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/zh/tools/thinking" icon="brain">
    推理努力级别和提供商策略交互。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包括提供商和音频设置的完整配置架构。
  </Card>
  <Card title="Groq 控制台" href="https://console.groq.com" icon="arrow-up-right-from-square" API>
    Groq 仪表板、API 文档和定价。
  </Card>
</CardGroup>
