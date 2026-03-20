---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - 您想要在 OpenClaw 中使用 Grok 模型
  - 您正在配置 xAI 认证或模型 ID
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

## 当前内置的模型目录

OpenClaw 现在内置了这些 xAI 模型系列：

- `grok-4`，`grok-4-0709`
- `grok-4-fast-reasoning`，`grok-4-fast-non-reasoning`
- `grok-4-1-fast-reasoning`，`grok-4-1-fast-non-reasoning`
- `grok-4.20-experimental-beta-0304-reasoning`
- `grok-4.20-experimental-beta-0304-non-reasoning`
- `grok-code-fast-1`

当新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形状时，该插件也会对其进行正向解析。

## 网络搜索

内置的 `grok` 网络搜索提供商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 已知限制

- 目前仅支持 API 密钥认证。OAuth 中尚不支持 xAI OpenClaw/设备码流程。
- 普通的 xAI 提供商路径不支持 `grok-4.20-multi-agent-experimental-beta-0304`，因为它所需的上游 API 表面与标准的 OpenClaw xAI 传输不同。
- 原生 xAI 服务器端工具（如 `x_search` 和 `code_execution`）尚未成为内置插件中的一等模型提供商功能。

## 备注

- OpenClaw 会在共享的运行器路径上自动应用针对 xAI 的工具架构和工具调用兼容性修复。
- 有关更广泛提供商的概述，请参阅 [模型提供商](/zh/providers/index)。

import zh from "/components/footer/zh.mdx";

<zh />
