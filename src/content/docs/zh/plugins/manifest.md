---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的捆绑包布局，请参阅 [插件捆绑包](/en/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude 捆绑包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 捆绑包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些捆绑包布局，但它们不会根据此处
描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时期望时，OpenClaw 目前会读取捆绑包元数据以及声明的
技能根目录、Claude 命令根目录、Claude 捆绑包 `settings.json` 默认值、
Claude 捆绑包 LSP 默认值和支持的挂钩包。

每个原生 OpenClaw 插件**必须**在其
**插件根目录**中附带一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，
而**无需执行插件代码**。缺失或无效的清单将被视为
插件错误，并会阻止配置验证。

请参阅完整的插件系统指南：[插件](/en/tools/plugin)。
有关原生功能模型和当前外部兼容性指导：
[功能模型](/en/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载
插件代码之前读取的元数据。

将其用于：

- 插件身份
- 配置验证
- 无需启动插件运行时即可用的身份验证和新手引导元数据
- 别名和自动启用元数据，应在插件运行时加载之前解析
- 简写模型族所有权元数据，应在运行时加载之前
  自动激活插件
- 用于捆绑兼容性连接和
  契约覆盖的静态功能所有权快照
- 特定于渠道的配置元数据，应在不加载运行时的情况下
  合并到目录和验证表面
- 配置 UI 提示

不要将其用于：

- 注册运行时行为
- 声明代码入口点
- npm 安装元数据

这些属于您的插件代码和 `package.json`。

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
  "modelSupport": {
    "modelPrefixes": ["router-"]
  },
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

| 字段                                | 必需 | 类型                             | 含义                                                                                                                     |
| ----------------------------------- | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                                | 是   | `string`                         | 规范的插件 ID。这是在 `plugins.entries.<id>` 中使用的 ID。                                                               |
| `configSchema`                      | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                           |
| `enabledByDefault`                  | 否   | `true`                           | 将打包插件标记为默认启用。省略此字段，或将其设置为任何非 `true` 的值，以使插件默认保持禁用状态。                         |
| `legacyPluginIds`                   | 否   | `string[]`                       | 可规范化为此规范插件 ID 的旧版 ID。                                                                                      |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 当身份验证、配置或模型引用提及这些提供商 ID 时，应自动启用此插件。                                                       |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件类型。                                                                            |
| `channels`                          | 否   | `string[]`                       | 归此插件所有的渠道 ID。用于发现和配置验证。                                                                              |
| `providers`                         | 否   | `string[]`                       | 归此插件所有的提供商 ID。                                                                                                |
| `modelSupport`                      | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                             |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | 廉价的提供商身份验证环境元数据，OpenClaw 可以在不加载插件代码的情况下检查它们。                                          |
| `providerAuthChoices`               | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连接的廉价身份验证选择元数据。                                          |
| `contracts`                         | 否   | `object`                         | 用于语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、网页获取、网页搜索和工具所有权的静态打包功能快照。 |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 清单拥有的渠道配置元数据，在运行时加载之前合并到发现和验证界面中。                                                       |
| `skills`                            | 否   | `string[]`                       | 相对于插件根目录的要加载的技能目录。                                                                                     |
| `name`                              | 否   | `string`                         | 人类可读的插件名称。                                                                                                     |
| `description`                       | 否   | `string`                         | 在插件界面显示的简短摘要。                                                                                               |
| `version`                           | 否   | `string`                         | 信息性插件版本。                                                                                                         |
| `uiHints`                           | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                 |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个新手引导或身份验证选项。OpenClaw 会在提供商运行时加载之前读取此内容。

| 字段                  | 必需 | 类型                                            | 含义                                                                  |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选项所属的提供商 ID。                                               |
| `method`              | 是   | `string`                                        | 要分发到的身份验证方法 ID。                                           |
| `choiceId`            | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定身份验证选项 ID。                      |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。              |
| `choiceHint`          | 否   | `string`                                        | 选择器的简短辅助文本。                                                |
| `assistantPriority`   | 否   | `number`                                        | 在助手驱动的交互式选择器中，较小的值排序更靠前。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助手选择器中隐藏该选项，同时仍允许手动 CLI 选择。                   |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧选项 ID。                               |
| `groupId`             | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                   |
| `groupLabel`          | 否   | `string`                                        | 该组的面向用户的标签。                                                |
| `groupHint`           | 否   | `string`                                        | 该组的简短辅助文本。                                                  |
| `optionKey`           | 否   | `string`                                        | 用于简单单标志身份验证流程的内部选项键。                              |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 选项形状，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                 |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此选项应出现的 新手引导 表面。如果省略，默认为 `["text-inference"]`。 |

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

每个字段提示可以包含：

| 字段          | 类型       | 含义                         |
| ------------- | ---------- | ---------------------------- |
| `label`       | `string`   | 面向用户的字段标签。         |
| `help`        | `string`   | 简短的辅助文本。             |
| `tags`        | `string[]` | 可选的 UI 标签。             |
| `advanced`    | `boolean`  | 将字段标记为高级。           |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感信息。 |
| `placeholder` | `string`   | 表单输入的占位符文本。       |

## contracts 参考

仅将 `contracts` 用于 OpenClaw 可以在不导入插件运行时的情况下读取的静态能力所有权元数据。

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                             | 类型       | 含义                                            |
| -------------------------------- | ---------- | ----------------------------------------------- |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 ID。                     |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转录提供商 ID。                 |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 ID。                 |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 ID。                 |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 ID。                 |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 ID。                 |
| `webFetchProviders`              | `string[]` | 此插件拥有的网页抓取提供商 ID。                 |
| `webSearchProviders`             | `string[]` | 此插件拥有的网页搜索提供商 ID。                 |
| `tools`                          | `string[]` | 此插件拥有的用于打包合约检查的 Agent 工具名称。 |

## channelConfigs 参考

当渠道插件需要在运行时加载之前获取廉价配置元数据时，请使用 `channelConfigs`。

```json
{
  "channelConfigs": {
    "matrix": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "homeserverUrl": { "type": "string" }
        }
      },
      "uiHints": {
        "homeserverUrl": {
          "label": "Homeserver URL",
          "placeholder": "https://matrix.example.com"
        }
      },
      "label": "Matrix",
      "description": "Matrix homeserver connection",
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个渠道条目可以包含：

| 字段          | 类型                     | 含义                                                         |
| ------------- | ------------------------ | ------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每个声明的渠道配置条目必填。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。               |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，合并到选择器和检查界面的渠道标签。 |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                           |
| `preferOver`  | `string[]`               | 此渠道在选择界面中应优于的旧版或较低优先级插件 ID。          |

## modelSupport 参考

当 OpenClaw 应在插件运行时加载之前从简写模型 ID（如 `gpt-5.4` 或 `claude-sonnet-4.6`）推断您的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用以下优先级：

- 显式 `provider/model` 引用使用拥有者的 `providers` 清单元数据
- `modelPatterns` 优于 `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包插件获胜
- 剩余的歧义将被忽略，直到用户或配置指定提供商

字段：

| 字段            | 类型       | 含义                                                |
| --------------- | ---------- | --------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与 `startsWith` 匹配的简写模型 ID 前缀。            |
| `modelPatterns` | `string[]` | 移除配置文件后缀后，与简写模型 ID 匹配的 Regex 源。 |

旧版顶级能力键已弃用。使用 `openclaw doctor --fix` 将
`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、
`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的
清单加载不再将这些顶级字段视为能力所有权。

## 清单与 package. 的对比

这两个文件服务于不同的用途：

| 文件                   | 用于                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及插件代码运行前必须存在的 UI 提示         |
| `package.json`         | npm 元数据、依赖项安装，以及用于入口点、安装拦截、设置或目录元数据的 `openclaw` 块 |

如果您不确定某条元数据应放在何处，请使用以下规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放入 `openclaw.plugin.json`
- 如果它与打包、入口文件或 npm 安装行为有关，请将其放入 `package.json`

### 影响设备发现的 package. 字段

一些运行前的插件元数据有意存放在 `package.json` 的
`openclaw` 块下，而不是 `openclaw.plugin.json` 中。

重要示例：

| 字段                                                              | 含义                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 声明原生插件入口点。                                                                               |
| `openclaw.setupEntry`                                             | 在新手引导和延迟渠道启动期间使用的轻量级仅设置入口点。                                             |
| `openclaw.channel`                                                | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                           |
| `openclaw.channel.configuredState`                                | 轻量级配置状态检查器元数据，可在不加载完整渠道运行时的情况下回答“是否仅环境设置已存在？”           |
| `openclaw.channel.persistedAuthState`                             | 轻量级持久化身份验证检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已经登录任何内容？”。 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 用于捆绑和外部发布插件的安装/更新提示。                                                            |
| `openclaw.install.defaultChoice`                                  | 当有多个安装源可用时的首选安装路径。                                                               |
| `openclaw.install.minHostVersion`                                 | 支持的最低 OpenClaw 主机版本，使用像 `>=2026.3.22` 这样的 semver 下限。                            |
| `openclaw.install.allowInvalidConfigRecovery`                     | 允许在配置无效时采用狭义的捆绑插件重新安装恢复路径。                                               |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 允许仅设置渠道表面在启动期间于完整渠道插件之前加载。                                               |

`openclaw.install.minHostVersion` 在安装和清单注册表加载期间强制执行。无效值将被拒绝；在较旧的主机上，较新但有效的值将跳过该插件。

`openclaw.install.allowInvalidConfigRecovery` 是有意的狭义限制。它不会使任意损坏的配置可安装。目前，它仅允许安装流程从特定的陈旧捆绑插件升级失败中恢复，例如缺少捆绑插件路径或针对同一捆绑插件的陈旧 `channels.<id>` 条目。不相关的配置错误仍然会阻止安装并将操作员引导至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个微型检查器模块的包元数据：

```json
{
  "openclaw": {
    "channel": {
      "id": "whatsapp",
      "persistedAuthState": {
        "specifier": "./auth-presence",
        "exportName": "hasAnyWhatsAppAuth"
      }
    }
  }
}
```

当设置、诊断或配置状态流程需要在完整渠道插件加载之前进行廉价的“是/否”身份验证探测时，请使用它。目标导出应该是一个仅读取持久化状态的小函数；请勿将其通过完整的渠道运行时桶进行路由。

`openclaw.channel.configuredState` 遵循相同的形状，用于廉价的仅环境配置检查：

```json
{
  "openclaw": {
    "channel": {
      "id": "telegram",
      "configuredState": {
        "specifier": "./configured-state",
        "exportName": "hasTelegramConfiguredState"
      }
    }
  }
}
```

当渠道可以从环境或其他微小的非运行时输入回答配置状态时，请使用它。如果检查需要完整的配置解析或真实的渠道运行时，请将该逻辑保留在插件 `config.hasConfiguredState` 挂钩中。

## JSON Schema 要求

- **每个插件都必须附带一个 JSON Schema**，即使它不接受任何配置。
- 空模式是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 id 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 id。未知的 id 是**错误**。
- 如果插件已安装但其清单或架构损坏或缺失，
  验证将失败，并且 Doctor 会报告插件错误。
- 如果插件配置存在但插件已**禁用**，配置将被保留，
  并且会在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` 架构，请参阅 [Configuration reference](/en/gateway/configuration)。

## 说明

- 对于原生 OpenClaw 插件，**清单是必需的**，包括本地文件系统加载。
- 运行时仍然会单独加载插件模块；清单仅用于
  发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍然是对象，
  就可以接受注释、尾随逗号和未加引号的键。
- 清单加载器仅读取文档化的清单字段。避免在此处添加
  自定义顶层键。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记
  验证和类似提供商身份验证界面的廉价元数据路径，这些界面不应仅为了检查环境名称而启动插件
  运行时。
- `providerAuthChoices` 是用于身份验证选择器、
  `--auth-choice` 解析、首选提供商映射和简单新手引导
  CLI 标志注册的廉价元数据路径，这些操作在提供商运行时加载之前执行。对于需要
  提供商代码的运行时向导元数据，请参阅
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥插件种类通过 `plugins.slots.*` 选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择
    （默认：内置 `legacy`）。
- 当插件不需要 `channels`、`providers` 和 `skills` 时，可以省略它们。
- 如果您的插件依赖于原生模块，请记录构建步骤以及任何包管理器 allowlist 要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相关内容

- [构建插件](/en/plugins/building-plugins) — 插件入门指南
- [插件架构](/en/plugins/architecture) — 内部架构
- [SDK 概览](/en/plugins/sdk-overview) — 插件 SDK 参考
