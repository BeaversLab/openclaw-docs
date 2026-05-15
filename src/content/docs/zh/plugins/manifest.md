---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的 bundle 布局，请参阅 [Plugin bundles](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex bundle：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json` 或不带 manifest 的默认
  Claude 组件布局
- Cursor bundle：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测那些 bundle 布局，但不会根据此处描述的
OpenClaw`openclaw.plugin.json` 架构对它们进行验证。

对于兼容的 bundle，当布局符合 OpenClaw 运行时预期时，OpenClaw 目前会读取
bundle 元数据以及声明的技能根目录、Claude 命令根目录、Claude bundle
OpenClaw`settings.json`OpenClaw 默认值、Claude bundle LSP 默认值和支持的 hook 包。

每个原生 OpenClaw 插件**必须**在**插件根目录**中附带一个
OpenClaw`openclaw.plugin.json`OpenClaw 文件。OpenClaw 使用此 manifest 来验证配置，而**无需
执行插件代码**。缺失或无效的 manifest 将被视为插件错误，并阻止配置验证。

请参阅完整的插件系统指南：[Plugins](/zh/tools/plugin)。
关于原生能力模型和当前的外部兼容性指导：
[Capability 模型](/zh/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json`OpenClaw 是 OpenClaw 在**加载插件代码之前**读取的元数据。
下面的所有内容都必须足够轻量，以便在不启动插件运行时的情况下进行检查。

**用于：**

- 插件标识、配置验证和配置 UI 提示
- 身份验证、新手引导和设置元数据（别名、自动启用、提供商环境变量、身份验证选择）
- 控制平面界面的激活提示
- 简写模型家族所有权
- 静态 capability-ownership 快照 (`contracts`)
- 共享 `openclaw qa` 主机可以检查的 QA 运行器元数据
- 合并到目录和验证界面的渠道特定配置元数据

**请勿将其用于：** 注册运行时行为、声明代码入口点或 npm install
元数据。这些内容应属于您的插件代码和 npm`package.json`。

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

| 字段                                 | 必填 | 类型                             | 含义                                                                                                                                                                    |
| ------------------------------------ | ---- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 规范插件 id。这是在 `plugins.entries.<id>` 中使用的 id。                                                                                                                |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                                                          |
| `enabledByDefault`                   | 否   | `true`                           | 将捆绑的插件标记为默认启用。省略它，或设置为任何非 `true` 值，以使插件默认处于禁用状态。                                                                                |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 将捆绑的插件标记为仅在列出的 Node.js 平台上默认启用，例如 `["darwin"]`。显式配置优先。                                                                                  |
| `legacyPluginIds`                    | 否   | `string[]`                       | 规范化为此规范插件 ID 的旧 ID。                                                                                                                                         |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当身份验证、配置或模型引用提及这些提供商 ID 时，应自动启用此插件的提供商 ID。                                                                                           |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件种类。                                                                                                                           |
| `channels`                           | 否   | `string[]`                       | 由此插件拥有的频道 ID。用于发现和配置验证。                                                                                                                             |
| `providers`                          | 否   | `string[]`                       | 由此插件拥有的提供商 ID。                                                                                                                                               |
| `providerCatalogEntry`               | 否   | `string`                         | 轻量级提供商目录模块路径，相对于插件根目录，用于可在不激活完整插件运行时的情况下加载的清单范围提供商目录元数据。                                                        |
| `modelSupport`                       | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                                                                            |
| `modelCatalog`                       | 否   | `object`                         | 由此插件拥有的提供商的声明性模型目录元数据。这是用于未来只读列表、新手引导、模型选择器、别名和抑制（无需加载插件运行时）的控制平面契约。                                |
| `modelPricing`                       | 否   | `object`                         | 提供商拥有的外部价格查找策略。使用它可以让本地/自托管提供商退出远程价格目录，或者在核心中将提供商引用映射到 OpenRouter/LiteLLM 目录 ID，而无需在核心中硬编码提供商 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供商拥有的模型 ID 别名/前缀清理，必须在提供商运行时加载之前运行。                                                                                                     |
| `providerEndpoints`                  | 否   | `object[]`                       | 清单拥有的提供商路由的端点主机/baseUrl 元数据，核心必须在提供商运行时加载之前对其进行分类。                                                                             |
| `providerRequest`                    | 否   | `object`                         | 通用请求策略在提供商运行时加载之前使用的廉价提供商系列和请求兼容性元数据。                                                                                              |
| `cliBackends`                        | 否   | `string[]`                       | 此插件拥有的 CLI 推理后端 ID。用于从显式配置引用进行启动时自动激活。                                                                                                    |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供商或 CLI 后端引用，其插件拥有的综合身份验证挂钩应在运行时加载之前的冷模型发现期间进行探测。                                                                         |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆绑插件拥有的占位符 API 密钥值，表示非机密的本地、OAuth 或环境凭据状态。                                                                                               |
| `commandAliases`                     | 否   | `object[]`                       | 此插件拥有的命令名称，应在运行时加载之前生成支持插件的配置和 CLI 诊断信息。                                                                                             |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于提供商身份验证/状态查找的已弃用兼容性环境元数据。对于新插件，首选使用 `setup.providers[].envVars`OpenClaw；在弃用期内，OpenClaw 仍会读取此项。                      |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 应重用另一个提供商 ID 进行身份验证查找的提供商 ID，例如共享基础提供商 API 密钥和身份验证配置文件的编码提供商。                                                          |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价渠道环境元数据。将其用于通用启动/配置辅助工具应该看到的基于环境的渠道设置或身份验证界面。                                |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连线的廉价身份验证选择元数据。                                                                                         |
| `activation`                         | 否   | `object`                         | 用于启动、提供商、命令、渠道、路由和功能触发的加载的廉价激活计划程序元数据。仅包含元数据；插件运行时仍拥有实际行为。                                                    |
| `setup`                              | 否   | `object`                         | 发现和设置界面可以在不加载插件运行时的情况下检查的廉价设置/新手引导描述符。                                                                                             |
| `qaRunners`                          | 否   | `object[]`                       | 由共享 `openclaw qa` 主机在插件运行时加载之前使用的廉价 QA 运行器描述符。                                                                                               |
| `contracts`                          | 否   | `object`                         | 用于外部身份验证挂钩、语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、Web 获取、Web 搜索和工具所有权的静态功能所有权快照。                            |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中声明的提供商 ID 的廉价媒体理解默认值。                                                                                     |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.imageGenerationProviders` 中声明的提供商 ID 的廉价图像生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 守护。                                   |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.videoGenerationProviders` 中声明的提供商 ID 的廉价视频生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 守护。                                   |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.musicGenerationProviders` 中声明的提供商 ID 的廉价音乐生成身份验证元数据，包括提供商拥有的身份验证别名和基础 URL 守护。                                   |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 在 `contracts.tools` 中声明的插件拥有的工具的廉价可用性元数据。当工具除非存在配置、环境或身份验证证据，否则不应加载运行时时使用它。                                     |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在运行时加载之前，合并到发现和验证层的清单拥有的渠道配置元数据。                                                                                                        |
| `skills`                             | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                                                    |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                                    |
| `description`                        | 否   | `string`                         | 在插件界面显示的简短摘要。                                                                                                                                              |
| `version`                            | 否   | `string`                         | 信息性插件版本。                                                                                                                                                        |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                                                                |

## 生成提供商元数据参考

生成提供商元数据字段描述了在匹配的 `contracts.*GenerationProviders`OpenClaw 列表中声明的提供商的静态身份验证信号。
OpenClaw 在提供商运行时加载之前读取这些字段，以便核心工具可以
确定生成提供商是否可用，而无需导入每个
提供商插件。

这些字段仅用于廉价、声明性的事实。传输、请求转换、
令牌刷新、凭据验证和实际生成行为保留在
插件运行时中。

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

| 字段            | 必填 | 类型       | 含义                                                                                                 |
| --------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `aliases`       | 否   | `string[]` | 应计为此生成提供商的静态身份验证别名的其他提供商 ID。                                                |
| `authProviders` | 否   | `string[]` | 其配置的身份验证配置文件应计为此生成提供商的身份验证的提供商 ID。                                    |
| `configSignals` | 否   | `object[]` | 适用于可以在没有身份验证配置文件或环境变量的情况下配置的本地或自托管提供商的廉价仅配置可用性信号。   |
| `authSignals`   | 否   | `object[]` | 显式身份验证信号。如果存在，这些信号将替换来自提供商 ID、`aliases` 和 `authProviders` 的默认信号集。 |

每个 `configSignals` 条目支持：

| 字段          | 必需 | 类型       | 含义                                                                                                                     |
| ------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `rootPath`    | 是   | `string`   | 指向要检查的插件拥有的配置对象的点路径，例如 `plugins.entries.example.config`。                                          |
| `overlayPath` | 否   | `string`   | 根配置内部的点路径，该路径的对象应在评估信号之前覆盖根对象。将此用于特定于功能的配置，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效配置内部的点路径，这些路径必须具有配置的值。字符串必须非空；对象和数组不得为空。                                     |
| `requiredAny` | 否   | `string[]` | 有效配置内部的点路径，其中至少一个必须具有配置的值。                                                                     |
| `mode`        | 否   | `object`   | 有效配置内部的可选字符串模式守卫。当仅配置可用性适用于一种模式时，请使用此选项。                                         |

每个 `mode` 守卫支持：

| 字段         | 必需 | 类型       | 含义                                                 |
| ------------ | ---- | ---------- | ---------------------------------------------------- |
| `path`       | 否   | `string`   | 有效配置内部的点路径。默认为 `mode`。                |
| `default`    | 否   | `string`   | 当配置省略该路径时使用的模式值。                     |
| `allowed`    | 否   | `string[]` | 如果存在，则仅当有效模式是这些值之一时，信号才通过。 |
| `disallowed` | 否   | `string[]` | 如果存在，则当有效模式是这些值之一时，信号将失败。   |

每个 `authSignals` 条目支持：

| 字段              | 必需 | 类型     | 含义                                                                                                                         |
| ----------------- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在已配置的身份验证配置文件中检查的提供商 ID。                                                                              |
| `providerBaseUrl` | 否   | `object` | 可选的保护机制，仅当引用的已配置提供商使用允许的基 URL 时，该信号才会计数。当身份验证别名仅对某些 API 有效时，请使用此选项。 |

每个 `providerBaseUrl` 保护机制支持：

| 字段              | 必填 | 类型       | 含义                                                                                                      |
| ----------------- | ---- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 应检查其 `baseUrl` 的提供商配置 ID。                                                                      |
| `defaultBaseUrl`  | 否   | `string`   | 当提供商配置省略 `baseUrl` 时假定的基 URL。                                                               |
| `allowedBaseUrls` | 是   | `string[]` | 此身份验证信号允许的基 URL。当已配置或默认的基 URL 与这些标准化值中的任何一个都不匹配时，该信号将被忽略。 |

## 工具元数据参考

`toolMetadata` 使用与生成提供商元数据相同的 `configSignals` 和 `authSignals` 形状，并以工具名称为键。`contracts.tools` 声明所有权。`toolMetadata`OpenClaw 声明廉价的可用性证据，以便 OpenClaw 可以避免导入插件运行时仅为了让其工具工厂返回 `null`。

```json
{
  "providerAuthEnvVars": {
    "example": ["EXAMPLE_API_KEY"]
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

如果工具没有 `toolMetadata`OpenClaw，OpenClaw 将保留现有行为，并在工具合约匹配策略时加载所属插件。对于其工厂依赖于身份验证/配置的热路径工具，插件作者应声明 `toolMetadata`，而不是让核心导入运行时来询问。

## providerAuthChoices 参考

每个 `providerAuthChoices`OpenClaw 条目描述一个新手引导或身份验证选择。OpenClaw 在提供商运行时加载之前读取此内容。提供商设置列表使用这些清单选择、派生自描述符的设置选择和安装目录元数据，而无需加载提供商运行时。

| 字段                  | 必填 | 类型                                            | 含义                                                                        |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选择所属的提供商 ID。                                                     |
| `method`              | 是   | `string`                                        | 要分发到的身份验证方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定身份验证选项 ID。                            |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                    |
| `choiceHint`          | 否   | `string`                                        | 选择器的简短辅助文本。                                                      |
| `assistantPriority`   | 否   | `number`                                        | 在助手驱动的交互式选择器中，值较小的项排序靠前。                            |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助手选择器中隐藏此选项，但仍允许通过手动 CLI 进行选择。                   |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧选项 ID。                                     |
| `groupId`             | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                         |
| `groupLabel`          | 否   | `string`                                        | 该组的面向用户标签。                                                        |
| `groupHint`           | 否   | `string`                                        | 该组的简短辅助文本。                                                        |
| `optionKey`           | 否   | `string`                                        | 用于简单单标志身份验证流程的内部选项键。                                    |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                                 |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 选项形态，例如 `--openrouter-api-key <key>`。                    |
| `cliDescription`      | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                       |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 该选项应出现在哪些新手引导界面中。如果省略，则默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有一个运行时命令名称，而用户可能会错误地将其放入 `plugins.allow` 或尝试作为根 CLI 命令运行时，请使用 `commandAliases`。OpenClaw 使用此元数据进行诊断，而无需导入插件运行时代码。

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

## activation 参考

当插件可以轻松声明哪些控制平面事件应将其包含在激活/加载计划中时，请使用 `activation`。

此块是规划器元数据，而不是生命周期 API。它不注册运行时行为，不替换 `register(...)`，也不保证插件代码已经执行。激活规划器使用这些字段在回退到现有的清单所有权元数据（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子）之前缩小候选插件范围。

优先使用已经描述所有权的最窄元数据。当这些字段表达关系时，请使用 `providers`、`channels`、`commandAliases`、设置描述符或 `contracts`。对于无法由这些所有权字段表示的额外规划器提示，请使用 `activation`。对于 CLI 运行时别名（如 `claude-cli`、`codex-cli` 或 `google-gemini-cli`），请使用顶层 `cliBackends`；`activation.onAgentHarnesses` 仅用于尚未具有所有权字段的嵌入式代理器（agent harness） ID。

此块仅包含元数据。它不注册运行时行为，也不替换 `register(...)`、`setupEntry` 或其他运行时/插件入口点。当前的消费者将其在更广泛的插件加载之前作为缩小范围的提示，因此缺少非启动激活元数据通常只会影响性能；只要清单所有权回退机制仍然存在，它就不应该影响正确性。

每个插件都应该有意设置 `activation.onStartup`。仅当插件必须在 Gateway(网关) 启动期间运行时，才将其设置为 `true`。当插件在启动时处于非活动状态且应仅从更具体的触发器加载时，将其设置为 `false`。省略 `onStartup` 不再隐式地在启动时加载插件；请针对启动、渠道、配置、agent-harness、内存或其他更具体的激活触发器使用显式的激活元数据。

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

| 字段               | 必需 | 类型                                                 | 含义                                                                                                                                                   |
| ------------------ | ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | 否   | `boolean`                                            | 显式的 Gateway(网关) 启动激活。每个插件都应设置此项。`true` 会在启动期间导入插件；`false` 使其在启动时保持延迟加载，除非另一个匹配的触发器需要加载它。 |
| `onProviders`      | 否   | `string[]`                                           | 应将此插件包含在激活/加载计划中的提供程序 ID。                                                                                                         |
| `onAgentHarnesses` | 否   | `string[]`                                           | 应将此插件包含在激活/加载计划中的嵌入式 agent harness 运行时 ID。对于 CLI 后端别名，请使用顶层的 `cliBackends`。                                       |
| `onCommands`       | 否   | `string[]`                                           | 应将此插件包含在激活/加载计划中的命令 ID。                                                                                                             |
| `onChannels`       | 否   | `string[]`                                           | 应将此插件包含在激活/加载计划中的渠道 ID。                                                                                                             |
| `onRoutes`         | 否   | `string[]`                                           | 应将此插件包含在激活/加载计划中的路由种类。                                                                                                            |
| `onConfigPaths`    | 否   | `string[]`                                           | 相对于根目录的配置路径，当路径存在且未被明确禁用时，应在启动/加载计划中包含此插件。                                                                    |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面激活规划使用的广泛能力提示。如果可能，首选更具体的字段。                                                                                       |

当前活跃的使用者：

- Gateway(网关) 启动规划使用 Gateway(网关)`activation.onStartup` 进行显式启动
  导入
- 命令触发的 CLI 规划回退到遗留的
  CLI`commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent-runtime 启动规划对嵌入式
  工具使用 `activation.onAgentHarnesses`，对 CLI 运行时别名使用顶级 `cliBackends[]`CLI
- 渠道触发的设置/渠道规划在缺少显式渠道激活元数据时
  回退到遗留的 `channels[]` 所有权
- 启动插件规划对非渠道根配置
  表面（例如捆绑浏览器插件的 `browser` 块）使用 `activation.onConfigPaths`
- 提供商触发的设置/运行时规划在缺少显式提供商
  激活元数据时回退到遗留的
  `providers[]` 和顶级 `cliBackends[]` 所有权

规划器诊断可以区分显式激活提示和清单所有权
回退。例如，`activation-command-hint` 表示
`activation.onCommands` 匹配，而 `manifest-command-alias` 表示
规划器改用了 `commandAliases` 所有权。这些原因标签供
主机诊断和测试使用；插件作者应继续声明最能描述
所有权的元数据。

## qaRunners 参考

当插件在共享 `openclaw qa`CLI 根目录下贡献一个或多个传输运行器时，请使用 `qaRunners`。保持此元数据廉价且静态；插件运行时仍通过导出 `qaRunnerCliRegistrations` 的轻量级 `runtime-api.ts` 表面拥有实际的 CLI 注册。

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
| `description` | 否   | `string` | 当共享主机需要存根命令时使用的备用帮助文本。     |

## setup 参考

当设置和新手引导界面需要在运行时加载之前获取廉价的插件自有元数据时，请使用 `setup`。

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

顶级 `cliBackends` 保持有效，并继续描述 CLI 推理后端。`setup.cliBackends` 是控制平面/设置流程的特定于设置的描述符界面，应保持仅为元数据。

如果存在，`setup.providers` 和 `setup.cliBackends` 是设置发现的首选描述符优先查找界面。如果描述符仅缩小了候选插件范围，而设置仍需要更丰富的设置时运行时钩子，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为备用执行路径。

OpenClaw 还在通用提供商身份验证和环境变量查找中包含 `setup.providers[].envVars`。在弃用期间，通过兼容适配器仍支持 `providerAuthEnvVars`，但仍使用它的非捆绑插件将收到清单诊断。新插件应将设置/状态环境元数据放在 `setup.providers[].envVars` 上。

当没有可用的设置条目，或者 `setup.requiresRuntime: false` 声明设置运行时不需要时，OpenClaw 也可以从 `setup.providers[].authMethods` 派生简单的设置选择。对于自定义标签、CLI 标志、新手引导范围和助手元数据，显式的 `providerAuthChoices` 条目仍然是首选。

仅当这些描述符足以用于设置界面时，才设置 `requiresRuntime: false`OpenClaw。OpenClaw 将显式的 `false` 视为仅描述符契约，并且不会执行 `setup-api` 或 `openclaw.setupEntry`OpenClaw 进行设置查找。如果一个仅描述符插件仍然附带这些设置运行时条目之一，OpenClaw 将报告附加诊断并继续忽略它。省略 `requiresRuntime` 会保留传统回退行为，以便那些在没有该标志的情况下添加了描述符的现有插件不会中断。

由于设置查找可以执行插件拥有的 `setup-api` 代码，因此规范化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必须在所有已发现的插件中保持唯一。所有权模糊将导致失败关闭，而不是按发现顺序选择一个优胜者。

当设置运行时确实执行时，如果 `setup-api`CLI 注册了清单描述符未声明的提供商或 CLI 后端，或者如果描述符没有匹配的运行时注册，则设置注册表诊断将报告描述符偏差。这些诊断是附加的，不会拒绝传统插件。

### setup.providers 参考

| 字段           | 必需 | 类型       | 含义                                                                     |
| -------------- | ---- | ---------- | ------------------------------------------------------------------------ |
| `id`           | 是   | `string`   | 在设置或新手引导期间公开的提供商 ID。保持规范化的 ID 全局唯一。          |
| `authMethods`  | 否   | `string[]` | 此提供商在无需加载完整运行时的情况下支持的设置/身份验证方法 ID。         |
| `envVars`      | 否   | `string[]` | 通用设置/状态界面可以在插件运行时加载之前检查的环境变量。                |
| `authEvidence` | 否   | `object[]` | 适用于可以通过非机密标记进行身份验证的提供商的廉价本地身份验证证据检查。 |

`authEvidence`API 用于属于提供商的本地凭据标记，这些标记可以在不加载运行时代码的情况下进行验证。这些检查必须保持低成本和本地化：不进行网络调用，不读取密钥链或机密管理器，不执行 Shell 命令，也不进行提供商 API 探测。

支持的证据条目：

| 字段               | 必需 | 类型       | 含义                                                                                 |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------ |
| `type`             | 是   | `string`   | 当前 `local-file-with-env`。                                                         |
| `fileEnvVar`       | 否   | `string`   | 包含显式凭据文件路径的环境变量。                                                     |
| `fallbackPaths`    | 否   | `string[]` | 当 `fileEnvVar` 缺失或为空时检查的本地凭据文件路径。支持 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在证据有效之前，列出的环境变量中必须至少有一个非空。                                 |
| `requiresAllEnv`   | 否   | `string[]` | 在证据有效之前，列出的所有环境变量必须非空。                                         |
| `credentialMarker` | 是   | `string`   | 当证据存在时返回的非机密标记。                                                       |
| `source`           | 否   | `string`   | 用于身份验证/状态输出的面向用户的源标签。                                            |

### setup 字段

| 字段               | 必需 | 类型       | 含义                                                                |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在设置和新手引导期间公开的提供商设置描述符。                        |
| `cliBackends`      | 否   | `string[]` | 用于基于描述符的设置查找的设置时后端 ID。请保持标准化 ID 全局唯一。 |
| `configMigrations` | 否   | `string[]` | 由此插件的设置界面拥有的配置迁移 ID。                               |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之后，设置是否仍需要执行 `setup-api`。                  |

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
    "agentToolResultMiddleware": ["pi", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "migrationProviders": ["hermes"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每个列表都是可选的：

| 字段                             | 类型       | 含义                                                     |
| -------------------------------- | ---------- | -------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex 应用服务器扩展工厂 ID，目前为 `codex-app-server`。 |
| `agentToolResultMiddleware`      | `string[]` | 打包插件可能为其注册工具结果中间件的运行时 ID。          |
| `externalAuthProviders`          | `string[]` | 此插件拥有的外部身份验证配置文件挂钩的提供商 ID。        |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 ID。                              |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转录提供商 ID。                          |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 ID。                          |
| `memoryEmbeddingProviders`       | `string[]` | 此插件拥有的记忆嵌入提供商 ID。                          |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 ID。                          |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 ID。                          |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 ID。                          |
| `webFetchProviders`              | `string[]` | 此插件拥有的 Web 获取提供商 ID。                         |
| `webSearchProviders`             | `string[]` | 此插件拥有的网络搜索提供商 ID。                          |
| `migrationProviders`             | `string[]` | 此插件拥有的用于 `openclaw migrate` 的导入提供商 ID。    |
| `tools`                          | `string[]` | 此插件拥有的代理工具名称。                               |

`contracts.embeddedExtensionFactories` 予以保留，仅用于捆绑的 Codex
仅应用服务器扩展工厂。捆绑的工具结果转换应
改为声明 `contracts.agentToolResultMiddleware` 并注册到
`api.registerAgentToolResultMiddleware(...)`。外部插件无法
注册工具结果中间件，因为接缝可以在模型看到之前重写高信任工具
输出。

运行时 `api.registerTool(...)` 注册必须匹配 `contracts.tools`。
工具发现使用此列表仅加载可以拥有所请求
工具的插件运行时。

实现 `resolveExternalAuthProfiles` 的提供商插件应声明
`contracts.externalAuthProviders`。没有该声明的插件仍会
通过已弃用的兼容性回退运行，但该回退速度较慢，并
将在迁移窗口结束后被移除。

捆绑的记忆嵌入提供商应
为其公开的每个适配器 ID 声明
`contracts.memoryEmbeddingProviders`，包括
内置适配器如 `local`。独立 CLI 路径使用此清单
合约在完整的 Gateway(网关) 运行时
注册提供商之前仅加载拥有者插件。

## mediaUnderstandingProviderMetadata 参考

当媒体理解提供商具有
默认模型、自动身份验证回退优先级或通用核心助手在运行时加载之前需要的
原生文档支持时，请使用 `mediaUnderstandingProviderMetadata`。键也必须在
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
| `defaultModels`        | `Record<string, string>`            | 当配置未指定模型时使用的功能到模型默认值。         |
| `autoPriority`         | `Record<string, number>`            | 数字越小，在基于凭据的提供商自动回退中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支持的原生文档输入。                         |

## channelConfigs 参考

当渠道插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。当没有可用的设置条目，或者当 `setup.requiresRuntime: false` 声明设置运行时非必要时，只读渠道设置/状态发现可以直接使用此元数据来配置外部渠道。

`channelConfigs` 是插件清单元数据，而不是一个新的顶级用户配置部分。用户仍然在 `channels.<channel-id>` 下配置渠道实例。OpenClaw 在插件运行时代码执行之前读取清单元数据，以确定哪个插件拥有该配置的渠道。

对于渠道插件，`configSchema` 和 `channelConfigs` 描述了不同的路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明 `channels[]` 的非捆绑插件还应声明匹配的 `channelConfigs` 条目。如果没有这些条目，OpenClaw 仍然可以加载插件，但在插件运行时执行之前，冷路径配置架构、设置和控制 UI 界面无法知道渠道拥有的选项形状。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可以声明静态 `auto` 默认值，用于在渠道运行时加载之前运行的命令配置检查。捆绑渠道也可以通过 `package.json#openclaw.channel.commands` 发布相同的默认值，与其他的包拥有的渠道目录元数据并列。

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
| `schema`      | `object`                 | 用于 `channels.<id>` 的 JSON 架构。对于每个声明的渠道配置条目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。                            |
| `label`       | `string`                 | 当运行时元数据未就绪时，合并到选择器和检查界面的渠道标签。                |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                                        |
| `commands`    | `object`                 | 用于运行前配置检查的静态原生命令和原生技能自动默认值。                    |
| `preferOver`  | `string[]`               | 在选择界面中，此渠道应优先于的旧版或较低优先级插件 ID。                   |

### 替换另一个渠道插件

当您的插件是另一个插件也可以提供的渠道 ID 的首选所有者时，请使用 `preferOver`。常见情况包括重命名的插件 ID、取代捆绑插件的独立插件，或者为了配置兼容性而保持相同渠道 ID 的维护分支。

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

当配置了 `channels.chat` 时，OpenClaw 会同时考虑渠道 ID 和首选插件 ID。如果较低优先级的插件仅因为它是捆绑的或默认启用的而被选中，OpenClaw 会在有效的运行时配置中禁用它，以便一个插件拥有该渠道及其工具。显式的用户选择仍然优先：如果用户明确启用了这两个插件，OpenClaw 将保留该选择，并报告重复的渠道/工具诊断信息，而不是静默更改请求的插件集。

将 `preferOver` 的范围限制在真正可以提供同一渠道的插件 ID。它不是一个通用的优先级字段，也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 应该在插件运行时加载之前，从像 `gpt-5.5` 或 `claude-sonnet-4.6` 这样的简写模型 ID 推断您的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用以下优先级：

- 显式的 `provider/model` 引用使用拥有它的 `providers` 清单元数据
- `modelPatterns` 优于 `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包插件
  优先
- 剩余的歧义将被忽略，直到用户或配置指定了提供商

字段：

| 字段            | 类型       | 含义                                               |
| --------------- | ---------- | -------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 匹配简写模型 ID 的前缀。         |
| `modelPatterns` | `string[]` | 移除配置文件后缀后，用于匹配简写模型 ID 的正则源。 |

## modelCatalog 参考

当 OpenClaw 需要在加载插件运行时之前了解提供商模型元数据时，请使用 `modelCatalog`。这是清单所拥有的固定目录
行、提供商别名、抑制规则和发现模式的来源。运行时刷新
仍属于提供商运行时代码，但清单会告知核心何时需要运行时。

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

| 字段           | 类型                                                     | 含义                                                                  |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 属于此插件拥有的提供商 ID 的目录行。键也应出现在顶级 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 应解析为目录或抑制规划所拥有的提供商的提供商别名。                    |
| `suppressions` | `object[]`                                               | 来自其他源的模型行，该插件出于特定于提供商的原因将其抑制。            |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供商目录是否可以从清单元数据中读取、刷新到缓存中，或者需要运行时。  |

`aliases` 参与模型目录规划的提供商所有权查找。
别名目标必须是同一插件拥有的顶级提供商。当
提供商过滤列表使用别名时，OpenClaw 可以读取拥有清单并
应用别名 API/基础 URL 覆盖，而无需加载提供商运行时。
别名不会扩展未过滤的目录列表；广泛的列表仅发出拥有的
规范提供商行。

`suppressions` 取代了旧的提供商运行时 `suppressBuiltInModel` 钩子。
仅当提供商归插件所有或被声明为指向归插件所有的提供商的 `modelCatalog.aliases` 键时，才会遵守抑制条目。在模型解析期间，不再调用运行时抑制钩子。

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
| `id`            | `string`                                                       | 提供商本地模型 ID，不带 `provider/` 前缀。                |
| `name`          | `string`                                                       | 可选显示名称。                                            |
| `api`           | `ModelApi`                                                     | 可选的针对每个模型的 API 覆盖。                           |
| `baseUrl`       | `string`                                                       | 可选的针对每个模型的基础 URL 覆盖。                       |
| `headers`       | `Record<string, string>`                                       | 可选的针对每个模型的静态标头。                            |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模态。                                          |
| `reasoning`     | `boolean`                                                      | 模型是否展示推理行为。                                    |
| `contextWindow` | `number`                                                       | 原生提供商上下文窗口。                                    |
| `contextTokens` | `number`                                                       | 当与 `contextWindow` 不同时，可选的有效运行时上下文上限。 |
| `maxTokens`     | `number`                                                       | 已知时的最大输出 token 数。                               |
| `cost`          | `object`                                                       | 可选的每百万令牌美元价格，包括可选的 `tieredPricing`。    |
| `compat`        | `object`                                                       | 匹配 OpenClaw 模型配置兼容性的可选兼容性标志。            |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅当该行绝不可出现时才进行抑制。                |
| `statusReason`  | `string`                                                       | 与不可用状态一起显示的可选原因。                          |
| `replaces`      | `string[]`                                                     | 此模型取代的较旧的提供商本地模型 ID。                     |
| `replacedBy`    | `string`                                                       | 用于已弃用行的替换提供商本地模型 ID。                     |
| `tags`          | `string[]`                                                     | 选择器和筛选器使用的稳定标签。                            |

抑制字段：

| 字段                       | 类型       | 含义                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `provider`                 | `string`   | 要抑制的上游行的提供商 ID。必须由此插件拥有或声明为拥有的别名。 |
| `model`                    | `string`   | 要抑制的提供商本地模型 ID。                                     |
| `reason`                   | `string`   | 当直接请求被抑制的行时显示的可选消息。                          |
| `when.baseUrlHosts`        | `string[]` | 应用抑制之前所需的有效的提供商基础 URL 主机可选列表。           |
| `when.providerConfigApiIn` | `string[]` | 应用抑制之前所需的确切提供商配置 `api` 值的可选列表。           |

不要在 `modelCatalog` 中放置仅运行时的数据。仅当清单行足够完整，使得提供商过滤的列表和选择器表面可以跳过注册表/运行时发现时，才使用 `static`。当清单行是有用的可列出种子或补充，但刷新/缓存稍后可以添加更多行时，使用 `refreshable`；可刷新的行本身不具备权威性。当 OpenClaw 必须加载提供商运行时才能知道列表时，请使用 `runtime`。

## modelIdNormalization 参考

使用 `modelIdNormalization` 进行廉价的提供商拥有的模型 ID 清理，该清理必须在提供商运行时加载之前发生。这将简短模型名称、提供商本地遗留 ID 和代理前缀规则等别名保留在所属插件清单中，而不是核心模型选择表中。

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
| `aliases`                            | `Record<string,string>` | 不区分大小写的精确模型 ID 别名。值按写入原样返回。                      |
| `stripPrefixes`                      | `string[]`              | 在别名查找之前要移除的前缀，适用于遗留提供商/模型重复。                 |
| `prefixWhenBare`                     | `string`                | 当标准化模型 ID 尚未包含 `/` 时要添加的前缀。                           |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找之后的有条件裸 ID 前缀规则，按 `modelPrefix` 和 `prefix` 键控。 |

## providerEndpoints 参考

使用 `providerEndpoints` 进行通用请求策略必须在提供商运行时加载之前知道的端点分类。核心仍然拥有每个 `endpointClass` 的含义；插件清单拥有主机和基础 URL 元数据。

端点字段：

| 字段                           | 类型       | 含义                                                                        |
| ------------------------------ | ---------- | --------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 映射到端点类的精确主机名。                                                  |
| `hostSuffixes`                 | `string[]` | 映射到端点类的主机后缀。对于仅匹配域后缀的情况，请加上 `.` 前缀。           |
| `baseUrls`                     | `string[]` | 映射到端点类的精确规范化 HTTP(S) 基础 URL。                                 |
| `googleVertexRegion`           | `string`   | 用于精确全局主机的静态 Google Vertex 区域。                                 |
| `googleVertexRegionHostSuffix` | `string`   | 要从匹配的主机中剥离的后缀，以显示 Google Vertex 区域前缀。                 |

## providerRequest 参考

使用 `providerRequest` 来提供廉价的请求兼容性元数据，这些是通用请求策略所需要的，无需加载提供商运行时。将特定行为的有效负载重写保留在提供商运行时钩子或共享提供商系列辅助程序中。

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

Provider 字段：

| 字段                  | 类型         | 含义                                                         |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `family`              | `string`     | 用于通用请求兼容性决策和诊断的提供商系列标签。               |
| `compatibilityFamily` | `"moonshot"` | 用于共享请求辅助程序的可选提供商系列兼容性存储桶。           |
| `openAICompletions`   | `object`     | OpenAI 兼容的补全请求标志，目前为 `supportsStreamingUsage`。 |

## modelPricing 参考

当提供商需要在运行时加载之前通过控制平面进行定价行为时，请使用 `modelPricing`。Gateway(网关) 定价缓存无需导入提供商运行时代码即可读取此元数据。

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

Provider 字段：

| 字段         | 类型              | 含义                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 对于绝不应获取 OpenRouter 或 LiteLLM 定价的本地/自托管提供商，请设置 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。`false` 会禁用此提供商的 OpenRouter 查找。            |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 会禁用此提供商的 LiteLLM 查找。                  |

源字段：

| 字段                       | 类型               | 含义                                                                                                        |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供商 ID 与 OpenClaw 提供商 ID 不同时的外部目录提供商 ID，例如对于 `zai` 提供商，其值为 `z-ai`。 |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的模型 ID 视为嵌套的提供商/模型引用，这对于像 OpenRouter 这样的代理提供商非常有用。               |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录模型 ID 变体。`version-dots` 会尝试像 `claude-opus-4.6` 这样的带点版本 ID。                   |

### OpenClaw 提供商索引

OpenClaw 提供商索引是 OpenClaw 拥有的预览元数据，用于那些可能尚未安装插件的服务商。它不是插件清单的一部分。插件清单仍然是已安装插件的权威来源。提供商索引是内部回退契约，当未安装提供商插件时，未来的可安装提供商和预安装模型选择器界面将使用此索引。

目录权威顺序：

1. 用户配置。
2. 已安装的插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw 提供商索引预览行。

提供商索引不得包含机密信息、启用状态、运行时钩子或实时帐户特定的模型数据。其预览目录使用与插件清单相同的 `modelCatalog` 提供商行形状，但除非运行时适配器字段（如 `api`、`baseUrl`、定价或兼容性标志）有意与已安装的插件清单保持一致，否则应仅限于稳定的显示元数据。具有实时 `/models` 发现功能的提供商应通过显式模型目录缓存路径写入刷新的行，而不是进行正常的列表或新手引导调用提供商 API。

Provider Index 条目可能还会包含可安装插件的元数据，针对那些插件已移出核心或尚未安装的提供商。此元数据反映了渠道目录模式：包名称、npm 安装规范、预期的完整性以及简易的身份验证选择标签，足以显示可安装的设置选项。一旦插件安装完成，其清单即生效，并且该提供商的 Provider Index 条目将被忽略。

传统的顶层功能键已弃用。请使用 `openclaw doctor --fix` 将 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清单加载不再将这些顶层字段视为功能所有权。

## 清单与 package. 的对比

这两个文件用途不同：

| 文件                   | 用途                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据，以及插件代码运行前必须存在的 UI 提示           |
| `package.json`         | npm 元数据、依赖项安装，以及用于入口点、安装控制、设置或目录元数据的 `openclaw` 代码块 |

如果您不确定某条元数据应该放在哪里，请使用此规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它与打包、入口文件或 npm 安装行为有关，请将其放在 `package.json` 中

### 影响设备发现的 package. 字段

一些运行前的插件元数据有意存放在 `package.json` 下的 `openclaw` 代码块中，而不是 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 插件契约；原生插件必须使用 `openclaw.plugin.json` 加上以下支持的 `package.json#openclaw` 字段。

重要示例：

| 字段                                                                                       | 含义                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 声明原生插件入口点。必须保留在插件包目录内。                                                            |
| `openclaw.runtimeExtensions`                                                               | 声明已安装包的内置 JavaScript 运行时入口点。必须保留在插件包目录内。                                    |
| `openclaw.setupEntry`                                                                      | 轻量级仅设置入口点，用于新手引导、延迟渠道启动以及只读渠道状态/SecretRef 发现。必须保留在插件包目录内。 |
| `openclaw.runtimeSetupEntry`                                                               | 声明已安装包的内置 JavaScript 设置入口点。需要 `setupEntry`，必须存在，并且必须保留在插件包目录内。     |
| `openclaw.channel`                                                                         | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                                |
| `openclaw.channel.commands`                                                                | 静态原生命令和原生技能自动默认元数据，在渠道运行时加载之前由配置、审计和命令列表界面使用。              |
| `openclaw.channel.configuredState`                                                         | 轻量级配置状态检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已存在仅环境设置？”。            |
| `openclaw.channel.persistedAuthState`                                                      | 轻量级持久身份验证检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已有任何登录项？”。          |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 捆绑插件和外部发布插件的安装/更新提示。                                                                 |
| `openclaw.install.defaultChoice`                                                           | 当有多个安装源可用时的首选安装路径。                                                                    |
| `openclaw.install.minHostVersion`                                                          | 支持的最低 OpenClaw 主机版本，使用像 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 这样的 semver 下限。          |
| `openclaw.install.expectedIntegrity`                                                       | 预期的 npm dist 完整性字符串，例如 `sha512-...`；安装和更新流程将根据它验证获取的工件。                 |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 当配置无效时，允许使用狭窄的捆绑插件重新安装恢复路径。                                                  |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 让仅设置渠道在启动期间在完整渠道插件之前加载。                                                          |

清单元数据决定在运行时加载之前，新手引导中显示哪些提供商/渠道/设置选择。`package.json#openclaw.install` 告诉新手引导当用户选择这些选项之一时如何获取或启用该插件。不要将安装提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 在安装和清单注册表加载期间对非打包插件源强制执行。无效的值将被拒绝；在较旧的主机上，较新但有效的值将跳过外部插件。打包源插件假定与主机检出版本保持一致。

当插件在 ClawHub 上发布时，官方按需安装元数据应使用 `clawhubSpec`；新手引导将其视为首选远程源，并在安装后记录 ClawHub 构件事实。`npmSpec` 仍是尚未迁移到 ClawHub 的包的兼容性回退方案。

精确的 npm 版本锁定已存在于 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录条目应将精确规范与 `expectedIntegrity` 配对，以便如果获取的 npm 构件不再匹配锁定的发布版本，更新流程将显式失败。为了兼容性，交互式新手引导仍提供受信任的注册表 npm 规范，包括裸包名称和 dist-tags。目录诊断可以区分精确、浮动、完整性锁定、缺少完整性、包名称不匹配和无效默认选择源。它们还会在存在 `expectedIntegrity` 但没有有效的 npm 源可以锁定时发出警告。当存在 `expectedIntegrity` 时，安装/更新流程会强制执行它；当省略它时，注册表解析结果将被记录而不带完整性锁定。

当状态、渠道列表或 SecretRef 扫描需要在未加载完整运行时的情况下识别已配置的账户时，渠道插件应提供 `openclaw.setupEntry`。setup 入口应公开渠道元数据以及 setup 安全的配置、状态和密钥适配器；将网络客户端、网关监听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖对源入口点字段的包边界检查。例如，`openclaw.runtimeExtensions` 无法使逃逸的 `openclaw.extensions` 路径变为可加载。

`openclaw.install.allowInvalidConfigRecovery` 故意设计得很狭隘。它不会使任意损坏的配置变得可安装。目前，它仅允许安装流程从特定的陈旧捆绑插件升级失败中恢复，例如捆绑插件路径丢失或同一捆绑插件的陈旧 `channels.<id>` 条目。不相关的配置错误仍然会阻止安装，并将操作员引导至 `openclaw doctor --fix`。

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

当 setup、doctor、status 或只读状态流需要在完整的渠道插件加载之前进行廉价的 yes/no 身份验证探测时，请使用它。持久化的身份验证状态不是已配置的渠道状态：不要使用此元数据来自动启用插件、修复运行时依赖项或决定是否应加载渠道运行时。目标导出应该是一个仅读取持久化状态的小函数；不要将其通过完整的渠道运行时桶进行路由。

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

OpenClaw 从多个根目录（捆绑、全局安装、工作区、显式配置选择的路径）发现插件。如果两个发现共享相同的 `id`，则仅保留**最高优先级**的清单；较低优先级的重复项将被丢弃，而不是与其一起加载。

优先级，从高到低：

1. **配置选定** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **捆绑** — 随 OpenClaw 一起提供的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录的插件
4. **工作区** — 相对于当前工作区发现的插件

影响：

- 位于工作区中的捆绑插件的分叉或陈旧副本不会掩盖捆绑版本。
- 要使用本地插件实际覆盖捆绑插件，请通过 `plugins.entries.<id>` 固定它，以便它通过优先级获胜，而不是依赖工作区发现。
- 重复的丢弃会被记录下来，以便 Doctor 和启动诊断可以指向被丢弃的副本。
- 配置选定的重复覆盖在诊断中被称为显式覆盖，但仍然会发出警告，以便陈旧的分叉和意外的掩盖保持可见。

## JSON Schema 要求

- **每个插件必须附带一个 JSON Schema**，即使它不接受任何配置。
- 空 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置读/写时验证，而不是在运行时。
- 当使用新的配置键扩展或分叉捆绑插件时，请同时更新该插件的 `openclaw.plugin.json` `configSchema`。捆绑插件 schema 是严格的，因此如果在用户配置中添加 `plugins.entries.<id>.config.myNewKey` 而不将 `myNewKey` 添加到 `configSchema.properties`，将在插件运行时加载之前被拒绝。

Schema 扩展示例：

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

- 未知的 `channels.*` 键是**错误**，除非渠道 ID 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现**的插件 ID。未知的 ID 是**错误**。
- 如果插件已安装但清单或 schema 损坏或缺失，
  验证将失败，并且 Doctor 会报告插件错误。
- 如果插件配置存在但插件被**禁用**，配置将被保留，
  并且会在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` schema，请参阅 [配置参考](/zh/gateway/configuration)。

## 注记

- 清单对于**原生 OpenClaw 插件是必需的**，包括本地文件系统加载。运行时仍会单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍是对象，就允许注释、尾随逗号和未加引号的键。
- 清单加载器仅读取已文档化的清单字段。避免使用自定义顶级键。
- 当插件不需要时，`channels`、`providers`、`cliBackends` 和 `skills` 均可省略。
- `providerCatalogEntry` 必须保持轻量，不应导入广泛的运行时代码；将其用于静态提供商目录元数据或狭窄的发现描述符，而非请求时执行。`providerDiscoveryEntry` 是旧式拼写，对于现有插件仍然有效。
- 互斥的插件类型通过 `plugins.slots.*` 选择：通过 `plugins.slots.memory` 选择 `kind: "memory"`，通过 `plugins.slots.contextEngine` 选择 `kind: "context-engine"`（默认 `legacy`）。
- 在此清单中声明互斥的插件类型。运行时入口 `OpenClawPluginDefinition.kind` 已被弃用，仅作为旧插件的兼容性保留。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅用于声明。状态、审计、cron 交付验证和其他只读界面在将环境变量视为已配置之前，仍会应用插件信任和有效激活策略。
- 有关需要提供商代码的运行时向导元数据，请参阅 [Provider runtime hooks](/zh/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何包管理器允许列表要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关

<CardGroup cols={3}>
  <Card title="构建插件" href="/zh/plugins/building-plugins" icon="rocket">
    入门指南。
  </Card>
  <Card title="插件架构" href="/zh/plugins/architecture" icon="diagram-project">
    内部架构和功能模型。
  </Card>
  <Card title="SDK 概述" href="/zh/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
