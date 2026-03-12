---
summary: "模型 CLI：列表、设置、别名、后备、扫描、状态"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "模型 CLI"
---

# 模型 CLI

请参阅 [/concepts/model-failover](/zh/en/concepts/model-failover) 了解认证配置文件轮换、冷却时间及其与后备的交互方式。
快速提供商概述 + 示例：[/concepts/model-providers](/zh/en/concepts/model-providers)。

## 模型选择的工作原理

OpenClaw 按以下顺序选择模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **后备** 模型（按顺序）。
3. **提供商认证故障转移** 在移至下一个模型之前在提供商内部发生。
   下一个模型。

相关：

- `agents.defaults.models` 是 OpenClaw 可以使用的模型的允许列表/目录（包括别名）。
- `agents.defaults.imageModel` **仅当** 主模型无法接受图像时才会被使用。
- 每个代理的默认值可以通过 `agents.list[].model` 加上绑定覆盖 `agents.defaults.model`（请参阅 [/concepts/multi-agent](/zh/en/concepts/multi-agent)）。

## 快速模型策略

- 将您的主模型设置为可供您使用的最强最新一代模型。
- 对成本/延迟敏感的任务和低风险聊天使用后备模型。
- 对于启用了工具的代理或不受信任的输入，请避免使用较旧/较弱的模型层级。

## 设置向导（推荐）

如果您不想手动编辑配置，请运行入门向导：

```bash
openclaw onboard
```

它可以为常见的提供商设置模型 + 认证，包括 **OpenAI Code (Codex)
订阅** (OAuth) 和 **Anthropic**（API 密钥或 `claude setup-token`）。

## 配置键（概述）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models`（允许列表 + 别名 + 提供商参数）
- `models.providers`（写入 `models.json` 的自定义提供商）

模型引用被规范化为小写。提供商别名（如 `z.ai/*`）会规范化
为 `zai/*`。

提供商配置示例（包括 OpenCode）位于
[/gateway/configuration](/zh/en/gateway/configuration#opencode)。

## “模型不被允许”（以及回复停止的原因）

如果设置了 `agents.defaults.models`，它将成为 `/model` 和会话覆盖的**允许列表**。当用户选择了不在该允许列表中的模型时，OpenClaw 返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

这种情况发生在生成正常回复**之前**，因此消息可能看起来像“没有响应”。解决方法是：

- 将模型添加到 `agents.defaults.models`，或
- 清除允许列表（移除 `agents.defaults.models`），或
- 从 `/model list` 中选择一个模型。

允许列表配置示例：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## 在聊天中切换模型 (`/model`)

您可以切换当前会话的模型而无需重新启动：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

注：

- `/model`（以及 `/model list`）是一个紧凑的、带编号的选择器（模型系列 + 可用的提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择。
- `/model status` 是详细视图（身份验证候选者，以及配置时的提供商端点 `baseUrl` + `api` 模式）。
- 模型引用通过在**第一个** `/` 处分割来解析。在输入 `/model <ref>` 时请使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），则必须包含提供商前缀（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 会将输入视为别名或**默认提供商**的模型（仅在模型 ID 中没有 `/` 时有效）。

完整的命令行为/配置：[Slash commands](/zh/en/tools/slash-commands)。

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

显示解析后的主模型、回退模型、图像模型以及已配置提供商的身份验证概览。它还会显示在身份验证存储中找到的配置文件的 OAuth 过期状态（默认在 24 小时内发出警告）。`--plain` 仅打印解析后的主模型。
OAuth 状态始终显示（并包含在 `--json` 输出中）。如果已配置的提供商没有凭据，`models status` 将打印一个 **Missing auth** 部分。
JSON 包含 `auth.oauth`（警告窗口 + 配置文件）和 `auth.providers`（每个提供商的有效身份验证）。
使用 `--check` 进行自动化（当缺失/过期时退出 `1`，即将过期时退出 `2`）。

身份验证的选择取决于提供商/账户。对于始终在线的网关主机，API 密钥通常是最可预测的；同时也支持订阅令牌流程。

示例 (Anthropic setup-token)：

```bash
claude setup-token
openclaw models status
```

## 扫描 (OpenRouter 免费模型)

`openclaw models scan` 检查 OpenRouter 的 **免费模型目录**，并可选择探测模型的工具和图像支持。

关键标志：

- `--no-probe`：跳过实时探测（仅限元数据）
- `--min-params <b>`：最小参数大小（十亿）
- `--max-age-days <days>`：跳过较旧的模型
- `--provider <name>`：提供商前缀过滤器
- `--max-candidates <n>`：回退列表大小
- `--set-default`：将 `agents.defaults.model.primary` 设置为第一个选择
- `--set-image`：将 `agents.defaults.imageModel.primary` 设置为第一个图像选择

探测需要 OpenRouter API 密钥（来自身份验证配置文件或 `OPENROUTER_API_KEY`）。如果没有密钥，请使用 `--no-probe` 仅列出候选项。

扫描结果按以下方式排序：

1. 图像支持
2. 工具延迟
3. 上下文大小
4. 参数数量

输入

- OpenRouter `/models` 列表（过滤器 `:free`）
- 需要来自身份验证配置文件或 `OPENROUTER_API_KEY` 的 OpenRouter API 密钥（请参阅 [/environment](/zh/en/help/environment)）
- 可选过滤器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探测控制：`--timeout`、`--concurrency`

在 TTY 中运行时，您可以交互式地选择回退模型。在非交互模式下，传递 `--yes` 以接受默认值。

## 模型注册表 (`models.json`)

`models.providers` 中的自定义提供程序会写入代理目录（默认 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非将 `models.mode` 设置为 `replace`，否则默认合并该文件。

匹配提供程序 ID 的合并模式优先级：

- 已存在于 agent `models.json` 中的非空 `baseUrl` 优先。
- 仅当该提供程序在当前配置/auth-profile 上下文中不由 SecretRef 管理时，agent `models.json` 中的非空 `apiKey` 才会优先。
- SecretRef 管理的提供程序 `apiKey` 值是从源标记（env 引用为 `ENV_VAR_NAME`，file/exec 引用为 `secretref-managed`）刷新的，而不是持久化已解析的密钥。
- SecretRef 托管的提供程序标头值会从源标记（环境引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新。
- 为空或缺失的代理 `apiKey`/`baseUrl` 将回退到配置 `models.providers`。
- 其他提供程序字段会从配置和标准化的目录数据中刷新。

标记持久性以源为准：OpenClaw 从活动的源配置快照（解析前）写入标记，而不是从解析后的运行时密钥值写入。
这适用于 OpenClaw 重新生成 `models.json` 的任何时候，包括像 `openclaw agent` 这样的命令驱动路径。
