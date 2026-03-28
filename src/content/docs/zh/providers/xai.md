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

## 当前捆绑模型目录

OpenClaw 现在开箱即用地包含这些 xAI 模型系列：

- `grok-4`, `grok-4-0709`
- `grok-4-fast-reasoning`, `grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `grok-4.20-reasoning`, `grok-4.20-non-reasoning`
- `grok-code-fast-1`

当新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形状时，该插件也会自动解析它们。

## 网页搜索

内置的 `grok` 网页搜索提供商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前仅支持 API 密钥认证。OAuth 中尚不支持 xAI OpenClaw/设备码流程。
- 标准的 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它需要的上游 API 接口与标准的 OpenClaw xAI 传输不同。
- 原生 xAI 服务器端工具（如 `x_search` 和 `code_execution`）在内置插件中尚未成为一流的模型提供商功能。

## 备注

- OpenClaw 会在共享运行器路径上自动应用特定于 xAI 的工具架构和工具调用兼容性修复。
- 有关更广泛的提供商概览，请参阅 [模型提供商](/zh/providers/index)。
