---
summary: "在 OpenClaw 中通过 API 密钥或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 构建了 **Claude** 模型系列，并通过 API 和
Claude CLI 提供访问。在 OpenClaw 中，同时支持 Anthropic API 密钥和 Claude CLI 的复用。如果已配置现有的旧版 Anthropic 令牌配置文件，系统在运行时仍会予以支持。

<Warning>
Anthropic 工作人员告知我们，允许再次使用 OpenClaw 风格的 Claude CLI，因此
除非 OpenClaw 发布新政策，否则 CLI 将 Claude Anthropic 的复用和 `claude -p` 的使用视为针对此集成已获批准。

对于长期运行的网关主机，Anthropic API 密钥仍然是最清晰且
最可预测的生产环境路径。如果您已在主机上使用 Claude CLI，
OpenClaw 可以直接复用该登录。

Anthropic 当前的公共文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概述](https://platform.claude.com/docs/en/agent-sdk/overview)

- [使用 Pro 或 Max 计划使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [使用 Team 或 Enterprise 计划使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

如果您希望拥有最清晰的计费路径，请改用 Anthropic API 密钥。
OpenClaw 还支持其他订阅式选项，包括 [OpenAI
Codex](/en/providers/openai)、[Qwen Cloud Coding Plan](/en/providers/qwen)、
[MiniMax Coding Plan](/en/providers/minimax) 和 [Z.AI / GLM Coding
Plan](/en/providers/glm)。

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

- 在 Anthropic 中，当未设置显式思考级别时，OpenClaw Claude 4.6 模型默认使用 `adaptive` 思考模式。
- 您可以针对每条消息（`/think:<level>`）或在模型参数中进行覆盖：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相关的 Anthropic 文档：
  - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共享 `/fast` 切换开关也支持直接面向公共 Anthropic 的流量，包括发送到 `api.anthropic.com` 的 API 密钥和 OAuth 认证请求。

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

- OpenClaw 仅针对直接的 `api.anthropic.com` 请求注入 Anthropic 服务层级。如果您通过代理或网关路由 `anthropic/*`，`/fast` 将保持 `service_tier` 不变。
- 当两者均已设置时，显式的 Anthropic `serviceTier` 或 `service_tier` 模型参数将覆盖 `/fast` 的默认值。
- Anthropic 在响应中的 `usage.service_tier` 下报告有效层级。在没有优先级层级容量的账户上，`service_tier: "auto"` 可能仍然解析为 `standard`。

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

使用 Anthropic API 密钥身份验证时，OpenClaw 会自动为所有 Anthropic 模型应用 `cacheRetention: "short"`（5 分钟缓存）。您可以通过在配置中显式设置 `cacheRetention` 来覆盖此设置。

### Per-agent cacheRetention overrides

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

缓存相关参数的配置合并顺序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（匹配 `id`，按键覆盖）

这使得一个 Agent 可以保持长驻缓存，而同一模型上的另一个 Agent 可以禁用缓存，以避免突发/低复用流量的写入成本。

### Bedrock Claude 说明

- Bedrock (`amazon-bedrock/*anthropic.claude*`) 上的 Anthropic Claude 模型在配置后接受 `cacheRetention` 透传。
- 非 Anthropic 的 Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`。
- Anthropic API 密钥的智能默认值也会在未设置显式值时，为 Bedrock 上的 Claude 模型引用设定 `cacheRetention: "short"` 种子。

## 1M 上下文窗口（Anthropic Beta）

Anthropic 的 1M 上下文窗口目前处于 Beta 封锁状态。在 OpenClaw 中，可以通过 `params.context1m: true` 为支持的 Opus/Sonnet 模型逐个启用。

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

OpenClaw 将其映射到 Anthropic 请求上的 `anthropic-beta: context-1m-2025-08-07`。

仅当 `params.context1m` 被显式设置为 `true` 时，此功能才会激活。

要求：Anthropic 必须允许该凭据使用长上下文。

注意：在使用传统的 Anthropic 令牌身份验证（`sk-ant-oat-*`）时，Anthropic 目前会拒绝 `context-1m-*` beta 请求。如果您使用该传统身份验证模式配置 `context1m: true`，OpenClaw 将记录警告并通过跳过 context1m beta 标头来回退到标准上下文窗口，同时保留必需的 OAuth beta。

## Claude CLI 后端

Anthropic 支持捆绑的 OpenClaw `claude-cli` 后端。

- Anthropic 员工告诉我们，这种用法再次被允许。
- 因此，除非 OpenClaw 发布新政策，否则 CLI 将 Claude Anthropic 复用和 `claude -p` 用途视为此集成的许可用法。
- 对于常驻网关主机和明确的服务端计费控制，Anthropic API 仍然是最明确的生产环境路径。
- 设置和运行时详细信息请参阅 [/gateway/cli-backends](/en/gateway/cli-backends)。

## 注意

- Anthropic 的公共 Claude Code 文档仍然记录了直接的 CLI 用法，例如 `claude -p`，并且 Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许。除非 Anthropic 发布新的政策变更，否则我们将该指导视为确定性的。
- Anthropic setup-token 在 OpenClaw 中仍然作为受支持的令牌身份验证路径可用，但在可用时，OpenClaw 现在优先选择 Claude CLI 复用和 `claude -p`。
- 身份验证详细信息和复用规则请参阅 [/concepts/oauth](/en/concepts/oauth)。

## 故障排除

**401 错误 / 令牌突然失效**

- Anthropic 令牌身份验证可能会过期或被撤销。
- 对于新设置，请迁移到 Anthropic API 密钥。

**未找到提供商 "anthropic" 的 API 密钥**

- 身份验证是**按代理进行的**。新代理不会继承主代理的密钥。
- 为该代理重新运行新手引导，或者在网关主机上配置一个 API 密钥，然后使用 `openclaw models status` 进行验证。

**未找到配置文件 `anthropic:default` 的凭据**

- 运行 `openclaw models status` 以查看哪个身份验证配置文件处于活动状态。
- 重新运行新手引导，或者为该配置文件路径配置 API 密钥。

**没有可用的身份验证配置文件（全部处于冷却/不可用状态）**

- 检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- Anthropic 的速率限制冷却可能是特定于模型的，因此即使当前模型正在冷却，其同级 Anthropic 模型可能仍然可用。
- 添加另一个 Anthropic 配置文件或等待冷却结束。

更多信息：[/gateway/故障排除](/en/gateway/troubleshooting) 和 [/help/faq](/en/help/faq)。
