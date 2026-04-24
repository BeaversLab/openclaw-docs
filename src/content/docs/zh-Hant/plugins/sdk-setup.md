---
title: "外掛程式設定與設定"
sidebarTitle: "設定與設定"
summary: "設定精靈、setup-entry.ts、設定結構描述以及 package. 中繼資料"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Plugin Setup and Config

外掛程式打包（`package.json` 中繼資料）、清單
（`openclaw.plugin.json`）、設定項目與設定結構描述的參考資料。

<Tip>**正在尋找逐步指南？** 操作指南內容涵蓋了打包相關主題： [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## Package metadata

您的 `package.json` 需要一個 `openclaw` 欄位，以告訴外掛程式系統
您的外掛程式提供了什麼：

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

如果您在 ClawHub 上對外發佈外掛程式，則需要這些 `compat` 和 `build`
欄位。標準的發佈程式碼片段位於
`docs/snippets/plugin-publish/`。

### `openclaw` 欄位

| 欄位         | 類型       | 說明                                                                                                                   |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | 進入點檔案（相對於套件根目錄）                                                                                         |
| `setupEntry` | `string`   | 輕量級僅設定進入點（選填）                                                                                             |
| `channel`    | `object`   | Channel catalog metadata for setup, picker, quickstart, and status surfaces                                            |
| `providers`  | `string[]` | 由此外掛註冊的提供者 ID                                                                                                |
| `install`    | `object`   | 安裝提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery` |
| `startup`    | `object`   | 啟動行為標誌                                                                                                           |

### `openclaw.channel`

`openclaw.channel` 是廉價的套件中繼資料，用於在執行時間載入之前進行頻道探索和設定介面顯示。

| Field                                  | Type       | What it means                                                |
| -------------------------------------- | ---------- | ------------------------------------------------------------ |
| `id`                                   | `string`   | Canonical channel id.                                        |
| `label`                                | `string`   | Primary channel label.                                       |
| `selectionLabel`                       | `string`   | 選擇器/設定標籤，當其應與 `label` 不同時使用。               |
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
| `quickstartAllowFrom`                  | `boolean`  | 選擇此頻道加入標準快速入門 `allowFrom` 設定流程。            |
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

- `configured`：將頻道包含在設定/狀態式列表介面中
- `setup`：將頻道包含在互動式設定/配置選擇器中
- `docs`：將頻道標記為文件/導覽介面中的公開項目

`showConfigured` 和 `showInSetup` 仍作為舊版別名受到支援。建議優先使用
`exposure`。

### `openclaw.install`

`openclaw.install` 是套件元資料，而非清單元資料。

| 欄位                         | 類型                 | 含義                                                            |
| ---------------------------- | -------------------- | --------------------------------------------------------------- |
| `npmSpec`                    | `string`             | 用於安裝/更新流程的標準 npm 規範。                              |
| `localPath`                  | `string`             | 本機開發或打包安裝路徑。                                        |
| `defaultChoice`              | `"npm"` \| `"local"` | 當兩者都可用時首選的安裝來源。                                  |
| `minHostVersion`             | `string`             | 最低支援的 OpenClaw 版本，格式為 `>=x.y.z`。                    |
| `expectedIntegrity`          | `string`             | 預期的 npm dist 完整性字串，通常是 `sha512-...`，用於鎖定安裝。 |
| `allowInvalidConfigRecovery` | `boolean`            | 讓 bundled-plugin 重新安裝流程能從特定的過時配置失敗中恢復。    |

互動式入門導覽也會在按需安裝介面中使用 `openclaw.install`。如果您的外掛在執行時期載入之前就公開了提供者驗證選項或頻道設定/目錄中繼資料，入門導覽可以顯示該選項，提示選擇 npm 或本機安裝，安裝或啟用外掛，然後繼續選取的流程。Npm 入門選項需要具有註冊表 `npmSpec` 的受信任目錄中繼資料；確切版本和 `expectedIntegrity` 是可選的鎖定。如果存在 `expectedIntegrity`，安裝/更新流程會強制執行它。請將「顯示什麼」的中繼資料保留在 `openclaw.plugin.json` 中，並將「如何安裝」的中繼資料保留在 `package.json` 中。

如果設定了 `minHostVersion`，安裝和清單註冊表載入都會強制執行它。較舊的主機會跳過該外掛；無效的版本字串會被拒絕。

對於鎖定的 npm 安裝，請將確切版本保留在 `npmSpec` 中並新增預期的構建完整性：

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

`allowInvalidConfigRecovery` 並非針對損壞配置的通用繞過方式。它僅用於狹窄的 bundled-plugin 復原，以便重新安裝/設定可以修復已知的升級遺留問題，例如缺少的 bundled plugin 路徑或同一外掛的過時 `channels.<id>` 條目。如果配置因無關原因而損壞，安裝仍會失敗並告知操作員執行 `openclaw doctor --fix`。

### 延遲完整載入

頻道外掛可以選擇透過以下方式進行延遲載入：

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

啟用後，OpenClaw 在預先監聽啟動階段期間僅載入 `setupEntry`，即使對於已設定的頻道也是如此。完整條目會在閘道開始監聽之後載入。

<Warning>只有當您的 `setupEntry` 在閘道開始監聽之前註冊了閘道所需的所有內容（頻道註冊、HTTP 路由、閘道方法）時，才啟用延遲載入。如果完整條目擁有必要的啟動功能，請保留預設行為。</Warning>

如果您的設置/完整入口註冊了網關 RPC 方法，請將其保留在
外掛特定的前綴上。保留的核心管理命名空間（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）歸核心所有，並始終解析為
`operator.admin`。

## 外掛清單

每個原生外掛都必須在套件根目錄中包含一個 `openclaw.plugin.json`。
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

對於頻道外掛，請新增 `kind` 和 `channels`：

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

即使沒有配置的外掛也必須提供一個 Schema。空的 Schema 是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

請參閱 [外掛清單](/zh-Hant/plugins/manifest) 以取得完整的 Schema 參考。

## ClawHub 發布

對於外掛套件，請使用特定於套件的 ClawHub 指令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

舊版的僅限技能的發布別名是給技能使用的。外掛套件
應始終使用 `clawhub package publish`。

## 設置入口

`setup-entry.ts` 檔案是 `index.ts` 的一種輕量級替代方案，
當 OpenClaw 只需要設置介面（入門、配置修復、
停用的頻道檢查）時，它會載入此檔案。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這可以避免在設置流程中載入繁重的執行時代碼（加密庫、CLI 註冊、
背景服務）。

將設置安全的匯出保留在附屬模組中的捆綁工作區頻道，可以
使用來自
`openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)` 而非
`defineSetupPluginEntry(...)`。該捆綁契約也支援可選的
`runtime` 匯出，以便設置時的執行時連接保持輕量級和明確。

**當 OpenClaw 使用 `setupEntry` 而非完整入口時：**

- 頻道已停用，但需要設置/入門介面
- 頻道已啟用，但未配置
- 已啟用延遲載入（`deferConfiguredChannelFullLoadUntilAfterListen`）

**`setupEntry` 必須註冊的內容：**

- 頻道外掛物件（透過 `defineSetupPluginEntry`）
- 在網關監聽之前所需的任何 HTTP 路由
- 啟動期間所需的任何網關方法

那些啟動閘道方法仍應避免保留的核心管理命名空間，例如 `config.*` 或 `update.*`。

**`setupEntry` 不應包含的內容：**

- CLI 註冊
- 背景服務
- 繁重的執行時期匯入 (crypto, SDKs)
- 僅在啟動後需要的閘道方法

### 狹窄的設定輔助匯入

對於僅限熱設定的路徑，當您只需要設定介面的部分內容時，請優先選用狹窄的設定輔助接縫，而非更廣泛的 `plugin-sdk/setup` 涵蓋範圍：

| 匯入路徑                           | 使用於                                                             | 主要匯出項目                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延遲通道啟動中保持可用的設定時期執行時期輔助程式 | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 感知環境的帳戶設定配接器                                           | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | 設定/安裝 CLI/歸檔/文件輔助程式                                    | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR`                                                                                                                                                                                |

當您需要完整的共享設定工具箱（包括 `moveSingleAccountChannelSectionToDefaultAccount(...)` 等設定修補輔助程式）時，請使用更廣泛的 `plugin-sdk/setup` 接縫。

設定修補配接器在匯入時仍保持熱路徑安全。其內建的單一帳戶升級合約介面查詢是延遲的，因此在實際使用配接器之前，匯入 `plugin-sdk/setup-runtime` 並不會急切地載入內建的合約介面探索功能。

### 通道擁有的單一帳戶升級

當通道從單一帳戶頂層設定升級至 `channels.<id>.accounts.*` 時，預設的共享行為是將升級的帳戶範圍值移至 `accounts.default`。

內建通道可以透過其設定合約介面縮小或覆寫該升級行為：

- `singleAccountKeysToMove`：應該移入升級帳戶的額外頂層鍵
- `namedAccountPromotionKeys`：當命名帳戶已經存在時，只有這些鍵會移入升級帳戶；共享的 policy/delivery 鍵保留在 channel 根層級
- `resolveSingleAccountPromotionTarget(...)`：選擇哪個現有帳戶接收升級的值

Matrix 是當前捆綁的範例。如果剛好存在一個命名為 Matrix 的帳戶，或者如果 `defaultAccount` 指向一個現有的非規範鍵（例如 `Ops`），升級會保留該帳戶，而不是創建一個新的 `accounts.default` 項目。

## Config 結構描述

Plugin config 會根據您清單中的 JSON Schema 進行驗證。使用者透過以下方式配置插件：

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

您的插件會在註冊期間以 `api.pluginConfig` 形式接收此 config。

對於特定於頻道的 config，請改用 channel config 區段：

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

### 建構 channel config 結構描述

使用來自 `openclaw/plugin-sdk/core` 的 `buildChannelConfigSchema` 將 Zod schema 轉換為 OpenClaw 驗證的 `ChannelConfigSchema` 包裝器：

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

## Setup 精靈

Channel 插件可以為 `openclaw onboard` 提供互動式 setup 精靈。該精靈是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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

`ChannelSetupWizard` 類型支援 `credentials`、`textInputs`、`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等。請參閱捆綁的插件套件（例如 Discord 插件的 `src/channel.setup.ts`）以查看完整範例。

對於僅需要標準 `note -> prompt -> parse -> merge -> patch` 流程的 DM 允許清單提示，建議優先使用來自 `openclaw/plugin-sdk/setup` 的共享 setup 輔助程式：`createPromptParsedAllowFromForAccount(...)`、`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。

對於僅在標籤、評分和可選額外行方面不同的通道設定狀態區塊，請優先使用來自 `openclaw/plugin-sdk/setup` 的 `createStandardChannelSetupStatus(...)`，而不是在每個外掛程式中手動重複相同的 `status` 物件。

對於僅應出現在某些情境中的可選設定介面，請使用來自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface`：

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

當您只需要該可選安裝介面的一半時，`plugin-sdk/channel-setup` 也會公開較低層級的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 建構器。

產生的可選轉接器/精靈在實際設定寫入時預設為封閉失敗。它們在 `validateInput`、`applyAccountConfig` 和 `finalize` 之間重複使用同一個需要安裝的訊息，並在設定 `docsPath` 時附加文件連結。

對於由二進位檔案支援的設定 UI，請優先使用共用的委派輔助程式，而不是將相同的二進位檔案/狀態膠水程式碼複製到每個通道中：

- 對於僅在標籤、提示、評分和二進位偵測方面不同的狀態區塊，請使用 `createDetectedBinaryStatus(...)`
- 對於由路徑支援的文本輸入，請使用 `createCliPathTextInput(...)`
- 當 `setupEntry` 需要延遲轉發到較繁重的完整精靈時，請使用 `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)`
- 當 `setupEntry` 只需要委派 `textInputs[*].shouldPrompt` 決定時，請使用 `createDelegatedTextInputShouldPrompt(...)`

## 發佈與安裝

**外部外掛程式：** 發佈到 [ClawHub](/zh-Hant/tools/clawhub) 或 npm，然後安裝：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 會先嘗試 ClawHub，然後自動回退到 npm。您也可以明確強制使用 ClawHub：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

沒有對應的 `npm:` 覆寫。當您希望在 ClawHub 回退後使用 npm 路徑時，請使用正常的 npm 套件規格：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**存放庫內外掛程式：** 將其放置在捆綁外掛程式工作區樹下，它們會在建置期間自動被發現。

**使用者可以安裝：**

```bash
openclaw plugins install <package-name>
```

<Info>對於來自 npm 的安裝，`openclaw plugins install` 會執行 `npm install --ignore-scripts`（不執行生命週期腳本）。請保持外掛相依性樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

捆綁的 OpenClaw 擁有的外掛是唯一的啟動修復例外：當打包安裝透過外掛設定、舊版通道設定或其捆綁的預設啟用清單發現其中一個被啟用時，啟動程序會在匯入前安裝該外掛遺失的執行時期相依性。第三方外掛不應依賴啟動安裝；請繼續使用明確的外掛安裝程式。

## 相關

- [SDK Entry Points](/zh-Hant/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [Plugin Manifest](/zh-Hant/plugins/manifest) -- 完整的清單架構參考
- [Building Plugins](/zh-Hant/plugins/building-plugins) -- 逐步入門指南
