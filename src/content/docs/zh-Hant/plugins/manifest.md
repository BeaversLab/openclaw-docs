---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

若要查看相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的套件格式會使用不同的清單檔案：

- Codex 套件：`.codex-plugin/plugin.json`
- Claude 套件：`.claude-plugin/plugin.json` 或預設的 Claude 元件
  佈局，不包含 manifest
- Cursor 套件：`.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但它們不會根據此處描述的 `openclaw.plugin.json` 結構描述進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件元資料以及宣告的
技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值、
Claude 套件 LSP 預設值和支援的 hook 套件。

每個原生 OpenClaw 外掛**必須**在**外掛根目錄**中提供一個 `openclaw.plugin.json` 檔案。
OpenClaw 使用此 manifest 來驗證組態，**而不執行外掛程式碼**。遺失或無效的 manifest
會被視為外掛錯誤，並阻擋組態驗證。

請參閱完整的外掛系統指南：[Plugins](/zh-Hant/tools/plugin)。
關於原生功能模型和目前的外部相容性指引：
[Capability model](/zh-Hant/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的
外掛程式碼**之前**讀取的元資料。以下所有內容必須足夠輕量，以便在不啟動
外掛執行時期的情況下進行檢查。

**將其用於：**

- 外掛程式身分識別、配置驗證以及配置 UI 提示
- 驗證、上線及設定中繼資料（別名、自動啟用、提供者環境變數、驗證選項）
- 控制平面介面的啟用提示
- 簡寫模型家族擁有權
- 靜態功能擁有權快照 (`contracts`)
- 共用 `openclaw qa` 主機可以檢查的 QA 執行器元資料
- 合併至目錄與驗證介面的特定頻道配置中繼資料

**請勿將其用於：**註冊執行時期行為、宣告程式碼進入點，
或 npm install 元資料。這些屬於您的外掛程式碼和 `package.json`。

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
  "setup": {
    "providers": [
      {
        "id": "openrouter",
        "envVars": ["OPENROUTER_API_KEY"]
      }
    ]
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
| `id`                                 | 是   | `string`                         | 正式的外掛 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                                                          |
| `configSchema`                       | 是   | `object`                         | 此外掛設定內嵌的 JSON Schema。                                                                                                                                      |
| `requiresPlugins`                    | 否   | `string[]`                       | 必須同時安裝的插件 ID，此插件才能發揮作用。Discovery 會讓插件保持可載入狀態，但在缺少任何必要插件時會發出警告。                                                     |
| `enabledByDefault`                   | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。省略它，或設定任何非 `true` 的值，以使外掛程式預設停用。                                                                            |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 僅在列出的 Node.js 平台上將打包的外掛程式標記為預設啟用，例如 `["darwin"]`。明確的配置仍然優先。                                                                    |
| `legacyPluginIds`                    | 否   | `string[]`                       | 會正規化為此標準插件 ID 的舊版 ID。                                                                                                                                 |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 當驗證、組態或模型參照提及這些提供者 ID 時，應自動啟用此外掛。                                                                                                      |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的專屬外掛程式種類。                                                                                                                   |
| `channels`                           | 否   | `string[]`                       | 由此插件擁有的頻道 ID。用於探索和組態驗證。                                                                                                                         |
| `providers`                          | 否   | `string[]`                       | 由此插件擁有的提供者 ID。                                                                                                                                           |
| `providerCatalogEntry`               | 否   | `string`                         | 輕量級提供者目錄模組路徑（相對於插件根目錄），用於可在不啟動完整插件執行時期的情況下載入的清單範圍提供者目錄元數據。                                                |
| `modelSupport`                       | 否   | `object`                         | 由清單擁有的簡寫模型系列元數據，用於在執行時期之前自動載入插件。                                                                                                    |
| `modelCatalog`                       | 否   | `object`                         | 宣告式模型目錄元資料，用於此外掛所擁有的提供者。這是未來唯讀列表、上架、模型選擇器、別名和抑制的控制平面契約，無需載入外掛執行時。                                  |
| `modelPricing`                       | 否   | `object`                         | 提供者所擁有的外部價格查詢策略。使用它可將本機/自託管提供者排除在遠端價格目錄之外，或將提供者參照對應至 OpenRouter/LiteLLM 目錄 ID，而無需在核心中硬編碼提供者 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供者所擁有的模型 ID 別名/前綴清理，必須在提供者執行時載入之前執行。                                                                                               |
| `providerEndpoints`                  | 否   | `object[]`                       | 清單所擁有的端點主機/baseUrl 元資料，用於核心必須在提供者執行時載入之前分類的提供者路由。                                                                           |
| `providerRequest`                    | 否   | `object`                         | 通用請求策略在提供者執行時載入之前所使用的低成本供應商系列和請求相容性元資料。                                                                                      |
| `secretProviderIntegrations`         | 否   | `Record<string, object>`         | 宣告式 SecretRef exec 提供者預設，安裝介面可以在不在核心中硬編碼特定提供者整合的情況下提供這些預設。                                                                |
| `cliBackends`                        | 否   | `string[]`                       | 由此外掛程式擁有的 CLI 推理後端 ID。用於從明確配置參照進行啟動時的自動啟用。                                                                                        |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供者或 CLI 後端參照，其外掛程式擁有的合成認證掛鉤應在運行時載入之前的冷模型探索期間進行探測。                                                                     |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 打包外掛程式擁有的預留位置 API 金鑰值，代表非機密的本機、OAuth 或環境憑證狀態。                                                                                     |
| `commandAliases`                     | 否   | `object[]`                       | 此外掛程式擁有的命令名稱，應在執行階段載入之前產生外掛程式感知的設定和 CLI 診斷。                                                                                   |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 已棄用的提供者驗證/狀態查詢相容性環境中繼資料。對於新的外掛程式，建議優先使用 `setup.providers[].envVars`；OpenClaw 在棄用過渡期間仍會讀取此項。                    |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 應重複使用另一個提供者 ID 進行驗證查詢的提供者 ID，例如一個共用基礎提供者 API 金鑰和驗證設定檔的編碼提供者。                                                        |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可以在不載入外掛程式碼的情況下檢查的低成本通道環境中繼資料。將此用於環境驅動的通道設定或通用啟動/設定輔助工具應該看到的驗證介面。                          |
| `providerAuthChoices`                | 否   | `object[]`                       | 用於入門選擇器、首選提供者解析和簡單 CLI 標記連線的低成本驗證選擇中繼資料。                                                                                         |
| `activation`                         | 否   | `object`                         | 用於啟動、提供者、命令、通道、路由和功能觸發載入的低成本啟動規劃器中繼資料。僅包含中繼資料；實際行為仍由外掛程式執行階段擁有。                                      |
| `setup`                              | 否   | `object`                         | 探索和設定介面可以在不載入外掛程式執行階段的情況下檢查的低成本設定/入門描述元。                                                                                     |
| `qaRunners`                          | 否   | `object[]`                       | 由共用的 `openclaw qa` 主機在外掛程式執行階段載入之前使用的低成本 QA 執行器描述元。                                                                                 |
| `contracts`                          | 否   | `object`                         | 用於外部驗證掛勾、嵌入、語音、即時轉錄、即時語音、媒體理解、影像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具擁有權的靜態功能擁有權快照。                      |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中宣告的提供者 ID 的低成本媒體理解預設值。                                                                               |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 針對在 `contracts.imageGenerationProviders` 中宣告的供應商 ID 的低成本影像生成驗證元數據，包括供應商擁有的驗證別名和基礎 URL 防護。                                 |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 針對在 `contracts.videoGenerationProviders` 中宣告的供應商 ID 的低成本影片生成驗證元數據，包括供應商擁有的驗證別名和基礎 URL 防護。                                 |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 針對在 `contracts.musicGenerationProviders` 中宣告的供應商 ID 的低成本音樂生成驗證元數據，包括供應商擁有的驗證別名和基礎 URL 防護。                                 |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 針對在 `contracts.tools` 中宣告的外掛擁有工具的低成本可用性元數據。當工具除非存在配置、環境或驗證證據否則不應載入執行時時使用。                                     |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在執行時載入之前合併到探索和驗證層的清單擁有的通道配置元數據。                                                                                                      |
| `skills`                             | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                                                                |
| `name`                               | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                                                                |
| `description`                        | 否   | `string`                         | 顯示在外掛介面上的簡短摘要。                                                                                                                                        |
| `version`                            | 否   | `string`                         | 資訊性外掛版本。                                                                                                                                                    |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置欄位的 UI 標籤、佔位符和敏感性提示。                                                                                                                            |

## 生成供應商元數據參考

生成供應商元數據欄位描述了在匹配的 `contracts.*GenerationProviders` 列表中宣告的供應商的靜態驗證訊號。
OpenClaw 在供應商執行時載入之前讀取這些欄位，以便核心工具可以
決定生成供應商是否可用，而無需匯入每個
供應商外掛。

僅將這些欄位用於低成本、事實性的宣告。傳輸、請求
轉換、令牌刷新、憑證驗證和實際的生成行為
保留在外掛執行時中。

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

| 欄位                   | 必填 | 類型       | 含義                                                                                            |
| ---------------------- | ---- | ---------- | ----------------------------------------------------------------------------------------------- |
| `aliases`              | 否   | `string[]` | 應視為此生成供應商之靜態驗證別名的額外供應商 ID。                                               |
| `authProviders`        | 否   | `string[]` | 其已設定的驗證設定檔應視為此生成供應商之驗證的供應商 ID。                                       |
| `configSignals`        | 否   | `object[]` | 適用於本機或自託管供應商的輕量級純設定可用性訊號，這類供應商無需驗證設定檔或環境變數即可設定。  |
| `authSignals`          | 否   | `object[]` | 明確的驗證訊號。當存在時，這些將取代來自供應商 ID、`aliases` 和 `authProviders` 的預設訊號集。  |
| `referenceAudioInputs` | 否   | `boolean`  | 僅限視訊生成。當供應商接受參考音訊資產時設為 `true`；否則 `video_generate` 會隱藏音訊參考參數。 |

每個 `configSignals` 項目支援：

| 欄位          | 必要 | 類型       | 說明                                                                                                           |
| ------------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | 是   | `string`   | 外掛擁有之設定物件的點路徑 (dot path) 以供檢查，例如 `plugins.entries.example.config`。                        |
| `overlayPath` | 否   | `string`   | 根設定內部的點路徑，其物件應在評估訊號前覆疋根物件。將此用於特定功能的設定，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效設定內部必須具有已設定值的點路徑。字串必須非空；物件和陣列必須非空。                                       |
| `requiredAny` | 否   | `string[]` | 有效設定內部至少必須有一個具有已設定值的點路徑。                                                               |
| `mode`        | 否   | `object`   | 有效設定內部的選用字串模式守衛。當純設定可用性僅適用於一種模式時使用此選項。                                   |

每個 `mode` 守衛支援：

| 欄位         | 必填 | 類型       | 說明                                                     |
| ------------ | ---- | ---------- | -------------------------------------------------------- |
| `path`       | 否   | `string`   | 有效設定內部的點路徑。預設為 `mode`。                    |
| `default`    | 否   | `string`   | 當設定中省略該路徑時使用的模式值。                       |
| `allowed`    | 否   | `string[]` | 如果存在，則僅當有效模式為這些值之一時，該信號才會通過。 |
| `disallowed` | 否   | `string[]` | 如果存在，則當有效模式為這些值之一時，該信號將失敗。     |

每個 `authSignals` 項目支援：

| 欄位              | 必填 | 類型     | 說明                                                                                                                   |
| ----------------- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在設定的驗證設定檔中檢查的提供者 ID。                                                                                |
| `providerBaseUrl` | 否   | `object` | 選用性防護機制，僅當參照的設定提供者使用允許的基礎 URL 時，才讓該信號計入。當驗證別名僅對特定 API 有效時，請使用此項。 |

每個 `providerBaseUrl` 防護支援：

| 欄位              | 必填 | 類型       | 說明                                                                                              |
| ----------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 應檢查其 `baseUrl` 的提供者設定 ID。                                                              |
| `defaultBaseUrl`  | 否   | `string`   | 當提供者設定省略 `baseUrl` 時假設的基礎 URL。                                                     |
| `allowedBaseUrls` | 是   | `string[]` | 此驗證信號允許的基礎 URL。當設定或預設基礎 URL 不符合這些正規化值中的任何一個時，該信號將被忽略。 |

## 工具元數據參考

`toolMetadata` 使用與生成提供者元數據相同的 `configSignals` 和 `authSignals` 形狀，並以工具名稱為鍵。`contracts.tools` 宣告所有權。`toolMetadata` 宣告低成本的可用性證據，以便 OpenClaw 可以避免僅為了讓其工具工廠傳回 `null` 而匯入插件運行時。

```json
{
  "setup": {
    "providers": [
      {
        "id": "example",
        "envVars": ["EXAMPLE_API_KEY"]
      }
    ]
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

如果工具沒有 `toolMetadata`，OpenClaw 將保留現有行為，並在工具合約符合策略時載入擁有該工具的外掛。對於工廠依賴 auth/config 的熱路徑工具，外掛作者應宣告 `toolMetadata`，而不是讓核心匯入執行時來詢問。

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。OpenClaw 會在提供者執行時載入之前讀取此內容。提供者設定清單會使用這些清單選項、衍生自描述元的設定選項和安裝目錄元數據，而不載入提供者執行時。

| 欄位                  | 必要 | 類型                                                                  | 意義                                                                    |
| --------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 此選項所屬的提供者 ID。                                                 |
| `method`              | 是   | `string`                                                              | 要分發到的驗證方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                                              | 供上架和 CLI 流程使用的穩定驗證選項 ID。                                |
| `choiceLabel`         | 否   | `string`                                                              | 使用者可見的標籤。如果省略，OpenClaw 將回退到 `choiceId`。              |
| `choiceHint`          | 否   | `string`                                                              | 選擇器的簡短輔助文字。                                                  |
| `assistantPriority`   | 否   | `number`                                                              | 較低的值會在助理驅動的互動式選擇器中排序較前。                          |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 在助理選擇器中隱藏該選項，同時仍允許手動 CLI 選擇。                     |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 應將使用者重新導向至此取代選項的舊版選項 ID。                           |
| `groupId`             | 否   | `string`                                                              | 用於分組相關選項的選用群組 ID。                                         |
| `groupLabel`          | 否   | `string`                                                              | 該群組的使用者可見標籤。                                                |
| `groupHint`           | 否   | `string`                                                              | 該群組的簡短輔助文字。                                                  |
| `optionKey`           | 否   | `string`                                                              | 簡單單一標誌驗證流程的內部選項金鑰。                                    |
| `cliFlag`             | 否   | `string`                                                              | CLI 標誌名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否   | `string`                                                              | 用於 CLI 說明的描述。                                                   |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此選項應出現在哪些入門介面中。如果省略，則預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有使用者可能會錯誤地放入 `plugins.allow` 或嘗試作為根 CLI 命令執行的執行時間命令名稱時，請使用 `commandAliases`。OpenClaw 使用此中繼資料進行診斷，而不匯入外掛執行時間程式碼。

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

| 欄位         | 必要 | 類型              | 意義                                           |
| ------------ | ---- | ----------------- | ---------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛的命令名稱。                         |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線命令，而非根 CLI 命令。    |
| `cliCommand` | 否   | `string`          | 如果存在，建議用於 CLI 操作的相關根 CLI 命令。 |

## activation 參考

當外掛可以輕鬆宣告哪些控制平面事件應將其包含在啟用/載入計畫中時，請使用 `activation`。

此區塊是規劃器中繼資料，而非生命週期 API。它不註冊執行時間行為，不取代 `register(...)`，也不保證外掛程式碼已經執行。啟用規劃器會在回退到現有的清單擁有權中繼資料（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和掛載）之前，使用這些欄位縮小候選外掛的範圍。

優先使用已經描述所有權的最窄中繼資料。當這些欄位表達該關係時，請使用
`providers`、`channels`、`commandAliases`、設定描述符或 `contracts`。
請使用 `activation` 來表示無法由這些所有權欄位代表的額外規劃器提示。
請使用頂層 `cliBackends` 來表示 CLI 執行時別名，例如 `claude-cli`、
`my-cli` 或 `google-gemini-cli`；`activation.onAgentHarnesses` 僅用於
尚未具有所有權欄位的嵌入式代理程式管控 id。

此區塊僅為中繼資料。它不註冊執行時行為，也不會取代 `register(...)`、`setupEntry` 或其他執行時/外掛程式進入點。
目前的消費者在更廣泛的外掛程式載入之前會將其用作縮小範圍的提示，因此
缺少非啟動啟用中繼資料通常只會影響效能；只要清單所有權備援機制仍然存在，
這應該不會影響正確性。

每個外掛程式都應該刻意設定 `activation.onStartup`。只有當外掛程式必須在 Gateway 啟動期間執行時，才將其設定為 `true`。
當外掛程式在啟動時處於非作用狀態，且應僅透過更窄的觸發程序載入時，請將其設定為 `false`。
省略 `onStartup` 不再會隱含地在啟動時載入外掛程式；請針對啟動、頻道、設定、agent-harness、記憶體或
其他更窄的啟用觸發程序使用明確的啟用中繼資料。

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

| 欄位               | 必要 | 類型                                                 | 含義                                                                                                                                                         |
| ------------------ | ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | 否   | `boolean`                                            | 明確的 Gateway 啟動啟用。每個外掛程式都應該設定此項。`true` 會在啟動期間匯入外掛程式；`false` 則讓其在啟動時保持延遲載入，除非另一個相符的觸發程序要求載入。 |
| `onProviders`      | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的提供者 ID。                                                                                                               |
| `onAgentHarnesses` | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的嵌入式代理程式執行環境執行階段 ID。針對 CLI 後端別名，請使用頂層 `cliBackends`。                                          |
| `onCommands`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的指令 ID。                                                                                                                 |
| `onChannels`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的頻道 ID。                                                                                                                 |
| `onRoutes`         | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的路由種類。                                                                                                                |
| `onConfigPaths`    | 否   | `string[]`                                           | 當路徑存在且未被明確停用時，應在啟動/載入計畫中包含此外掛程式的根相對組態路徑。                                                                              |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面啟用規劃所使用的廣泛功能提示。盡可能使用更窄的欄位。                                                                                                 |

目前的即時使用者：

- 閘道啟動規劃使用 `activation.onStartup` 進行明確的啟動
  匯入
- 指令觸發的 CLI 規劃會回退到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 代理程式執行階段啟動規劃針對
  嵌入式執行環境使用 `activation.onAgentHarnesses`，針對 CLI 執行階段別名使用頂層 `cliBackends[]`
- 頻道觸發的設定/頻道規劃在缺少明確的頻道啟用中繼資料時，會回退到舊版 `channels[]`
  所有權
- 外掛程式啟動規劃針對非頻道的根
  組態層級（例如隨附的瀏覽器外掛程式的 `browser` 區塊）使用 `activation.onConfigPaths`
- 提供者觸發的設定/執行階段規劃在缺少明確的提供者
  啟用中繼資料時，會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有權

規劃器診斷可以區分明確的啟動提示與清單所有權後備機制。例如，`activation-command-hint` 表示 `activation.onCommands` 已匹配，而 `manifest-command-alias` 表示規劃器改用了 `commandAliases` 所有權。這些原因標籤是用於主機診斷和測試；外掛作者應繼續宣告最能描述所有權的中繼資料。

## qaRunners 參考

當外掛在共享的 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。請保持此中繼資料為低成本且靜態；外掛執行時仍透過匯出 `qaRunnerCliRegistrations` 的輕量級 `runtime-api.ts` 介面擁有實際的 CLI 註冊。

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
| `description` | 否   | `string` | 當共享主機需要存根指令時使用的後備說明文字。     |

## setup 參考

當設定和上架介面需要在執行時載入之前取得低成本的外掛擁有中繼資料時，請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推論後端。`setup.cliBackends` 是控制平面/設定流程的專用設定描述器介面，應僅包含中繼資料。

當存在時，`setup.providers` 和 `setup.cliBackends` 是用於設定探索的偏好描述器優先查詢介面。如果描述器僅縮小候選外掛範圍，而設定仍需要更豐富的設定時執行時掛鉤，請設定 `requiresRuntime: true` 並保留 `setup-api` 作為後備執行路徑。

OpenClaw 還會在通用提供者驗證和環境變數查找中包含 `setup.providers[].envVars`。在棄用期間，`providerAuthEnvVars` 透過相容性轉接器保持支援，但仍使用它的非捆綁式外掛會收到清單診斷訊息。新外掛應將設定/狀態環境中繼資料放在 `setup.providers[].envVars` 上。

當沒有可用的設定項目，或者當 `setup.requiresRuntime: false` 宣告設定執行時期並非必要時，OpenClaw 也可以從 `setup.providers[].authMethods` 推導簡單的設定選擇。對於自訂標籤、CLI 標誌、上架範圍和助手中繼資料，顯式的 `providerAuthChoices` 項目仍然首選。

僅當那些描述符足以用於設定介面時，才設定 `requiresRuntime: false`。OpenClaw 將顯式的 `false` 視為僅描述符契約，並且不會執行 `setup-api` 或 `openclaw.setupEntry` 進行設定查找。如果僅描述符的外掛仍然包含其中一個設定執行時期項目，OpenClaw 會回報附加診斷訊息並繼續忽略它。省略 `requiresRuntime` 可保留舊版後續行為，以便那些未帶該旗標便新增描述符的現有外掛不會中斷。

由於設定查找可以執行外掛擁有的 `setup-api` 程式碼，正規化後的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必須在所有探索到的外掛之間保持唯一。模糊的所有權會導致封閉式失敗，而不是從探索順序中選出贏家。

當設定執行時期確實執行時，如果 `setup-api` 註冊了清單描述符未宣告的提供者或 CLI 後端，或者如果描述符沒有相符的執行時期註冊，設定登錄診斷會回報描述符漂移。這些診斷是附加性的，不會拒絕舊版外掛。

### setup.providers 參考

| 欄位           | 必填 | 類型       | 含義                                                             |
| -------------- | ---- | ---------- | ---------------------------------------------------------------- |
| `id`           | 是   | `string`   | 在設定或上架期間公開的提供者 ID。請保持正規化 ID 全域唯一。      |
| `authMethods`  | 否   | `string[]` | 此供應商無需載入完整執行時即可支援的設定/驗證方法 ID。           |
| `envVars`      | 否   | `string[]` | 通用設定/狀態介面可在插件執行時載入前檢查的環境變數。            |
| `authEvidence` | 否   | `object[]` | 適用於可透過非機密標記進行驗證的供應商之低成本本機驗證證據檢查。 |

`authEvidence` 適用於供應商擁有的本機憑證標記，這些標記無需載入執行時程式碼即可驗證。這些檢查必須保持低成本且在本機進行：不進行網路呼叫、不讀取鑰匙圈或秘密管理器、不執行 Shell 指令，也不進行供應商 API 探測。

支援的證據項目：

| 欄位               | 必填 | 類型       | 說明                                                                                 |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------------------ |
| `type`             | 是   | `string`   | 目前為 `local-file-with-env`。                                                       |
| `fileEnvVar`       | 否   | `string`   | 包含明確憑證檔案路徑的環境變數。                                                     |
| `fallbackPaths`    | 否   | `string[]` | 當 `fileEnvVar` 缺失或為空時檢查的本機憑證檔案路徑。支援 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在證據有效之前，至少一個列出的環境變數必須非空。                                     |
| `requiresAllEnv`   | 否   | `string[]` | 在證據有效之前，每個列出的環境變數都必須非空。                                       |
| `credentialMarker` | 是   | `string`   | 當證據存在時返回的非機密標記。                                                       |
| `source`           | 否   | `string`   | 用於驗證/狀態輯出的使用者端來源標籤。                                                |

### setup 欄位

| 欄位               | 必填 | 類型       | 說明                                                                |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和導入期間公開的供應商設定描述元。                            |
| `cliBackends`      | 否   | `string[]` | 用於描述優先設定查詢的設定時間後端 ID。請保持標準化的 ID 全域唯一。 |
| `configMigrations` | 否   | `string[]` | 由此外掛程式的設定介面所擁有的設定遷移 ID。                         |
| `requiresRuntime`  | 否   | `boolean`  | 在描述子查找後，設定是否仍需要 `setup-api` 執行。                   |

## uiHints 參考

`uiHints` 是從設定欄位名稱到小型渲染提示的對應。

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
| `label`       | `string`   | 使用者面對的欄位標籤。   |
| `help`        | `string`   | 簡短的輔助文字。         |
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的佔位符文字。   |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可在不匯入外掛程式執行時期的情況下讀取的靜態能力擁有權元數據。

```json
{
  "contracts": {
    "agentToolResultMiddleware": ["openclaw", "codex"],
    "externalAuthProviders": ["acme-ai"],
    "embeddingProviders": ["openai-compatible"],
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "memoryEmbeddingProviders": ["local"],
    "mediaUnderstandingProviders": ["openai"],
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

| 欄位                             | 類型       | 含義                                                                      |
| -------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex app-server 擴充工廠 ID，目前為 `codex-app-server`。                 |
| `agentToolResultMiddleware`      | `string[]` | 打包的外掛程式可以為其註冊工具結果中介軟體的執行時期 ID。                 |
| `externalAuthProviders`          | `string[]` | 此外掛程式擁有其外部授權設定檔掛鉤的提供者 ID。                           |
| `embeddingProviders`             | `string[]` | 此外掛程式擁有的一般嵌入提供者 ID，用於可重複使用的向量嵌入，包括記憶體。 |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 ID。                                           |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄提供者 ID。                                       |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音提供者 ID。                                       |
| `memoryEmbeddingProviders`       | `string[]` | 此外掛程式擁有的已棄用記憶體特定嵌入供應商 ID。                           |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解供應商 ID。                                       |
| `transcriptSourceProviders`      | `string[]` | 此外掛程式擁有的文字紀錄來源供應商 ID。                                   |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的影像生成供應商 ID。                                       |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成供應商 ID。                                       |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取供應商 ID。                                       |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋供應商 ID。                                       |
| `migrationProviders`             | `string[]` | 此外掛程式為 `openclaw migrate` 擁有的匯入供應商 ID。                     |
| `gatewayMethodDispatch`          | `string[]` | 為在進程內分派 Gateway 方法的已驗證外掛程式 HTTP 路由保留的權利。         |
| `tools`                          | `string[]` | 此外掛程式擁有的代理程式工具名稱。                                        |

`contracts.embeddedExtensionFactories` 保留給僅限捆綁式 Codex 應用程式伺服器的擴充功能工廠。捆綁式工具結果轉換應改為宣告 `contracts.agentToolResultMiddleware` 並向 `api.registerAgentToolResultMiddleware(...)` 註冊。外部外掛程式無法註冊工具結果中介軟體，因為縫合可以在模型看到高信任度工具輸出之前重寫它。

執行時 `api.registerTool(...)` 註冊必須符合 `contracts.tools`。工具探索使用此清單來僅載入可擁有所請求工具的外掛程式執行時。

實作 `resolveExternalAuthProfiles` 的供應商外掛程式應宣告 `contracts.externalAuthProviders`；未宣告的外部身份驗證掛鉤將被忽略。

一般嵌入提供者應針對向 `api.registerEmbeddingProvider(...)` 註冊的每個配接器宣告 `contracts.embeddingProviders`。使用一般合約以進行可重複使用的向量生成，包括記憶體搜尋所使用的提供者。`contracts.memoryEmbeddingProviders` 是已棄用的記憶體特定相容性功能，僅在現有提供者遷移至通用嵌入提供者介面時保留。

`contracts.gatewayMethodDispatch` 目前接受 `"authenticated-request"`。它是原生外掛 HTTP 路由的 API 衛生閘道，用於在行程內刻意分派 Gateway 控制平面方法，而非針對惡意原生外掛的沙箱。僅將其用於已經過嚴格審查、且需要 Gateway HTTP 驗證的內建/操作員介面。

## mediaUnderstandingProviderMetadata 參考

當媒體理解提供者擁有預設模型、自動驗證後援優先順序，或通用核心輔助工具在執行階段載入之前所需的原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。索引鍵也必須在 `contracts.mediaUnderstandingProviders` 中宣告。

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

每個提供者項目可以包含：

| 欄位                   | 類型                                | 說明                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供者公開的媒體功能。                           |
| `defaultModels`        | `Record<string, string>`            | 當設定未指定模型時，使用的功能對模型預設值。       |
| `autoPriority`         | `Record<string, number>`            | 數字越小，在自動基於憑證的提供者後援中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供者支援的原生文件輸入。                         |

## channelConfigs 參考

當頻道外掛需要在執行階段載入之前取得低成本的設定中繼資料時，請使用 `channelConfigs`。唯讀頻道設定/狀態探索可以直接使用此中繼資料，用於當沒有可用的設定項目時，或是當 `setup.requiresRuntime: false` 宣告設定執行階段非必要時的已設定外部頻道。

`channelConfigs` 是外掛程式清單元資料，而非新的頂層使用者設定區段。使用者仍然在 `channels.<channel-id>` 下設定通道實例。OpenClaw 會讀取清單元資料，以便在外掛程式執行時代碼執行之前，決定哪個外掛程式擁有該已設定的通道。

對於通道外掛程式，`configSchema` 和 `channelConfigs` 描述了不同的路徑：

- `configSchema` 驗證 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 驗證 `channels.<channel-id>`

宣告 `channels[]` 的非捆綁外掛程式也應該宣告相符的 `channelConfigs` 項目。如果沒有這些項目，OpenClaw 仍然可以載入外掛程式，但是在執行時代碼執行之前，冷路徑設定架構、設定和控制 UI 介面將無法得知通道擁有的選項形狀。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可以宣告靜態 `auto` 預設值，以供在通道執行時載入之前執行的指令設定檢查使用。捆綁通道也可以透過 `package.json#openclaw.channel.commands` 發布相同的預設值，以及其其他套件擁有的通道目錄元資料。

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

| 欄位          | 類型                     | 說明                                                                   |
| ------------- | ------------------------ | ---------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。對於每個宣告的通道設定項目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 該通道設定區段的選用 UI 標籤/預留位置/敏感提示。                       |
| `label`       | `string`                 | 當執行時元資料尚未就緒時，合併到選擇器和檢查介面中的通道標籤。         |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                                     |
| `commands`    | `object`                 | 用於執行前設定檢查的靜態原生指令和原生技能自動預設值。                 |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應勝過的舊版或較低優先級外掛程式 ID。                |

### 替換另一個頻道外掛程式

當您的外掛程式是某個頻道 ID 的首選擁有者，而其他外掛程式也能提供該頻道時，請使用 `preferOver`。常見情況包括重新命名的外掛程式 ID、取代捆綁外掛程式的獨立外掛程式，或是為了設定檔相容性而保留相同頻道 ID 的維護分支。

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

當配置 `channels.chat` 時，OpenClaw 會同時考慮頻道 ID 和首選外掛程式 ID。如果優先順序較低的外掛程式僅因為它是捆綁或預設啟用而被選中，OpenClaw 會在有效的執行時期設定中停用它，讓一個外掛程式擁有該頻道及其工具。明確的使用者選擇仍然優先：如果使用者明確啟用了這兩個外掛程式，OpenClaw 將保留該選擇，並回報重複的頻道/工具診斷訊息，而不是無聲地變更請求的外掛程式集。

請將 `preferOver` 限制在真正能提供相同頻道的外掛程式 ID 範圍內。它不是一個通用的優先順序欄位，也不會重新命名使用者設定檔鍵。

## modelSupport 參考資料

當 OpenClaw 應該在執行時期載入外掛程式之前，從簡寫模型 ID（如 `gpt-5.5` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 會套用此優先順序：

- 明確的 `provider/model` 參考使用擁有它的 `providers` 清單元資料
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非捆綁外掛程式和一個捆綁外掛程式都符合，非捆綁外掛程式勝出
- 剩餘的模糊性會被忽略，直到使用者或設定指定提供者

欄位：

| 欄位            | 類型       | 含義                                                    |
| --------------- | ---------- | ------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 針對簡寫模型 ID 比對的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，針對簡寫模型 ID 比對的 Regex 來源。 |

`modelPatterns` 項目是透過 `compileSafeRegex` 編譯的，這會拒絕
包含巢狀重複的模式（例如 `(a+)+$`）。未通過
安全檢查的模式會被無聲跳過，與語法無效的規則運算式（regex）相同。
請保持模式簡單，並避免巢狀量詞。

## modelCatalog 參考

當 OpenClaw 需要在載入外掛執行時之前知道提供者模型元資料時，請使用 `modelCatalog`。這是清單擁有的固定目錄
列、提供者別名、抑制規則和探索模式的來源。執行時重新整理
仍屬於提供者執行時程式碼的一部分，但清單會告知核心何時需要
執行時。

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

| 欄位             | 類型                                                     | 說明                                                                   |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | 由此外掛擁有的提供者 ID 的目錄列。金鑰也應出現在頂層 `providers` 中。  |
| `aliases`        | `Record<string, object>`                                 | 應解析為擁有提供者以進行目錄或抑制規劃的提供者別名。                   |
| `suppressions`   | `object[]`                                               | 來自其他來源的模型列，此外掛因提供者特定原因而將其抑制。               |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供者目錄是否可以從清單元資料讀取、重新整理到快取中，或需要執行時。   |
| `runtimeAugment` | `boolean`                                                | 僅當提供者執行時必須在清單/設定規劃之後附加目錄列時，才設定為 `true`。 |

`aliases` 參與模型目錄規劃的提供者所有權查找。
別名目標必須是同一外掛擁有的頂層提供者。當
提供者篩選清單使用別名時，OpenClaw 可以讀取擁有清單並
套用別名 API/基礎 URL 覆寫，而無需載入提供者執行時。
別名不會展開未篩選的目錄清單；廣泛清單僅發出擁有的
正式提供者列。

`suppressions` 取代了舊的 provider runtime `suppressBuiltInModel` hook。
僅當提供者由外掛程式擁有或被宣告為針對擁有之提供者的 `modelCatalog.aliases` 鍵時，才會遵守抑制項目。在模型解析期間，不再呼叫執行時期抑制 hooks。

提供者欄位：

| 欄位      | 類型                     | 含義                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供者目錄中模型的可選預設基礎 URL。    |
| `api`     | `ModelApi`               | 此提供者目錄中模型的可選預設 API 配接器。 |
| `headers` | `Record<string, string>` | 套用至此提供者目錄的可選靜態標頭。        |
| `models`  | `object[]`               | 必要的模型列。沒有 `id` 的列將被忽略。    |

模型欄位：

| 欄位            | 類型                                                           | 含義                                                      |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `id`            | `string`                                                       | 提供者本地的模型 ID，不含 `provider/` 前綴。              |
| `name`          | `string`                                                       | 可選的顯示名稱。                                          |
| `api`           | `ModelApi`                                                     | 可選的個別模型 API 覆寫。                                 |
| `baseUrl`       | `string`                                                       | 可選的個別模型基礎 URL 覆寫。                             |
| `headers`       | `Record<string, string>`                                       | 可選的個別模型靜態標頭。                                  |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模態。                                          |
| `reasoning`     | `boolean`                                                      | 模型是否公開推理行為。                                    |
| `contextWindow` | `number`                                                       | 原生提供者內容視窗。                                      |
| `contextTokens` | `number`                                                       | 若與 `contextWindow` 不同時的可選有效執行時期內容上限。   |
| `maxTokens`     | `number`                                                       | 已知時的最大輸出 token 數。                               |
| `cost`          | `object`                                                       | 每百萬 Token 的美金可選定價，包括可選的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 符合 OpenClaw 模型配置相容性的可選相容性旗標。            |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列出的狀態。僅當該列絕不能出現時才隱藏。                  |
| `statusReason`  | `string`                                                       | 與不可用狀態一起顯示的可選原因。                          |
| `replaces`      | `string[]`                                                     | 此模型取代的舊版供應商本機模型 ID。                       |
| `replacedBy`    | `string`                                                       | 已棄用列的取代用供應商本機模型 ID。                       |
| `tags`          | `string[]`                                                     | 選擇器和篩選器使用的穩定標籤。                            |

隱藏欄位：

| 欄位                       | 類型       | 含義                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `provider`                 | `string`   | 要隱藏的上游列的供應商 ID。必須由此外掛擁有或聲明為擁有的別名。 |
| `model`                    | `string`   | 要隱藏的供應商本機模型 ID。                                     |
| `reason`                   | `string`   | 當直接請求隱藏列時顯示的可選訊息。                              |
| `when.baseUrlHosts`        | `string[]` | 套用隱藏之前所需的有效供應商基礎 URL 主機的可選清單。           |
| `when.providerConfigApiIn` | `string[]` | 套用隱藏之前所需的确切供應商配置 `api` 值的可選清單。           |

請勿將僅在執行時期的資料放在 `modelCatalog` 中。僅當資訊清單
列完整到足以讓提供者過濾的清單和選擇器介面跳過
註冊表/執行時期探索時，才使用 `static`。當資訊清單列是有用的
可列舉種子或補充資料，但重新整理/快取可以在稍後新增更多列時，請使用 `refreshable`；
可重新整理的列本身並不具有權威性。當 OpenClaw
必須載入提供者執行時期才能知道清單時，請使用 `runtime`。

## modelIdNormalization 參考

使用 `modelIdNormalization` 進行低成本的提供者擁有的模型 ID 清理，該清理必須
在提供者執行時期載入之前發生。這會將別名（例如短模型
名稱、提供者本地的舊版 ID 和代理前綴規則）保留在擁有的外掛程式
資訊清單中，而不是在核心模型選擇表中。

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

提供者欄位：

| 欄位                                 | 類型                    | 含義                                                                    |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不區分大小寫的精確模型 ID 別名。值將按書寫形式返回。                    |
| `stripPrefixes`                      | `string[]`              | 在別名查找之前要移除的前綴，適用於舊版提供者/模型重複的情況。           |
| `prefixWhenBare`                     | `string`                | 當正規化後的模型 ID 尚未包含 `/` 時要新增的前綴。                       |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 別名查找之後的條件式純 ID 前綴規則，以 `modelPrefix` 和 `prefix` 為鍵。 |

## providerEndpoints 參考

使用 `providerEndpoints` 進行端點分類，這是通用請求策略
在提供者執行時期載入之前必須知道的。核心仍然擁有每個
`endpointClass` 的含義；外掛程式資訊清單擁有主機和基底 URL 元資料。

端點欄位：

| 欄位                           | 類型       | 含義                                                                          |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端點類別，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 對應到端點類別的精確主機名稱。                                                |
| `hostSuffixes`                 | `string[]` | 對應至端點類別的主機後綴。前綴加上 `.` 以僅比對網域後綴。                     |
| `baseUrls`                     | `string[]` | 對應至端點類別的確切正規化 HTTP(S) 基礎 URL。                                 |
| `googleVertexRegion`           | `string`   | 用於確切全域主機的靜態 Google Vertex 區域。                                   |
| `googleVertexRegionHostSuffix` | `string`   | 從匹配的主機中去除的後綴，以顯露 Google Vertex 區域前綴。                     |

## providerRequest 參考

使用 `providerRequest` 來提供通用請求原則所需且不需載入提供者執行時期的輕量級請求相容性中繼資料。請將特定行為的 Payload 重寫保留在提供者執行時期間掛鉤 (hooks) 或共用的提供者家族協助程式中。

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
| `family`              | `string`     | 用於通用請求相容性決策和診斷的提供者家族標籤。               |
| `compatibilityFamily` | `"moonshot"` | 用於共用請求協助程式的選用性提供者家族相容性分組 (bucket)。  |
| `openAICompletions`   | `object`     | OpenAI 相容的完成請求旗標，目前為 `supportsStreamingUsage`。 |

## secretProviderIntegrations 參考

當外掛程式可以發佈可重複使用的 SecretRef exec 提供者預設時，請使用 `secretProviderIntegrations`。OpenClaw 會在外掛程式執行時期載入前讀取此中繼資料，將外掛程式擁有權儲存在 `secrets.providers.<alias>.pluginIntegration` 中，並將實際的秘密解析工作留給 SecretRef 執行時期。預設僅針對打包的外掛程式，以及從受管理外掛程式安裝根目錄 (例如 git 和 ClawHub 安裝) 發現的已安裝外掛程式公開。

```json
{
  "secretProviderIntegrations": {
    "secret-store": {
      "providerAlias": "team-secrets",
      "displayName": "Team secrets",
      "source": "exec",
      "command": "${node}",
      "args": ["./bin/resolve-secrets.mjs"]
    }
  }
}
```

對映鍵是整合 ID。如果省略了 `providerAlias`，OpenClaw 會使用整合 ID 作為 SecretRef 提供者別名。提供者別名必須符合正常的 SecretRef 提供者別名模式，例如 `team-secrets` 或 `onepassword-work`。

當操作員選擇預設時，OpenClaw 會寫入如下的提供者參照：

```json
{
  "secrets": {
    "providers": {
      "team-secrets": {
        "source": "exec",
        "pluginIntegration": {
          "pluginId": "acme-secrets",
          "integrationId": "secret-store"
        }
      }
    }
  }
}
```

在啟動/重新載入時，OpenClaw 會透過載入目前的 plugin
manifest 元資料、檢查擁有者外掛程式是否已安裝並啟用，以及從 manifest 具體化 exec 指令來解析該提供者。停用或移除
外掛程式會撤銷使用中 SecretRef 的提供者。需要獨立
exec 設定的操作員仍可直接撰寫手動 `command`/`args` 提供者。

目前僅支援 `source: "exec"` 預設集。`command` 必須是
`${node}`，而 `args[0]` 必須是相對於外掛程式根目錄的 `./` 解析器腳本。
OpenClaw 會在啟動/重新載入時將其具體化為目前的 Node 可執行檔和
外掛程式內的絕對腳本路徑。Node 選項（例如 `--require`、`--import`、
`--loader`、`--env-file`、`--eval` 和 `--print`）並非 manifest
預設集合約的一部分。需要非 Node 指令的操作員可以直接設定獨立
的手動 exec 提供者。

對於 manifest 預設集，OpenClaw 會根據外掛程式根目錄推導 `trustedDirs`，而對於
`${node}` 預設集，則根據目前的 Node 可執行目錄推導。Manifest 中定義的
`trustedDirs` 會被忽略。其他 exec 提供者選項，例如 `timeoutMs`、
`maxOutputBytes`、`jsonOnly`、`env`、`passEnv` 和 `allowInsecurePath` 會
傳遞至標準的 SecretRef exec 提供者設定。

## modelPricing 參考

當提供者在執行時間載入之前需要控制平面定價行為時，請使用 `modelPricing`。Gateway 定價快取會讀取此元資料，而不匯入
提供者執行時間程式碼。

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

提供者欄位：

| 欄位         | 類型              | 含義                                                                                   |
| ------------ | ----------------- | -------------------------------------------------------------------------------------- |
| `external`   | `boolean`         | 針對不應擷取 OpenRouter 或 LiteLLM 定價的本機/自我託管提供者，請將 `false` 設為 true。 |
| `openRouter` | `false \| object` | OpenRouter 定價查詢對應。`false` 停用此提供者的 OpenRouter 查詢。                      |
| `liteLLM`    | `false \| object` | LiteLLM 定價查詢對應。`false` 停用此提供者的 LiteLLM 查詢。                            |

來源欄位：

| 欄位                       | 類型               | 說明                                                                                   |
| -------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 當外部目錄提供者 ID 與 OpenClaw 提供者 ID 不同時使用，例如針對 `zai` 提供者的 `z-ai`。 |
| `passthroughProviderModel` | `boolean`          | 將包含斜線的模型 ID 視為巢狀提供者/模型參照，適用於 OpenRouter 等代理提供者。          |
| `modelIdTransforms`        | `"version-dots"[]` | 額外的外部目錄模型 ID 變體。`version-dots` 會嘗試點號版本 ID，例如 `claude-opus-4.6`。 |

### OpenClaw 提供者索引

OpenClaw 提供者索引是 OpenClaw 擁有的提供者預覽元數據，適用於外掛程式可能尚未安裝的提供者。它不屬於外掛程式清單的一部分。外掛程式清單仍是已安裝外掛程式的權威來源。提供者索引是內部備用合約，當提供者外掛程式未安裝時，未來的可安裝提供者和預安裝模型選擇器介面將會使用此合約。

目錄權威順序：

1. 使用者設定。
2. 已安裝的外掛程式清單 `modelCatalog`。
3. 來自手動重新整理的模型目錄快取。
4. OpenClaw 提供者索引預覽列。

供應商索引不得包含秘密資訊、啟用狀態、執行時鉤子 (runtime hooks) 或即時的帳戶特定模型資料。其預覽目錄使用與外掛清單相同的 `modelCatalog` 供應商欄位形狀，但應僅限於穩定的顯示元資料，除非有意將 `api`、`baseUrl`、定價或相容性標幟等執行時介接器欄位與已安裝的外掛清單保持同步。具有即時 `/models` 探索功能的供應商，應透過明確的模型目錄快取路徑寫入重新整理的欄位，而不是進行正常的列舉或入門呼叫供應商 API。

供應商索引條目也可能包含可安裝外掛的元資料，適用於其外掛已移出核心或尚未安裝的供應商。此元資料反映頻道目錄模式：套件名稱、npm 安裝規格、預期的完整性以及廉價的授權選擇標籤，足以顯示可安裝的設定選項。一旦安裝了外掛，其清單將優先採用，並忽略該供應商的供應商索引條目。

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清單載入不再將這些頂層欄位視為功能所有權。

## 清單與 package. 的比較

這兩個檔案有不同的用途：

| 檔案                   | 用途                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、設定驗證、授權選擇元資料，以及必須在外掛程式碼執行前存在的 UI 提示             |
| `package.json`         | npm 元資料、相依性安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊 |

如果您不確定某段元資料應放在何處，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果內容涉及打包、入口檔案或 npm install 行為，請將其放在 `package.json`

### 影響發現的 package. 欄位

某些執行前階段的插件元資料有意放在 `package.json` 中的
`openclaw` 區塊，而非 `openclaw.plugin.json`。
`openclaw.bundle` 和 `openclaw.bundle.json` 並非 OpenClaw 插件合約；
原生插件必須使用 `openclaw.plugin.json` 以及下方支援的
`package.json#openclaw` 欄位。

重要範例：

| 欄位                                                                                       | 含義                                                                                                  |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 宣告原生插件入口點。必須保留在插件套件目錄中。                                                        |
| `openclaw.runtimeExtensions`                                                               | 宣告已安裝套件的建置 JavaScript 執行時入口點。必須保留在插件套件目錄中。                              |
| `openclaw.setupEntry`                                                                      | 輕量級僅設定入口點，用於上線、延遲通道啟動以及唯讀通道狀態/SecretRef 探索。必須保留在插件套件目錄中。 |
| `openclaw.runtimeSetupEntry`                                                               | 宣告已安裝套件的建置 JavaScript 設定入口點。需要 `setupEntry`，必須存在，且必須保留在插件套件目錄中。 |
| `openclaw.channel`                                                                         | 輕量級通道目錄元資料，如標籤、文件路徑、別名和選擇複製文字。                                          |
| `openclaw.channel.commands`                                                                | 靜態原生指令和原生技能自動預設元資料，由設定、稽核和指令列表介面在通道執行時載入前使用。              |
| `openclaw.channel.configuredState`                                                         | 輕量級設定狀態檢查器元資料，可在不載入完整通道執行時的情況下回答「僅環境設定是否已存在？」。          |
| `openclaw.channel.persistedAuthState`                                                      | 輕量級持續性驗證檢查器元資料，可在不載入完整通道執行時的情況下回答「是否已登入任何項目？」。          |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 捆綁和外部發布插件的安裝/更新提示。                                                                   |
| `openclaw.install.defaultChoice`                                                           | 當有多個安裝來源可用時的首選安裝路徑。                                                                |
| `openclaw.install.minHostVersion`                                                          | 支援的最低 OpenClaw 主機版本，使用像 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 的 semver 下限。            |
| `openclaw.compat.pluginApi`                                                                | 此套件所需的最低 OpenClaw 外掛 API 版本範圍，使用像 `>=2026.5.27` 的 semver 下限。                    |
| `openclaw.install.expectedIntegrity`                                                       | 預期的 npm 發行版完整性字串，例如 `sha512-...`；安裝和更新流程會根據它驗證擷取的成品。                |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 當配置無效時，允許針對捆綁的外掛重新安裝提供一個狹窄的復原路徑。                                      |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 讓設定執行時期的頻道介面在監聽之前載入，然後將完整配置的頻道外掛延遲至監聽後啟用。                    |

Manifest 元資料決定了在執行時期載入之前，入門流程中會出現哪些提供者/頻道/設定選項。`package.json#openclaw.install` 告訴入門流程當使用者挑選其中一個選項時，如何取得或啟用該外掛。請勿將安裝提示移至 `openclaw.plugin.json`。

對於非捆綁外掛來源，會在安裝和 manifest 登錄載入期間強制執行 `openclaw.install.minHostVersion`。無效值會被拒絕；在較舊的主機上，較新但有效的值會跳過外部外掛。捆綁來源的外掛假設與主機版本同步。

對於非捆綁外掛來源，會在套件安裝期間強制執行 `openclaw.compat.pluginApi`。用它來表示此套件建構時所依據的 OpenClaw 外掛 SDK/執行時期 API 下限。當外掛套件需要較新的 API 但在其他流程中仍保持較低的安裝提示時，它可以比 `minHostVersion` 更嚴格。官方的 OpenClaw 發行版本預設會將現有的官方外掛 API 下限同步提升至 OpenClaw 的發行版本，但僅針對外掛的發行版本可以在套件刻意支援較舊主機時保持較低下限。不要僅使用套件版本作為相容性合約。`peerDependencies.openclaw` 仍是 npm 套件元資料；OpenClaw 使用 `openclaw.compat.pluginApi` 合約來決定安裝相容性。

當外掛程式發佈於 ClawHub 時，正式的隨需安裝元資料應使用 `clawhubSpec`；入站處理會將其視為首選的遠端來源，並在安裝後記錄 ClawHub 構件事實。`npmSpec` 則是尚未遷移至 ClawHub 之套件的相容性後援。

精確的 npm 版本鎖定已存在於 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。正式的外部目錄項目應將精確規格與 `expectedIntegrity` 配對，以便在擷取的 npm 構件不再符合鎖定的發行版本時，讓更新流程閉合失敗。為了相容性，互動式入站仍提供受信任的 registry npm 規格，包括裸套件名稱和 dist-tags。目錄診斷可以區分精確、浮動、完整性鎖定、缺少完整性、套件名稱不符和無效預設選擇來源。當 `expectedIntegrity` 存在但沒有有效的 npm 來源可供鎖定時，它們也會發出警告。當 `expectedIntegrity` 存在時，安裝/更新流程會強制執行它；當它被省略時，registry 解析會被記錄而不包含完整性鎖定。

當狀態、頻道清單或 SecretRef 掃描需要在不載入完整執行環境的情況下識別已設定的帳戶時，頻道外掛應提供 `openclaw.setupEntry`。設定項目應公開頻道元資料以及設定安全的 config、status 和 secrets 配接器；將網路用戶端、閘道接聽程式和傳輸執行環境保留在主要擴充項目進入點中。

執行環境進入點欄位不會覆寫來源進入點欄位的套件邊界檢查。例如，`openclaw.runtimeExtensions` 無法讓逸出的 `openclaw.extensions` 路徑變得可載入。

`openclaw.install.allowInvalidConfigRecovery` 的範圍是有意縮小的。它並不會讓任意的損壞設定變得可安裝。目前它僅允許安裝流程從特定的過時打包外掛升級失敗中恢復，例如遺失的打包外掛路徑，或是同一打包外掛的過時 `channels.<id>` 項目。無關的設定錯誤仍會封鎖安裝，並將操作者引導至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微小檢查器模組的套件中繼資料：

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

當設定、doctor、status 或唯讀呈現流程在完整的頻道外掛載入之前需要一個廉價的是/否授權探測時使用它。持久的授權狀態不是已設定的頻道狀態：請勿使用此中繼資料來自動啟用外掛、修復執行時期相依性，或決定是否應載入頻道執行時期。目標匯出應該是一個僅讀取持久狀態的小型函式；請勿透過完整的頻道執行時期匯入桶來傳送它。

`openclaw.channel.configuredState` 遵循相同的形狀以進行廉價的僅環境設定檢查：

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

當頻道可以從環境或其他微小的非執行時期輸入回答已設定狀態時使用它。如果檢查需要完整的設定解析或真實的頻道執行時期，請將該邏輯保留在外掛的 `config.hasConfiguredState` hook 中。

## 探索優先順序（重複的外掛 ID）

OpenClaw 從多個根目錄探索外掛。若要了解原始檔案系統掃描順序，請參閱 [外掛掃描順序](/zh-Hant/gateway/configuration-reference#plugin-scan-order)。如果兩個探索結果共用相同的 `id`，只會保留 **最高優先順序** 的 manifest；較低優先順序的重複項會被捨棄，而不是與其並載入。

優先順序，從高到低：

1. **組態選定** — 在 `plugins.entries.<id>` 中明確釘選的路徑
2. **隨附** — 隨 OpenClaw 一起發布的外掛
3. **全域安裝** — 安裝到全域 OpenClaw 外掛根目錄的外掛
4. **工作區** — 相對於當前工作區探索的外掛

影響：

- 位於工作區中的分支或過時的隨附外掛副本將不會遮蔽隨附的組建。
- 若要實際使用本機外掛覆寫隨附外掛，請透過 `plugins.entries.<id>` 釘選它，使其透過優先順序獲勝，而不是依賴工作區探索。
- 重複項的捨棄會被記錄下來，以便 Doctor 和啟動診斷可以指向被捨棄的副本。
- 組態選定的重複覆寫在診斷中會被表述為明確覆寫，但仍會發出警告，以便過時的分支和意外的遮蔽保持可見。

## JSON Schema 需求

- **每個外掛都必須提供 JSON Schema**，即使它不接受任何設定。
- 空的 schema 是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在設定讀取/寫入時進行驗證，而不是在執行時。
- 當使用新的設定鍵擴充或分叉套件外掛時，請同時更新該外掛的 `openclaw.plugin.json` `configSchema`。套件外掛的 Schema 很嚴格，因此如果在 `configSchema.properties` 中未新增 `myNewKey` 就在使用者設定中新增 `plugins.entries.<id>.config.myNewKey`，將會在外掛執行時載入前被拒絕。

Schema 擴充範例：

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

- 未知的 `channels.*` 鍵是**錯誤**，除非該通道 id 是由
  外掛宣告清單所宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照**可發現**的外掛 id。未知的 id 是**錯誤**。
- 如果外掛已安裝但其宣告清單或 Schema 損壞或缺失，
  驗證將會失敗，且 Doctor 會回報該外掛錯誤。
- 如果外掛設定存在但該外掛已**停用**，該設定將會被保留，
  並且會在 Doctor + 日誌中顯示**警告**。

請參閱[設定參考](/zh-Hant/gateway/configuration)以取得完整的 `plugins.*` schema。

## 注意事項

- 對於原生 OpenClaw 外掛來說，宣告清單是**必要的**，包括從本機檔案系統載入。執行時仍然會單獨載入外掛模組；宣告清單僅用於發現和驗證。
- 原生宣告清單使用 JSON5 解析，因此只要最終值仍然是物件，就接受註解、結尾逗號和未加引號的鍵。
- 宣告清單載入器僅會讀取文件化的宣告清單欄位。請避免使用自訂的頂層鍵。
- 當外掛不需要時，`channels`、`providers`、`cliBackends` 和 `skills` 都可以省略。
- `providerCatalogEntry` 必須保持輕量，且不應匯入廣泛的執行時代碼；請將其用於靜態供應商目錄中繼資料或狹窄的發現描述符，而不是請求時執行。
- 透過 `plugins.slots.*` 選擇互斥的插件類型：`kind: "memory"` 透過 `plugins.slots.memory`，`kind: "context-engine"` 透過 `plugins.slots.contextEngine`（預設 `legacy`）。
- 在此清單中宣告互斥插件類型。執行時期項目 `OpenClawPluginDefinition.kind` 已棄用，僅作為舊版插件的相容性後備方案保留。
- 環境變數中繼資料（`setup.providers[].envVars`、已棄用的 `providerAuthEnvVars` 和 `channelEnvVars`）僅供宣告。狀態、稽核、 cron 遞送驗證和其他唯讀介面在將環境變數視為已設定之前，仍會套用插件信任和有效啟用政策。
- 如需需要提供者程式碼的執行時期嚮導中繼資料，請參閱 [提供者執行時期掛鉤](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依賴原生模組，請記錄建置步驟和任何套件管理員允許清單需求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相關

<CardGroup cols={3}>
  <Card title="建置插件" href="/zh-Hant/plugins/building-plugins" icon="rocket">
    開始使用插件。
  </Card>
  <Card title="插件架構" href="/zh-Hant/plugins/architecture" icon="diagram-project">
    內部架構和功能模型。
  </Card>
  <Card title="SDK 概覽" href="/zh-Hant/plugins/sdk-overview" icon="book">
    插件 SDK 參考和子路徑匯入。
  </Card>
</CardGroup>
