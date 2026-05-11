---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

本页面仅针对 **原生 OpenClaw 插件清单**。

有关兼容的包布局，请参阅 [Plugin bundles](/zh/plugins/bundles)。

兼容的包格式使用不同的清单文件：

- Codex 包：`.codex-plugin/plugin.json`
- Claude 包：`.claude-plugin/plugin.json` 或默认的 Claude 组件
  布局（不包含清单）
- Cursor 包：`.cursor-plugin/plugin.json`

OpenClaw 也会自动检测这些包布局，但它们不会根据此处
描述的 `openclaw.plugin.json` 架构进行验证。

对于兼容的包，当布局符合 OpenClaw 运行时预期时，
OpenClaw 目前会读取包元数据以及声明的技能根目录、
Claude 命令根目录、Claude 包 `settings.json` 默认值、
Claude 包 LSP 默认值和支持的 hook 包。

每个原生 OpenClaw 插件 **必须** 在 **插件根目录** 中包含一个
`openclaw.plugin.json` 文件。OpenClaw 使用此清单来验证配置，
而**无需执行插件代码**。缺失或无效的清单将被视为
插件错误，并会阻止配置验证。

请参阅完整的插件系统指南：[Plugins](/zh/tools/plugin)。
有关原生功能模型和当前的外部兼容性指导：
[Capability 模型](/zh/plugins/architecture#public-capability-model)。

## 此文件的作用

`openclaw.plugin.json` 是 OpenClaw 在加载插件代码之前
读取的元数据。以下所有内容必须足够轻量，以便在不
启动插件运行时的情况下进行检查。

**用于：**

- 插件标识、配置验证和配置 UI 提示
- 身份验证、新手引导和设置元数据（别名、自动启用、提供商环境变量、身份验证选择）
- 控制平面界面的激活提示
- 简写模型家族所有权
- 静态功能所有权快照 (`contracts`)
- 共享 `openclaw qa` 主机可以检查的 QA 运行器元数据
- 合并到目录和验证界面的渠道特定配置元数据

**不要将其用于：** 注册运行时行为、声明代码入口点或 npm 安装元数据。这些内容属于您的插件代码和 `package.json`。

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

| 字段                                 | 必填 | 类型                             | 含义                                                                                                                                                      |
| ------------------------------------ | ---- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 规范的插件 ID。这是在 `plugins.entries.<id>` 中使用的 ID。                                                                                                |
| `configSchema`                       | 是   | `object`                         | 此插件配置的内联 JSON Schema。                                                                                                                            |
| `enabledByDefault`                   | 否   | `true`                           | 将打包的插件标记为默认启用。省略它或设置为任何非 `true` 值，以使插件默认处于禁用状态。                                                                    |
| `legacyPluginIds`                    | 否   | `string[]`                       | 可规范化为此规范插件 ID 的旧版 ID。                                                                                                                       |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 当身份验证、配置或模型引用中提及这些提供商 ID 时，应自动启用此插件。                                                                                      |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 声明由 `plugins.slots.*` 使用的独占插件种类。                                                                                                             |
| `channels`                           | 否   | `string[]`                       | 此插件拥有的频道 ID。用于发现和配置验证。                                                                                                                 |
| `providers`                          | 否   | `string[]`                       | 此插件拥有的提供商 ID。                                                                                                                                   |
| `providerDiscoveryEntry`             | 否   | `string`                         | 轻量级提供商发现模块路径，相对于插件根目录，用于可在不激活完整插件运行时的情况下加载的清单范围提供商目录元数据。                                          |
| `modelSupport`                       | 否   | `object`                         | 清单拥有的简写模型系列元数据，用于在运行时之前自动加载插件。                                                                                              |
| `modelCatalog`                       | 否   | `object`                         | 针对此插件拥有的提供商的声明性模型目录元数据。这是控制平面契约，用于在不加载插件运行时的情况下进行未来的只读列表、新手引导、模型选择器、别名和抑制操作。  |
| `modelPricing`                       | 否   | `object`                         | 提供商拥有的外部定价查找策略。用于选择本地/自托管提供商退出远程定价目录，或将提供商引用映射到 OpenRouter/LiteLLM 目录 ID，而无需在核心中硬编码提供商 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供商拥有的模型 ID 别名/前缀清理，必须在提供商运行时加载之前运行。                                                                                       |
| `providerEndpoints`                  | 否   | `object[]`                       | 清单拥有的提供商路由的端点主机/baseUrl 元数据，核心必须在提供商运行时加载之前对其进行分类。                                                               |
| `providerRequest`                    | 否   | `object`                         | 通用请求策略在提供商运行时加载之前使用的低成本提供商系列和请求兼容性元数据。                                                                              |
| `cliBackends`                        | 否   | `string[]`                       | 由此插件拥有的 CLI 推理后端 ID。用于通过显式配置引用进行启动自动激活。                                                                                    |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供商或 CLI 后端引用，其插件拥有的综合身份验证挂钩应在运行时加载之前的冷模型发现期间进行探测。                                                           |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆绑插件拥有的占位符 API 密钥值，表示非机密的本地、OAuth 或环境凭据状态。                                                                                 |
| `commandAliases`                     | 否   | `object[]`                       | 由此插件拥有的命令名称，应在运行时加载之前生成支持插件的配置和 CLI 诊断信息。                                                                             |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用于提供商身份验证/状态查找的已弃用兼容性环境元数据。对于新插件，建议使用 `setup.providers[].envVars`；OpenClaw 在弃用期内仍会读取此项。                  |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 应重用另一个提供商 ID 进行身份验证查找的提供商 ID，例如共享基础提供商 API 密钥和身份验证配置文件的编码提供商。                                            |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不加载插件代码的情况下检查的廉价渠道环境元数据。将其用于通用启动/配置助手应该看到的环境驱动渠道设置或身份验证界面。                        |
| `providerAuthChoices`                | 否   | `object[]`                       | 用于新手引导选择器、首选提供商解析和简单 CLI 标志连接的廉价身份验证选择元数据。                                                                           |
| `activation`                         | 否   | `object`                         | 用于提供商、命令、渠道、路由和功能触发加载的廉价激活规划器元数据。仅限元数据；插件运行时仍拥有实际行为。                                                  |
| `setup`                              | 否   | `object`                         | 发现和设置界面可以在不加载插件运行时的情况下检查的廉价设置/新手引导描述符。                                                                               |
| `qaRunners`                          | 否   | `object[]`                       | 在插件运行时加载之前，由共享 `openclaw qa` 主机使用的廉价 QA 运行器描述符。                                                                               |
| `contracts`                          | 否   | `object`                         | 用于外部身份验证挂钩、语音、实时转录、实时语音、媒体理解、图像生成、音乐生成、视频生成、Web 获取、Web 搜索和工具所有权的静态捆绑功能快照。                |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中声明的提供商 ID 的廉价媒体理解默认值。                                                                       |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在运行时加载之前合并到发现和验证界面中的清单拥有的渠道配置元数据。                                                                                        |
| `skills`                             | 否   | `string[]`                       | 要加载的技能目录，相对于插件根目录。                                                                                                                      |
| `name`                               | 否   | `string`                         | 人类可读的插件名称。                                                                                                                                      |
| `description`                        | 否   | `string`                         | 在插件界面中显示的简短摘要。                                                                                                                              |
| `version`                            | 否   | `string`                         | 信息性插件版本。                                                                                                                                          |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置字段的 UI 标签、占位符和敏感度提示。                                                                                                                  |

## providerAuthChoices 参考

每个 `providerAuthChoices` 条目描述一个新手引导或身份验证选项。
OpenClaw 会在提供商运行时加载之前读取此内容。
提供商设置列表使用这些清单选项、派生自描述符的设置
选项和安装目录元数据，而无需加载提供商运行时。

| 字段                  | 必填 | 类型                                            | 含义                                                                      |
| --------------------- | ---- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此选项所属的提供商 ID。                                                   |
| `method`              | 是   | `string`                                        | 要分派到的身份验证方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 由新手引导和 CLI 流程使用的稳定身份验证选项 ID。                          |
| `choiceLabel`         | 否   | `string`                                        | 面向用户的标签。如果省略，OpenClaw 将回退到 `choiceId`。                  |
| `choiceHint`          | 否   | `string`                                        | 选择器的简短辅助文本。                                                    |
| `assistantPriority`   | 否   | `number`                                        | 较低的值在助手驱动的交互式选择器中排序靠前。                              |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助手选择器中隐藏该选项，同时仍允许手动 CLI 选择。                       |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 应将用户重定向到此替换选项的旧版选项 ID。                                 |
| `groupId`             | 否   | `string`                                        | 用于对相关选项进行分组的可选组 ID。                                       |
| `groupLabel`          | 否   | `string`                                        | 该组的面向用户的标签。                                                    |
| `groupHint`           | 否   | `string`                                        | 该组的简短辅助文本。                                                      |
| `optionKey`           | 否   | `string`                                        | 用于简单单标志身份验证流程的内部选项键。                                  |
| `cliFlag`             | 否   | `string`                                        | CLI 标志名称，例如 `--openrouter-api-key`。                               |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 选项结构，例如 `--openrouter-api-key <key>`。                  |
| `cliDescription`      | 否   | `string`                                        | 用于 CLI 帮助的描述。                                                     |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 该选项应出现在哪些新手引导界面中。如果省略，默认为 `["text-inference"]`。 |

## commandAliases 参考

当插件拥有一个用户可能错误地放入 `plugins.allow` 或尝试作为根 CLI 命令运行的运行时命令名称时，请使用 `commandAliases`。OpenClaw 在不导入插件运行时代码的情况下使用此元数据进行诊断。

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

| 字段         | 必需 | 类型              | 含义                                                   |
| ------------ | ---- | ----------------- | ------------------------------------------------------ |
| `name`       | 是   | `string`          | 属于此插件的命令名称。                                 |
| `kind`       | 否   | `"runtime-slash"` | 将别名标记为聊天斜杠命令，而不是根 CLI 命令。          |
| `cliCommand` | 否   | `string`          | 相关的根 CLI 命令，建议在 CLI 操作时使用（如果存在）。 |

## activation 参考

当插件可以廉价地声明哪些控制平面事件应将其包含在激活/加载计划中时，请使用 `activation`。

此块是规划器元数据，而不是生命周期 API。它不注册运行时行为，不替换 `register(...)`，也不承诺插件代码已执行。激活规划器使用这些字段在回退到现有的清单所有权元数据（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子）之前缩小候选插件的范围。

优先使用已描述所有权范围最窄的元数据。当这些字段表达关系时，请使用
`providers`、`channels`、`commandAliases`、setup 描述符或 `contracts`。
对于无法由这些所有权字段表示的额外规划器提示，请使用 `activation`。
使用顶层 `cliBackends` 作为 CLI 运行时别名（如 `claude-cli`、
`codex-cli` 或 `google-gemini-cli`）；`activation.onAgentHarnesses` 仅用于
尚不具有所有权字段的嵌入式代理 harness id。

此块仅包含元数据。它不注册运行时行为，也不
替代 `register(...)`、`setupEntry` 或其他运行时/插件入口点。
当前的使用者在进行更广泛的插件加载之前将其作为缩小范围的提示，因此
缺失激活元数据通常仅影响性能；只要传统的清单所有权后备机制仍然存在，就不应
影响正确性。

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 字段               | 必需 | 类型                                                 | 含义                                                                                                       |
| ------------------ | ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `onProviders`      | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的 Provider id。                                                              |
| `onAgentHarnesses` | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的嵌入式代理 harness 运行时 id。对于 CLI 后端别名，请使用顶层 `cliBackends`。 |
| `onCommands`       | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的命令 id。                                                                   |
| `onChannels`       | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的通道 id。                                                                   |
| `onRoutes`         | 否   | `string[]`                                           | 应在激活/加载计划中包含此插件的路由类型。                                                                  |
| `onConfigPaths`    | 否   | `string[]`                                           | 根相对配置路径。当该路径存在且未被显式禁用时，应在启动/加载计划中包含此插件。                              |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 由控制平面激活规划使用的广泛能力提示。尽可能使用更具体的字段。                                             |

当前的活跃使用者：

- 命令触发的 CLI 规划回退到遗留的
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 代理运行时启动规划对嵌入式测试工具使用 `activation.onAgentHarnesses`，对 CLI 运行时别名使用顶级 `cliBackends[]`
- 渠道触发的 setup/渠道规划在缺少明确的渠道激活元数据时，回退到遗留的 `channels[]` 所有权
- 启动插件规划对非渠道根配置界面（如打包浏览器插件的 `browser` 块）使用 `activation.onConfigPaths`
- 提供商触发的 setup/运行时规划在缺少明确的提供商激活元数据时，回退到遗留的
  `providers[]` 和顶级 `cliBackends[]` 所有权

规划器诊断可以区分明确的激活提示和清单所有权回退。例如，`activation-command-hint` 表示
`activation.onCommands` 匹配，而 `manifest-command-alias` 表示
规划器使用了 `commandAliases` 所有权。这些原因标签用于宿主诊断和测试；插件作者应继续声明最能描述所有权的元数据。

## qaRunners 参考

当插件在共享 `openclaw qa` 根目录下提供一个或多个传输运行程序时，请使用 `qaRunners`。保持此元数据廉价且静态；插件运行时仍拥有通过轻量级
`runtime-api.ts` 界面进行的实际 CLI 注册，该界面导出 `qaRunnerCliRegistrations`。

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
| `description` | 否   | `string` | 当共享宿主需要存根命令时使用的回退帮助文本。     |

## setup 参考

在设置和新手引导界面需要在运行时加载之前获取廉价的插件自有元数据时，请使用 `setup`。

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

顶层 `cliBackends` 保持有效，并继续描述 CLI 推理后端。`setup.cliBackends` 是控制平面/设置流程的专用描述符界面，应保持仅元数据。

如果存在，`setup.providers` 和 `setup.cliBackends` 是设置发现的首选描述符优先查找界面。如果描述符仅缩小了候选插件范围，而设置仍需要更丰富的设置时运行时钩子，请设置 `requiresRuntime: true` 并保留 `setup-api` 作为备用执行路径。

OpenClaw 还在通用提供商身份验证和环境变量查找中包含 `setup.providers[].envVars`。在弃用期间，`providerAuthEnvVars` 通过兼容性适配器保持支持，但仍在使用它的非打包插件会收到清单诊断信息。新插件应将设置/状态环境元数据放在 `setup.providers[].envVars` 上。

当没有可用的设置条目，或者当 `setup.requiresRuntime: false` 声明设置运行时不需要时，OpenClaw 也可以从 `setup.providers[].authMethods` 推导简单的设置选项。显式的 `providerAuthChoices` 条目对于自定义标签、CLI 标志、新手引导范围和助手元数据仍然是首选。

仅当这些描述符对于设置界面来说足够时，才设置 `requiresRuntime: false`。OpenClaw 将显式的 `false` 视为仅描述符契约，并且不会为设置查找执行 `setup-api` 或 `openclaw.setupEntry`。如果仅描述符的插件仍然附带这些设置运行时条目之一，OpenClaw 将报告附加诊断信息并继续忽略它。省略 `requiresRuntime` 将保留传统回退行为，以便添加了描述符但未添加该标志的现有插件不会中断。

由于设置查找可以执行插件拥有的 `setup-api` 代码，标准化的
`setup.providers[].id` 和 `setup.cliBackends[]` 值在已发现的插件之间必须保持唯一。所有权模糊将默认失败，而不是按发现顺序选择胜出者。

当设置运行时执行时，如果 `setup-api` 注册了清单描述符未声明的提供商或 CLI 后端，或者描述符没有匹配的运行时注册，则设置注册表诊断会报告描述符漂移。这些诊断是累加的，不会拒绝旧版插件。

### setup.providers 参考

| 字段          | 必需 | 类型       | 含义                                                                      |
| ------------- | ---- | ---------- | ------------------------------------------------------------------------- |
| `id`          | 是   | `string`   | 在设置或新手引导期间公开的提供商 ID。请保持标准化的 ID 在全局范围内唯一。 |
| `authMethods` | 否   | `string[]` | 此提供商在加载完整运行时之前支持的设置/身份验证方法 ID。                  |
| `envVars`     | 否   | `string[]` | 通用设置/状态界面可以在插件运行时加载之前检查的环境变量。                 |

### setup 字段

| 字段               | 必需 | 类型       | 含义                                                                        |
| ------------------ | ---- | ---------- | --------------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在设置和新手引导期间公开的提供商设置描述符。                                |
| `cliBackends`      | 否   | `string[]` | 用于描述符优先设置查找的设置时后端 ID。请保持标准化的 ID 在全局范围内唯一。 |
| `configMigrations` | 否   | `string[]` | 由此插件的设置界面拥有的配置迁移 ID。                                       |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之后，设置是否仍需要 `setup-api` 执行。                         |

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
| `tags`        | `string[]` | 可选的 UI 标记。         |
| `advanced`    | `boolean`  | 将字段标记为高级。       |
| `sensitive`   | `boolean`  | 将字段标记为机密或敏感。 |
| `placeholder` | `string`   | 表单输入的占位符文本。   |

## 契约 参考

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
| `embeddedExtensionFactories`     | `string[]` | Codex 应用服务器扩展工厂 ID，当前为 `codex-app-server`。 |
| `agentToolResultMiddleware`      | `string[]` | 打包插件可以为工具结果中间件注册的运行时 ID。            |
| `externalAuthProviders`          | `string[]` | 此插件拥有的外部身份验证配置挂钩的提供商 ID。            |
| `speechProviders`                | `string[]` | 此插件拥有的语音提供商 ID。                              |
| `realtimeTranscriptionProviders` | `string[]` | 此插件拥有的实时转录提供商 ID。                          |
| `realtimeVoiceProviders`         | `string[]` | 此插件拥有的实时语音提供商 ID。                          |
| `memoryEmbeddingProviders`       | `string[]` | 此插件拥有的记忆嵌入提供商 ID。                          |
| `mediaUnderstandingProviders`    | `string[]` | 此插件拥有的媒体理解提供商 ID。                          |
| `imageGenerationProviders`       | `string[]` | 此插件拥有的图像生成提供商 ID。                          |
| `videoGenerationProviders`       | `string[]` | 此插件拥有的视频生成提供商 ID。                          |
| `webFetchProviders`              | `string[]` | 此插件拥有的 Web 获取提供商 ID。                         |
| `webSearchProviders`             | `string[]` | 此插件拥有的 Web 搜索提供商 ID。                         |
| `migrationProviders`             | `string[]` | 此插件拥有的用于 `openclaw migrate` 的导入提供商 ID。    |
| `tools`                          | `string[]` | 该插件拥有的用于打包合约检查的 Agent 工具名称。          |

`contracts.embeddedExtensionFactories` 专为打包的 Codex
仅限应用服务器的扩展工厂保留。打包的工具结果转换应改为
声明 `contracts.agentToolResultMiddleware` 并注册到
`api.registerAgentToolResultMiddleware(...)`。外部插件无法
注册工具结果中间件，因为在模型看到输出之前，接缝可能会重写高信任度工具
的输出。

实现 `resolveExternalAuthProfiles` 的提供商插件应声明
`contracts.externalAuthProviders`。没有声明的插件仍会
运行通过已弃用的兼容性回退，但该回退速度较慢，并将在
迁移窗口期后被移除。

打包的内存嵌入提供商应为其公开的每个适配器 ID 声明
`contracts.memoryEmbeddingProviders`，包括
内置适配器，如 `local`。独立 CLI 路径使用此清单
合约在完整的 Gateway(网关) 运行时
注册提供商之前，仅加载所属插件。

## mediaUnderstandingProviderMetadata 参考

当媒体理解提供商具有
默认模型、自动认证回退优先级或通用核心助手在运行时加载之前需要的
本机文档支持时，请使用 `mediaUnderstandingProviderMetadata`。键也必须在
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

每个提供商条目可以包含：

| 字段                   | 类型                                | 含义                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供商公开的媒体功能。                           |
| `defaultModels`        | `Record<string, string>`            | 当配置未指定模型时使用的功能到模型的默认值。       |
| `autoPriority`         | `Record<string, number>`            | 数字越小，在基于凭据的自动提供商回退中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支持的本机文档输入。                         |

## channelConfigs 参考

当渠道插件在运行时加载之前需要廉价的配置元数据时，请使用 `channelConfigs`。只读渠道设置/状态发现可以在没有可用设置条目时，或者当 `setup.requiresRuntime: false` 声明设置运行时不需要时，直接将此元数据用于已配置的外部渠道。

`channelConfigs` 是插件清单元数据，而不是一个新的顶层用户配置
部分。用户仍然在 `channels.<channel-id>` 下配置渠道实例。
OpenClaw 读取清单元数据，以便在插件运行时代码执行之前确定哪个插件拥有该配置的
渠道。

对于渠道插件，`configSchema` 和 `channelConfigs` 描述了不同的
路径：

- `configSchema` 验证 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 验证 `channels.<channel-id>`

声明了 `channels[]` 的非捆绑插件还应声明匹配的
`channelConfigs` 条目。如果没有它们，OpenClaw 仍然可以加载该插件，但是
cold-path 配置架构、设置和 Control UI 界面在插件运行时执行之前
无法知道渠道拥有的选项形状。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可以为在渠道运行时加载之前运行的
命令配置检查声明静态 `auto` 默认值。捆绑渠道也可以通过
`package.json#openclaw.channel.commands` 发布相同的默认值，连同
它们其他的包拥有的渠道目录元数据一起。

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

| 字段          | 类型                     | 含义                                                                   |
| ------------- | ------------------------ | ---------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。对于每个声明的渠道配置条目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 该渠道配置部分的可选 UI 标签/占位符/敏感提示。                         |
| `label`       | `string`                 | 当运行时元数据尚未就绪时，合并到选择器和检查界面中的渠道标签。         |
| `description` | `string`                 | 用于检查和目录界面的简短渠道描述。                                     |
| `commands`    | `object`                 | 用于运行前配置检查的静态本机命令和本机技能自动默认值。                 |
| `preferOver`  | `string[]`               | 在选择界面中，该渠道应优先于的旧版或较低优先级的插件 ID。              |

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

当配置了 `channels.chat` 时，OpenClaw 会同时考虑渠道 ID 和首选插件 ID。如果选择低优先级插件仅仅是因为它是捆绑的或默认启用的，OpenClaw 会在有效的运行时配置中禁用它，以便一个插件拥有该渠道及其工具。显式的用户选择仍然优先：如果用户明确启用了两个插件，OpenClaw 将保留该选择，并报告重复的渠道/工具诊断信息，而不是静默更改请求的插件集。

请将 `preferOver` 限制在确实能提供相同渠道的插件 ID 范围内。
这不是一个通用的优先级字段，它也不会重命名用户配置键。

## modelSupport 参考

当 OpenClaw 应该在插件运行时加载之前，
从诸如 `gpt-5.5` 或 `claude-sonnet-4.6` 之类的简写模型 ID
推断您的提供商插件时，请使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 应用以下优先级：

- 显式的 `provider/model` 引用使用所属 `providers` 的清单元数据
- `modelPatterns` 优于 `modelPrefixes`
- 如果一个非打包插件和一个打包插件都匹配，则非打包
  插件获胜
- 剩余的歧义将被忽略，直到用户或配置指定了提供商

字段：

| 字段            | 类型       | 含义                                                     |
| --------------- | ---------- | -------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 匹配的模型ID简写前缀。                 |
| `modelPatterns` | `string[]` | 在移除配置文件后缀后，与简短模型 ID 匹配的正则表达式源。 |

## modelCatalog 参考

当 OpenClaw 需要在加载插件运行时之前知道提供商模型元数据时，请使用 `modelCatalog`。这是清单拥有的固定目录行、提供商别名、抑制规则和发现模式的源。运行时刷新仍属于提供商运行时代码，但清单会告知核心何时需要运行时。

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

| 字段           | 类型                                                     | 含义                                                                |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 归此插件所有的提供商 ID 的目录行。键也应出现在顶级 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 应解析为归此插件所有的提供商的提供商别名，用于目录或抑制规划。      |
| `suppressions` | `object[]`                                               | 来自其他源的模型行，此插件因特定于提供商的原因将其抑制。            |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供商目录是可以从清单元数据读取、刷新到缓存中，还是需要运行时。    |

`aliases` 参与模型目录规划的提供商所有权查找。别名目标必须是同一插件拥有的顶级提供商。当使用提供商过滤的列表使用别名时，OpenClaw 可以读取拥有的清单并应用别名 API/base URL 覆盖，而无需加载提供商运行时。

`suppressions` 是提供商运行时 `suppressBuiltInModel` 挂钩的首选静态替代品。抑制条目仅在提供商归插件所有或声明为以归插件所有的提供商为目标的 `modelCatalog.aliases` 键时才受尊重。运行时抑制挂钩仍作为已弃用的兼容性回退运行，适用于尚未迁移的插件。

提供商字段：

| 字段      | 类型                     | 含义                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供商目录中模型的可选默认 base URL。   |
| `api`     | `ModelApi`               | 此提供商目录中模型的可选默认 API 适配器。 |
| `headers` | `Record<string, string>` | 适用于此提供商目录的可选静态标头。        |
| `models`  | `object[]`               | 必需的模型行。没有 `id` 的行将被忽略。    |

模型字段：

| 字段            | 类型                                                           | 含义                                                      |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `id`            | `string`                                                       | 提供商本地模型 ID，不带 `provider/` 前缀。                |
| `name`          | `string`                                                       | 可选显示名称。                                            |
| `api`           | `ModelApi`                                                     | 可选的每个模型 API 覆盖。                                 |
| `baseUrl`       | `string`                                                       | 可选的每个模型基础 URL 覆盖。                             |
| `headers`       | `Record<string, string>`                                       | 可选的每个模型静态标头。                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模态。                                          |
| `reasoning`     | `boolean`                                                      | 模型是否暴露推理行为。                                    |
| `contextWindow` | `number`                                                       | 原生提供商上下文窗口。                                    |
| `contextTokens` | `number`                                                       | 当与 `contextWindow` 不同时的可选有效运行时上下文上限。   |
| `maxTokens`     | `number`                                                       | 已知的最大输出 Token 数。                                 |
| `cost`          | `object`                                                       | 可选的每百万 Token USD 定价，包括可选的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 与 OpenClaw 模型配置兼容性匹配的可选兼容性标志。          |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表状态。仅当该行绝不能出现时才隐藏。                    |
| `statusReason`  | `string`                                                       | 随不可用状态显示的可选原因。                              |
| `replaces`      | `string[]`                                                     | 此模型取代的旧版提供商本地模型 ID。                       |
| `replacedBy`    | `string`                                                       | 用于已弃用行的替换提供商本地模型 ID。                     |
| `tags`          | `string[]`                                                     | 由选择器和过滤器使用的稳定标签。                          |

不要将仅限运行时的数据放在 `modelCatalog` 中。如果提供商需要账户状态、API 请求或本地进程发现来了解完整的模型集，请在 `discovery` 中将该提供商声明为 `refreshable` 或 `runtime`。

## modelIdNormalization 参考

使用 `modelIdNormalization` 进行必须在提供商运行时加载之前发生的廉价提供商拥有的模型 ID 清理。这会将短模型名称、提供商本地旧版 ID 和代理前缀规则等别名保留在所属插件清单中，而不是在核心模型选择表中。

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

| 字段                                 | 类型                    | 含义                                                                  |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不区分大小写的精确模型 ID 别名。值按写入原样返回。                    |
| `stripPrefixes`                      | `string[]`              | 在别名查找之前要删除的前缀，适用于旧版提供商/模型重复。               |
| `prefixWhenBare`                     | `string`                | 当标准化的模型 ID 尚未包含 `/` 时要添加的前缀。                       |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 别名查找后的条件性纯 ID 前缀规则，以 `modelPrefix` 和 `prefix` 为键。 |

## providerEndpoints 参考

使用 `providerEndpoints` 进行通用请求策略必须在提供商运行时加载之前知道的端点分类。核心仍然拥有每个 `endpointClass` 的含义；插件清单拥有主机和基本 URL 元数据。

端点字段：

| 字段                           | 类型       | 含义                                                                        |
| ------------------------------ | ---------- | --------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端点类，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 映射到端点类的确切主机名。                                                  |
| `hostSuffixes`                 | `string[]` | 映射到端点类的主机后缀。对于仅匹配域后缀的情况，请加上 `.` 前缀。           |
| `baseUrls`                     | `string[]` | 映射到端点类的确切规范化 HTTP(S) 基础 URL。                                 |
| `googleVertexRegion`           | `string`   | 针对确切全局主机的静态 Google Vertex 区域。                                 |
| `googleVertexRegionHostSuffix` | `string`   | 要从匹配的主机中剥离的后缀，用于暴露 Google Vertex 区域前缀。               |

## providerRequest 参考

使用 `providerRequest` 提供廉价的请求兼容性元数据，这些数据是通用请求策略在未加载提供商运行时的情况下所需要的。将特定行为的有效负载重写保留在提供商运行时钩子或共享的提供商系列辅助程序中。

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

| 字段                  | 类型         | 含义                                                         |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `family`              | `string`     | 供通用请求兼容性决策和诊断使用的提供商系列标签。             |
| `compatibilityFamily` | `"moonshot"` | 用于共享请求辅助程序的可选提供商系列兼容性存储桶。           |
| `openAICompletions`   | `object`     | OpenAI 兼容的补全请求标志，目前为 `supportsStreamingUsage`。 |

## modelPricing 参考

当提供商需要在运行时加载之前控制平面的定价行为时，请使用 `modelPricing`。Gateway 定价缓存会在不导入提供商运行时代码的情况下读取此元数据。

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

| 字段         | 类型              | 含义                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 对于绝不应获取 OpenRouter 或 LiteLLM 定价的本地/自托管提供商，请设置 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定价查找映射。`false` 会禁用此提供商的 OpenRouter 查找。            |
| `liteLLM`    | `false \| object` | LiteLLM 定价查找映射。`false` 禁用此提供商的 LiteLLM 查找。                    |

源字段：

| 字段                       | 类型               | 含义                                                                                      |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 当外部目录提供商 ID 与 OpenClaw 提供商 ID 不同时使用，例如 `zai` 提供商的 `z-ai`。        |
| `passthroughProviderModel` | `boolean`          | 将包含斜杠的模型 ID 视为嵌套的 提供商/模型 引用，适用于诸如 OpenRouter 之类的代理提供商。 |
| `modelIdTransforms`        | `"version-dots"[]` | 额外的外部目录模型 ID 变体。`version-dots` 会尝试带点的版本 ID，如 `claude-opus-4.6`。    |

### OpenClaw 提供商索引

OpenClaw 提供商索引是由 OpenClaw 拥有的提供商预览元数据，
适用于可能尚未安装其插件的提供商。它不是插件清单的一部分。
插件清单仍然是已安装插件的权威来源。提供商索引是
内部后备协议，当未安装提供商插件时，未来的可安装提供商和
预安装模型选择器界面将使用该协议。

目录权威顺序：

1. 用户配置。
2. 已安装的插件清单 `modelCatalog`。
3. 来自显式刷新的模型目录缓存。
4. OpenClaw 提供商索引预览行。

提供商索引不得包含机密信息、启用状态、运行时挂钩或
特定于帐户的实时模型数据。其预览目录使用与插件清单相同的
`modelCatalog` 提供商行形状，但应仅限于
稳定的显示元数据，除非诸如 `api`、
`baseUrl`、定价或兼容性标志等运行时适配器字段
有意与已安装的插件清单保持一致。具有实时 `/models` 发现功能的提供商应
通过显式模型目录缓存路径写入刷新后的行，而不是
进行常规列出或新手引导调用提供商 API。

提供商索引条目可能还包含可安装插件元数据，适用于其插件已从核心移出或尚未安装的提供商。该元数据反映了渠道目录模式：包名称、npm 安装规范、预期的完整性以及廉价的身份验证选择标签足以显示可安装的设置选项。一旦插件安装完成，其清单将生效，并忽略该提供商的提供商索引条目。

传统的顶级功能键已被弃用。使用 `openclaw doctor --fix` 将 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清单加载不再将这些顶级字段视为功能所有权。

## 清单与 package.

这两个文件用于不同的工作：

| 文件                   | 用于                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 设备发现、配置验证、身份验证选择元数据以及插件代码运行前必须存在的 UI 提示       |
| `package.json`         | npm 元数据、依赖项安装以及用于入口点、安装限制、设置或目录元数据的 `openclaw` 块 |

如果您不确定某条元数据应该放在哪里，请使用此规则：

- 如果 OpenClaw 必须在加载插件代码之前知道它，请将其放在 `openclaw.plugin.json` 中
- 如果它涉及打包、入口文件或 npm 安装行为，请将其放在 `package.json` 中

### 影响设备发现的 package. 字段

一些运行前的插件元数据有意驻留在 `package.json` 的 `openclaw` 块下，而不是 `openclaw.plugin.json` 中。

重要示例：

| 字段                                                              | 含义                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 声明原生插件入口点。必须保留在插件包目录内。                                                            |
| `openclaw.runtimeExtensions`                                      | 声明已安装软件包的构建 JavaScript 运行时入口点。必须保留在插件包目录内。                                |
| `openclaw.setupEntry`                                             | 用于新手引导、延迟渠道启动以及只读渠道状态/SecretRef 发现的轻量级仅设置入口点。必须保留在插件包目录内。 |
| `openclaw.runtimeSetupEntry`                                      | 声明已安装软件包的已构建 JavaScript 设置入口点。必须保留在插件包目录内。                                |
| `openclaw.channel`                                                | 廉价的渠道目录元数据，如标签、文档路径、别名和选择文案。                                                |
| `openclaw.channel.commands`                                       | 配置、审计和命令列表界面在渠道运行时加载之前使用的静态原生命令和原生技能自动默认元数据。                |
| `openclaw.channel.configuredState`                                | 轻量级配置状态检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已存在仅环境设置？”              |
| `openclaw.channel.persistedAuthState`                             | 轻量级持久身份验证检查器元数据，可以在不加载完整渠道运行时的情况下回答“是否已登录任何内容？”            |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 捆绑包和外部发布插件的安装/更新提示。                                                                   |
| `openclaw.install.defaultChoice`                                  | 当有多个安装源可用时的首选安装路径。                                                                    |
| `openclaw.install.minHostVersion`                                 | 支持的最低 OpenClaw 主机版本，使用类似 `>=2026.3.22` 的 semver 下限。                                   |
| `openclaw.install.expectedIntegrity`                              | 预期的 npm 分发完整性字符串，例如 `sha512-...`；安装和更新流程会根据它验证获取的工件。                  |
| `openclaw.install.allowInvalidConfigRecovery`                     | 当配置无效时，允许通过狭窄的捆绑插件重新安装恢复路径。                                                  |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 允许仅设置渠道界面在启动期间于完整渠道插件之前加载。                                                    |

清单元数据决定了在运行时加载之前新手引导中显示哪些提供商/渠道/设置选项。`package.json#openclaw.install` 告诉
新手引导当用户选择其中一个选项时如何获取或启用该插件。不要将安装提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 在安装和清单注册表加载期间强制执行。无效值将被拒绝；在较旧的主机上，较新但有效的值将跳过该插件。

精确的 npm 版本锁定已经存在于 `npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目录
条目应将精确规范与 `expectedIntegrity` 配对，以便如果获取的
npm 构件不再匹配锁定的发布版本，更新流程将失败关闭。
交互式新手引导仍然提供受信任的注册表 npm 规范，包括裸包名
和 dist-tags，以保持兼容性。目录诊断可以区分精确、浮动、完整性锁定、
缺少完整性、包名不匹配和无效默认选择的来源。它们还会在存在
`expectedIntegrity` 但没有有效的 npm 来源可以锁定时发出警告。
当存在 `expectedIntegrity` 时，
安装/更新流程会强制执行它；当省略它时，注册表解析将被记录
而没有完整性锁定。

当状态、渠道列表或 SecretRef 扫描需要在不加载完整运行时的情况下
识别配置的账户时，渠道插件应提供 `openclaw.setupEntry`。
设置条目应公开渠道元数据以及设置安全的配置、状态和密钥适配器；
将网络客户端、网关监听器和传输运行时保留在主扩展入口点中。

运行时入口点字段不会覆盖源入口点字段的包边界检查。
例如，`openclaw.runtimeExtensions` 无法使
转义 `openclaw.extensions` 路径变为可加载。

`openclaw.install.allowInvalidConfigRecovery` 故意很窄。它不会
使任意的损坏配置变得可安装。目前它仅允许安装流程从特定的
过时捆绑插件升级失败中恢复，例如缺少的捆绑插件路径或该
捆绑插件的过时 `channels.<id>` 条目。
不相关的配置错误仍然会阻止安装并将操作员发送到 `openclaw doctor --fix`。

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

当设置、诊断或配置状态流程需要在加载完整的渠道插件之前
进行廉价的 是/否 认证探测时使用它。目标导出应该是一个
仅读取持久状态的小函数；不要通过完整的渠道运行时桶来路由它。

`openclaw.channel.configuredState` 遵循相同的结构，用于仅通过环境变量配置的简单检查：

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

当渠道 可以从环境变量或其他微小的非运行时输入获取配置状态时使用它。如果检查需要完整的配置解析或真实的渠道运行时，请将该逻辑保留在插件 `config.hasConfiguredState` 钩子中。

## 设备发现 优先级（重复的插件 ID）

OpenClaw 从多个根目录发现插件（打包、全局安装、工作区、显式配置选择的路径）。如果两个发现共享相同的 `id`，则仅保留**最高优先级**的清单；较低优先级的重复项将被丢弃，而不是与其一起加载。

优先级，从高到低：

1. **配置选择** — 在 `plugins.entries.<id>` 中显式固定的路径
2. **打包** — 随 OpenClaw 一起提供的插件
3. **全局安装** — 安装到全局 OpenClaw 插件根目录的插件
4. **工作区** — 相对于当前工作区发现的插件

影响：

- 位于工作区中的打包插件的分叉或过时副本不会覆盖打包的构建版本。
- 要使用本地插件实际覆盖打包插件，请通过 `plugins.entries.<id>` 固定它，使其通过优先级获胜，而不是依赖工作区发现。
- 重复的丢弃操作会被记录下来，以便 Doctor 和启动诊断可以指向被丢弃的副本。

## JSON 架构要求

- **每个插件必须提供 JSON 架构**，即使它不接受任何配置。
- 空架构是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- 架构在配置读/写时进行验证，而不是在运行时。

## 验证行为

- 未知的 `channels.*` 键是**错误**，除非渠道 id 由
  插件清单声明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必须引用**可发现的**插件 id。未知的 id 是**错误**。
- 如果插件已安装但清单或架构损坏或缺失，
  验证将失败，Doctor 将报告插件错误。
- 如果插件配置存在但插件被**禁用**，配置将被保留，
  并在 Doctor + 日志中显示**警告**。

有关完整的 `plugins.*` 架构，请参阅[配置参考](/zh/gateway/configuration)。

## 注意事项

- 对于原生 OpenClaw 插件（包括本地文件系统加载），清单是**必需的**。运行时仍会单独加载插件模块；清单仅用于发现和验证。
- 原生清单使用 JSON5 解析，因此只要最终值仍为对象，注释、尾随逗号和未加引号的键都是可以接受的。
- 清单加载程序仅读取文档中记录的清单字段。避免使用自定义的顶级键。
- 当插件不需要时，`channels`、`providers`、`cliBackends` 和 `skills` 均可省略。
- `providerDiscoveryEntry` 必须保持轻量级，不应导入广泛的运行时代码；将其用于静态提供商目录元数据或狭窄的发现描述符，而不是请求时的执行。
- 互斥的插件类型通过 `plugins.slots.*` 选择：通过 `plugins.slots.memory` 选择 `kind: "memory"`，通过 `plugins.slots.contextEngine` 选择 `kind: "context-engine"`（默认为 `legacy`）。
- 环境变量元数据（`setup.providers[].envVars`、已弃用的 `providerAuthEnvVars` 和 `channelEnvVars`）仅是声明性的。状态、审计、cron 投递验证和其他只读接口在将环境变量视为已配置之前，仍会应用插件信任和有效激活策略。
- 对于需要提供商代码的运行时向导元数据，请参阅[提供商运行时钩子](/zh/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依赖于原生模块，请记录构建步骤和任何包管理器允许列表要求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相关

<CardGroup cols={3}>
  <Card title="构建插件" href="/zh/plugins/building-plugins" icon="rocket">
    插件入门指南。
  </Card>
  <Card title="插件架构" href="/zh/plugins/architecture" icon="diagram-project">
    内部架构和模型。
  </Card>
  <Card title="SDK 概览" href="/zh/plugins/sdk-overview" icon="book">
    插件 SDK 参考和子路径导入。
  </Card>
</CardGroup>
