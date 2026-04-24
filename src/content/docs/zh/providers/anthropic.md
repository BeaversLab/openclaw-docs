---
summary: "在 OpenClaw 中通过 API 密钥或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 构建了 **Claude** 模型系列。OpenClaw 支持两种认证方式：

- **API 密钥** — 直接访问 Anthropic API，采用按使用量计费（`anthropic/*` 模型）
- **Claude CLI** — 在同一主机上复用现有的 Claude CLI 登录

<Warning>
Anthropic 员工告知我们，OpenClaw 风格的 Claude OpenClaw 使用再次获得允许，因此
除非 CLI 发布新政策，否则 OpenClaw 将 Claude CLI 的复用和 `claude -p` 的使用视为合规。

对于长期运行的网关主机，Anthropic Anthropic 密钥仍然是最清晰且
最可预测的生产环境路径。

API 当前的公开文档：

- [Claude Code Anthropic 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概述](https://platform.claude.com/docs/en/agent-sdk/overview)
- [在 Pro 或 Max 计划中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [在 Team 或 Enterprise 计划中使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 入门指南

<Tabs>
  <Tab title="AnthropicAPI key">
    **Best for:** 标准API访问和按使用量计费。

    <Steps>
      <Step title="获取您的API密钥">
        在 [AnthropicAPI Console](https://console.anthropic.com/) 中创建Anthropic密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或者直接传递密钥：

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
    **最适用于：** 在没有单独 CLI 密钥的情况下重用现有的 Claude API 登录信息。

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

        OpenClaw 会检测并重用现有的 Claude CLI 凭证。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    有关 Claude CLI 后端的设置和运行时详细信息，请参阅 [CLI 后端](/zh/gateway/cli-backends)。
    </Note>

    <Tip>
    如果您希望获得最清晰的计费路径，请改用 Anthropic API 密钥。OpenClaw 还支持来自 [OpenAI Codex](/zh/providers/openai)、[Qwen Cloud](/zh/providers/qwen)、[MiniMax](/zh/providers/minimax) 和 [Z.AI / GLM](/zh/providers/glm) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## Thinking 默认值 (Claude 4.6)

在未设置显式思考级别时，Claude 4.6 模型在 OpenClaw 中默认为 `adaptive` 思考。

使用 `/think:<level>` 或在模型参数中覆盖每条消息的设置：

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

<Note>相关 Anthropic 文档： - [自适应思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) - [扩展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)</Note>

## 提示词缓存

OpenClaw 支持 Anthropic 的提示词缓存功能，适用于 API 密钥认证。

| 值                | 缓存持续时间 | 描述                      |
| ----------------- | ------------ | ------------------------- |
| `"short"`（默认） | 5 分钟       | 针对 API 密钥认证自动应用 |
| `"long"`          | 1 小时       | 扩展缓存                  |
| `"none"`          | 无缓存       | 禁用提示词缓存            |

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
    以模型级参数为基准，然后通过 `agents.list[].params` 覆盖特定代理的设置：

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
    2. `agents.list[].params` （匹配 `id`，按键名覆盖）

    这样可以让一个代理保持长期缓存，而同一模型上的另一个代理针对突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude 备注">
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在配置时接受 `cacheRetention` 直通。
    - 非 Anthropic Bedrock 模型在运行时被强制为 `cacheRetention: "none"`。
    - API 密钥智能默认值还会为未设置显式值的 Claude-on-Bedrock 引用预设 `cacheRetention: "short"`。
  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="Fast mode">
    OpenClaw 的共享 `/fast` 开关支持直接 Anthropic 流量（API 密钥和 OAuth 到 `api.anthropic.com`）。

    | Command | 映射到 |
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
    - 仅针对直接 `api.anthropic.com` 请求注入。代理路由保留 `service_tier` 不变。
    - 显式的 `serviceTier` 或 `service_tier` 参数会在两者同时设置时覆盖 `/fast`。
    - 在没有优先级层容量的账户上，`service_tier: "auto"` 可能会解析为 `standard`。
    </Note>

  </Accordion>

  <Accordion title="媒体理解（图像和 PDF）">
    捆绑的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw
    会从配置的 Anthropic 身份验证中自动解析媒体能力 — 无需
    额外配置。

    | 属性       | 值                |
    | -------------- | -------------------- |
    | 默认模型  | `claude-opus-4-6`    |
    | 支持的输入 | 图像、PDF 文档 |

    当图像或 PDF 附加到对话时，OpenClaw 会自动
    通过 Anthropic 媒体理解提供商进行路由。

  </Accordion>

  <Accordion title="1M 上下文窗口 (beta)">
    Anthropic 的 1M 上下文窗口处于 beta 受限状态。请按模型启用它：

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

    OpenClaw 会在请求时将其映射到 `anthropic-beta: context-1m-2025-08-07`。

    <Warning>
    需要您的 Anthropic 凭据具有长上下文访问权限。传统的令牌身份验证 (`sk-ant-oat-*`) 会被 1M 上下文请求拒绝 —— OpenClaw 会记录警告并回退到标准上下文窗口。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M 上下文归一化">
    Claude Opus 4.7 (`anthropic/claude-opus-4.7`) 及其 `claude-cli` 变体在解析后的运行时元数据和活动代理状态/上下文报告中归一化为 1M 上下文窗口。对于 Opus 4.7，您不需要 `params.context1m: true`；它不再继承过时的 200k 回退值。

    压缩和溢出处理自动使用 1M 窗口。其他 Anthropic 模型保持其已发布的限制。

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然无效">
    Anthropic 令牌身份验证可能会过期或被撤销。对于新的设置，请迁移到 Anthropic API 密钥。
  </Accordion>

<Accordion title='No API key found for 提供商 "anthropic"'>身份验证是**按代理**进行的。新代理不会继承主代理的密钥。为该代理重新运行新手引导，或者在网关主机上配置一个 API 密钥，然后使用 `openclaw models status` 进行验证。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>运行 `openclaw models status` 以查看当前激活的身份验证配置文件。重新运行新手引导，或者为该配置文件路径配置一个 API 密钥。</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`。Anthropic 的速率限制冷却可能是特定于模型的，因此同级的 Anthropic 模型可能仍然可用。添加另一个 Anthropic 配置文件或等待冷却结束。
  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="CLI 后端" href="/zh/gateway/cli-backends" icon="terminal">
    Claude CLI 后端设置和运行时详细信息。
  </Card>
  <Card title="提示词缓存" href="/zh/reference/prompt-caching" icon="database">
    提示词缓存如何在各提供商之间工作。
  </Card>
  <Card title="OAuth 和 auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
</CardGroup>
