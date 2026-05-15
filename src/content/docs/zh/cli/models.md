---
summary: "CLI 参考，用于 `openclaw models`（状态/列表/设置/扫描、别名、回退、身份验证）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "Models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、备用、认证配置文件）。

相关：

- 提供商 + 模型：[模型](/zh/providers/models)
- 模型选择概念 + `/models` 斜杠命令：[模型概念](/zh/concepts/models)
- 提供商认证设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认/回退以及认证概览。
当提供商使用快照可用时，OAuth/API 密钥状态部分包括
提供商使用窗口和配额快照。
当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。使用认证来自特定于提供商的钩子
（如果可用）；否则 OpenClaw 回退到从认证配置文件、环境变量或配置中匹配 OAuth/API 密钥
凭据。
在 `--json` 输出中，`auth.providers` 是环境/配置/存储感知的提供商
概览，而 `auth.oauth` 仅是认证存储配置文件运行状况。
添加 `--probe` 以对每个已配置的提供商配置文件运行实时认证探测。
探测是真实请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 来检查已配置代理的模型/认证状态。如果省略，
该命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
已配置的默认代理。
探测行可以来自认证配置文件、环境凭据或 `models.json`。
对于 Codex OAuth 故障排除，`openclaw models status`、
`openclaw models auth list --provider openai-codex` 和
`openclaw config get agents.defaults.model --json` 是确认
代理是否具有通过原生 Codex 运行时用于
`openai/*` 的可用 `openai-codex` 认证配置文件的最快方式。请参阅 [OpenAI 提供商设置](/zh/providers/openai#check-and-recover-codex-oauth-routing)。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它读取配置、身份验证配置文件、现有的目录状态和提供商拥有的目录行，但不会重写 `models.json`。
- `Auth` 列是提供商级别且只读的。它根据本地身份验证配置文件元数据、环境标记、已配置的提供商密钥、本地提供商标记、AWS Bedrock 环境/配置文件标记以及插件合成身份验证元数据进行计算；它不会加载提供商运行时、读取密钥库机密、调用提供商 API 或证明确切的每个模型的执行就绪状态。
- `models list --all --provider <id>` 可以包括来自插件清单或捆绑提供商目录元数据的提供商拥有的静态目录行，即使您尚未通过该提供商的身份验证。这些行在配置匹配的身份验证之前仍显示为不可用。
- `models list` 在提供商目录发现缓慢时保持控制平面的响应性。默认和配置的视图在短暂等待后会回退到配置的或合成的模型行，并让发现在后台完成。当您需要确切的完整发现目录并愿意等待提供商发现时，请使用 `--all`。
- 广泛的 `models list --all` 将清单目录行与注册表行合并，而无需加载提供商运行时补充挂钩。提供商过滤的清单快速路径仅使用标记为 `static` 的提供商；标记为 `refreshable` 的提供商保持由注册表/缓存支持并附加清单行作为补充，而标记为 `runtime` 的提供商则保持注册表/运行时发现。
- `models list` 保持本机模型元数据和运行时上限的区分。在表格输出中，当有效的运行时上限与本机上下文窗口不同时，`Ctx` 显示 `contextTokens/contextWindow`；当提供商公开该上限时，JSON 行包括 `contextTokens`。
- `models list --provider <id>` 按提供商 ID 过滤，例如 `moonshot` 或
  `openai-codex`。它不接受交互式提供商
  选择器中的显示标签，例如 `Moonshot AI`。
- 模型引用通过按 **第一个** `/` 分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会首先将输入解析为别名，然后
  解析为该确切模型 ID 的唯一已配置提供商匹配项，仅在此之后
  才回退到配置的默认提供商并显示弃用警告。
  如果该提供商不再暴露配置的默认模型，OpenClaw
  将回退到第一个配置的提供商/模型，而不是显示
  陈旧的已移除提供商默认值。
- `models status` 可能会在身份验证输出中为非机密占位符显示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将其作为机密进行掩码处理。

### 模型扫描

`models scan` 读取 OpenRouter 的公共 `:free` 目录并对回退候选项进行排序。
该目录本身是公开的，因此仅元数据扫描不需要
OpenRouter 密钥。

默认情况下，OpenClaw 会尝试通过实时模型调用探测工具和图像支持。
如果未配置 OpenRouter 密钥，该命令将回退到仅元数据
输出，并说明 `:free` 模型进行
探测和推理仍需要 `OPENROUTER_API_KEY`。

选项：

- `--no-probe`（仅限元数据；不查找配置/机密）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次探测的超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要实时探测；仅元数据的扫描
结果仅供参考，不会应用到配置中。

### 模型状态

选项：

- `--json`
- `--plain`
- `--check` （退出代码 1=已过期/缺失，2=即将过期）
- `--probe` （对配置的身份验证配置文件进行实时探测）
- `--probe-provider <name>` （探测一个提供商）
- `--probe-profile <id>` （重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` （配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

`--json` 将 stdout 保留给 JSON 负载。身份验证配置文件、提供商
和启动诊断信息被路由到 stderr，以便脚本可以将 stdout 直接
通过管道传输到 `jq` 等工具中。

探测状态桶：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期的探测详情/原因代码情况：

- `excluded_by_auth_order`：存在存储的配置文件，但显式的
  `auth.order.<provider>` 省略了它，因此探测报告排除情况而不是
  尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置文件存在但不符合条件/无法解析。
- `no_model`OpenClaw：提供商身份验证存在，但 OpenClaw 无法为该提供商解析
  可探测的模型候选。

## 别名 + 后备

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式身份验证助手。根据您选择的提供商，它可以启动提供商身份验证流程（OAuth/API 密钥）或引导您手动粘贴令牌。

`models auth list` 列出所选代理已保存的身份验证配置文件，而不打印令牌、API 密钥或 OAuth 机密材料。使用 `--provider <id>` 过滤到单个提供商（例如 `openai-codex`），并使用 `--json` 进行脚本编写。

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用 `openclaw plugins list` 查看安装了哪些提供商。使用 `openclaw models auth --agent <id> <subcommand>` 将身份验证结果写入特定配置的代理存储。父级 `--agent` 标志受 `add`、`list`、`login`、`setup-token`、`paste-token` 和 `login-github-copilot` 尊重。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
openclaw models auth list --provider openai-codex
```

注意：

- `setup-token` 和 `paste-token` 仍然是针对暴露令牌身份验证方法的提供商的通用令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌身份验证方法（当提供商暴露该方法时，默认为该提供商的 `setup-token` 方法）。
- `paste-token` 接受在其他地方生成或来自自动化的令牌字符串。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其写入默认配置文件 ID `<provider>:manual`，除非您传递 `--profile-id`。
- `paste-token --expires-in <duration>` 根据相对持续时间（例如 `365d` 或 `12h`）存储绝对令牌过期时间。
- Anthropic 说明：Anthropic 工作人员告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，OpenClaw 将此集成中的 Claude CLI 复用和 AnthropicAnthropicOpenClawCLIOpenClawCLI`claude -p`Anthropic 使用视为已获准许。
- Anthropic Anthropic`setup-token` / `paste-token`OpenClawOpenClawCLI 仍然作为受支持的 OpenClaw 令牌路径可用，但在可用时，OpenClaw 现在更倾向于 Claude CLI 复用和 `claude -p`。

## 相关

- [CLI 参考](CLI/en/cli)
- [模型选择](/zh/concepts/model-providers)
- [模型故障转移](/zh/concepts/model-failover)
