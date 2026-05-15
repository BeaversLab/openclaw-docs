---
summary: "在 Venice 中使用 OpenClaw AI 专注隐私的模型"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

Venice AI 提供**专注隐私的 AI 推理**，支持非审查模型，并通过其匿名代理访问主要专有模型。所有推理默认都是私密的 —— 不利用您的数据进行训练，不记录日志。

## 为什么在 Venice 中选择 OpenClaw

- **私有推理**，适用于开源模型（无日志）。
- **非审查模型**，在您需要时提供。
- 当质量至关重要时，通过**匿名访问**使用专有模型（Opus/GPT/Gemini）。
- 兼容 OpenAI 的 `/v1` 端点。

## 隐私模式

Venice 提供两种隐私级别 — 理解这一点对于选择您的模型至关重要：

| 模式       | 描述                                                                                             | 模型                                                         |
| ---------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **私有**   | 完全私有。提示词/响应**永远不会被存储或记录**。临时的。                                          | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等。 |
| **匿名化** | 通过 Venice 代理并剥离元数据。底层提供商（OpenAI、Anthropic、Google、xAI）只能看到匿名化的请求。 | Claude、GPT、Gemini、Grok                                    |

<Warning>匿名模型**并不**完全私密。Venice 在转发之前会去除元数据，但底层提供商（OpenAI、Anthropic、Google、xAI）仍会处理该请求。当需要完全隐私时，请选择 **Private（私密）** 模型。</Warning>

## 功能

- **隐私优先**：可在“private”（完全私密）和“anonymized”（代理）模式之间进行选择
- **无审查模型**：访问不受内容限制的模型
- **主流模型访问**：通过 Venice 的匿名代理使用 Claude、GPT、Gemini 和 Grok
- **兼容 OpenAI 的 API**：提供标准 `/v1` 端点以便轻松集成
- **流式传输**：所有模型均支持
- **函数调用**：部分模型支持（请检查模型功能）
- **Vision**：支持具备视觉能力的模型
- **No hard rate limits**：对于极端使用情况，可能会应用公平使用限流

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
    1. 在 [venice.ai](https://venice.ai) 注册
    2. 前往 **Settings > API Keys > Create new key**
    3. 复制您的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step title="配置 OpenClaw">
    选择您偏好的设置方法：

    <Tabs>
      <Tab title="交互式（推荐）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        这将会：
        1. 提示您输入 API 密钥（或使用现有的 `VENICE_API_KEY`）
        2. 显示所有可用的 Venice 模型
        3. 允许您选择默认模型
        4. 自动配置提供商
      </Tab>
      <Tab title="环境变量">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab title="非交互式">
        ```bash
        openclaw onboard --non-interactive \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="验证设置">
    ```bash
    openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## 模型选择

设置完成后，OpenClaw 会显示所有可用的 Venice 模型。根据您的需求进行选择：

- **默认模型**：`venice/kimi-k2-5` 用于强大的私有推理以及视觉功能。
- **高性能选项**：`venice/claude-opus-4-6` 用于最强大的匿名 Venice 路径。
- **隐私**：选择“private”（私有）模型以进行完全私有的推理。
- **能力**：选择“anonymized”（匿名）模型以通过 Venice 的代理访问 Claude、GPT 和 Gemini。

随时更改您的默认模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用模型：

```bash
openclaw models list --all --provider venice
```

您也可以运行 `openclaw configure`，选择 **Model/auth**，然后选择 **Venice AI**。

<Tip>
使用下表为您的用例选择合适的模型。

| Use Case                   | Recommended Model                | Why                                  |
| -------------------------- | -------------------------------- | ------------------------------------ |
| **General chat (default)** | `kimi-k2-5`                      | 强大的私有推理加上视觉功能           |
| **Best overall quality**   | `claude-opus-4-6`Venice          | 最强大的匿名化 Venice 模型选项       |
| **Privacy + coding**       | `qwen3-coder-480b-a35b-instruct` | 具有大上下文的私有编程模型           |
| **Private vision**         | `kimi-k2-5`                      | 无需退出私有模式即可支持视觉         |
| **Fast + cheap**           | `qwen3-4b`                       | 轻量级推理模型                       |
| **Complex private tasks**  | `deepseek-v3.2`Venice            | 强大的推理能力，但不支持 Venice 工具 |
| **Uncensored**             | `venice-uncensored`              | 无内容限制                           |

</Tip>

## DeepSeek V4 重放行为

如果 Venice 提供了 DeepSeek V4 模型，例如 `venice/deepseek-v4-pro` 或
`venice/deepseek-v4-flash`，当代理（proxy）省略所需的 DeepSeek V4
`reasoning_content` 重放占位符时，OpenClaw 会在助手消息上填补该占位符。Venice 拒绝 DeepSeek 原生的顶级 `thinking` 控制，因此
OpenClaw 将该特定于提供商的重放修复与原生
DeepSeek 提供商的思考控制区分开来。

## 内置目录（共 41 个）

<AccordionGroup>
  <Accordion title="私有模型 (26) — 完全私有，无日志">
    | 模型 ID                               | 名称                                | 上下文 | 功能                   |
    | -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                           | 256k    | 默认, 推理, 视觉 |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | 推理                  |
    | `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | 通用                    |
    | `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | 通用                    |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B            | 128k    | 通用, 禁用工具    |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                | 128k    | 推理                  |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                | 128k    | 通用                    |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                   | 256k    | 编程                     |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo             | 256k    | 编程                     |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                    | 256k    | 推理, 视觉          |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                     | 256k    | 通用                    |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (视觉)             | 256k    | 视觉                     |
    | `qwen3-4b`Venice                             | Venice Small (Qwen3 4B)            | 32k     | 快速, 推理            |
    | `deepseek-v3.2`                        | DeepSeek V3.2                      | 160k    | 推理, 禁用工具  |
    | `venice-uncensored`Venice                    | Venice Uncensored (Dolphin-Mistral) | 32k     | 不受审查, 禁用工具 |
    | `mistral-31-24b`Venice                       | Venice Medium (Mistral)            | 128k    | 视觉                     |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct        | 198k    | 视觉                     |
    | `openai-gpt-oss-120b`OpenAI                  | OpenAI GPT OSS 120B               | 128k    | 通用                    |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B         | 128k    | 通用                    |
    | `olafangensan-glm-4.7-flash-heretic`GLM   | GLM 4.7 Flash Heretic              | 128k    | 推理                  |
    | `zai-org-glm-4.6`GLM                      | GLM 4.6                            | 198k    | 通用                    |
    | `zai-org-glm-4.7`GLM                      | GLM 4.7                            | 198k    | 推理                  |
    | `zai-org-glm-4.7-flash`GLM                | GLM 4.7 Flash                      | 128k    | 推理                  |
    | `zai-org-glm-5`GLM                        | GLM 5                              | 198k    | 推理                  |
    | `minimax-m21`MiniMax                          | MiniMax M2.1                       | 198k    | 推理                  |
    | `minimax-m25`MiniMax                          | MiniMax M2.5                       | 198k    | 推理                  |
  </Accordion>

  <Accordion title="Venice匿名模型 (15) — 通过 Venice 代理">
    | 模型 ID                        | 名称                           | 上下文 | 功能                  |
    | ------------------------------- | ------------------------------ | ------- | ------------------------- |
    | `claude-opus-4-6`Venice               | Claude Opus 4.6 (通过 Venice)   | 1M      | 推理，视觉         |
    | `claude-opus-4-5`Venice               | Claude Opus 4.5 (通过 Venice)   | 198k    | 推理，视觉         |
    | `claude-sonnet-4-6`Venice             | Claude Sonnet 4.6 (通过 Venice) | 1M      | 推理，视觉         |
    | `claude-sonnet-4-5`Venice             | Claude Sonnet 4.5 (通过 Venice) | 198k    | 推理，视觉         |
    | `openai-gpt-54`Venice                 | GPT-5.4 (通过 Venice)           | 1M      | 推理，视觉         |
    | `openai-gpt-53-codex`Venice           | GPT-5.3 Codex (通过 Venice)     | 400k    | 推理，视觉，编码 |
    | `openai-gpt-52`Venice                 | GPT-5.2 (通过 Venice)           | 256k    | 推理                 |
    | `openai-gpt-52-codex`Venice           | GPT-5.2 Codex (通过 Venice)     | 256k    | 推理，视觉，编码 |
    | `openai-gpt-4o-2024-11-20`Venice      | GPT-4o (通过 Venice)            | 128k    | 视觉                    |
    | `openai-gpt-4o-mini-2024-07-18`Venice | GPT-4o Mini (通过 Venice)       | 128k    | 视觉                    |
    | `gemini-3-1-pro-preview`Venice        | Gemini 3.1 Pro (通过 Venice)    | 1M      | 推理，视觉         |
    | `gemini-3-pro-preview`Venice          | Gemini 3 Pro (通过 Venice)      | 198k    | 推理，视觉         |
    | `gemini-3-flash-preview`Venice        | Gemini 3 Flash (通过 Venice)    | 256k    | 推理，视觉         |
    | `grok-41-fast`Venice                  | Grok 4.1 Fast (通过 Venice)     | 1M      | 推理，视觉         |
    | `grok-code-fast-1`Venice              | Grok Code Fast 1 (通过 Venice)  | 256k    | 推理，编码         |
  </Accordion>
</AccordionGroup>

## 模型发现

OpenClaw 附带一个基于清单的 Venice 种子目录，用于只读模型列表。运行时刷新仍然可以从 Venice API 发现模型，如果无法访问 API，则会回退到清单目录。

`/models` 端点是公开的（列取不需要身份验证），但推理需要有效的 API 密钥。

## 流式传输和工具支持

| 功能          | 支持                                                    |
| ------------- | ------------------------------------------------------- |
| **流式传输**  | 所有模型                                                |
| **函数调用**  | 大多数模型（请检查 API 中的 `supportsFunctionCalling`） |
| **视觉/图像** | 标有“Vision”功能的模型                                  |
| **JSON 模式** | 通过 `response_format` 支持                             |

## 定价

Venice 采用基于积分的系统。查看 [venice.ai/pricing](Venicehttps://venice.ai/pricing) 了解当前费率：

- **私密模型**：通常成本较低
- **匿名模型**：类似于直接 API 定价 + 少量 Venice 费用

### Venice (匿名) 与直接 API 对比

| 方面     | Venice (匿名)        | 直接 API     |
| -------- | -------------------- | ------------ |
| **隐私** | 元数据已剥离，匿名化 | 关联您的账户 |
| **延迟** | +10-50ms (代理)      | 直接         |
| **功能** | 支持大部分功能       | 功能完整     |
| **计费** | Venice 积分          | 提供商计费   |

## 使用示例

```bash
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## 故障排除

<AccordionGroup>
  <Accordion title="API无法识别 API 密钥">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    确保密钥以 `vapi_` 开头。

  </Accordion>

<Accordion title="模型不可用" Venice>
  Venice 模型目录会动态更新。运行 `openclaw models list` 以查看当前可用的模型。某些模型可能暂时离线。
</Accordion>

  <Accordion title="连接问题"VeniceAPI>
    Venice API 位于 `https://api.venice.ai/api/v1`。请确保您的网络允许 HTTPS 连接。
  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置文件示例">
    ```json5
    {
      env: { VENICE_API_KEY: "vapi_..." },
      agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
      models: {
        mode: "merge",
        providers: {
          venice: {
            baseUrl: "https://api.venice.ai/api/v1",
            apiKey: "${VENICE_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2-5",
                name: "Kimi K2.5",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="VeniceVenice AI" href="https://venice.ai" icon="globe" Venice>
    Venice AI 主页和账户注册。
  </Card>
  <Card title="APIAPI 文档" href="https://docs.venice.ai" icon="book" VeniceAPI>
    Venice API 参考和开发者文档。
  </Card>
  <Card title="定价" href="https://venice.ai/pricing" icon="credit-card" Venice>
    当前的 Venice 积分费率和计划。
  </Card>
</CardGroup>
