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

- 提供商 + 模型：[Models](/zh/providers/models)
- 模型选择概念 + `/models` 斜杠命令：[Models concept](/zh/concepts/models)
- 提供商认证设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认值/回退机制以及身份验证概览。
当提供商使用快照可用时，OAuth/API-key 状态部分包括
提供商使用窗口和配额快照。
当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。使用身份验证在可用时来自特定于提供商的钩子；
否则，OpenClaw 回退到从身份验证配置文件、env 或 config 中匹配 OAuth/API-key
凭据。
在 `--json` 输出中，`auth.providers` 是感知 env/config/store 的提供商
概览，而 `auth.oauth` 仅是 auth-store 配置文件运行状况。
添加 `--probe` 以对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 以检查配置的代理的模型/身份验证状态。如果省略，
该命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。
探测行可以来自身份验证配置文件、env 凭据或 `models.json`。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list` 是只读的：它读取配置、认证配置文件、现有的目录
  状态以及提供商拥有的目录行，但不会重写
  `models.json`。
- `models list --all --provider <id>` 可以包含来自插件清单或捆绑提供商目录元数据的提供商拥有的静态目录
  行，即使您尚未通过该提供商进行身份验证。在配置匹配的认证之前，这些行仍显示为
  不可用。
- `models list` 将原生模型元数据和运行时上限区分开来。在表格
  输出中，当有效的运行时
  上限与原生上下文窗口不同时，`Ctx` 会显示 `contextTokens/contextWindow`；当提供商公开该上限时，JSON 行将包含 `contextTokens`
  。
- `models list --provider <id>` 按提供商 ID 进行过滤，例如 `moonshot` 或
  `openai-codex`。它不接受来自交互式提供商
  选择器的显示标签，例如 `Moonshot AI`。
- 模型引用通过在 **第一个** `/` 处分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会首先将输入解析为别名，然后
  解析为该确切模型 ID 的唯一已配置提供商匹配项，只有在这之后
  才会回退到配置的默认提供商，并显示弃用警告。
  如果该提供商不再公开配置的默认模型，OpenClaw
  将回退到第一个配置的提供商/模型，而不是显示
  过时的已移除提供商默认值。
- `models status` 可能会在身份验证输出中为非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`）显示 `marker(<value>)`，而不是像机密一样将其掩码。

### 模型扫描

`models scan` 读取 OpenRouter 的公共 `:free` 目录并排名用于回退用途的候选者。目录本身是公开的，因此仅元数据扫描不需要 OpenRouter 密钥。

默认情况下，OpenClaw 尝试通过实时模型调用来探测工具和图像支持。如果未配置 OpenRouter 密钥，该命令将回退到仅元数据输出，并解释 `:free` 模型仍需 `OPENROUTER_API_KEY` 才能进行探测和推理。

选项：

- `--no-probe`（仅元数据；不查找配置/机密）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目录请求和每次探测超时）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要实时探测；仅元数据扫描结果仅供参考，不会应用于配置。

### 模型状态

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（实时探测已配置的身份验证配置文件）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

探测状态分组：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期会遇到的探测详情/原因代码情况：

- `excluded_by_auth_order`：存在已存储的配置文件，但显式的
  `auth.order.<provider>` 将其省略，因此探测会报告排除情况，而不是
  尝试使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置文件存在但不符合条件/无法解析。
- `no_model`：提供商身份验证存在，但OpenClaw无法为该提供商解析出可探测的
  模型候选。

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式身份验证助手。它可以启动提供商身份验证
流程（OAuth/API 密钥）或引导您手动粘贴令牌，具体取决于您
选择的提供商。

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看安装了哪些提供商。
使用 `openclaw models auth --agent <id> <subcommand>` 将身份验证结果写入
特定的已配置代理存储。父级 `--agent` 标志被
`add`、`login`、`setup-token`、`paste-token` 和 `login-github-copilot` 遵守。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

备注：

- `setup-token` 和 `paste-token` 仍然是针对暴露令牌身份验证
  方法的提供商的通用令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌身份验证
  方法（当提供商暴露该方法时，默认为该提供商的 `setup-token` 方法）。
- `paste-token` 接受在别处生成或来自自动化的令牌字符串。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其
  写入默认配置文件 ID `<provider>:manual`，除非您传递
  `--profile-id`。
- `paste-token --expires-in <duration>` 存储基于相对时长（例如 `365d` 或 `12h`）计算出的绝对令牌过期时间。
- Anthropic 注：Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次获得允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将此集成中复用 Claude CLI 和 `claude -p` 的使用视为已获授权。
- Anthropic `setup-token` / `paste-token` 仍作为受支持的 OpenClaw 令牌路径可用，但如果可用，OpenClaw 现在优先考虑复用 Claude CLI 和 `claude -p`。

## 相关

- [CLI 参考](/zh/cli)
- [模型选择](/zh/concepts/model-providers)
- [模型故障转移](/zh/concepts/model-failover)
