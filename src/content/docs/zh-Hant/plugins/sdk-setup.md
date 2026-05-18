---
summary: "安裝精靈、setup-entry.ts、配置架構以及 package. 元數據"
title: "外掛設定與配置"
sidebarTitle: "設定與配置"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

關於外掛打包（`package.json` 元數據）、清單（`openclaw.plugin.json`）、設定條目和配置架構的參考資料。

<Tip>**尋找逐步教學？** 操作指南涵蓋了相關情境下的打包工作：[頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## 套件中繼資料

您的 `package.json` 需要一個 `openclaw` 欄位，用來告訴外掛系統您的插​​件提供什麼：

<Tabs>
  <Tab title="頻道外掛">
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
  </Tab>
  <Tab title="提供者外掛 / ClawHub 基準">
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
  </Tab>
</Tabs>

<Note>如果您在 ClawHub 上對外發布該外掛，則這些 `compat` 和 `build` 欄位是必填的。標準的發布片段位於 `docs/snippets/plugin-publish/` 中。</Note>

### `openclaw` 欄位

<ParamField path="extensions" type="string[]">
  入口點檔案（相對於套件根目錄）。
</ParamField>
<ParamField path="setupEntry" type="string">
  輕量級的僅設定入口（可選）。
</ParamField>
<ParamField path="channel" type="object">
  用於設定、選擇器、快速入門和狀態介面的頻道目錄中繼資料。
</ParamField>
<ParamField path="providers" type="string[]">
  由此外掛註冊的提供者 ID。
</ParamField>
<ParamField path="install" type="object">
  安裝提示：`npmSpec`、`localPath`、`defaultChoice`、`minHostVersion`、`expectedIntegrity`、`allowInvalidConfigRecovery`。
</ParamField>
<ParamField path="startup" type="object">
  啟動行為旗標。
</ParamField>

### `openclaw.channel`

`openclaw.channel` 是一種輕量級的套件中繼資料，用於在執行時期載入之前的頻道探索和設定介面。

| 欄位                                   | 類型       | 意義                                                     |
| -------------------------------------- | ---------- | -------------------------------------------------------- |
| `id`                                   | `string`   | 標準管道 ID。                                            |
| `label`                                | `string`   | 主要管道標籤。                                           |
| `selectionLabel`                       | `string`   | 當選擇器/設定標籤應與 `label` 不同時使用。               |
| `detailLabel`                          | `string`   | 次要詳細標籤，用於更豐富的管道目錄和狀態介面。           |
| `docsPath`                             | `string`   | 用於設定和選擇連結的文件路徑。                           |
| `docsLabel`                            | `string`   | 用於文件連結的覆寫標籤，當其應與管道 ID 不同時使用。     |
| `blurb`                                | `string`   | 簡短的上手/目錄描述。                                    |
| `order`                                | `number`   | 管道目錄中的排序順序。                                   |
| `aliases`                              | `string[]` | 用於管道選擇的額外查詢別名。                             |
| `preferOver`                           | `string[]` | 此通道應排序在優先級較低的插件/通道 ID 之前。            |
| `systemImage`                          | `string`   | 用於通道 UI 目錄的可選圖示/系統圖片名稱。                |
| `selectionDocsPrefix`                  | `string`   | 在選擇介面中，文件連結前的前綴文字。                     |
| `selectionDocsOmitLabel`               | `boolean`  | 在選擇複製中直接顯示文件路徑，而不是帶有標籤的文件連結。 |
| `selectionExtras`                      | `string[]` | 附加在選擇複製中的額外短字串。                           |
| `markdownCapable`                      | `boolean`  | 將此通道標記為支援 Markdown，以便進行輸出格式化決策。    |
| `exposure`                             | `object`   | 用於設定、已設定列表和文件介面的通道可見性控制。         |
| `quickstartAllowFrom`                  | `boolean`  | 將此頻道加入標準快速啟動 `allowFrom` 設定流程。          |
| `forceAccountBinding`                  | `boolean`  | 即使僅存在一個帳戶，也需要明確的帳戶綁定。               |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | 在解析此通道的通告目標時，優先使用會話查詢。             |

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

- `configured`：在已設定/狀態風格的列表介面中包含此頻道
- `setup`：在互動式設定/配置選擇器中包含此頻道
- `docs`：在文件/導覽介面中將此頻道標記為公開面向

<Note>`showConfigured` 和 `showInSetup` 仍作為舊版別名受到支援。建議優先使用 `exposure`。</Note>

### `openclaw.install`

`openclaw.install` 是套件元資料，而非清單元資料。

| 欄位                         | 類型                                | 含義                                                                 |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `clawhubSpec`                | `string`                            | 用於安裝/更新及新手入門隨需安裝流程的標準 ClawHub 規格。             |
| `npmSpec`                    | `string`                            | 用於安裝/更新備援流程的標準 npm 規格。                               |
| `localPath`                  | `string`                            | 本機開發或隨套件捆綁的安裝路徑。                                     |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | 當有多個來源可用時，偏好的安裝來源。                                 |
| `minHostVersion`             | `string`                            | 支援的最低 OpenClaw 版本，格式為 `>=x.y.z` 或 `>=x.y.z-prerelease`。 |
| `expectedIntegrity`          | `string`                            | 預期的 npm dist 完整性字串，通常為 `sha512-...`，用於固定安裝。      |
| `allowInvalidConfigRecovery` | `boolean`                           | 讓隨套件捆綁的外掛重新安裝流程能夠從特定的過時設定失敗中恢復。       |

<AccordionGroup>
  <Accordion title="Onboarding behavior">
    互動式引導也會針對按需安裝介面使用 `openclaw.install`。若您的外掛在執行時期載入前公開了提供者驗證選項或頻道設定/目錄中繼資料，引導程序可以顯示該選項，提示進行 ClawHub、npm 或本機安裝，安裝或啟用外掛，然後繼續選取的流程。ClawHub 引導選項使用 `clawhubSpec`，若存在則優先採用；npm 選項需要具有註冊表 `npmSpec` 的受信任目錄中繼資料；確切版本與 `expectedIntegrity` 是選用性的 npm 固定版本。若存在 `expectedIntegrity`，安裝/更新流程會針對 npm 強制執行它。請將「顯示內容」的中繼資料保留在 `openclaw.plugin.json` 中，並將「安裝方式」的中繼資料保留在 `package.json` 中。
  </Accordion>
  <Accordion title="minHostVersion enforcement">
    若已設定 `minHostVersion`，安裝與非捆綁的清單註冊表載入都會強制執行它。較舊的主機會跳過外部外掛；無效版本字串會被拒絕。捆綁的來源外掛假設與主機代碼版本一致。
  </Accordion>
  <Accordion title="Pinned npm installs">
    針對固定的 npm 安裝，請將確切版本保留在 `npmSpec` 中，並加上預期的成品完整性：

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

  </Accordion>
  <Accordion title="allowInvalidConfigRecovery scope">
    `allowInvalidConfigRecovery` 並非針對損壞設定的一般繞過機制。它僅用於狹窄的捆綁外掛恢復，因此重新安裝/設定可以修復已知的升級遺留問題，例如遺失的捆綁外掛路徑或同一外掛的過時 `channels.<id>` 項目。若設定因無關原因而損壞，安裝仍會封閉式失敗，並告知操作員執行 `openclaw doctor --fix`。
  </Accordion>
</AccordionGroup>

### 延遲完整載入

頻道外掛可以選擇加入延遲載入，方式如下：

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

啟用時，OpenClaw 在預聽取啟動階段僅載入 `setupEntry`，即使是針對已設定的頻道。完整的入口會在閘道開始聽取後才載入。

<Warning>僅當您的 `setupEntry` 在閘道開始聽取之前註冊了所有需要的內容（頻道註冊、HTTP 路由、閘道方法）時，才啟用延遲載入。如果完整的入口擁有必要的啟動能力，請保持預設行為。</Warning>

如果您的主要/完整入口註冊了閘道 RPC 方法，請將它們保留在外掛特定的前綴上。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍由核心擁有，並且總是解析為 `operator.admin`。

## 外掛清單

每個原生外掛都必須在套件根目錄中包含一個 `openclaw.plugin.json`。OpenClaw 使用它來在不執行外掛程式碼的情況下驗證配置。

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

即使是沒有配置的外掛也必須提供一個架構。空架構是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

完整的結構描述參考請參閱 [外掛程式清單](/zh-Hant/plugins/manifest)。

## ClawHub 發佈

對於外掛套件，請使用專用於套件的 ClawHub 指令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>僅適用於舊版技能的發佈別名是給技能使用的。外掛套件應始終使用 `clawhub package publish`。</Note>

## 設置入口

`setup-entry.ts` 檔案是 `index.ts` 的一個輕量級替代方案，當 OpenClaw 只需要設置介面（入職、配置修復、停用的頻道檢查）時會載入它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這可以避免在設置流程中載入繁重的執行時代碼（加密函式庫、CLI 註冊、背景服務）。

將設置安全的匯出保留在旁邊車模組中的捆綁工作區頻道，可以使用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)` 來代替 `defineSetupPluginEntry(...)`。該捆綁合約也支援可選的 `runtime` 匯出，以便設置時的執行時連線保持輕量級和明確。

<AccordionGroup>
  <Accordion title="當 OpenClaw 使用 setupEntry 而非完整入口時">
    - 頻道已停用但需要設定/入職介面。
    - 頻道已啟用但未設定。
    - 已啟用延遲載入 (`deferConfiguredChannelFullLoadUntilAfterListen`)。

  </Accordion>
  <Accordion title="setupEntry 必須註冊的內容">
    - 頻道外掛物件 (透過 `defineSetupPluginEntry`)。
    - 閘道監聽之前所需的任何 HTTP 路由。
    - 啟動期間所需的任何閘道方法。

    這些啟動時的閘道方法仍應避免使用保留的核心管理命名空間，例如 `config.*` 或 `update.*`。

  </Accordion>
  <Accordion title="setupEntry 不應包含的內容">
    - CLI 註冊。
    - 背景服務。
    - 重量級執行階段匯入 (加密、SDK)。
    - 僅在啟動後需要的閘道方法。

  </Accordion>
</AccordionGroup>

### 縮小設定輔助匯入範圍

對於僅用於快速設定的路徑，當您只需要設定介面的一部分時，優先使用較狹隘的設定輔助縫合 而非更廣泛的 `plugin-sdk/setup` 涵蓋範圍：

| 匯入路徑                           | 使用於                                                           | 主要匯出                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延遲頻道啟動中持續可用的設定時執行階段輔助程式 | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime`            | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                                                 |
| `plugin-sdk/setup-tools`           | 設定/安裝 CLI/封存/文件輔助程式                                  | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                                         |

當您需要完整的共享設定工具箱（包括諸如 `moveSingleAccountChannelSectionToDefaultAccount(...)` 等設定修補輔助工具）時，請使用更廣泛的 `plugin-sdk/setup` 縫合點。

請使用 `createSetupTranslator(...)` 來處理固定的設定精靈複本。它遵循 CLI 精靈地區設定（`OPENCLAW_LOCALE`，然後是系統地區設定變數），並在找不到時回退為英文。請將外掛程式專屬的設定文字保留在外掛程式擁有的程式碼中，並僅將共享目錄鍵用於通用設定標籤、狀態文字和官方隨附外掛程式的設定複本。

設定修補介面卡在匯入時保持熱路徑安全。其隨附的單一帳戶提升合約介面查詢是延遲的，因此匯入 `plugin-sdk/setup-runtime` 不會在實際使用介面卡之前急切地載入隨附的合約介面探索功能。

### 頻道擁有的單一帳戶提升

當頻道從單一帳戶頂層設定升級至 `channels.<id>.accounts.*` 時，預設的共享行為是將提升的帳戶範圍值移入 `accounts.default`。

隨附頻道可以透過其設定合約介面縮小或覆寫該提升行為：

- `singleAccountKeysToMove`：應移入被提升帳戶的額外頂層鍵
- `namedAccountPromotionKeys`：當已存在命名帳戶時，只有這些鍵會移入被提升的帳戶；共享的 policy/delivery 鍵保留在 channel 根層級
- `resolveSingleAccountPromotionTarget(...)`：選擇哪個現有帳戶接收被提升的值

<Note>Matrix 是當前內建的範例。如果已經存在一個命名的 Matrix 帳戶，或者如果 `defaultAccount` 指向一個現有的非正規鍵（例如 `Ops`），升級過程將保留該帳戶，而不是建立一個新的 `accounts.default` 項目。</Note>

## Config 結構描述

Plugin 配置會根據你 manifest 中的 JSON Schema 進行驗證。使用者透過以下方式配置插件：

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

你的插件會在註冊期間以 `api.pluginConfig` 的形式接收此配置。

對於 channel 特定的配置，請改用 channel config 區段：

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

使用 `buildChannelConfigSchema` 將 Zod schema 轉換為 plugin 擁有之配置工件所使用的 `ChannelConfigSchema` 包裝器：

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

如果你已經將合約撰寫為 JSON Schema 或 TypeBox，請使用直接輔助函式，以便 OpenClaw 可以在元數據路徑上跳過 Zod 到 JSON Schema 的轉換：

```typescript
import { Type } from "typebox";
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

對於第三方插件，冷路徑合約仍然是 plugin manifest：將生成的 JSON Schema 鏡像到 `openclaw.plugin.json#channelConfigs`，以便配置 schema、設定和 UI 介面可以在不載入執行時代碼的情況下檢查 `channels.<id>`。

## 設定精靈

Channel 插件可以為 `openclaw onboard` 提供互動式設定精靈。精靈是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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

`ChannelSetupWizard` 類型支援 `credentials`、`textInputs`、`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等。請參閱內建的插件套件（例如 Discord 插件的 `src/channel.setup.ts`）以獲得完整範例。

<AccordionGroup>
  <Accordion title="Shared allowFrom prompts">
    對於只需要標準 `note -> prompt -> parse -> merge -> patch` 流程的 DM 許可清單提示，建議優先使用 `openclaw/plugin-sdk/setup` 中的共用設定輔助函式：`createPromptParsedAllowFromForAccount(...)`、`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。
  </Accordion>
  <Accordion title="Standard channel setup status">
    對於僅在標籤、評分和可選額外行數上有所不同的頻道設定狀態區塊，建議優先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每個外掛程式中手動編寫相同的 `status` 物件。
  </Accordion>
  <Accordion title="Optional channel setup surface">
    對於應僅出現在某些特定語境中的可選設定介面，請使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

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

    產生的可選介面卡/精靈在實際設定寫入時會預設封閉（失敗）。它們會在 `validateInput`、`applyAccountConfig` 和 `finalize` 之間重複使用同一個需要安裝的訊息，並在設定 `docsPath` 時附加文件連結。

  </Accordion>
  <Accordion title="Binary-backed setup helpers">
    對於二進制支援的設定 UI，優先使用共用的委派助手，而不是將相同的二進制/狀態膠水代碼複製到每個頻道：

    - `createDetectedBinaryStatus(...)` 用於僅標籤、提示、評分和二進制檢測不同的狀態區塊
    - `createCliPathTextInput(...)` 用於基於路徑的文字輸入
    - 當 `setupEntry` 需要延遲轉發到較重的完整精靈時，使用 `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)`
    - 當 `setupEntry` 只需要委派 `textInputs[*].shouldPrompt` 決策時，使用 `createDelegatedTextInputShouldPrompt(...)`

  </Accordion>
</AccordionGroup>

## 發布與安裝

**外掛插件：** 發布到 [ClawHub](/zh-Hant/clawhub)，然後安裝：

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    純套件規範會在啟動切換期間從 npm 安裝。

  </Tab>
  <Tab title="ClawHub only">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="npm package spec">
    當套件尚未移至 ClawHub，或您在遷移期間需要
    直接的 npm 安裝路徑時，請使用 npm：

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**倉庫內插件：** 將其放置在捆綁的插件工作區樹下，它們會在建置期間自動被發現。

**使用者可以安裝：**

```bash
openclaw plugins install <package-name>
```

<Info>對於來自 npm 的安裝，`openclaw plugins install` 會將套件安裝在 `~/.openclaw/npm` 下，並停用生命週期腳本。請保持插件依賴樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

<Note>Gateway 啟動不會安裝插件依賴。npm/git/ClawHub 安裝流程負責依賴收斂；本地插件必須已安裝其依賴。</Note>

打包的套件中繼資料是明確的，而非在閘道啟動時根據建置的 JavaScript 推斷。執行階段相依性屬於擁有它們的外掛程式套件；打包的 OpenClaw 啟動程序從不修復或鏡像外掛程式相依性。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 逐步入門指南
- [外掛程式清單](/zh-Hant/plugins/manifest) — 完整的清單架構參考
- [SDK 進入點](/zh-Hant/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry`
