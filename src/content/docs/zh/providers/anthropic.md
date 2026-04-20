---
summary: "在 OpenClaw 中通过 API 密钥或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 构建了 **Claude** 模型系列。OpenClaw 支持两种认证方式：

- **API 密钥** — 直接访问 Anthropic API 并采用按用量计费 (`anthropic/*` 模型)
- **Claude CLI** — 在同一主机上复用现有的 Claude CLI 登录

<Warning>
Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此
除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为许可行为。

对于长期运行的网关主机，Anthropic API 密钥仍然是最清晰、
最可预测的生产环境路径。

Anthropic 当前的公开文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)
- [将 Claude Code 与您的 Pro 或 Max 计划配合使用](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [将 Claude Code 与您的 Team 或 Enterprise 计划配合使用](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)
  </Warning>

## 入门指南

<Tabs>
  <Tab title="API 密钥">
    **最适用于：** 标准 API 访问和按用量计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        在 [Anthropic 控制台](https://console.anthropic.com/) 中创建 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适用于：** 在没有单独的 CLI 密钥的情况下重用现有的 Claude API 登录信息。

    <Steps>
      <Step title="确保 Claude CLI 已安装并已登录">
        使用以下命令验证：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw 会检测并重用现有的 Claude CLI 凭据。
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时详情请参阅 [CLI 后端](/en/gateway/cli-backends)。
    </Note>

    <Tip>
    如果您希望获得最清晰的计费路径，请改用 Anthropic API 密钥。OpenClaw 还支持来自 [OpenAI Codex](/en/providers/openai)、[Qwen Cloud](/en/providers/qwen)、[MiniMax](/en/providers/minimax) 和 [Z.AI / GLM](/en/providers/glm) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## Thinking 默认值 (Claude 4.6)

在 OpenClaw 中，当未设置明确的思考级别时，Claude 4.6 模型默认为 `adaptive` 思考。

使用 `/think:<level>` 或在模型参数中按消息覆盖：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>相关的 Anthropic 文档： - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)</Note>

## 提示词缓存

OpenClaw 支持 Anthropic 的提示词缓存功能，适用于 API 密钥认证。

| 值               | 缓存持续时间 | 描述                      |
| ---------------- | ------------ | ------------------------- |
| `"short"` (默认) | 5 分钟       | 针对 API 密钥认证自动应用 |
| `"long"`         | 1 小时       | 扩展缓存                  |
| `"none"`         | 无缓存       | 禁用提示词缓存            |

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

<AccordionGroup>
  <Accordion title="Per-agent cache overrides">
    使用模型级参数作为基准，然后通过 `agents.list[].params` 覆盖特定代理：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    配置合并顺序：

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` （匹配 `id`，按键覆盖）

    这允许一个代理保持长驻留缓存，而同一模型上的另一个代理针对突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude notes">
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置时接受 `cacheRetention` 透传。
    - 非 Anthropic Bedrock 模型在运行时被强制为 `cacheRetention: "none"`。
    - API-key 智能默认值还会在未设置显式值时为 Claude-on-Bedrock 引用设定 `cacheRetention: "short"` 种子。
  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="Fast mode">
    OpenClaw 的共享 `/fast` 切换开关支持直接 Anthropic 流量（API-key 和 OAuth 至 `api.anthropic.com`）。

    | 命令 | 映射到 |
    |---------|---------|
    | `/fast on` | `service_tier: "auto"` |
    | `/fast off` | `service_tier: "standard_only"` |

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

    <Note>
    - 仅针对直接 `api.anthropic.com` 请求注入。代理路由保持 `service_tier` 不变。
    - 显式的 `serviceTier` 或 `service_tier` 参数会在两者同时设置时覆盖 `/fast`。
    - 对于没有优先层级容量（Priority Tier capacity）的账户，`service_tier: "auto"` 可能解析为 `standard`。
    </Note>

  </Accordion>

  <Accordion title="Media understanding (image and PDF)">
    附带的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw
    会从配置的 Anthropic 身份验证中自动解析媒体能力 — 无需
    额外的配置。

    | Property       | Value                |
    | -------------- | -------------------- |
    | Default 模型  | `claude-opus-4-6`    |
    | Supported input | 图像、PDF 文档 |

    当图像或 PDF 附加到对话中时，OpenClaw 会自动
    通过 Anthropic 媒体理解提供商进行路由。

  </Accordion>

  <Accordion title="1M context window (beta)">
    Anthropic 的 1M 上下文窗口处于 Beta 封锁状态。请按模型启用它：

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

    OpenClaw 会将其映射到请求上的 `anthropic-beta: context-1m-2025-08-07`。

    <Warning>
    需要在您的 Anthropic 凭据上拥有长上下文访问权限。旧版令牌身份验证 (`sk-ant-oat-*`) 将被 1M 上下文请求拒绝 — OpenClaw 会记录警告并回退到标准上下文窗口。
    </Warning>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 errors / token suddenly invalid">
    Anthropic 令牌身份验证可能会过期或被撤销。对于新设置，请迁移到 Anthropic API API 密钥。
  </Accordion>

<Accordion title='No API key found for 提供商 "anthropic"'>身份验证是**按代理** 进行的。新代理不会继承主代理的密钥。为该代理重新运行新手引导，或者在网关主机上配置一个 API 密钥，然后使用 `openclaw models status` 进行验证。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>运行 `openclaw models status` 以查看哪个身份验证配置文件处于活动状态。重新运行新手引导，或者为该配置文件路径配置一个 API 密钥。</Accordion>

  <Accordion title="没有可用的身份验证配置文件（全部处于冷却中）">
    检查 `openclaw models status --json` 以获取 `auth.unusableProfiles`。Anthropic 速率限制冷却可能是模型范围的，因此同级的 Anthropic 模型可能仍然可用。添加另一个 Anthropic 配置文件或等待冷却结束。
  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/en/help/troubleshooting) 和 [常见问题](/en/help/faq)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/en/gateway/cli-backends" icon="terminal">
    Claude CLI 后端设置和运行时详细信息。
  </Card>
  <Card title="提示词缓存" href="/en/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供商之间工作。
  </Card>
  <Card title="OAuth 和身份验证" href="/en/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
</CardGroup>
