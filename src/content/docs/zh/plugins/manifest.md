---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的包布局，请参阅 [插件包](/en/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 包：`.codex-plugin/plugin.json`
- Claude 包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些包布局，但它们不会根据此处描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取包元数据以及声明的技能根目录、Claude 命令根目录、Claude 包 `settings.json` 默认值和受支持的钩子包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中包含一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，而**无需执行插件代码**。缺失或无效的清单将被视为插件错误，并会阻止配置验证。

请参阅完整的插件系统指南：[插件](/en/tools/plugin)。
有关原生能力模型和当前外部兼容性指导：
[能力模型](/en/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载插件代码之前读取的元数据。

将其用于：

- 插件身份
- 配置验证
- 无需启动插件运行时即可用的身份验证和新手引导元数据
- 用于包兼容性连接和合约覆盖的静态能力所有权快照
- 配置 UI 提示

不要将其用于：

- 注册运行时行为
- 声明代码入口点
- npm 安装元数据

这些应属于您的插件代码和 `package.json`。

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
  "cliBackends": ["openrouter-cli"],
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

| 字段                  | 必需 | 类型                             | 含义                                                                                         |
| --------------------- | ---- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`                  | 是   | `string`                         | 规范的插件 ID。这是在 `plugins.entries.<id>` 中使用的 ID。                                   |
| `configSchema`        | 是   | `object`                         | 用于此插件配置的内联 JSON 架构。                                                             |
| `enabledByDefault`    | 否   | `true`                           | 将打包的插件标记为默认启用。省略它，或将其设置为任何非 `true` 值，以使插件默认处于禁用状态。 |
| `kind`                | 否   | `"memory"` \| `"context-engine"` | 声明 `plugins.slots.*` 使用的独占插件类型。                                                  |
| `channels`            | 否   | `string[]`                       | 此插件拥有的频道 ID。用于发现和配置验证。                                                    |
| `providers`           | 否   | `string[]`                       | 此插件拥有的提供商 ID。                                                                      |
| `cliBackends`         | 否   | `string[]`                       | 此插件拥有的 CLI 推理后端 ID。用于通过显式配置引用在启动时自动激活。                         |
| `providerAuthEnvVars` | 否   | `Record<string, string[]>`       | 廉价的提供商认证环境元数据，OpenClaw 可以在不加载插件代码的情况下进行检查。                  |
| `providerAuthChoices` | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连线的廉价认证选择元数据。                  |
| `contracts`           | 否   | `object`                         | 针对语音、媒体理解、图像生成、网络搜索和工具所有权的静态打包功能快照。                       |
| `skills`              | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                         |
| `name`                | 否   | `string`                         | 人类可读的插件名称。                                                                         |
| `description`         | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                 |
| `version`             | 否   | `string`                         | 信息性插件版本。                                                                             |
| `uiHints`             | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                     |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个新手引导或认证选择。OpenClaw 在提供商运行时加载之前读取此内容。

| 字段               | 必填 | 类型                                            | 含义                                                                      |
| ------------------ | ---- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `provider`         | 是   | `string`                                        | 此选择所属的提供商 ID。                                                   |
| `method`           | 是   | `string`                                        | 要分派到的认证方法 ID。                                                   |
| `choiceId`         | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定认证选项 ID。                              |
| `choiceLabel`      | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                  |
| `choiceHint`       | 否   | `string`                                        | 针对选择器的简短帮助文本。                                                |
| `groupId`          | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                       |
| `groupLabel`       | 否   | `string`                                        | 面向用户的组标签。                                                        |
| `groupHint`        | 否   | `string`                                        | 针对该组的简短帮助文本。                                                  |
| `optionKey`        | 否   | `string`                                        | 用于简单的单标志认证流程的内部选项键。                                    |
| `cliFlag`          | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                               |
| `cliOption`        | 否   | `string`                                        | 完整的 CLI 选项形状，例如 `--openrouter-api-key <key>`。                  |
| `cliDescription`   | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                     |
| `onboardingScopes` | 否   | `Array<"text-inference" \| "image-generation">` | 此选项应出现在哪些新手引导界面中。如果省略，默认为 `["text-inference"]`。 |

## uiHints 参考

`uiHints` 是从配置字段名称到小型渲染提示的映射。

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

每个字段提示可以包括：

| 字段          | 类型       | 含义                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向用户的字段标签。     |
| `help`        | `string`   | 简短的帮助文本。         |
| `tags`        | `string[]` | 可选的 UI 标签。         |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## contracts 参考

请仅将 `contracts` 用于 OpenClaw 可以在不导入插件运行时的情况下读取的静态能力所有权元数据。

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                          | 类型       | 含义                                            |
| ----------------------------- | ---------- | ----------------------------------------------- |
| `speechProviders`             | `string[]` | 此插件拥有的语音提供商 ID。                     |
| `mediaUnderstandingProviders` | `string[]` | 此插件拥有的媒体理解提供商 ID。                 |
| `imageGenerationProviders`    | `string[]` | 此插件拥有的图像生成提供商 ID。                 |
| `webSearchProviders`          | `string[]` | 此插件拥有的网络搜索提供商 ID。                 |
| `tools`                       | `string[]` | 此插件拥有的用于捆绑合约检查的 Agent 工具名称。 |

传统的顶级 `speechProviders`、`mediaUnderstandingProviders` 和
`imageGenerationProviders` 已弃用。请使用 `openclaw doctor --fix` 将
它们移动到 `contracts` 下；正常的清单加载不再将其视为
能力所有权。

## Manifest 与 package.

这两个文件用于不同的用途：

| 文件                   | 用于                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及必须在插件代码运行之前存在的 UI 提示 |
| `package.json`         | npm 元数据、依赖项安装以及用于入口点和设置或目录元数据的 `openclaw` 块         |

如果您不确定某段元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它与打包、入口文件或 npm 安装行为有关，请将其放在 `package.json` 中

## JSON Schema 要求

- **每个插件都必须提供 JSON Schema**，即使它不接受任何配置。
- 空架构是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但其清单或 schema 损坏或缺失，
  验证将失败，Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，配置将被保留，
  并且 Doctor + 日志中会显示**警告**。

有关完整的 `plugins.*` schema，请参阅 [Configuration reference](/en/gateway/configuration)。

## 注意事项

- 清单对于原生 OpenClaw 插件是**必需的**，包括本地文件系统加载。
- 运行时仍然会单独加载插件模块；清单仅用于
  发现和验证。
- 清单加载器仅读取已记录的清单字段。请避免在此
  添加自定义的顶级键。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记
  验证以及类似提供商身份验证界面的廉价元数据路径，这些操作不应仅为了检查环境名称而启动插件
  运行时。
- `providerAuthChoices` 是用于身份验证选择器、
  `--auth-choice` 解析、首选提供商映射以及简单的新手引导
  CLI 标志注册的廉价元数据路径，这些操作在提供商运行时加载之前进行。对于需要提供商代码的运行时向导
  元数据，请参阅
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件种类通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine`
    选择（默认：内置 `legacy`）。
- 当插件不需要 `channels`、`providers`、`cliBackends` 和 `skills` 时，可以将其省略。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何
  包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。
