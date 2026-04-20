---
summary: "使用共享的 OpenCode 设置来使用 OpenCode Go 目录"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/zh/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供商 ID `opencode-go`，以便上游按模型路由保持正确。

| 属性         | 值                                 |
| ------------ | ---------------------------------- |
| 运行时提供商 | `opencode-go`                      |
| 身份验证     | `OPENCODE_API_KEY`                 |
| 父级设置     | [OpenCode](/zh/providers/opencode) |

## 支持的模型

| 模型引用                   | 名称         |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

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
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
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
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## 高级说明

<AccordionGroup>
  <Accordion title="路由行为">
    当模型引用使用 `opencode-go/...` 时，OpenClaw 会自动处理每个模型的路由。不需要额外的提供商配置。
  </Accordion>

<Accordion title="运行时引用约定">运行时引用保持显式：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`。 这样可以确保两个目录之间的上游每个模型路由保持正确。</Accordion>

  <Accordion title="共享凭据">
    Zen 和 Go 目录使用相同的 `OPENCODE_API_KEY`。在设置期间输入密钥
    会为两个运行时提供商存储凭据。
  </Accordion>
</AccordionGroup>

<Tip>有关共享的新手引导概述以及完整的 Zen + Go 目录参考，请参阅 [OpenCode](/zh/providers/opencode)。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="OpenCode (父级)" href="/zh/providers/opencode" icon="server">
    共享的新手引导、目录概述和高级说明。
  </Card>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
