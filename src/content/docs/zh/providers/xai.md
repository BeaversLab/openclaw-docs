---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 内置了用于 Grok 模型的 `xai` 提供商插件。

## 设置

1. 在 xAI 控制台中创建一个 API 密钥。
2. 设置 `XAI_API_KEY`，或运行：

```bash
openclaw onboard --auth-choice xai-api-key
```

3. 选择一个模型，例如：

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

OpenClaw 现在使用 xAI Responses API 作为内置的 xAI 传输方式。同一个
`XAI_API_KEY` 也可以支持由 Grok 驱动的 `web_search`、一等 `x_search`
以及远程 `code_execution`。
如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储了 xAI 密钥，
内置的 xAI 模型提供商现在也会将该密钥作为后备重复使用。
`code_execution` 微调位于 `plugins.entries.xai.config.codeExecution` 下。

## 当前捆绑的模型目录

OpenClaw 现在默认包含以下 xAI 模型系列：

- `grok-3`、`grok-3-fast`、`grok-3-mini`、`grok-3-mini-fast`
- `grok-4`、`grok-4-0709`
- `grok-4-fast`、`grok-4-fast-non-reasoning`
- `grok-4-1-fast`、`grok-4-1-fast-non-reasoning`
- `grok-4.20-beta-latest-reasoning`、`grok-4.20-beta-latest-non-reasoning`
- `grok-code-fast-1`

当较新的 `grok-4*` 和 `grok-code-fast*` ID 遵循
相同的 API 形状时，该插件也会正向解析它们。

快速模型说明：

- `grok-4-fast`、`grok-4-1-fast` 以及 `grok-4.20-beta-*` 变体是
  内置目录中当前支持图像的 Grok 引用。
- `/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
  会按如下方式重写原生 xAI 请求：
  - `grok-3` -> `grok-3-fast`
  - `grok-3-mini` -> `grok-3-mini-fast`
  - `grok-4` -> `grok-4-fast`
  - `grok-4-0709` -> `grok-4-fast`

旧版兼容性别名仍然会规范化为规范的内置 ID。例如：

- `grok-4-fast-reasoning` -> `grok-4-fast`
- `grok-4-1-fast-reasoning` -> `grok-4-1-fast`
- `grok-4.20-reasoning` -> `grok-4.20-beta-latest-reasoning`
- `grok-4.20-non-reasoning` -> `grok-4.20-beta-latest-non-reasoning`

## 网络搜索

捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 视频生成

捆绑的 `xai` 插件还通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型：`xai/grok-imagine-video`
- 模式：文生视频、图生视频以及远程视频编辑/扩展流程
- 支持 `aspectRatio` 和 `resolution`
- 当前限制：不接受本地视频缓冲区；请对视频参考/编辑输入使用远程 `http(s)`
  URL

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

有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/en/tools/video-generation)。

## 已知限制

- 目前仅支持 API 密钥身份验证。OAuth 中尚无 xAI OpenClaw/设备码流程。
- 常规 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它需要与标准 API xAI 传输不同的上游 OpenClaw 接口。

## 注意

- OpenClaw 会在共享运行器路径上自动应用针对 xAI 的工具架构和工具调用兼容性修复。
- 原生 xAI 请求默认 `tool_stream: true`。将
  `agents.defaults.models["xai/<model>"].params.tool_stream` 设置为 `false` 以
  禁用它。
- 捆绑的 xAI 包装器会在发送原生 xAI 请求之前剥离不支持的严格工具架构标志
  和推理载荷键。
- `web_search`、`x_search` 和 `code_execution` 被公开为 OpenClaw 工具。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每个聊天轮次。
- `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码到核心模型运行时中。
- `code_execution` 是远程 xAI 沙箱执行，而不是本地 [`exec`](/en/tools/exec)。
- 有关更广泛的提供商概述，请参阅 [模型提供商](/en/providers/index)。
