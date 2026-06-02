---
summary: "XiaomiOpenClaw在 OpenClaw 中使用 Xiaomi MiMo 按量付费和 Token Plan 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need Xiaomi MiMo auth or Token Plan setup
title: "XiaomiXiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 包含一个捆绑的 Xiaomi 插件，其中包含两个文本提供商预设：

- `xiaomi` 用于按量付费密钥 (`sk-...`)
- `xiaomi-token-plan` 用于 Token Plan 密钥 (`tp-...`) 以及区域端点预设

同一插件也注册了 `xiaomi` 语音 (TTS) 提供商。

| 属性          | 值                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 提供商 ID     | `xiaomi` (按量付费), `xiaomi-token-plan` (Token 方案)                                                                                              |
| 插件          | 内置, `enabledByDefault: true`                                                                                                                     |
| 认证环境变量  | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| 新手引导标志  | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| 直接 CLI 标志 | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| 合约          | 聊天补全 + `speechProviders`                                                                                                                       |
| API           | 兼容 OpenAI (`openai-completions`)                                                                                                                 |
| 基础 URL      | 按量付费: `https://api.xiaomimimo.com/v1`; Token 方案预设: `token-plan-{cn,sgp,ams}...`                                                            |
| 默认模型      | `xiaomi/mimo-v2-flash`, `xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS 默认      | `mimo-v2.5-tts`，语音 `mimo_default`                                                                                                               |

## 入门指南

<Steps>
  <Step title="获取正确的密钥">
    在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建按量付费密钥，或者打开您的 Token Plan 订阅页面并复制区域性的 OpenAI 兼容基础 URL 以及匹配的 `tp-...` 密钥。
  </Step>

  <Step title="运行新手引导">
    按量付费：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Token Plan：

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    或者直接传入密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step title="验证模型可用性">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

## 按量付费目录

| 模型参考               | 输入       | 上下文    | 最大输出 | 推理 | 备注     |
| ---------------------- | ---------- | --------- | -------- | ---- | -------- |
| `xiaomi/mimo-v2-flash` | 文本       | 262,144   | 8,192    | 否   | 默认模型 |
| `xiaomi/mimo-v2-pro`   | 文本       | 1,048,576 | 32,000   | 是   | 大上下文 |
| `xiaomi/mimo-v2-omni`  | 文本, 图像 | 262,144   | 32,000   | 是   | 多模态   |

<Tip>默认模型引用为 `xiaomi/mimo-v2-flash`。当设置了 `XIAOMI_API_KEY` 或存在身份验证配置文件时，提供商会自动注入。</Tip>

## Token Plan 目录

选择与 Xiaomi 订阅界面中显示的区域基础 URL 相匹配的 Token Plan 身份验证选项：

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| 模型引用                          | 输入       | 上下文    | 最大输出 | 推理 | 备注     |
| --------------------------------- | ---------- | --------- | -------- | ---- | -------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | 文本       | 1,048,576 | 32,000   | 是   | 默认模型 |
| `xiaomi-token-plan/mimo-v2.5`     | 文本、图像 | 1,048,576 | 32,000   | 是   | 多模态   |

<Tip>Token Plan 新手引导会验证密钥的格式，如果将 `tp-...` 密钥输入到按量付费路径，或者将 `sk-...` 密钥输入到 Token Plan 路径，则会发出警告。</Tip>

## 文本转语音

随附的 `xiaomi`Xiaomi 插件还将 Xiaomi MiMo 注册为
`messages.tts`Xiaomi 的语音提供商。它调用 Xiaomi 的聊天补全 TTS 协议，将文本作为
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
          speakerVoice: "mimo_default",
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
TTS 账户；默认使用当前的 MiMo-V2.5 TTS 模型。对于语音消息目标（如飞书和 Telegram），OpenClaw 会在交付前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz
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
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

定价和兼容性标志来自捆绑的插件清单，因此配置示例省略了 `cost` 和 `compat`，以避免与运行时行为不一致。

Token 计划：

```json5
{
  env: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.5-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.5-pro",
            name: "Xiaomi MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2.5",
            name: "Xiaomi MiMo V2.5",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

定价来自捆绑的清单（Token 计划模型包括分层缓存读取定价），因此配置示例省略了 `cost`。

<AccordionGroup>
  <Accordion title="自动注入行为">
    当在你的环境中设置了 `XIAOMI_API_KEY` 或存在身份验证配置文件时，`xiaomi` 提供商会自动注入。`xiaomi-token-plan` 需要区域性基础 URL，因此支持的路径是捆绑的 Token 计划新手引导选择或显式的 `models.providers.xiaomi-token-plan` 配置块。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** — 轻量且快速，适用于通用文本任务。不支持推理。
    - **mimo-v2-pro** — 支持推理，配备 1M token 上下文窗口，适用于长文档工作负载。
    - **mimo-v2-omni** — 具备推理能力的多模态模型，接受文本和图像输入。
    - **mimo-v2.5-pro** — Token Plan 默认模型，采用 Xiaomi 目前的 V2.5 推理堆栈。
    - **mimo-v2.5** — Token Plan 多模态 V2.5 路由。

    <Note>
    按量付费模型使用 `xiaomi/` 前缀。Token Plan 模型使用 `xiaomi-token-plan/` 前缀。
    </Note>

  </Accordion>

  <Accordion title="故障排除">
    - 如果模型未出现，请确认相关的密钥环境变量或身份验证配置文件存在且有效。
    - 对于 Token Plan，请确认选择的引导区域与订阅页面的基础 URL 匹配，且密钥以 `tp-`Gateway(网关) 开头。
    - 当 Gateway(网关) 作为守护进程运行时，请确保该进程可以访问密钥（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 Shell 中设置的密钥对守护进程管理的网关进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以确保持续可用。
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
