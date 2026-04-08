---
summary: "在 OpenClaw 中通过 Anthropic 使用 API Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 构建了 **Claude** 模型系列，并通过 API 提供访问。
在 OpenClaw 中，新的 Anthropic 设置应使用 API 密钥。现有的旧版
Anthropic 令牌配置文件如果已经配置，在运行时仍然有效。

<Warning>
对于 Anthropic 中的 OpenClaw，计费分摊如下：

- **Anthropic API 密钥**：正常的 Anthropic API 计费。
- **OpenClaw 内部的 Claude 订阅身份验证**：Anthropic 于
  **2026 年 4 月 4 日太平洋时间中午 12 点 / 英国夏令时晚上 8 点** 通知 OpenClaw 用户，
  这被视为第三方工具使用，需要 **额外使用量**（按量付费，
  与订阅分开计费）。

我们的本地复现结果与该分摊情况相符：

- 直接使用 `claude -p` 可能仍然有效
- 当提示识别出 OpenClaw 时，`claude -p --append-system-prompt ...` 可能会触发额外使用量防护
- 在 OpenClaw SDK + `ANTHROPIC_API_KEY` 路径上，相同的类 Anthropic 系统提示 **不会** 产生拦截

因此实用的规则是：**使用 Anthropic API 密钥，或带有额外使用量的 Claude 订阅**。如果您希望拥有最清晰的生产环境路径，请使用 Anthropic API
密钥。

Anthropic 当前的公共文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概述](https://platform.claude.com/docs/en/agent-sdk/overview)

- [在 Pro 或 Max 计划中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [在 Team 或 Enterprise 计划中使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

如果您希望拥有最清晰的计费路径，请改用 Anthropic API 密钥。
OpenClaw 也支持其他订阅式选项，包括 [OpenAI
Codex](/en/providers/openai)、[Qwen 云编码计划](/en/providers/qwen)、
[MiniMax 编码计划](/en/providers/minimax) 和 [Z.AI / GLM 编码
计划](/en/providers/glm)。

</Warning>

## 选项 A：Anthropic API 密钥

**最适用于：** 标准 API 访问和基于使用量的计费。
在 API 控制台中创建您的 Anthropic 密钥。

### CLI 设置

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Anthropic 配置片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Thinking 默认值 (Claude 4.6)

- 当未设置显式的思考级别时，Anthropic Claude 4.6 模型在 OpenClaw 中默认为 `adaptive` 思考模式。
- 您可以针对每条消息 (`/think:<level>`) 或在模型参数中进行覆盖：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相关的 Anthropic 文档：
  - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共享 `/fast` 切换开关也支持直接面向公网的 Anthropic 流量，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 认证请求。

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

- OpenClaw 仅针对直接的 `api.anthropic.com` 请求注入 Anthropic 服务层级。如果您通过代理或网关路由 `anthropic/*`，`/fast` 将不会触及 `service_tier`。
- 显式的 Anthropic `serviceTier` 或 `service_tier` 模型参数将在两者均设置时覆盖 `/fast` 的默认值。
- Anthropic 在响应的 `usage.service_tier` 字段中报告有效层级。对于没有优先层级容量的账户，`service_tier: "auto"` 可能仍会解析为 `standard`。

## 提示词缓存 (Anthropic API)

OpenClaw 支持 Anthropic 的提示词缓存功能。此功能**仅限 API**；传统的 Anthropic 令牌认证不遵循缓存设置。

### 配置

在您的模型配置中使用 `cacheRetention` 参数：

| 值      | 缓存时长 | 描述                 |
| ------- | -------- | -------------------- |
| `none`  | 无缓存   | 禁用提示词缓存       |
| `short` | 5 分钟   | API 密钥认证的默认值 |
| `long`  | 1 小时   | 扩展缓存             |

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

### Per-agent cacheRetention overrides

使用模型级参数作为基线，然后通过 `agents.list[].params` 覆盖特定代理。

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

缓存相关参数的配置合并顺序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` （匹配 `id`，按键覆盖）

这使得一个 Agent 可以保持长驻缓存，而同一模型上的另一个 Agent 可以禁用缓存，以避免突发/低复用流量的写入成本。

### Bedrock Claude 说明

- Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置时接受 `cacheRetention` 直通。
- 非 Anthropic 的 Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`。
- Anthropic API 密钥的智能默认值也会在未设置显式值时为 Bedrock 上的 Claude 模型引用设定 `cacheRetention: "short"` 种子。

## 1M 上下文窗口（Anthropic Beta）

Anthropic 的 1M 上下文窗口处于 Beta 限制。在 OpenClaw 中，请为支持的 Opus/Sonnet 模型使用 `params.context1m: true` 逐个模型启用它。

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

仅当为该模型将 `params.context1m` 显式设置为 `true` 时，才会激活此功能。

要求：Anthropic 必须允许在该凭据上使用长上下文（通常是 API 密钥计费，或者启用了额外使用量的 OpenClaw Claude 登录路径/旧版令牌认证）。否则 Anthropic 将返回：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：当使用旧版 Anthropic 令牌认证（`sk-ant-oat-*`）时，Anthropic 目前会拒绝 `context-1m-*` Beta 请求。如果您使用该旧版认证模式配置 `context1m: true`，OpenClaw 将记录警告并通过跳过 context1m beta 标头同时保留所需的 OAuth Beta，回退到标准上下文窗口。

## 已移除：Claude CLI 后端

捆绑的 Anthropic `claude-cli` 后端已被移除。

- Anthropic 2026 年 4 月 4 日的通知指出，OpenClaw 驱动的 Claude 登录流量属于第三方工具使用，并且需要**额外使用量 (Extra Usage)**。
- 我们的本地复现也表明，当附加的提示识别出 OpenClaw 时，直接的 `claude -p --append-system-prompt ...` 也可能遇到相同的防护。
- 相同的类 OpenClaw 系统提示在 Anthropic SDK + `ANTHROPIC_API_KEY` 路径上不会遇到该防护。
- 在 OpenClaw 中，针对 Anthropic 流量请使用 Anthropic API 密钥。

## 注意

- Anthropic 的公开 Claude Code 文档仍然记录了直接的 CLI 用法，例如 `claude -p`，但 Anthropic 给 OpenClaw 用户的单独通知指出，**OpenClaw** 的 Claude 登录路径属于第三方工具使用，需要支付 **Extra Usage**（按使用量计费，与订阅分开计费）。我们的本地复现也表明，当附加的提示词识别出 OpenClaw 时，直接的 `claude -p --append-system-prompt ...` 可能会遇到同样的拦截，而同样的提示词结构在 Anthropic SDK + `ANTHROPIC_API_KEY` 路径上则不会重现此问题。对于生产环境，我们建议改用 Anthropic API 密钥。
- Anthropic 设置令牌在 OpenClaw 中作为旧版/手动路径再次可用。Anthropic 针对特定于 OpenClaw 的计费通知仍然适用，因此请在使用时预期 Anthropic 会对此路径收取 **Extra Usage** 费用。
- 身份验证详细信息 + 重用规则请参阅 [/concepts/oauth](/en/concepts/oauth)。

## 故障排除

**401 错误 / 令牌突然失效**

- 旧版 Anthropic 令牌身份验证可能会过期或被吊销。
- 对于新设置，请迁移到 Anthropic API 密钥。

**未找到提供商 "anthropic" 的 API 密钥**

- 身份验证是**按代理进行的**。新代理不会继承主代理的密钥。
- 为该代理重新运行新手引导，或者在网关主机上配置 API 密钥，然后使用 `openclaw models status` 进行验证。

**未找到配置文件 `anthropic:default` 的凭据**

- 运行 `openclaw models status` 以查看当前处于活动状态的身份验证配置文件。
- 重新运行新手引导，或者为该配置文件路径配置 API 密钥。

**没有可用的身份验证配置文件（全部处于冷却/不可用状态）**

- 检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- Anthropic 的速率限制冷却可能是特定于模型的，因此即使当前模型正在冷却，其同级 Anthropic 模型可能仍然可用。
- 添加另一个 Anthropic 配置文件或等待冷却结束。

更多信息：[/gateway/故障排除](/en/gateway/troubleshooting) 和 [/help/faq](/en/help/faq)。
