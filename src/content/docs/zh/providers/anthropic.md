---
summary: "在 OpenClaw 中通过 API 密钥或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic 构建了 **Claude** 模型家族。OpenClaw 支持两种认证方式：

- **API 密钥** — 通过使用量计费直接访问 Anthropic API (`anthropic/*` 模型)
- **Claude CLI** — 在同一主机上重用现有的 Claude Code 登录信息

<Warning>
OpenClaw 的 Claude CLI 后端以非交互式打印模式运行已安装的 Claude Code CLI。Anthropic 当前的 Claude Code 文档将 `claude -p` 描述为 Agent SDK/程序化用法。自 2026 年 6 月 15 日起，Anthropic 表示订阅计划的 `claude -p` 使用量不再从正常的 Claude 计划限额中扣除；它首先从单独的每月 Agent SDK 额度中扣除，当启用这些额度时，再按标准 API 费率从使用量额度中扣除。

交互式 Claude Code 仍从已登录的 Claude 计划限额中扣除。API 密钥身份验证保持直接按需付费的 API 计费。对于长期运行的网关主机、共享自动化和可预测的生产支出，请使用 Anthropic API 密钥。

Anthropic 当前的公共文档：

- [Claude Code CLI 参考](https://code.claude.com/docs/en/cli-usage)
- [将 Claude Agent SDK 与您的 Claude 计划一起使用](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [将 Claude Code 与您的 Pro 或 Max 计划一起使用](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [将 Claude Code 与您的 Team 或 Enterprise 计划一起使用](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [管理 Claude Code 成本](https://code.claude.com/docs/en/costs)

</Warning>

## 入门指南

<Tabs>
  <Tab title="APIAPI 密钥"API>
    **最适用于：** 标准 API 访问和基于使用量的计费。

    <Steps>
      <Step title="获取您的 APIAPI 密钥">
        在 [AnthropicAPI 控制台](https://console.anthropic.com/) 中创建一个 APIAnthropic 密钥。
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
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-8" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **最适用于：** 在没有单独的 CLI 密钥的情况下复用现有的 Claude API 登录。

    <Steps>
      <Step title="确保已安装并登录 Claude CLI">
        使用以下命令验证：

        ```bash
        claude --version
        ```
      </Step>
      <Step title="运行 新手引导">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw 会检测并复用现有的 Claude CLI 凭据。
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Claude CLI 后端的设置和运行时详细信息请参阅 [CLI 后端](/zh/gateway/cli-backends)。
    </Note>

    <Warning>
    Claude CLI 的复用要求 OpenClaw 进程与 Claude CLI 登录运行在同一主机上。[Podman](/zh/install/podman) 等容器安装
    不会将主机 `~/.claude` 挂载到设置或运行时环境中；请在此处使用 Anthropic API 密钥，
    或选择具有 OpenClaw 托管 OAuth 的提供商，例如
    [OpenAI Codex](/zh/providers/openai)。
    </Warning>

    ### 配置示例

    建议使用规范的 Anthropic 模型引用加上 CLI 运行时覆盖：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-8" },
          models: {
            "anthropic/claude-opus-4-8": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    为保持兼容性，旧的 `claude-cli/claude-opus-4-7` 模型引用仍然有效，
    但新配置应将提供商/模型选择保持为
    `anthropic/*`，并将执行后端置于提供商/模型运行时策略中。

    ### 计费和 `claude -p`

    OpenClaw 使用 Claude Code 的非交互式 `claude -p` 路径运行 Claude CLI。
    Anthropic 目前将该路径视为 Agent SDK/编程用途：

    - 在 2026 年 6 月 15 日之前，订阅计划处理遵循 Anthropic 针对已登录账户的
      当前 Claude Code 规则。
    - 从 2026 年 6 月 15 日开始，订阅计划的 `claude -p` 使用量将首先从
      用户的每月 Agent SDK 额度中扣除，如果启用了使用量额度，再按标准
      API 费率从使用量额度中扣除。
    - 控制台/API 密钥登录使用按量付费的 API 计费，且
      不享受订阅 Agent SDK 额度。

    Anthropic 可能会在未发布 OpenClaw 新版本的情况下更改 Claude Code 计费和速率限制行为。
    当计费可预测性很重要时，请查阅 `claude auth status`、`/status` 和
    Anthropic 关联的文档。

    <Tip>
    对于共享的生产环境自动化，请使用 Anthropic API 密钥，
    而非 Claude CLI。OpenClaw 也支持来自
    [OpenAI Codex](/zh/providers/openai)、[Qwen Cloud](/zh/providers/qwen)、
    [MiniMax](/zh/providers/minimax) 和 [Z.AI / GLM](/zh/providers/zai) 的订阅式选项。
    </Tip>

  </Tab>
</Tabs>

## Thinking 默认设置 (Claude 4.8 和 4.6)

在 OpenClaw 中，Claude Opus 4.8 默认保持 thinking 关闭。当您使用 OpenClaw`/think high|xhigh|max`OpenClawAnthropic 显式启用 adaptive thinking 时，OpenClaw 会发送 Anthropic 的 Opus 4.8 effort 值；Claude 4.6 模型默认为 `adaptive`。

使用 `/think:<level>` 或在模型参数中逐条消息覆盖：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-8": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

<Note>
相关 Anthropic 文档：
- [Adaptive thinking](Anthropichttps://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## 提示缓存

OpenClaw 支持 Anthropic 的提示缓存功能，适用于 API 密钥认证。

| 值               | 缓存持续时间 | 描述                      |
| ---------------- | ------------ | ------------------------- |
| `"short"` (默认) | 5 分钟       | 针对 API 密钥认证自动应用 |
| `"long"`         | 1 小时       | 扩展缓存                  |
| `"none"`         | 无缓存       | 禁用提示缓存              |

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
    使用模型级参数作为基线，然后通过 `agents.list[].params` 覆盖特定代理：

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
    2. `agents.list[].params` (匹配 `id`，按键覆盖)

    这允许一个代理保持长期缓存，而同一模型上的另一个代理针对突发/低复用流量禁用缓存。

  </Accordion>

  <Accordion title="Bedrock Claude notes"Anthropic>
    - Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在配置时接受 `cacheRetention`Anthropic 透传。
    - 非 Anthropic 的 Bedrock 模型在运行时被强制设为 `cacheRetention: "none"`API。
    - API key 智能默认值也会为未设置显式值的 Bedrock Claude 引用植入 `cacheRetention: "short"`。

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="Fast mode"OpenClaw>
    OpenClaw 的共享 `/fast`AnthropicAPIOAuth 切换开关支持直接的 Anthropic 流量（API 密钥和 OAuth 到 `api.anthropic.com`）。

    | Command | 映射到 |
    |---------|--------|
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
    - 仅针对直接 `api.anthropic.com` 请求注入。代理路由会保留 `service_tier` 不变。
    - 显式的 `serviceTier` 或 `service_tier` 参数会在两者同时设置时覆盖 `/fast`。
    - 对于没有优先层容量的账户，`service_tier: "auto"` 可能会解析为 `standard`。

    </Note>

  </Accordion>

  <Accordion title="Media understanding (image and PDF)"AnthropicOpenClawAnthropic>
    捆绑的 Anthropic 插件注册了图像和 PDF 理解功能。OpenClaw 会从配置的 Anthropic 身份验证中自动解析媒体能力——无需额外配置。

    | Property        | Value                 |
    | --------------- | --------------------- |
    | 默认模型        | `claude-opus-4-8`OpenClawAnthropic     |
    | 支持的输入      | 图像、PDF 文档       |

    当图像或 PDF 附加到对话中时，OpenClaw 会自动通过 Anthropic 媒体理解提供商进行路由。

  </Accordion>

  <Accordion title="1M 上下文窗口">
    Anthropic 的 1M 上下文窗口在支持 GA 的 Claude 4.x 模型上可用，
    例如 Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6。OpenClaw 会自动将这些模型的大小设置为
    1M：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {},
          },
        },
      },
    }
    ```

    较旧的配置可以保留 `params.context1m: true`，但 OpenClaw 不再发送
    已弃用的 `context-1m-2025-08-07` beta 标头。具有该值的较旧 `anthropicBeta` 配置
    条目在请求标头解析期间将被忽略，
    且不支持的较旧 Claude 模型将保持其正常的上下文窗口。

    `params.context1m: true` 也适用于 Claude CLI 后端
    (`claude-cli/*`)，针对符合条件的支持 GA 的 Opus 和 Sonnet 模型，保留
    这些 CLI 会话的运行时上下文窗口，以匹配直接 API
    的行为。

    <Warning>
    需要 Anthropic 凭据上的长上下文访问权限。OAuth/订阅令牌身份验证会保留其所需的 Anthropic beta 标头，但如果旧的配置中仍存在已弃用的 1M beta 标头，OpenClaw 会将其移除。
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.8 1M 上下文">
    `anthropic/claude-opus-4-8` 及其 `claude-cli` 变体默认具有 1M 上下文
    窗口 — 无需 `params.context1m: true`。
  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="401 错误 / 令牌突然失效">
    Anthropic 令牌认证会过期且可能被撤销。对于新设置，请改用 Anthropic API 密钥。
  </Accordion>

<Accordion title="未找到提供商“anthropic”的 API 密钥">Anthropic 身份验证是**按代理**进行的——新代理不会继承主代理的密钥。为该代理重新运行新手引导（或在网关主机上配置 API 密钥），然后使用 `openclaw models status` 进行验证。</Accordion>

<Accordion title="未找到配置文件“anthropic:default”的凭据">运行 `openclaw models status`API 以查看当前活动的身份验证配置文件。重新运行新手引导，或为该配置文件路径配置 API 密钥。</Accordion>

  <Accordion title="没有可用的身份验证配置文件（全部处于冷却期）">
    检查 `openclaw models status --json` 中的 `auth.unusableProfiles`AnthropicAnthropicAnthropic。Anthropic 的速率限制冷却期可能针对特定模型，因此同级的 Anthropic 模型可能仍可使用。添加另一个 Anthropic 配置文件或等待冷却期结束。
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
