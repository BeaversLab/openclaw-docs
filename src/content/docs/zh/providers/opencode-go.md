---
summary: "使用共享的 OpenCode 设置来使用 OpenCode Go 目录"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

OpenCode Go 是 [OpenCode](/zh/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供商 ID `opencode-go`，以确保上游按模型路由保持正确。

| 属性         | 值                                 |
| ------------ | ---------------------------------- |
| 运行时提供商 | `opencode-go`                      |
| 身份验证     | `OPENCODE_API_KEY`                 |
| 父级设置     | [OpenCode](/zh/providers/opencode) |

## 内置目录

OpenClaw 从捆绑的 OpenClaw 模型注册表中获取大多数 Go 目录行，并在注册表追赶进度时补充当前的上流行。运行 OpenClawOpenClaw`openclaw models list --provider opencode-go` 以获取当前模型列表。

该提供商包括：

| 模型引用                        | 名称                |
| ------------------------------- | ------------------- |
| `opencode-go/glm-5`             | GLM-5               |
| `opencode-go/glm-5.1`           | GLM-5.1             |
| `opencode-go/kimi-k2.5`         | Kimi K2.5           |
| `opencode-go/kimi-k2.6`         | Kimi K2.6 (3x 限制) |
| `opencode-go/deepseek-v4-pro`   | DeepSeek V4 Pro     |
| `opencode-go/deepseek-v4-flash` | DeepSeek V4 Flash   |
| `opencode-go/mimo-v2-omni`      | MiMo V2 Omni        |
| `opencode-go/mimo-v2-pro`       | MiMo V2 Pro         |
| `opencode-go/minimax-m2.5`      | MiniMax M2.5        |
| `opencode-go/minimax-m2.7`      | MiniMax M2.7        |
| `opencode-go/qwen3.5-plus`      | Qwen3.5 Plus        |
| `opencode-go/qwen3.6-plus`      | Qwen3.6 Plus        |

## 入门指南

<Tabs>
  <Tab title="交互式">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="非交互式">
    <Steps>
      <Step title="Pass the key directly">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.6" } } },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="路由行为">
    当模型引用使用 `opencode-go/...` 时，OpenClaw 会自动处理按模型路由。无需额外的提供商配置。
  </Accordion>

<Accordion title="Runtime ref 约定">Runtime refs 保持显式：Zen 为 `opencode/...`，Go 为 `opencode-go/...`。 这可以确保上游按模型路由在两个目录之间都正确。</Accordion>

  <Accordion title="Shared credentials">
    Zen 和 Go 目录使用相同的 `OPENCODE_API_KEY`。在设置期间输入密钥会存储这两个运行时提供商的凭据。
  </Accordion>
</AccordionGroup>

<Tip>请参阅 [OpenCode](/zh/providers/opencode) 以了解共享的新手引导概述以及完整的 Zen + Go 目录参考。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/zh/providers/opencode" icon="server">
    共享的新手引导、目录概述和高级说明。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
