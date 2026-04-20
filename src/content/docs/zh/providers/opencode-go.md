---
summary: "使用共享的 OpenCode 设置来使用 OpenCode Go 目录"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go 是 [OpenCode](/en/providers/opencode) 中的 Go 目录。
它使用与 Zen 目录相同的 `OPENCODE_API_KEY`，但保留运行时
提供商 ID `opencode-go`，以便上游按模型路由保持正确。

| 属性         | 值                                 |
| ------------ | ---------------------------------- |
| 运行时提供商 | `opencode-go`                      |
| 身份验证     | `OPENCODE_API_KEY`                 |
| 父级设置     | [OpenCode](/en/providers/opencode) |

## 支持的模型

| 模型引用                   | 名称         |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## 入门指南

<Tabs>
  <Tab title="Interactive">
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
      <Step title="直接传递密钥">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用性">
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
    当模型引用使用
    `opencode-go/...` 时，OpenClaw 会自动处理按模型路由。无需额外的提供商配置。
  </Accordion>

<Accordion title="运行时引用约定">运行时引用保持明确：Zen 为 `opencode/...`，Go 为 `opencode-go/...`。 这可以确保上游按模型路由在两个目录中保持正确。</Accordion>

  <Accordion title="共享凭证">
    Zen 和 Go 目录使用相同的 `OPENCODE_API_KEY`。在设置期间输入密钥会为两个运行时提供商存储凭证。
  </Accordion>
</AccordionGroup>

<Tip>请参阅 [OpenCode](/en/providers/opencode) 以了解共享新手引导概述以及完整的 Zen + Go 目录参考。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/en/providers/opencode" icon="server">
    共享的新手引导、目录概览和高级说明。
  </Card>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
