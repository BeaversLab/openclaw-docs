---
summary: "模型提供商概述及示例配置 + CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型提供商"
sidebarTitle: "模型提供商"
---

**LLMWhatsApp/模型提供商**参考资料（不包括 WhatsApp/Telegram 等聊天渠道）。有关模型选择规则，请参阅 [模型](/zh/concepts/models)。

## 快速规则

<AccordionGroup>
  <Accordion title="模型引用和 CLI 辅助工具">
    - 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 设置时充当允许列表。
    - CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 设置提供商级别的默认值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 会按模型覆盖它们。
    - 故障转移规则、冷却探测和会话覆盖持久性：[模型故障转移](/zh/concepts/model-failover)。

  </Accordion>
  <Accordion title="添加提供商身份验证不会更改您的主要模型">
    `openclaw configure` 会在您添加或重新验证提供商时保留现有的 `agents.defaults.model.primary`。`openclaw models auth login` 的行为相同，除非您传递了 `--set-default`OpenClaw。提供商插件仍可能在其身份验证配置补丁中返回推荐的默认模型，但当主要模型已存在时，OpenClaw 会将其视为“使该模型可用”，而不是“替换当前的主要模型”。

    若要有意切换默认模型，请使用 `openclaw models set <provider/model>` 或 `openclaw models auth login --provider <id> --set-default`。

  </Accordion>
  <Accordion title="OpenAIOpenAI 提供商/运行时拆分"OpenAI>
    OpenAI 系列路由是特定于前缀的：

    - `openai/<model>` 默认使用原生 Codex 应用服务器线束来处理 Agent 轮次。这是通常的 ChatGPT/Codex 订阅设置。
    - 旧版 Codex 模型引用是旧版配置，doctor 会将其重写为 `openai/<model>`。
    - `openai/<model>` 加上 提供商/模型 `agentRuntime.id: "openclaw"`OpenClawAPIOpenAI 会使用 OpenClaw 的内置运行时来处理显式 API 密钥或兼容路由。

    请参阅 [OpenAI](/zh/providers/openai) 和 [Codex 线束](/zh/plugins/codex-harness)。如果 提供商/运行时 拆分令人困惑，请先阅读 [Agent 运行时](/zh/concepts/agent-runtimes)。

    插件自动启用遵循相同的边界：`openai/*` Agent 引用会为默认路由启用 Codex 插件，而显式 提供商/模型 `agentRuntime.id: "codex"` 或旧版 `codex/<model>` 引用也要求启用它。

    GPT-5.5 在 `openai/gpt-5.5`OpenClaw 上默认通过原生 Codex 应用服务器线束提供，并且当 提供商/模型 运行时策略显式选择 `openclaw` 时，通过 OpenClaw 运行时提供。

  </Accordion>
  <Accordion title="CLICLI 运行时"CLI>
    CLI 运行时使用相同的拆分：选择规范模型引用（如 `anthropic/claude-*` 或 `google/gemini-*`），然后当您需要本地 CLI 后端时，将提供商/模型运行时策略设置为 `claude-cli` 或 `google-gemini-cli`CLI。

    旧版 `claude-cli/*` 和 `google-gemini-cli/*` 引用会迁移回规范提供商引用，并单独记录运行时。旧版 `codex-cli/*` 引用会迁移到 `openai/*`OpenClawCLI 并使用 Codex 应用服务器路由；OpenClaw 不再保留打包的 Codex CLI 后端。

  </Accordion>
</AccordionGroup>

## 插件拥有的提供商行为

大多数特定于提供商的逻辑位于提供商插件 (`registerProvider(...)`OpenClawOAuth) 中，而 OpenClaw 保留通用推理循环。插件拥有新手引导、模型目录、auth 环境变量映射、传输/配置规范化、工具模式清理、故障转移分类、OAuth 刷新、使用情况报告、思考/推理配置文件等功能。

提供商 SDK 挂钩和打包插件的完整示例列表位于 [Provider plugins](/zh/plugins/sdk-provider-plugins) 中。需要完全自定义请求执行器的提供商是一个单独的、更深层的扩展表面。

<Note>提供商拥有的运行器行为位于显式提供商挂钩上，例如重放策略、工具模式规范化、流式包装以及传输/请求辅助程序。旧版 `ProviderPlugin.capabilities` 静态包仅用于兼容性，共享运行器逻辑不再读取它。</Note>

## API 密钥轮换

<AccordionGroup>
  <Accordion title="密钥来源和优先级">
    通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (单个实时覆盖，优先级最高)
    - `<PROVIDER>_API_KEYS` (逗号或分号分隔列表)
    - `<PROVIDER>_API_KEY` (主密钥)
    - `<PROVIDER>_API_KEY_*` (编号列表，例如 `<PROVIDER>_API_KEY_1`)

    对于 Google 提供商，`GOOGLE_API_KEY` 也会作为后备包含在内。密钥选择顺序会保留优先级并去除重复值。

  </Accordion>
  <Accordion title="何时触发轮换">
    - 仅在收到速率限制响应时，才会使用下一个密钥重试请求 (例如 `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` 或定期的使用限制消息)。
    - 非速率限制导致的故障会立即失败；不会尝试密钥轮换。
    - 当所有候选密钥均失败时，返回最后一次尝试的最终错误。

  </Accordion>
</AccordionGroup>

## 官方提供商插件

官方提供商插件会发布其自己的模型目录行。这些提供商**不**需要 `models.providers` 模型条目；启用提供商插件，设置身份验证，然后选择一个模型。仅针对显式的自定义提供商或特定的请求设置（例如超时）才使用 `models.providers`。

### OpenAI

- 提供商：`openai`
- 身份验证：`OPENAI_API_KEY`
- 可选轮换：`OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY` (单个覆盖)
- 示例模型：`openai/gpt-5.5`, `openai/gpt-5.4-mini`
- 如果特定安装或 API 密钥的行为有所不同，请使用 `openclaw models list --provider openai`API 验证帐户/模型可用性。
- CLI：CLI`openclaw onboard --auth-choice openai-api-key`
- 默认传输为 `auto`OpenClaw；OpenClaw 会将传输选择传递给共享模型运行时。
- 通过 `agents.defaults.models["openai/<model>"].params.transport` 为每个模型进行覆盖（`"sse"`、`"websocket"` 或 `"auto"`）
- 可以通过 OpenAI`agents.defaults.models["openai/<model>"].params.serviceTier` 启用 OpenAI 优先处理
- `/fast` 和 `params.fastMode` 将对 `openai/*` Responses 的直接请求映射到 `service_tier=priority` 上的 `api.openai.com`
- 当您需要明确的层级而不是共享的 `/fast` 切换时，请使用 `params.serviceTier`
- 隐藏的 OpenClaw 归因标头（OpenClaw`originator`、`version`、`User-Agent`OpenAI）仅适用于对 `api.openai.com`OpenAI 的原生 OpenAI 流量，而不适用于通用的 OpenAI 兼容代理
- 原生 OpenAI 路由还会保留 Responses OpenAI`store`OpenAI、提示缓存提示以及 OpenAI 推理兼容负载调整；代理路由则不会
- `openai/gpt-5.3-codex-spark`OpenClawOpenAIAPI 在 OpenClaw 中被有意抑制，因为实时的 OpenAI API 请求会拒绝它，且当前的 Codex 目录未暴露它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- 提供商：`anthropic`
- 认证：`ANTHROPIC_API_KEY`
- 可选轮换：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，加上 `OPENCLAW_LIVE_ANTHROPIC_KEY`（单次覆盖）
- 示例模型：`anthropic/claude-opus-4-6`
- CLI：CLI`openclaw onboard --auth-choice apiKey`
- 直接公开的 Anthropic 请求支持共享 `/fast` 切换和 `params.fastMode`，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 认证流量；OpenClaw 将其映射到 Anthropic `service_tier`（`auto` vs `standard_only`）
- 首选的 Claude CLI 配置保持模型引用的规范，并单独选择 CLI 后端：`anthropic/claude-opus-4-8` 配合模型范围的 `agentRuntime.id: "claude-cli"`。传统的 `claude-cli/claude-opus-4-7` 引用为了兼容性仍然有效。

<Note>Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 OpenClaw 发布新政策，否则 CLI 将 Claude Anthropic 重用和 `claude -p` 使用视为对此集成的认可。Anthropic setup-token 仍作为支持的 OpenClaw 令牌路径提供，但如果可用，OpenClaw 现在更倾向于 Claude CLI 重用和 `claude -p`。</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI ChatGPT/Codex OAuth

- Provider: `openai`
- 身份验证: OAuth (ChatGPT)
- 传统 OpenAI Codex 模型引用：`openai/gpt-5.5`
- 原生 Codex app-server harness 引用：`openai/gpt-5.5`
- 原生 Codex app-server harness 文档：[Codex harness](/zh/plugins/codex-harness)
- 传统模型引用：`codex/gpt-*`
- 插件边界：`openai/*` 加载 OpenAI 插件；原生 Codex app-server 插件由 Codex harness 运行时选择。
- CLI：`openclaw onboard --auth-choice openai` 或 `openclaw models auth login --provider openai`
- 默认传输为 `auto`（优先 WebSocket，SSE 回退）
- 通过 OpenAI`agents.defaults.models["openai/<model>"].params.transport` 逐个覆盖 OpenAI Codex 模型（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也会在本机 Codex Responses 请求（`chatgpt.com/backend-api`）上被转发
- 隐藏的 OpenClaw 归属标头（OpenClaw`originator`、`version`、`User-Agent`）仅附加到发往 `chatgpt.com/backend-api`OpenAI 的本机 Codex 流量上，而非通用的 OpenAI 兼容代理
- 共享与直接 `openai/*`OpenClaw 相同的 `/fast` 开关和 `params.fastMode` 配置；OpenClaw 将其映射到 `service_tier=priority`
- `openai/gpt-5.5` 使用 Codex 目录本机 `contextWindow = 400000` 和默认运行时 `contextTokens = 272000`；使用 `models.providers.openai.models[].contextTokens` 覆盖运行时上限
- 策略说明：明确支持将 OpenAI Codex OAuth 用于 OpenClaw 等外部工具/工作流。
- 对于常见的订阅加本机 Codex 运行时路由，请使用 `openai` 身份验证登录并配置 `openai/gpt-5.5`OpenAI；OpenAI 代理默认开启选择 Codex。
- 仅当您需要内置的 OpenClaw 路由时才使用提供商/模型 `agentRuntime.id: "openclaw"`OpenClaw；否则请在默认 Codex 驱动上保持 `openai/gpt-5.5`。
- 旧版 Codex GPT 引用属于旧版状态，而非实时的提供商路由。对于新的代理配置，请在本机 Codex 运行时上使用 `openai/gpt-5.5`，并运行 `openclaw doctor --fix` 将旧的旧版 Codex 模型引用迁移到规范的 `openai/*` 引用。

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
    },
  },
}
```

```json5
{
  models: {
    providers: {
      openai: {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他订阅式托管选项

<CardGroup cols={3}>
  <Card title="GLMZ.AI (GLM)" href="/zh/providers/zai" API>
    Z.AI 编码计划或通用 API 端点。
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
- 示例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.6`
- CLI：CLI`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 密钥)

- 提供商：`google`
- 身份验证：`GEMINI_API_KEY`
- 可选轮换：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 回退以及 `OPENCLAW_LIVE_GEMINI_KEY`（单项覆盖）
- 示例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 兼容性：使用 OpenClaw`google/gemini-3.1-flash-preview` 的旧版 OpenClaw 配置被标准化为 `google/gemini-3-flash-preview`
- 别名：`google/gemini-3.1-pro`API 被接受并标准化为 Google 的实时 Gemini API ID，`google/gemini-3.1-pro-preview`
- CLI：CLI`openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 动态思考。Gemini 3/3.1 省略了固定的 `thinkingLevel`；Gemini 2.5 发送 `thinkingBudget: -1`。
- 直接的 Gemini 运行也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或旧版 `cached_content`）以转发提供商原生的 `cachedContents/...`OpenClaw 句柄；Gemini 缓存命中显示为 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供商：`google-vertex`、`google-gemini-cli`
- 身份验证：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>OpenClaw 中的 Gemini CLI OAuth 是非官方集成。部分用户报告在使用第三方客户端后 Google 账户受到限制。请查看 Google 条款，如果您选择继续，请使用非关键账户。</Warning>

Gemini CLI OAuth 作为捆绑的 CLIOAuth`google` 插件的一部分提供。

<Steps>
  <Step title="CLI安装 Gemini CLI">
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

    默认模型：`google-gemini-cli/gemini-3-flash-preview`。您**不**会将客户端 ID 或密钥粘贴到 `openclaw.json`CLI 中。CLI 登录流程将令牌存储在网关主机的身份验证配置文件中。

  </Step>
  <Step title="设置项目（如果需要）">
    如果登录后请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI JSON 回复从 CLI`response` 解析；使用情况回退到 `stats`，其中 `stats.cached`OpenClaw 被标准化为 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供商：`zai`
- 认证：`ZAI_API_KEY`
- 示例模型：`zai/glm-5.1`
- CLI：CLI`openclaw onboard --auth-choice zai-api-key`
  - 模型引用使用规范的 `zai/*` 提供商 ID。
  - `zai-api-key` 会自动检测匹配的 Z.AI 端点；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 会强制使用特定的界面

### Vercel AI Gateway(网关)

- 提供商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- 示例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：CLI`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway(网关)

- 提供商：`kilocode`
- 认证：`KILOCODE_API_KEY`
- 示例模型：`kilocode/kilo/auto`
- CLI：CLI`openclaw onboard --auth-choice kilocode-api-key`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 静态回退目录包含 `kilocode/kilo/auto`；实时的 `https://api.kilo.ai/api/gateway/models` 发现可以进一步扩展运行时目录。
- `kilocode/kilo/auto`Gateway(网关)OpenClaw 背后的精确上游路由由 Kilo Gateway（网关）拥有，而非在 OpenClaw 中硬编码。

有关设置详细信息，请参阅 [/providers/kilocode](/zh/providers/kilocode)。

### 其他捆绑的提供商插件

| 提供商                                  | ID                               | 认证环境变量                                                 | 示例模型                                                   |
| --------------------------------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| BytePlus                                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                            |
| Cerebras                                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                                     |
| Cloudflare AI Gateway(网关)             | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                                          |
| DeepInfra                               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V4-Flash`                  |
| DeepSeek                                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                               |
| GitHub Copilot                          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                                          |
| GMI Cloud                               | `gmi`                            | `GMI_API_KEY`                                                | `gmi/google/gemini-3.1-flash-lite`                         |
| Groq                                    | `groq`                           | `GROQ_API_KEY`                                               | -                                                          |
| Hugging Face 推理                       | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`                      |
| Kilo Gateway(网关)                      | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                                       |
| Kimi 编程                               | `kimi`                           | `KIMI_API_KEY` 或 `KIMICODE_API_KEY`                         | `kimi/kimi-for-coding`                                     |
| MiniMax                                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M3`                                       |
| Mistral                                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                             |
| Moonshot                                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                                       |
| NVIDIA                                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`                 |
| NovitaAI                                | `novita`                         | `NOVITA_API_KEY`                                             | `novita/deepseek/deepseek-v3-0324`                         |
| [Ollama 云](/zh/providers/ollama-cloud) | `ollama-cloud`                   | `OLLAMA_API_KEY`                                             | `ollama-cloud/kimi-k2.6`                                   |
| OpenRouter                              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                                          |
| Qianfan                                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                                    |
| Qwen 云                                 | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                                        |
| [Qwen OAuth](/zh/providers/qwen-oauth)  | `qwen-oauth`                     | `QWEN_API_KEY`                                               | `qwen-oauth/qwen3.5-plus`                                  |
| StepFun                                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                                   |
| Together                                | `together`                       | `TOGETHER_API_KEY`                                           | `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`         |
| Venice                                  | `venice`                         | `VENICE_API_KEY`                                             | -                                                          |
| Vercel AI Gateway(网关)                 | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`              |
| 火山引擎（Doubao）                      | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`                          |
| xAI                                     | `xai`                            | SuperGrok/X 高级版 OAuth 或 `XAI_API_KEY`                    | `xai/grok-4.3`                                             |
| Xiaomi                                  | `xiaomi` / `xiaomi-token-plan`   | `XIAOMI_API_KEY` / `XIAOMI_TOKEN_PLAN_API_KEY`               | `xiaomi/mimo-v2-flash` / `xiaomi-token-plan/mimo-v2.5-pro` |

#### 值得注意的特殊之处

<AccordionGroup>
  <Accordion title="OpenRouter">
    仅在已验证的 `openrouter.ai` 路由上应用其应用归因标头和 Anthropic `cache_control` 标记。DeepSeek、Moonshot 和 ZAI 引用具有 OpenRouter 托管提示缓存的缓存 TTL 资格，但不接收 Anthropic 缓存标记。作为代理风格的 OpenAI 兼容路径，它会跳过仅限原生 OpenAI 的整形（`serviceTier`，Responses `store`，提示缓存提示，OpenAI 推理兼容）。由 Gemini 支持的引用仅保留代理 Gemini 的思维签名清理功能。
  </Accordion>
  <Accordion title="Kilo Gateway(网关)">
    基于 Gemini 的引用遵循相同的代理 Gemini 清理路径；`kilocode/kilo/auto` 和其他不支持代理推理的引用将跳过代理推理注入。
  </Accordion>
  <Accordion title="MiniMaxMiniMax"API>
    API 密钥新手引导会写入明确的 M3 和 M2.7 聊天模型定义；图像理解仍保留在插件所有的 `MiniMax-VL-01` 媒体提供商上。
  </Accordion>
  <Accordion title="NVIDIA">
    模型 ID 使用 `nvidia/<vendor>/<model>` 命名空间（例如 `nvidia/nvidia/nemotron-...` 与 `nvidia/moonshotai/kimi-k2.5` 并存）；选择器保留字面意义的 `<provider>/<model-id>` 组合，而发送到 API 的规范键保持单前缀。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路径。推荐路径是 SuperGrok/X Premium OAuth；API 密钥仍然可以通过 `XAI_API_KEY` 或插件配置工作，并且 Grok `web_search` 在 API 密钥回退之前重用相同的身份验证配置文件。`grok-4.3` 是捆绑的默认聊天模型，而 `grok-build-0.1` 可选择用于构建/编码 focused 工作。`/fast` 或 `params.fastMode: true` 将 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重写为其 `*-fast` 变体。`tool_stream` 默认开启；可通过 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 禁用。
  </Accordion>
  <Accordion title="Cerebras">
    作为内置的 `cerebras`GLM 提供商插件提供。GLM 使用 `zai-glm-4.7`OpenAI；OpenAI 兼容的基础 URL 是 `https://api.cerebras.ai/v1`。
  </Accordion>
</AccordionGroup>

## 通过 `models.providers` 的提供商（自定义/基础 URL）

使用 `models.providers`（或 `models.json`OpenAIAnthropic）添加**自定义**提供商或 OpenAI/Anthropic 兼容的代理。

下面许多内置提供商插件已经发布了默认目录。仅当您想要覆盖默认基础 URL、请求头或模型列表时，才使用显式的 `models.providers.<id>` 条目。

Gateway(网关) 模型能力检查也会读取显式的 Gateway(网关)`models.providers.<id>.models[]` 元数据。如果自定义或代理模型接受图像，请在该模型上设置 `input: ["text", "image"]`WebChat，以便 WebChat 和节点源附件路径将图像作为原生模型输入传递，而不是仅文本媒体引用。

`agents.defaults.models["provider/model"]` 仅控制代理的模型可见性、别名和每个模型的元数据。它本身不注册新的运行时模型。对于自定义提供商模型，还需添加 `models.providers.<provider>.models[]`，其中至少包含匹配的 `id`。

### Moonshot AI (Kimi)

Moonship 作为内置提供商插件提供。默认情况下使用内置提供商，仅当您需要覆盖基础 URL 或模型元数据时才添加显式的 Moonshot`models.providers.moonshot` 条目：

- 提供商：`moonshot`
- 认证：`MOONSHOT_API_KEY`
- 示例模型：`moonshot/kimi-k2.6`
- CLI：CLI`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

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

### Kimi 编程

Kimi 编程使用 Moonshot AI 的 Anthropic 兼容端点：

- 提供商：`kimi`
- 认证：`KIMI_API_KEY`
- 示例模型：`kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

旧版 `kimi/kimi-code` 和 `kimi/k2p5` 仍被接受作为兼容模型 ID，并会标准化为 Kimi 的稳定 API 模型 ID。

### 火山引擎（豆包）

火山引擎提供对中国境内的豆包及其他模型的访问。

- 提供商：`volcengine`（编程：`volcengine-plan`）
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

新手引导默认使用编程界面，但同时也会注册通用 `volcengine/*` 目录。

在新手引导/配置模型选择器中，火山引擎认证选项优先显示 `volcengine/*` 和 `volcengine-plan/*`OpenClaw 行。如果这些模型尚未加载，OpenClaw 将回退到未筛选的目录，而不是显示空的提供商范围选择器。

<Tabs>
  <Tab title="标准模型">
    - `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222` (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

  </Tab>
  <Tab title="编程模型 (volcengine-plan)">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`

  </Tab>
</Tabs>

### BytePlus（国际版）

BytePlus ARK 为国际用户提供与火山引擎相同的模型访问权限。

- 提供商：`byteplus`（编程：`byteplus-plan`）
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

新手引导默认为编码界面，但同时也注册了通用的 `byteplus/*` 目录。

在新手引导/配置模型选择器中，BytePlus 身份验证选项优先显示 `byteplus/*` 和 `byteplus-plan/*`OpenClaw 行。如果这些模型尚未加载，OpenClaw 将回退到未过滤的目录，而不是显示空的提供商范围选择器。

<Tabs>
  <Tab title="标准模型">
    - `byteplus/seed-1-8-251228` (Seed 1.8)
    - `byteplus/kimi-k2-5-260127` (Kimi K2.5)
    - `byteplus/glm-4-7-251222`GLM (GLM 4.7)

  </Tab>
  <Tab title="编码模型 (byteplus-plan)">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Synthetic

Synthetic 在 Anthropic`synthetic` 提供商后面提供了 Anthropic 兼容的模型：

- 提供商： `synthetic`
- 认证： `SYNTHETIC_API_KEY`
- 示例模型： `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI： CLI`openclaw onboard --auth-choice synthetic-api-key`

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

MiniMax 通过 MiniMax`models.providers` 进行配置，因为它使用自定义端点：

- MiniMax OAuth (全球)： MiniMaxOAuth`--auth-choice minimax-global-oauth`
- MiniMax OAuth (中国)： MiniMaxOAuth`--auth-choice minimax-cn-oauth`
- MiniMax API 密钥 (全球)： MiniMaxAPI`--auth-choice minimax-global-api`
- MiniMax API 密钥 (中国)： MiniMaxAPI`--auth-choice minimax-cn-api`
- 认证： `MINIMAX_API_KEY` 用于 `minimax`； `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用于 `minimax-portal`

有关设置详细信息、模型选项和配置片段，请参阅 [/providers/minimax](/zh/providers/minimax)。

<Note>在 MiniMax 的 Anthropic 兼容流式路径上，除非您明确设置，否则 OpenClaw 默认会禁用思考，并且 MiniMaxAnthropicOpenClaw`/fast on` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。</Note>

插件拥有的功能拆分：

- 文本/聊天默认值保留在 `minimax/MiniMax-M3` 上
- 图像生成为 `minimax/image-01` 或 `minimax-portal/image-01`
- 在两种 MiniMax 认证路径上，图像理解均为插件拥有的 `MiniMax-VL-01`MiniMax
- 网络搜索保留在提供商 ID `minimax` 上

### LM Studio

LM Studio 作为内置提供商插件提供，使用原生 API：

- 提供商：`lmstudio`
- 认证：`LM_API_TOKEN`
- 默认推理基础 URL：`http://localhost:1234/v1`

然后设置一个模型（替换为 `http://localhost:1234/api/v1/models` 返回的 ID 之一）：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 OpenClaw`/api/v1/models` 和 `/api/v1/models/load` 进行发现和自动加载，默认使用 `/v1/chat/completions` 进行推理。如果您希望 LM Studio 的 JIT 加载、TTL 和自动驱逐拥有模型生命周期，请设置 `models.providers.lmstudio.params.preload: false`。有关设置和故障排除，请参阅 [/providers/lmstudio](/zh/providers/lmstudio)。

### Ollama

Ollama 作为内置提供商插件提供，并使用 Ollama 的原生 API：

- 提供商：`ollama`
- 认证：无需认证（本地服务器）
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

当您使用 `OLLAMA_API_KEY`Ollama 选择加入时，会在 Ollama`http://127.0.0.1:11434` 本地检测到 Ollama，并且内置提供商插件会直接将 Ollama 添加到 `openclaw onboard` 和模型选择器中。有关新手引导、云端/本地模式和自定义配置，请参阅 [/providers/ollama](/zh/providers/ollama)。

### vLLM

vLLM 作为内置提供商插件，随附于本地/自托管的与 OpenAI 兼容的服务器：

- 提供商：`vllm`
- 认证：可选（取决于您的服务器）
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

SGLang 作为内置提供商插件，随附于快速自托管的与 OpenAI 兼容的服务器：

- 提供商：`sglang`
- 认证：可选（取决于您的服务器）
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

示例（与 OpenAI 兼容）：

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
    对于自定义提供商，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是可选的。当省略时，OpenClaw 默认为：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建议：设置与您的代理/模型限制匹配的显式值。

  </Accordion>
  <Accordion title="代理路由塑形规则">
    - 对于非原生端点上的 `api: "openai-completions"`（任何主机不是 `api.openai.com` 的非空 `baseUrl`），OpenClaw 强制 `compat.supportsDeveloperRole: false` 以避免提供商因不支持的 `developer` 角色而返回 400 错误。
    - 代理风格的 OpenAI 兼容路由也会跳过原生 OpenAI 独有的请求塑形：无 `service_tier`，无 Responses `store`，无 Completions `store`，无提示缓存提示，无 OpenAI 推理兼容负载塑形，以及无隐藏的 OpenClaw 归属标头。
    - 对于需要供应商特定字段的 OpenAI 兼容 Completions 代理，请设置 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`）以将额外的 JSON 合并到出站请求正文中。
    - 对于 vLLM 聊天模板控制，请设置 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。当会话思考级别关闭时，捆绑的 vLLM 插件会自动为 `vllm/nemotron-3-*` 发送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 对于缓慢的本地模型或远程 LAN/tailnet 主机，请设置 `models.providers.<id>.timeoutSeconds`。这会延长提供商模型 HTTP 请求处理，包括连接、标头、正文流和总的受保护获取中止，而不会增加整个代理运行时超时。如果 `agents.defaults.timeoutSeconds` 或特定运行的超时较低，请提高该上限；提供商超时无法延长整个运行过程。
    - 模型提供商 HTTP 调用仅针对配置的提供商 `baseUrl` 主机名，在 `198.18.0.0/15` 和 `fc00::/7` 中允许 Surge、Clash 和 sing-box 假 IP DNS 应答。自定义/本地提供商端点也会信任该确切配置的 `scheme://host:port` 源用于受保护的模型请求，包括环回、LAN 和 tailnet 主机。这不是一个新的配置选项；您配置的 `baseUrl` 仅针对该源扩展请求策略。假 IP 主机名允许和精确源信任是独立的机制。其他私有、环回、链路本地、元数据目标和不同端口仍然需要明确的 `models.providers.<id>.request.allowPrivateNetwork: true` 选择加入。设置 `models.providers.<id>.request.allowPrivateNetwork: false` 以退出精确源信任。
    - 如果 `baseUrl` 为空/省略，OpenClaw 将保持默认 OpenAI 行为（解析为 `api.openai.com`）。
    - 为了安全，显式的 `compat.supportsDeveloperRole: true` 在非原生 `openai-completions` 端点上仍然会被覆盖。
    - 对于非直接端点上的 `api: "anthropic-messages"`（除规范 `anthropic` 之外的任何提供商，或主机不是公共 `api.anthropic.com` 端点的自定义 `models.providers.anthropic.baseUrl`），OpenClaw 会抑制隐式的 Anthropic beta 标头（例如 `claude-code-20250219`、`interleaved-thinking-2025-05-14` 和 OAuth 标记），以便自定义 Anthropic 兼容代理不会拒绝不支持的 beta 标志。如果您的代理需要特定的 beta 功能，请显式设置 `models.providers.<id>.headers["anthropic-beta"]`。

  </Accordion>
</AccordionGroup>

## CLI 示例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另请参阅：[配置](/zh/gateway/configuration) 以获取完整的配置示例。

## 相关

- [配置参考](/zh/gateway/config-agents#agent-defaults) - 模型配置键
- [模型故障转移](/zh/concepts/model-failover) - 回退链和重试行为
- [模型](/zh/concepts/models) - 模型配置和别名
- [提供商](/zh/providers) - 各提供商设置指南
