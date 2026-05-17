---
summary: "CLI模型 CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "CLI模型 CLI"
sidebarTitle: "CLI模型 CLI"
---

<CardGroup cols={2}>
  <Card title="模型故障转移" href="/zh/concepts/model-failover">
    身份配置文件轮换、冷却期，以及它们如何与故障转移交互。
  </Card>
  <Card title="模型提供商" href="/zh/concepts/model-providers">
    提供商快速概览和示例。
  </Card>
  <Card title="Agent 运行时" href="/zh/concepts/agent-runtimes">
    PI、Codex 和其他代理循环运行时。
  </Card>
  <Card title="配置参考" href="/zh/gateway/config-agents#agent-defaults">
    模型配置键。
  </Card>
</CardGroup>

模型引用选择提供商和模型。它们通常不选择底层代理运行时。OpenAI 代理引用是主要的例外：OpenAI`openai/gpt-5.5`OpenAI 在官方 OpenAI 提供商上默认通过 Codex 应用服务器运行时运行。显式运行时覆盖属于提供商/模型策略，不属于整个代理或会话。在 Codex 运行时模式下，`openai/gpt-*`API 引用并不意味着 API 密钥计费；身份验证可以来自 Codex 帐户或 `openai-codex` 身份验证配置文件。请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

<Steps>
  <Step title="主模型">`agents.defaults.model.primary`（或 `agents.defaults.model`）。</Step>
  <Step title="故障转移">`agents.defaults.model.fallbacks`（按顺序）。</Step>
  <Step title="提供商身份验证故障转移">身份验证故障转移在移至下一个模型之前在提供商内部发生。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="相关模型界面">
    - `agents.defaults.models`OpenClaw 是 OpenClaw 可以使用的模型的允许列表/目录（加上别名）。使用 `provider/*` 条目来限制可见的提供商，同时保持提供商发现的动态性。
    - `agents.defaults.imageModel` **仅在** 主模型无法接受图像时使用。
    - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，该工具将回退到 `agents.defaults.imageModel`，然后是解析的会话/默认模型。
    - `agents.defaults.imageGenerationModel` 由共享图像生成功能使用。如果省略，`image_generate`API 仍然可以推断一个支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的图像生成提供商。如果您设置了特定的提供商/模型，还需配置该提供商的 auth/API 密钥。
    - `agents.defaults.musicGenerationModel` 由共享音乐生成功能使用。如果省略，`music_generate`API 仍然可以推断一个支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的音乐生成提供商。如果您设置了特定的提供商/模型，还需配置该提供商的 auth/API 密钥。
    - `agents.defaults.videoGenerationModel` 由共享视频生成功能使用。如果省略，`video_generate`API 仍然可以推断一个支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的视频生成提供商。如果您设置了特定的提供商/模型，还需配置该提供商的 auth/API 密钥。
    - 每个代理的默认值可以通过 `agents.list[].model` 加上绑定来覆盖 `agents.defaults.model`（请参阅 [多代理路由](/zh/concepts/multi-agent)）。

  </Accordion>
</AccordionGroup>

## 选择来源和回退行为

同一个 `provider/model` 根据其来源可能具有不同的含义：

- 配置的默认值（`agents.defaults.model.primary` 和特定于代理的主要模型）是正常的起点，并使用 `agents.defaults.model.fallbacks`。
- 自动回退选择是临时的恢复状态。它们通过 `modelOverrideSource: "auto"` 存储，以便后续轮次可以继续使用回退链，而无需先探测已知的主要故障模型。
- 用户会话选择是精确的。`/model`、模型选择器 `session_status(model=...)` 和 `sessions.patch` 存储 `modelOverrideSource: "user"`OpenClaw；如果所选的提供商/模型不可达，OpenClaw 将明显失败，而不是回退到另一个配置的模型。
- Cron `--model` / payload `model` 是每个作业的主要模型。除非作业提供显式的 payload `fallbacks`（对于严格的 Cron 运行，请使用 `fallbacks: []`），否则它仍然使用配置的回退。
- CLI default-模型 和 allowlist 选择器通过列出显式的 `models.providers.*.models` 而不是加载完整的内置目录来遵守 CLI`models.mode: "replace"`。
- Control UI 模型选择器向 Gateway(网关) 询问其配置的模型视图：如果存在，则为 Gateway(网关)`agents.defaults.models`，包括提供商范围的 `provider/*` 条目；否则为显式的 `models.providers.*.models` 加上具有可用身份验证的提供商。完整的内置目录保留用于显式浏览视图，例如带有 `view: "all"` 或 `openclaw models list --all` 的 `models.list`。

## 快速模型策略

- 将您的主要模型设置为可用的最强最新一代模型。
- 将回退用于对成本/延迟敏感的任务和低风险的聊天。
- 对于启用了工具的代理或不受信任的输入，请避免使用较旧/较弱的模型层级。

## 新手引导（推荐）

如果您不想手动编辑配置，请运行新手引导：

```bash
openclaw onboard
```

它可以为常用提供商设置模型 + 身份验证，包括 **OpenAI Code (Codex) 订阅**（OAuth）和 **Anthropic**（API 密钥或 Claude CLI）。

## 配置键（概览）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（allowlist + aliases + 提供商 params + `provider/*` 动态提供商条目）
- `models.providers`（写入 `models.json` 的自定义提供商）

<Note>
模型引用会被规范化为小写。提供商别名如 `z.ai/*` 会规范化为 `zai/*`。

提供商配置示例（包括 OpenCode）位于 [OpenCode](/zh/providers/opencode)。

</Note>

### 安全 allowlist 编辑

手动更新 `agents.defaults.models` 时使用累加写入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="防止覆盖规则">
    `openclaw config set` 保护模型/提供商映射免受意外覆盖。当对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 进行普通对象赋值会移除现有条目时，该赋值将被拒绝。使用 `--merge` 进行添加更改；仅当提供的值应成为完整的目标值时，才使用 `--replace`。

    交互式提供商设置和 `openclaw configure --section model` 还会将提供商范围的选择合并到现有允许列表中，因此添加 Codex、Ollama 或其他提供商不会删除不相关的模型条目。当重新应用提供商身份验证时，Configure 会保留现有的 `agents.defaults.model.primary`。显式的默认设置命令（如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>`）仍会替换 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## “模型不被允许”（以及回复停止的原因）

如果设置了 `agents.defaults.models`，它将成为 `/model` 和会话覆盖的**允许列表**。当用户选择了不在该允许列表中的模型时，OpenClaw 返回：

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
这种情况发生在生成正常回复**之前**，因此消息可能看起来像“没有响应”。解决方法是：

- 将模型添加到 `agents.defaults.models`，或
- 清除允许列表（移除 `agents.defaults.models`），或
- 从 `/model list` 中选择一个模型。

</Warning>

当被拒绝的命令包含运行时覆盖（例如 `/model openai/gpt-5.5 --runtime codex`）时，请先修复允许列表，然后重试相同的 `/model ... --runtime ...` 命令。对于原生 Codex 执行，所选模型仍然是 `openai/gpt-5.5`；`codex` 运行时选择工具架并单独使用 Codex 身份验证。

对于本地/GGUF 模型，请在允许列表中存储完整的提供商前缀引用，例如 `ollama/gemma4:26b`、`lmstudio/Gemma4-26b-a4-it-gguf` 或 `openclaw models list --provider <provider>` 显示的确切提供商/模型。当启用允许列表时，仅使用本地文件名或显示名称是不够的。

如果您想限制提供商而不必手动列出每个模型，请将 `provider/*` 条目添加到 `agents.defaults.models`：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai-codex/*": {},
        "vllm/*": {},
      },
    },
  },
}
```

使用该策略后，`/model`、`/models` 和模型选择器将仅显示这些提供商的已发现目录。所选提供商的新模型可以出现而无需编辑允许列表。当您需要来自另一个提供商的特定模型时，确切的 `provider/model` 条目可以与 `provider/*` 条目混合使用。

允许列表配置示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

## 在聊天中切换模型 (`/model`)

您可以在不重新启动的情况下为当前会话切换模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="选择器行为">
    - `/model`（以及 `/model list`Discord）是一个紧凑的、带编号的选择器（模型系列 + 可用提供商）。
    - 在 Discord 上，`/model` 和 `/models`Telegram 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。
    - 在 Telegram 上，`/models` 选择器的选择范围限于当前会话；它们不会更改 `openclaw.json` 中代理的持久默认值。
    - `/models add` 已被弃用，现在返回弃用消息，而不是从聊天中注册模型。
    - `/model <#>` 从该选择器中进行选择。

  </Accordion>
  <Accordion title="持久化和实时切换">
    - `/model` 会立即持久化新的会话选择。
    - 如果代理处于空闲状态，下次运行将立即使用新模型。
    - 如果运行已在进行中，OpenClaw 会将实时切换标记为待处理，并仅在干净的重试点时重启到新模型。
    - 如果工具活动或回复输出已经开始，待处理的切换可能会保持排队状态，直到后续的重试机会或用户的下一轮对话。
    - 用户选择的 `/model` 引用对该会话是严格的：如果所选提供商/模型不可达，回复将明显失败，而不是从 `agents.defaults.model.fallbacks` 静默回答。这与配置的默认值和 cron 作业主选项不同，后者仍可使用回退链。
    - `/model status` 是详细视图（身份验证候选者，以及配置时的提供商端点 `baseUrl` + `api` 模式）。

  </Accordion>
  <Accordion title="引用解析">
    - 模型引用通过在**第一个** `/` 处分割来解析。在输入 `/model <ref>` 时使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 风格），则必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果您省略提供商，OpenClaw 将按以下顺序解析输入：
      1. 别名匹配
      2. 该确切无前缀模型 ID 的唯一已配置提供商匹配
      3. 已弃用，回退到配置的默认提供商 — 如果该提供商不再暴露配置的默认模型，OpenClaw 会改为回退到第一个配置的提供商/模型，以避免显示过时的已移除提供商默认值。
  </Accordion>
</AccordionGroup>

完整的命令行为/配置：[斜杠命令](/zh/tools/slash-commands)。

## CLI 命令

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models`（无子命令）是 `models status` 的快捷方式。

### `models list`

默认显示已配置/可进行身份验证的模型。有用的标志：

<ParamField path="--all" type="boolean">
  完整目录。包括在配置身份验证之前捆绑的提供商拥有的静态目录行，以便仅发现的视图可以显示在您添加匹配的提供商凭据之前不可用的模型。
</ParamField>
<ParamField path="--local" type="boolean">
  仅限本地提供商。
</ParamField>
<ParamField path="--provider <id>" type="string">
  按提供商 ID 过滤，例如 `moonshot`。不接受来自交互式选择器的显示标签。
</ParamField>
<ParamField path="--plain" type="boolean">
  每行一个模型。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读输出。
</ParamField>

### `models status`

显示已解析的主模型、回退模型、图像模型以及已配置提供商的身份验证概览。它还会显示在身份验证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内警告）。`--plain` 仅打印已解析的主模型。

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - OAuth 状态始终显示（并包含在 `--json` 输出中）。如果配置的提供商没有凭据，`models status` 会打印一个 **Missing auth** 部分。
    - JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效身份验证，包括基于环境变量的凭据）。`auth.oauth` 仅为身份验证存储的配置文件运行状况；仅基于环境变量的提供商不会出现在那里。
    - 使用 `--check` 进行自动化（在缺失/过期时退出 `1`，在即将过期时退出 `2`）。
    - 使用 `--probe` 进行实时身份验证检查；探测行可以来自身份验证配置文件、环境凭据或 `models.json`。
    - 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测将报告 `excluded_by_auth_order` 而不是尝试它。如果身份验证存在但无法为该提供商解析可探测的模型，探测将报告 `status: no_model`。

  </Accordion>
</AccordionGroup>

<Note>身份验证选择取决于提供商/账户。对于始终在线的网关主机，API 密钥通常是最可预测的；也支持重用 Claude CLI 和现有的 Anthropic OAuth/令牌配置文件。</Note>

示例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 扫描 (OpenRouter 免费模型)

`openclaw models scan` 检查 OpenRouter 的 **免费模型目录**，并可选择探测模型以获取工具和图像支持。

<ParamField path="--no-probe" type="boolean">
  跳过实时探测（仅限元数据）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小参数大小（十亿）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳过较旧的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供商前缀过滤器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  回退列表大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  将 `agents.defaults.model.primary` 设置为首次选择。
</ParamField>
<ParamField path="--set-image" type="boolean">
  将 `agents.defaults.imageModel.primary` 设置为首次图像选择。
</ParamField>

<Note>OpenRouter `/models` 目录是公开的，因此仅元数据扫描可以在没有密钥的情况下列出免费候选者。探测和推理仍然需要 OpenRouter API 密钥（来自身份验证配置文件或 `OPENROUTER_API_KEY`）。如果没有可用的密钥，`openclaw models scan` 将回退到仅元数据输出并保持配置不变。使用 `--no-probe` 显式请求仅元数据模式。</Note>

扫描结果按以下标准排名：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入：

- OpenRouter `/models` 列表（过滤 `:free`）
- 实时探测需要来自身份验证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（参见[环境变量](/zh/help/environment)）
- 可选过滤器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 请求/探测控制：`--timeout`、`--concurrency`

当实时探测在 TTY 中运行时，您可以交互式地选择回退选项。在非交互模式下，传递 `--yes` 以接受默认值。仅包含元数据的结果仅供参考；`--set-default` 和 `--set-image` 需要实时探测，因此 OpenClaw 不会配置不可用的无密钥 OpenRouter 模型。

## 模型注册表 (`models.json`)

`models.providers` 中的自定义提供商会写入代理目录（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非将 `models.mode` 设置为 `replace`，否则默认会合并此文件。

<AccordionGroup>
  <Accordion title="合并模式优先级">
    匹配提供商 ID 的合并模式优先级：

    - 代理 `models.json` 中已存在的非空 `baseUrl` 优先。
    - 仅当该提供商在当前配置/auth-profile 上下文中不由 SecretRef 管理时，代理 `models.json` 中的非空 `apiKey` 才优先。
    - SecretRef 管理的提供商 `apiKey` 值从源标记（env 引用为 `ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新，而不是持久化已解析的机密。
    - SecretRef 管理的提供商标头值从源标记（env 引用为 `secretref-env:ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新。
    - 空或缺失的代理 `apiKey`/`baseUrl` 回退到配置 `models.providers`。
    - 其他提供商字段从配置和规范化目录数据中刷新。

  </Accordion>
</AccordionGroup>

<Note>标记持久性以源为准：OpenClaw 从活动的源配置快照（解析前）写入标记，而不是从已解析的运行时机密值写入。每当 OpenClaw 重新生成 `models.json` 时（包括像 `openclaw agent` 这样的命令驱动路径），都适用此规则。</Note>

## 相关

- [Agent runtimes](/zh/concepts/agent-runtimes) — PI、Codex 及其他代理循环运行时
- [Configuration reference](/zh/gateway/config-agents#agent-defaults) — 模型配置键
- [Image generation](/zh/tools/image-generation) — 图像模型配置
- [Model failover](/zh/concepts/model-failover) — 故障转移链
- [Model providers](/zh/concepts/model-providers) — 提供商路由与身份验证
- [Music generation](/zh/tools/music-generation) — 音乐模型配置
- [Video generation](/zh/tools/video-generation) — 视频模型配置
