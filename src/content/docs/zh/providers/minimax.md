---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

OpenClaw 的 MiniMax 默认使用 **MiniMax M2.7**。

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
| `MiniMax-M2.7`           | 聊天（推理） | 默认托管的推理模型     |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理层级   |
| `MiniMax-VL-01`          | 视觉         | 图像理解模型           |
| `image-01`               | 图像生成     | 文生图和图生图编辑     |
| `music-2.6`              | 音乐生成     | 默认音乐模型           |
| `music-2.5`              | 音乐生成     | 上一代音乐生成层级     |
| `music-2.0`              | 音乐生成     | 旧版音乐生成层级       |
| `MiniMax-Hailuo-2.3`     | 视频生成     | 文生视频和图像参考流程 |

## 入门指南

选择您偏好的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="OAuth (Coding Plan)">
    **最适用于：** 通过 MiniMax 快速设置 OAuth Coding Plan，无需 API 密钥。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            此操作针对 `api.minimax.io` 进行身份验证。
          </Step>
          <Step title="Verify the 模型 is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            此操作针对 `api.minimaxi.com` 进行身份验证。
          </Step>
          <Step title="Verify the 模型 is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 设置使用 `minimax-portal` 提供商 ID。模型引用遵循 `minimax-portal/MiniMax-M2.7` 格式。
    </Note>

    <Tip>
    MiniMax Coding Plan 的推荐链接（9折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API key">
    **Best for:** 托管 MiniMax 且兼容 Anthropic API。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run 新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            这将 `api.minimax.io` 配置为基础 URL。
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

            这将 `api.minimaxi.com` 配置为基础 URL。
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
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
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
    在兼容 Anthropic 的流式传输路径上，除非您明确自行设置 `thinking`，否则 OpenClaw 默认会禁用 MiniMax 的思考功能。MiniMax 的流式端点以 OpenAI 风格的增量块发出 `reasoning_content`，而不是原生的 Anthropic 思考块，如果在隐式启用的情况下保留启用，可能会导致内部推理泄露到可见输出中。
    </Warning>

    <Note>
    API key 设置使用 `minimax` 提供商 ID。模型引用遵循 `minimax/MiniMax-M2.7` 格式。
    </Note>

  </Tab>
</Tabs>

## 通过 `openclaw configure` 进行配置

使用交互式配置向导来设置 MiniMax，无需编辑 JSON：

<Steps>
  <Step title="Launch the wizard">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="Select Model/auth">
    从菜单中选择 **Model/auth**。
  </Step>
  <Step title="选择一个 MiniMax 身份验证选项">
    选择可用的 MiniMax 选项之一：

    | 身份验证选择 | 描述 |
    | --- | --- |
    | `minimax-global-oauth` | 国际版 OAuth（Coding Plan）|
    | `minimax-cn-oauth` | 国内版 OAuth（Coding Plan）|
    | `minimax-global-api` | 国际版 API 密钥 |
    | `minimax-cn-api` | 国内版 API 密钥 |

  </Step>
  <Step title="选择您的默认模型">
    在提示时选择您的默认模型。
  </Step>
</Steps>

## 功能

### 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- 具有纵横比控制的**文本生成图像**
- 具有纵横比控制的**图像生成图像编辑**（主体参考）
- 每个请求最多生成 **9 张输出图像**
- 每个编辑请求最多支持 **1 张参考图像**
- 支持的纵横比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

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

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 身份验证。如果 MiniMax 已配置，则无需额外配置。

`minimax` 和 `minimax-portal` 都使用相同的
`image-01` 模型注册 `image_generate`。API 密钥设置使用 `MINIMAX_API_KEY`；OAuth 设置可以改用
捆绑的 `minimax-portal` 身份验证路径。

图像生成始终使用 MiniMax 的专用图像端点
(`/v1/image_generation`) 并忽略 `models.providers.minimax.baseUrl`，
因为该字段配置的是聊天/兼容 Anthropic 的基础 URL。设置
`MINIMAX_API_HOST=https://api.minimaxi.com` 以通过中国端点路由图像生成；
默认的全局端点是
`https://api.minimax.io`。

当新手引导或 API 密钥设置写入显式 `models.providers.minimax` 条目时，OpenClaw 会将 `MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed` 具体化为纯文本聊天模型。图像理解功能通过插件拥有的 `MiniMax-VL-01` 媒体提供商单独公开。

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/zh/tools/image-generation)。</Note>

### 文本转语音

捆绑的 `minimax` 插件将 MiniMax T2A v2 注册为 `messages.tts` 的语音提供商。

- 默认 TTS 模型：`speech-2.8-hd`
- 默认声音：`English_expressive_narrator`
- 支持的捆绑模型 ID 包括 `speech-2.8-hd`、`speech-2.8-turbo`、
  `speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、
  `speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 身份验证解析顺序依次为：`messages.tts.providers.minimax.apiKey`，然后是
  `minimax-portal` OAuth/令牌身份验证配置文件，接着是 Token Plan 环境
  密钥 (`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、
  `MINIMAX_CODING_API_KEY`)，最后是 `MINIMAX_API_KEY`。
- 如果未配置 TTS 主机，OpenClaw 将重用已配置的
  `minimax-portal` OAuth 主机，并去除 Anthropic 兼容的路径后缀，
  例如 `/anthropic`。
- 普通音频附件保持 MP3 格式。
- 语音备注目标（如飞书和 Telegram）会通过 `ffmpeg` 将 MiniMax
  MP3 转码为 48kHz Opus 格式，因为飞书/Lark 文件 API 仅
  接受 `file_type: "opus"` 作为原生音频消息。
- MiniMax T2A 接受分数形式的 `speed` 和 `vol`，但 `pitch` 会作为整数发送；OpenClaw 会在发出 API 请求前截断 `pitch` 的小数值。

| 设置                                     | 环境变量               | 默认值                        | 描述                      |
| ---------------------------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主机。    |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。             |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用于语音输出的音色 ID。   |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | 播放速度，`0.5..2.0`。    |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | 音量，`(0, 10]`。         |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | 整数音高偏移，`-12..12`。 |

### 音乐生成

捆绑的 MiniMax 插件通过共享的 `music_generate` 工具为 `minimax` 和 `minimax-portal` 注册音乐生成功能。

- 默认音乐模型：`minimax/music-2.6`
- OAuth 音乐模型：`minimax-portal/music-2.6`
- 也支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控制：`lyrics`、`instrumental`、`durationSeconds`
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

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [音乐生成](/zh/tools/music-generation)。</Note>

### 视频生成

捆绑的 MiniMax 插件通过共享的 `video_generate` 工具为 `minimax` 和 `minimax-portal` 注册视频生成功能。

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

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [视频生成](/zh/tools/video-generation)。</Note>

### 图像理解

MiniMax 插件将图像理解与文本目录分开注册：

| 提供商 ID        | 默认图像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

这就是为什么即使捆绑的文本提供商目录仍然显示仅支持文本的 M2.7 聊天引用，自动媒体路由仍然可以使用 MiniMax 图像理解。

### 网页搜索

MiniMax 插件还通过 MiniMax Token Plan
搜索 API 注册了 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 兼容性回退：当 `MINIMAX_API_KEY` 已指向 token-plan 凭证时
- 区域重用：`plugins.entries.minimax.config.webSearch.region`，然后 `MINIMAX_API_HOST`MiniMax，然后 MiniMax 提供商基本 URL
- 搜索保持在提供商 ID `minimax`OAuth 上；OAuth CN/全局设置可以通过 `models.providers.minimax-portal.baseUrl` 间接引导区域，并可以通过 `MINIMAX_OAUTH_TOKEN` 提供 bearer 认证

配置位于 `plugins.entries.minimax.config.webSearch.*` 之下。

<Note>有关完整的 Web 搜索配置和用法，请参阅 [MiniMax 搜索](MiniMax/en/tools/minimax-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 优先使用 `https://api.minimax.io/anthropic`Anthropic（Anthropic 兼容）；`https://api.minimax.io/v1`OpenAI 对于 OpenAI 兼容载荷是可选的 |
    | `models.providers.minimax.api` | 优先使用 `anthropic-messages`；`openai-completions`OpenAI 对于 OpenAI 兼容载荷是可选的 |
    | `models.providers.minimax.apiKey`MiniMaxAPI | MiniMax API 密钥（`MINIMAX_API_KEY`） |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为你想要加入允许列表的模型设置别名 |
    | `models.mode` | 如果你想要在内置模型之外添加 MiniMax，请保留 `merge`MiniMax |
  </Accordion>

  <Accordion title="Thinking defaults">
    在 `api: "anthropic-messages"`OpenClaw 上，除非在 params/config 中已明确设置了 thinking，否则 OpenClaw 会注入 `thinking: { type: "disabled" }`MiniMax。

    这可以防止 MiniMax 的流式端点在 OpenAI 风格的增量块中发出 `reasoning_content`OpenAI，从而避免内部推理泄露到可见输出中。

  </Accordion>

<Accordion title="Fast mode">`/fast on` 或 `params.fastMode: true` 会在 Anthropic 兼容的流路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`Anthropic。</Accordion>

  <Accordion title="回退示例">
    **最适用于：** 将你最强大的最新一代模型作为主模型，回退到 MiniMax M2.7。下面的示例使用 Opus 作为具体的主模型；请将其替换为你偏好的最新一代主模型。

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

  <Accordion title="Coding Plan 使用详情"API>
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要 coding plan key）。
    - 使用情况轮询在配置时从 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 获取主机，因此使用 `https://api.minimax.io/anthropic` 的全局设置会轮询 `api.minimax.io`OpenClawMiniMax。缺失或格式错误的 base URL 为了兼容性会保留 CN 回退。
    - OpenClaw 将 MiniMax coding-plan 使用情况标准化为与其他提供商相同的 `% left`MiniMax 显示。MiniMax 的原始 `usage_percent` / `usagePercent`OpenClawAPI 字段是剩余配额，而非已用配额，因此 OpenClaw 对其进行了反转。如果存在基于计数的字段，则优先使用。
    - 当 API 返回 `model_remains`OpenClaw 时，OpenClaw 优先使用聊天模型条目，需要时从 `start_time` / `end_time` 推导窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
    - 使用快照将 `minimax`、`minimax-cn` 和 `minimax-portal`MiniMaxMiniMaxOAuth 视为同一个 MiniMax 配额表面，并优先使用存储的 MiniMax OAuth，然后再回退到 Coding Plan key 环境变量。

  </Accordion>
</AccordionGroup>

## 注意事项

- 模型引用遵循身份验证路径：
  - API-key 设置：API`minimax/<model>`
  - OAuth 设置：OAuth`minimax-portal/<model>`
- 默认聊天模型：`MiniMax-M2.7`
- 备用聊天模型：`MiniMax-M2.7-highspeed`
- 新手引导和直接 API 密钥设置会为两个 M2.7 变体编写仅文本模型定义
- 图像理解使用插件拥有的 `MiniMax-VL-01` 媒体提供商
- 如果需要精确的成本跟踪，请更新 `models.json` 中的定价值
- 使用 `openclaw models list` 确认当前提供商 ID，然后使用 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 进行切换

<Tip>MiniMax 编程计划推荐链接（9折优惠）：[MiniMax 编程计划](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>有关提供商规则，请参阅 [模型提供商](/zh/concepts/model-providers)。</Note>

## 故障排除

<AccordionGroup>
  <Accordion title='"Unknown 模型: minimax/MiniMax-M2.7"'>
    这通常意味着 **未配置 MiniMax 提供商**（未找到匹配的提供商条目和 MiniMax 认证配置文件/环境密钥）。针对此检测的修复包含在 **2026.1.12** 版本中。修复方法如下：

    - 升级到 **2026.1.12**（或从源代码 `main` 运行），然后重启网关。
    - 运行 `openclaw configure` 并选择 **MiniMax** 认证选项，或者
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 块，或者
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 认证配置文件，以便注入匹配的提供商。

    请确保模型 ID **区分大小写**：

    - API 密钥路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后使用以下命令重新检查：

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
  <Card title="Image generation" href="/zh/tools/image-generation" icon="image">
    共享的图像工具参数和提供商选择。
  </Card>
  <Card title="Music generation" href="/zh/tools/music-generation" icon="music">
    共享的音乐工具参数和提供商选择。
  </Card>
  <Card title="Video generation" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax Search" href="/zh/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Token 计划配置网络搜索。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
