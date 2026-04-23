---
title: "插件设置和配置"
sidebarTitle: "设置和配置"
summary: "设置向导、setup-entry.ts、配置架构和 package. 元数据"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# 插件设置和配置

插件打包（`package.json` 元数据）、清单
（`openclaw.plugin.json`）、设置入口和配置架构的参考。

<Tip>**寻找实战演练？** 操作指南涵盖了相关上下文中的打包内容： [渠道插件](/zh/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者插件](/zh/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## 包元数据

您的 `package.json` 需要一个 `openclaw` 字段，用于告知插件系统
您的插件提供什么：

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

如果您要在 ClawHub 上对外发布插件，则这些 `compat` 和 `build`
字段是必填的。规范的发布片段位于
`docs/snippets/plugin-publish/` 中。

### `openclaw` 字段

| 字段         | 类型       | 描述                                                                                              |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | 入口文件（相对于包根目录）                                                                        |
| `setupEntry` | `string`   | 轻量级仅设置入口（可选）                                                                          |
| `channel`    | `object`   | 用于设置、选择器、快速入门和状态界面的渠道目录元数据                                              |
| `providers`  | `string[]` | 由此插件注册的提供者 ID                                                                           |
| `install`    | `object`   | 安装提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`allowInvalidConfigRecovery` |
| `startup`    | `object`   | 启动行为标志                                                                                      |

### `openclaw.channel`

`openclaw.channel` 是用于渠道发现和设置界面的轻量级包元数据，
在运行时加载之前使用。

| 字段                                   | 类型       | 含义                                                                          |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `id`                                   | `string`   | 规范渠道 ID。                                                                 |
| `label`                                | `string`   | 主要渠道标签。                                                                |
| `selectionLabel`                       | `string`   | Picker/setup label when it should differ from `label`.                        |
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
| `quickstartAllowFrom`                  | `boolean`  | Opt this 渠道 into the standard quickstart `allowFrom` setup flow.            |
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

- `configured`：在配置/状态样式的列表界面中包含该渠道
- `setup`：在交互式设置/配置选择器中包含该渠道
- `docs`：将该渠道在文档/导航界面中标记为面向公众

`showConfigured` 和 `showInSetup` 作为遗留别名仍受支持。建议首选
`exposure`。

### `openclaw.install`

`openclaw.install` 是包元数据，而非清单元数据。

| 字段                         | 类型                 | 含义                                                 |
| ---------------------------- | -------------------- | ---------------------------------------------------- |
| `npmSpec`                    | `string`             | 用于安装/更新流程的规范 npm 规范。                   |
| `localPath`                  | `string`             | 本地开发或打包安装路径。                             |
| `defaultChoice`              | `"npm"` \| `"local"` | 当两者都可用时首选的安装源。                         |
| `minHostVersion`             | `string`             | 支持的最小 OpenClaw 版本，格式为 `>=x.y.z`。         |
| `allowInvalidConfigRecovery` | `boolean`            | 允许打包插件重新安装流程从特定的过时配置故障中恢复。 |

如果设置了 `minHostVersion`，安装和清单注册表加载都会强制执行
它。旧的主机会跳过该插件；无效的版本字符串将被拒绝。

`allowInvalidConfigRecovery` 不是针对损坏配置的通用绕过方法。它
仅适用于狭窄的打包插件恢复，以便重新安装/设置可以修复已知的
升级遗留问题，例如缺失的打包插件路径或同一插件的过时 `channels.<id>`
条目。如果由于无关原因导致配置损坏，安装
仍然会失败并告知操作员运行 `openclaw doctor --fix`。

### 延迟完全加载

渠道插件可以选择通过以下方式启用延迟加载：

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

启用后，OpenClaw 仅在监听前启动阶段加载 `setupEntry`，
即使对于已配置的渠道也是如此。完整条目在网关开始监听后加载。

<Warning>仅当您的 `setupEntry` 在网关开始监听之前注册了网关所需的所有内容（渠道注册、HTTP 路由、 网关方法）时，才启用延迟加载。如果完整入口拥有必需的启动功能，请保留 默认行为。</Warning>

如果您的设置/完整入口注册了网关 RPC 方法，请将它们保留在特定于插件的前缀上。
保留的核心管理命名空间（`config.*`，
`exec.approvals.*`、`wizard.*`、`update.*`）仍归核心所有，并且始终解析
为 `operator.admin`。

## 插件清单

每个原生插件必须在包根目录中附带一个 `openclaw.plugin.json`。
OpenClaw 使用它来验证配置，而无需执行插件代码。

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

对于渠道插件，请添加 `kind` 和 `channels`：

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

即使没有配置的插件也必须附带一个模式（schema）。空模式是有效的：

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

对于插件包，请使用特定的 ClawHub 命令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

遗留的仅限技能的发布别名是用于技能的。插件包应该
始终使用 `clawhub package publish`。

## 设置入口

`setup-entry.ts` 文件是 `index.ts` 的轻量级替代方案，
当 OpenClaw 仅需要设置界面（新手引导、配置修复、
禁用的渠道检查）时，会加载它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这避免了在设置流程期间加载繁重的运行时代码（加密库、CLI 注册、
后台服务）。

将安装安全导出保留在伴随模块中的打包工作区渠道可以使用 `defineBundledChannelSetupEntry(...)` 中的
`openclaw/plugin-sdk/channel-entry-contract` 代替
`defineSetupPluginEntry(...)`。该打包合约还支持可选的
`runtime` 导出，以便安装时的运行时连接保持轻量和显式。

**当 OpenClaw 使用 `setupEntry` 而非完整入口时：**

- 该渠道已禁用但需要安装/新手引导界面
- 该渠道已启用但未配置
- 启用了延迟加载 (`deferConfiguredChannelFullLoadUntilAfterListen`)

**`setupEntry` 必须注册的内容：**

- 渠道插件对象（通过 `defineSetupPluginEntry`）
- Gateway(网关)监听之前所需的任何 HTTP 路由
- 启动期间所需的任何 Gateway(网关) 方法

这些启动 Gateway(网关) 方法仍应避免使用保留的核心管理命名空间，例如
`config.*` 或 `update.*`。

**`setupEntry` 不应包含的内容：**

- CLI 注册
- 后台服务
- 繁重的运行时导入（加密、SDK）
- 仅在启动后需要的 Gateway(网关) 方法

### 窄范围安装助手导入

对于仅涉及安装的“热”路径，如果您只需要部分安装界面，请优先使用窄范围安装助手接口，而非更广泛的
`plugin-sdk/setup` 总集：

| 导入路径                           | 用于                                                         | 主要导出                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 安装时运行时助手，在 `setupEntry` / 延迟渠道启动期间保持可用 | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 感知环境的账户设置适配器                                     | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | setup/install CLI/归档/文档 帮助程序                         | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

当您想要完整的共享设置工具箱（包括配置修补帮助程序，如 `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，请使用更广泛的 `plugin-sdk/setup` 接缝。

设置修补适配器在导入时保持热路径安全。其打包的单账户推广合约面查找是惰性的，因此导入 `plugin-sdk/setup-runtime` 不会在适配器实际使用之前急切加载打包的合约面发现。

### 渠道拥有的单账户推广

当渠道从单账户顶级配置升级到 `channels.<id>.accounts.*` 时，默认的共享行为是将推广的账户范围值移动到 `accounts.default` 中。

打包的渠道可以通过其设置合约面缩小或覆盖该推广：

- `singleAccountKeysToMove`: 应该移动到推广账户中的额外顶级键
- `namedAccountPromotionKeys`: 当命名账户已经存在时，只有这些键会移动到推广账户中；共享的策略/传递键保留在渠道根目录中
- `resolveSingleAccountPromotionTarget(...)`: 选择哪个现有账户接收推广值

Matrix 是当前打包的示例。如果恰好存在一个命名的 Matrix 账户，或者如果 `defaultAccount` 指向现有的非规范键（例如 `Ops`），推广将保留该账户，而不是创建新的 `accounts.default` 条目。

## 配置架构

插件配置会根据清单中的 JSON 架构进行验证。用户通过以下方式配置插件：

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

使用来自 `openclaw/plugin-sdk/core` 的 `buildChannelConfigSchema` 将 Zod 架构转换为 OpenClaw 验证所需的 `ChannelConfigSchema` 包装器：

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

渠道插件可以为 `openclaw onboard` 提供交互式设置向导。
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
请参阅捆绑的插件包（例如 Discord 插件的 `src/channel.setup.ts`）以获取
完整示例。

对于只需要标准 `note -> prompt -> parse -> merge -> patch` 流程的
私信白名单提示，请优先使用 `openclaw/plugin-sdk/setup` 中的共享设置
帮助程序：`createPromptParsedAllowFromForAccount(...)`、
`createTopLevelChannelParsedAllowFromPrompt(...)` 和
`createNestedChannelParsedAllowFromPrompt(...)`。

对于仅在标签、分数和可选额外行上有所不同的渠道设置状态块，请
优先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每个
插件中手动编写相同的 `status` 对象。

对于应仅出现在特定上下文中的可选设置界面，请使用
`openclaw/plugin-sdk/channel-setup` 中的
`createOptionalChannelSetupSurface`：

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

`plugin-sdk/channel-setup` 还公开了底层的
`createOptionalChannelSetupAdapter(...)` 和
`createOptionalChannelSetupWizard(...)` 构建器，当您只需要
该可选安装界面的一半时可以使用它们。

生成的可选适配器/向导在实际配置写入时会失败关闭。它们
在 `validateInput`、
`applyAccountConfig` 和 `finalize` 之间复用一条需要安装的消息，并在设置了 `docsPath` 时
附加文档链接。

对于基于二进制文件的设置 UI，请优先使用共享的委托帮助程序，而不是
将相同的二进制/状态粘合代码复制到每个渠道中：

- `createDetectedBinaryStatus(...)` 用于仅因标签、提示、分数和二进制检测而不同的
  状态块
- `createCliPathTextInput(...)` 用于基于路径的文本输入
- `createDelegatedSetupWizardStatusResolvers(...)`,
  `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)`, and
  `createDelegatedResolveConfigured(...)` when `setupEntry` needs to forward to
  a heavier full wizard lazily
- `createDelegatedTextInputShouldPrompt(...)` when `setupEntry` only needs to
  delegate a `textInputs[*].shouldPrompt` decision

## 发布和安装

**外部插件：** 发布到 [ClawHub](/zh/tools/clawhub) 或 npm，然后安装：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 会首先尝试 ClawHub，并在失败时自动回退到 npm。您也可以显式强制使用 ClawHub：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

没有匹配的 `npm:` 覆盖。当您在 npm 回退后想要使用 npm 路径时，请使用普通的 ClawHub 包规范：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**仓库内插件：** 放置在打包插件的工作区树下，它们会在构建期间自动被发现。

**用户可以安装：**

```bash
openclaw plugins install <package-name>
```

<Info>对于来源于 npm 的安装，`openclaw plugins install` 运行 `npm install --ignore-scripts`（无生命周期脚本）。请保持插件依赖树为纯 JS/TS，并避免需要 `postinstall` 构建的包。</Info>

OpenClaw 拥有的内置插件是唯一的启动修复例外：当打包安装程序通过插件配置、旧版渠道配置或其内置的默认启用清单发现某个此类插件已启用时，会在导入之前启动安装该插件缺失的运行时依赖项。第三方插件不应依赖启动安装；请继续使用显式插件安装程序。

## 相关

- [SDK 入口点](/zh/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [插件清单](/zh/plugins/manifest) -- 完整的清单架构参考
- [构建插件](/zh/plugins/building-plugins) -- 分步入门指南
