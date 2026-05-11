---
summary: "火山引擎设置（豆包模型、代码端点和 Seed Speech TTS）"
title: "火山引擎（豆包）"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
  - You want to use Volcengine Speech text-to-speech
---

火山引擎提供商提供对豆包模型和第三方模型的访问，这些模型托管在火山引擎上，针对通用和代码工作负载设有独立的端点。同一个打包插件也可以将火山引擎语音注册为 TTS 提供商。

| 详细     | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 提供商   | `volcengine` （通用 + TTS） + `volcengine-plan` （代码）   |
| 模型认证 | `VOLCANO_ENGINE_API_KEY`                                   |
| TTS 认证 | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` |
| API      | OpenAI 兼容模型，BytePlus Seed Speech TTS                  |

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行交互式新手引导：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    这会通过一个 API 密钥同时注册通用（`volcengine`）和代码（`volcengine-plan`）提供商。

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置（CI、脚本），直接传递密钥：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供商和端点

| 提供商            | 端点                                      | 用例     |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 代码模型 |

<Note>这两个提供商均通过一个 API 密钥进行配置。设置会自动注册两者。</Note>

## 内置目录

<Tabs>
  <Tab title="常规 (volcengine)">
    | 模型参考 | 名称 | 输入 | 上下文 | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | text, image | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | text, image |
    256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | text, image | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | text, image | 128,000 |
  </Tab>
  <Tab title="编码 (volcengine-plan)">
    | 模型参考 | 名称 | 输入 | 上下文 | | ------------------------------------------------- | ------------------------ | ----- | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | text | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | text | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | text | 200,000 | | `volcengine-plan/kimi-k2-thinking` | Kimi K2
    Thinking | text | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | text | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | text | 256,000 |
  </Tab>
</Tabs>

## 文本转语音

Volcengine TTS 使用 BytePlus Seed Speech HTTP API，其配置与 OpenAI 兼容的 Doubao 模型 API 密钥是分开的。在 BytePlus 控制台中，打开 Seed Speech > Settings > API Keys 并复制 API 密钥，然后设置：

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

然后在 `openclaw.json` 中启用它：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

对于语音备注目标，OpenClaw 向 Volcengine 请求提供商原生的 `ogg_opus`。对于普通音频附件，它请求 `mp3`。提供商别名 `bytedance` 和 `doubao` 也解析为同一语音提供商。

默认资源 ID 为 `seed-tts-1.0`，因为这是 BytePlus 在默认项目中授予新创建的 Seed Speech API 密钥的 ID。如果您的项目具有 TTS 2.0 权限，请设置 `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`。

<Warning>`VOLCANO_ENGINE_API_KEY` 是用于 ModelArk/Doubao 模型端点的，而不是 Seed Speech API 密钥。TTS 需要来自 BytePlus Speech 控制台的 Seed Speech API 密钥，或旧的 Speech 控制台 AppID/token 对。</Warning>

旧的 AppID/token 身份验证仍然支持较旧的 Speech 控制台应用程序：

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

## 高级配置

<AccordionGroup>
  <Accordion title="新手引导后的默认模型">
    `openclaw onboard --auth-choice volcengine-api-key` 目前将
    `volcengine-plan/ark-code-latest` 设置为默认模型，同时注册
    通用 `volcengine` 目录。
  </Accordion>

<Accordion title="模型选择器回退行为">在新手引导/配置模型选择期间，Volcengine 身份验证选项首选 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未 加载，OpenClaw 将回退到未过滤的目录，而不是显示 空的提供商范围选择器。</Accordion>

  <Accordion title="守护进程的环境变量">
    如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保模型和 TTS
    环境变量（如 `VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、
    `BYTEPLUS_SEED_SPEECH_API_KEY`、`VOLCENGINE_TTS_APPID` 和
    `VOLCENGINE_TTS_TOKEN`）对该进程可用（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

<Warning>当将 OpenClaw 作为后台服务运行时，在交互式 shell 中设置的环境变量不会自动继承。请参阅上面的守护进程说明。</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/zh/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
