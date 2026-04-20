---
summary: "插件清单 + JSON 架构要求（严格配置验证）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "插件清单"
---

# 插件清单 (openclaw.plugin.)

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的包布局，请参阅 [插件包](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude 捆绑包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 捆绑包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些捆绑包布局，但它们不会对照此处描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取捆绑包元数据以及声明的技能根、Claude 命令根、Claude 捆绑包 `settings.json` 默认值、Claude 捆绑包 LSP 默认值和支持的挂钩包。

每个原生 OpenClaw 插件**必须**在**插件根**目录中附带一个 `openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，而**无需执行插件代码**。缺失或无效的清单将被视为插件错误，并会阻止配置验证。

请参阅完整的插件系统指南：[插件](/zh/tools/plugin)。
有关原生功能模型和当前外部兼容性指南：
[功能模型](/zh/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载插件代码之前读取的元数据。

将其用于：

- 插件身份
- 配置验证
- 无需启动插件运行时即可用的身份验证和新手引导元数据
- 廉价激活提示，控制平面可以在运行时加载之前检查它们
- 廉价设置描述符，设置/新手引导界面可以在运行时加载之前检查它们
- 应在插件运行时加载之前解析的别名和自动启用元数据
- 简写模型家族所有权元数据，应在运行时加载之前自动激活插件
- 静态能力所有权快照，用于捆绑兼容性接线和合同覆盖
- 廉价的 QA 运行器元数据，共享 `openclaw qa` 主机可以在插件运行时加载之前检查它们
- 渠道特定的配置元数据，应在不加载运行时的情况下合并到目录和验证界面中
- 配置 UI 提示

不要将其用于：

- 注册运行时行为
- 声明代码入口点
- npm 安装元数据

这些属于你的插件代码和 `package.json`。

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
  "providerEndpoints": [
    {
      "endpointClass": "xai-native",
      "hosts": ["api.x.ai"]
    }
  ],
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
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

| 字段                                | 必需 | 类型                             | 含义                                                                                                                                         |
| ----------------------------------- | ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | 是   | `string`                         | 规范插件 ID。这是在 `plugins.entries.<id>` 中使用的 ID。                                                                                     |
| `configSchema`                      | 是   | `object`                         | 用于此插件配置的内联 JSON 架构。                                                                                                             |
| `enabledByDefault`                  | 否   | `true`                           | 将捆绑插件标记为默认启用。省略它，或设置任何非 `true` 的值，以使插件默认处于禁用状态。                                                       |
| `legacyPluginIds`                   | 否   | `string[]`                       | 可规范化为此规范插件 ID 的旧版 ID。                                                                                                          |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 当身份验证、配置或模型引用提及提供商 ID 时，应自动启用此插件的提供商 ID。                                                                    |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的排他性插件类型。                                                                                              |
| `channels`                          | 否   | `string[]`                       | 由此插件拥有的频道 ID。用于发现和配置验证。                                                                                                  |
| `providers`                         | 否   | `string[]`                       | 由此插件拥有的提供商 ID。                                                                                                                    |
| `modelSupport`                      | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                                                 |
| `providerEndpoints`                 | 否   | `object[]`                       | 清单拥有的端点主机/ baseUrl 元数据，用于核心必须在提供商运行时加载之前进行分类的提供商路由。                                                 |
| `cliBackends`                       | 否   | `string[]`                       | 此插件拥有的 CLI 推理后端 ID。用于通过显式配置引用进行启动时自动激活。                                                                       |
| `syntheticAuthRefs`                 | 否   | `string[]`                       | 提供商或 CLI 后端引用，其插件拥有的合成身份验证挂钩应在运行时加载之前的冷模型发现期间进行探测。                                              |
| `nonSecretAuthMarkers`              | 否   | `string[]`                       | 打包插件拥有的占位符 API 密钥值，代表非机密的本地、OAuth 或环境凭据状态。                                                                    |
| `commandAliases`                    | 否   | `object[]`                       | 由此插件拥有的命令名称，应在运行时加载之前生成感知插件的配置和 CLI 诊断信息。                                                                |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | 廉价的提供商身份验证环境元数据，OpenClaw 可以在不加载插件代码的情况下检查这些数据。                                                          |
| `providerAuthAliases`               | 否   | `Record<string, string>`         | 应重用另一个提供商 ID 进行身份验证查找的提供商 ID，例如，共享基础提供商 API 密钥和身份验证配置文件的编码提供商。                             |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | 廉价的渠道环境元数据，OpenClaw 可以在不加载插件代码的情况下检查这些数据。将其用于通用启动/配置助手应该看到的环境驱动渠道设置或身份验证界面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI �标志连线的廉价身份验证选择元数据。                                                             |
| `activation`                        | 否   | `object`                         | 针对提供商、命令、渠道、路由和功能触发的加载的低成本激活提示。仅限元数据；插件运行时仍拥有实际行为。                                         |
| `setup`                             | 否   | `object`                         | 廉价的设置/新手引导描述符，发现和设置界面可以在不加载插件运行时的情况下对其进行检查。                                                        |
| `qaRunners`                         | 否   | `object[]`                       | 在插件运行时加载之前，由共享 `openclaw qa` 主机使用的廉价 QA 运行器描述符。                                                                  |
| `contracts`                         | 否   | `object`                         | 针对语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、网页获取、网络搜索和工具所有权的静态捆绑功能快照。                     |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 清单拥有的渠道配置元数据，在运行时加载之前合并到发现和验证界面中。                                                                           |
| `skills`                            | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                         |
| `name`                              | 否   | `string`                         | 人类可读的插件名称。                                                                                                                         |
| `description`                       | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                                                                 |
| `version`                           | 否   | `string`                         | 信息性插件版本。                                                                                                                             |
| `uiHints`                           | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                                     |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个新手引导或身份验证选项。
OpenClaw 在提供商运行时加载之前读取此内容。

| 字段                  | 必需 | 类型                                            | 含义                                                                      |
| --------------------- | ---- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选项所属的提供商 ID。                                                   |
| `method`              | 是   | `string`                                        | 要分派到的身份验证方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定身份验证选项 ID。                          |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                  |
| `choiceHint`          | 否   | `string`                                        | 用于选择器的简短辅助文本。                                                |
| `assistantPriority`   | 否   | `number`                                        | 在助手驱动的交互式选择器中，数值越低排序越靠前。                          |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助手选择器中隐藏此选项，同时仍允许手动 CLI 选择。                       |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧选项 ID。                                   |
| `groupId`             | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                       |
| `groupLabel`          | 否   | `string`                                        | 该组的面向用户的标签。                                                    |
| `groupHint`           | 否   | `string`                                        | 用于该组的简短辅助文本。                                                  |
| `optionKey`           | 否   | `string`                                        | 用于简单的单标志身份验证流程的内部选项键。                                |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                               |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 选项形状，例如 `--openrouter-api-key <key>`。                  |
| `cliDescription`      | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                     |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 该选项应出现在哪些新手引导界面中。如果省略，默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有用户可能错误地放入 `plugins.allow` 或尝试作为根 CLI 命令运行的运行时命令名称时，请使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

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

| 字段         | 必填 | 类型              | 含义                                           |
| ------------ | ---- | ----------------- | ---------------------------------------------- |
| `name`       | 是   | `string`          | 属于此插件的命令名称。                         |
| `kind`       | 否   | `"runtime-slash"` | 将别名标记为聊天斜杠命令，而不是根 CLI 命令。  |
| `cliCommand` | 否   | `string`          | 如果存在，则为 CLI 操作建议相关的根 CLI 命令。 |

## activation 参考

当插件可以廉价地声明哪些控制平面事件应该在以后激活它时，请使用 `activation`。

## qaRunners 参考

当插件在共享的 `openclaw qa` 根目录下提供一个或多个传输运行器时，请使用 `qaRunners`。保持此元数据廉价且静态；插件运行时仍然通过导出 `qaRunnerCliRegistrations` 的轻量级 `runtime-api.ts` 接口拥有实际的 CLI 注册。

```json
{
  "qaRunners": [
    {
      "commandName": "matrix",
      "description": "Run the Docker-backed Matrix live QA lane against a disposable homeserver"
    }
  ]
}
```

| 字段          | 必填 | 类型     | 含义                                             |
| ------------- | ---- | -------- | ------------------------------------------------ |
| `commandName` | 是   | `string` | 安装在 `openclaw qa` 下的子命令，例如 `matrix`。 |
| `description` | 否   | `string` | 当共享主机需要存根命令时使用的回退帮助文本。     |

此块仅为元数据。它不注册运行时行为，也不替代 `register(...)`、`setupEntry` 或其他运行时/插件入口点。当前的使用者在进行更广泛的插件加载之前将其用作缩小范围的提示，因此缺少激活元数据通常只会损失性能；只要遗留清单所有权回退仍然存在，就不应改变正确性。

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段             | 必填 | 类型                                                 | 含义                                   |
| ---------------- | ---- | ---------------------------------------------------- | -------------------------------------- |
| `onProviders`    | 否   | `string[]`                                           | 被请求时应激活此插件的提供程序 ID。    |
| `onCommands`     | 否   | `string[]`                                           | 应激活此插件的命令 ID。                |
| `onChannels`     | 否   | `string[]`                                           | 应激活此插件的频道 ID。                |
| `onRoutes`       | 否   | `string[]`                                           | 应激活此插件的路由类型。               |
| `onCapabilities` | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 由控制平面激活规划使用的广泛功能提示。 |

当前活跃的使用者：

- 命令触发的 CLI 规划回退到遗留的
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 当缺少显式的渠道激活元数据时，渠道触发的设置/渠道规划会回退到旧的 `channels[]` 所有权
- 当缺少显式的提供商激活元数据时，提供商触发的设置/运行时规划会回退到旧的 `providers[]` 和顶级 `cliBackends[]` 所有权

## setup 参考

当设置和新手引导界面需要在运行时加载之前获取低成本的插件自有元数据时，请使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶级 `cliBackends` 保持有效，并继续描述 CLI 推理后端。`setup.cliBackends` 是专用于控制平面/设置流程的描述符界面，应保持仅含元数据。

如果存在，`setup.providers` 和 `setup.cliBackends` 是用于设置发现的首选描述符优先查找界面。如果描述符仅缩小了候选插件的范围，而设置仍需要更丰富的设置时运行时挂钩，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为回退执行路径。

由于设置查找可以执行插件自有的 `setup-api` 代码，因此标准化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必须在所有已发现的插件中保持唯一。所有权不明确将导致失败（封闭），而不是按发现顺序选择优胜者。

### setup.providers 参考

| 字段          | 必填 | 类型       | 含义                                                              |
| ------------- | ---- | ---------- | ----------------------------------------------------------------- |
| `id`          | 是   | `string`   | 在设置或新手引导期间公开的提供商 ID。请保持标准化的 ID 全局唯一。 |
| `authMethods` | 否   | `string[]` | 此提供商支持的、无需加载完整运行时的设置/身份验证方法 ID。        |
| `envVars`     | 否   | `string[]` | 通用设置/状态界面可以在插件运行时加载之前检查的环境变量。         |

### setup 字段

| 字段               | 必填 | 类型       | 含义                                                              |
| ------------------ | ---- | ---------- | ----------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在设置和新手引导期间公开的提供商设置描述符。                      |
| `cliBackends`      | 否   | `string[]` | 用于以描述符优先设置查找的设置时后端 ID。保持标准化 ID 全局唯一。 |
| `configMigrations` | 否   | `string[]` | 由此插件的设置界面拥有的配置迁移 ID。                             |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找后，设置是否仍需要执行 `setup-api`。                  |

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
| `help`        | `string`   | 简短的帮助文本。             |
| `tags`        | `string[]` | 可选的 UI 标签。             |
| `advanced`    | `boolean`  | 将字段标记为高级。           |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感信息。 |
| `placeholder` | `string`   | 表单输入的占位符文本。       |

## contracts 参考

请仅将 `contracts` 用于 OpenClaw 无需导入插件运行时即可读取的静态功能所有权元数据。

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
| `webFetchProviders`              | `string[]` | 此插件拥有的 Web 获取提供商 ID。                |
| `webSearchProviders`             | `string[]` | 此插件拥有的网络搜索提供商 ID。                 |
| `tools`                          | `string[]` | 此插件拥有的用于捆绑合约检查的 Agent 工具名称。 |

## channelConfigs 参考

当渠道插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。

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

| 字段          | 类型                     | 含义                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。对每个声明的渠道配置条目是必需的。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。                     |
| `label`       | `string`                 | 当运行时元数据未准备好时，合并到选择器和检查界面中的渠道标签。     |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                                 |
| `preferOver`  | `string[]`               | 此渠道在选择界面中应超越的旧版或较低优先级的插件 ID。              |

## modelSupport 参考

当 OpenClaw 需要在插件运行时加载之前，根据简写模型 ID（如 `gpt-5.4` 或 `claude-sonnet-4.6`）推断您的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用此优先级：

- 显式的 `provider/model` 引用使用所属 `providers` 清单元数据
- `modelPatterns` 优于 `modelPrefixes`
- 如果一个非捆绑插件和一个捆绑插件都匹配，则非捆绑插件获胜
- 剩余的歧义将被忽略，直到用户或配置指定了提供商

字段：

| 字段            | 类型       | 含义                                                       |
| --------------- | ---------- | ---------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 针对简写模型 ID 匹配的前缀。             |
| `modelPatterns` | `string[]` | 在移除配置文件后缀后，针对简写模型 ID 匹配的正则表达式源。 |

旧的顶层能力键已被弃用。请使用 `openclaw doctor --fix` 将
`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、
`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的
清单加载不再将这些顶层字段视为能力所有权。

## 清单与 package. 的对比

这两个文件用于不同的用途：

| 文件                   | 用途                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及插件代码运行前必须存在的 UI 提示     |
| `package.json`         | npm 元数据、依赖安装以及用于入口点、安装拦截、设置或目录元数据的 `openclaw` 块 |

如果您不确定某段元数据应放在哪里，请使用此规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放入 `openclaw.plugin.json`
- 如果它与打包、入口文件或 npm 安装行为有关，请将其放入 `package.json`

### 影响设备发现的 package. 字段

一些运行前的插件元数据有意位于 `package.json` 下的
`openclaw` 块中，而不是 `openclaw.plugin.json` 中。

重要示例：

| 字段                                                              | 含义                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 声明原生插件入口点。                                                                           |
| `openclaw.setupEntry`                                             | 在新手引导和延迟渠道启动期间使用的轻量级仅设置入口点。                                         |
| `openclaw.channel`                                                | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                       |
| `openclaw.channel.configuredState`                                | 轻量级配置状态检查器元数据，可在不加载完整渠道运行时的情况下回答“是否已存在仅环境的设置？”。   |
| `openclaw.channel.persistedAuthState`                             | 轻量级持久身份验证检查器元数据，可在不加载完整渠道运行时的情况下回答“是否已有任何登录内容？”。 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 用于捆绑和外部发布插件的安装/更新提示。                                                        |
| `openclaw.install.defaultChoice`                                  | 当有多个安装源可用时的首选安装路径。                                                           |
| `openclaw.install.minHostVersion`                                 | 支持的最低 OpenClaw 主机版本，使用像 `>=2026.3.22` 这样的 semver 下限。                        |
| `openclaw.install.allowInvalidConfigRecovery`                     | 当配置无效时，允许窄范围的捆绑插件重新安装恢复路径。                                           |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 允许仅设置的渠道界面在启动期间于完整渠道插件加载之前加载。                                     |

`openclaw.install.minHostVersion` 在安装和清单注册表加载期间强制执行。无效值将被拒绝；在较旧的主机上，较新但有效的值将跳过该插件。

`openclaw.install.allowInvalidConfigRecovery` 是故意受限的。它不会使任意损坏的配置可安装。目前，它仅允许安装流程从特定的过时捆绑插件升级失败中恢复，例如缺少捆绑插件路径或该同一捆绑插件的过时 `channels.<id>` 条目。不相关的配置错误仍将阻止安装，并将操作员重定向到 `openclaw doctor --fix`。

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

当设置、诊断或配置状态流程需要在完整的渠道插件加载之前进行廉价的 是/否 身份验证探测时，请使用它。目标导出应该是一个仅读取持久状态的小函数；不要将其通过完整的渠道运行时桶进行路由。

`openclaw.channel.configuredState` 遵循相同的形状以进行廉价的仅环境配置检查：

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

- **每个插件必须附带 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 将导致**错误**。
- 如果插件已安装但其清单或 schema 损坏或缺失，
  验证将失败，Doctor 将报告插件错误。
- 如果插件配置存在但插件已被**禁用**，该配置将被保留，
  并且 Doctor + 日志中会显示**警告**。

有关完整的 `plugins.*` schema，请参阅 [Configuration reference](/zh/gateway/configuration)。

## 注意

- 对于原生 OpenClaw 插件（包括本地文件系统加载），清单是**必需的**。
- 运行时仍会单独加载插件模块；清单仅用于
  发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍为对象，注释、尾随逗号和
  未加引号的键都是可以接受的。
- 清单加载器仅读取已记录的清单字段。避免在此处添加
  自定义顶层键。
- `providerAuthEnvVars` 是用于身份验证探测、环境标记
  验证以及类似提供商身份验证表面的低成本元数据路径，这些路径不应仅仅为了检查环境名称而启动插件
  运行时。
- `providerAuthAliases` 允许提供商变体重用另一个提供商的身份验证
  环境变量、身份验证配置文件、支持配置的身份验证以及 API 密钥新手引导选择
  而无需在核心中硬编码这种关系。
- `providerEndpoints` 允许提供商插件拥有简单的端点主机/baseUrl
  匹配元数据。仅将其用于核心已支持的端点类；
  插件仍拥有运行时行为。
- `syntheticAuthRefs` 是用于提供商拥有的合成
  身份验证挂钩的低成本元数据路径，这些挂钩必须在运行时
  注册表存在之前对冷模型发现可见。仅列出其运行时提供商或 CLI 后端实际
  实现 `resolveSyntheticAuth` 的引用。
- `nonSecretAuthMarkers` 是用于捆绑插件拥有的
  占位符 API 密钥（如本地、OAuth 或环境凭据标记）的低成本元数据路径。
  核心将这些视为非机密内容，用于身份验证显示和机密审计，而无需
  硬编码所属提供商。
- `channelEnvVars` 是用于 shell-env 回退、设置提示和类似渠道界面的廉价元数据路径，这些界面不应仅为了检查环境名称而启动插件运行时。
- `providerAuthChoices` 是用于身份验证选择器、`--auth-choice` 解析、首选提供商映射以及在提供商运行时加载之前的简单新手引导 CLI 标志注册的廉价元数据路径。对于需要提供商代码的运行时向导元数据，请参阅 [Provider runtime hooks](/zh/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件种类通过 `plugins.slots.*` 进行选择。
  - `kind: "memory"` 由 `plugins.slots.memory` 选择。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 选择
    (默认：内置 `legacy`)。
- 当插件不需要时，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何包管理器允许列表要求 (例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。

## 相关

- [Building Plugins](/zh/plugins/building-plugins) — 插件入门
- [Plugin Architecture](/zh/plugins/architecture) — 内部架构
- [SDK Overview](/zh/plugins/sdk-overview) — 插件 SDK 参考
