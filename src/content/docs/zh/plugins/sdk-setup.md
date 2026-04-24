---
title: "插件设置和配置"
sidebarTitle: "设置和配置"
summary: "设置向导、setup-entry.ts、配置架构以及 package. 元数据"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# 插件设置和配置

关于插件打包（`package.json` 元数据）、清单（`openclaw.plugin.json`）、设置入口和配置架构的参考。

<Tip>**寻找演练？** 操作指南涵盖了上下文中的打包内容： [频道插件](/zh/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供商插件](/zh/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## 包元数据

您的 `package.json` 需要一个 `openclaw` 字段，用于告诉插件系统您的插件提供什么：

**渠道插件：**

```json
{
  "name": "@myorg/openclaw-my-channel",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "blurb": "Short description of the channel."
    }
  }
}
```

**提供者插件 / ClawHub 发布基线：**

```json openclaw-clawhub-package.json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

如果你在 ClawHub 上外部发布插件，则那些 `compat` 和 `build`
字段是必填项。标准的发布片段位于
`docs/snippets/plugin-publish/`。

### `openclaw` 字段

| 字段         | 类型       | 描述                                                                                                                   |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | 入口文件（相对于包根目录）                                                                                             |
| `setupEntry` | `string`   | 轻量级仅设置入口（可选）                                                                                               |
| `channel`    | `object`   | 用于设置、选择器、快速入门和状态界面的渠道目录元数据                                                                   |
| `providers`  | `string[]` | 由此插件注册的提供者 ID                                                                                                |
| `install`    | `object`   | 安装提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery` |
| `startup`    | `object`   | 启动行为标志                                                                                                           |

### `openclaw.channel`

`openclaw.channel` 是用于渠道发现和运行时加载之前的安装界面的轻量级包元数据。

| 字段                                   | 类型       | 含义                                                                          |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `id`                                   | `string`   | 规范渠道 ID。                                                                 |
| `label`                                | `string`   | 主要渠道标签。                                                                |
| `selectionLabel`                       | `string`   | 当应与 `label` 不同时，选择器/设置标签。                                      |
| `detailLabel`                          | `string`   | Secondary detail label for richer 渠道 catalogs and status surfaces.          |
| `docsPath`                             | `string`   | Docs path for setup and selection links.                                      |
| `docsLabel`                            | `string`   | Override label used for docs links when it should differ from the 渠道 id.    |
| `blurb`                                | `string`   | Short 新手引导/catalog description.                                           |
| `order`                                | `number`   | Sort order in 渠道 catalogs.                                                  |
| `aliases`                              | `string[]` | Extra lookup aliases for 渠道 selection.                                      |
| `preferOver`                           | `string[]` | Lower-priority plugin/渠道 ids this 渠道 should outrank.                      |
| `systemImage`                          | `string`   | Optional icon/system-image name for 渠道 UI catalogs.                         |
| `selectionDocsPrefix`                  | `string`   | Prefix text before docs links in selection surfaces.                          |
| `selectionDocsOmitLabel`               | `boolean`  | Show the docs path directly instead of a labeled docs link in selection copy. |
| `selectionExtras`                      | `string[]` | Extra short strings appended in selection copy.                               |
| `markdownCapable`                      | `boolean`  | Marks the 渠道 as markdown-capable for outbound formatting decisions.         |
| `exposure`                             | `object`   | Channel visibility controls for setup, configured lists, and docs surfaces.   |
| `quickstartAllowFrom`                  | `boolean`  | 将此渠道加入标准的快速启动 `allowFrom` 设置流程。                             |
| `forceAccountBinding`                  | `boolean`  | Require explicit account binding even when only one account exists.           |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Prefer 会话 lookup when resolving announce targets for this 渠道.             |

Example:

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Webhook-based self-hosted chat integration.",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "Guide:",
      "selectionExtras": ["Markdown"],
      "markdownCapable": true,
      "exposure": {
        "configured": true,
        "setup": true,
        "docs": true
      },
      "quickstartAllowFrom": true
    }
  }
}
```

`exposure` 支持：

- `configured`: 在已配置/状态类列表表面中包含该渠道
- `setup`: 在交互式设置/配置选择器中包含该渠道
- `docs`: 在文档/导航表面中将该渠道标记为面向公众

`showConfigured` 和 `showInSetup` 仍作为旧版别名受支持。首选
`exposure`。

### `openclaw.install`

`openclaw.install` 是包元数据，而非清单元数据。

| 字段                         | 类型                 | 含义                                                               |
| ---------------------------- | -------------------- | ------------------------------------------------------------------ |
| `npmSpec`                    | `string`             | 用于安装/更新流程的规范 npm 规范。                                 |
| `localPath`                  | `string`             | 本地开发或打包安装路径。                                           |
| `defaultChoice`              | `"npm"` \| `"local"` | 当两者都可用时首选的安装源。                                       |
| `minHostVersion`             | `string`             | 支持的最低 OpenClaw 版本，格式为 `>=x.y.z`。                       |
| `expectedIntegrity`          | `string`             | 预期的 npm 发行版完整性字符串，通常为 `sha512-...`，用于固定安装。 |
| `allowInvalidConfigRecovery` | `boolean`            | 允许捆绑插件重新安装流程从特定的过时配置故障中恢复。               |

交互式新手引导也使用 `openclaw.install` 用于按需安装表面。如果你的插件在运行时加载之前公开了提供商身份验证选项或渠道设置/目录元数据，新手引导可以显示该选项，提示 npm 还是本地安装，安装或启用插件，然后继续所选的流程。Npm 新手引导选项需要带有注册表 `npmSpec` 的受信任目录元数据；确切版本和 `expectedIntegrity` 是可选的固定项。如果存在 `expectedIntegrity`，安装/更新流程将强制执行它。将“显示什么”的元数据保留在 `openclaw.plugin.json` 中，将“如何安装”的元数据保留在 `package.json` 中。

如果设置了 `minHostVersion`，安装和清单注册表加载都会强制执行它。较旧的主机将跳过该插件；无效的版本字符串将被拒绝。

对于固定的 npm 安装，请在 `npmSpec` 中保留确切版本并添加
预期的构建完整性：

```json
{
  "openclaw": {
    "install": {
      "npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3",
      "expectedIntegrity": "sha512-REPLACE_WITH_NPM_DIST_INTEGRITY",
      "defaultChoice": "npm"
    }
  }
}
```

`allowInvalidConfigRecovery` 并不是针对损坏配置的通用绕过方法。它
仅用于狭窄的捆绑插件恢复，以便重新安装/设置可以修复已知的
升级遗留问题，例如缺少的捆绑插件路径或针对同一插件的过时 `channels.<id>`
条目。如果由于不相关的原因导致配置损坏，安装
仍然会失败并告知操作员运行 `openclaw doctor --fix`。

### 延迟完全加载

通道插件可以选择通过以下方式启用延迟加载：

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

启用后，OpenClaw 在预监听启动
阶段仅加载 `setupEntry`，即使对于已配置的通道也是如此。完整条目在
网关开始监听后加载。

<Warning>仅当您的 `setupEntry` 在网关开始监听之前注册了网关所需的所有内容（渠道注册、HTTP 路由、网关方法）时，才启用延迟加载。如果完整入口拥有必需的启动能力，请保留默认行为。</Warning>

如果您的设置/完整入口注册了网关 RPC 方法，请将它们保留在特定于插件的前缀上。保留的核心管理命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）保持核心所有，并且始终解析为
`operator.admin`。

## 插件清单

每个原生插件必须在包根目录中附带一个 `openclaw.plugin.json`。
OpenClaw 使用它在不执行插件代码的情况下验证配置。

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

对于渠道插件，添加 `kind` 和 `channels`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

即使没有配置的插件也必须附带一个架构。空架构是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

有关完整的架构参考，请参阅 [插件清单](/zh/plugins/manifest)。

## ClawHub 发布

对于插件包，使用特定于包的 ClawHub 命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

旧版仅限技能的发布别名是用于技能的。插件包应
始终使用 `clawhub package publish`。

## 设置入口

`setup-entry.ts` 文件是 `index.ts` 的轻量级替代品，
当 OpenClaw 仅需要设置界面（新手引导、配置修复、
禁用渠道检查）时会加载它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这避免了在设置流程中加载繁重的运行时代码（加密库、CLI 注册、
后台服务）。

将设置安全导出保留在附属模块中的打包工作区渠道可以使用来自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`，而不是 `defineSetupPluginEntry(...)`。该打包合约还支持可选的 `runtime` 导出，以便设置时的运行时连线保持轻量和显式。

**当 OpenClaw 使用 `setupEntry` 而不是完整入口时：**

- 渠道已禁用但需要设置/新手引导界面
- 渠道已启用但未配置
- 启用了延迟加载 (`deferConfiguredChannelFullLoadUntilAfterListen`)

**`setupEntry` 必须注册的内容：**

- 渠道插件对象（通过 `defineSetupPluginEntry`）
- 网关监听之前所需的任何 HTTP 路由
- 启动期间所需的任何网关方法

那些启动 Gateway 方法仍应避免保留的核心管理命名空间，例如 `config.*` 或 `update.*`。

**`setupEntry` 不应包括的内容：**

- CLI 注册
- 后台服务
- 繁重的运行时导入（crypto、SDK）
- 仅在启动后需要的 Gateway 方法

### 窄范围设置助手导入

对于仅用于热设置的路径，当您只需要设置表面的一部分时，请优先使用窄范围的设置助手接缝，而不是更广泛的 `plugin-sdk/setup` 总集：

| 导入路径                           | 用于                                                       | 主要导出                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延迟渠道启动中保持可用的设置时运行时助手 | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | environment-aware account setup adapters                   | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | setup/install CLI/archive/docs helpers                     | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

当您需要完整的共享设置工具箱（包括 `moveSingleAccountChannelSectionToDefaultAccount(...)` 等配置修补辅助工具）时，请使用更广泛的 `plugin-sdk/setup` 接缝。

设置修补适配器在导入时保持热路径安全。其打包的单账户推广合约表面查找是延迟的，因此在适配器实际使用之前，导入 `plugin-sdk/setup-runtime` 不会急切地加载打包的合约表面发现功能。

### 渠道拥有的单账户推广

当渠道从单账户顶级配置升级到 `channels.<id>.accounts.*` 时，默认的共享行为是将提升的账户范围值移动到 `accounts.default` 中。

打包的渠道可以通过其设置合约表面来缩小或覆盖该推广：

- `singleAccountKeysToMove`：应移动到提升账户中的额外顶级键
- `namedAccountPromotionKeys`：当已存在命名账户时，仅这些
  键会移动到提升的账户中；共享的策略/交付键保留在
  渠道根目录
- `resolveSingleAccountPromotionTarget(...)`：选择哪个现有账户
  接收提升的值

Matrix 是当前捆绑的示例。如果恰好存在一个命名的 Matrix 账户，或者如果 `defaultAccount` 指向一个现有的非规范键（例如 `Ops`），提升操作将保留该账户而不是创建一个新的 `accounts.default` 条目。

## 配置架构

插件配置将根据您清单中的 JSON Schema 进行验证。用户通过以下方式配置插件：

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

您的插件在注册期间会以 `api.pluginConfig` 的形式接收此配置。

对于特定于渠道的配置，请改用渠道配置部分：

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### 构建渠道配置架构

使用 `openclaw/plugin-sdk/core` 中的 `buildChannelConfigSchema` 将 Zod schema 转换为 OpenClaw 验证所需的 `ChannelConfigSchema` 包装器：

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/core";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

## 设置向导

通道插件可以为 `openclaw onboard` 提供交互式设置向导。
该向导是 `ChannelPlugin` 上的一个 `ChannelSetupWizard` 对象：

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

`ChannelSetupWizard` 类型支持 `credentials`、`textInputs`、
`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等。
有关完整示例，请参阅捆绑的插件包（例如 Discord 插件的 `src/channel.setup.ts`）。

对于只需要标准 `note -> prompt -> parse -> merge -> patch` 流程的私信允许列表提示，请优先使用 `openclaw/plugin-sdk/setup` 中的共享设置辅助程序：`createPromptParsedAllowFromForAccount(...)`、`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。

对于仅标签、分数和可选额外行不同的渠道设置状态块，请优先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每个插件中手动构建相同的 `status` 对象。

对于应该仅出现在特定上下文中的可选设置界面，请使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

```typescript
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

const setupSurface = createOptionalChannelSetupSurface({
  channel: "my-channel",
  label: "My Channel",
  npmSpec: "@myorg/openclaw-my-channel",
  docsPath: "/channels/my-channel",
});
// Returns { setupAdapter, setupWizard }
```

当您只需要该可选安装界面的一半时，`plugin-sdk/channel-setup` 还公开了较低级别的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 构建器。

生成的可选适配器/向导在真正的配置写入时会自动关闭。它们在 `validateInput`、`applyAccountConfig` 和 `finalize` 之间复用同一条需要安装的消息，并在设置 `docsPath` 时附加文档链接。

对于基于二进制的设置 UI，首选共享的委托助手，而不是将相同的二进制/状态胶水代码复制到每个渠道中：

- `createDetectedBinaryStatus(...)` 用于仅在标签、提示、分数和二进制检测上有所不同的状态块
- `createCliPathTextInput(...)` 用于基于路径的文本输入
- 当 `setupEntry` 需要延迟转发到更完整的向导时，使用 `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)`
- `createDelegatedTextInputShouldPrompt(...)` 当 `setupEntry` 仅需要
  委托 `textInputs[*].shouldPrompt` 决定时

## 发布与安装

**外部插件：** 发布到 [ClawHub](/zh/tools/clawhub) 或 npm，然后安装：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 会先尝试 ClawHub，并在失败时自动回退到 npm。您也可以
显式强制使用 ClawHub：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

没有匹配的 `npm:` 覆盖。当您希望在 npm 回退后使用 npm 路径时，请使用常规的 ClawHub 包规格：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**仓库内插件：** 放置在捆绑插件工作区树下，它们将在构建期间被自动
发现。

**用户可以安装：**

```bash
openclaw plugins install <package-name>
```

<Info>对于来自 npm 的安装，`openclaw plugins install` 运行 `npm install --ignore-scripts`（无生命周期脚本）。请保持插件依赖树为纯 JS/TS，并避免需要 `postinstall` 构建的包。</Info>

打包的 OpenClaw 拥有的插件是唯一的启动修复例外：当打包安装发现某个插件通过插件配置、旧版渠道配置或其打包的默认启用清单启用时，启动会在导入之前安装该插件缺失的运行时依赖项。第三方插件不应依赖启动安装；请继续使用显式插件安装程序。

## 相关

- [SDK Entry Points](/zh/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [Plugin Manifest](/zh/plugins/manifest) -- 完整的清单模式参考
- [构建插件](/zh/plugins/building-plugins) -- 逐步入门指南
