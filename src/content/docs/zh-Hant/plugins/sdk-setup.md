---
summary: "Setup wizards, setup-entry.ts, config schemas, and package. metadata"
title: "Plugin setup and config"
sidebarTitle: "Setup and config"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

關於外掛程式打包（`package.json` 中繼資料）、清單（`openclaw.plugin.json`）、設定項目及設定結構描述的參考資料。

<Tip>**尋找逐步指南？** 操作指南會說明相關情境下的打包：[頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## 套件中繼資料

您的 `package.json` 需要一個 `openclaw` 欄位，以告訴外掛程式系統您的外掛程式提供了什麼：

<Tabs>
  <Tab title="頻道外掛程式">
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
  <Tab title="提供者外掛程式 / ClawHub 基準">
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

<Note>如果您在 ClawHub 上對外發布外掛程式，則需要填寫那些 `compat` 和 `build` 欄位。正式的發布片段位於 `docs/snippets/plugin-publish/` 中。</Note>

### `openclaw` 欄位

<ParamField path="extensions" type="string[]">
  進入點檔案（相對於套件根目錄）。
</ParamField>
<ParamField path="setupEntry" type="string">
  輕量級僅設定進入點（選用）。
</ParamField>
<ParamField path="channel" type="object">
  用於設定、挑選器、快速入門和狀態介面的管道目錄元資料。
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

`openclaw.channel` 是在執行階段載入之前，用於管道探索和設定介面的低成本套件元資料。

| 欄位                                   | 類型       | 意義                                                     |
| -------------------------------------- | ---------- | -------------------------------------------------------- |
| `id`                                   | `string`   | 標準管道 ID。                                            |
| `label`                                | `string`   | 主要管道標籤。                                           |
| `selectionLabel`                       | `string`   | 挑選器/設定標籤，當其應與 `label` 不同時使用。           |
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
| `quickstartAllowFrom`                  | `boolean`  | 將此通道加入標準的快速入門 `allowFrom` 設定流程。        |
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

- `configured`：將通道包含在已設定/狀態風格的列表介面中
- `setup`：將通道包含在互動式設定/設定選擇器中
- `docs`：在文件/導覽介面中將通道標記為對外公開

<Note>`showConfigured` 和 `showInSetup` 仍作為舊版別名受到支援。建議優先使用 `exposure`。</Note>

### `openclaw.install`

`openclaw.install` 是套件元數據，而非清單元數據。

| 欄位                         | 類型                 | 含義                                                                |
| ---------------------------- | -------------------- | ------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | 用於安裝/更新流程的規範 npm 規範。                                  |
| `localPath`                  | `string`             | 本地開發或打包安裝路徑。                                            |
| `defaultChoice`              | `"npm"` \| `"local"` | 當兩者都可用時的首選安裝來源。                                      |
| `minHostVersion`             | `string`             | 最低支援的 OpenClaw 版本，格式為 `>=x.y.z`。                        |
| `expectedIntegrity`          | `string`             | 預期的 npm dist integrity 字串，通常為 `sha512-...`，用於固定安裝。 |
| `allowInvalidConfigRecovery` | `boolean`            | 允許打包插件重新安裝流程從特定的過時配置失敗中恢復。                |

<AccordionGroup>
  <Accordion title="Onboarding behavior">
    互動式入門也使用 `openclaw.install` 進行按需安裝介面。如果您的插件在運行時載入之前公開了提供者驗證選項或頻道設定/目錄元數據，入門可以顯示該選項，提示 npm 或本地安裝，安裝或啟用插件，然後繼續選定的流程。Npm 入門選項需要受信任的目錄元數據和註冊表 `npmSpec`；確切版本和 `expectedIntegrity` 是可選的固定值。如果存在 `expectedIntegrity`，安裝/更新流程會強制執行它。將「要顯示什麼」的元數據保留在 `openclaw.plugin.json` 中，將「如何安裝」的元數據保留在 `package.json` 中。
  </Accordion>
  <Accordion title="minHostVersion enforcement">
    如果設定了 `minHostVersion`，則安裝和清單註冊表載入都會強制執行它。舊的主機會跳過該插件；無效的版本字串會被拒絕。
  </Accordion>
  <Accordion title="Pinned npm installs">
    對於固定的 npm 安裝，請將確切版本保留在 `npmSpec` 中並新增預期的工件完整性：

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
    `allowInvalidConfigRecovery` 並非針對損毀設定的一般性繞過手段。它僅供特定情況下的捆綁外掛恢復使用，以便重新安裝/安裝程式能夠修復已知的升級遺留問題，例如遺失的捆綁外掛路徑或該外掛過時的 `channels.<id>` 項目。若設定因無關原因而損毀，安裝作業仍會失敗並告訴操作員執行 `openclaw doctor --fix`。
  </Accordion>
</AccordionGroup>

### 延遲完整載入

通道外掛可以選擇透過以下方式啟用延遲載入：

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

啟用後，OpenClaw 在預先監聽啟動階段僅載入 `setupEntry`，即使是已設定的通道也是如此。完整項目會在閘道開始監聽後才載入。

<Warning>只有在您的 `setupEntry` 在閘道開始監聽之前註冊了所有所需項目（通道註冊、HTTP 路由、閘道方法）時，才啟用延遲載入。如果完整項目擁有必要的啟動功能，請保持預設行為。</Warning>

如果您的安裝/完整項目註冊了閘道 RPC 方法，請將其保留在外掛專用的字首上。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）由核心擁有，並且一律解析為 `operator.admin`。

## 外掛清單

每個原生外掛必須在套件根目錄中提供一個 `openclaw.plugin.json`。OpenClaw 使用它來驗證設定，而無需執行外掛程式碼。

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

即使沒有設定的外掛也必須提供 Schema。空的 Schema 是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

請參閱 [Plugin manifest](/zh-Hant/plugins/manifest) 以取得完整的 Schema 參考。

## ClawHub 發布

對於外掛套件，請使用特定於套件的 ClawHub 指令：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>舊版的僅限技能發布別名是供技能使用的。外掛套件應一律使用 `clawhub package publish`。</Note>

## 安裝項目

`setup-entry.ts` 檔案是 `index.ts` 的一個輕量級替代方案，當 OpenClaw 只需要設定介面（上手、設定修復、停用的通道檢查）時會載入它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

這可以避免在設定流程中載入繁重的執行時代碼（加密庫、CLI 註冊、背景服務）。

將設定安全的匯出保持在副車模組中的打包工作區通道，可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)` 代替 `defineSetupPluginEntry(...)`。該打包約定也支援一個可選的 `runtime` 匯出，以便設定時期的執行時間連線保持輕量和明確。

<AccordionGroup>
  <Accordion title="何時 OpenClaw 使用 setupEntry 而非完整入口點">
    - 通道已停用但需要設定/上手介面。
    - 通道已啟用但未設定。
    - 已啟用延遲載入 (`deferConfiguredChannelFullLoadUntilAfterListen`)。
  </Accordion>
  <Accordion title="setupEntry 必須註冊什麼">
    - 通道插件物件（透過 `defineSetupPluginEntry`）。
    - 閘道監聽之前所需的任何 HTTP 路由。
    - 啟動期間所需的任何閘道方法。

    這些啟動時期的閘道方法仍應避免保留的核心管理命名空間，例如 `config.*` 或 `update.*`。

  </Accordion>
  <Accordion title="setupEntry 不應包含什麼">
    - CLI 註冊。
    - 背景服務。
    - 繁重的執行時間匯入 (crypto、SDK)。
    - 僅在啟動後才需要的閘道方法。
  </Accordion>
</AccordionGroup>

### 縮小設定輔助匯入範圍

對於僅限設定的熱門路徑，當您只需要設定介面的一部分時，建議優先使用較狹窄的設定輔助縫隙，而非廣泛的 `plugin-sdk/setup` 涵蓋範圍：

| 匯入路徑                           | 用於                                                               | 主要匯出                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | 在 `setupEntry` / 延遲通道啟動中保持可用的設定時期執行時間輔助程式 | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | 環境感知的帳號設定配接器                                           | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | setup/install CLI/archive/docs 助手                                | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

當您需要完整的共享設定工具箱（包括諸如 `moveSingleAccountChannelSectionToDefaultAccount(...)` 的設定修補助手）時，請使用更廣泛的 `plugin-sdk/setup` 接縫。

設定修補配接器在匯入時保持熱路徑安全。其捆綁的單一帳號升級合約介面查找是延遲的，因此在實際使用配接器之前，匯入 `plugin-sdk/setup-runtime` 不會急切加載捆綁的合約介面發現。

### 頻道擁有的單一帳號升級

當頻道從單一帳號頂層設定升級到 `channels.<id>.accounts.*` 時，預設的共享行為是將升級的帳號範圍值移動到 `accounts.default` 中。

捆綁頻道可以透過其設定合約介面縮小或覆寫該升級：

- `singleAccountKeysToMove`：應移動到升級帳號的額外頂層鍵
- `namedAccountPromotionKeys`：當命名帳號已經存在時，只有這些鍵會移動到升級帳號中；共享策略/傳遞鍵保留在頻道根目錄
- `resolveSingleAccountPromotionTarget(...)`：選擇哪個現有帳號接收升級的值

<Note>Matrix 是目前的捆綁範例。如果剛好存在一個命名的 Matrix 帳號，或者如果 `defaultAccount` 指向現有的非規範鍵（例如 `Ops`），升級會保留該帳號，而不是建立新的 `accounts.default` 項目。</Note>

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

您的外掛程式會在註冊期間接收此設定作為 `api.pluginConfig`。

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

### 建構頻道設定 Schema

使用 `buildChannelConfigSchema` 將 Zod schema 轉換為外掛程式擁有的設定物件所使用的 `ChannelConfigSchema` 包裝器：

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

對於第三方外掛程式，冷路徑合約仍然是外掛程式資訊清單：將生成的 JSON Schema 映射到 `openclaw.plugin.json#channelConfigs`，以便設定 schema、設定程式和 UI 介面可以在不載入執行時代碼的情況下檢查 `channels.<id>`。

## 設定精靈

頻道外掛程式可以提供 `openclaw onboard` 的互動式設定精靈。精靈是 `ChannelPlugin` 上的一個 `ChannelSetupWizard` 物件：

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

`ChannelSetupWizard` 類型支援 `credentials`、`textInputs`、`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等更多功能。請參閱隨附的外掛程式套件（例如 Discord 外掛程式的 `src/channel.setup.ts`）以取得完整範例。

<AccordionGroup>
  <Accordion title="共用 allowFrom 提示">
    對於只需要標準 `note -> prompt -> parse -> merge -> patch` 流程的 DM 允許清單提示，建議優先使用 `openclaw/plugin-sdk/setup` 中的共用設定輔助程式：`createPromptParsedAllowFromForAccount(...)`、`createTopLevelChannelParsedAllowFromPrompt(...)` 和 `createNestedChannelParsedAllowFromPrompt(...)`。
  </Accordion>
  <Accordion title="標準頻道設定狀態">
    對於僅在標籤、分數和可選額外行數有所不同的頻道設定狀態區塊，建議優先使用 `openclaw/plugin-sdk/setup` 中的 `createStandardChannelSetupStatus(...)`，而不是在每個外掛程式中手動編寫相同的 `status` 物件。
  </Accordion>
  <Accordion title="Optional channel setup surface">
    對於僅應出現在某些情境中的選用設定介面，請使用 `openclaw/plugin-sdk/channel-setup` 中的 `createOptionalChannelSetupSurface`：

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

    當您只需要該選用安裝介面的一半時，`plugin-sdk/channel-setup` 也會公開較低層級的 `createOptionalChannelSetupAdapter(...)` 和 `createOptionalChannelSetupWizard(...)` 建構器。

    產生的選用介面精靈/精靈在實際設定寫入時會以封閉方式失敗。它們在 `validateInput`、`applyAccountConfig` 和 `finalize` 之間重複使用一條「需要安裝」的訊息，並在設定 `docsPath` 時附加文件連結。

  </Accordion>
  <Accordion title="Binary-backed setup helpers">
    對於二進制支援的設定 UI，請優先使用共用的委派協助程式，而不是將相同的二進制/狀態膠水程式碼複製到每個頻道中：

    - `createDetectedBinaryStatus(...)`：適用於僅在標籤、提示、評分和二進制偵測上有所不同的狀態區塊
    - `createCliPathTextInput(...)`：適用於基於路徑的文字輸入
    - 當 `setupEntry` 需要延遲轉發到較重的完整精靈時，使用 `createDelegatedSetupWizardStatusResolvers(...)`、`createDelegatedPrepare(...)`、`createDelegatedFinalize(...)` 和 `createDelegatedResolveConfigured(...)`
    - 當 `setupEntry` 只需要委派 `textInputs[*].shouldPrompt` 決策時，使用 `createDelegatedTextInputShouldPrompt(...)`

  </Accordion>
</AccordionGroup>

## 發佈與安裝

**外掛程式：** 發佈至 [ClawHub](/zh-Hant/tools/clawhub) 或 npm，然後安裝：

<Tabs>
  <Tab title="Auto (ClawHub then npm)">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 會先嘗試 ClawHub，並自動回退至 npm。

  </Tab>
  <Tab title="ClawHub only">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="npm 套件規格">
    沒有相符的 `npm:` 覆寫。當您在 ClawHub 備援後需要 npm 路徑時，請使用正常的 npm 套件規格：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**In-repo plugins：** 置於打包外掛工作區樹下，它們會在建置期間自動被發現。

**使用者可以安裝：**

```bash
openclaw plugins install <package-name>
```

<Info>對於來自 npm 的安裝，`openclaw plugins install` 會執行專案本地的 `npm install --ignore-scripts`（無生命週期腳本），並忽略繼承的全域 npm 安裝設定。請保持外掛依賴樹為純 JS/TS，並避免需要 `postinstall` 建置的套件。</Info>

<Note>打包的 OpenClaw 擁有外掛是唯一的啟動修復例外：當打包安裝看到透過外掛設定、舊版通道設定或其預設啟用的清單啟用其中一個時，啟動會在匯入前安裝該外掛缺少的執行時依賴項。第三方外掛不應依賴啟動安裝；請繼續使用明確的外掛安裝程式。</Note>

## 相關

- [建置外掛](/zh-Hant/plugins/building-plugins) — 逐步入門指南
- [外掛清單](/zh-Hant/plugins/manifest) — 完整清單架構參考
- [SDK 進入點](/zh-Hant/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry`
