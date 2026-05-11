---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用带有 OpenClaw 密钥身份验证的 Xiaomi
OpenAI 兼容端点。

| 属性     | 值                              |
| -------- | ------------------------------- |
| 提供商   | `xiaomi`                        |
| 身份验证 | `XIAOMI_API_KEY`                |
| API      | OpenAI 兼容                     |
| 基础 URL | `https://api.xiaomimimo.com/v1` |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">
    在 [API MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建 Xiaomi 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    或直接传递密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## 内置目录

| 模型引用               | 输入       | 上下文    | 最大输出 | 推理 | 备注     |
| ---------------------- | ---------- | --------- | -------- | ---- | -------- |
| `xiaomi/mimo-v2-flash` | 文本       | 262,144   | 8,192    | 否   | 默认模型 |
| `xiaomi/mimo-v2-pro`   | 文本       | 1,048,576 | 32,000   | 是   | 大上下文 |
| `xiaomi/mimo-v2-omni`  | 文本、图像 | 262,144   | 32,000   | 是   | 多模态   |

<Tip>默认模型引用为 `xiaomi/mimo-v2-flash`。当设置了 `XIAOMI_API_KEY` 或存在身份验证配置文件时，提供商会自动注入。</Tip>

## 文本转语音

捆绑的 `xiaomi` 插件还将 Xiaomi MiMo 注册为
`messages.tts` 的语音提供商。它调用 Xiaomi 的聊天补全 TTS 协议，将文本作为
`assistant` 消息，并将可选的风格指导作为 `user` 消息。

| 属性     | 值                                       |
| -------- | ---------------------------------------- |
| TTS ID   | `xiaomi` (`mimo` 别名)                   |
| 身份验证 | `XIAOMI_API_KEY`                         |
| API      | `POST /v1/chat/completions` 搭配 `audio` |
| 默认     | `mimo-v2.5-tts`，语音 `mimo_default`     |
| 输出     | 默认为 MP3；配置后为 WAV                 |

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "xiaomi_api_key",
          model: "mimo-v2.5-tts",
          voice: "mimo_default",
          format: "mp3",
          style: "Bright, natural, conversational tone.",
        },
      },
    },
  },
}
```

支持的内置语音包括 `mimo_default`、`default_zh`、`default_en`、
`Mia`、`Chloe`、`Milo` 和 `Dean`。`mimo-v2-tts` 支持较旧的 MiMo
TTS 账户；默认使用当前的 MiMo-V2.5 TTS 模型。对于语音消息目标（如飞书和 Telegram），OpenClaw 会在交付前通过 `ffmpeg` 将 Xiaomi 的输出转码为 48kHz
Opus 格式。

## 配置示例

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="自动注入行为">
    当您的环境中设置了 `XIAOMI_API_KEY` 或存在身份验证配置文件时，`xiaomi` 提供商会自动注入。除非您想要覆盖模型元数据或基础 URL，否则无需手动配置该提供商。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** — 轻量快速，非常适合通用文本任务。不支持推理。
    - **mimo-v2-pro** — 支持推理，具有 1M token 上下文窗口，适用于长文档工作负载。
    - **mimo-v2-omni** — 支持推理的多模态模型，接受文本和图像输入。

    <Note>
    所有模型均使用 `xiaomi/` 前缀（例如 `xiaomi/mimo-v2-pro`）。
    </Note>

  </Accordion>

  <Accordion title="故障排除">
    - 如果模型未出现，请确认 `XIAOMI_API_KEY` 已设置且有效。
    - 当 Gateway(网关) 作为守护进程运行时，请确保该进程可以使用密钥（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 Shell 中设置的密钥对于守护进程管理的网关进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持续可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Xiaomi MiMo console" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 仪表板和 API 密钥管理。
  </Card>
</CardGroup>
