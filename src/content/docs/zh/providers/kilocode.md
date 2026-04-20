---
title: "Kilocode"
summary: "使用 Kilo Gateway(网关) 的统一 API 访问 OpenClaw 中的许多模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway(网关)

Kilo Gateway(网关) 提供了一个 **统一 API**，可以将请求路由到单个端点和 API 密钥背后的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 可以通过切换基本 URL 来工作。

| 属性     | 值                                 |
| -------- | ---------------------------------- |
| 提供商   | `kilocode`                         |
| 认证     | `KILOCODE_API_KEY`                 |
| API      | OpenAI兼容                         |
| 基础 URL | `https://api.kilo.ai/api/gateway/` |

## 入门指南

<Steps>
  <Step title="创建账户">
    前往 [app.kilo.ai](https://app.kilo.ai)，登录或创建账户，然后导航至 API 密钥并生成一个新密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或者直接设置环境变量：

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## 默认模型

默认模型是 `kilocode/kilo/auto`，这是一个由提供商拥有的智能路由
模型，由 Kilo Gateway(网关) 管理。

<Note>OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不会 发布该路由的基于源的任务到上游模型映射。`kilocode/kilo/auto` 背后的精确 上游路由由 Kilo Gateway(网关) 拥有，而非在 OpenClaw 中硬编码。</Note>

## 可用模型

OpenClaw 在启动时从 Kilo Gateway(网关) 动态发现可用模型。使用
`/models kilocode` 查看您的账户可用的完整模型列表。

网关上可用的任何模型都可以使用 `kilocode/` 前缀：

| 模型引用                               | 备注                             |
| -------------------------------------- | -------------------------------- |
| `kilocode/kilo/auto`                   | 默认 — 智能路由                  |
| `kilocode/anthropic/claude-sonnet-4`   | 通过 Kilo 使用 Anthropic         |
| `kilocode/openai/gpt-5.4`              | 通过 Kilo 使用 OpenAI            |
| `kilocode/google/gemini-3-pro-preview` | 通过 Kilo 使用 Google            |
| ...以及更多                            | 使用 `/models kilocode` 列出所有 |

<Tip>在启动时，OpenClaw 会查询 `GET https://api.kilo.ai/api/gateway/models` 并将 发现的模型合并到静态备用目录之前。捆绑的备用目录始终 包含带有 `input: ["text", "image"]` 的 `kilocode/kilo/auto` (`Kilo Auto`)、 `reasoning: true`、`contextWindow: 1000000` 和 `maxTokens: 128000`。</Tip>

## 配置示例

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="传输和兼容性">
    Kilo Gateway(网关) 在源文档中被描述为与 OpenRouter 兼容，因此它保留在
    代理风格的 OpenAI 兼容路径上，而不是原生的 OpenAI 请求整形。

    - Gemini 支持的 Kilo 引用保留在代理 Gemini 路径上，因此 OpenClaw 在那里保留
      Gemini 思维签名清理，而无需启用原生 Gemini
      重放验证或引导重写。
    - Kilo Gateway(网关) 在底层使用带有您的 API 密钥的 Bearer 令牌。

  </Accordion>

  <Accordion title="流包装器和推理">
    Kilo 的共享流包装器添加提供商应用标头，并为支持的具体模型引用规范化
    代理推理负载。

    <Warning>
    `kilocode/kilo/auto` 和其他不支持代理推理的提示将跳过推理
    注入。如果您需要推理支持，请使用具体的模型引用，例如
    `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="故障排除">
    - 如果在启动时模型发现失败，OpenClaw 将回退到包含 `kilocode/kilo/auto` 的捆绑静态目录。
    - 确认您的 API 密钥有效，并且您的 Kilo 帐户已启用所需的模型。
    - 当 Gateway(网关) 作为守护进程运行时，请确保 `KILOCODE_API_KEY` 对该进程可用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Kilo Gateway(网关)" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway(网关) 控制台、API 密钥和帐户管理。
  </Card>
</CardGroup>
