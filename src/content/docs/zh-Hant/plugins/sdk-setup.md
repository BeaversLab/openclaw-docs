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

Plugin packaging (`package.json` metadata)、manifest
(`openclaw.plugin.json`)、setup entries 與 config schemas 的參考資料。

<Tip>**尋找逐步教學？** 操作指南涵蓋了相關的打包內容： [通道外掛](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者外掛](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## Package metadata

您的 `package.json` 需要一個 `openclaw` 欄位，用來告訴 plugin system 您的
plugin 提供什麼：

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

如果您在 ClawHub 上對外發布此 plugin，則那些 `compat` 與 `build`
欄位是必填的。標準的發布片段位於
`docs/snippets/plugin-publish/`。

### `openclaw` fields

| 欄位         | 類型       | 說明                                                                                                   |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| `extensions` | `string[]` | 進入點檔案（相對於套件根目錄）                                                                         |
| `setupEntry` | `string`   | 輕量級僅設定進入點（選填）                                                                             |
| `channel`    | `object`   | Channel catalog metadata for setup, picker, quickstart, and status surfaces                            |
| `providers`  | `string[]` | 由此外掛註冊的提供者 ID                                                                                |
| `install`    | `object`   | Install hints: `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `allowInvalidConfigRecovery` |
| `startup`    | `object`   | 啟動行為標誌                                                                                           |

### `openclaw.channel`

`openclaw.channel` 是廉價的 package metadata，用於 runtime 載入之前的
discovery 與 setup surfaces。

| Field                                  | Type       | What it means                                                |
| -------------------------------------- | ---------- | ------------------------------------------------------------ |
| `id`                                   | `string`   | Canonical channel id.                                        |
| `label`                                | `string`   | Primary channel label.                                       |
| `selectionLabel`                       | `string`   | 當應與 `label` 不同時使用的選擇器/設定標籤。                 |
| `detailLabel`                          | `string`   | 用於更豐富的頻道目錄和狀態介面的次要詳細資訊標籤。           |
| `docsPath`                             | `string`   | 用於設定和選擇連結的文件路徑。                               |
| `docsLabel`                            | `string`   | 當應與頻道 ID 不同時，覆寫用於文件連結的標籤。               |
| `blurb`                                | `string`   | 簡短的入門/目錄描述。                                        |
| `order`                                | `number`   | 在頻道目錄中的排序順序。                                     |
| `aliases`                              | `string[]` | 用於頻道選擇的額外查詢別名。                                 |
| `preferOver`                           | `string[]` | 此頻道應排名在前的較低優先級外掛/頻道 ID。                   |
| `systemImage`                          | `string`   | 用於頻道 UI 目錄的選用圖示/系統影像名稱。                    |
| `selectionDocsPrefix`                  | `string`   | 選擇介面中文件連結前的前置文字。                             |
| `selectionDocsOmitLabel`               | `boolean`  | 在選擇複製內容中直接顯示文件路徑，而不是帶有標籤的文件連結。 |
| `selectionExtras`                      | `string[]` | 附加在選擇複製內容中的額外短字串。                           |
| `markdownCapable`                      | `boolean`  | 將頻道標記為支援 Markdown，以便進行輸出格式設定決策。        |
| `exposure`                             | `object`   | 用於設定、已設定列表和文件介面的頻道可見度控制項。           |
| `quickstartAllowFrom`                  | `boolean`  | 將此頻道加入標準快速入門 `allowFrom` 設定流程。              |
| `forceAccountBinding`                  | `boolean`  | 即使僅存在一個帳戶，也要求明確的帳戶綁定。                   |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | 在解析此頻道的通告目標時，優先使用工作階段查詢。             |

範例：

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

`exposure` 支援：

- `configured`：在已配置/狀態式清單介面中包含此通道
- `setup`：在互動式設定/配置選擇器中包含此通道
- `docs`：將此通道在文件/導覽介面中標記為公開

`showConfigured` 和 `showInSetup` 仍作為舊版別名受到支援。建議優先使用
`exposure`。

### `openclaw.install`

`openclaw.install` 是套件元數據，而非清單元數據。

| 欄位                         | 類型                 | 含義                                                       |
| ---------------------------- | -------------------- | ---------------------------------------------------------- |
| `npmSpec`                    | `string`             | 用於安裝/更新流程的標準 npm 規範。                         |
| `localPath`                  | `string`             | 本機開發或打包安裝路徑。                                   |
| `defaultChoice`              | `"npm"` \| `"local"` | 當兩者都可用時首選的安裝來源。                             |
| `minHostVersion`             | `string`             | 支援的最低 OpenClaw 版本，格式為 `>=x.y.z`。               |
| `allowInvalidConfigRecovery` | `boolean`            | 允許打包外掛程式的重新安裝流程從特定的過時配置失敗中恢復。 |

如果設定了 `minHostVersion`，安裝和清單註冊表載入都會強制執行
它。較舊的主機會跳過此外掛；無效的版本字串會被拒絕。

`allowInvalidConfigRecovery` 並非繞過損壞配置的通用方法。它
僅用於狹窄的打包外掛恢復，以便重新安裝/設定可以修復已知的
升級殘留問題，例如缺少的打包外掛路徑或同一外掛的過時 `channels.<id>`
項目。如果配置因無關原因損壞，安裝
仍然會失敗並告訴操作員執行 `openclaw doctor --fix`。

### 延遲完整載入

通道外掛可以選擇加入延遲載入，方式如下：

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

啟用後，即使在已配置的通道上，OpenClaw 也僅在預監聽啟動
階段載入 `setupEntry`。完整項目會在
閘道開始監聽後載入。

<Warning>僅當您的 `setupEntry` 在閘道開始監聽之前（通道註冊、HTTP 路由、 閘道方法）註冊了閘道所需的所有內容時，才啟用延遲載入。如果完整入口擁有必要的啟動 能力，請保持預設行為。</Warning>

如果您的設定/完整入口註冊了閘道 RPC 方法，請將其保留在特定於外掛的前綴上。
保留的核心管理命名空間（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）
保持核心擁有，並且始終解析為 `operator.admin`。

## 外掛清單

每個原生外掛必須在套件根目錄中提供 `openclaw.plugin.json`。
OpenClaw 使用它在不執行外掛程式碼的情況下驗證設定。

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

對於通道外掛，新增 `kind` 和 `channels`：

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

即使沒有設定的外掛也必須提供架構。空架構是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

請參閱 [外掛清單](/en/plugins/manifest) 以取得完整的架構參考。

## ClawHub 發布

對於外掛套件，請使用特定於套件的 ClawHub 指令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

舊的僅限技能的發布別名是用於技能的。外掛套件應始終
使用 `clawhub package publish`。

## 設定入口

`setup-entry.ts` 檔案是 `index.ts` 的輕量級替代方案，
當 OpenClaw 僅需要設定介面（入職、設定修復、停用通道檢查）時，會載入此檔案。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這避免了在設定流程中載入繁重的執行時代碼（加密庫、CLI 註冊、
背景服務）。

將設定安全的匯出保留在附屬模組中的捆綁工作區通道可以使用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)` 來代替 `defineSetupPluginEntry(...)`。該捆綁合約也支援可選的 `runtime` 匯出，以便設定階段的執行時期接線保持輕量且明確。

**當 OpenClaw 使用 `setupEntry` 而非完整入口時：**

- 通道已停用但需要設定/入門介面
- 通道已啟用但未設定
- 延遲載入已啟用 (`deferConfiguredChannelFullLoadUntilAfterListen`)

**`setupEntry` 必須註冊的內容：**

- 通道外掛物件 (透過 `defineSetupPluginEntry`)
- 在閘道接聽之前所需的任何 HTTP 路由
- 啟動期間所需的任何閘道方法

這些啟動閘道方法仍應避免保留的核心管理命名空間，例如 `config.*` 或 `update.*`。

**`setupEntry` 不應包含的內容：**

- CLI 註冊
- 背景服務
- 繁重的執行時期匯入 (加密、SDK)
- 僅在啟動後需要的閘道方法

### 狹窄的設定輔助匯入

對於僅限設定的熱路徑，當您只需要部分設定介面時，請優先使用狹窄的設定輔助接縫，而非更廣泛的 `plugin-sdk/setup` 總稱：

| 匯入路徑                           | 使用於                                                             | 主要匯出                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延遲通道啟動中保持可用的設定階段執行時期輔助工具 | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 感知環境的帳戶設定配接器                                           | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | setup/install CLI/archive/docs helpers                             | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

當您需要完整的共用設定工具箱，包括 `moveSingleAccountChannelSectionToDefaultAccount(...)` 等設定修補 (config-patch) 輔助函式時，請使用更廣泛的 `plugin-sdk/setup` 縫合 (seam)。

設定修補 (setup patch) 介面卡在匯入時保持熱路徑 (hot-path) 安全。其內建 (bundled) 的單一帳戶升級合約介面查詢是延遲的 (lazy)，因此匯入 `plugin-sdk/setup-runtime` 不會在實際使用介面卡之前急切地載入內建的合約介面探索功能。

### 頻道擁有的單一帳戶升級

當頻道從單一帳戶頂層設定升級到 `channels.<id>.accounts.*` 時，預設的共用行為是將升級的帳戶範圍值移入 `accounts.default`。

內建頻道可以透過其設定合約介面縮小或覆寫該升級行為：

- `singleAccountKeysToMove`：應移入升級帳戶的額外頂層金鑰
- `namedAccountPromotionKeys`：當具名帳戶已存在時，只有這些金鑰會移入升級帳戶；共用的原則/傳遞金鑰保留在頻道根目錄
- `resolveSingleAccountPromotionTarget(...)`：選擇哪個現有帳戶接收升級的值

Matrix 是目前的內建範例。如果剛好存在一個具名的 Matrix 帳戶，或者如果 `defaultAccount` 指向一個現有的非正式金鑰 (non-canonical key)，例如 `Ops`，則升級會保留該帳戶，而不是建立新的 `accounts.default` 項目。

## Config schema

外掛程式設定會根據您資訊清單中的 JSON Schema 進行驗證。使用者透過以下方式設定外掛程式：

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

您的外掛程式會在註冊期間以 `api.pluginConfig` 的形式接收此設定。

對於特定頻道的設定，請改用頻道設定區段：

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

使用來自 `openclaw/plugin-sdk/core` 的 `buildChannelConfigSchema` 將 Zod schema 轉換為 OpenClaw 驗證的 `ChannelConfigSchema` 包裝函式：

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

頻道外掛可以為 `openclaw onboard` 提供互動式安裝精靈。
精靈是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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
`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等等。
請參閱隨附的外掛套件（例如 Discord 外掛的 `src/channel.setup.ts`）以取得
完整範例。

對於只需要標準 `note -> prompt -> parse -> merge -> patch` 流程的
DM 允許清單提示，請優先使用來自 `openclaw/plugin-sdk/setup` 的共用安裝
輔助程式：`createPromptParsedAllowFromForAccount(...)`、
`createTopLevelChannelParsedAllowFromPrompt(...)` 和
`createNestedChannelParsedAllowFromPrompt(...)`。

對於僅在標籤、分數和選用
額外行有所不同頻道安裝狀態區塊，請優先使用來自
`openclaw/plugin-sdk/setup` 的 `createStandardChannelSetupStatus(...)`，而不是在
每個外掛中手動組合相同的 `status` 物件。

對於應僅出現在某些情境中的選用安裝介面，請使用
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

當您僅需要該選用安裝介面的一半時，
`plugin-sdk/channel-setup` 也會公開較低層級的
`createOptionalChannelSetupAdapter(...)` 和
`createOptionalChannelSetupWizard(...)` 建構器。

產生的選用轉接器/精靈對於真實的配置寫入會採取「封閉式失敗」（fail closed）。它們
在 `validateInput`、
`applyAccountConfig` 和 `finalize` 之間重複使用一個需要安裝的訊息，並在設定 `docsPath` 時附加文件連結。

對於由二進位檔案支援的安裝 UI，請優先使用共用的委派輔助程式，而不是
將相同的二進位檔案/狀態膠水程式碼複製到每個頻道：

- `createDetectedBinaryStatus(...)` 適用於僅在標籤、
  提示、分數和二進位檔案偵測上有所不同的狀態區塊
- `createCliPathTextInput(...)` 適用於由路徑支援的文字輸入
- 當 `setupEntry` 需要延遲轉發到更完整的精靈時使用
  `createDelegatedSetupWizardStatusResolvers(...)`、
  `createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和
  `createDelegatedResolveConfigured(...)`
- 當 `setupEntry` 僅需要
  委派一個 `textInputs[*].shouldPrompt` 決策時使用
  `createDelegatedTextInputShouldPrompt(...)`

## 發布與安裝

**外掛外掛：**發布至 [ClawHub](/en/tools/clawhub) 或 npm，然後安裝：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 會優先嘗試 ClawHub，然後自動回退到 npm。您也可以
明確強制使用 ClawHub：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

沒有對應的 `npm:` 覆寫。當您希望在 ClawHub 回退後使用 npm 路徑時，
請使用標準的 npm 套件規格：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**程式庫內外掛：**放置於打包的外掛工作區樹下，它們將在建置過程中
自動被發現。

**使用者可以安裝：**

```bash
openclaw plugins install <package-name>
```

<Info>對於來自 npm 的安裝，`openclaw plugins install` 會執行 `npm install --ignore-scripts`（無生命週期腳本）。請保持外掛依賴 樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

## 相關

- [SDK Entry Points](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [Plugin Manifest](/en/plugins/manifest) -- 完整的 Manifest 結構描述參考
- [Building Plugins](/en/plugins/building-plugins) -- 逐步入門指南
