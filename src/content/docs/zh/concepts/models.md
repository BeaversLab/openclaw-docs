---
summary: "Models CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# 模型 CLI

有关身份配置文件轮换、冷却期以及其与回退交互的信息，请参阅 [/concepts/模型-failover](/zh/concepts/model-failover)。
快速提供商概览 + 示例：[/concepts/模型-providers](/zh/concepts/model-providers)。

## 模型选择的工作原理

OpenClaw 按以下顺序选择模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **Fallbacks**（按顺序）。
3. **提供商身份故障转移** 在移动到下一个模型之前，会在提供商内部发生。

相关内容：

- `agents.defaults.models` 是 OpenClaw 可以使用的模型的允许列表/目录（以及别名）。
- `agents.defaults.imageModel` **仅当** 主模型无法接受图像时才会使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，该工具将回退到 `agents.defaults.imageModel`，然后是解析的会话/默认模型。
- `agents.defaults.imageGenerationModel` 由共享图像生成功能使用。如果省略，`image_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试剩余的注册图像生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。
- `agents.defaults.musicGenerationModel` 由共享音乐生成功能使用。如果省略，`music_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试剩余的注册音乐生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。
- `agents.defaults.videoGenerationModel` 由共享视频生成功能使用。如果省略，`video_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试剩余的注册视频生成提供商。如果您设置了特定的提供商/模型，请同时配置该提供商的身份验证/API 密钥。
- 每个代理的默认值可以通过 `agents.list[].model` 加上绑定来覆盖 `agents.defaults.model`（参见 [/concepts/multi-agent](/zh/concepts/multi-agent)）。

## 快速模型策略

- 将您的主模型设置为可用的最强最新一代模型。
- 针对成本/延迟敏感的任务和低风险聊天使用回退模型。
- 对于启用工具的代理或不受信任的输入，请避免使用较旧/较弱的模型层级。

## 新手引导（推荐）

如果您不想手动编辑配置，请运行新手引导：

```bash
openclaw onboard
```

它可以为常见提供商设置模型 + 身份验证，包括 **OpenAI Code (Codex)
订阅** (OAuth) 和 **Anthropic** (API 密钥或 Claude CLI)。

## 配置键（概览）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（允许列表 + 别名 + 提供商参数）
- `models.providers`（写入 `models.json` 的自定义提供商）

模型引用已规范化为小写。像 `z.ai/*` 这样的提供商别名会规范化
为 `zai/*`。

提供商配置示例（包括 OpenCode）位于
[/providers/opencode](/zh/providers/opencode)。

## “不允许使用模型”（以及回复停止的原因）

如果设置了 `agents.defaults.models`，它将成为 `/model` 和
会话覆盖的 **允许列表**。当用户选择一个不在该允许列表中的模型时，
OpenClaw 返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

这发生在生成正常回复 **之前**，因此消息看起来可能
像是“没有回应”。解决方法是：

- 将模型添加到 `agents.defaults.models`，或者
- 清除允许列表（移除 `agents.defaults.models`），或者
- 从 `/model list` 中选择一个模型。

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

## 在聊天中切换模型（`/model`）

您可以无需重启即可为当前会话切换模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

注意事项：

- `/model`（以及 `/model list`）是一个紧凑的带编号选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择。
- `/model` 会立即保存新的会话选择。
- 如果代理处于空闲状态，下一次运行将立即使用新模型。
- 如果运行已在进行中，OpenClaw 会将实时切换标记为挂起状态，并且仅在干净的重试点时重启到新模型。
- 如果工具活动或回复输出已经开始，待处理的切换可能会保持排队状态，直到稍后重试或下一轮用户操作。
- `/model status` 是详细视图（身份验证候选者，以及配置时，提供商端点 `baseUrl` + `api` 模式）。
- 模型引用通过在**第一个** `/` 处分割进行解析。在输入 `/model <ref>` 时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），则必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 将按以下顺序解析输入：
  1. 别名匹配
  2. 针对该确切无前缀模型 ID 的唯一配置提供商匹配
  3. 已弃用的回退至配置的默认提供商
     如果该提供商不再暴露配置的默认模型，OpenClaw
     将改为回退至第一个配置的提供商/模型，以避免
     显示过时的已移除提供商默认值。

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

默认显示已配置的模型。有用的标志：

- `--all`：完整目录
- `--local`：仅本地提供商
- `--provider <name>`：按提供商过滤
- `--plain`：每行一个模型
- `--json`：机器可读输出

### `models status`

显示解析后的主模型、回退模型、图像模型以及配置提供商的身份验证概览。它还会显示在身份验证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内警告）。`--plain` 仅打印解析后的主模型。
OAuth 状态始终显示（并包含在 `--json` 输出中）。如果配置的提供商没有凭据，`models status` 会打印一个 **Missing auth** 部分。
JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`
（每个提供商的有效身份验证，包括环境支持的凭据）。`auth.oauth`
仅是身份验证存储配置文件的运行状况；仅支持环境的提供商不会出现在那里。
使用 `--check` 进行自动化（当缺失/过期时退出 `1`，即将过期时退出 `2`）。
使用 `--probe` 进行实时身份验证检查；探测行可以来自身份验证配置文件、环境凭据或 `models.json`。
如果显式的 `auth.order.<provider>` 省略了存储的配置文件，探测将报告
`excluded_by_auth_order` 而不是尝试它。如果身份验证存在但无法为该提供商解析出可探测的模型，探测将报告 `status: no_model`。

身份验证选择取决于提供商/账户。对于始终在线的网关主机，API
密钥通常是最可预测的；也支持重用 Claude CLI 和现有的 Anthropic
OAuth/令牌配置文件。

示例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 扫描 (OpenRouter 免费模型)

`openclaw models scan` 检查 OpenRouter 的 **免费模型目录**，并可以选择探测模型的工具和图像支持。

关键标志：

- `--no-probe`: 跳过实时探测（仅元数据）
- `--min-params <b>`: 最小参数大小（十亿）
- `--max-age-days <days>`: 跳过旧模型
- `--provider <name>`: 提供商前缀过滤器
- `--max-candidates <n>`: 回退列表大小
- `--set-default`: 将 `agents.defaults.model.primary` 设置为第一个选择
- `--set-image`: 将 `agents.defaults.imageModel.primary` 设置为第一个图像选择

探测需要 OpenRouter API 密钥（来自认证配置文件或 `OPENROUTER_API_KEY`）。如果没有密钥，请使用 `--no-probe` 仅列出候选项。

扫描结果按以下标准排名：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入

- OpenRouter `/models` 列表（过滤器 `:free`）
- 需要来自认证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（参见 [/environment](/zh/help/environment)）
- 可选过滤器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探测控制：`--timeout`、`--concurrency`

在 TTY 中运行时，您可以交互式地选择回退项。在非交互模式下，传递 `--yes` 以接受默认值。

## 模型注册表 (`models.json`)

`models.providers` 中的自定义提供商被写入代理目录（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非将 `models.mode` 设置为 `replace`，否则默认情况下会合并此文件。

匹配提供商 ID 的合并模式优先级：

- 代理 `models.json` 中已存在的非空 `baseUrl` 优先。
- 代理 `models.json` 中的非空 `apiKey` 仅当该提供商在当前配置/认证配置文件上下文中不由 SecretRef 管理时才优先。
- SecretRef 管理的提供商 `apiKey` 值从源标记（环境引用为 `ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新，而不是持久化解析的密钥。
- SecretRef 管理的提供商标头值从源标记（环境引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新。
- 空或缺失的代理 `apiKey`/`baseUrl` 回退到配置 `models.providers`。
- 其他提供商字段从配置和规范化的目录数据刷新。

标记持久性以源为权威：OpenClaw 根据活动的源配置快照（解析前）写入标记，而不是根据解析后的运行时密钥值。每当 OpenClaw 重新生成 `models.json` 时，包括像 `openclaw agent` 这样的命令驱动路径，都适用此规则。

## 相关

- [模型提供商](/zh/concepts/model-providers) — 提供商路由和身份验证
- [模型故障转移](/zh/concepts/model-failover) — 回退链
- [图像生成](/zh/tools/image-generation) — 图像模型配置
- [音乐生成](/zh/tools/music-generation) — 音乐模型配置
- [视频生成](/zh/tools/video-generation) — 视频模型配置
- [配置参考](/zh/gateway/configuration-reference#agent-defaults) — 模型配置键
