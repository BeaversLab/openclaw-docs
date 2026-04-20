---
summary: "通过 OpenClaw 使用 OpenCode Zen 和 Go 目录"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode 在 OpenClaw 中公开了两个托管目录：

| 目录    | 前缀              | 运行时提供商  |
| ------- | ----------------- | ------------- |
| **Zen** | `opencode/...`    | `opencode`    |
| **Go**  | `opencode-go/...` | `opencode-go` |

两个目录使用相同的 OpenCode API 密钥。OpenClaw 保持运行时提供商 ID 分开，以便上游按 OpenClaw 的路由保持正确，但在新手引导和文档中，它们被视为一个 OpenCode 设置。

## 入门指南

<Tabs>
  <Tab title="Zen 目录">
    **最适用于：** 精选的 OpenCode 多 OpenClaw 代理（Claude、GPT、Gemini）。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        或者直接传递密钥：

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="设置 Zen 模型为默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Go 目录">
    **最适用于：** OpenCode 托管的 Kimi、GLM 和 MiniMax 系列。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        或者直接传递密钥：

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="设置 Go 模型为默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="验证模型是否可用">
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
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## 目录

### Zen

| 属性         | 值                                                                      |
| ------------ | ----------------------------------------------------------------------- |
| 运行时提供商 | `opencode`                                                              |
| 示例模型     | `opencode/claude-opus-4-6`, `opencode/gpt-5.4`, `opencode/gemini-3-pro` |

### Go

| 属性         | 值                                                                       |
| ------------ | ------------------------------------------------------------------------ |
| 运行时提供商 | `opencode-go`                                                            |
| 示例模型     | `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## 高级说明

<AccordionGroup>
  <Accordion title="API 密钥别名">
    `OPENCODE_ZEN_API_KEY` 也支持作为 `OPENCODE_API_KEY` 的别名。
  </Accordion>

<Accordion title="共享凭据">在设置期间输入一个 OpenCode 密钥即可为两个运行时提供商 存储凭据。您无需分别为每个目录进行入职。</Accordion>

<Accordion title="计费和仪表板">您登录 OpenCode，添加计费详细信息，并复制您的 API 密钥。计费 和目录可用性从 OpenCode 仪表板进行管理。</Accordion>

<Accordion title="Gemini 重放行为">由 Gemini 支持的 OpenCode 引用保留在 proxy-Gemini 路径上，因此 OpenClaw 在那里保留 Gemini 思维签名清理，而不启用原生 Gemini 重放验证或引导重写。</Accordion>

  <Accordion title="非 Gemini 重放行为">
    非 Gemini OpenCode 引用保留最低限度的 OpenAI 兼容重放策略。
  </Accordion>
</AccordionGroup>

<Tip>在设置期间输入一个 OpenCode 密钥即可为 Zen 和 Go 运行时提供商存储凭据，因此您只需入职一次。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
