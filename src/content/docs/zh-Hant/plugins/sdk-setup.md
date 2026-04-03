---
title: "插件設定與配置"
sidebarTitle: "設定與配置"
summary: "設定精靈、setup-entry.ts、配置架構以及 package. 中繼資料"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Plugin Setup and Config

關於外掛打包（`package.json` 中繼資料）、資訊清單
（`openclaw.plugin.json`）、設定項目與配置架構的參考資料。

<Tip>**尋找逐步教學？** 操作指南涵蓋了相關情境下的打包流程： [頻道外掛](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) 與 [提供者外掛](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## Package metadata

您的 `package.json` 需要一個 `openclaw` 欄位，用來告訴外掛系統
您的外掛提供了什麼：

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

**提供者外掛 / ClawHub 發布基準：**

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

如果您要將外掛發布到外部的 ClawHub，那些 `compat` 和 `build`
欄位是必填的。標準的發布程式碼片段位於
`docs/snippets/plugin-publish/`。

### `openclaw` 欄位

| 欄位         | 類型       | 說明                                                                                   |
| ------------ | ---------- | -------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | 進入點檔案（相對於套件根目錄）                                                         |
| `setupEntry` | `string`   | 輕量級僅設定進入點（選填）                                                             |
| `channel`    | `object`   | 頻道中繼資料：`id`、`label`、`blurb`、`selectionLabel`、`docsPath`、`order`、`aliases` |
| `providers`  | `string[]` | 由此外掛註冊的提供者 ID                                                                |
| `install`    | `object`   | 安裝提示：`npmSpec`、`localPath`、`defaultChoice`                                      |
| `startup`    | `object`   | 啟動行為標誌                                                                           |

### 延遲完整載入

頻道外掛可以選擇加入延遲載入：

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

啟用後，OpenClaw 在預聽取啟動階段
即使對於已配置的通道，也僅載入 `setupEntry`。完整入口會在
閘道開始監聽後載入。

<Warning>僅當您的 `setupEntry` 在閘道開始監聽之前 註冊了閘道所需的一切（通道註冊、HTTP 路由、 閘道方法）時，才啟用延遲載入。如果完整入口擁有必要的啟動功能，請 保持預設行為。</Warning>

## 外掛清單

每個原生外掛都必須在套件根目錄中提供一個 `openclaw.plugin.json`。
OpenClaw 使用它在不執行外掛程式碼的情況下驗證配置。

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

對於通道外掛，請新增 `kind` 和 `channels`：

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

即使沒有配置的外掛也必須提供架構。空架構是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

請參閱 [Plugin Manifest](/en/plugins/manifest) 以取得完整的架構參考。

## ClawHub 發佈

對於外掛套件，請使用套件專屬的 ClawHub 指令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

舊版僅限技能的發佈別名適用於技能。外掛套件應
始終使用 `clawhub package publish`。

## 安裝入口

`setup-entry.ts` 檔案是 `index.ts` 的輕量級替代方案，
當 OpenClaw 僅需要安裝介面（上手引導、配置修復、
停用通道檢查）時會載入它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這可避免在安裝流程中載入繁重的執行時代碼（加密函式庫、CLI 註冊、
背景服務）。

**當 OpenClaw 使用 `setupEntry` 而非完整入口時：**

- 通道已停用但需要安裝/上手介面
- 通道已啟用但未配置
- 延遲載入已啟用 (`deferConfiguredChannelFullLoadUntilAfterListen`)

**`setupEntry` 必須註冊的內容：**

- 通道外掛物件 (透過 `defineSetupPluginEntry`)
- 閘道監聽之前所需的任何 HTTP 路由
- 啟動期間所需的任何閘道方法

**`setupEntry` 不應包含的內容：**

- CLI 註冊
- 背景服務
- 繁重的執行時匯入 (加密、SDK)
- 僅在啟動後需要的閘道方法

## 配置架構

外掛配置會根據您清單中的 JSON Schema 進行驗證。使用者
透過以下方式配置外掛：

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

您的外掛程式在註冊期間會收到此配置作為 `api.pluginConfig`。

對於特定頻道的配置，請改用頻道配置區段：

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

### 建構頻道配置架構

使用來自 `openclaw/plugin-sdk/core` 的 `buildChannelConfigSchema` 將 Zod 架構轉換為 OpenClaw 驗證的 `ChannelConfigSchema` 包裝器：

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

## 設定精靈

頻道外掛程式可以為 `openclaw onboard` 提供互動式設定精靈。
該精靈是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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

`ChannelSetupWizard` 型別支援 `credentials`、`textInputs`、
`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等。
請參閱隨附的外掛程式套件（例如 Discord 外掛程式的 `src/channel.setup.ts`）以取得
完整範例。

對於只需要標準
`note -> prompt -> parse -> merge -> patch` 流程的 DM 允許清單提示，請優先使用來自 `openclaw/plugin-sdk/setup` 的共享設定
協助程式：`createPromptParsedAllowFromForAccount(...)`、
`createTopLevelChannelParsedAllowFromPrompt(...)` 和
`createNestedChannelParsedAllowFromPrompt(...)`。

對於僅在標籤、分數和可選的額外行上有所不同
的頻道設定狀態區塊，請優先使用來自
`openclaw/plugin-sdk/setup` 的 `createStandardChannelSetupStatus(...)`，而不是在
每個外掛程式中手動編寫相同的 `status` 物件。

對於應僅出現在某些情境中的可選設定介面，請使用
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

**外部外掛程式：** 發佈至 [ClawHub](/en/tools/clawhub) 或 npm，然後安裝：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 會先嘗試 ClawHub，然後自動回退至 npm。您也可以
強制指定特定來源：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**存放庫內外掛程式：** 置於隨附外掛程式工作區樹下，它們將在建構期間
自動被發現。

**使用者可以瀏覽並安裝：**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>針對來自 npm 的安裝，`openclaw plugins install` 會執行 `npm install --ignore-scripts`（無生命週期腳本）。請保持外掛程式相依性樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

## 相關

- [SDK 入口點](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 與 `defineChannelPluginEntry`
- [外掛程式清單](/en/plugins/manifest) -- 完整的清單架構參考
- [建置外掛程式](/en/plugins/building-plugins) -- 逐步入門指南
