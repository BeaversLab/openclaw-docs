---
summary: "模型 CLI：列表、设置、别名、故障转移、扫描、状态"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "模型 CLI"
sidebarTitle: "模型 CLI"
---

<CardGroup cols={2}>
  <Card title="模型故障转移" href="/zh/concepts/model-failover">
    身份配置轮换、冷却期，以及它们与故障转移的交互方式。
  </Card>
  <Card title="模型提供商" href="/zh/concepts/model-providers">
    提供商快速概览和示例。
  </Card>
  <Card title="Agent 运行时" href="/zh/concepts/agent-runtimes">
    PI、Codex 和其他 agent 循环运行时。
  </Card>
  <Card title="配置参考" href="/zh/gateway/config-agents#agent-defaults">
    模型配置键。
  </Card>
</CardGroup>

模型引用会选择一个提供商和模型。它们通常不选择底层的 agent 运行时。例如，`openai/gpt-5.5` 可以通过普通的 OpenAI 提供商路径运行，也可以通过 Codex 应用服务器运行时运行，具体取决于 `agents.defaults.agentRuntime.id`。参见 [Agent 运行时](/zh/concepts/agent-runtimes)。

## 模型选择如何工作

OpenClaw 按以下顺序选择模型：

<Steps>
  <Step title="主模型">`agents.defaults.model.primary`（或 `agents.defaults.model`）。</Step>
  <Step title="故障转移">`agents.defaults.model.fallbacks`（按顺序）。</Step>
  <Step title="提供商身份故障转移">身份故障转移发生在提供商内部，然后才会移动到下一个模型。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Related 模型 surfaces">
    - `agents.defaults.models` 是 OpenClaw 可以使用的模型允许列表/目录（包括别名）。 - `agents.defaults.imageModel` **仅当** 主模型无法接受图像时才使用。 - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，该工具将回退到 `agents.defaults.imageModel`，然后是解析后的会话/默认模型。 - `agents.defaults.imageGenerationModel` 由共享图像生成功能使用。如果省略，`image_generate`
    仍然可以推断基于身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册图像生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。 - `agents.defaults.musicGenerationModel` 由共享音乐生成功能使用。如果省略，`music_generate` 仍然可以推断基于身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID
    顺序尝试剩余的注册音乐生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。 - `agents.defaults.videoGenerationModel` 由共享视频生成功能使用。如果省略，`video_generate` 仍然可以推断基于身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册视频生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。 -
    每个代理的默认值可以通过 `agents.list[].model` 加上绑定来覆盖 `agents.defaults.model`（请参阅 [多代理路由](/zh/concepts/multi-agent)）。
  </Accordion>
</AccordionGroup>

## 快速模型策略

- 将您的主要设置为您可用的最强最新一代模型。
- 对于对成本/延迟敏感的任务和低风险聊天，使用回退模型。
- 对于启用工具的代理或不受信任的输入，请避免使用较旧/较弱的模型层级。

## 新手引导（推荐）

如果您不想手动编辑配置，请运行新手引导：

```bash
openclaw onboard
```

它可以为常用提供商设置模型 + 认证，包括 **OpenAI Code (Codex) 订阅** (OAuth) 和 **Anthropic** (API 密钥或 Claude CLI)。

## Config keys (overview)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (allowlist + aliases + 提供商 params)
- `models.providers` (写入 `models.json` 的自定义提供商)

<Note>
模型引用已规范化为小写。像 `z.ai/*` 这样的提供商别名会规范化为 `zai/*`。

提供商配置示例（包括 OpenCode）位于 [OpenCode](/zh/providers/opencode)。

</Note>

### 安全 allowlist 编辑

手动更新 `agents.defaults.models` 时使用增量写入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Clobber protection rules">
    `openclaw config set` 保护模型/提供商映射免遭意外覆盖。当对 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 进行纯对象赋值会删除现有条目时，该操作将被拒绝。请使用 `--merge` 进行增量更改；仅当提供的值应成为完整目标值时才使用 `--replace`。

    交互式提供商设置和 `openclaw configure --section model` 也会将特定于提供商的选择合并到现有的 allowlist 中，因此添加 Codex、Ollama 或其他提供商不会删除不相关的模型条目。重新应用提供商认证时，Configure 会保留现有的 `agents.defaults.model.primary`。显式的默认设置命令（如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>`）仍将替换 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## "模型不被允许"（以及回复停止的原因）

如果设置了 `agents.defaults.models`，它将成为 `/model` 和会话覆盖的**允许列表**。当用户选择的模型不在该允许列表中时，OpenClaw 返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

<Warning>
这发生在生成正常回复**之前**，因此消息可能会让人觉得它“没有响应”。解决方法是：

- 将模型添加到 `agents.defaults.models`，或
- 清除允许列表（移除 `agents.defaults.models`），或
- 从 `/model list` 中选择一个模型。
  </Warning>

允许列表配置示例：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## 在聊天中切换模型 (`/model`)

您无需重启即可为当前会话切换模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="Picker behavior">
    - `/model` (以及 `/model list`) 是一个紧凑的、带编号的选择器（模型系列 + 可用的提供商）。
    - 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单以及提交步骤。
    - `/models add` 已弃用，现在返回弃用消息，而不是从聊天中注册模型。
    - `/model <#>` 从该选择器中进行选择。
  </Accordion>
  <Accordion title="Persistence and live switching">
    - `/model` 会立即保存新的会话选择。
    - 如果代理处于空闲状态，下次运行将立即使用新模型。
    - 如果运行已在进行中，OpenClaw 会将实时切换标记为待处理，并仅在干净的重试点重新启动到新模型。
    - 如果工具活动或回复输出已经开始，待处理的切换可能会保持排队状态，直到稍后的重试机会或下一个用户轮次。
    - `/model status` 是详细视图（身份验证候选者，以及在配置时，提供商端点 `baseUrl` + `api` 模式）。
  </Accordion>
  <Accordion title="Ref 解析">
    - 模型引用通过在**第一个** `/` 处分割来解析。在输入 `/model <ref>` 时请使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 风格），则必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果您省略提供商，OpenClaw 将按以下顺序解析输入：
      1. 别名匹配
      2. 该确切无前缀模型 ID 的唯一已配置提供商匹配
      3. 已弃用，回退到已配置的默认提供商 — 如果该提供商不再暴露已配置的默认模型，OpenClaw 则会回退到第一个已配置的提供商/模型，以避免显示过时的已移除提供商默认值。
  </Accordion>
</AccordionGroup>

完整命令行为/配置：[斜杠命令](/zh/tools/slash-commands)。

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

默认显示已配置的模型。有用的标志：

<ParamField path="--all" type="boolean">
  完整目录。在配置身份验证之前包含附带的提供商拥有的静态目录行，以便仅发现视图可以显示在您添加匹配的提供商凭据之前不可用的模型。
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
  机器可读的输出。
</ParamField>

### `models status`

显示解析后的主模型、回退模型、图像模型以及已配置提供商的身份验证概览。它还会显示在身份验证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内发出警告）。`--plain` 仅打印解析后的主模型。

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - OAuth 状态始终显示（并包含在 `--json` 输出中）。如果配置的提供商没有凭据，`models status` 会打印一个 **Missing auth** 部分。
    - JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效身份验证，包括 env 支持的凭据）。`auth.oauth` 仅仅是 auth-store 配置文件的健康状况；仅 env 的提供商不会出现在那里。
    - 使用 `--check` 进行自动化（当缺失/过期时退出 `1`，即将过期时退出 `2`）。
    - 使用 `--probe` 进行实时身份验证检查；探测行可以来自身份验证配置文件、env 凭据或 `models.json`。
    - 如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测会报告 `excluded_by_auth_order` 而不是尝试它。如果身份验证存在但无法为该提供商解析出可探测的模型，探测会报告 `status: no_model`。
  </Accordion>
</AccordionGroup>

<Note>Auth choice is 提供商/account dependent. For always-on gateway hosts, API keys are usually the most predictable; Claude CLI reuse and existing Anthropic OAuth/token profiles are also supported.</Note>

Example (Claude CLI):

```bash
claude auth login
openclaw models status
```

## Scanning (OpenRouter free models)

`openclaw models scan` 检查 OpenRouter 的 **free 模型 catalog**，并可以选择探测模型以获取工具和图像支持。

<ParamField path="--no-probe" type="boolean">
  跳过实时探测（仅限元数据）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小参数规模（十亿）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳过较旧的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供商前缀筛选器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  回退列表大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  将 `agents.defaults.model.primary` 设置为第一个选择。
</ParamField>
<ParamField path="--set-image" type="boolean">
  将 `agents.defaults.imageModel.primary` 设置为第一个图像选择。
</ParamField>

<Note>OpenRouter 的 `/models` 目录是公开的，因此仅限元数据的扫描可以在没有密钥的情况下列出免费候选项。探测和推理仍然需要 OpenRouter API 密钥（来自身份验证配置文件或 `OPENROUTER_API_KEY`）。如果没有可用的密钥，`openclaw models scan` 将回退到仅限元数据的输出并保持配置不变。使用 `--no-probe` 显式请求仅限元数据模式。</Note>

扫描结果按以下标准排序：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入：

- OpenRouter `/models` 列表（筛选 `:free`）
- 实时探测需要来自身份验证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（请参阅[环境变量](/en/help/environment））
- 可选筛选器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 请求/探测控制：`--timeout`、`--concurrency`

当实时探测在 TTY 中运行时，您可以交互式地选择备用。在非交互模式下，传递 `--yes` 以接受默认值。仅元数据结果仅供参考；`--set-default` 和 `--set-image` 需要实时探测，因此 OpenClaw 不会配置不可用的无密钥 OpenRouter 模型。

## 模型注册表 (`models.json`)

`models.providers` 中的自定义提供商会写入代理目录（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非将 `models.mode` 设置为 `replace`，否则默认情况下会合并此文件。

<AccordionGroup>
  <Accordion title="合并模式优先级">
    匹配提供商 ID 的合并模式优先级：

    - 代理 `models.json` 中已存在的非空 `baseUrl` 优先。
    - 仅当该提供商在当前 config/auth-profile 上下文中不是由 SecretRef 管理时，代理 `models.json` 中的非空 `apiKey` 才优先。
    - SecretRef 管理的提供商 `apiKey` 值是从源标记（env 引用为 `ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新，而不是持久化已解析的密钥。
    - SecretRef 管理的提供商标头值是从源标记（env 引用为 `secretref-env:ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新。
    - 空的或缺失的代理 `apiKey`/`baseUrl` 会回退到 config `models.providers`。
    - 其他提供商字段从配置和规范化的目录数据中刷新。

  </Accordion>
</AccordionGroup>

<Note>标记持久化以源为准：OpenClaw 从活动源配置快照（解析前）写入标记，而不是从解析后的运行时密钥值写入。每当 OpenClaw 重新生成 `models.json` 时都适用此规则，包括像 `openclaw agent` 这样的命令驱动路径。</Note>

## 相关

- [代理运行时](/zh/concepts/agent-runtimes) — PI、Codex 和其他代理循环运行时
- [配置参考](/zh/gateway/config-agents#agent-defaults) — 模型配置键
- [图像生成](/zh/tools/image-generation) — 图像模型配置
- [模型故障转移](/zh/concepts/model-failover) — 故障转移链
- [模型提供商](/zh/concepts/model-providers) — 提供商路由与身份验证
- [音乐生成](/zh/tools/music-generation) — 音乐模型配置
- [视频生成](/zh/tools/video-generation) — 视频模型配置
