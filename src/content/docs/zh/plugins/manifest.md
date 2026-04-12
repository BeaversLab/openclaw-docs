---
summary: "插件清单 + JSON 模式要求（严格配置验证）"
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

OpenClaw 也会自动检测这些捆绑包布局，但它们不会根据此处描述的 `openclaw.plugin.json` 模式进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取捆绑包元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑包 `settings.json` 默认值、Claude 捆绑包 LSP 默认值和支持的挂钩包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中附带一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，而 **无需执行插件代码**。缺失或无效的清单将被视为插件错误，并阻止配置验证。

查看完整的插件系统指南：[插件](/en/tools/plugin)。
有关原生功能模型和当前外部兼容性指导：
[功能模型](/en/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载插件代码之前读取的元数据。

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

这些内容属于您的插件代码和 `package.json`。

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
  "cliBackends": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
  },
  "providerAuthAliases": {
    "openrouter-coding": "openrouter"
  },
  "channelEnvVars": {
    "openrouter-chatops": ["OPENROUTER_CHATOPS_TOKEN"]
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

| 字段                                | 必需 | 类型                             | 含义                                                                                                                                   |
| ----------------------------------- | ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | 是   | `string`                         | 规范的插件 ID。这是 `plugins.entries.<id>` 中使用的 ID。                                                                               |
| `configSchema`                      | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                         |
| `enabledByDefault`                  | 否   | `true`                           | 将捆绑的插件标记为默认启用。省略它，或设置任何非 `true` 的值，以使插件默认处于禁用状态。                                               |
| `legacyPluginIds`                   | 否   | `string[]`                       | 可规范化为此规范插件 ID 的旧版 ID。                                                                                                    |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 当身份验证、配置或模型引用提及这些提供商 ID 时，应自动启用此插件。                                                                     |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件种类。                                                                                          |
| `channels`                          | 否   | `string[]`                       | 归此插件所有的渠道 ID。用于发现和配置验证。                                                                                            |
| `providers`                         | 否   | `string[]`                       | 归此插件所有的提供商 ID。                                                                                                              |
| `modelSupport`                      | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                                           |
| `cliBackends`                       | 否   | `string[]`                       | 此插件拥有的 CLI 推理后端 ID。用于通过显式配置引用进行启动时自动激活。                                                                 |
| `commandAliases`                    | 否   | `object[]`                       | 由此插件拥有的命令名称，这些名称应在运行时加载之前生成感知插件的配置和 CLI 诊断信息。                                                  |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价 提供商-auth 环境元数据。                                                               |
| `providerAuthAliases`               | 否   | `Record<string, string>`         | 应该复用另一个 提供商 id 进行身份验证查找的 提供商 id，例如共享基础 提供商 API 密钥和身份验证配置文件的编码 提供商。                   |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价渠道环境元数据。将其用于环境驱动的渠道设置或通用启动/配置辅助程序应看到的身份验证界面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连线的廉价身份验证选择元数据。                                                        |
| `contracts`                         | 否   | `object`                         | 用于语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、Web 获取、Web 搜索和工具所有权的静态捆绑功能快照。               |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 在运行时加载之前合并到发现和验证界面中的清单拥有的渠道配置元数据。                                                                     |
| `skills`                            | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                   |
| `name`                              | 否   | `string`                         | 人类可读的插件名称。                                                                                                                   |
| `description`                       | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                                                           |
| `version`                           | 否   | `string`                         | 信息性插件版本。                                                                                                                       |
| `uiHints`                           | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                               |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一种新手引导或身份验证选项。
OpenClaw 会在提供商运行时加载之前读取此内容。

| 字段                  | 必需 | 类型                                            | 含义                                                                      |
| --------------------- | ---- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选项所属的提供商 ID。                                                   |
| `method`              | 是   | `string`                                        | 要分发到的身份验证方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 用于新手引导和 CLI 流程的稳定身份验证选项 ID。                            |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                  |
| `choiceHint`          | 否   | `string`                                        | 选择器的简短辅助文本。                                                    |
| `assistantPriority`   | 否   | `number`                                        | 值越小，在助手驱动的交互式选择器中排序越靠前。                            |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助手选择器中隐藏该选项，同时仍允许手动 CLI 选择。                       |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧版选项 ID。                                 |
| `groupId`             | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                       |
| `groupLabel`          | 否   | `string`                                        | 该组的面向用户标签。                                                      |
| `groupHint`           | 否   | `string`                                        | 该组的简短辅助文本。                                                      |
| `optionKey`           | 否   | `string`                                        | 用于简单的单标志身份验证流程的内部选项键。                                |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                               |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 选项形状，例如 `--openrouter-api-key <key>`。                  |
| `cliDescription`      | 否   | `string`                                        | 在 CLI 帮助中使用的描述。                                                 |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此选择应出现在哪个新手引导界面中。如果省略，默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有一个用户可能会错误地放入 `plugins.allow` 或尝试作为根 CLI 命令运行的运行时命令名称时，请使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

```json
{
  "commandAliases": [
    {
      "name": "dreaming",
      "kind": "runtime-slash",
      "cliCommand": "memory"
    }
  ]
}
```

| 字段         | 必需 | 类型              | 含义                                               |
| ------------ | ---- | ----------------- | -------------------------------------------------- |
| `name`       | 是   | `string`          | 属于此插件的命令名称。                             |
| `kind`       | 否   | `"runtime-slash"` | 将别名标记为聊天斜杠命令，而不是根 CLI 命令。      |
| `cliCommand` | 否   | `string`          | 相关的根 CLI 命令，用于建议 CLI 操作（如果存在）。 |

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
| `help`        | `string`   | 简短的辅助文本。         |
| `tags`        | `string[]` | 可选的 UI 标签。         |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## contracts 参考

仅将 `contracts` 用于 OpenClaw 可以在无需导入插件运行时的情况下读取的静态功能所有权元数据。

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
| `webFetchProviders`              | `string[]` | 此插件拥有的网页获取提供商 ID。                 |
| `webSearchProviders`             | `string[]` | 此插件拥有的网页搜索提供商 ID。                 |
| `tools`                          | `string[]` | 此插件拥有的用于打包合约检查的 Agent 工具名称。 |

## channelConfigs 参考

当渠道插件需要在运行时加载之前获取低成本配置元数据时，请使用 `channelConfigs`。

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

每个渠道条目可以包括：

| 字段          | 类型                     | 含义                                                                   |
| ------------- | ------------------------ | ---------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。对于每个声明的渠道配置条目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。                         |
| `label`       | `string`                 | 当运行时元数据未就绪时，合并到选择器和检查界面中的渠道标签。           |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                                     |
| `preferOver`  | `string[]`               | 此渠道在选择界面中应超越的旧版或较低优先级的插件 ID。                  |

## modelSupport 参考

当 OpenClaw 应在插件运行时加载之前，从 `gpt-5.4` 或 `claude-sonnet-4.6` 等简写模型 ID 推断您的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用此优先级：

- 显式 `provider/model` 引用使用所属 `providers` 清单元数据
- `modelPatterns` 胜过 `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包插件获胜
- 剩余的歧义将被忽略，直到用户或配置指定提供商

字段：

| 字段            | 类型       | 含义                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 与简写模型 ID 使用 `startsWith` 匹配的前缀。          |
| `modelPatterns` | `string[]` | 在移除配置文件后缀后，与简写模型 ID 匹配的 Regex 源。 |

旧的顶层功能键已弃用。请使用 `openclaw doctor --fix` 将
`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、
`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的
清单加载不再将这些顶层字段视为功能
所有权。

## 清单与 package. 对比

这两个文件用于不同的工作：

| 文件                   | 用于                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及必须在插件代码运行之前存在的 UI 提示   |
| `package.json`         | npm 元数据、依赖项安装以及用于入口点、安装准入、设置或目录元数据的 `openclaw` 块 |

如果您不确定某条元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它关于打包、入口文件或 npm 安装行为，请将其放在 `package.json` 中

### 影响设备发现的 package. 字段

一些运行前的插件元数据故意位于 `package.json` 中的
`openclaw` 块下，而不是 `openclaw.plugin.json` 中。

重要示例：

| 字段                                                              | 含义                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                             | 声明原生插件入口点。                                                                             |
| `openclaw.setupEntry`                                             | 在新手引导和延迟渠道启动期间使用的轻量级仅设置入口点。                                           |
| `openclaw.channel`                                                | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                         |
| `openclaw.channel.configuredState`                                | 轻量级配置状态检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已存在仅环境的设置？”。   |
| `openclaw.channel.persistedAuthState`                             | 轻量级持久化身份验证检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已登录任何内容？”。 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 针对捆绑和外部发布插件的安装/更新提示。                                                          |
| `openclaw.install.defaultChoice`                                  | 当有多个安装源可用时的首选安装路径。                                                             |
| `openclaw.install.minHostVersion`                                 | 支持的最低 OpenClaw 主机版本，使用像 `>=2026.3.22` 这样的语义化版本下限。                        |
| `openclaw.install.allowInvalidConfigRecovery`                     | 当配置无效时，允许通过狭窄的捆绑插件重新安装恢复路径。                                           |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 允许仅设置渠道界面在启动期间于完整渠道插件之前加载。                                             |

`openclaw.install.minHostVersion` 在安装和清单注册表加载期间被强制执行。无效值将被拒绝；在较旧的主机上，较新但有效的值将跳过该插件。

`openclaw.install.allowInvalidConfigRecovery` 刻意限制得很窄。它不会使任意损坏的配置变为可安装。目前，它仅允许安装流程从特定的过时捆绑插件升级失败中恢复，例如缺少捆绑插件路径或该同一捆绑插件的过时 `channels.<id>` 条目。不相关的配置错误仍会阻止安装，并将操作员引导至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一个小型检查器模块的包元数据：

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

当设置、诊断或配置状态流程需要在完整渠道插件加载之前进行廉价的是/否身份验证探测时使用它。目标导出应该是一个仅读取持久化状态的小函数；不要将其路由通过完整的渠道运行时封装器。

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

当渠道可以从环境或其他微小的非运行时输入回答配置状态时使用它。如果检查需要完整的配置解析或真实的渠道运行时，请将该逻辑保留在插件 `config.hasConfiguredState` 挂钩中。

## JSON Schema 要求

- **每个插件都必须附带一个 JSON Schema**，即使它不接受任何配置。
- 空架构是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 架构在配置读取/写入时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 id 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必须引用**可发现**的插件 id。未知的 id 是**错误**。
- 如果插件已安装但其清单或架构损坏或缺失，验证将失败，Doctor 会报告插件错误。
- 如果插件配置存在但插件已**禁用**，则保留该配置，并在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` 架构，请参阅 [Configuration reference](/en/gateway/configuration)。

## 注意事项

- 对于原生 OpenClaw 插件（包括本地文件系统加载），该清单是**必需的**。
- 运行时仍会单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍然是对象，就允许注释、尾随逗号和不带引号的键。
- 清单加载器仅读取已记录的清单字段。避免在此处添加自定义顶级键。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记验证和类似提供商身份验证界面的低成本元数据路径，这些界面不应仅为了检查环境名称而启动插件运行时。
- `providerAuthAliases` 允许提供商变体重用另一个提供商的身份验证环境变量、身份验证配置文件、配置支持的身份验证和 API 密钥新手引导选项，而无需在核心代码中硬编码这种关系。
- `channelEnvVars` 是用于 shell 环境后备、设置提示和类似渠道界面的低成本元数据路径，这些界面不应仅为了检查环境名称而启动插件运行时。
- `providerAuthChoices` 是用于身份验证选择器、`--auth-choice` 解析、首选提供商映射以及简单的新手引导 CLI 标志注册的廉价元数据路径，这一切都在提供商运行时加载之前完成。对于需要提供商代码的运行时向导元数据，请参阅 [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件种类是通过 `plugins.slots.*` 选择的。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择（默认：内置 `legacy`）。
- 当插件不需要 `channels`、`providers`、`cliBackends` 和 `skills` 时，可以省略它们。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何包管理器允许列表要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相关

- [构建插件](/en/plugins/building-plugins) — 插件入门指南
- [插件架构](/en/plugins/architecture) — 内部架构
- [SDK 概览](/en/plugins/sdk-overview) — 插件 SDK 参考
