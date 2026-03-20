---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - 你正在构建一个 OpenClaw 插件
  - 你需要提供插件配置架构或调试插件验证错误
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的包布局，请参阅 [插件包](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 包：`.codex-plugin/plugin.json`
- Claude 包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测那些包布局，但它们不会根据此处描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取包元数据以及声明的技能根目录、Claude 命令根目录、Claude 包 `settings.json` 默认值和支持的钩子包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中提供一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，而**无需执行插件代码**。缺失或无效的清单将被视为插件错误，并阻止配置验证。

查看完整的插件系统指南：[插件](/zh/tools/plugin)。
关于原生功能模型和当前的外部兼容性指导：
[功能模型](/zh/tools/plugin#public-capability-model)。

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

- `id` (字符串)：规范插件 ID。
- `configSchema` (对象)：插件配置的 JSON 架构（内联）。

可选键：

- `kind` (字符串)：插件类型（例如：`"memory"`、`"context-engine"`）。
- `channels` (数组)：由此插件注册的渠道 ID（渠道功能；例如：`["matrix"]`）。
- `providers` (数组)：由此插件注册的提供商 ID（文本推理功能）。
- `providerAuthEnvVars` (object): 按 提供商 id 键入的 auth 环境变量。当 OpenClaw 应在不先加载插件运行时的情况下从环境解析 提供商 凭证时，请使用此项。
- `providerAuthChoices` (array): 按 提供商 + auth method 键入的廉价新手引导/身份验证选择元数据。当 OpenClaw 应在不先加载插件运行时的情况下，在身份验证选择器、首选提供商解析和 CLI 帮助中显示提供商时，请使用此项。
- `skills` (array): 要加载的技能目录（相对于插件根目录）。
- `name` (string): 插件的显示名称。
- `description` (string): 简短的插件摘要。
- `uiHints` (object): 用于 UI 呈现的配置字段标签/占位符/敏感标志。
- `version` (string): 插件版本（信息性）。

### `providerAuthChoices` 形状

每个条目可以声明：

- `provider`: 提供商 id
- `method`: auth method id
- `choiceId`: 稳定的 新手引导/auth-choice id
- `choiceLabel` / `choiceHint`: 选择器标签 + 简短提示
- `groupId` / `groupLabel` / `groupHint`: 分组的 新手引导 bucket 元数据
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`: 用于简单身份验证流程（如 CLI 密钥）的可选单标志 API 连接

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

## JSON 架构要求

- **每个插件都必须附带一个 JSON 架构**，即使它不接受任何配置。
- 空架构是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 架构在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 id 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 id。未知的 id 是**错误**。
- 如果插件已安装但其清单或 schema 损坏或缺失，验证将失败，Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，则保留该配置，并在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` schema，请参阅[配置参考](/zh/configuration)。

## 注意

- 清单对于原生 OpenClaw 插件是**必需的**，包括本地文件系统加载。
- 运行时仍会单独加载插件模块；清单仅用于发现和验证。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记验证以及类似的提供商身份验证表面的低成本元数据路径，这些路径不应仅为了检查环境名称而启动插件运行时。
- `providerAuthChoices` 是用于身份验证选择器、`--auth-choice` 解析、首选提供商映射以及在提供商运行时加载之前进行简单新手引导 CLI 标志注册的低成本元数据路径。对于需要提供商代码的运行时向导元数据，请参阅[提供商运行时钩子](/zh/tools/plugin#provider-runtime-hooks)。
- 互斥插件类型通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择
    （默认：内置 `legacy`）。
- 如果您的插件依赖于原生模块，请记录构建步骤以及任何包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

import en from "/components/footer/en.mdx";

<en />
