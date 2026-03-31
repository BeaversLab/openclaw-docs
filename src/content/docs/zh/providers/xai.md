---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 附带了一个用于 Grok 模型的捆绑 `xai` 提供商插件。

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

OpenClaw 现在使用 xAI Responses API 作为捆绑的 xAI 传输。同一个 `XAI_API_KEY` 也可以驱动基于 Grok 的 `web_search`、一流的 `x_search` 和远程 `code_execution`。如果您在 `plugins.entries.xai.config.webSearch.apiKey` 下存储了 xAI 密钥，捆绑的 xAI 模型提供商现在也会重用该密钥作为备用。`code_execution` 调整位于 `plugins.entries.xai.config.codeExecution` 下。

## 当前捆绑的模型目录

OpenClaw 现在默认包含以下 xAI 模型系列：

- `grok-4`， `grok-4-0709`
- `grok-4-fast-reasoning`， `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`， `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`， `grok-4.20-non-reasoning`
- `grok-code-fast-1`

当较新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形状时，该插件也会自动解析它们。

## 网络搜索

捆绑的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前仅支持 API 密钥身份验证。OpenClaw 中尚不支持 xAI OAuth/设备代码流程。
- 普通 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它需要与标准 OpenClaw xAI 传输不同的上游 API 表面。

## 备注

- OpenClaw 会在共享运行器路径上自动应用特定于 xAI 的工具架构和工具调用兼容性修复。
- `web_search`、`x_search` 和 `code_execution` 作为 OpenClaw 工具公开。OpenClaw 会在每个工具请求中启用其所需的特定 xAI 内置功能，而不是将所有原生工具附加到每个聊天轮次中。
- `x_search` 和 `code_execution` 由捆绑的 xAI 插件拥有，而不是硬编码到核心模型运行时中。
- `code_execution` 是远程 xAI 沙箱执行，而不是本地 [`exec`](/en/tools/exec)。
- 有关更广泛的提供商概述，请参阅 [模型提供商](/en/providers/index)。
