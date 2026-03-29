---
title: "Plugin Setup and Config"
sidebarTitle: "Setup and Config"
summary: "Setup wizards, setup-entry.ts, config schemas, and package. metadata"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Plugin Setup and Config

Plugin packaging (`package.json` metadata)、manifests
(`openclaw.plugin.json`)、setup entries 與 config schemas 的參考資料。

<Tip>**尋找逐步指南？** 操作指南涵蓋了相關情境下的 packaging：[Channel Plugins](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [Provider Plugins](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## Package metadata

您的 `package.json` 需要一個 `openclaw` 欄位，用來告訴 plugin system
您的 plugin 提供什麼：

**Channel plugin:**

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

**Provider plugin:**

```json
{
  "name": "@myorg/openclaw-my-provider",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "providers": ["my-provider"]
  }
}
```

### `openclaw` 欄位

| 欄位         | 類型       | 說明                                                                                       |
| ------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `extensions` | `string[]` | Entry point files (相對於 package 根目錄)                                                  |
| `setupEntry` | `string`   | 輕量級的僅用於 setup 的 entry (選用)                                                       |
| `channel`    | `object`   | Channel metadata: `id`, `label`, `blurb`, `selectionLabel`, `docsPath`, `order`, `aliases` |
| `providers`  | `string[]` | 由此 plugin 註冊的 provider ids                                                            |
| `install`    | `object`   | 安裝提示: `npmSpec`, `localPath`, `defaultChoice`                                          |
| `startup`    | `object`   | 啟動行為標誌                                                                               |

### Deferred full load

Channel plugins 可以選擇透過以下方式啟用 deferred loading：

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

啟用後，OpenClaw 在 pre-listen 啟動階段只會載入 `setupEntry`，即使是已配置的 channels 也一樣。完整的 entry 會在 gateway 開始 listening 後才載入。

<Warning>僅當您的 `setupEntry` 在閘道開始監聽之前註冊了閘道所需的一切（通道註冊、HTTP 路由、閘道方法）時，才啟用延遲載入。如果完整入口擁有必要的啟動功能，請保持預設行為。</Warning>

## Plugin manifest

每個原生插件都必須在套件根目錄中包含一個 `openclaw.plugin.json`。
OpenClaw 使用它來驗證配置，而無需執行插件代碼。

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

對於通道插件，請新增 `kind` 和 `channels`：

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

即使沒有配置的插件也必須提供 Schema。空的 Schema 是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

請參閱 [Plugin Manifest](/en/plugins/manifest) 以取得完整的 Schema 參考。

## Setup entry

`setup-entry.ts` 檔案是 `index.ts` 的一個輕量級替代方案，
當 OpenClaw 僅需要設置介面（上架、配置修復、
停用通道檢查）時會載入它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這避免了在設置流程期間載入繁重的執行時代碼（加密庫、CLI 註冊、
背景服務）。

**當 OpenClaw 使用 `setupEntry` 而非完整入口時：**

- 通道已停用但需要設置/上架介面
- 通道已啟用但未配置
- 已啟用延遲載入 (`deferConfiguredChannelFullLoadUntilAfterListen`)

**`setupEntry` 必須註冊的內容：**

- 通道插件物件（透過 `defineSetupPluginEntry`）
- 閘道監聽前所需的任何 HTTP 路由
- 啟動期間所需的任何閘道方法

**`setupEntry` 不應包含的內容：**

- CLI 註冊
- 背景服務
- 繁重的執行時間匯入 (crypto、SDK)
- 僅在啟動後需要的閘道方法

## Config schema

插件配置會根據您 manifest 中的 JSON Schema 進行驗證。使用者
透過以下方式配置插件：

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

您的插件會在註冊期間將此配置作為 `api.pluginConfig` 接收。

對於通道特定配置，請改用通道配置區段：

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

### Building channel config schemas

使用 `openclaw/plugin-sdk/core` 中的 `buildChannelConfigSchema` 將
Zod schema 轉換為 OpenClaw 驗證的 `ChannelConfigSchema` 包裝器：

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

## Setup wizards

通道外掛可以為 `openclaw onboard` 提供互動式安裝嚮導。
該嚮導是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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

`ChannelSetupWizard` 類型支援 `credentials`、`textInputs`、
`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等。
請參閱隨附的外掛（例如 `extensions/discord/src/channel.setup.ts`）以取得
完整範例。

對於僅需要標準 `note -> prompt -> parse -> merge -> patch` 流程的 DM 允許清單提示，
請優先使用來自 `openclaw/plugin-sdk/setup` 的共享安裝
輔助程式：`createPromptParsedAllowFromForAccount(...)`、
`createTopLevelChannelParsedAllowFromPrompt(...)` 和
`createNestedChannelParsedAllowFromPrompt(...)`。

對於僅在標籤、評分和可選額外行數上有所不同的通道安裝狀態區塊，
請優先使用來自 `openclaw/plugin-sdk/setup` 的 `createStandardChannelSetupStatus(...)`，
而不是在每個外掛中手動編寫相同的 `status` 物件。

對於應僅出現在特定語境中的可選安裝介面，請使用
來自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface`：

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

## 發佈與安裝

**外部外掛：** 發佈到 [ClawHub](/en/tools/clawhub) 或 npm，然後安裝：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 會先嘗試 ClawHub，然後自動回退到 npm。您也可以
強制指定特定來源：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**存放庫內外掛：** 放置在 `extensions/` 下，它們將在建置期間
自動被發現。

**使用者可以瀏覽並安裝：**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>對於來自 npm 的安裝，`openclaw plugins install` 會執行 `npm install --ignore-scripts`（不執行生命週期腳本）。請保持外掛依賴樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

## 相關

- [SDK 進入點](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [外掛清單](/en/plugins/manifest) -- 完整的清單架構參考
- [建置外掛](/en/plugins/building-plugins) -- 逐步入門指南
