---
summary: "模型提供商概述及示例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
sidebarTitle: "模型提供商"
---

关于 **LLM/模型提供商** 的参考（不包括 WhatsApp/Telegram 等聊天频道）。有关模型选择规则，请参阅 [Models](/zh/concepts/models)。

## 快速规则

<AccordionGroup>
  <Accordion title="模型引用和 CLI 助手">
    - 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 在设置时充当允许列表。
    - CLI 助手：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 设置提供商级别的默认值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 会按模型覆盖它们。
    - 故障转移规则、冷却探测和会话覆盖持久化：[Model failover](/zh/concepts/model-failover)。
  </Accordion>
  <Accordion title="OpenAI 提供商/运行时拆分">
    OpenAI 系列路由具有特定前缀：

    - `openai/<model>` 在 PI 中使用直接 OpenAI API 密钥提供商。
    - `openai-codex/<model>` 在 PI 中使用 Codex OAuth。
    - `openai/<model>` 加上 `agents.defaults.agentRuntime.id: "codex"` 使用原生 Codex 应用服务器 harness。

    参见 [OpenAI](/zh/providers/openai) 和 [Codex harness](/zh/plugins/codex-harness)。如果提供商/运行时拆分令人困惑，请先阅读 [Agent runtimes](/zh/concepts/agent-runtimes)。

    插件自动启用遵循相同的边界：`openai-codex/<model>` 属于 OpenAI 插件，而 Codex 插件由 `agentRuntime.id: "codex"` 或遗留 `codex/<model>` 引用启用。

    GPT-5.5 可通过 `openai/gpt-5.5` 用于直接 API 密钥流量，通过 PI 中的 `openai-codex/gpt-5.5` 用于 Codex OAuth，以及当设置 `agentRuntime.id: "codex"` 时使用的原生 Codex 应用服务器 harness。

  </Accordion>
  <Accordion title="CLI 运行时">
    CLI 运行时使用相同的拆分：选择规范的模型引用，例如 `anthropic/claude-*`、`google/gemini-*` 或 `openai/gpt-*`，然后当您需要本地 CLI 后端时，将 `agents.defaults.agentRuntime.id` 设置为 `claude-cli`、`google-gemini-cli` 或 `codex-cli`。

    遗留的 `claude-cli/*`、`google-gemini-cli/*` 和 `codex-cli/*` 引用将迁移回规范的提供商引用，并单独记录运行时。

  </Accordion>
</AccordionGroup>

## 插件拥有的提供商行为

大多数特定于提供商的逻辑位于提供商插件 (`registerProvider(...)`) 中，而 OpenClaw 保持通用推理循环。插件拥有新手引导、模型目录、auth 环境变量映射、传输/配置规范化、工具架构清理、故障转移分类、OAuth 刷新、使用情况报告、思考/推理配置文件等。

提供商 SDK 钩子和捆绑插件示例的完整列表位于 [提供商插件](/zh/plugins/sdk-provider-plugins)。需要完全自定义请求执行器的提供商属于一个独立的、更深层的扩展面。

<Note>提供商运行时 `capabilities` 是共享的运行器元数据（提供商系列、转录/工具特性、传输/缓存提示）。它不同于 [公共能力模型](/zh/plugins/architecture#public-capability-model)，后者描述插件注册的内容（文本推理、语音等）。</Note>

## API 密钥轮换

<AccordionGroup>
  <Accordion title="密钥来源和优先级">
    通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
    - `<PROVIDER>_API_KEYS`（逗号或分号列表）
    - `<PROVIDER>_API_KEY`（主密钥）
    - `<PROVIDER>_API_KEY_*`（编号列表，例如 `<PROVIDER>_API_KEY_1`）

    对于 Google 提供商，`GOOGLE_API_KEY` 也作为后备包含在内。密钥选择顺序保留优先级并对值进行去重。

  </Accordion>
  <Accordion title="何时启动轮换">
    - 仅在速率限制响应时使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 或定期的使用限制消息）。
    - 非速率限制失败立即失败；不尝试密钥轮换。
    - 当所有候选密钥都失败时，返回最后一次尝试的最终错误。
  </Accordion>
</AccordionGroup>

## 内置提供商 (pi-ai 目录)

OpenClaw 附带 pi-ai 目录。这些提供商**不需要** `models.providers` 配置；只需设置身份验证并选择一个模型。

### OpenAI

- 提供商: `openai`
- 身份验证: `OPENAI_API_KEY`
- 可选轮换: `OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（单个覆盖）
- 示例模型：`openai/gpt-5.5`，`openai/gpt-5.4-mini`
- 如果特定安装或 API 密钥的行为不同，请使用 `openclaw models list --provider openai` 验证账户/模型可用性。
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 默认传输方式为 `auto`（优先使用 WebSocket，回退至 SSE）
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 针对每个模型进行覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- OpenAI Responses WebSocket 预热默认通过 `params.openaiWsWarmup`（`true`/`false`）启用
- 可以通过 `agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- `/fast` 和 `params.fastMode` 将直接的 `openai/*` Responses 请求映射到 `service_tier=priority` 上的 `api.openai.com`
- 当您需要显式层级而非共享的 `/fast` 切换时，请使用 `params.serviceTier`
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）仅适用于发往 `api.openai.com` 的原生 OpenAI 流量，不适用于通用的 OpenAI 兼容代理
- 原生 OpenAI 路由还会保留 Responses `store`、提示缓存提示以及 OpenAI 推理兼容负载整形；代理路由则不会
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意抑制，因为实时的 OpenAI API 请求会拒绝它，且当前的 Codex 目录未暴露它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 身份验证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单个覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接面向 Anthropic 的公共请求支持共享的 `/fast` 开关和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 验证流量；OpenClaw 将其映射到 Anthropic `service_tier` (`auto` vs `standard_only`)
- 首选的 Claude CLI 配置保持模型引用的规范性，并单独选择 CLI 后端：`anthropic/claude-opus-4-7` 配合 `agents.defaults.agentRuntime.id: "claude-cli"`。传统的 `claude-cli/claude-opus-4-7` 引用为了兼容性仍然有效。

<Note>Anthropic 员工告诉我们，OpenClaw 风格的 Claude OpenClaw 使用再次被允许，因此除非 CLI 发布新政策，否则 OpenClaw 将 Claude OpenClaw 重用和 `claude -p` 使用视为对该集成的认可。CLI 设置令牌仍然作为受支持的 OpenClaw 令牌路径可用，但当可用时，OpenClaw 现在更倾向于 Claude Anthropic 重用和 `claude -p`。</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- 提供商: `openai-codex`
- 身份验证: OAuth (ChatGPT)
- PI 模型引用: `openai-codex/gpt-5.5`
- 原生 Codex 应用服务器 引用: `openai/gpt-5.5` 配合 `agents.defaults.agentRuntime.id: "codex"`
- 原生 Codex 应用服务器 文档: [Codex harness](/zh/plugins/codex-harness)
- 旧版模型引用: `codex/gpt-*`
- 插件边界: `openai-codex/*` 加载 OpenAI 插件；原生 Codex 应用服务器插件仅由 Codex 运行时或旧版 `codex/*` 引用选择。
- CLI: `openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 默认传输方式为 `auto` (WebSocket 优先，SSE 回退)
- 通过 `agents.defaults.models["openai-codex/<model>"].params.transport` 覆盖每个 PI 模型的设置 (`"sse"`, `"websocket"`, 或 `"auto"`)
- `params.serviceTier` 也会在原生 Codex Responses 请求上转发 (`chatgpt.com/backend-api`)
- 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）仅在指向 `chatgpt.com/backend-api` 的原生 Codex 流量上附加，不适用于通用的 OpenAI 兼容代理
- 与直接 `openai/*` 共享相同的 `/fast` 切换开关和 `params.fastMode` 配置；OpenClaw 会将其映射到 `service_tier=priority`
- `openai-codex/gpt-5.5` 使用 Codex 目录原生的 `contextWindow = 400000` 和默认运行时 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆盖运行时上限
- 策略说明：明确支持将 OpenAI Codex OAuth 用于 OpenClaw 等外部工具/工作流。
- 当您需要 Codex OAuth/订阅路由时，请使用 `openai-codex/gpt-5.5`；当您的 API 密钥设置和本地目录暴露公共 API 路由时，请使用 `openai/gpt-5.5`。

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他订阅式托管选项

<CardGroup cols={3}>
  <Card title="GLM models" href="/zh/providers/glm">
    Z.AI Coding Plan 或通用 API 端点。
  </Card>
  <Card title="MiniMax" href="/zh/providers/minimax">
    MiniMax Coding Plan OAuth 或 API 密钥访问。
  </Card>
  <Card title="Qwen Cloud" href="/zh/providers/qwen">
    Qwen Cloud 提供商界面以及 Alibaba DashScope 和 Coding Plan 端点映射。
  </Card>
</CardGroup>

### OpenCode

- 身份验证：`OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）
- Zen 运行时提供商：`opencode`
- Go 运行时提供商：`opencode-go`
- 模型示例：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini（API 密钥）

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退以及 `OPENCLAW_LIVE_GEMINI_KEY`（单项覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- 兼容性：使用 `google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置会被规范化为 `google/gemini-3-flash-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 动态思考。Gemini 3/3.1 省略固定的 `thinkingLevel`；Gemini 2.5 发送 `thinkingBudget: -1`。
- 直接的 Gemini 运行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧版 `cached_content`）来转发提供商原生的 `cachedContents/...` 句柄；Gemini 缓存命中显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`, `google-gemini-cli`
- 身份验证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>CLI 中的 Gemini OAuth OpenClaw 是非官方集成。有用户报告在使用第三方客户端后 Google 账户受到限制。请查看 Google 条款，如果选择继续，请使用非关键账户。</Warning>

Gemini CLI OAuth 作为捆绑的 `google` 插件的一部分提供。

<Steps>
  <Step title="安装 Gemini CLI">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="Enable plugin">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="登录">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    默认模型：`google-gemini-cli/gemini-3-flash-preview`。请**勿**将客户端 ID 或密钥粘贴到 `openclaw.json` 中。CLI 登录流程将令牌存储在网关主机上的身份验证配置文件中。

  </Step>
  <Step title="设置项目（如果需要）">
    如果登录后请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI JSON 回复从 `response` 解析；使用情况回退到 `stats`，其中 `stats.cached` 被规范化为 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供商：`zai`
- 身份验证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 别名：`z.ai/*` 和 `z-ai/*` 规范化为 `zai/*`
  - `zai-api-key` 自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 强制使用特定表面

### Vercel AI Gateway(网关)

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态回退目录包含 `kilocode/kilo/auto`；实时 `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展运行时目录。
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway(网关) 拥有，而非硬编码在 OpenClaw 中。

有关设置详细信息，请参阅 [/providers/kilocode](/zh/providers/kilocode)。

### 其他捆绑的提供商插件

| 提供商                      | ID                               | 认证环境变量                                                 | 示例模型                                        |
| --------------------------- | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| BytePlus                    | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                 |
| Cerebras                    | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                          |
| Cloudflare AI Gateway(网关) | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | —                                               |
| DeepSeek                    | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                    |
| GitHub Copilot              | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | —                                               |
| Groq                        | `groq`                           | `GROQ_API_KEY`                                               | —                                               |
| Hugging Face Inference      | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`           |
| Kilo Gateway(网关)          | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                            |
| Kimi 编程                   | `kimi`                           | `KIMI_API_KEY` 或 `KIMICODE_API_KEY`                         | `kimi/kimi-code`                                |
| MiniMax                     | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                          |
| Mistral                     | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                  |
| Moonshot                    | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                            |
| NVIDIA                      | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/llama-3.1-nemotron-70b-instruct` |
| OpenRouter                  | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                               |
| 千帆                        | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                         |
| Qwen 云                     | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                             |
| StepFun                     | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                        |
| Together                    | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`                 |
| Venice                      | `venice`                         | `VENICE_API_KEY`                                             | —                                               |
| Vercel AI Gateway(网关)     | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`   |
| 火山引擎 (Doubao)           | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`               |
| xAI                         | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4`                                    |
| Xiaomi                      | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                          |

#### 值得注意的特性

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在已验证的 `openrouter.ai` 路由上应用其应用归因标头和 Anthropic `cache_control` 标记。DeepSeek、Moonshot 和 ZAI 引用符合 OpenRouter 管理的提示缓存的缓存 TTL 条件，但不会接收 Anthropic 缓存标记。作为代理风格的 OpenAI 兼容路径，它会跳过仅限原生 OpenAI 的整形（`serviceTier`、Responses `store`、提示缓存提示、OpenAI 推理兼容）。Gemini 支持的引用仅保留代理 Gemini 思维签名清理功能。
  </Accordion>
  <Accordion title="Kilo Gateway">
    Gemini 支持的引用遵循相同的代理 Gemini 清理路径；`kilocode/kilo/auto` 和其他不支持代理推理的引用会跳过代理推理注入。
  </Accordion>
  <Accordion title="MiniMax">
    API 密钥新手引导会编写显式的纯文本 M2.7 聊天模型定义；图像理解保留在插件拥有的 `MiniMax-VL-01` 媒体提供商上。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路径。`/fast` 或 `params.fastMode: true` 会将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体。`tool_stream` 默认开启；可通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 禁用。
  </Accordion>
  <Accordion title="Cerebras">
    作为捆绑的 `cerebras` 提供商插件提供。GLM 使用 `zai-glm-4.7`；OpenAI 兼容的基础 URL 是 `https://api.cerebras.ai/v1`。
  </Accordion>
</AccordionGroup>

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`）来添加**自定义**提供商或 OpenAI/Anthropic 兼容的代理。

下面许多捆绑的提供商插件已经发布了默认目录。仅当您想要覆盖默认基础 URL、标头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

### Moonshot AI (Kimi)

Moonshot 作为捆绑的提供商插件提供。默认情况下使用内置提供商，仅在您需要覆盖基础 URL 或模型元数据时才添加显式的 `models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi 编码

Kimi 编码使用 Moonshot AI 的兼容 Anthropic 的端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

旧版 `kimi/k2p5` 作为兼容模型 ID 仍被接受。

### 火山引擎

火山引擎 提供对中国境内的豆包及其他模型的访问。

- 提供商：`volcengine` (编码：`volcengine-plan`)
- 认证：`VOLCANO_ENGINE_API_KEY`
- 示例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

新手引导 默认使用编码界面，但通用 `volcengine/*` 目录也会同时注册。

在新手引导/配置模型选择器中，火山引擎认证选项优先显示 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未筛选的目录，而不是显示空的提供商范围选择器。

<Tabs>
  <Tab title="标准模型">- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8) - `volcengine/doubao-seed-code-preview-251028` - `volcengine/kimi-k2-5-260127` (Kimi K2.5) - `volcengine/glm-4-7-251222` (GLM 4.7) - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)</Tab>
  <Tab title="编码模型 (volcengine-plan)">- `volcengine-plan/ark-code-latest` - `volcengine-plan/doubao-seed-code` - `volcengine-plan/kimi-k2.5` - `volcengine-plan/kimi-k2-thinking` - `volcengine-plan/glm-4.7`</Tab>
</Tabs>

### BytePlus (国际版)

BytePlus ARK 为国际用户提供与火山引擎相同的模型。

- 提供商：`byteplus` (编码：`byteplus-plan`)
- 认证：`BYTEPLUS_API_KEY`
- 示例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

新手引导默认指向编码界面，但通用的 `byteplus/*` 目录也会同时注册。

在“新手引导/配置模型”选择器中，BytePlus 认证选项优先显示 `byteplus/*` 和 `byteplus-plan/*` 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

<Tabs>
  <Tab title="标准模型">- `byteplus/seed-1-8-251228` (Seed 1.8) - `byteplus/kimi-k2-5-260127` (Kimi K2.5) - `byteplus/glm-4-7-251222` (GLM 4.7)</Tab>
  <Tab title="编码模型 (byteplus-plan)">- `byteplus-plan/ark-code-latest` - `byteplus-plan/doubao-seed-code` - `byteplus-plan/kimi-k2.5` - `byteplus-plan/kimi-k2-thinking` - `byteplus-plan/glm-4.7`</Tab>
</Tabs>

### Synthetic

Synthetic 在 `synthetic` 提供商后端提供 Anthropic 兼容的模型：

- 提供商：`synthetic`
- 认证：`SYNTHETIC_API_KEY`
- 示例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax 通过 `models.providers` 进行配置，因为它使用自定义端点：

- MiniMax OAuth (全球)：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (中国)：`--auth-choice minimax-cn-oauth`
- MiniMax API 密钥 (全球)：`--auth-choice minimax-global-api`
- MiniMax API 密钥 (中国)：`--auth-choice minimax-cn-api`
- Auth: `MINIMAX_API_KEY` 用于 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用于 `minimax-portal`

有关设置详细信息、模型选项和配置片段，请参阅 [/providers/minimax](/zh/providers/minimax)。

<Note>在 MiniMax 的 Anthropic 兼容流式路径上，除非您显式设置，否则 OpenClaw 默认禁用思考，并且 `/fast on` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。</Note>

插件拥有的功能拆分：

- 文本/聊天默认设置保留在 `minimax/MiniMax-M2.7` 上
- 图像生成为 `minimax/image-01` 或 `minimax-portal/image-01`
- 图像理解是 MiniMax 两种身份验证路径上的插件拥有的 `MiniMax-VL-01`
- 网络搜索保留在提供商 ID `minimax` 上

### LM Studio

LM Studio 作为捆绑的提供商插件提供，使用原生 API：

- 提供商：`lmstudio`
- 身份验证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置一个模型（替换为 `http://localhost:1234/api/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 进行发现 + 自动加载，默认使用 `/v1/chat/completions` 进行推理。有关设置和故障排除，请参阅 [/providers/lmstudio](/zh/providers/lmstudio)。

### Ollama

Ollama 作为捆绑的提供商插件提供，使用 Ollama 的原生 API：

- 提供商：`ollama`
- 身份验证：不需要（本地服务器）
- 示例模型：`ollama/llama3.3`
- 安装：[https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

当您选择加入 `OLLAMA_API_KEY` 时，会在 `http://127.0.0.1:11434` 本地检测到 Ollama，并且捆绑的提供商插件会将 Ollama 直接添加到 `openclaw onboard` 和模型选择器中。有关新手引导、云/本地模式和自定义配置，请参阅 [/providers/ollama](/zh/providers/ollama)。

### vLLM

vLLM 作为捆绑的提供商插件提供，用于本地/自托管的 OpenAI 兼容服务器：

- 提供商：`vllm`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:8000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/vllm](/zh/providers/vllm)。

### SGLang

SGLang 作为捆绑的提供商插件提供，用于快速自托管 OpenAI 兼容服务器：

- 提供商：`sglang`
- 身份验证：可选（取决于您的服务器）
- 默认基础 URL：`http://127.0.0.1:30000/v1`

要在本地选择加入自动发现（如果您的服务器不强制执行身份验证，则任何值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然后设置一个模型（替换为 `/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

有关详细信息，请参阅 [/providers/sglang](/zh/providers/sglang)。

### 本地代理（LM Studio、vLLM、LiteLLM 等）

示例（OpenAI 兼容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Default optional fields">
    对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。如果省略，OpenClaw 默认为：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建议：设置与您的代理/模型限制匹配的显式值。

  </Accordion>
  <Accordion title="代理路由整形规则">
    - 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 会强制执行 `compat.supportsDeveloperRole: false`，以避免提供商因不支持的 `developer` 角色而返回 400 错误。
    - 代理风格的 OpenAI 兼容路由也会跳过仅限原生 OpenAI 的请求整形：无 `service_tier`，无 Responses `store`，无 Completions `store`，无提示缓存提示，无 OpenAI 推理兼容负载整形，以及无隐藏的 OpenClaw 归属头。
    - 对于需要特定于供应商字段的 OpenAI 兼容 Completions 代理，请设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`）以将额外的 JSON 合并到出站请求正文中。
    - 对于 vLLM 聊天模板控制，请设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话思考级别关闭时，捆绑的 vLLM 插件会自动为 `vllm/nemotron-3-*` 发送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 对于缓慢的本地模型或远程 LAN/tailnet 主机，请设置 `models.providers.<id>.timeoutSeconds`。这会延长提供商模型的 HTTP 请求处理时间，包括连接、标头、正文流传输以及总体 guarded-fetch 中止，而不会增加整个代理运行时超时。
    - 如果 `baseUrl` 为空/省略，OpenClaw 将保持默认 OpenAI 行为（该行为解析为 `api.openai.com`）。
    - 为了安全起见，在非原生 `openai-completions` 端点上，显式的 `compat.supportsDeveloperRole: true` 仍会被覆盖。
  </Accordion>
</AccordionGroup>

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[Configuration](/zh/gateway/configuration) 获取完整配置示例。

## 相关

- [Configuration reference](/zh/gateway/config-agents#agent-defaults) — 模型配置键
- [Model failover](/zh/concepts/model-failover) — 故障转移链和重试行为
- [Models](/zh/concepts/models) — 模型配置和别名
- [Providers](/zh/providers) — 各提供商设置指南
