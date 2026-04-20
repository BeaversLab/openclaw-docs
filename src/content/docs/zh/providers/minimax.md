---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供商默认为 **MiniMax M2.7**。

MiniMax 还提供：

- 通过 T2A v2 捆绑的语音合成
- 通过 `MiniMax-VL-01` 捆绑的图像理解
- 通过 `music-2.5+` 捆绑的音乐生成
- 通过 MiniMax Coding Plan 搜索 API 捆绑的 `web_search`

提供商分类：

| 提供商 ID        | 身份验证 | 功能                                     |
| ---------------- | -------- | ---------------------------------------- |
| `minimax`        | API 密钥 | 文本、图像生成、图像理解、语音、网络搜索 |
| `minimax-portal` | OAuth    | 文本、图像生成、图像理解                 |

## 模型系列

| 模型                     | 类型         | 描述                   |
| ------------------------ | ------------ | ---------------------- |
| `MiniMax-M2.7`           | 聊天（推理） | 默认托管的推理模型     |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理层级   |
| `MiniMax-VL-01`          | 视觉         | 图像理解模型           |
| `image-01`               | 图像生成     | 文生图和图生图编辑     |
| `music-2.5+`             | 音乐生成     | 默认音乐模型           |
| `music-2.5`              | 音乐生成     | 上一代音乐生成层级     |
| `music-2.0`              | 音乐生成     | 旧版音乐生成层级       |
| `MiniMax-Hailuo-2.3`     | 视频生成     | 文生视频和图像参考流程 |

## 入门指南

选择您首选的身份验证方法并按照设置步骤进行操作。

<Tabs>
  <Tab title="OAuth（Coding Plan）">
    **最适用于：** 通过 OAuth 快速设置 MiniMax Coding Plan，无需 API 密钥。

    <Tabs>
      <Tab title="国际版">
        <Steps>
          <Step title="运行新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            此操作将针对 `api.minimax.io` 进行身份验证。
          </Step>
          <Step title="验证模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中国版">
        <Steps>
          <Step title="运行新手引导">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            此操作将针对 `api.minimaxi.com` 进行身份验证。
          </Step>
          <Step title="验证模型是否可用">
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
    MiniMax Coding Plan 的推荐链接（9 折优惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API key">
    **最适用于：** 托管的 MiniMax，兼容 Anthropic API。

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
                input: ["text", "image"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text", "image"],
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
    在兼容 Anthropic 的流式路径上，除非您显式地自行设置 `thinking`，否则 OpenClaw 默认会禁用 MiniMax 思维模式。MiniMax 的流式端点在 OpenAI 风格的增量块中发出 `reasoning_content`，而不是原生的 Anthropic 思维模块，如果隐式保持启用状态，可能会导致内部推理内容泄露到可见输出中。
    </Warning>

    <Note>
    API 密钥设置使用 `minimax` 提供商 ID。模型引用遵循 `minimax/MiniMax-M2.7` 格式。
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

当新手引导或 API 密钥设置写入显式的 `models.providers.minimax`
条目时，OpenClaw 会实例化 `MiniMax-M2.7` 和
`MiniMax-M2.7-highspeed`，其值为 `input: ["text", "image"]`。

内置的捆绑 MiniMax 文本目录本身在存在该显式提供商配置之前，保持仅文本元数据状态。图像理解通过插件拥有的 `MiniMax-VL-01` 媒体提供商单独公开。

<Note>请参阅[图像生成](/zh/tools/image-generation)以了解共享工具参数、提供商选择和故障转移行为。</Note>

### 音乐生成

捆绑的 `minimax` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`minimax/music-2.5+`
- 还支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控制：`lyrics`、`instrumental`、`durationSeconds`
- 输出格式：`mp3`
- 会话支持的运行通过共享任务/状态流分离，包括 `action: "status"`

要将 MiniMax 用作默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

<Note>请参阅[音乐生成](/zh/tools/music-generation)以了解共享工具参数、提供商选择和故障转移行为。</Note>

### 视频生成

捆绑的 `minimax` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- 模式：文本生成视频和单图像参考流
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

<Note>请参阅[视频生成](/zh/tools/video-generation)以了解共享工具参数、提供商选择和故障转移行为。</Note>

### 图像理解

MiniMax 插件与文本目录分开注册图像理解：

| 提供商 ID        | 默认图像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

这就是为什么自动媒体路由可以使用 MiniMax 图像理解，即使捆绑的文本提供商目录仍显示仅文本的 M2.7 聊天引用。

### 网络搜索

MiniMax 插件还通过 MiniMax 编码计划
搜索 API 注册 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、片段、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`
- 兼容性回退：当 `MINIMAX_API_KEY` 已指向编码计划令牌时
- 区域重用：`plugins.entries.minimax.config.webSearch.region`，然后 `MINIMAX_API_HOST`，然后 MiniMax 提供商基础 URL
- 搜索保持在提供商 ID `minimax` 上；OAuth 中国/全球设置仍可通过 `models.providers.minimax-portal.baseUrl` 间接引导区域

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。

<Note>有关完整的网络搜索配置和用法，请参阅 [MiniMax 搜索](/zh/tools/minimax-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置选项">
    | 选项 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 优先使用 `https://api.minimax.io/anthropic`（与 Anthropic 兼容）；对于与 OpenAI 兼容的负载，`https://api.minimax.io/v1` 是可选的 |
    | `models.providers.minimax.api` | 优先使用 `anthropic-messages`；对于与 OpenAI 兼容的负载，`openai-completions` 是可选的 |
    | `models.providers.minimax.apiKey` | MiniMax API 密钥 (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | 定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 为你希望在允许列表中的模型设置别名 |
    | `models.mode` | 如果你想将 MiniMax 与内置模型一起添加，请保留 `merge` |
  </Accordion>

  <Accordion title="思维默认值">
    在 `api: "anthropic-messages"` 上，除非在 params/config 中已显式设置思维参数，否则 OpenClaw 会注入 `thinking: { type: "disabled" }`。

    这可以防止 MiniMax 的流式端点在 OpenAI 风格的增量块中发出 `reasoning_content`，从而避免内部推理泄漏到可见输出中。

  </Accordion>

<Accordion title="快速模式">`/fast on` 或 `params.fastMode: true` 在 Anthropic 兼容的流式路径上将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。</Accordion>

  <Accordion title="回退示例">
    **最佳适用场景：** 将您最强的最新一代模型作为主要模型，回退到 MiniMax M2.7。下面的示例使用 Opus 作为具体的主要模型；您可以将其替换为您首选的最新一代主要模型。

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
    - Coding Plan 使用 API： `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要一个 coding plan key）。
    - OpenClaw 将 MiniMax 的 coding-plan 使用情况标准化为与其他提供商相同的 `% left` 显示格式。MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余配额，而非已消耗配额，因此 OpenClaw 对其进行了反转。当存在基于计数的字段时，优先使用这些字段。
    - 当 API 返回 `model_remains` 时，OpenClaw 优先选择聊天模型条目，并在需要时从 `start_time` / `end_time` 推导窗口标签，同时在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
    - 使用快照将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额表面，并在回退到 Coding Plan key 环境变量之前，优先使用存储的 MiniMax OAuth。
  </Accordion>
</AccordionGroup>

## 备注

- 模型引用遵循身份验证路径：
  - API 密钥设置： `minimax/<model>`
  - OAuth 设置： `minimax-portal/<model>`
- 默认聊天模型：`MiniMax-M2.7`
- 备选聊天模型：`MiniMax-M2.7-highspeed`
- 新手引导和直接 API 密钥设置需要为两个 M2.7 变体使用 `input: ["text", "image"]` 编写显式模型定义
- 捆绑的提供商目录目前将聊天引用公开为仅文本元数据，直到存在显式的 MiniMax 提供商配置
- 如果需要精确的成本跟踪，请更新 `models.json` 中的定价值
- 使用 `openclaw models list` 确认当前提供商 ID，然后使用 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 进行切换

<Tip>MiniMax 编码计划（九折优惠）的推荐链接：[MiniMax 编码计划](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>有关提供商规则，请参阅[模型提供商](/zh/concepts/model-providers)。</Note>

## 故障排除

<AccordionGroup>
  <Accordion title='"未知模型：minimax/MiniMax-M2.7"'>
    这通常意味着 **MiniMax 提供商未配置**（未找到匹配的提供商条目和 MiniMax 身份验证配置文件/环境密钥）。针对此检测的修复将在 **2026.1.12** 版本中提供。修复方法：

    - 升级到 **2026.1.12**（或从源代码 `main` 运行），然后重启网关。
    - 运行 `openclaw configure` 并选择一个 **MiniMax** 身份验证选项，或者
    - 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 代码块，或者
    - 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或一个 MiniMax 身份验证配置文件，以便注入匹配的提供商。

    确保模型 ID **区分大小写**：

    - API 密钥路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路径：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然后使用以下命令重新检查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享的图像工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    共享的音乐工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="MiniMax 搜索" href="/zh/tools/minimax-search" icon="magnifying-glass">
    通过 MiniMax Coding Plan 进行网络搜索配置。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    一般故障排除和常见问题。
  </Card>
</CardGroup>
