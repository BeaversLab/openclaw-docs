---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供商默认使用 **MiniMax M3**。

MiniMax 还提供：

- 通过 T2A v2 捆绑的语音合成
- 通过 `MiniMax-VL-01` 捆绑的图像理解
- 通过 `music-2.6` 捆绑的音乐生成
- 通过 MiniMax Token Plan 搜索 API 捆绑的 `web_search`

提供商拆分：

| 提供商 ID        | 认证     | 功能                                                         |
| ---------------- | -------- | ------------------------------------------------------------ |
| `minimax`        | API 密钥 | 文本、图像生成、音乐生成、视频生成、图像理解、语音、网络搜索 |
| `minimax-portal` | OAuth    | 文本、图像生成、音乐生成、视频生成、图像理解、语音           |

## 内置目录

| 模型                     | 类型         | 描述                   |
| ------------------------ | ------------ | ---------------------- |
| `MiniMax-M3`             | 聊天（推理） | 默认托管的推理模型     |
| `MiniMax-M2.7`           | 聊天（推理） | 之前的托管推理模型     |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理层级   |
| `MiniMax-VL-01`          | 视觉         | 图像理解模型           |
| `image-01`               | 图像生成     | 文生图和图生图编辑     |
| `music-2.6`              | 音乐生成     | 默认音乐模型           |
| `music-2.5`              | 音乐生成     | 之前的音乐生成层级     |
| `music-2.0`              | 音乐生成     | 旧版音乐生成层级       |
| `MiniMax-Hailuo-2.3`     | 视频生成     | 文生视频和图像参考流程 |

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="OAuthOAuth (Coding Plan)"MiniMaxOAuthAPI>
    **适用于：** 通过 OAuth 快速设置 MiniMax Coding Plan，无需 API 密钥。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="运行 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            这将针对 `api.minimax.io` 进行身份验证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="运行 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            这将针对 `api.minimaxi.com` 进行身份验证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```OAuth
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 设置使用 `minimax-portal` 提供商 id。模型引用遵循 `minimax-portal/MiniMax-M3`MiniMaxMiniMax 格式。
    </Note>

    <Tip>
    MiniMax Coding Plan 的推荐链接（9折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="APIAPI key">
    **最佳选择：** 兼容 MiniMaxAnthropic API 的托管 API。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这会将 `api.minimax.io` 配置为基础 URL。
          </Step>
          <Step title="Verify the 模型 is available">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            这会将 `api.minimaxi.com` 配置为基础 URL。
          </Step>
          <Step title="Verify the 模型 is available">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### 配置示例

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M3" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    在兼容 Anthropic 的流式路径上，除非您显式自行设置 `thinking`，否则 OpenClaw 默认会禁用 MiniMax 思考模式。MiniMax 的流式端点以 OpenAI 风格的 delta 块形式发出 `reasoning_content`，而不是原生的 Anthropic 思考块，如果隐式保持启用，这可能会将内部推理泄漏到可见输出中。
    </Warning>

    <Note>
    API 密钥设置使用 `minimax` 提供商 ID。模型引用遵循 `minimax/MiniMax-M3` 格式。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 进行配置

使用交互式配置向导来设置 MiniMax，而无需编辑 JSON：

<Steps>
  <Step title="Launch the wizard">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="选择模型/授权">
    从菜单中选择 **模型/授权**。
  </Step>
  <Step title="选择 MiniMax 授权选项">
    选择一个可用的 MiniMax 选项：

    | 授权选项 | 描述 |
    | --- | --- |
    | `minimax-global-oauth` | 国际 OAuth (Coding 计划) |
    | `minimax-cn-oauth` | 中国 OAuth (Coding 计划) |
    | `minimax-global-api` | 国际 API 密钥 |
    | `minimax-cn-api` | 中国 API 密钥 |

  </Step>
  <Step title="选择你的默认模型">
    提示时选择你的默认模型。
  </Step>
</Steps>

## 功能

### 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- **文本到图像生成**，支持宽高比控制
- **图像到图像编辑**（主体参考），支持宽高比控制
- 每个请求最多生成 **9 张输出图像**
- 每次编辑请求最多使用 **1 张参考图像**
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

要使用 MiniMax 进行图像生成，请将其设置为图像生成提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 授权。如果 MiniMax 已设置，则无需额外配置。

`minimax` 和 `minimax-portal` 均使用相同的
`image-01` 模型注册 `image_generate`。API 密钥设置使用 `MINIMAX_API_KEY`；OAuth 设置可以改为
使用捆绑的 `minimax-portal` 授权路径。

图像生成始终使用 MiniMax 的专用图像端点
(`/v1/image_generation`) 并忽略 `models.providers.minimax.baseUrl`，
因为该字段配置的是聊天/Anthropic 兼容的基础 URL。设置
`MINIMAX_API_HOST=https://api.minimaxi.com` 以通过 CN 端点路由图像生成；
默认的全局端点是 `https://api.minimax.io`。

当新手引导或 API 密钥设置写入显式的 `models.providers.minimax`
条目时，OpenClaw 会将 `MiniMax-M3`、`MiniMax-M2.7` 和
`MiniMax-M2.7-highspeed` 具体化为聊天模型。M3 支持文本和图像输入；
图像理解功能仍然通过插件拥有的
`MiniMax-VL-01` 媒体提供商单独暴露。

<Note>请参阅 [图像生成](/zh/tools/image-generation) 以了解共享工具参数、提供商选择和故障转移行为。</Note>

### 文本转语音

捆绑的 `minimax` 插件将 MiniMax T2A v2 注册为
`messages.tts` 的语音提供商。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认语音：`English_expressive_narrator`
- 支持的捆绑模型 ID 包括 `speech-2.8-hd`、`speech-2.8-turbo`、
  `speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、
  `speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 身份验证解析顺序依次为 `messages.tts.providers.minimax.apiKey`，然后是
  `minimax-portal` OAuth/token 身份验证配置文件，接着是 Token 计划环境
  密钥 (`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、
  `MINIMAX_CODING_API_KEY`)，最后是 `MINIMAX_API_KEY`。
- 如果未配置 TTS 主机，OpenClaw 将复用已配置的
  `minimax-portal` OAuth 主机，并去除 Anthropic 兼容的路径后缀，
  例如 `/anthropic`。
- 普通音频附件保持 MP3 格式。
- 语音笔记目标（如飞书和 Telegram）会通过 `ffmpeg` 从 MiniMax MP3 转码为 48kHz Opus，因为飞书/Lark 文件 API 仅接受 `file_type: "opus"` 作为原生音频消息。
- MiniMax T2A 接受小数形式的 `speed` 和 `vol`，但 `pitch` 会作为整数发送；OpenClaw 会在 API 请求之前截断小数形式的 `pitch` 值。

| Setting                                         | Env var                | Default                       | Description               |
| ----------------------------------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `messages.tts.providers.minimax.baseUrl`        | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主机。    |
| `messages.tts.providers.minimax.model`          | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。             |
| `messages.tts.providers.minimax.speakerVoiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用于语音输出的语音 ID。   |
| `messages.tts.providers.minimax.speed`          |                        | `1.0`                         | 播放速度，`0.5..2.0`。    |
| `messages.tts.providers.minimax.vol`            |                        | `1.0`                         | 音量，`(0, 10]`。         |
| `messages.tts.providers.minimax.pitch`          |                        | `0`                           | 整数音高偏移，`-12..12`。 |

### 音乐生成

内置的 MiniMax 插件通过共享的 `music_generate` 工具为 `minimax` 和 `minimax-portal` 注册音乐生成功能。

- 默认音乐模型：`minimax/music-2.6`
- OAuth 音乐模型：`minimax-portal/music-2.6`
- 也支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控制：`lyrics`，`instrumental`
- 输出格式：`mp3`
- 基于会话的运行通过共享任务/状态流分离，包括 `action: "status"`

要将 MiniMax 用作默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [Music Generation](/zh/tools/music-generation)。</Note>

### 视频生成

内置的 MiniMax 插件通过共享的
`video_generate` 工具为 `minimax` 和 `minimax-portal` 注册视频生成功能。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- OAuth 视频模型：`minimax-portal/MiniMax-Hailuo-2.3`
- 模式：文本生成视频和单图参考流
- 支持 `aspectRatio` 和 `resolution`

要将 MiniMax 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [Video Generation](/zh/tools/video-generation)。</Note>

### 图像理解

MiniMax 插件独立于文本目录注册图像理解功能：

| 提供商 ID        | 默认图像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

这就是为什么即使内置的文本提供商目录中也包含 M3 支持图像的聊天引用，自动媒体路由仍可使用 MiniMax 图像理解功能。

### 网络搜索

MiniMax 插件还通过 MiniMax Token Plan
搜索 API 注册 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 兼容性回退：当 `MINIMAX_API_KEY` 已指向 token-plan 凭据时
- 区域复用：首先 `plugins.entries.minimax.config.webSearch.region`，然后 `MINIMAX_API_HOST`，最后 MiniMax 提供商基础 URL
- 搜索保持在提供商 ID `minimax`OAuth 上；OAuth 中国/全局设置可以通过 `models.providers.minimax-portal.baseUrl` 间接引导区域，并可以通过 `MINIMAX_OAUTH_TOKEN` 提供 bearer 认证

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>查看 [MiniMax 搜索](MiniMax/en/tools/minimax-search) 以获取完整的 Web 搜索配置和用法。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Configuration options">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 优先使用 `https://api.minimax.io/anthropic`Anthropic（Anthropic 兼容）；`https://api.minimax.io/v1`OpenAI 对于 OpenAI 兼容的负载是可选的 |
    | `models.providers.minimax.api` | 优先使用 `anthropic-messages`；`openai-completions`OpenAI 对于 OpenAI 兼容的负载是可选的 |
    | `models.providers.minimax.apiKey`MiniMaxAPI | MiniMax API 密钥（`MINIMAX_API_KEY`） |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为您希望在允许列表中的模型设置别名 |
    | `models.mode` | 如果您想将 MiniMax 与内置模型一起添加，请保留 `merge`MiniMax |
  </Accordion>

  <Accordion title="Thinking defaults">
    在 `api: "anthropic-messages"`OpenClaw 上，除非在参数/配置中已明确设置，否则 OpenClaw 会注入 `thinking: { type: "disabled" }`MiniMax。

    这可以防止 MiniMax 的流式端点在 OpenAI 风格的增量块中发出 `reasoning_content`OpenAI，从而避免将内部推理泄露到可见输出中。

  </Accordion>

<Accordion title="Fast mode">`/fast on` 或 `params.fastMode: true` 在 Anthropic 兼容的流式路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。</Accordion>

  <Accordion title="Fallback example">
    **最适用于：** 将您最强大的最新一代模型作为首选，在故障时回退到 MiniMax M2.7。下面的示例使用 Opus 作为具体的首选模型；您可以将其替换为您偏好的最新一代首选模型。

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Coding Plan 使用详情">
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要一个 Coding Plan 密钥）。
    - 使用轮询从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 派生主机（如果已配置），因此使用 `https://api.minimax.io/anthropic` 的全局设置会轮询 `api.minimax.io`。为了兼容性，缺失或格式错误的基础 URL 会保留 CN 回退。
    - OpenClaw 将 MiniMax coding-plan 使用情况规范化为与其他提供商相同的 `% left` 显示。MiniMax 原始的 `usage_percent` / `usagePercent` 字段是剩余配额，而非已用配额，因此 OpenClaw 会将其反转。如果存在，基于计数的字段优先。
    - 当 API 返回 `model_remains` 时，OpenClaw 优先选择聊天模型条目，在需要时从 `start_time` / `end_time` 派生窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
    - 使用快照将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额面，并在回退到 Coding Plan 密钥环境变量之前优先使用存储的 MiniMax OAuth。

  </Accordion>
</AccordionGroup>

## 注意事项

- 模型引用遵循身份验证路径：
  - API 密钥设置：`minimax/<model>`
  - OAuth 设置：`minimax-portal/<model>`
- 默认聊天模型：`MiniMax-M3`
- 替代聊天模型：`MiniMax-M2.7`、`MiniMax-M2.7-highspeed`
- 新手引导和直接 API 密钥设置会为 M3 和两个 M2.7 变体编写模型定义
- 图像理解使用插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如果需要精确的成本跟踪，请更新 `models.json` 中的价格值
- 使用 `openclaw models list` 确认当前的提供商 ID，然后使用 `openclaw models set minimax/MiniMax-M3` 或 `openclaw models set minimax-portal/MiniMax-M3` 进行切换

<Tip>MiniMax 编码计划的推荐链接（9折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>请参阅 [Model providers](/zh/concepts/model-providers) 了解提供商规则。</Note>

## 故障排除

<AccordionGroup>
  <Accordion title='"Unknown 模型: minimax/MiniMax-M3"'>
    这通常意味着**未配置 MiniMax 提供商**（未找到匹配的提供商条目和 MiniMax 认证配置文件/环境密钥）。此检测问题的修复包含在 **2026.1.12** 中。修复方法如下：

    - 升级到 **2026.1.12**（或从源码运行 `main`），然后重启网关。
    - 运行 `openclaw configure` 并选择一个 **MiniMax** 认证选项，或者
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 块，或者
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 认证配置文件，以便注入匹配的提供商。

    确保模型 ID 区分**大小写**：

    - API-key 路径：`minimax/MiniMax-M3`、`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后重新检查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax 搜索" href="/zh/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax 令牌计划进行网络搜索配置。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
