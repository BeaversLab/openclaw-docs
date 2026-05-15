---
summary: "在 OpenClaw 中通过 API 密钥或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API 密钥** — 通过使用量计费直接访问 Anthropic API (`anthropic/*` 模型)
- **Claude CLI** — 在同一主机上复用现有的 Claude CLI 登录

<Warning>
AnthropicOpenClaw 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次获得允许，因此除非 OpenClaw 发布新政策，否则 CLI 将复用 Claude Anthropic 和 `claude -p` 的使用视为已获批准。

对于长期运行的网关主机，Anthropic API 仍然是最清晰且最可预测的生产环境路径。

Anthropic 当前的公开文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概述](https://platform.claude.com/docs/en/agent-sdk/overview)
- [结合 Pro 或 Max 计划使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [结合 Team 或 Enterprise 计划使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## 入门指南

<Tabs>
  <Tab title="API 密钥">
    **最适用于：** 标准 API 访问和基于使用量的计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        在 [API Console](https://console.anthropic.com/) 中创建一个 Anthropic 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        或者直接传入密钥：

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
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

  <Tab title="CLIClaude CLI"CLIAPI>
    **最佳用于：** 重用现有的 Claude CLI 登录信息，而无需单独的 API 密钥。

    <Steps>
      <Step title="CLI确保 Claude CLI 已安装并已登录">
        使用以下命令验证：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```OpenClawCLI

        OpenClaw 会检测并重用现有的 Claude CLI 凭据。
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```CLICLI
      </Step>
    </Steps>

    <Note>
    有关 Claude CLI 后端的设置和运行时详细信息，请参阅 [CLI 后端](/en/gateway/cli-backendsAnthropicCLI)。
    </Note>

    ### 配置示例

    最好使用规范的 Anthropic 模型引用加上 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          models: {
            "anthropic/claude-opus-4-7": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    出于兼容性原因，传统的 `claude-cli/claude-opus-4-7` 模型引用仍然有效，但新配置应将提供商/模型选择保持为 `anthropic/*`AnthropicAPIOpenClawOpenAI，并将执行后端放入提供商/模型运行时策略中。

    <Tip>
    如果您希望获得最清晰的计费路径，请改用 Anthropic API 密钥。OpenClaw 还支持来自 [OpenAI Codex](/zh/providers/openaiQwen)、[Qwen Cloud](/zh/providers/qwenMiniMax)、[MiniMax](/zh/providers/minimaxGLM) 和 [Z.AI / GLM](/zh/providers/glm) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## 思考默认值 (Claude 4.6)

在未设置显式思考级别时，Claude 4.6 模型在 OpenClaw 中默认为 `adaptive`OpenClaw 思考模式。

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

<Note>
相关的 Anthropic 文档：
- [自适应思维](Anthropichttps://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [扩展思维](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## 提示缓存

OpenClaw 支持 Anthropic 的提示缓存功能，适用于 API 密钥认证。

| 值                | 缓存持续时间 | 描述                      |
| ----------------- | ------------ | ------------------------- |
| `"short"`（默认） | 5 分钟       | 针对 API 密钥认证自动应用 |
| `"long"`          | 1 小时       | 扩展缓存                  |
| `"none"`          | 无缓存       | 禁用提示缓存              |

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
    2. `agents.list[].params`（匹配 `id`，按键覆盖）

    这允许一个代理保持长寿命缓存，而同一模型上的另一个代理为突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude notes"Anthropic>
    - Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在配置时接受 `cacheRetention`Anthropic 透传。
    - 非 Anthropic Bedrock 模型在运行时被强制使用 `cacheRetention: "none"`API。
    - API 密钥智能默认值还会在未设置显式值时为 Bedrock 上的 Claude 引用设定 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="Fast mode">
    OpenClaw 的共享 `/fast` 切换开关支持直接的 Anthropic 流量（通往 `api.anthropic.com` 的 API 密钥和 OAuth）。

    | Command | Maps to |
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
    - 仅针对直接 `api.anthropic.com` 请求注入。代理路由不会修改 `service_tier`。
    - 显式的 `serviceTier` 或 `service_tier` 参数会在两者同时设置时覆盖 `/fast`。
    - 对于没有优先层级容量的账户，`service_tier: "auto"` 可能会解析为 `standard`。

    </Note>

  </Accordion>

  <Accordion title="Media understanding (image and PDF)">
    捆绑的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw
    会根据配置的 Anthropic 身份验证自动解析媒体能力 — 不需要
    额外的配置。

    | Property        | Value                 |
    | --------------- | --------------------- |
    | Default 模型   | `claude-opus-4-7`     |
    | Supported input | Images, PDF documents |

    当图像或 PDF 附加到对话时，OpenClaw 会自动
    通过 Anthropic 媒体理解提供商进行路由。

  </Accordion>

  <Accordion title="1M context window (beta)">
    Anthropic 的 1M 上下文窗口处于 beta 封测状态。请针对每个模型启用它：

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

    OpenClaw 会将其映射到请求中的 `anthropic-beta: context-1m-2025-08-07`。

    `params.context1m: true` 也适用于符合条件的 Opus 和 Sonnet CLI 的 Claude CLI 后端
    (`claude-cli/*`)，从而扩展这些 API 会话的运行时
    上下文窗口，以匹配直接 Anthropic 的行为。

    <Warning>
    需要您的 OpenClaw 凭据具有长上下文访问权限。旧版令牌身份验证 (`sk-ant-oat-*`) 会被 1M 上下文请求拒绝 —— OpenClaw 会记录警告并回退到标准上下文窗口。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M context">
    `anthropic/claude-opus-4.7` 及其 `claude-cli` 变体默认具有 1M 上下文
    窗口 —— 无需 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然失效">
    Anthropic 令牌认证会过期且可能被撤销。对于新设置，请改用 Anthropic API 密钥。
  </Accordion>

<Accordion title='No API key found for 提供商 "anthropic"'>Anthropic 身份验证是**针对每个代理** 的 —— 新代理不会继承主代理的密钥。请为该代理重新运行新手引导 (或在网关主机上配置 API 密钥)，然后使用 `openclaw models status` 进行验证。</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>运行 `openclaw models status` 以查看哪个身份验证配置文件处于活动状态。重新运行新手引导，或为该配置文件路径配置 API 密钥。</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    检查 `openclaw models status --json` 获取 `auth.unusableProfiles`AnthropicAnthropicAnthropic。Anthropic 的速率限制冷却期可能与模型范围有关，因此同级的 Anthropic 模型可能仍然可用。添加另一个 Anthropic 配置文件或等待冷却期结束。
  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用以及故障转移行为。
  </Card>
  <Card title="CLI backends" href="/zh/gateway/cli-backends" icon="terminal">
    Claude CLI 后端设置和运行时详情。
  </Card>
  <Card title="Prompt caching" href="/zh/reference/prompt-caching" icon="database">
    提示缓存如何在各个提供商之间工作。
  </Card>
  <Card title="OAuth and auth" href="/zh/gateway/authentication" icon="key">
    认证详情和凭证重用规则。
  </Card>
</CardGroup>
