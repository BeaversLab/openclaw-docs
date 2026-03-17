---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的包布局，请参阅 [插件包](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 包：`.codex-plugin/plugin.json`
- Claude 包：`.claude-plugin/plugin.json` 或默认的 Claude 组件
  布局（不包含清单）
- Cursor 包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些包布局，但它们不会根据
此处描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取包元数据、声明的技能根、Claude 命令根、Claude 包 `settings.json` 默认值以及支持的挂钩包。

每个原生 OpenClaw 插件 **必须** 在
**插件根目录** 中包含一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，
而**无需执行插件代码**。缺失或无效的清单将被视为
插件错误，并阻止配置验证。

查看完整的插件系统指南：[插件](/zh/tools/plugin)。

## 必填字段

```json
{
  "id": "voice-call",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

必填键：

- `id` (string)：规范插件 ID。
- `configSchema` (object)：插件配置的 JSON 架构（内联）。

可选键：

- `kind` (string)：插件种类（例如：`"memory"`、`"context-engine"`）。
- `channels` (array)：由此插件注册的渠道 ID（例如：`["matrix"]`）。
- `providers` (array)：由此插件注册的提供商 ID。
- `providerAuthEnvVars` (object)：按提供商 ID 索引的身份验证环境变量。当 OpenClaw 应在不首先加载插件运行时的情况下从环境解析提供商凭据时，请使用此选项。
- `providerAuthChoices` (数组)：按提供商 + 认证方法键控的廉价新手引导/认证选择元数据。当 OpenClaw 应在认证选择器、首选提供商解析和 CLI 帮助中显示提供商，而无需先加载插件运行时时，请使用此项。
- `skills` (数组)：要加载的技能目录（相对于插件根目录）。
- `name` (字符串)：插件的显示名称。
- `description` (字符串)：插件简短摘要。
- `uiHints` (对象)：用于 UI 渲染的配置字段标签/占位符/敏感标志。
- `version` (字符串)：插件版本（仅供参考）。

### `providerAuthChoices` 结构

每个条目可以声明：

- `provider`：提供商 ID
- `method`：认证方法 ID
- `choiceId`：稳定的新手引导/认证选择 ID
- `choiceLabel` / `choiceHint`：选择器标签 + 简短提示
- `groupId` / `groupLabel` / `groupHint`：分组的新手引导存储桶元数据
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`：用于简单认证流程（如 CLI 密钥）的可选单标志 API 连接

示例：

```json
{
  "providerAuthChoices": [
    {
      "provider": "openrouter",
      "method": "api-key",
      "choiceId": "openrouter-api-key",
      "choiceLabel": "OpenRouter API key",
      "groupId": "openrouter",
      "groupLabel": "OpenRouter",
      "optionKey": "openrouterApiKey",
      "cliFlag": "--openrouter-api-key",
      "cliOption": "--openrouter-api-key <key>",
      "cliDescription": "OpenRouter API key"
    }
  ]
}
```

## JSON Schema 要求

- **每个插件都必须附带一个 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但其清单或 schema 损坏或缺失，验证将失败，并且 Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，则保留该配置，并在 Doctor + 日志中显示**警告**。

## 注意事项

- 该清单对于本地 OpenClaw 插件是**必需的**，包括本地文件系统加载。
- 运行时仍然单独加载插件模块；清单仅用于发现和验证。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记验证以及类似提供商身份验证表面的廉价元数据路径，不应仅为了检查环境名称而启动插件运行时。
- `providerAuthChoices` 是用于身份验证选择器、`--auth-choice` 解析、首选提供商映射以及在提供商运行时加载之前的简单新手引导 CLI 标志注册的廉价元数据路径。
- 独占插件类型通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择（默认：内置 `legacy`）。
- 如果您的插件依赖于本机模块，请记录构建步骤和任何包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

import zh from "/components/footer/zh.mdx";

<zh />
