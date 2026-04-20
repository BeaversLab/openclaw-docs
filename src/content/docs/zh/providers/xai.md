---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 随附了一个用于 Grok 模型的捆绑 `xai` 提供商插件。

## 入门指南

<Steps>
  <Step title="创建 API 密钥">
    在 [xAI 控制台](https://console.x.ai/) 中创建 API 密钥。
  </Step>
  <Step title="设置您的 API 密钥">
    设置 `XAI_API_KEY`，或运行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="选择一个模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作为捆绑的 xAI 传输。同一个 `XAI_API_KEY` 也可以为支持 Grok 的 `web_search`、一等 `x_search` 以及远程 `code_execution` 提供支持。 如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储了 xAI 密钥， 捆绑的 xAI 模型提供商也会将该密钥作为回退重用。 `code_execution` 调整位于 `plugins.entries.xai.config.codeExecution` 下。</Note>

## 捆绑模型目录

OpenClaw 默认包含以下 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`、`grok-3-fast`、`grok-3-mini`、`grok-3-mini-fast`               |
| Grok 4         | `grok-4`、`grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`、`grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`、`grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`、`grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

当更新的 `grok-4*` 和 `grok-code-fast*` ID 遵循
相同的 API 形状时，该插件也会对其进行前向解析。

<Tip>`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 变体是 捆绑目录中当前支持图像的 Grok 引用。</Tip>

### 快速模式映射

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
按如下方式重写原生 xAI 请求：

| 源模型        | 快速模式目标       |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 旧版兼容别名

旧版别名仍规范化为规范的捆绑 ID：

| 旧版别名                  | 规范 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="网络搜索">
    捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="视频生成">
    捆绑的 `xai` 插件通过共享的
    `video_generate` 工具注册视频生成。

    - 默认视频模型：`xai/grok-imagine-video`
    - 模式：文生视频、图生视频以及远程视频编辑/扩展流程
    - 支持 `aspectRatio` 和 `resolution`

    <Warning>
    不接受本地视频缓冲区。对于
    视频引用和编辑输入，请使用远程 `http(s)` URL。
    </Warning>

    要将 xAI 用作默认视频提供商：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    有关共享工具参数、
    提供商选择和故障转移行为，请参阅[视频生成](/en/tools/video-generation)。
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    内置的 xAI 插件将 `x_search` 暴露为一个 OpenClaw 工具，用于通过 Grok 搜索
    X（前 Twitter）内容。

    配置路径：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 启用或禁用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用于 x_search 请求的模型     |
    | `inlineCitations`  | boolean | —                  | 在结果中包含内联引用  |
    | `maxTurns`         | number  | —                  | 最大对话轮数           |
    | `timeoutSeconds`   | number  | —                  | 请求超时（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 缓存生存时间（分钟）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Code execution configuration">
    内置的 xAI 插件将 `code_execution` 暴露为一个 OpenClaw 工具，用于
    在 xAI 的沙盒环境中执行远程代码。

    配置路径：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 启用或禁用代码执行  |
    | `model`           | string  | `grok-4-1-fast`    | 用于代码执行请求的模型   |
    | `maxTurns`        | number  | —                  | 最大对话轮数               |
    | `timeoutSeconds`  | number  | —                  | 请求超时（秒）               |

    <Note>
    这是远程 xAI 沙盒执行，不是本地 [`exec`](/en/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="已知限制">- 目前仅支持 API 密钥认证。OpenClaw 中尚未提供 xAI API 或设备代码流。 - `grok-4.20-multi-agent-experimental-beta-0304` 在标准 xAI 提供商路径上不受支持，因为它需要不同于标准 OpenClaw xAI 传输的上游 OAuth 接口。</Accordion>

  <Accordion title="高级说明">
    - OpenClaw 会在共享运行器路径上自动应用特定于 xAI 的工具架构和工具调用兼容性修复。
    - 原生 xAI 请求默认 `tool_stream: true`。将 `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 即可禁用。
    - 打包的 xAI 封装器在发送原生 xAI 请求之前，会剥离不支持的严格工具架构标志和推理负载键。
    - `web_search`、`x_search` 和 `code_execution` 被暴露为 OpenClaw 工具。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每次对话轮次中。
    - `x_search` 和 `code_execution` 由打包的 xAI 插件拥有，而不是硬编码到核心模型运行时中。
    - `code_execution` 是远程 xAI 沙盒执行，而非本地 [`exec`](/en/tools/exec)。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/en/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="所有提供商" href="/en/providers/index" icon="grid-2">
    更广泛的提供商概览。
  </Card>
  <Card title="故障排除" href="/en/help/troubleshooting" icon="wrench">
    常见问题与修复。
  </Card>
</CardGroup>
