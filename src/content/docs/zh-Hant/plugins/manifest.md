---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

若要了解相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的套件格式會使用不同的清單檔案：

- Codex bundle： `.codex-plugin/plugin.json`
- Claude bundle： `.claude-plugin/plugin.json` 或不含 manifest 的預設 Claude 元件
  佈局
- Cursor bundle： `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但不會根據此處描述的
`openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料，以及宣告的
技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值、
Claude 套件 LSP 預設值和支援的 hook 包。

每個原生 OpenClaw 外掛程式**必須**在 **外掛程式根目錄**中包含
`openclaw.plugin.json` 檔案。OpenClaw 使用此 manifest 來驗證組態，
**而無須執行外掛程式碼**。缺少或無效的 manifest 會被視為
外掛程式錯誤，並阻擋組態驗證。

請參閱完整的插件系統指南：[Plugins](/zh-Hant/tools/plugin)。
關於原生功能模型與目前的外部相容性指導方針：
[Capability model](/zh-Hant/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的外掛程式碼**之前**讀取的
中繼資料。以下所有內容必須足夠輕量，以便在不啟動
外掛程式執行時期的情況下進行檢查。

**將其用於：**

- 外掛程式身分識別、配置驗證以及配置 UI 提示
- 驗證、上線及設定中繼資料（別名、自動啟用、提供者環境變數、驗證選項）
- 控制平面介面的啟用提示
- 簡寫模型家族擁有權
- 靜態功能擁有權快照 (`contracts`)
- 共用 `openclaw qa` 主機可檢查的 QA runner 中繼資料
- 合併至目錄與驗證介面的特定頻道配置中繼資料

**請勿用於：** 註冊執行時期行為、宣告程式碼進入點，
或 npm install 中繼資料。這些內容應屬於您的外掛程式碼和 `package.json`。

## 最小範例

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

## 完整範例

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

## 頂層欄位參考

| 欄位                                 | 必要 | 類型                             | 含義                                                                                                                                                                |
| ------------------------------------ | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 標準外掛程式 ID。這是 `plugins.entries.<id>` 中使用的 ID。                                                                                                          |
| `configSchema`                       | 是   | `object`                         | 此外掛設定內嵌的 JSON Schema。                                                                                                                                      |
| `enabledByDefault`                   | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。省略它，或設定為任何非 `true` 的值，以保持外掛程式預設為停用狀態。                                                                  |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 僅在列出的 Node.js 平台上將打包的外掛程式標記為預設啟用，例如 `["darwin"]`。明確的配置仍然優先。                                                                    |
| `legacyPluginIds`                    | 否   | `string[]`                       | 正規化為此標準外掛程式 ID 的舊版 ID。                                                                                                                               |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 當驗證、配置或模型參照提及這些供應商 ID 時，應自動啟用此外掛程式的供應商 ID。                                                                                       |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的互斥外掛程式類型。                                                                                                                   |
| `channels`                           | 否   | `string[]`                       | 由此外掛程式擁有的頻道 ID。用於探索和配置驗證。                                                                                                                     |
| `providers`                          | 否   | `string[]`                       | 由此外掛程式擁有的供應商 ID。                                                                                                                                       |
| `providerCatalogEntry`               | 否   | `string`                         | 輕量級供應商目錄模組路徑（相對於外掛程式根目錄），用於可在不啟動完整外掛程式運行時的情況下載入的清單範圍供應商目錄元數據。                                          |
| `modelSupport`                       | 否   | `object`                         | 清單擁有的簡寫模型系列元數據，用於在運行時之前自動載入外掛程式。                                                                                                    |
| `modelCatalog`                       | 否   | `object`                         | 屬於此外掛程式的供應商之宣告式模型目錄元數據。這是未來唯讀列表、上架、模型選擇器、別名和抑制功能的控制平面契約，無需載入外掛程式運行時。                            |
| `modelPricing`                       | 否   | `object`                         | 供應商擁有的外部價格查找策略。使用它可以選擇讓本地/自託管的供應商退出遠端價格目錄，或將供應商參照映射到 OpenRouter/LiteLLM 目錄 ID，而無需在核心中硬編碼供應商 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 必須在供應商運行時載入之前執行的供應商擁有之模型 ID 別名/前綴清理。                                                                                                 |
| `providerEndpoints`                  | 否   | `object[]`                       | 清單擁有的端點主機/ baseUrl 元數據，用於核心必須在提供者執行時加載之前對其進行分類的提供者路由。                                                                    |
| `providerRequest`                    | 否   | `object`                         | 通用請求策略在提供者執行時加載之前使用的低成本提供者系列和請求相容性元數據。                                                                                        |
| `cliBackends`                        | 否   | `string[]`                       | 此外掛擁有的 CLI 推論後端 ID。用於來自明確配置參照的啟動自動啟用。                                                                                                  |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供者或 CLI 後端參照，其外掛擁有的綜合身份驗證掛鉤應在執行時加載之前的冷模型發現期間進行探測。                                                                     |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 套件外掛擁有的預留位置 API 金鑰值，代表非秘密的本機、OAuth 或環境憑證狀態。                                                                                         |
| `commandAliases`                     | 否   | `object[]`                       | 此外掛擁有的指令名稱，應在執行時加載之前產生外掛感知的配置和 CLI 診斷資訊。                                                                                         |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用於提供者身份驗證/狀態查找的已棄用相容性環境元數據。對於新外掛，建議使用 `setup.providers[].envVars`；OpenClaw 在棄用過渡期內仍會讀取此項。                        |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 應重用另一個提供者 ID 進行身份驗證查找的提供者 ID，例如共享基本提供者 API 金鑰和身份驗證配置檔案的編碼提供者。                                                      |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在無需加載外掛程式碼的情況下檢查的低成本通道環境元數據。將其用於通用啟動/配置輔助工具應該看到的環境驅動通道設定或身份驗證介面。                        |
| `providerAuthChoices`                | 否   | `object[]`                       | 用於入門選擇器、首選提供者解析和簡單 CLI 標誌連接的低成本身份驗證選擇元數據。                                                                                       |
| `activation`                         | 否   | `object`                         | 用於啟動、提供者、指令、通道、路由和功能觸發載入的廉價啟動計劃器元數據。僅為元數據；外掛執行階段仍擁有實際行為。                                                    |
| `setup`                              | 否   | `object`                         | 廉價的設定/上線描述符，供發現和設定介面在不載入外掛執行階段的情況下檢查。                                                                                           |
| `qaRunners`                          | 否   | `object[]`                       | 共用的 `openclaw qa` 主機在外掛執行階段載入之前使用的廉價 QA 執行器描述符。                                                                                         |
| `contracts`                          | 否   | `object`                         | 用於外部 auth hooks、語音、即時轉錄、即時語音、媒體理解、圖像生成、音樂生成、視頻生成、web-fetch、web 搜索和工具所有權的靜態功能所有權快照。                        |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中聲明的提供者 ID 的廉價媒體理解預設值。                                                                                 |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.imageGenerationProviders` 中聲明的提供者 ID 的廉價圖像生成 auth 元數據，包括提供者擁有的 auth 別名和 base-url 防護。                                  |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.videoGenerationProviders` 中聲明的提供者 ID 的廉價視頻生成 auth 元數據，包括提供者擁有的 auth 別名和 base-url 防護。                                  |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.musicGenerationProviders` 中聲明的提供者 ID 的廉價音樂生成 auth 元數據，包括提供者擁有的 auth 別名和 base-url 防護。                                  |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 在 `contracts.tools` 中聲明的外掛擁有工具的廉價可用性元數據。當工具除非存在設定、環境或 auth 證據否則不應載入執行階段時使用它。                                     |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在執行階段載入之前合併到發現和驗證介面的清單擁有通道設定元數據。                                                                                                    |
| `skills`                             | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                                                                |
| `name`                               | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                                                                |
| `description`                        | 否   | `string`                         | 在外掛介面中顯示的簡短摘要。                                                                                                                                        |
| `version`                            | 否   | `string`                         | 資訊性的外掛版本。                                                                                                                                                  |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置欄位的 UI 標籤、佔位符和敏感性提示。                                                                                                                            |

## 生成提供者元數據參考

生成提供者元數據欄位描述了在匹配的 `contracts.*GenerationProviders` 列表中宣告的提供者的靜態授權信號。
OpenClaw 會在提供者執行時載入之前讀取這些欄位，以便核心工具可以在不匯入每個
提供者外掛的情況下決定生成提供者是否可用。

這些欄位僅用於廉價的、宣告性的事實。傳輸、請求轉換、
權杖刷新、憑證驗證和實際的生成行為保留在外掛執行時中。

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

每個元數據條目支援：

| 欄位            | 必要 | 類型       | 含義                                                                                           |
| --------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------- |
| `aliases`       | 否   | `string[]` | 應視為生成提供者的靜態授權別名的其他提供者 ID。                                                |
| `authProviders` | 否   | `string[]` | 其已配置的授權設定檔應視為此生成提供者之授權的提供者 ID。                                      |
| `configSignals` | 否   | `object[]` | 針對無需授權設定檔或環境變數即可配置的本機或自託管提供者的廉價僅配置可用性信號。               |
| `authSignals`   | 否   | `object[]` | 明確的授權信號。當存在時，這些會取代來自提供者 ID、`aliases` 和 `authProviders` 的預設信號集。 |

每個 `configSignals` 條目支援：

| 欄位          | 必要 | 類型       | 含義                                                                                                               |
| ------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `rootPath`    | 是   | `string`   | 要檢查的外掛擁有配置物件的點路徑，例如 `plugins.entries.example.config`。                                          |
| `overlayPath` | 否   | `string`   | 根配置內部的點路徑，其物件應在評估信號之前覆蓋根物件。將此用於特定於功能的配置，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效配置內部的點路徑，必須具有已配置的值。字串必須非空；物件和陣列不得為空。                                       |
| `requiredAny` | 否   | `string[]` | 有效配置內部的點路徑，其中至少一個必須具有已配置的值。                                                             |
| `mode`        | 否   | `object`   | 有效配置內部的可選字串模式守衛。當僅針對一種模式適用僅配置的可用性時，請使用此選項。                               |

每個 `mode` 守衛支援：

| 欄位         | 必填 | 類型       | 含義                                                 |
| ------------ | ---- | ---------- | ---------------------------------------------------- |
| `path`       | 否   | `string`   | 有效配置內部的點路徑。預設為 `mode`。                |
| `default`    | 否   | `string`   | 當配置省略路徑時使用的模式值。                       |
| `allowed`    | 否   | `string[]` | 如果存在，則僅當有效模式為這些值之一時，信號才通過。 |
| `disallowed` | 否   | `string[]` | 如果存在，則當有效模式為這些值之一時，信號將失敗。   |

每個 `authSignals` 項目支援：

| 欄位              | 必填 | 類型     | 含義                                                                                                                   |
| ----------------- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在已配置的身份驗證設定檔中檢查的提供者 ID。                                                                          |
| `providerBaseUrl` | 否   | `object` | 可選守衛，僅當引用的已配置提供者使用允許的基底 URL 時，才使信號計數。當身份驗證別名僅對某些 API 有效時，請使用此選項。 |

每個 `providerBaseUrl` 守衛支援：

| 欄位              | 必填 | 類型       | 含義                                                                                                      |
| ----------------- | ---- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 提供者配置 ID，應檢查其 `baseUrl`。                                                                       |
| `defaultBaseUrl`  | 否   | `string`   | 當提供者配置省略 `baseUrl` 時假設的基礎 URL。                                                             |
| `allowedBaseUrls` | 是   | `string[]` | 此驗證訊號允許的基礎 URL。當配置的或預設的基礎 URL 與這些正規化值中的任何一個都不匹配時，該訊號將被忽略。 |

## 工具元數據參考

`toolMetadata` 使用與生成提供者元數據相同的 `configSignals` 和 `authSignals` 形狀，並以工具名稱作為鍵值。`contracts.tools` 宣告所有權。`toolMetadata` 宣告輕量級可用性證據，以便 OpenClaw 可以避免僅為了讓其工具工廠返回 `null` 而導入插件運行時。

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

如果工具沒有 `toolMetadata`，OpenClaw 將保留現有行為，並在工具契約符合策略時載入擁有者插件。對於工廠依賴驗證/配置的熱路徑工具，插件作者應該宣告 `toolMetadata`，而不是讓核心導入運行時來詢問。

## providerAuthChoices 參考

每個 `providerAuthChoices` 條目描述一個入門或驗證選擇。OpenClaw 在提供者運行時載入之前讀取此內容。提供者設定列表使用這些清單選擇、衍生自描述元的設定選擇和安裝目錄元數據，而無需載入提供者運行時。

| 欄位                  | 必要 | 類型                                                                  | 含義                                                                  |
| --------------------- | ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 此選擇所屬的提供者 ID。                                               |
| `method`              | 是   | `string`                                                              | 要分派到的驗證方法 ID。                                               |
| `choiceId`            | 是   | `string`                                                              | 用於入門和 CLI 流程的穩定驗證選擇 ID。                                |
| `choiceLabel`         | 否   | `string`                                                              | 面向使用者的標籤。如果省略，OpenClaw 將回退到 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                                              | 選擇器的簡短說明文字。                                                |
| `assistantPriority`   | 否   | `number`                                                              | 較低的值在助理驅動的互動式選擇器中排序較靠前。                        |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 在助理選擇器中隱藏此選項，同時仍允許透過手動 CLI 選取。               |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 應將使用者重新導向至此取代選項的舊版選項 ID。                         |
| `groupId`             | 否   | `string`                                                              | 用於將相關選項分群組的選用群組 ID。                                   |
| `groupLabel`          | 否   | `string`                                                              | 該群組的使用者可見標籤。                                              |
| `groupHint`           | 否   | `string`                                                              | 該群組的簡短說明文字。                                                |
| `optionKey`           | 否   | `string`                                                              | 簡單的單一標記驗證流程的內部選項鍵。                                  |
| `cliFlag`             | 否   | `string`                                                              | CLI 標誌名稱，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                                              | 用於 CLI 說明中的描述。                                               |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此選項應顯示在哪個入門介面中。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有使用者可能誤放入 `plugins.allow` 或嘗試作為根 CLI 命令執行的執行時命令名稱時，請使用 `commandAliases`。OpenClaw 會使用此元資料進行診斷，而不會匯入外掛執行時程式碼。

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

| 欄位         | 必填 | 類型              | 含義                                                           |
| ------------ | ---- | ----------------- | -------------------------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛程式的指令名稱。                                     |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而非根 CLI 指令。                    |
| `cliCommand` | 否   | `string`          | 相關的根 CLI 指令，用於在 CLI 操作時建議使用（如果存在的話）。 |

## 啟用參考

當外掛程式能夠輕鬆宣告哪些控制平面事件應將其納入啟用/載入計畫時，請使用 `activation`。

此區塊是規劃器元數據，而非生命週期 API。它不註冊
執行時期行為，不取代 `register(...)`，也不保證
外掛程式碼已經執行。啟用規劃器會在回退到現有的清單所有權
元數據（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、
`contracts.tools` 和 hooks）之前，使用這些欄位來
縮小候選外掛的範圍。

偏好使用已經描述所有權的最窄中繼資料。當這些欄位表達該關係時，請使用
`providers`、`channels`、`commandAliases`、設定描述符或 `contracts`。
請使用 `activation` 來提供這些所有權欄位無法表示的額外規劃器提示。
請使用頂層 `cliBackends` 來定義 CLI 執行時期別名，例如 `claude-cli`、
`my-cli` 或 `google-gemini-cli`；`activation.onAgentHarnesses` 僅供
尚未具有所有權欄位的嵌入式 Agent 線束 ID 使用。

此區塊僅為中繼資料。它不註冊執行時期行為，也不取代 `register(...)`、`setupEntry` 或其他執行時期/外掛程式進入點。
目前的消費者在更廣泛的外掛程式載入之前將其用作縮減提示，因此遺漏非啟動啟用中繼資料通常只會影響效能；只要清單所有權備援機制仍然存在，這應該不會影響正確性。

每個插件都應該刻意設定 `activation.onStartup`。僅當插件必須在 Gateway 啟動期間執行時，才將其設定為 `true`。當插件在啟動時不活躍且應僅由更狹窄的觸發器載入時，將其設定為 `false`。省略 `onStartup` 不再隱含地在啟動時載入插件；請針對啟動、頻道、設定、agent-harness、記憶體或其他更狹窄的啟用觸發器使用明確的啟用元資料。

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

| 欄位               | 必要 | 類型                                                 | 含義                                                                                                                                               |
| ------------------ | ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | 否   | `boolean`                                            | 明確的 Gateway 啟動啟用。每個插件都應該設定此項。`true` 會在啟動期間匯入插件；`false` 則使其在啟動時保持延遲載入，除非另一個符合的觸發器要求載入。 |
| `onProviders`      | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛的提供者 ID。                                                                                                         |
| `onAgentHarnesses` | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛的嵌入式代理程式綁定執行時期 ID。請使用頂層的 `cliBackends` 作為 CLI 後端別名。                                       |
| `onCommands`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛的指令 ID。                                                                                                           |
| `onChannels`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛的頻道 ID。                                                                                                           |
| `onRoutes`         | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛的路由類型。                                                                                                          |
| `onConfigPaths`    | 否   | `string[]`                                           | 當路徑存在且未明確停用時，應在啟動/載入計畫中包含此外掛程式的根相對設定路徑。                                                                      |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面啟動規劃所使用的廣泛功能提示。盡可能使用較窄的欄位。                                                                                       |

目前的即時消費者：

- 閘道啟動規劃使用 `activation.onStartup` 進行明確啟動
  匯入
- 命令觸發的 CLI 規劃會退回到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent-runtime 啟動規劃對於
  嵌入式馬具使用 `activation.onAgentHarnesses`，對於 CLI 執行時別名使用頂層 `cliBackends[]`
- 通道觸發的設定/通道規劃在缺少明確通道啟動元資料時，會退回到舊版 `channels[]`
  所有权
- 啟動外掛程式規劃會對於非頻道的根設定介面使用 `activation.onConfigPaths`，例如隨附的瀏覽器外掛程式的 `browser` 區塊
- 當缺少明確的提供者啟用元資料時，提供者觸發的設定/執行時期規劃會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有權

規劃器診斷可以區分明確的啟用提示與清單所有權回退。例如，`activation-command-hint` 表示
`activation.onCommands` 已匹配，而 `manifest-command-alias` 表示
規劃器改用了 `commandAliases` 所有權。這些原因標籤適用於主機診斷和測試；外掛作者應繼續聲明最能描述所有權的元資料。

## qaRunners 參考

當外掛在共享 `openclaw qa` 根目錄下貢獻一或多個傳輸執行器時，請使用 `qaRunners`。請保持此元資料輕量且靜態；外掛執行時期仍擁有透過輕量級
`runtime-api.ts` 介面導出 `qaRunnerCliRegistrations` 的實際 CLI 註冊權。

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

| 欄位          | 必要 | 類型     | 說明                                             |
| ------------- | ---- | -------- | ------------------------------------------------ |
| `commandName` | 是   | `string` | 掛載在 `openclaw qa` 下的子指令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共享主機需要存根指令時使用的後援說明文字。     |

## setup 參考

當設定和上架介面在執行時期載入之前需要便宜的外掛擁有元資料時，請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推斷後端。`setup.cliBackends` 是控制平面/設定流程的特定設定描述器介面，應保持僅含元資料。

當存在時，`setup.providers` 和 `setup.cliBackends` 是設定發現的首選描述器優先查詢介面。如果描述器僅縮小候選外點範圍，而設定仍需要更豐富的設定時期執行時期掛鉤，請設定 `requiresRuntime: true` 並將 `setup-api` 作為後援執行路徑保留。

OpenClaw 也會在通用提供者驗證和環境變數查找中包含 `setup.providers[].envVars`。在棄用過渡期間，`providerAuthEnvVars` 透過相容性轉接器仍然受到支援，但仍在使用它的非打包插件會收到清單診斷訊息。新插件應將設定/狀態環境元資料放在 `setup.providers[].envVars` 上。

當沒有可用的設定項目，或當 `setup.requiresRuntime: false` 宣告設定執行階段非必要時，OpenClaw 也可以從 `setup.providers[].authMethods` 推導簡單的設定選擇。對於自訂標籤、CLI 旗標、入門範圍和助理元資料，明確的 `providerAuthChoices` 項目仍然是首選。

僅當那些描述子足以滿足設定介面時，才設定 `requiresRuntime: false`。OpenClaw 將明確的 `false` 視為僅描述子合約，並不會執行 `setup-api` 或 `openclaw.setupEntry` 進行設定查找。如果僅描述子插件仍然發布其中一個設定執行階段項目，OpenClaw 會回報附加診斷並繼續忽略它。省略 `requiresRuntime` 會保留舊版回退行為，因此新增描述子但未設定該旗標的現有插件不會中斷。

由於設定查找可以執行插件擁有的 `setup-api` 程式碼，因此標準化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值在所有已探索的插件中必須保持唯一。模糊的所有權會導致封閉式失敗，而不是根據探索順序選擇一個勝出者。

當設定執行階段執行時，如果 `setup-api` 註冊了清單描述子未宣告的提供者或 CLI 後端，或者描述子沒有相符的執行階段註冊，設定登錄診斷會報告描述子偏移。這些診斷是附加性的，不會拒絕舊版插件。

### setup.providers 參考

| 欄位           | 必要 | 類型       | 含義                                                                 |
| -------------- | ---- | ---------- | -------------------------------------------------------------------- |
| `id`           | 是   | `string`   | 在設定或入門期間公開的提供者 ID。請保持標準化 ID 的全域唯一性。      |
| `authMethods`  | 否   | `string[]` | 此提供者支援的設定/驗證方法 ID，無需載入完整執行環境。               |
| `envVars`      | 否   | `string[]` | 通用設定/狀態介面在插件執行環境載入前可檢查的環境變數。              |
| `authEvidence` | 否   | `object[]` | 針對可透過非機密標記進行驗證的提供者，執行低成本的本地驗證憑證檢查。 |

`authEvidence` 適用於無需載入執行時代碼即可驗證的提供者自有本機憑證標記。這些檢查必須保持低成本且本地化：不進行網路呼叫、不讀取鑰匙圈或秘密管理器、不執行 Shell 指令，也不探查提供者 API。

支援的憑證項目：

| 欄位               | 必要 | 類型       | 說明                                                                                   |
| ------------------ | ---- | ---------- | -------------------------------------------------------------------------------------- |
| `type`             | 是   | `string`   | 目前為 `local-file-with-env`。                                                         |
| `fileEnvVar`       | 否   | `string`   | 包含明確憑證檔案路徑的環境變數。                                                       |
| `fallbackPaths`    | 否   | `string[]` | 當 `fileEnvVar` 不存在或為空時檢查的本地憑證檔案路徑。支援 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在憑證有效之前，列出的環境變數中至少必須有一個非空。                                   |
| `requiresAllEnv`   | 否   | `string[]` | 在憑證有效之前，列出的所有環境變數都必須非空。                                         |
| `credentialMarker` | 是   | `string`   | 當憑證存在時傳回的非機密標記。                                                         |
| `source`           | 否   | `string`   | 用於驗證/狀態輸出的使用者來源標籤。                                                    |

### setup 欄位

| 欄位               | 必要 | 類型       | 說明                                                                    |
| ------------------ | ---- | ---------- | ----------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和入職期間公開的提供者設定描述子。                                |
| `cliBackends`      | 否   | `string[]` | 用於描述子優先設定查詢的設定時間後端 ID。請將標準化的 ID 保持全域唯一。 |
| `configMigrations` | 否   | `string[]` | 此外掛程式的設定介面所擁有的設定遷移 ID。                               |
| `requiresRuntime`  | 否   | `boolean`  | 在查詢描述子後，設定是否仍需要執行 `setup-api`。                        |

## uiHints 參考

`uiHints` 是從設定欄位名稱到小型渲染提示的映射。

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

每個欄位提示可以包含：

| 欄位          | 類型       | 含義                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向使用者的欄位標籤。   |
| `help`        | `string`   | 簡短的輔助說明文字。     |
| `tags`        | `string[]` | 選用性 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可在不匯入外掛程式執行時期的情況下讀取的靜態功能擁有權中繼資料。

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
    "gatewayMethodDispatch": ["authenticated-request"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每個清單都是選用的：

| 欄位                             | 類型       | 含義                                                          |
| -------------------------------- | ---------- | ------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex 應用伺服器擴充功能工廠 ID，目前為 `codex-app-server`。  |
| `agentToolResultMiddleware`      | `string[]` | 打包的外掛程式可以為其註冊工具結果中介軟體的執行時期 ID。     |
| `externalAuthProviders`          | `string[]` | 此外掛程式擁有其外部驗證設定檔掛勾的提供者 ID。               |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 ID。                               |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄提供者 ID。                           |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音提供者 ID。                           |
| `memoryEmbeddingProviders`       | `string[]` | 此外掛程式擁有的記憶體嵌入提供者 ID。                         |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解提供者 ID。                           |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的影像生成提供者 ID。                           |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成提供者 ID。                           |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網路擷取提供者 ID。                           |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網路搜尋提供者 ID。                           |
| `migrationProviders`             | `string[]` | 此外掛程式擁有、用於 `openclaw migrate` 的匯入提供者 ID。     |
| `gatewayMethodDispatch`          | `string[]` | 保留給在程序內調度 Gateway 方法的已驗證插件 HTTP 路由之授權。 |
| `tools`                          | `string[]` | 此外掛擁有的 Agent 工具名稱。                                 |

`contracts.embeddedExtensionFactories` 保留給打包的 Codex
僅限應用程式伺服器的擴充功能 factory。打包的工具結果轉換應該
改為宣告 `contracts.agentToolResultMiddleware` 並向
`api.registerAgentToolResultMiddleware(...)` 註冊。外部插件無法
註冊工具結果中介軟體，因為接縫可以在模型看到高信任度工具
輸出之前重寫該輸出。

執行時期 `api.registerTool(...)` 註冊必須符合 `contracts.tools`。
工具探索會使用此清單，僅載入可擁有所要求工具的
插件執行時期。

實作 `resolveExternalAuthProfiles` 的提供者插件應宣告
`contracts.externalAuthProviders`。未做此宣告的插件仍會透過
已淘汰的相容性後備機制執行，但該後備機制速度較慢，
並將在移轉期間結束後移除。

打包的記憶體嵌入提供商應該為其公開的每個適配器 ID 宣告 `contracts.memoryEmbeddingProviders`，包括內建適配器，例如 `local`。獨立 CLI 路徑使用此清單合約，在完整的 Gateway 執行時註冊提供商之前，僅載入擁有該提供商的外掛程式。

`contracts.gatewayMethodDispatch` 目前接受 `"authenticated-request"`。這是原生外掛程式 HTTP 路由的 API 衛生閘道，這些路由意圖在程序內分派 Gateway 控制平面方法，而非針對惡意原生外掛程式的沙箱。僅將其用於已經過嚴格審查的打包/操作員介面，且這些介面已要求 Gateway HTTP 驗證。

## mediaUnderstandingProviderMetadata 參考資料

當媒體理解提供商具有通用核心協助程式在執行時載入之前所需的預設模型、自動驗證後援優先順序或原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。金鑰也必須在 `contracts.mediaUnderstandingProviders` 中宣告。

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

每個提供商項目可以包含：

| 欄位                   | 類型                                | 含義                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供商公開的媒體功能。                           |
| `defaultModels`        | `Record<string, string>`            | 當配置未指定模型時使用的功能到模型的預設值。       |
| `autoPriority`         | `Record<string, number>`            | 對於自動基於憑證的提供商後援，較小的數字排序較前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支援的原生文件輸入。                         |

## channelConfigs 參考資料

當頻道外掛程式在執行時載入之前需要廉價的配置元資料時，請使用 `channelConfigs`。唯讀頻道設定/狀態探索可以在沒有可用設定項目時，或者當 `setup.requiresRuntime: false` 宣告設定執行時不必要時，直接針對已配置的外部頻道使用此元資料。

`channelConfigs` 是外掛程式清單元資料，而不是新的頂層使用者配置部分。使用者仍在 `channels.<channel-id>` 下配置頻道執行個體。OpenClaw 會讀取清單元資料，以便在外掛程式執行時程式碼執行之前，決定哪個外掛程式擁有該已配置的頻道。

對於通道插件，`configSchema` 和 `channelConfigs` 描述了不同的
路徑：

- `configSchema` 驗證 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 驗證 `channels.<channel-id>`

宣告 `channels[]` 的非捆綁插件還應宣告相符的
`channelConfigs` 項目。若無這些項目，OpenClaw 仍可載入插件，但冷路徑
組態架構、設定和 Control UI 介面在插件執行前將無法得知通道
擁有的選項形狀。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可宣告靜態 `auto` 預設值，供在通道執行時載入前
執行的指令組態檢查使用。捆綁通道也可以透過
`package.json#openclaw.channel.commands` 發佈相同的預設值，與其他套件擁有的通道
目錄元資料並列。

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

每個通道項目可以包含：

| 欄位          | 類型                     | 意義                                                             |
| ------------- | ------------------------ | ---------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每個宣告的通道組態項目皆為必填。 |
| `uiHints`     | `Record<string, object>` | 該通道組態區塊的選用 UI 標籤/預留位置/敏感提示。                 |
| `label`       | `string`                 | 當執行時元資料尚未就緒時，合併至選擇器和檢視介面的通道標籤。     |
| `description` | `string`                 | 用於檢視和目錄介面的簡短通道描述。                               |
| `commands`    | `object`                 | 用於執行前組態檢查的靜態原生指令和原生技能自動預設值。           |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應排在其上的舊版或低優先級插件 ID。            |

### 取代另一個通道插件

當您的插件是某個頻道 ID 的首選擁有者，而另一個插件也能提供該頻道時，請使用 `preferOver`。常見情況包括重新命名的插件 ID、取代套件插件的獨立插件，或是為了設定相容性而保留相同頻道 ID 的維護分支。

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

當配置了 `channels.chat` 時，OpenClaw 會同時考慮頻道 ID 和首選插件 ID。如果低優先級插件僅因為它是內建或預設啟用而被選中，OpenClaw 會在有效的執行時設定中停用它，以便由一個插件擁有該頻道及其工具。明確的使用者選擇仍然優先：如果使用者明確啟用了這兩個插件，OpenClaw 將保留該選擇並回報重複的頻道/工具診斷訊息，而不是無聲地變更請求的插件集合。

請將 `preferOver` 的範圍限制在確實能提供相同頻道的插件 ID。它不是一個通用的優先級欄位，也不會重新命名使用者設定鍵。

## modelSupport 參考

當 OpenClaw 應該在插件執行時載入之前，從簡寫模型 ID（如 `gpt-5.5` 或 `claude-sonnet-4.6`）推斷您的供應商插件時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用以下優先順序：

- 明確的 `provider/model` 參照使用擁有該 `providers` 的清單元數據
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非內建插件和一個內建插件都匹配，則非內建插件獲勝
- 剩餘的歧義將被忽略，直到使用者或設定指定了供應商

欄位：

| 欄位            | 類型       | 含義                                                    |
| --------------- | ---------- | ------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 針對簡寫模型 ID 匹配的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，針對簡寫模型 ID 匹配的 Regex 來源。 |

## modelCatalog 參考

當 OpenClaw 應該在載入外掛程式執行時之前知道提供者模型中繼資料時，請使用 `modelCatalog`。這是固定目錄列、提供者別名、抑制規則和探索模式的清單擁有來源。執行時重新整理仍然屬於提供者執行時程式碼，但清單會告訴核心何時需要執行時。

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

頂層欄位：

| 欄位           | 類型                                                     | 含義                                                                      |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 由此外掛程式擁有的提供者 ID 的目錄列。金鑰也應出現在頂層 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 應解析為擁有提供者以進行目錄或抑制規劃的提供者別名。                      |
| `suppressions` | `object[]`                                               | 來自其他來源的模型列，此外掛程式因特定提供者原因而抑制這些列。            |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供者目錄是可以從清單中繼資料讀取、重新整理到快取中，還是需要執行時。    |

`aliases` 參與模型目錄規劃的提供者擁有權查詢。
別名目標必須是由此外掛程式擁有的頂層提供者。當
提供者篩選清單使用別名時，OpenClaw 可以讀取擁有清單並
應用別名 API/基底 URL 覆寫，而無需載入提供者執行時。
別名不會展開未篩選的目錄列表；廣泛列表僅發出擁有
的正式提供者列。

`suppressions` 取代舊的提供者執行時 `suppressBuiltInModel` 掛鉤。
抑制條目僅在提供者由外掛程式擁有或
宣告為針對擁有提供者的 `modelCatalog.aliases` 金鑰時才受尊重。執行時
抑制掛鉤在模型解析期間不再被呼叫。

提供者欄位：

| 欄位      | 類型                     | 含義                                             |
| --------- | ------------------------ | ------------------------------------------------ |
| `baseUrl` | `string`                 | 此提供者目錄中模型的選用預設基底 URL。           |
| `api`     | `ModelApi`               | 此提供者目錄中模型的選用預設 API 配接器。        |
| `headers` | `Record<string, string>` | 套用至此提供者目錄的可選靜態標頭。               |
| `models`  | `object[]`               | 必要的模型資料列。不包含 `id` 的資料列會被忽略。 |

模型欄位：

| 欄位            | 類型                                                           | 說明                                                      |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `id`            | `string`                                                       | 提供者本機模型 ID，不包含 `provider/` 前綴。              |
| `name`          | `string`                                                       | 可選的顯示名稱。                                          |
| `api`           | `ModelApi`                                                     | 可選的個別模型 API 覆寫。                                 |
| `baseUrl`       | `string`                                                       | 可選的個別模型基礎 URL 覆寫。                             |
| `headers`       | `Record<string, string>`                                       | 可選的個別模型靜態標頭。                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模態。                                          |
| `reasoning`     | `boolean`                                                      | 模型是否公開推理行為。                                    |
| `contextWindow` | `number`                                                       | 原生提供者內容視窗。                                      |
| `contextTokens` | `number`                                                       | 當與 `contextWindow` 不同時，可選的有效執行時間內容上限。 |
| `maxTokens`     | `number`                                                       | 已知時的最大輸出 token 數。                               |
| `cost`          | `object`                                                       | 可選的每百萬 token 美元定價，包含可選的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 符合 OpenClaw 模型設定相容性的可選相容性旗標。            |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表狀態。僅當資料列完全不應出現時隱藏。                  |
| `statusReason`  | `string`                                                       | 與不可用狀態一起顯示的可選原因。                          |
| `replaces`      | `string[]`                                                     | 此模型取代的較舊提供者本機模型 ID。                       |
| `replacedBy`    | `string`                                                       | 已棄用列的替換供應商本機模型 ID。                         |
| `tags`          | `string[]`                                                     | 選擇器和篩選器使用的穩定標籤。                            |

抑制欄位：

| 欄位                       | 類型       | 含義                                                                |
| -------------------------- | ---------- | ------------------------------------------------------------------- |
| `provider`                 | `string`   | 要抑制的上游列的供應商 ID。必須由此外掛程式擁有或宣告為擁有的別名。 |
| `model`                    | `string`   | 要抑制的供應商本機模型 ID。                                         |
| `reason`                   | `string`   | 直接請求被抑制的列時顯示的可選訊息。                                |
| `when.baseUrlHosts`        | `string[]` | 抑制生效前所需的有效供應商基礎 URL 主機可選清單。                   |
| `when.providerConfigApiIn` | `string[]` | 抑制生效前所需的確切 provider-config `api` 值的可選清單。           |

請勿將僅限運行時的資料放在 `modelCatalog` 中。僅當清單列完整到足以讓供應商篩選的清單和選擇器介面跳過註冊表/運行時探索時，才使用 `static`。當清單列是有用的可列舉種子或補充內容，但重新整理/快取可以稍後新增更多列時，請使用 `refreshable`；可重新整理的列本身不具權威性。當 OpenClaw 必須載入供應商運行時才能得知清單時，請使用 `runtime`。

## modelIdNormalization 參考資料

使用 `modelIdNormalization` 進行必須在載入供應商運行時之前發生的低成本供應商自有模型 ID 清理。這可以將短模型名稱、供應商本機舊版 ID 和代理前綴規則等別名保留在擁有外掛程式的清單中，而不是放在核心模型選擇表中。

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

供應商欄位：

| 欄位                                 | 類型                    | 含義                                                                    |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不區分大小寫的確切模型 ID 別名。值按原樣返回。                          |
| `stripPrefixes`                      | `string[]`              | 在別名查找前要移除的前綴，適用於舊版供應商/模型重複的情況。             |
| `prefixWhenBare`                     | `string`                | 當正規化的模型 ID 尚未包含 `/` 時，要新增的前綴。                       |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 別名查詢後的條件式裸 ID 前綴規則，以 `modelPrefix` 和 `prefix` 為鍵值。 |

## providerEndpoints 參考

使用 `providerEndpoints` 進行端點分類，讓通用請求策略能在提供者執行時期載入前得知。核心仍然擁有每個 `endpointClass` 的含義；外掛清單則擁有主機和基底 URL 中繼資料。

端點欄位：

| 欄位                           | 類型       | 含義                                                                          |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端點類別，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 對應到端點類別的確切主機名稱。                                                |
| `hostSuffixes`                 | `string[]` | 對應到端點類別的主機尾碼。若要僅進行網域尾碼比對，請加上 `.` 前綴。           |
| `baseUrls`                     | `string[]` | 對應到端點類別的確切正規化 HTTP(S) 基底 URL。                                 |
| `googleVertexRegion`           | `string`   | 用於確切全域主機的靜態 Google Vertex 區域。                                   |
| `googleVertexRegionHostSuffix` | `string`   | 要從符合的主機中移除的尾碼，以顯露 Google Vertex 區域前綴。                   |

## providerRequest 參考

使用 `providerRequest` 來提供廉價的請求相容性中繼資料，讓通用請求策略無需載入提供者執行時期即可使用。請將特定行為的 Payload 重寫保留在提供者執行時期鉤子或共用的提供者家族輔助程式中。

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

提供者欄位：

| 欄位                  | 類型         | 含義                                                         |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `family`              | `string`     | 通用請求相容性決策和診斷所使用的提供者家族標籤。             |
| `compatibilityFamily` | `"moonshot"` | 可選的供應商系列相容性貯體，用於共享請求輔助程式。           |
| `openAICompletions`   | `object`     | OpenAI 相容的補全請求標誌，目前為 `supportsStreamingUsage`。 |

## modelPricing 參考

當供應商在執行時期載入之前需要控制平面定價行為時，請使用 `modelPricing`。閘道定價快取會讀取此中繼資料，而無需匯入供應商執行時期程式碼。

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

供應商欄位：

| 欄位         | 類型              | 含義                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 對於不應該擷取 OpenRouter 或 LiteLLM 定價的本機/自託管供應商，請設定 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定價查詢對應。`false` 會停用此供應商的 OpenRouter 查詢。            |
| `liteLLM`    | `false \| object` | LiteLLM 定價查詢對應。`false` 會停用此供應商的 LiteLLM 查詢。                  |

來源欄位：

| 欄位                       | 類型               | 含義                                                                                     |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 當外部目錄供應商 ID 與 OpenClaw 供應商 ID 不同時使用，例如對於 `zai` 供應商使用 `z-ai`。 |
| `passthroughProviderModel` | `boolean`          | 將包含斜線的模型 ID 視為巢狀供應商/模型參照，這對於 OpenRouter 等代理供應商很有用。      |
| `modelIdTransforms`        | `"version-dots"[]` | 額外的外部目錄模型 ID 變體。`version-dots` 會嘗試點分版本 ID，例如 `claude-opus-4.6`。   |

### OpenClaw 供應商索引

OpenClaw 供應商索引是 OpenClaw 擁有的供應商預覽中繼資料，
這些供應商的外掛程式可能尚未安裝。它不是外掛程式清單的一部分。
外掛程式清單仍是已安裝外掛程式的權威來源。供應商索引是
內部後備合約，當未安裝供應商外掛程式時，未來的可安裝供應商
和安裝前模型選擇器介面將會使用此合約。

目錄權威順序：

1. 使用者設定。
2. 已安裝的外掛程式清單 `modelCatalog`。
3. 來自手動重新整理的模型目錄快取。
4. OpenClaw 提供者索引預覽列。

提供者索引不得包含機密、已啟用狀態、執行時鉤子 或
實時帳戶特定的模型資料。其預覽目錄使用與外掛程式清單相同的
`modelCatalog` 提供者列形狀，但除非刻意將執行時介面卡欄位 (如 `api`、
`baseUrl`、定價或相容性旗標) 與
已安裝的外掛程式清單保持一致，否則應僅限於穩定的顯示中繼資料。具有實時 `/models` 探索功能的提供者應
透過明確的模型目錄快取路徑寫入重新整理的列，而不要
進行正常的列出或入庫呼叫提供者 API。

對於外掛程式已移出核心或尚未安裝的提供者，提供者索引項目也可能包含可安裝外掛程式的中繼資料。此
中繼資料反映了管道目錄模式：套件名稱、npm 安裝規格、
預期的完整性 以及廉價的授權選擇標籤足以顯示
可安裝的設定選項。一旦外掛程式安裝完畢，其清單便優先生效，
而該提供者的提供者索引項目將被忽略。

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將
`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、
`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的
清單載入不再將這些頂層欄位視為功能
所有權。

## Manifest 與 package. 的比較

這兩個檔案服務於不同的用途：

| 檔案                   | 用於                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 探索、組態驗證、授權選擇中繼資料，以及必須在外掛程式碼執行前存在的 UI 提示                |
| `package.json`         | npm 中繼資料、相依性安裝，以及用於進入點、安裝閘道、設定 或目錄中繼資料的 `openclaw` 區塊 |

如果您不確定某個中繼資料應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果是關於打包、進入點檔案或 npm install 行為，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

一些執行前外掛程式中繼資料故意存放在 `package.json` 的
`openclaw` 區塊中，而不是 `openclaw.plugin.json` 中。
`openclaw.bundle` 和 `openclaw.bundle.json` 不是 OpenClaw 外掛程式合約；
原生外掛程式必須使用 `openclaw.plugin.json` 加上下列支援的
`package.json#openclaw` 欄位。

重要範例：

| 欄位                                                                                       | 含義                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 宣告原生外掛程式進入點。必須保留在外掛程式套件目錄內。                                                        |
| `openclaw.runtimeExtensions`                                                               | 宣告已安裝套件的建置 JavaScript 執行時進入點。必須保留在外掛程式套件目錄內。                                  |
| `openclaw.setupEntry`                                                                      | 輕量級僅設定進入點，用於上架、延遲通道啟動以及唯讀通道狀態/SecretRef 探索期間。必須保留在外掛程式套件目錄內。 |
| `openclaw.runtimeSetupEntry`                                                               | 宣告已安裝套件的建置 JavaScript 設定進入點。需要 `setupEntry`，必須存在，並且必須保留在外掛程式套件目錄內。   |
| `openclaw.channel`                                                                         | 廉價的通道目錄中繼資料，如標籤、文件路徑、別名和選擇複製文字。                                                |
| `openclaw.channel.commands`                                                                | 設定、稽核和命令列表介面在通道執行時載入之前使用的靜態原生命令和原生技能自動預設中繼資料。                    |
| `openclaw.channel.configuredState`                                                         | 輕量級設定狀態檢查器中繼資料，可以在不載入完整通道執行時的情況下回答「僅環境的設定是否已存在？」。            |
| `openclaw.channel.persistedAuthState`                                                      | 輕量級持久化驗證檢查器中繼資料，可以在不載入完整通道執行時的情況下回答「是否已登入任何項目？」。              |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 捆綁和外部發布外掛程式的安裝/更新提示。                                                                       |
| `openclaw.install.defaultChoice`                                                           | 當有多個安裝來源可用時，偏好的安裝路徑。                                                                      |
| `openclaw.install.minHostVersion`                                                          | 支援的最低 OpenClaw 主機版本，使用像 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 這樣的 semver 下限。                |
| `openclaw.install.expectedIntegrity`                                                       | 預期的 npm dist integrity 字串，例如 `sha512-...`；安裝和更新流程會根據此驗證獲取的檔案。                     |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 當配置無效時，允許狹隘的打包外掛重新安裝復原路徑。                                                            |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 讓僅設定介面在啟動期間於完整頻道外掛之前載入。                                                                |

Manifest 元數據決定在執行時期載入之前，引導流程中會出現哪些提供者/頻道/設定選項。`package.json#openclaw.install` 會告訴引導流程當使用者選擇其中一個選項時，如何取得或啟用該外掛。請勿將安裝提示移至 `openclaw.plugin.json`。

在安裝和 manifest 註冊表載入期間，會對非打包外掛來源執行 `openclaw.install.minHostVersion`。無效的值會被拒絕；對於較舊的主機，較新但有效的值會跳過外部外掛。打包來源外掛假設與主機檢出版本一致。

正式的隨需安裝元數據應在該外掛發佈於 ClawHub 時使用 `clawhubSpec`；引導流程會將其視為偏好的遠端來源，並在安裝後記錄 ClawHub 檔案事實。`npmSpec` 仍是尚未遷移至 ClawHub 的套件的相容性後備方案。

精確的 npm 版本鎖定已存在於 `npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方外部目錄
條目應將精確規格與 `expectedIntegrity` 配對，以便當擷取的 npm 成品不再符合鎖定的
版本時，更新流程會失敗封閉。為了相容性，互動式入門仍提供受信任的註冊表 npm 規格，包括
裸套件名稱和 dist-tags。目錄診斷可以區分精確、浮動、完整性鎖定、缺少完整性、
套件名稱不符以及無效的預設選擇來源。當
`expectedIntegrity` 存在但沒有有效的 npm 來源可鎖定時，它們也會發出警告。
當 `expectedIntegrity` 存在時，
安裝/更新流程會強制執行它；當省略它時，註冊表解析會被記錄而沒有完整性鎖定。

當狀態、通道列表或 SecretRef 掃描需要在不載入完整
執行時期的情況下識別已設定的帳戶時，通道外掛程式應提供 `openclaw.setupEntry`。設定入口應公開通道元資料以及設定安全的
配置、狀態和密碼配接器；將網路用戶端、閘道監聽器和傳輸
執行時期保留在主擴充功能入口中。

執行時期入口欄位不會覆寫來源入口欄位的套件邊界檢查。
例如，`openclaw.runtimeExtensions` 無法使
逃逸的 `openclaw.extensions` 路徑變得可載入。

`openclaw.install.allowInvalidConfigRecovery` 故意設計得很窄。它並
不會讓任意損壞的配置變得可安裝。目前它僅允許安裝
流程從特定的過時套件外掛程式升級失敗中恢復，例如
遺失的套件外掛程式路徑，或是針對同一個
套件外掛程式的過時 `channels.<id>` 條目。不相關的配置錯誤仍會阻擋安裝並將操作員
引導至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個小型檢查器
模組的套件元資料：

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

當設定、診斷、狀態或唯讀呈現流程在完整頻道外掛載入之前，需要廉價的是/否驗證探測時使用它。持久化的驗證狀態並非已設定的頻道狀態：請勿使用此元資料來自動啟用外掛、修復執行時期相依性，或決定是否應載入頻道執行時期。目標匯出應該是一個僅讀取持久化狀態的小型函式；請勿將其路由透過完整的頻道執行時期桶。

`openclaw.channel.configuredState` 遵循相同的形狀，用於廉價的僅環境變數設定檢查：

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

當頻道可以從環境變數或其他微小的非執行時期輸入回答已設定狀態時使用它。如果檢查需要完整的設定解析或真實的頻道執行時期，請將該邏輯保留在外掛的 `config.hasConfiguredState` hook 中。

## 探索優先順序（重複的外掛 ID）

OpenClaw 從多個根目錄探索外掛。若要了解原始檔案系統掃描順序，請參閱[外掛掃描順序](/zh-Hant/gateway/configuration-reference#plugin-scan-order)。如果兩個探索結果共享相同的 `id`，只會保留**優先順序最高**的清單；優先順序較低的副本會被丟棄，而不會與其並排載入。

優先順序，從高到低：

1. **設定選取** — 在 `plugins.entries.<id>` 中明確釘選的路徑
2. **內建** — 隨 OpenClaw 附帶的外掛
3. **全域安裝** — 安裝到全域 OpenClaw 外掛根目錄的外掛
4. **工作區** — 相對於當前工作區探索的外掛

影響：

- 位於工作區中的內建外掛分支或過時副本不會遮蔽內建版本。
- 若要實際用本機版本覆寫內建外掛，請透過 `plugins.entries.<id>` 釘選它，使其透過優先順序獲勝，而不是依賴工作區探索。
- 重複項目的捨棄會被記錄下來，以便 Doctor 和啟動診斷能指出被丟棄的副本。
- 設定選取的重複覆寫在診斷中被表述為明確的覆寫，但仍會發出警告，以便過時的分支和意外的遮蔽保持可見。

## JSON Schema 需求

- **每個外掛都必須提供 JSON Schema**，即使它不接受任何設定。
- 空白的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在設定讀取/寫入時進行驗證，而非在執行時期。
- 當使用新的配置鍵擴展或分叉打包的插件時，請同時更新該插件的 `openclaw.plugin.json` `configSchema`。打包插件的 schema 很嚴格，因此如果在用戶配置中新增 `plugins.entries.<id>.config.myNewKey` 而未在 `configSchema.properties` 中新增 `myNewKey`，將在插件運行時加載之前被拒絕。

Schema 擴展示例：

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

## 驗證行為

- 未知的 `channels.*` 鍵是 **錯誤**，除非該頻道 id 是由
  plugin manifest 宣告的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照 **可發現的** plugin id。未知的 id 是 **錯誤**。
- 如果已安裝插件但其 manifest 或 schema 損壞或缺失，
  驗證將會失敗，且 Doctor 會回報該插件錯誤。
- 如果存在插件配置但插件已被**停用**，則該配置會被保留，
  並且會在 Doctor + 記錄檔中顯示**警告**。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration) 以取得完整的 `plugins.*` schema。

## 備註

- 對於原生 OpenClaw 插件（包括本地檔案系統加載），manifest 是**必須的**。運行時仍會單獨加載插件模組；manifest 僅用於發現與驗證。
- 原生 manifest 使用 JSON5 解析，因此只要最終值仍是物件，就接受註解、尾隨逗號和未加引號的鍵。
- manifest 加載器僅會讀取有記錄的 manifest 欄位。請避免使用自訂的頂層鍵。
- `channels`、`providers`、`cliBackends` 和 `skills` 都可以在插件不需要時省略。
- `providerCatalogEntry` 必須保持輕量，不應導入廣泛的運行時代碼；將其用於靜態提供者目錄元數據或狹窄的發現描述符，而非請求時執行。`providerDiscoveryEntry` 是舊式拼寫，對現有插件仍然有效。
- 獨佔的插件類型透過 `plugins.slots.*` 進行選擇：透過 `plugins.slots.memory` 選擇 `kind: "memory"`，透過 `plugins.slots.contextEngine` 選擇 `kind: "context-engine"`（預設為 `legacy`）。
- 在此清單中宣告獨佔的插件類型。Runtime-entry `OpenClawPluginDefinition.kind` 已被取代，僅作為舊版插件的相容性後備方案保留。
- 環境變數元資料（`setup.providers[].envVars`、已取代的 `providerAuthEnvVars` 和 `channelEnvVars`）僅供宣告使用。狀態、稽核、Cron 傳遞驗證和其他唯讀介面在將環境變數視為已設定之前，仍會套用插件信任和有效啟用原則。
- 關於需要提供者程式碼的執行時嚮導元資料，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依賴原生模組，請記錄建置步驟以及任何套件管理器允許清單需求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相關

<CardGroup cols={3}>
  <Card title="建置插件" href="/zh-Hant/plugins/building-plugins" icon="rocket">
    開始使用插件。
  </Card>
  <Card title="插件架構" href="/zh-Hant/plugins/architecture" icon="diagram-project">
    內部架構與功能模型。
  </Card>
  <Card title="SDK 概覽" href="/zh-Hant/plugins/sdk-overview" icon="book">
    插件 SDK 參考與子路徑匯入。
  </Card>
</CardGroup>
