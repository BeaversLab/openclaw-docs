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
- 提供商身份验证设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认/回退以及身份验证概述。
当提供商使用情况快照可用时，OAuth/API 密钥状态部分包含
提供商使用窗口和配额快照。
当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI、
MiniMax、Xiaomi 和 z.ai。使用验证来自特定提供商的钩子（hooks），
如果可用；否则 OpenClaw 会回退到匹配来自身份验证配置文件、环境变量或配置中的
OAuth/API 密钥凭证。
在 `--json` 输出中，`auth.providers` 是环境/配置/存储感知的提供商
概述，而 `auth.oauth` 仅包含身份验证存储配置文件健康状况。
添加 `--probe` 以针对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实的请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 检查已配置代理的模型/身份验证状态。如果省略，
该命令将使用 `OPENCLAW_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。
探测行可以来自身份验证配置文件、环境凭证或 `models.json`。
对于 OpenAI ChatGPT/Codex OAuth 故障排除，`openclaw models status`、
`openclaw models auth list --provider openai` 和
`openclaw config get agents.defaults.model --json``openai` 是确认
代理是否具有可用于 `openai/*`（通过原生 Codex 运行时）的
OAuth 配置文件的最快方法。请参阅 [OpenAI 提供商设置](/zh/providers/openai#check-and-recover-codex-oauth-routing)。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它读取配置、身份验证配置文件、现有目录状态和提供商拥有的目录行，但不会重写 `models.json`。
- `Auth` 列是提供商级别的且只读。它是根据本地身份验证配置文件元数据、环境标记、配置的提供商密钥、本地提供商标记、AWS Bedrock 环境/配置文件标记以及插件合成身份验证元数据计算得出的；它不会加载提供商运行时、读取钥匙串机密、调用提供商 API 或证明每个模型的确切执行就绪状态。
- `models list --all --provider <id>` 可以包含来自插件清单或捆绑提供商目录元数据的提供商拥有的静态目录行，即使您尚未通过该提供商的身份验证。在配置匹配的身份验证之前，这些行仍显示为不可用。
- 当提供商目录发现缓慢时，`models list` 保持控制平面的响应性。默认和配置视图在短暂等待后会回退到配置的或合成的模型行，并让发现过程在后台完成。当您需要确切完整的已发现目录并愿意等待提供商发现时，请使用 `--all`。
- 广泛的 `models list --all` 在不加载提供商运行时补充挂钩的情况下，将清单目录行合并到注册表行之上。提供商过滤的清单快速路径仅使用标记为 `static` 的提供商；标记为 `refreshable` 的提供商保持由注册表/缓存支持，并将清单行作为附加内容，而标记为 `runtime` 的提供商则保持在注册表/运行时发现状态。
- `models list` 将原生模型元数据和运行时上限区分开来。在表格输出中，当有效的运行时上限与原生上下文窗口不同时，`Ctx` 会显示 `contextTokens/contextWindow`；当提供商暴露该上限时，JSON 行包含 `contextTokens`。
- `models list --provider <id>` 按提供商 ID 过滤，例如 `moonshot` 或
  `openai`。它不接受交互式提供商
  选择器中的显示标签，例如 `Moonshot AI`。
- 模型引用通过按 **第一个** `/` 分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会首先将输入解析为别名，然后
  解析为该确切模型 ID 的唯一已配置提供商匹配项，仅在此之后
  才回退到配置的默认提供商并显示弃用警告。
  如果该提供商不再暴露配置的默认模型，OpenClaw
  将回退到第一个配置的提供商/模型，而不是显示
  陈旧的已移除提供商默认值。
- `models status` 可能会在身份验证输出中针对非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`）显示 `marker(<value>)`，而不是将其作为机密进行掩码处理。

### 模型扫描

`models scan` 读取 OpenRouter 的公共 `:free` 目录，并对回退使用的候选进行排名。目录本身是公开的，因此仅限元数据的扫描不需要 OpenRouter 密钥。

默认情况下，OpenClaw 会尝试通过实时模型调用探测工具和图像支持。如果未配置 OpenRouter 密钥，该命令将回退到仅限元数据的输出，并说明 `:free` 模型仍需要 `OPENROUTER_API_KEY` 才能进行探测和推理。

选项：

- `--no-probe`（仅元数据；不查找配置/机密）
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

`--set-default` 和 `--set-image` 需要实时探测；仅限元数据的扫描结果仅供参考，不会应用于配置。

### 模型状态

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（对已配置的身份验证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`）

`--json` 将 stdout 保留用于 JSON 负载。Auth-profile、提供商
和启动诊断信息被路由到 stderr，以便脚本可以将 stdout 直接通过管道
传输到 `jq` 等工具中。

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

- `excluded_by_auth_order`：存在存储的配置文件，但显式
  `auth.order.<provider>` 将其省略，因此探测报告会报告排除项而不是
  尝试使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置文件存在但不符合资格/无法解析。
- `no_model`：提供商身份验证存在，但 OpenClaw 无法为该提供商解析
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
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式身份验证助手。它可以根据您选择
的提供商启动提供商身份验证流程（OAuth/API 密钥）或引导您手动粘贴令牌。

`models auth list`APIOAuth 列出所选代理的已保存身份验证配置文件，
而不打印令牌、API 密钥或 OAuth 密钥材料。使用 `--provider <id>`
过滤到某个提供商，例如 `openai`，并使用 `--json` 进行脚本编写。

`models auth login` 运行提供商插件的认证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看安装了哪些提供商。
使用 `openclaw models auth --agent <id> <subcommand>` 将认证结果写入
特定配置的代理存储。父级 `--agent` 标志被
`add`、`list`、`login`、`paste-api-key`、`setup-token`、`paste-token` 和
`login-github-copilot` 遵守。

对于 OpenAI 模型，OpenAI`--provider openai` 默认为 ChatGPT/Codex 帐户登录。
仅当您想添加 OpenAI API 密钥配置文件时，才使用 `--method api-key`OpenAIAPI，
通常作为 Codex 订阅限制的备用。运行 `openclaw doctor --fix`OpenAI
将较旧的旧版 OpenAI Codex 前缀身份验证/配置文件状态迁移到 `openai`。

示例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
```

注：

- 对于在登录期间支持命名
  配置文件的提供商，`login` 接受 `--profile-id <id>`。使用此选项可将同一提供商的
  多个登录分开。
- `paste-api-key`API 接受在其他地方生成的 API 密钥，提示输入密钥
  值，并将其写入默认配置文件 ID `<provider>:manual`，除非您
  传递 `--profile-id`。在自动化中，通过 stdin 传递密钥，例如
  `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`。
- `setup-token` 和 `paste-token` 仍然是针对暴露令牌身份验证方法的提供商的
  通用令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌身份验证
  方法（当提供商暴露
  此类方法时，默认为该提供商的 `setup-token` 方法）。
- `paste-token` 接受在其他地方或从自动化生成的令牌字符串。
- `paste-token` 需要 `--provider`，默认情况下会提示输入 token 值，
  并将其写入默认的配置文件 ID `<provider>:manual`，除非您传递
  `--profile-id`。
- 在自动化中，请通过 stdin 管道传递令牌，而不是将其作为参数传递，以便
  提供商凭据不会出现在 Shell 历史记录或进程列表中。
- `paste-token --expires-in <duration>` 存储来自相对持续时间（例如 `365d` 或 `12h`）的绝对 token 过期时间。
- 对于 `openai`OpenAIAPIOAuth，OpenAI API 密钥和 ChatGPT/OAuth token 材质是
  不同的认证形态。使用 `paste-api-key` 设置 `sk-...`OpenAIAPI OpenAI API 密钥，
  并仅对 token 认证材质使用 `paste-token`。
- Anthropic 说明：Anthropic 工作人员告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，OpenClaw 将 Claude CLI 重用和 AnthropicAnthropicOpenClawCLIOpenClawCLI`claude -p`Anthropic 使用视为本集成的许可方式。
- Anthropic Anthropic`setup-token` / `paste-token`OpenClawOpenClawCLI 仍然作为受支持的 OpenClaw token 路径可用，但如果可用，OpenClaw 现在更倾向于 Claude CLI 重用和 `claude -p`。

## 相关

- [CLI 参考](CLI/en/cli)
- [模型选择](/zh/concepts/model-providers)
- [模型故障转移](/zh/concepts/model-failover)
