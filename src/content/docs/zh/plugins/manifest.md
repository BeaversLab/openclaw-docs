---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的捆绑包布局，请参阅 [Plugin bundles](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 捆绑包：`.codex-plugin/plugin.json`
- Claude 捆绑包：`.claude-plugin/plugin.json` 或不带清单的默认 Claude 组件
  布局
- Cursor 捆绑包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些捆绑包布局，但它们不会根据此处描述的 OpenClaw`openclaw.plugin.json` 架构进行验证。

对于兼容的捆绑包，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取捆绑包元数据以及声明的技能根目录、Claude 命令根目录、Claude 捆绑包 OpenClaw`settings.json`OpenClaw 默认值、Claude 捆绑包 LSP 默认值和支持的挂钩包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中提供一个 OpenClaw`openclaw.plugin.json`OpenClaw 文件。OpenClaw 使用此清单来验证配置，**而无需执行插件代码**。缺失或无效的清单将被视为插件错误，并阻止配置验证。

请参阅完整的插件系统指南：[Plugins](/zh/tools/plugin)。
有关原生功能模型和当前外部兼容性指导：
[Capability 模型](/zh/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json`OpenClaw 是 OpenClaw 在加载插件代码**之前**读取的元数据。下面的所有内容必须足够轻量，以便在不启动插件运行时的情况下进行检查。

**用于：**

- 插件标识、配置验证和配置 UI 提示
- 身份验证、新手引导和设置元数据（别名、自动启用、提供商环境变量、身份验证选择）
- 控制平面界面的激活提示
- 简写模型家族所有权
- 静态功能所有权快照 (`contracts`)
- 共享 `openclaw qa` 主机可以检查的 QA 运行器元数据
- 合并到目录和验证界面的渠道特定配置元数据

**不要将其用于：** 注册运行时行为、声明代码入口点或 npm install 元数据。这些内容属于您的插件代码和 npm`package.json`。

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
  "modelIdNormalization": {
    "providers": {
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  },
  "providerEndpoints": [
    {
      "endpointClass": "openrouter",
      "hostSuffixes": ["openrouter.ai"]
    }
  ],
  "providerRequest": {
    "providers": {
      "openrouter": {
        "family": "openrouter"
      }
    }
  },
  "cliBackends": ["openrouter-cli"],
  "syntheticAuthRefs": ["openrouter-cli"],
  "setup": {
    "providers": [
      {
        "id": "openrouter",
        "envVars": ["OPENROUTER_API_KEY"]
      }
    ]
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

| 字段                                 | 必填 | 类型                             | 含义                                                                                                                                                                |
| ------------------------------------ | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 规范插件 ID。这是 `plugins.entries.<id>` 中使用的 ID。                                                                                                              |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                                                      |
| `requiresPlugins`                    | 否   | `string[]`                       | 必须同时安装的插件 ID，此插件才能生效。设备发现（设备发现）会保持插件可加载，但在缺少任何必需插件时会发出警告。                                                     |
| `enabledByDefault`                   | 否   | `true`                           | 将打包的插件标记为默认启用。如果省略此项或设置任何非 `true` 的值，则默认禁用该插件。                                                                                |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 将打包的插件标记为仅在列出的 Node.js 平台上默认启用，例如 Node.js`["darwin"]`。显式配置优先级更高。                                                                 |
| `legacyPluginIds`                    | 否   | `string[]`                       | 可标准化为此规范插件 ID 的旧版 ID。                                                                                                                                 |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当身份验证、配置或模型引用提及这些提供商 ID 时，应自动启用此插件的提供商 ID。                                                                                       |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件类型。                                                                                                                       |
| `channels`                           | 否   | `string[]`                       | 由此插件拥有的频道 ID。用于设备发现和配置验证。                                                                                                                     |
| `providers`                          | 否   | `string[]`                       | 由此插件拥有的提供商 ID。                                                                                                                                           |
| `providerCatalogEntry`               | 否   | `string`                         | 轻量级提供商目录模块路径，相对于插件根目录，用于可在不激活完整插件运行时的情况下加载的清单范围提供商目录元数据。                                                    |
| `modelSupport`                       | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                                                                        |
| `modelCatalog`                       | 否   | `object`                         | 声明式模型目录元数据，用于归此插件所有的提供商。这是未来在不加载插件运行时的情况下进行只读列表、新手引导、模型选择器、别名和抑制的控制平面契约。                    |
| `modelPricing`                       | 否   | `object`                         | 归提供商所有的外部定价查找策略。使用它可以让本地/自托管提供商选择退出远程定价目录，或将提供商引用映射到 OpenRouter/LiteLLM 目录 ID，而无需在核心中硬编码提供商 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 归提供商所有的模型 ID 别名/前缀清理操作，必须在提供商运行时加载之前运行。                                                                                           |
| `providerEndpoints`                  | 否   | `object[]`                       | 归清单所有的端点主机/baseUrl 元数据，用于核心必须在提供商运行时加载之前进行分类的提供商路由。                                                                       |
| `providerRequest`                    | 否   | `object`                         | 廉价的提供商系列和请求兼容性元数据，供通用请求策略在提供商运行时加载之前使用。                                                                                      |
| `secretProviderIntegrations`         | 否   | `Record<string, object>`         | 声明式 SecretRef exec 提供商预设，设置或安装界面可以在核心中不硬编码特定提供商集成的情况下提供这些预设。                                                            |
| `cliBackends`                        | 否   | `string[]`                       | 由此插件拥有的 CLI 推理后端 ID。用于从显式配置引用进行启动时自动激活。                                                                                              |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供商或 CLI 后端引用，其插件拥有的综合身份验证挂钩应在运行时加载之前的冷模型发现期间进行探测。                                                                     |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆绑插件拥有的占位符 API 密钥值，表示非机密的本地、OAuth 或环境凭据状态。                                                                                           |
| `commandAliases`                     | 否   | `object[]`                       | 此插件拥有的命令名称，应在运行时加载之前生成插件感知的配置和 CLI 诊断信息。                                                                                         |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于提供商身份验证/状态查找的已弃用兼容性环境元数据。对于新插件，建议使用 `setup.providers[].envVars`；在弃用期间，OpenClaw 仍会读取此项。                          |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 应重用另一个提供商 ID 进行身份验证查找的提供商 ID，例如共享基础提供商 API 密钥和身份验证配置文件的编码提供商。                                                      |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价渠道环境元数据。将此用于通用启动/配置帮助程序应该看到的环境驱动渠道设置或身份验证界面。                              |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连线的廉价身份验证选择元数据。                                                                                     |
| `activation`                         | 否   | `object`                         | 用于启动、提供商、命令、渠道、路由和功能触发加载的廉价激活规划器元数据。仅限元数据；插件运行时仍拥有实际行为。                                                      |
| `setup`                              | 否   | `object`                         | 发现和设置界面可以在不加载插件运行时的情况下检查的廉价设置/新手引导描述符。                                                                                         |
| `qaRunners`                          | 否   | `object[]`                       | 在插件运行时加载之前，由共享 `openclaw qa` 主机使用的廉价 QA 运行器描述符。                                                                                         |
| `contracts`                          | 否   | `object`                         | 外部认证钩子、嵌入、语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、Web 获取、Web 搜索和工具所有权的静态能力所有权快照。                          |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中声明的提供商 ID 的低成本媒体理解默认值。                                                                               |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.imageGenerationProviders` 中声明的提供商 ID 的低成本图像生成认证元数据，包括提供商拥有的认证别名和基础 URL 保护。                                     |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.videoGenerationProviders` 中声明的提供商 ID 的低成本视频生成认证元数据，包括提供商拥有的认证别名和基础 URL 保护。                                     |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.musicGenerationProviders` 中声明的提供商 ID 的低成本音乐生成认证元数据，包括提供商拥有的认证别名和基础 URL 保护。                                     |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 在 `contracts.tools` 中声明的插件拥有的工具的低成本可用性元数据。当工具除非存在配置、环境或认证证据否则不应加载运行时时使用它。                                     |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在运行时加载之前合并到发现和验证表面的清单拥有的渠道配置元数据。                                                                                                    |
| `skills`                             | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                                                |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                                |
| `description`                        | 否   | `string`                         | 在插件表面显示的简短摘要。                                                                                                                                          |
| `version`                            | 否   | `string`                         | 信息性插件版本。                                                                                                                                                    |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                                                            |

## 生成提供商元数据参考

生成提供商元数据字段描述了在匹配的 `contracts.*GenerationProviders`OpenClaw 列表中声明的提供商的静态身份验证信号。OpenClaw 在提供商运行时加载之前读取这些字段，以便核心工具可以在不导入每个提供商插件的情况下确定生成提供商是否可用。

仅将这些字段用于廉价的、声明性的事实。传输、请求转换、令牌刷新、凭证验证以及实际的生成行为保留在插件运行时中。

```json
{
  "contracts": {
    "imageGenerationProviders": ["example-image"]
  },
  "imageGenerationProviderMetadata": {
    "example-image": {
      "aliases": ["example-image-oauth"],
      "authProviders": ["example-image"],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example-image.config",
          "overlayPath": "image",
          "mode": {
            "path": "mode",
            "default": "local",
            "allowed": ["local"]
          },
          "requiredAny": ["workflow", "workflowPath"],
          "required": ["promptNodeId"]
        }
      ],
      "authSignals": [
        {
          "provider": "example-image"
        },
        {
          "provider": "example-image-oauth",
          "providerBaseUrl": {
            "provider": "example-image",
            "defaultBaseUrl": "https://api.example.com/v1",
            "allowedBaseUrls": ["https://api.example.com/v1"]
          }
        }
      ]
    }
  }
}
```

每个元数据条目支持：

| 字段                   | 必填 | 类型       | 含义                                                                                                             |
| ---------------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `aliases`              | 否   | `string[]` | 应视为该生成提供商的静态身份验证别名的其他提供商 ID。                                                            |
| `authProviders`        | 否   | `string[]` | 其配置的身份验证配置文件应视为该生成提供商的身份验证的提供商 ID。                                                |
| `configSignals`        | 否   | `object[]` | 适用于本地或自托管提供商的廉价仅配置可用性信号，这些提供商可以在没有身份验证配置文件或环境变量的情况下进行配置。 |
| `authSignals`          | 否   | `object[]` | 显式的身份验证信号。如果存在，这些将替换来自提供商 ID、`aliases` 和 `authProviders` 的默认信号集。               |
| `referenceAudioInputs` | 否   | `boolean`  | 仅限视频生成。当提供商接受参考音频资源时设置为 `true`；否则 `video_generate` 会隐藏音频参考参数。                |

每个 `configSignals` 条目支持：

| 字段          | 必填 | 类型       | 含义                                                                                                               |
| ------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `rootPath`    | 是   | `string`   | 要检查的插件拥有的配置对象的点路径，例如 `plugins.entries.example.config`。                                        |
| `overlayPath` | 否   | `string`   | 根配置内部的点路径，其对象应在评估信号之前覆盖根对象。将其用于特定于功能的配置，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效配置中必须具有已配置值的点路径。字符串必须非空；对象和数组不得为空。                                           |
| `requiredAny` | 否   | `string[]` | 有效配置中的点路径，其中至少必须有一个具有已配置的值。                                                             |
| `mode`        | 否   | `object`   | 有效配置中的可选字符串模式守卫。当仅配置可用性适用于一种模式时，请使用此选项。                                     |

每个 `mode` 守卫支持：

| 字段         | 必填 | 类型       | 含义                                                   |
| ------------ | ---- | ---------- | ------------------------------------------------------ |
| `path`       | 否   | `string`   | 有效配置内的点路径。默认为 `mode`。                    |
| `default`    | 否   | `string`   | 当配置省略路径时使用的模式值。                         |
| `allowed`    | 否   | `string[]` | 如果存在，则仅当有效模式为这些值之一时，信号才会通过。 |
| `disallowed` | 否   | `string[]` | 如果存在，则当有效模式为这些值之一时，信号将失败。     |

每个 `authSignals` 条目支持：

| 字段              | 必填 | 类型     | 含义                                                                                                                       |
| ----------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在已配置的身份验证配置文件中检查的提供商 ID。                                                                            |
| `providerBaseUrl` | 否   | `object` | 可选守卫，仅当引用的已配置提供商使用允许的基 URL 时，该守卫才使信号生效。当身份验证别名仅对某些 API 有效时，请使用此选项。 |

每个 `providerBaseUrl` 守卫支持：

| 字段              | 必填 | 类型       | 含义                                                                                                      |
| ----------------- | ---- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 应检查其 `baseUrl` 的提供商配置 ID。                                                                      |
| `defaultBaseUrl`  | 否   | `string`   | 当提供商配置省略 `baseUrl` 时假定的基 URL。                                                               |
| `allowedBaseUrls` | 是   | `string[]` | 此身份验证信号允许的基础 URL。当配置或默认的基础 URL 与这些规范化值中的任何一个不匹配时，该信号将被忽略。 |

## 工具元数据参考

`toolMetadata` 使用与生成提供商元数据相同的 `configSignals` 和 `authSignals` 形状，以工具名称为键。`contracts.tools` 声明所有权。`toolMetadata`OpenClaw 声明廉价的可用性证据，以便 OpenClaw 可以避免仅仅为了让其工具工厂返回 `null` 而导入插件运行时。

```json
{
  "setup": {
    "providers": [
      {
        "id": "example",
        "envVars": ["EXAMPLE_API_KEY"]
      }
    ]
  },
  "contracts": {
    "tools": ["example_search"]
  },
  "toolMetadata": {
    "example_search": {
      "authSignals": [
        {
          "provider": "example"
        }
      ],
      "configSignals": [
        {
          "rootPath": "plugins.entries.example.config",
          "overlayPath": "search",
          "required": ["apiKey"]
        }
      ]
    }
  }
}
```

如果工具没有 `toolMetadata`OpenClaw，OpenClaw 将保留现有行为，并在工具合约匹配策略时加载拥有该工具的插件。对于工厂依赖于身份验证/配置的热路径工具，插件作者应声明 `toolMetadata`，而不是让核心导入运行时来询问。

## providerAuthChoices 参考

每个 `providerAuthChoices`OpenClaw 条目描述一个新手引导或身份验证选择。OpenClaw 会在提供商运行时加载之前读取此内容。提供商设置列表使用这些清单选择、描述符派生的设置选择和安装目录元数据，而无需加载提供商运行时。

| 字段                  | 必需 | 类型                                                                  | 含义                                                                        |
| --------------------- | ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 此选择所属的提供商 ID。                                                     |
| `method`              | 是   | `string`                                                              | 要分派到的身份验证方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                                              | 新手引导和 CLI 流程使用的稳定身份验证选择 ID。                              |
| `choiceLabel`         | 否   | `string`                                                              | 面向用户的标签。如果省略，OpenClaw 将回退到 OpenClaw`choiceId`。            |
| `choiceHint`          | 否   | `string`                                                              | 选择器的简短辅助文本。                                                      |
| `assistantPriority`   | 否   | `number`                                                              | 较低的值会在助手驱动的交互式选择器中排在前面。                              |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 在仍然允许手动 CLI 选择的同时，从助手选择器中隐藏该选项。                   |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 应该将用户重定向到此替换选项的旧版选项 ID。                                 |
| `groupId`             | 否   | `string`                                                              | 用于对相关选项进行分组的可选组 ID。                                         |
| `groupLabel`          | 否   | `string`                                                              | 面向用户的该组标签。                                                        |
| `groupHint`           | 否   | `string`                                                              | 该组的简短帮助文本。                                                        |
| `optionKey`           | 否   | `string`                                                              | 用于简单单标志身份验证流程的内部选项键。                                    |
| `cliFlag`             | 否   | `string`                                                              | CLI 标志名称，例如 CLI`--openrouter-api-key`。                              |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 选项结构，例如 CLI`--openrouter-api-key <key>`。                 |
| `cliDescription`      | 否   | `string`                                                              | 在 CLI 帮助中使用的描述。                                                   |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 该选项应出现在哪些新手引导界面中。如果省略，则默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有用户可能误放入 `plugins.allow`CLIOpenClaw 或尝试作为根 CLI 命令运行的运行时命令名称时，请使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

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

| 字段         | 必填 | 类型              | 含义                                                     |
| ------------ | ---- | ----------------- | -------------------------------------------------------- |
| `name`       | 是   | `string`          | 属于此插件的命令名称。                                   |
| `kind`       | 否   | `"runtime-slash"` | 将别名标记为聊天斜杠命令，而不是根 CLI 命令。            |
| `cliCommand` | 否   | `string`          | 相关的根 CLI 命令，以便为 CLI 操作提供建议（如果存在）。 |

## activation 参考

当插件能够轻松声明哪些控制平面事件应将其包含在激活/加载计划中时，请使用 `activation`。

此块是规划器元数据，而不是生命周期 API。它不注册运行时行为，不取代 API`register(...)`，也不保证插件代码已经执行。激活规划器使用这些字段在回退到现有的清单所有权元数据（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks）之前缩小候选插件的范围。

优先使用已经描述所有权的最窄元数据。当这些字段表达关系时，请使用 `providers`、`channels`、`commandAliases`、setup 描述符或 `contracts`。使用 `activation` 提供无法由这些所有权字段表示的额外规划器提示。请使用顶层 `cliBackends`CLI 用于 CLI 运行时别名，例如 `claude-cli`、`my-cli` 或 `google-gemini-cli`；`activation.onAgentHarnesses` 仅用于尚未具有所有权字段的嵌入式 agent harness id。

此块仅是元数据。它不注册运行时行为，也不取代 `register(...)`、`setupEntry` 或其他运行时/插件入口点。当前的使用者将其作为更广泛的插件加载之前的缩小提示，因此缺少非启动激活元数据通常只会影响性能；只要清单所有权回退仍然存在，就不应影响正确性。

每个插件都应有意识地设置 `activation.onStartup`。仅当插件必须在 Gateway(网关) 启动期间运行时，才将其设置为 `true`。当插件在启动时处于非活动状态且应仅从更具体的触发器加载时，将其设置为 `false`。省略 `onStartup` 不再隐式地在启动时加载插件；对于启动、渠道、配置、agent-harness、内存或其他更具体的激活触发器，请使用显式激活元数据。

```json
{
  "activation": {
    "onStartup": false,
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段               | 是否必填 | 类型                                                 | 含义                                                                                                                                             |
| ------------------ | -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | 否       | `boolean`                                            | 显式的 Gateway(网关) 启动激活。每个插件都应设置此项。`true` 在启动期间导入插件；`false` 使其在启动时保持懒加载，除非另一个匹配的触发器要求加载。 |
| `onProviders`      | 否       | `string[]`                                           | 应在激活/加载计划中包含此插件的提供者 ID。                                                                                                       |
| `onAgentHarnesses` | 否       | `string[]`                                           | 应在激活/加载计划中包含此插件的嵌入式 agent harness 运行时 ID。对于 CLI 后端别名，请使用顶层 `cliBackends`。                                     |
| `onCommands`       | 否       | `string[]`                                           | 应在激活/加载计划中包含此插件的命令 ID。                                                                                                         |
| `onChannels`       | 否       | `string[]`                                           | 应在激活/加载计划中包含此插件的渠道 ID。                                                                                                         |
| `onRoutes`         | 否       | `string[]`                                           | 应在激活/加载计划中包含此插件的路由类型。                                                                                                        |
| `onConfigPaths`    | 否       | `string[]`                                           | 相对于根的配置路径，当路径存在且未显式禁用时，应在启动/加载计划中包含此插件。                                                                    |
| `onCapabilities`   | 否       | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 由控制平面激活规划使用的广泛能力提示。如果可能，优先使用更具体的字段。                                                                           |

当前活跃使用者：

- Gateway(网关) 启动规划使用 `activation.onStartup` 进行显式启动
  导入
- command-triggered CLI 计划会回退到旧版
  CLI`commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent-runtime 启动计划针对嵌入式 harness 使用 `activation.onAgentHarnesses`，针对 CLI 运行时别名使用顶层 `cliBackends[]`CLI
- 当缺少显式的渠道激活元数据时，渠道-triggered setup/渠道 计划会回退到旧版 `channels[]`
  所有权
- startup 插件计划针对非渠道根配置表面（例如打包的浏览器插件的 `browser` 块）使用 `activation.onConfigPaths`
- 当缺少显式的提供商激活元数据时，提供商-triggered setup/runtime 计划会回退到旧版
  `providers[]` 和顶层 `cliBackends[]` 所有权

Planner 诊断可以区分显式激活提示和清单所有权回退。例如，`activation-command-hint` 表示
`activation.onCommands` 匹配，而 `manifest-command-alias` 表示
规划器使用了 `commandAliases` 所有权。这些原因标签用于
主机诊断和测试；插件作者应继续声明最能
描述所有权的元数据。

## qaRunners 参考

当插件在共享 `openclaw qa`CLI 根目录下提供一个或多个传输运行器时，请使用 `qaRunners`。保持此元数据轻量且静态；插件
运行时仍通过导出 `qaRunnerCliRegistrations` 的轻量级
`runtime-api.ts` 表面拥有实际的 CLI 注册。

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

| 字段          | 必需 | 类型     | 含义                                             |
| ------------- | ---- | -------- | ------------------------------------------------ |
| `commandName` | 是   | `string` | 挂载在 `openclaw qa` 下的子命令，例如 `matrix`。 |
| `description` | 否   | `string` | 当共享主机需要存根命令时使用的回退帮助文本。     |

## setup 参考

当 setup 和 新手引导 表面在运行时加载之前需要廉价的插件自有元数据
时，请使用 `setup`。

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"],
        "authEvidence": [
          {
            "type": "local-file-with-env",
            "fileEnvVar": "OPENAI_CREDENTIALS_FILE",
            "requiresAllEnv": ["OPENAI_PROJECT"],
            "credentialMarker": "openai-local-credentials",
            "source": "openai local credentials"
          }
        ]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

顶级 `cliBackends` 保持有效，并继续描述 CLI 推理后端。`setup.cliBackends` 是特定于设置的描述符表面，用于应保持仅元数据的控制平面/设置流程。

如果存在，`setup.providers` 和 `setup.cliBackends` 是用于设置发现的首选描述符优先查找表面。如果描述符仅缩小候选插件范围，并且设置仍然需要更丰富的设置时运行时挂钩，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为备用执行路径。

OpenClaw 还在通用提供商身份验证和环境变量查找中包含 `setup.providers[].envVars`。在弃用窗口期间，`providerAuthEnvVars` 通过兼容性适配器继续受支持，但仍在使用它的非打包插件会收到清单诊断。新插件应将设置/状态环境元数据放在 `setup.providers[].envVars` 上。

当没有可用的设置条目，或者当 `setup.requiresRuntime: false` 声明设置运行时不需要时，OpenClaw 也可以从 `setup.providers[].authMethods` 推导简单的设置选项。显式 `providerAuthChoices` 条目仍然是自定义标签、CLI 标志、新手引导范围和助手元数据的首选。

仅当这些描述符足以用于设置表面时，才设置 `requiresRuntime: false`。OpenClaw 将显式 `false` 视为仅描述符契约，并且不会执行 `setup-api` 或 `openclaw.setupEntry` 进行设置查找。如果一个仅描述符插件仍然附带这些设置运行时条目之一，OpenClaw 会报告一个附加诊断并继续忽略它。省略 `requiresRuntime` 会保持传统备用行为，以便添加了描述符但未添加该标志的现有插件不会中断。

由于设置查找可以执行插件拥有的 `setup-api` 代码，因此标准化的
`setup.providers[].id` 和 `setup.cliBackends[]` 值必须在已发现的插件之间保持唯一。如果所有权模糊，将直接失败（拒绝访问），而不是按发现顺序选择胜出者。

当设置运行时确实执行时，如果 `setup-api` 注册了清单描述符未声明的提供商或 CLI 后端，或者描述符没有匹配的运行时注册，则设置注册表诊断将报告描述符偏差。这些诊断是累加的，不会拒绝旧版插件。

### setup.providers 参考

| 字段           | 必填 | 类型       | 含义                                                                   |
| -------------- | ---- | ---------- | ---------------------------------------------------------------------- |
| `id`           | 是   | `string`   | 在设置或新手引导期间公开的提供商 ID。请保持标准化 ID 全局唯一。        |
| `authMethods`  | 否   | `string[]` | 此提供商在不加载完整运行时的情况下支持的设置/身份验证方法 ID。         |
| `envVars`      | 否   | `string[]` | 通用设置/状态界面可以在加载插件运行时之前检查的环境变量。              |
| `authEvidence` | 否   | `object[]` | 针对可以通过非机密标记进行身份验证的提供商的廉价本地身份验证证据检查。 |

`authEvidence` 用于提供商拥有的本地凭据标记，这些标记
可以在不加载运行时代码的情况下进行验证。这些检查必须保持廉价和本地化：
不进行网络调用，不读取密钥链或机密管理器，不执行 shell 命令，也不进行
提供商 API 探测。

支持的证据条目：

| 字段               | 必填 | 类型       | 含义                                                                                 |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------ |
| `type`             | 是   | `string`   | 当前为 `local-file-with-env`。                                                       |
| `fileEnvVar`       | 否   | `string`   | 包含显式凭据文件路径的环境变量。                                                     |
| `fallbackPaths`    | 否   | `string[]` | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在凭证有效之前，列出的环境变量中必须至少有一个非空。                                 |
| `requiresAllEnv`   | 否   | `string[]` | 在凭证有效之前，列出的所有环境变量必须均为非空。                                     |
| `credentialMarker` | 是   | `string`   | 当凭证存在时返回的非机密标记。                                                       |
| `source`           | 否   | `string`   | 面向用户的用于身份验证/状态输出的源标签。                                            |

### setup 字段

| 字段               | 必填 | 类型       | 含义                                                                |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在设置和新手引导期间公开的提供程序设置描述符。                      |
| `cliBackends`      | 否   | `string[]` | 用于基于描述符的设置查找的设置时后端 ID。请确保规范化 ID 全局唯一。 |
| `configMigrations` | 否   | `string[]` | 归此插件的设置表面所有的配置迁移 ID。                               |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之后，设置是否仍需要 `setup-api` 执行。                 |

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

| 字段          | 类型       | 含义                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向用户的字段标签。     |
| `help`        | `string`   | 简短的帮助文本。         |
| `tags`        | `string[]` | 可选的 UI 标签。         |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## contracts 参考

请仅将 `contracts` 用于 OpenClaw 无需导入插件运行时即可读取的静态能力所有权元数据。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                             | 类型       | 含义                                                                |
| -------------------------------- | ---------- | ------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex 应用服务器扩展工厂 ID，目前为 `codex-app-server`。            |
| `agentToolResultMiddleware`      | `string[]` | 打包的插件可以为其注册工具结果中间件的运行时 ID。                   |
| `externalAuthProviders`          | `string[]` | 此插件拥有的外部身份验证配置挂钩的提供商 ID。                       |
| `embeddingProviders`             | `string[]` | 此插件拥有的通用嵌入提供商 ID，用于可重用的向量嵌入，包括记忆。     |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 ID。                                         |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转录提供商 ID。                                     |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 ID。                                     |
| `memoryEmbeddingProviders`       | `string[]` | 此插件拥有的已弃用的特定记忆嵌入提供商 ID。                         |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 ID。                                     |
| `transcriptSourceProviders`      | `string[]` | 此插件拥有的转录源提供商 ID。                                       |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 ID。                                     |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 ID。                                     |
| `webFetchProviders`              | `string[]` | 此插件拥有的 Web 抓取提供商 ID。                                    |
| `webSearchProviders`             | `string[]` | 此插件拥有的 Web 搜索提供商 ID。                                    |
| `migrationProviders`             | `string[]` | 此插件拥有的用于 `openclaw migrate` 的导入提供商 ID。               |
| `gatewayMethodDispatch`          | `string[]` | 为在进程中调度 Gateway(网关) 方法的已验证插件 HTTP 路由保留的权限。 |
| `tools`                          | `string[]` | 此插件拥有的 Agent 工具名称。                                       |

`contracts.embeddedExtensionFactories` 保留用于打包的 Codex
仅限应用服务器的扩展工厂。打包的工具结果转换应
改为声明 `contracts.agentToolResultMiddleware` 并注册到
`api.registerAgentToolResultMiddleware(...)`。外部插件无法
注册工具结果中间件，因为接缝可以在模型看到之前重写高信任工具
输出。

运行时 `api.registerTool(...)` 注册必须匹配 `contracts.tools`。
工具发现使用此列表仅加载可以拥有所请求
工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的提供商插件应声明
`contracts.externalAuthProviders`；未声明的 external-auth 钩子将被忽略。

通用嵌入提供商应为
每个使用 `api.registerEmbeddingProvider(...)` 注册的适配器声明 `contracts.embeddingProviders`。使用
通用合同进行可重用的向量生成，包括由
内存搜索使用的提供商。`contracts.memoryEmbeddingProviders` 是已弃用的
特定于内存的兼容性，仅在现有提供商迁移
到通用嵌入提供商接缝时保留。

`contracts.gatewayMethodDispatch` 目前接受
`"authenticated-request"`。这是一个用于原生插件 HTTP
路由的 API 卫生门，旨在有意地在进程内调度 Gateway(网关) 控制平面方法，而
不是针对恶意原生插件的沙盒。仅将其用于已经需要 Gateway(网关) HTTP 身份验证的经过严格审查的
打包/操作员界面。

## mediaUnderstandingProviderMetadata 参考

当媒体理解提供商具有默认模型、自动身份验证回退优先级或通用核心助手在运行时加载之前需要的本机文档支持时，请使用 `mediaUnderstandingProviderMetadata`。键也必须在
`contracts.mediaUnderstandingProviders` 中声明。

```json
{
  "contracts": {
    "mediaUnderstandingProviders": ["example"]
  },
  "mediaUnderstandingProviderMetadata": {
    "example": {
      "capabilities": ["image", "audio"],
      "defaultModels": {
        "image": "example-vision-latest",
        "audio": "example-transcribe-latest"
      },
      "autoPriority": {
        "image": 40
      },
      "nativeDocumentInputs": ["pdf"]
    }
  }
}
```

每个提供商条目可以包括：

| 字段                   | 类型                                | 含义                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供商公开的媒体功能。                           |
| `defaultModels`        | `Record<string, string>`            | 当配置未指定模型时使用的功能到模型的默认值。       |
| `autoPriority`         | `Record<string, number>`            | 数字越小，在基于凭据的提供商自动回退中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支持的原生文档输入。                         |

## channelConfigs 参考

当渠道插件需要在运行时加载之前获取轻量级配置元数据时，请使用 `channelConfigs`。只读渠道设置/状态发现可以在没有可用设置条目，或者 `setup.requiresRuntime: false` 声明不需要设置运行时的情况下，直接使用此元数据来配置外部渠道。

`channelConfigs` 是插件清单元数据，而不是一个新的顶级用户配置部分。用户仍然在 `channels.<channel-id>`OpenClaw 下配置渠道实例。在插件运行时代码执行之前，OpenClaw 会读取清单元数据来决定哪个插件拥有该配置的渠道。

对于渠道插件，`configSchema` 和 `channelConfigs` 描述了不同的路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非捆绑插件还应该声明匹配的 `channelConfigs`OpenClaw 条目。如果没有这些，OpenClaw 仍然可以加载插件，但冷路径配置架构、设置和控制 UI 界面在插件运行时执行之前无法知道渠道拥有的选项形状。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可以声明用于在渠道运行时加载之前运行的命令配置检查的静态 `auto` 默认值。捆绑渠道还可以通过 `package.json#openclaw.channel.commands` 连同其其他包拥有的渠道目录元数据一起发布相同的默认值。

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
      "commands": {
        "nativeCommandsAutoEnabled": true,
        "nativeSkillsAutoEnabled": true
      },
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每个渠道条目可以包含：

| 字段          | 类型                     | 含义                                                                      |
| ------------- | ------------------------ | ------------------------------------------------------------------------- |
| `schema`      | `object`                 | 用于 `channels.<id>` 的 JSON Schema。对每个声明的渠道配置条目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。                            |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，合并到选择器和检查界面中的渠道标签。            |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                                        |
| `commands`    | `object`                 | 用于运行前配置检查的静态原生命令和原生技能自动默认值。                    |
| `preferOver`  | `string[]`               | 该渠道在选择界面中应排名高于的旧版或较低优先级插件 ID。                   |

### 替换另一个渠道插件

当您的插件是另一个插件也能提供的渠道 ID 的首选所有者时，请使用 `preferOver`。常见情况包括重命名的插件 ID、取代打包插件的独立插件，或者为了配置兼容性而保持相同渠道 ID 的维护分支。

```json
{
  "id": "acme-chat",
  "channels": ["chat"],
  "channelConfigs": {
    "chat": {
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "webhookUrl": { "type": "string" }
        }
      },
      "preferOver": ["chat"]
    }
  }
}
```

当配置了 `channels.chat`OpenClawOpenClawOpenClaw 时，OpenClaw 会同时考虑渠道 ID 和首选插件 ID。如果选择较低优先级插件只是因为它被捆绑或默认启用，OpenClaw 会在有效运行时配置中将其禁用，以便由一个插件拥有该渠道及其工具。显式的用户选择仍然优先：如果用户显式启用了两个插件，OpenClaw 将保留该选择，并报告重复的渠道/工具诊断信息，而不是静默更改请求的插件集。

请将 `preferOver` 的范围限制在真正可以提供同一渠道的插件 ID。它不是通用的优先级字段，也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 需要在插件运行时加载之前，从 `gpt-5.5` 或 `claude-sonnet-4.6` 等简写模型 ID 推断您的提供商插件时，请使用 `modelSupport`OpenClaw。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用以下优先级：

- 显式的 `provider/model` 引用使用所属 `providers` 清单元数据
- `modelPatterns` beat `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包插件
  胜出
- 剩余的歧义将被忽略，直到用户或配置指定提供商

字段：

| 字段            | 类型       | 含义                                                |
| --------------- | ---------- | --------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 匹配简写模型 ID 的前缀。          |
| `modelPatterns` | `string[]` | 移除配置文件后缀后，与简写模型 ID 匹配的 Regex 源。 |

`modelPatterns` 条目通过 `compileSafeRegex` 编译，该过程会拒绝
包含嵌套重复的模式（例如 `(a+)+$`）。未通过
安全检查的模式将被静默跳过，与语法无效的 regex 相同。
请保持模式简单，并避免嵌套量词。

## modelCatalog 参考

当 OpenClaw 应在加载插件运行时之前了解提供商模型元数据时，请使用 `modelCatalog`。这是清单拥有的固定目录
行、提供商别名、抑制规则和发现模式的源。运行时刷新
仍属于提供商运行时代码，但清单会告知核心何时
需要运行时。

```json
{
  "providers": ["openai"],
  "modelCatalog": {
    "providers": {
      "openai": {
        "baseUrl": "https://api.openai.com/v1",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4",
            "input": ["text", "image"],
            "reasoning": true,
            "contextWindow": 256000,
            "maxTokens": 128000,
            "cost": {
              "input": 1.25,
              "output": 10,
              "cacheRead": 0.125
            },
            "status": "available",
            "tags": ["default"]
          }
        ]
      }
    },
    "aliases": {
      "azure-openai-responses": {
        "provider": "openai",
        "api": "azure-openai-responses"
      }
    },
    "suppressions": [
      {
        "provider": "azure-openai-responses",
        "model": "gpt-5.3-codex-spark",
        "reason": "not available on Azure OpenAI Responses"
      }
    ],
    "discovery": {
      "openai": "static"
    }
  }
}
```

顶级字段：

| 字段             | 类型                                                     | 含义                                                                 |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | 归此插件所有的提供商 ID 的目录行。键也应出现在顶级 `providers` 中。  |
| `aliases`        | `Record<string, object>`                                 | 应解析为归此插件所有的提供商的提供商别名，用于目录或抑制规划。       |
| `suppressions`   | `object[]`                                               | 来自其他源的模型行，此插件因提供商特定原因而抑制它们。               |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供商目录是否可以从清单元数据读取、刷新到缓存，或者需要运行时。     |
| `runtimeAugment` | `boolean`                                                | 仅当提供商运行时必须在清单/配置规划后追加目录行时，才设置为 `true`。 |

`aliases`OpenClawAPI 参与模型目录规划的提供商所有权查找。
别名目标必须是同一插件拥有的顶级提供商。当使用提供商过滤列表时，OpenClaw 可以读取所属清单
并在不加载提供商运行时的情况下应用别名 API/基础 URL 覆盖。别名不会展开未过滤的目录列表；广泛的列表仅发出所属规范提供商行。

`suppressions` 取代了旧的提供商运行时 `suppressBuiltInModel` 钩子。
仅当提供商归插件所有或被声明为针对拥有提供商的 `modelCatalog.aliases` 键时，才会遵守抑制条目。运行时抑制钩子不再在模型解析期间被调用。

提供商字段：

| 字段      | 类型                     | 含义                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供商目录中模型的可选默认基础 URL。    |
| `api`     | `ModelApi`               | 此提供商目录中模型的可选默认 API 适配器。 |
| `headers` | `Record<string, string>` | 适用于此提供商目录的可选静态标头。        |
| `models`  | `object[]`               | 必需的模型行。没有 `id` 的行将被忽略。    |

模型字段：

| 字段            | 类型                                                           | 含义                                                      |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `id`            | `string`                                                       | 提供商本地的模型 ID，不带 `provider/` 前缀。              |
| `name`          | `string`                                                       | 可选显示名称。                                            |
| `api`           | `ModelApi`                                                     | 可选的每个模型 API 覆盖。                                 |
| `baseUrl`       | `string`                                                       | 可选的每个模型基础 URL 覆盖。                             |
| `headers`       | `Record<string, string>`                                       | 可选的每个模型静态标头。                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模态。                                          |
| `reasoning`     | `boolean`                                                      | 模型是否公开推理行为。                                    |
| `contextWindow` | `number`                                                       | 原生提供商上下文窗口。                                    |
| `contextTokens` | `number`                                                       | 当与 `contextWindow` 不同时可选的有效运行时上下文上限。   |
| `maxTokens`     | `number`                                                       | 已知时的最大输出 token 数。                               |
| `cost`          | `object`                                                       | 可选的每百万 token 美元价格，包括可选的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 匹配 OpenClaw 模型配置兼容性的可选兼容性标志。            |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅当该行绝对不能出现时才抑制。                  |
| `statusReason`  | `string`                                                       | 与不可用状态一起显示的可选原因。                          |
| `replaces`      | `string[]`                                                     | 此模型取代的较旧的提供商本地模型 ID。                     |
| `replacedBy`    | `string`                                                       | 用于已弃用行的替换提供商本地模型 ID。                     |
| `tags`          | `string[]`                                                     | 由选择器和过滤器使用的稳定标签。                          |

抑制字段：

| 字段                       | 类型       | 含义                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `provider`                 | `string`   | 要抑制的上游行的提供商 ID。必须由此插件拥有或声明为拥有的别名。 |
| `model`                    | `string`   | 要抑制的提供商本地模型 ID。                                     |
| `reason`                   | `string`   | 当直接请求被抑制的行时显示的可选消息。                          |
| `when.baseUrlHosts`        | `string[]` | 应用抑制之前所需的有效提供商基础 URL 主机的可选列表。           |
| `when.providerConfigApiIn` | `string[]` | 应用抑制之前所需的确切提供商配置 `api` 值的可选列表。           |

不要在 `modelCatalog` 中放入仅运行时数据。仅当清单行足够完整，可供提供商过滤的列表和选择器界面跳过注册表/运行时发现时，才使用 `static`。当清单行是有用的可列出种子或补充内容，但刷新/缓存可以稍后添加更多行时，请使用 `refreshable`；可刷新的行本身不具有权威性。当 OpenClaw 必须加载提供商运行时才能知道该列表时，请使用 `runtime`。

## modelIdNormalization 参考

使用 `modelIdNormalization` 进行低成本的提供商拥有的模型 ID 清理，这些清理必须在提供商运行时加载之前完成。这可以将别名（如短模型名称、提供商本地遗留 ID 和代理前缀规则）保留在所属插件清单中，而不是核心模型选择表中。

```json
{
  "providers": ["anthropic", "openrouter"],
  "modelIdNormalization": {
    "providers": {
      "anthropic": {
        "aliases": {
          "sonnet-4.6": "claude-sonnet-4-6"
        }
      },
      "openrouter": {
        "prefixWhenBare": "openrouter"
      }
    }
  }
}
```

提供商字段：

| 字段                                 | 类型                    | 含义                                                                    |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不区分大小写的确切模型 ID 别名。值将按写入原样返回。                    |
| `stripPrefixes`                      | `string[]`              | 在别名查找之前要移除的前缀，适用于遗留的提供商/模型重复。               |
| `prefixWhenBare`                     | `string`                | 当标准化的模型 ID 尚未包含 `/` 时要添加的前缀。                         |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找之后的有条件裸 ID 前缀规则，由 `modelPrefix` 和 `prefix` 键控。 |

## providerEndpoints 参考

使用 `providerEndpoints` 进行端点分类，通用请求策略必须在提供商运行时加载之前了解这些分类。Core 仍然拥有每个 `endpointClass` 的含义；插件清单拥有主机和基础 URL 元数据。

端点字段：

| 字段                           | 类型       | 含义                                                                        |
| ------------------------------ | ---------- | --------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 映射到端点类的确切主机名。                                                  |
| `hostSuffixes`                 | `string[]` | 映射到端点类的主机后缀。前缀为 `.` 以进行仅域名后缀匹配。                   |
| `baseUrls`                     | `string[]` | 映射到端点类的确切标准化 HTTP(S) 基础 URL。                                 |
| `googleVertexRegion`           | `string`   | 针对确切全局主机的静态 Google Vertex 区域。                                 |
| `googleVertexRegionHostSuffix` | `string`   | 要从匹配主机中剥离的后缀，以公开 Google Vertex 区域前缀。                   |

## providerRequest 参考

使用 `providerRequest` 获取通用请求策略所需而无需加载提供商运行时的廉价请求兼容性元数据。将特定行为的负载重写保留在提供商运行时挂钩或共享提供商系列辅助程序中。

```json
{
  "providers": ["vllm"],
  "providerRequest": {
    "providers": {
      "vllm": {
        "family": "vllm",
        "openAICompletions": {
          "supportsStreamingUsage": true
        }
      }
    }
  }
}
```

提供商字段：

| 字段                  | 类型         | 含义                                                        |
| --------------------- | ------------ | ----------------------------------------------------------- |
| `family`              | `string`     | 通用请求兼容性决策和诊断使用的提供商系列标签。              |
| `compatibilityFamily` | `"moonshot"` | 用于共享请求辅助程序的可选提供商系列兼容性存储桶。          |
| `openAICompletions`   | `object`     | OpenAI兼容的补全请求标志，目前为 `supportsStreamingUsage`。 |

## secretProviderIntegrations 参考

当插件可以发布可重用的 SecretRef exec 提供商 预设时，请使用 `secretProviderIntegrations`。OpenClaw 会在插件运行时加载之前读取此元数据，将插件所有权存储在 `secrets.providers.<alias>.pluginIntegration` 中，并将实际的 secret 解析留给 SecretRef 运行时。预设仅针对打包的插件以及从受管插件安装根目录（如 git 和 ClawHub 安装）发现的已安装插件公开。

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

映射键是集成 ID。如果省略了 `providerAlias`OpenClaw，OpenClaw 将使用集成 ID 作为 SecretRef 提供商别名。提供商别名必须符合标准的 SecretRef 提供商别名模式，例如 `team-secrets` 或 `onepassword-work`。

当操作员选择预设时，OpenClaw 会写入一个提供商引用，如下所示：

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

在启动/重新加载时，OpenClaw 通过加载当前插件清单元数据、检查所属插件是否已安装并激活，以及从清单中具体化 exec 命令来解析该提供商。禁用或移除插件将吊销活动 SecretRefs 的提供商。希望拥有独立 exec 配置的操作员仍然可以直接编写手动的 OpenClaw`command`/`args` 提供商。

目前仅支持 `source: "exec"` 预设。`command` 必须是 `${node}`，且 `args[0]` 必须是相对于插件根目录的 `./`OpenClaw 解析脚本。OpenClaw 在启动/重新加载时将其具体化为当前 Node 可执行文件和插件内的绝对脚本路径。Node 选项（如 `--require`、`--import`、`--loader`、`--env-file`、`--eval` 和 `--print`）不属于清单预设约定的一部分。需要非 Node 命令的操作员可以直接配置独立的手动 exec 提供商。

OpenClaw 从插件根目录以及对于 `${node}` 预集而言的当前 Node 可执行文件目录，推导清单预设的 OpenClaw`trustedDirs`。清单编写的 `trustedDirs` 将被忽略。其他 exec 提供商选项（如 `timeoutMs`、`maxOutputBytes`、`jsonOnly`、`env`、`passEnv` 和 `allowInsecurePath`）将传递给标准的 SecretRef exec 提供商配置。

## modelPricing 参考

当提供商需要在运行时加载之前控制平面的定价行为时，请使用 `modelPricing`Gateway(网关)。Gateway(网关) 定价缓存会读取此元数据，而无需导入提供商运行时代码。

```json
{
  "providers": ["ollama", "openrouter"],
  "modelPricing": {
    "providers": {
      "ollama": {
        "external": false
      },
      "openrouter": {
        "openRouter": {
          "passthroughProviderModel": true
        },
        "liteLLM": false
      }
    }
  }
}
```

提供商字段：

| 字段         | 类型              | 含义                                                                                  |
| ------------ | ----------------- | ------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | 为绝不应获取 OpenRouter 或 LiteLLM 定价的本地/自托管提供商设置 `false`OpenRouter。    |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。OpenRouter`false`OpenRouter 禁用此提供商的 OpenRouter 查找。 |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 禁用此提供商的 LiteLLM 查找。                           |

源字段：

| 字段                       | 类型               | 含义                                                                                          |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供商 ID 与 OpenClaw 提供商 ID 不同时使用，例如 OpenClaw`z-ai` 用于 `zai` 提供商。 |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的模型 ID 视为嵌套的提供商/模型引用，适用于 OpenRouter 等代理提供商。               |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录模型 ID 变体。`version-dots` 会尝试点分隔的版本 ID，如 `claude-opus-4.6`。      |

### OpenClaw 提供商索引

OpenClaw 提供商索引是 OpenClaw 拥有的预览元数据，用于那些插件可能尚未安装的提供商。它不属于插件清单的一部分。插件清单仍然是已安装插件的权威来源。提供商索引是内部回退契约，当提供商插件未安装时，未来的可安装提供商和预安装模型选择器界面将使用该契约。

目录权威顺序：

1. 用户配置。
2. 已安装的插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw 提供商索引预览行。

提供商索引不得包含机密信息、启用状态、运行时挂钩或实时的特定于账户的模型数据。其预览目录使用与插件清单相同的 `modelCatalog` 提供商行结构，但应仅限于稳定的显示元数据，除非 `api`、`baseUrl`、定价或兼容性标志等运行时适配器字段有意与已安装的插件清单保持一致。具有实时 `/models` 发现功能的提供商应通过显式模型目录缓存路径写入刷新的行，而不是进行常规的列出或新手引导调用提供商 API。

提供商索引条目还可以为插件已移出核心或尚未安装的提供商携带可安装插件元数据。此元数据反映了渠道目录模式：包名称、npm 安装规范、预期的完整性以及廉价的身份验证选择标签足以显示可安装的设置选项。一旦安装了插件，其清单将生效，并且该提供商的提供商索引条目将被忽略。

传统的顶级功能键已弃用。使用 `openclaw doctor --fix` 将 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清单加载不再将这些顶级字段视为功能所有权。

## 清单与 package.

这两个文件服务于不同的用途：

| 文件                   | 用于                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及在插件代码运行之前必须存在的 UI 提示   |
| `package.json`         | npm 元数据、依赖项安装以及用于入口点、安装限制、设置或目录元数据的 `openclaw` 块 |

如果您不确定某条元数据应该放在哪里，请使用以下规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它涉及打包、入口文件或 npm 安装行为，请将其放在 `package.json` 中

### 影响发现过程的 package. 字段

一些运行前的插件元数据有意位于 `package.json` 下的
`openclaw` 块中，而不是 `openclaw.plugin.json` 中。
`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件契约；
原生插件必须使用 `openclaw.plugin.json` 以及下面支持的
`package.json#openclaw` 字段。

重要示例：

| 字段                                                                                       | 含义                                                                                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须保留在插件包目录内。                                                                    |
| `openclaw.runtimeExtensions`                                                               | 声明已安装包的构建 JavaScript 运行时入口点。必须保留在插件包目录内。                                            |
| `openclaw.setupEntry`                                                                      | 仅用于设置的超轻量级入口点，用于新手引导、延迟渠道启动以及只读渠道状态/SecretRef 发现。必须保留在插件包目录内。 |
| `openclaw.runtimeSetupEntry`                                                               | 声明已安装包的构建 JavaScript 设置入口点。需要 `setupEntry`，必须存在，并且必须保留在插件包目录内。             |
| `openclaw.channel`                                                                         | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                                        |
| `openclaw.channel.commands`                                                                | 静态原生命令和原生技能自动默认元数据，在渠道运行时加载之前由配置、审计和命令列表界面使用。                      |
| `openclaw.channel.configuredState`                                                         | 轻量级配置状态检查器元数据，可以在不加载完整渠道运行时的情况下回答“仅环境的设置是否已存在？”。                  |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级持久身份验证检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已登录任何内容？”。                  |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 捆绑包和外部已发布插件的安装/更新提示。                                                                         |
| `openclaw.install.defaultChoice`                                                           | 当存在多个安装源时，首选的安装路径。                                                                            |
| `openclaw.install.minHostVersion`                                                          | 支持的最低 OpenClaw 主机版本，使用像 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 这样的 semver 下限。                  |
| `openclaw.compat.pluginApi`                                                                | 此包所需的最低 OpenClaw 插件 API 版本范围，使用像 `>=2026.5.27` 这样的 semver 下限。                            |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程将根据它验证获取的制品。                         |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 允许在配置无效时进行狭义的捆绑插件重新安装恢复。                                                                |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 让设置时的渠道 在监听 之前加载，然后将完整配置的渠道插件推迟到监听后激活。                                      |

清单元数据决定了在运行时加载之前，新手引导 中会出现哪些提供商/渠道/设置选项。`package.json#openclaw.install` 告诉新手引导 当用户选择其中一个选项时如何获取或启用该插件。不要将安装提示移动到 `openclaw.plugin.json` 中。

对于非捆绑插件源，在安装和清单注册表加载期间会强制执行 `openclaw.install.minHostVersion`。无效的值将被拒绝；较新但有效的值会在旧主机上跳过外部插件。假定源捆绑插件与主机检出版本一致。

对于非打包的插件源，`openclaw.compat.pluginApi` 在包安装期间会被强制执行。将其用于构建包时所依赖的 OpenClaw 插件 SDK/运行时 API 下限。当插件包需要更新的 API 但仍为其他流程保留较低的安装提示时，它可以比 `minHostVersion` 更严格。官方 OpenClaw 发布同步默认会将现有的官方插件 API 下限提升到 OpenClaw 发布版本，但当包有意支持较旧的主机时，仅插件的发布可以保持较低的下限。不要单独将包版本用作兼容性约定。`peerDependencies.openclaw` 仍然是 npm 包元数据；OpenClaw 使用 `openclaw.compat.pluginApi` 约定来决定安装兼容性。

官方按需安装元数据在插件发布到 ClawHub 上时应使用 `clawhubSpec`；新手引导将其视为首选远程源，并在安装后记录 ClawHub 工件事实。`npmSpec` 仍然是尚未迁移到 ClawHub 的包的兼容性回退选项。

精确的 npm 版本锁定已经存在于 npm`npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规范与 `expectedIntegrity`npmnpm 配对，以便当获取的 npm 构件不再匹配锁定的发布版本时，更新流程将完全失败。为了兼容性，交互式新手引导仍然提供可信的注册表 npm 规范，包括裸包名称和 dist-tags。目录诊断可以区分精确、浮动、完整性锁定、缺失完整性、包名称不匹配和无效默认选择源。当存在 `expectedIntegrity`npm 但没有有效的 npm 源可以锁定时，它们也会发出警告。当存在 `expectedIntegrity` 时，安装/更新流程会强制执行它；当省略它时，注册表解析结果将被记录而不带完整性锁定。

当状态、渠道列表或 SecretRef 扫描需要在未加载完整运行时的情况下识别已配置的帐户时，渠道插件应提供 `openclaw.setupEntry`。设置入口应暴露渠道元数据以及设置安全的配置、状态和密钥适配器；将网络客户端、网关侦听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 不能使转义的 `openclaw.extensions` 路径变为可加载。

`openclaw.install.allowInvalidConfigRecovery` 是有意设置得非常狭窄的。它不会使任意损坏的配置变为可安装。目前，它仅允许安装流程从特定的过时捆绑插件升级失败中恢复，例如丢失的捆绑插件路径或同一捆绑插件的过时 `channels.<id>` 条目。不相关的配置错误仍然会阻止安装，并将操作员引导至 `openclaw doctor --fix`。

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

在设置、诊断、状态或只读状态流需要廉价的“是/否”身份验证探针以加载完整的渠道插件之前使用它。持久化身份验证状态不是已配置的渠道状态：请勿使用此元数据自动启用插件、修复运行时依赖项或决定是否应加载渠道运行时。目标导出应该是一个仅读取持久化状态的小函数；请勿将其通过完整的渠道运行时桶进行路由。

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

当渠道可以从环境或其他微小的非运行时输入回答已配置状态时使用它。如果检查需要完整的配置解析或真实的渠道运行时，请将该逻辑保留在插件 `config.hasConfiguredState` 钩子中。

## 设备发现优先级（重复的插件 ID）

OpenClaw 从多个根目录发现插件。有关原始文件系统扫描顺序，请参阅[插件扫描顺序](/zh/gateway/configuration-reference#plugin-scan-order)。如果两个设备发现共享相同的 `id`，则仅保留**最高优先级**的清单；较低优先级的重复项将被丢弃，而不是在其旁边加载。

优先级，从高到低：

1. **配置选定** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **捆绑** — 随 OpenClaw 附带的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录的插件
4. **工作区** — 相对于当前工作区发现的插件

影响：

- 位于工作区中的捆绑插件的分叉或过时副本不会覆盖捆绑构建。
- 要实际使用本地插件覆盖捆绑插件，请通过 `plugins.entries.<id>` 固定它，使其通过优先级获胜，而不是依赖工作区发现。
- 丢弃的重复项会被记录下来，以便诊断和启动诊断程序可以指向被丢弃的副本。
- 配置选定的重复覆盖在诊断中被表述为显式覆盖，但仍会发出警告，以使过时的分叉和意外覆盖保持可见。

## JSON 架构要求

- **每个插件都必须附带一个 JSON 架构**，即使它不接受任何配置。
- 空架构是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 模式在配置读取/写入时验证，而不是在运行时。
- 当使用新配置键扩展或分叉捆绑插件时，请同时更新该插件的 `openclaw.plugin.json` `configSchema`。捆绑插件的模式是严格的，因此在用户配置中添加 `plugins.entries.<id>.config.myNewKey` 而不向 `configSchema.properties` 添加 `myNewKey` 将在插件运行时加载之前被拒绝。

模式扩展示例：

```json
{
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myNewKey": {
        "type": "string"
      }
    }
  }
}
```

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 id 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现的**插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但清单或模式损坏或缺失，
  验证将失败，Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，配置将被保留，
  并且 Doctor + 日志中将显示**警告**。

有关完整的 `plugins.*` 模式，请参阅[配置参考](/zh/gateway/configuration)。

## 备注

- 清单对于原生 OpenClaw 插件是**必需的**，包括本地文件系统加载。运行时仍然会单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍然是对象，就接受注释、尾随逗号和无引号键。
- 清单加载器仅读取记录在案的清单字段。避免自定义顶级键。
- 当插件不需要时，`channels`、`providers`、`cliBackends` 和 `skills` 都可以省略。
- `providerCatalogEntry` 必须保持轻量级，不应导入广泛的运行时代码；将其用于静态提供商目录元数据或狭窄的发现描述符，而不是请求时执行。
- 通过 `plugins.slots.*` 选择互斥的插件种类：通过 `plugins.slots.memory` 选择 `kind: "memory"`，通过 `plugins.slots.contextEngine` 选择 `kind: "context-engine"`（默认为 `legacy`）。
- 在此清单中声明互斥的插件种类。运行时入口 `OpenClawPluginDefinition.kind` 已被弃用，仅作为旧版插件的兼容性回退保留。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅用于声明。状态、审计、cron 交付验证和其他只读界面在将环境变量视为已配置之前，仍会应用插件信任和有效的激活策略。
- 有关需要提供商代码的运行时向导元数据，请参阅 [提供商运行时钩子](/zh/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依赖于原生模块，请记录构建步骤以及任何包管理器允许列表要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关

<CardGroup cols={3}>
  <Card title="构建插件" href="/zh/plugins/building-plugins" icon="rocket">
    插件入门指南。
  </Card>
  <Card title="插件架构" href="/zh/plugins/architecture" icon="diagram-project">
    内部架构和功能模型。
  </Card>
  <Card title="SDK 概述" href="/zh/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
