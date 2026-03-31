---
summary: "在 Anthropic 中通过 API 密钥、setup-token 或 Claude CLI 使用 OpenClaw Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
  - You want to reuse Claude CLI subscription auth on the gateway host
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 构建了 **Claude** 模型系列，并通过 API 提供访问。
在 OpenClaw 中，您可以使用 API 密钥或 **setup-token** 进行身份验证。

## 选项 A：Anthropic API 密钥

**最适用于：** 标准 API 访问和按使用量计费。
请在 Anthropic 控制台中创建您的 API 密钥。

### CLI 设置

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Claude CLI 配置代码片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Thinking 默认值 (Claude 4.6)

- 当未明确设置思考级别时，Anthropic Claude 4.6 模型在 OpenClaw 中默认为 `adaptive` thinking。
- 您可以在模型参数中逐条消息（`/think:<level>`）覆盖或进行全局设置：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相关 Anthropic 文档：
  - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共享 `/fast` 切换开关也支持直接的 Anthropic API 密钥流量。

- `/fast on` 映射到 `service_tier: "auto"`
- `/fast off` 映射到 `service_tier: "standard_only"`
- 配置默认值：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-6": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

重要限制：

- 这**仅限 API 密钥**。Anthropic setup-token / OAuth 身份验证不支持 OpenClaw 快速模式层级注入。
- OpenClaw 仅针对直接的 `api.anthropic.com` 请求注入 Anthropic 服务层级。如果您通过代理或网关路由 `anthropic/*`，`/fast` 将保持 `service_tier` 不变。
- Anthropic 在响应的 `usage.service_tier` 字段下报告有效层级。在不具备优先级层级的账户上，`service_tier: "auto"` 可能仍会解析为 `standard`。

## 提示词缓存（Anthropic API）

OpenClaw 支持 Anthropic 的提示词缓存功能。此功能**仅限 API**；订阅认证不会遵循缓存设置。

### 配置

在您的模型配置中使用 `cacheRetention` 参数：

| 值      | 缓存持续时间 | 描述                       |
| ------- | ------------ | -------------------------- |
| `none`  | 无缓存       | 禁用提示词缓存             |
| `short` | 5 分钟       | API 密钥认证的默认值       |
| `long`  | 1 小时       | 扩展缓存（需要 beta 标志） |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### 默认值

当使用 Anthropic API 密钥身份验证时，OpenClaw 会自动为所有 Anthropic 模型应用 `cacheRetention: "short"`（5 分钟缓存）。您可以通过在配置中显式设置 `cacheRetention` 来覆盖此设置。

### 按代理覆盖 cacheRetention

将模型级参数作为基准，然后通过 `agents.list[].params` 覆盖特定代理。

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" }, // baseline for most agents
        },
      },
    },
    list: [
      { id: "research", default: true },
      { id: "alerts", params: { cacheRetention: "none" } }, // override for this agent only
    ],
  },
}
```

与缓存相关的参数的配置合并顺序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（匹配 `id`，按键覆盖）

这允许一个代理保持长生命周期缓存，而同一模型上的另一个代理则禁用缓存，以避免在突发/低复用流量上产生写入成本。

### Bedrock Claude 说明

- Bedrock (`amazon-bedrock/*anthropic.claude*`) 上的 Anthropic Claude 模型在配置时接受 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型在运行时被强制设置为 `cacheRetention: "none"`。
- Anthropic API 密钥的智能默认值还会为 Claude-on-Bedrock 模型引用设定 `cacheRetention: "short"`，当没有设置显式值时。

### 旧版参数

较旧的 `cacheControlTtl` 参数仍受支持以保持向后兼容性：

- `"5m"` 映射到 `short`
- `"1h"` 映射到 `long`

我们建议迁移到新的 `cacheRetention` 参数。

OpenClaw 在 Anthropic API 请求中包含 `extended-cache-ttl-2025-04-11` beta 标志；如果您覆盖提供商标头（请参阅 [/gateway/configuration](/en/gateway/configuration)），请保留它。

## 1M 上下文窗口 (Anthropic beta)

Anthropic 的 1M 上下文窗口处于 beta 限制阶段。在 OpenClaw 中，为受支持的 Opus/Sonnet 模型通过 `params.context1m: true` 逐个模型启用它。

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { context1m: true },
        },
      },
    },
  },
}
```

OpenClaw 将此映射到 Anthropic 请求上的 `anthropic-beta: context-1m-2025-08-07`。

仅当为该模型显式将 `params.context1m` 设置为 `true` 时，此功能才会激活。

要求：Anthropic 必须允许该凭据使用长上下文（通常是 API 密钥计费，或启用了额外使用量的订阅帐户）。否则 Anthropic 将返回：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：当使用 OAuth/订阅令牌 (`sk-ant-oat-*`) 时，Anthropic 目前会拒绝 `context-1m-*` beta 请求。OpenClaw 会自动跳过 OAuth 身份验证的 context1m beta 标头，并保留所需的 OAuth betas。

## 选项 B：使用 Claude CLI 作为消息提供商

**最适合：** 已安装 Claude CLI 并使用 Claude 订阅登录的单用户网关主机。

此路径使用本地 `claude` 二进制文件进行模型推理，而不是直接调用 Anthropic API。OpenClaw 将其视为 **CLI 后端提供商**，其模型引用如下所示：

- `claude-cli/claude-sonnet-4-6`
- `claude-cli/claude-opus-4-6`

工作原理：

1. OpenClaw 在 **网关
   主机** 上启动 `claude -p --output-format json ...`。
2. 第一轮对话发送 `--session-id <uuid>`。
3. 后续轮次通过 `--resume <sessionId>` 重用存储的 Claude 会话。
4. 您的聊天消息仍然通过正常的 OpenClaw 消息管道，但
   实际模型回复由 Claude CLI 生成。

### 要求

- 网关主机上安装了 Claude CLI 且在 PATH 中可用，或配置
  了绝对命令路径。
- Claude CLI 已在同一主机上进行身份验证：

```bash
claude auth status
```

- 当您的配置明确引用 `claude-cli/...` 或 `claude-cli` 后端配置时，
  OpenClaw 会在网关启动时自动加载捆绑的 Anthropic 插件。

### 配置代码片段

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "claude-cli/claude-sonnet-4-6",
      },
      models: {
        "claude-cli/claude-sonnet-4-6": {},
      },
      sandbox: { mode: "off" },
    },
  },
}
```

如果网关主机的 PATH 中没有 `claude` 二进制文件：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

### 您将获得

- 复用本地 CLI 的 Claude 订阅身份验证
- 正常的 OpenClaw 消息/会话路由
- 跨轮次的 Claude CLI 会话连续性

### 从 Anthropic 身份验证迁移到 Claude CLI

如果您当前使用带有 setup-token 或 API 密钥的 `anthropic/...` 并希望
将同一网关主机切换到 Claude CLI：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

或者在新手引导中：

```bash
openclaw onboard --auth-choice anthropic-cli
```

作用如下：

- 验证 Claude CLI 已在网关主机上登录
- 将默认模型切换为 `claude-cli/...`
- 将 Anthropic 默认模型回退（如 `anthropic/claude-opus-4-6`）
  重写为 `claude-cli/claude-opus-4-6`
- 向 `agents.defaults.models` 添加匹配的 `claude-cli/...` 条目

它**不**做的是：

- 删除您现有的 Anthropic 身份验证配置文件
- 删除主默认模型/允许列表路径之外的每个旧 `anthropic/...` 配置引用

这使得回滚变得简单：如果需要，将默认模型改回 `anthropic/...`。

### 重要限制

- 这**不是** Anthropic API 提供商。它是本地 CLI 运行时。
- 对于 OpenClaw 后端运行，工具在 CLI 端被禁用。
- 文本输入，文本输出。没有 OpenClaw 流式传输切换。
- 最适合个人网关主机，而不是共享的多用户计费设置。

更多详情：[/gateway/cli-backends](/en/gateway/cli-backends)

## 选项 C：Claude setup-token

**最适用于：** 使用您的 Claude 订阅。

### 在哪里获取 setup-token

Setup-token 由 **Claude Code CLI** 创建，而不是 Anthropic 控制台。您可以在**任何机器**上运行此命令：

```bash
claude setup-token
```

将令牌粘贴到 OpenClaw（向导：**Anthropic 令牌（粘贴 setup-token）**）中，或在网关主机上运行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在另一台机器上生成的令牌，请将其粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI 设置（setup-token）

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### 配置片段（setup-token）

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 注意

- 使用 `claude setup-token` 生成 setup-token 并将其粘贴，或者在网关主机上运行 `openclaw models auth setup-token`。
- 如果您在 Claude 订阅上看到“OAuth 令牌刷新失败 ...”，请使用 setup-token 重新进行身份验证。请参阅 [/gateway/故障排除](/en/gateway/troubleshooting)。
- 身份验证详细信息 + 重用规则位于 [/concepts/oauth](/en/concepts/oauth)。

## 故障排除

**401 错误 / 令牌突然无效**

- Claude 订阅身份验证可能会过期或被撤销。请重新运行 `claude setup-token` 并将其粘贴到**网关主机**中。
- 如果 Claude CLI 登录位于另一台机器上，请在网关主机上使用
  `openclaw models auth paste-token --provider anthropic`。

**未找到提供商 "anthropic" 的 API 密钥**

- 身份验证是**针对每个代理**的。新代理不会继承主代理的密钥。
- 为该代理重新运行新手引导，或者在网关主机上粘贴 setup-token / API 密钥，然后使用 `openclaw models status` 进行验证。

**未找到配置文件 `anthropic:default` 的凭据**

- 运行 `openclaw models status` 以查看哪个身份验证配置文件处于活动状态。
- 重新运行新手引导，或者为该配置文件粘贴 setup-token / API 密钥。

**没有可用的身份验证配置文件（全部处于冷却/不可用状态）**

- 检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- 添加另一个 Anthropic 配置文件或等待冷却结束。

更多信息：[/gateway/故障排除](/en/gateway/troubleshooting) 和 [/help/faq](/en/help/faq)。
