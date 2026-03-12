---
summary: "在 OpenClaw 中通过 API 密钥或 setup-token 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
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

### 配置片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Thinking 默认值 (Claude 4.6)

- 在未设置显式思考级别时，OpenClaw 中的 Anthropic Claude 4.6 模型默认使用 `adaptive` 思考模式。
- 您可以按消息（`/think:<level>`）或在模型参数中进行覆盖：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相关的 Anthropic 文档：
  - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共享 `/fast` 开关也支持直接使用 Anthropic API 密钥的流量。

- `/fast on` 映射到 `service_tier: "auto"`
- `/fast off` 映射到 `service_tier: "standard_only"`
- 配置默认值：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

重要限制：

- 这**仅限 API 密钥**。Anthropic setup-token / OAuth 身份验证不支持 OpenClaw 快速模式层级注入。
- OpenClaw 仅针对直接 `api.anthropic.com` 请求注入 Anthropic 服务层级。如果您通过代理或网关路由 `anthropic/*`，`/fast` 将保持 `service_tier` 不变。
- Anthropic 会在响应中的 `usage.service_tier` 下报告有效层级。对于没有优先级层级容量的账户，`service_tier: "auto"` 仍可能解析为 `standard`。

## 提示词缓存（Anthropic API）

OpenClaw 支持 Anthropic 的提示词缓存功能。此功能**仅限 API**；订阅认证不会遵循缓存设置。

### 配置

在您的模型配置中使用 `cacheRetention` 参数：

| 值      | 缓存持续时间   | 描述                                 |
| ------- | -------------- | ----------------------------------- |
| `none`  | 无缓存        | 禁用提示缓存                         |
| `short` | 5 分钟         | API 密钥认证的默认值                   |
| `long`  | 1 小时         | 扩展缓存（需要 beta 标志）             |

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

当使用 Anthropic API 密钥认证时，OpenClaw 会自动为所有 Anthropic 模型应用 `cacheRetention: "short"`（5 分钟缓存）。您可以通过在配置中显式设置 `cacheRetention` 来覆盖此设置。

### 每个代理的 cacheRetention 覆盖设置

使用模型级参数作为基准，然后通过 `agents.list[].params` 覆盖特定的代理。

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

这让一个代理可以保持长期缓存，而同一模型上的另一个代理则禁用缓存，以避免在突发/低复用流量上产生写入成本。

### Bedrock Claude 注意事项

- Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置后接受 `cacheRetention` 透传。
- 非 Anthropic Bedrock 模型在运行时被强制 `cacheRetention: "none"`。
- Anthropic API 密钥智能默认值还会在未设置显式值时为 Bedrock 上的 Claude 模型引用设定 `cacheRetention: "short"` 种子值。

### 旧版参数

为了向后兼容，仍支持较旧的 `cacheControlTtl` 参数：

- `"5m"` 映射到 `short`
- `"1h"` 映射到 `long`

我们建议迁移到新的 `cacheRetention` 参数。

OpenClaw 包含用于 Anthropic API
请求的 `extended-cache-ttl-2025-04-11` beta 标志；如果您覆盖提供商标头（请参阅 [/gateway/configuration](/zh/en/gateway/configuration)），请保留它。

## 1M 上下文窗口

Anthropic 的 1M 上下文窗口处于 beta 封测阶段。在 OpenClaw 中，可以通过 `params.context1m: true` 为支持的 Opus/Sonnet 模型逐个启用它。

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

OpenClaw 会将其映射到 Anthropic
请求上的 `anthropic-beta: context-1m-2025-08-07`。

仅当该模型的 `params.context1m` 被明确设置为 `true` 时，
此功能才会激活。

要求：Anthropic 必须允许该凭据使用长上下文
（通常是 API key 计费，或已启用 Extra Usage 的订阅账户）。否则 Anthropic 将返回：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：Anthropic 目前会在使用 OAuth/订阅令牌 (`sk-ant-oat-*`) 时拒绝 `context-1m-*` beta 请求。OpenClaw 会自动跳过 OAuth 认证的 context1m beta 标头，并保留所需的 OAuth betas。

## 选项 B：Claude setup-token

**最适合：** 使用您的 Claude 订阅。

### 在哪里获取 setup-token

Setup-token 由 **Claude Code CLI** 创建，而非 Anthropic Console。您可以在 **任何机器** 上运行此命令：

```bash
claude setup-token
```

将令牌粘贴到 OpenClaw 中（向导：**Anthropic token (paste setup-token)**），或在网关主机上运行它：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您在不同的机器上生成了令牌，请将其粘贴：

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI 设置 (setup-token)

```bash
# Paste a setup-token during onboarding
openclaw onboard --auth-choice setup-token
```

### 配置代码片段 (setup-token)

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 注意

- 使用 `claude setup-token` 生成 setup-token 并粘贴它，或在网关主机上运行 `openclaw models auth setup-token`。
- 如果您在 Claude 订阅上看到“OAuth token refresh failed …”，请使用 setup-token 重新进行身份验证。请参阅 [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/zh/en/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- 身份验证详情和重用规则位于 [/concepts/oauth](/zh/en/concepts/oauth)。

## 故障排除

**401 错误 / 令牌突然失效**

- Claude 订阅身份验证可能会过期或被撤销。请重新运行 `claude setup-token`
  并将其粘贴到 **网关主机** 中。
- 如果 Claude CLI 登录位于另一台机器上，请在网关主机上使用
  `openclaw models auth paste-token --provider anthropic`。

**未找到提供商 "anthropic" 的 API 密钥**

- 身份验证是**按代理（per agent）**进行的。新代理不会继承主代理的密钥。
- 重新运行该代理的入职流程，或在网关主机上粘贴 setup-token / API 密钥，
然后使用 `openclaw models status` 进行验证。

**未找到配置文件 `anthropic:default` 的凭据**

- 运行 `openclaw models status` 以查看当前活动的身份验证配置文件。
- 重新运行入职流程，或为该配置文件粘贴 setup-token / API 密钥。

**没有可用的身份验证配置文件（全部处于冷却/不可用状态）**

- 检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- 添加另一个 Anthropic 配置文件或等待冷却结束。

更多信息：[/gateway/troubleshooting](/zh/gateway/troubleshooting) 和 [/help/faq](/zh/help/faq)。
