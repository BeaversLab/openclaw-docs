---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的捆绑包布局，请参阅 [插件捆绑包](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude 捆绑包：`.claude-plugin/plugin.json` 或没有清单的默认 Claude 组件
  布局
- Cursor 捆绑包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些捆绑包布局，但不会根据此处
描述的 `openclaw.plugin.json` 架构对它们进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，
OpenClaw 目前会读取捆绑包元数据以及声明的技能根目录、
Claude 命令根目录、Claude 捆绑包 `settings.json` 默认值和支持的钩子包。

每个原生 OpenClaw 插件 **必须** 在**插件根目录**中
附带一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，
**而无需执行插件代码**。缺失或无效的清单将被视为插件错误，
并阻止配置验证。

请参阅完整的插件系统指南：[插件](/zh/tools/plugin)。
有关原生能力模型和当前的外部兼容性指导：
[能力模型](/zh/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载插件代码
之前读取的元数据。

将其用于：

- 插件身份
- 配置验证
- 无需启动插件运行时即可用的身份验证和新手引导元数据
- 配置 UI 提示

不要将其用于：

- 注册运行时行为
- 声明代码入口点
- npm 安装元数据

这些内容应位于插件代码和 `package.json` 中。

## 最小示例

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

## 完整示例

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "description": "OpenRouter provider plugin",
  "version": "1.0.0",
  "providers": ["openrouter"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
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
      "cliDescription": "OpenRouter API key",
      "onboardingScopes": ["text-inference"]
    }
  ],
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string"
      }
    }
  }
}
```

## 顶级字段参考

| 字段                  | 必需 | 类型                             | 含义                                                                                       |
| --------------------- | ---- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`                  | 是   | `string`                         | 规范插件 ID。这是在 `plugins.entries.<id>` 中使用的 ID。                                   |
| `configSchema`        | 是   | `object`                         | 用于此插件配置的内联 JSON Schema。                                                         |
| `enabledByDefault`    | 否   | `true`                           | 将打包的插件标记为默认启用。如果省略此项或设置为任何非 `true` 值，则该插件默认为禁用状态。 |
| `kind`                | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件类型。                                              |
| `channels`            | 否   | `string[]`                       | 此插件拥有的频道 ID。用于发现和配置验证。                                                  |
| `providers`           | 否   | `string[]`                       | 此插件拥有的提供商 ID。                                                                    |
| `providerAuthEnvVars` | 否   | `Record<string, string[]>`       | 轻量级的提供商身份验证环境元数据，OpenClaw 无需加载插件代码即可检查这些数据。              |
| `providerAuthChoices` | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析以及简单 CLI 标志连线的轻量级身份验证选择元数据。        |
| `skills`              | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                       |
| `name`                | 否   | `string`                         | 人类可读的插件名称。                                                                       |
| `description`         | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                               |
| `version`             | 否   | `string`                         | 信息性插件版本。                                                                           |
| `uiHints`             | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                   |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个新手引导或身份验证选项。OpenClaw 会在提供商运行时加载之前读取此内容。

| 字段               | 必填 | 类型                                            | 含义                                                                        |
| ------------------ | ---- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `provider`         | 是   | `string`                                        | 此选项所属的提供商 ID。                                                     |
| `method`           | 是   | `string`                                        | 要分派到的身份验证方法 ID。                                                 |
| `choiceId`         | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定身份验证选择 ID。                            |
| `choiceLabel`      | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                    |
| `choiceHint`       | 否   | `string`                                        | 用于选择器的简短辅助文本。                                                  |
| `groupId`          | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                         |
| `groupLabel`       | 否   | `string`                                        | 该组的面向用户标签。                                                        |
| `groupHint`        | 否   | `string`                                        | 用于该组的简短辅助文本。                                                    |
| `optionKey`        | 否   | `string`                                        | 用于简单的单标志身份验证流程的内部选项键。                                  |
| `cliFlag`          | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                                 |
| `cliOption`        | 否   | `string`                                        | 完整的 CLI 选项形状，例如 `--openrouter-api-key <key>`。                    |
| `cliDescription`   | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                       |
| `onboardingScopes` | 否   | `Array<"text-inference" \| "image-generation">` | 该选项应出现在哪些新手引导界面中。如果省略，则默认为 `["text-inference"]`。 |

## uiHints 参考

`uiHints` 是一个从配置字段名称到小型渲染提示的映射。

```json
{
  "uiHints": {
    "apiKey": {
      "label": "API key",
      "help": "Used for OpenRouter requests",
      "placeholder": "sk-or-v1-...",
      "sensitive": true
    }
  }
}
```

每个字段提示可以包含：

| 字段          | 类型       | 含义                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向用户的字段标签。     |
| `help`        | `string`   | 简短的辅助文本。         |
| `tags`        | `string[]` | 可选的 UI 标签。         |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## Manifest 与 package. 的对比

这两个文件用于不同的目的：

| 文件                   | 用于                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据，以及必须在插件代码运行之前存在的 UI 提示 |
| `package.json`         | npm 元数据、依赖安装以及用于入口点和设置或目录元数据的 `openclaw` 代码块         |

如果您不确定某条元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它与打包、入口文件或 npm 安装行为有关，请将其放在 `package.json` 中

## JSON Schema 要求

- **每个插件都必须附带 JSON Schema**，即使它不接受任何配置。
- 允许使用空 Schema（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但清单或 Schema 损坏或缺失，
  验证将失败，并且 Doctor 会报告插件错误。
- 如果插件配置存在但插件已**禁用**，配置将被保留，
  并且会在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` schema，请参阅 [Configuration reference](/zh/gateway/configuration)。

## 备注

- 清单对于原生 OpenClaw 插件是**必需的**，包括本地文件系统加载。
- 运行时仍然会单独加载插件模块；清单仅用于
  发现 + 验证。
- 清单加载程序仅读取已记录的清单字段。请避免在此处添加
  自定义顶级键。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记
  验证以及类似的提供商身份验证界面的低成本元数据路径，这些界面不应仅为了检查环境名称而启动插件
  运行时。
- `providerAuthChoices` 是用于身份验证选择器、
  `--auth-choice` 解析、首选提供商映射以及在提供商运行时加载之前的简单新手引导
  CLI 标志注册的低成本元数据路径。对于需要提供商代码的运行时向导
  元数据，请参阅
  [Provider runtime hooks](/zh/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件种类通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine`
    （默认：内置 `legacy`）选择。
- 当插件不需要 `channels`、`providers` 和 `skills` 时，可以将其省略。
- 如果您的插件依赖于原生模块，请记录构建步骤以及任何
  包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

import zh from "/components/footer/zh.mdx";

<zh />
