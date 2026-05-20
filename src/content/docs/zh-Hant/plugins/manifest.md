---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

如需相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

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
關於原生功能模型和目前的外部相容性指引：
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

| 欄位                   | 必要 | 類型       | 含義                                                                                            |
| ---------------------- | ---- | ---------- | ----------------------------------------------------------------------------------------------- |
| `aliases`              | 否   | `string[]` | 應視為生成提供者的靜態授權別名的其他提供者 ID。                                                 |
| `authProviders`        | 否   | `string[]` | 其已配置的授權設定檔應視為此生成提供者之授權的提供者 ID。                                       |
| `configSignals`        | 否   | `object[]` | 針對無需授權設定檔或環境變數即可配置的本機或自託管提供者的廉價僅配置可用性信號。                |
| `authSignals`          | 否   | `object[]` | 明確的授權信號。當存在時，這些會取代來自提供者 ID、`aliases` 和 `authProviders` 的預設信號集。  |
| `referenceAudioInputs` | 否   | `boolean`  | 僅限影片生成。當提供者接受參考音訊資產時設為 `true`；否則 `video_generate` 會隱藏音訊參考參數。 |

每個 `configSignals` 項目支援：

| 欄位          | 必要 | 類型       | 含義                                                                                                             |
| ------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | 是   | `string`   | 要檢查的插件所擁有配置物件的點路徑，例如 `plugins.entries.example.config`。                                      |
| `overlayPath` | 否   | `string`   | 根配置內部的點路徑，其物件應在評估信號之前覆蓋根物件。將此用於特定功能的配置，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效配置內部必須具有已配置值的點路徑。字串必須非空；物件和陣列必須非空。                                         |
| `requiredAny` | 否   | `string[]` | 有效配置內部的點路徑，其中至少一個必須具有已配置的值。                                                           |
| `mode`        | 否   | `object`   | 有效配置內部的選用字串模式守衛。當僅限配置的可用性僅適用於一種模式時，請使用此項。                               |

每個 `mode` 守衛支援：

| 欄位         | 必要 | 類型       | 含義                                                   |
| ------------ | ---- | ---------- | ------------------------------------------------------ |
| `path`       | 否   | `string`   | 有效配置內部的點路徑。預設值為 `mode`。                |
| `default`    | 否   | `string`   | 當配置省略該路徑時使用的模式值。                       |
| `allowed`    | 否   | `string[]` | 如果存在，則僅當有效模式為這些值之一時，信號才會通過。 |
| `disallowed` | 否   | `string[]` | 如果存在，當有效模式為這些值之一時，訊號會失敗。       |

每個 `authSignals` 項目支援：

| 欄位              | 必要 | 類型     | 含義                                                                                                           |
| ----------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在設定的驗證設定檔中檢查的提供者 ID。                                                                        |
| `providerBaseUrl` | 否   | `object` | 選用性防護，僅在參照的設定提供者使用允許的基底 URL 時，才讓訊號計數。當驗證別名僅對特定 API 有效時使用此選項。 |

每個 `providerBaseUrl` 防護支援：

| 欄位              | 必要 | 類型       | 含義                                                                                        |
| ----------------- | ---- | ---------- | ------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 應檢查其 `baseUrl` 的提供者設定 ID。                                                        |
| `defaultBaseUrl`  | 否   | `string`   | 當提供者設定省略 `baseUrl` 時假設的基底 URL。                                               |
| `allowedBaseUrls` | 是   | `string[]` | 此驗證訊號的允許基底 URL。當設定或預設基底 URL 與這些正規化值之一都不相符時，會忽略此訊號。 |

## 工具元資料參考

`toolMetadata` 使用與生成提供者元資料相同的 `configSignals` 和 `authSignals` 形狀，並以工具名稱為鍵。`contracts.tools` 宣告擁有權。`toolMetadata` 宣告低成本可用性證據，以便 OpenClaw 可以避免僅為了讓其工具工廠傳回 `null` 而匯入外掛程式執行時。

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

如果工具沒有 `toolMetadata`，OpenClaw 會保留現有行為，並在工具合約符合原則時載入擁有的外掛程式。對於工廠依賴驗證/設定的熱路徑工具，外掛程式作者應該宣告 `toolMetadata`，而不是讓核心匯入執行時來詢問。

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。
OpenClaw 會在提供者執行時期載入前讀取此內容。
提供者設定清單會使用這些資訊清單選項、衍生自描述項的設定選項，以及安裝目錄中繼資料，而無需載入提供者執行時期。

| 欄位                  | 必要 | 類型                                                                  | 說明                                                                  |
| --------------------- | ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 此選項所屬的提供者 ID。                                               |
| `method`              | 是   | `string`                                                              | 要分派到的驗證方法 ID。                                               |
| `choiceId`            | 是   | `string`                                                              | 上架和 CLI 流程使用的穩定驗證選項 ID。                                |
| `choiceLabel`         | 否   | `string`                                                              | 面向使用者的標籤。如果省略，OpenClaw 會回退到 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                                              | 選擇器的簡短輔助文字。                                                |
| `assistantPriority`   | 否   | `number`                                                              | 較低的數值會在助理驅動的互動式選擇器中排序較前面。                    |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 從助理選擇器中隱藏此選項，但仍允許透過手動 CLI 選取。                 |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 應將使用者重新導向至此替代選項的舊版選項 ID。                         |
| `groupId`             | 否   | `string`                                                              | 用於將相關選項分組的選用群組 ID。                                     |
| `groupLabel`          | 否   | `string`                                                              | 該群組的面向使用者標籤。                                              |
| `groupHint`           | 否   | `string`                                                              | 該群組的簡短輔助文字。                                                |
| `optionKey`           | 否   | `string`                                                              | 用於簡單單一旗標驗證流程的內部選項鍵。                                |
| `cliFlag`             | 否   | `string`                                                              | CLI 旗標名稱，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                                              | 用於 CLI 說明的描述。                                                 |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此選項應出現在哪些上線介面中。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有執行時命令名稱，且使用者可能會錯誤地將其置於 `plugins.allow` 或嘗試將其作為根 CLI 命令執行時，請使用 `commandAliases`。OpenClaw 會使用此元資料進行診斷，而不需匯入外掛執行時程式碼。

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

| 欄位         | 必要 | 類型              | 含義                                                           |
| ------------ | ---- | ----------------- | -------------------------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛的命令名稱。                                         |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線命令，而非根 CLI 命令。                    |
| `cliCommand` | 否   | `string`          | 相關的根 CLI 命令，用於在建議 CLI 操作時提供（如果存在的話）。 |

## activation 參考

當外掛能輕鬆宣告哪些控制平面事件應將其包含在啟用/載入計畫中時，請使用 `activation`。

此區塊是規劃器元資料，而非生命週期 API。它不註冊執行時行為，不取代 `register(...)`，也不保證外掛程式碼已執行。啟用規劃器會使用這些欄位在回退至現有的清單擁有權元資料（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks）之前縮小候選外掛的範圍。

優先使用已描述所有權的最窄元數據。當這些欄位表達該關係時，請使用
`providers`、`channels`、`commandAliases`、設定描述符，或 `contracts`
。對於無法由這些所有權欄位表示的額外規劃器提示，請使用 `activation`
。使用頂層 `cliBackends` 來表示 CLI 執行時別名，例如 `claude-cli`、
`my-cli` 或 `google-gemini-cli`；`activation.onAgentHarnesses` 僅適用於
尚無所有權欄位的內嵌式代理程式 (agent) 線具 id。

此區塊僅為元數據。它不註冊執行時行為，也不會取代 `register(...)`、`setupEntry` 或其他執行時/外掛程式進入點。
目前的消費者將其作為更廣泛外掛程式載入前的縮窄提示，因此
遺漏非啟動激活元數據通常僅會造成效能損失；
只要清單 (manifest) 所有權後備機制仍然存在，這就不應影響正確性。

每個外掛程式都應刻意設定 `activation.onStartup`。僅當外掛程式必須在 Gateway 啟動期間執行時，才將其設定為 `true`
。當外掛程式在啟動時處於非活動狀態，且應僅由較狹窄的觸發條件載入時，請將其設定為 `false`
。省略 `onStartup` 不再會隱含地在啟動時載入外掛程式；請針對啟動、通道、設定、agent-harness、記憶體或其他
較狹窄的激活觸發條件使用明確的激活元數據。

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

| 欄位               | 必要 | 類型                                                 | 含義                                                                                                                                                   |
| ------------------ | ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onStartup`        | 否   | `boolean`                                            | 明確的 Gateway 啟動激活。每個外掛程式都應設定此項。`true` 會在啟動期間匯入外掛程式；`false` 則讓其在啟動時保持惰性，除非另一個符合的觸發條件要求載入。 |
| `onProviders`      | 否   | `string[]`                                           | 應在激活/載入計畫中包含此外掛程式的提供者 id。                                                                                                         |
| `onAgentHarnesses` | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的嵌入式代理程式 harness 執行階段 ID。請使用頂層 `cliBackends` 來表示 CLI 後端別名。                                  |
| `onCommands`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的指令 ID。                                                                                                           |
| `onChannels`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的頻道 ID。                                                                                                           |
| `onRoutes`         | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的路由種類。                                                                                                          |
| `onConfigPaths`    | 否   | `string[]`                                           | 當路徑存在且未被明確停用時，應在啟動/載入計畫中包含此外掛程式的根相對設定路徑。                                                                        |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 用於控制平面啟用規劃的廣泛功能提示。盡可能使用較窄的欄位。                                                                                             |

目前的使用中消費者：

- 閘道啟動規劃使用 `activation.onStartup` 進行明確的啟動
  匯入
- 指令觸發的 CLI 規劃會回退到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 代理程式執行階段啟動規劃對於
  embedded harnesses 使用 `activation.onAgentHarnesses`，對於 CLI 執行階段別名則使用頂層 `cliBackends[]`
- 當缺少明確的頻道啟用中繼資料時，頻道觸發的設定/頻道規劃會回退到舊版 `channels[]`
  所有權
- 啟動外掛程式規劃使用 `activation.onConfigPaths` 來處理非頻道的根
  設定層級，例如隨附的瀏覽器外掛程式的 `browser` 區塊
- 當缺少明確的提供者啟用中繼資料時，提供者觸發的設定/執行階段規劃會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有權

規劃器診斷可以區分明確的啟用提示與清單所有權後備。例如，`activation-command-hint` 表示
`activation.onCommands` 已匹配，而 `manifest-command-alias` 表示
規劃器改用 `commandAliases` 所有權。這些原因標籤僅供主機診斷與測試使用；插件作者應繼續聲明最能描述所有權的中繼資料。

## qaRunners 參考

當插件在共享的 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。請將此中繼資料保持低成本與靜態；插件執行時期仍會透過輕量級的 `runtime-api.ts` 介面來擁有實際的 CLI 註冊，該介面會匯出 `qaRunnerCliRegistrations`。

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

| 欄位          | 必要 | 類型     | 含義                                               |
| ------------- | ---- | -------- | -------------------------------------------------- |
| `commandName` | 是   | `string` | 掛載於 `openclaw qa` 之下的子指令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共享主機需要一個存根指令時使用的後備說明文字。   |

## setup 參考

當設定與上架介面需要在執行時期載入之前，取得低成本且由插件擁有的中繼資料時，請使用 `setup`。

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

頂層 `cliBackends` 依然有效，並繼續用於描述 CLI 推理後端。`setup.cliBackends` 則是專屬於設定的描述子介面，用於控制平面/設定流程，且應僅包含中繼資料。

當存在時，`setup.providers` 和 `setup.cliBackends` 是設定探索時優先使用的描述子優先查詢介面。如果描述子僅縮小了候選插件範圍，而設定仍需要更豐富的設定時期執行時期掛鉤，請設定 `requiresRuntime: true` 並將 `setup-api` 保留作為後備執行路徑。

OpenClaw 也會將 `setup.providers[].envVars` 包含在通用提供者驗證和
env-var 查詢中。 `providerAuthEnvVars` 在棄用期限內透過相容性
轉接器維持支援，但仍在使用它的非捆綁外掛
會收到一個清單診斷。新外掛應將設定/狀態環境元資料
放在 `setup.providers[].envVars` 上。

當沒有可用的設定項目，或者當 `setup.requiresRuntime: false`
宣告設定執行階段非必要時，OpenClaw 也可以從 `setup.providers[].authMethods`
推導簡單的設定選擇。對於自訂標籤、CLI 旗標、上架範圍和助理元資料，明確的 `providerAuthChoices` 項目
仍然較受推崇。

僅當那些描述子足以滿足
設定介面時，才設定 `requiresRuntime: false`。OpenClaw 將明確的 `false` 視為純描述子契約
，並且不會執行 `setup-api` 或 `openclaw.setupEntry` 進行設定查詢。如果
一個純描述子外掛仍然發佈其中一個設定執行階段項目，
OpenClaw 會回報附加診斷並繼續忽略它。省略
`requiresRuntime` 可保留傳統回退行為，以便現有外掛在未添加該旗標的情況下新增
描述子而不會中斷。

由於設定查詢可以執行外掛擁有的 `setup-api` 程式碼，正規化後的
`setup.providers[].id` 和 `setup.cliBackends[]` 值必須在
所有發現的外掛之間保持唯一。模稜兩可的所有權會採取封閉式失敗，而不是從發現順序中
選擇一個勝出者。

當設定執行階段確實執行時，如果 `setup-api` 註冊了清單描述子未宣告的提供者或 CLI 後端，或者如果某個描述子沒有相符的執行階段
註冊，設定登錄診斷會回報描述子
差異。這些診斷是附加性的，不會拒絕傳統外掛。

### setup.providers 參考

| 欄位           | 必要 | 類型       | 說明                                                                 |
| -------------- | ---- | ---------- | -------------------------------------------------------------------- |
| `id`           | 是   | `string`   | 在設定或上架期間公開的提供者 ID。請保持正規化 ID 全域唯一。          |
| `authMethods`  | 否   | `string[]` | 此提供者在無需載入完整執行時期的情況下支援的設定/驗證方法 ID。       |
| `envVars`      | 否   | `string[]` | 通用設定/狀態介面在插件執行時期載入前可檢查的環境變數。              |
| `authEvidence` | 否   | `object[]` | 針對可透過非機密標記進行驗證的提供者，進行低成本的本地驗證證據檢查。 |

`authEvidence` 適用於無需載入執行時期程式碼即可驗證的提供者擁有之本地憑證標記。這些檢查必須保持低成本且在本地進行：
無網路呼叫、無鑰匙圈或秘密管理器讀取、無 Shell 指令，也無
提供者 API 探測。

支援的證據項目：

| 欄位               | 必要 | 類型       | 含義                                                                                   |
| ------------------ | ---- | ---------- | -------------------------------------------------------------------------------------- |
| `type`             | 是   | `string`   | 目前 `local-file-with-env`。                                                           |
| `fileEnvVar`       | 否   | `string`   | 包含明確憑證檔案路徑的環境變數。                                                       |
| `fallbackPaths`    | 否   | `string[]` | 當 `fileEnvVar` 不存在或為空時檢查的本地憑證檔案路徑。支援 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在證據有效之前，列出的環境變數中至少必須有一個非空。                                   |
| `requiresAllEnv`   | 否   | `string[]` | 在證據有效之前，列出的每個環境變數都必須非空。                                         |
| `credentialMarker` | 是   | `string`   | 當證據存在時傳回的非機密標記。                                                         |
| `source`           | 否   | `string`   | 用於驗證/狀態輸出的使用者來源標籤。                                                    |

### 設定欄位

| 欄位               | 必要 | 類型       | 含義                                                                        |
| ------------------ | ---- | ---------- | --------------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和引導期間公開的提供者設定描述符。                                    |
| `cliBackends`      | 否   | `string[]` | 用於以描述符優先的設定查詢之設定時間後端 ID。請保持標準化的 ID 在全域唯一。 |
| `configMigrations` | 否   | `string[]` | 此插件設置介面所擁有的設定遷移 ID。                                         |
| `requiresRuntime`  | 否   | `boolean`  | 在查詢描述符後，設置是否仍需執行 `setup-api`。                              |

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

| 欄位          | 類型       | 說明                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向使用者的欄位標籤。   |
| `help`        | `string`   | 簡短的輔助文字。         |
| `tags`        | `string[]` | 選用性 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 無需匯入插件執行階段即可讀取的靜態功能所有權元資料。

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

每個列表都是選用的：

| 欄位                             | 類型       | 說明                                                              |
| -------------------------------- | ---------- | ----------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex 應用程式伺服器擴充功能工廠 ID，目前為 `codex-app-server`。  |
| `agentToolResultMiddleware`      | `string[]` | 打包插件可以為其註冊工具結果中介軟體的執行階段 ID。               |
| `externalAuthProviders`          | `string[]` | 此外掛擁有外部設定檔钩子的提供者 ID。                             |
| `speechProviders`                | `string[]` | 此外掛擁有的語音提供者 ID。                                       |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛擁有的即時轉錄提供者 ID。                                   |
| `realtimeVoiceProviders`         | `string[]` | 此外掛擁有的即時語音提供者 ID。                                   |
| `memoryEmbeddingProviders`       | `string[]` | 此外掛擁有的記憶嵌入提供者 ID。                                   |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛擁有的媒體理解提供者 ID。                                   |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的圖像生成提供者 ID。                               |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成提供者 ID。                               |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的 Web 擷取提供者 ID。                              |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的 Web 搜尋提供者 ID。                              |
| `migrationProviders`             | `string[]` | 此外掛程式擁有適用於 `openclaw migrate` 的匯入提供者 ID。         |
| `gatewayMethodDispatch`          | `string[]` | 為在程序內分派 Gateway 方法的已驗證外掛程式 HTTP 路由保留的權利。 |
| `tools`                          | `string[]` | 此外掛程式擁有的 Agent 工具名稱。                                 |

`contracts.embeddedExtensionFactories` 保留給捆綁的 Codex
僅限應用程式伺服器的擴充功能工廠。捆綁的工具結果轉換應該
改為宣告 `contracts.agentToolResultMiddleware` 並向
`api.registerAgentToolResultMiddleware(...)` 註冊。外部外掛程式無法
註冊工具結果中介軟體，因為縫合可以在模型看到之前重寫高信任度的工具
輸出。

執行時 `api.registerTool(...)` 註冊必須符合 `contracts.tools`。
工具探索使用此清單僅載入可以擁有所
請求工具的外掛程式執行時。

實作 `resolveExternalAuthProfiles` 的提供者外掛程式應該宣告
`contracts.externalAuthProviders`。沒有此宣告的外掛程式仍然會
透過已棄用的相容性後援執行，但該後援速度較慢，並且
將在移轉視窗結束後移除。

捆綁的記憶體嵌入提供者應該為其公開的每個配接器 ID 宣告
`contracts.memoryEmbeddingProviders`，包括
內建配接器，例如 `local`。獨立 CLI 路徑使用此資訊清單
合約，僅在完整的 Gateway 執行時
註冊提供者之前載入擁有者外掛程式。

`contracts.gatewayMethodDispatch` 目前接受
`"authenticated-request"`。這是一個針對原生插件 HTTP 路由的 API 衛生閘門，旨在有意地在進程內分發 Gateway 控制平面方法，而非針對惡意原生插件的沙箱。僅將其用於已經過嚴格審查的捆綁/操作員介面，且這些介面已要求 Gateway HTTP 身份驗證。

## mediaUnderstandingProviderMetadata 參考

當媒體理解提供商具有預設模型、自動身份驗證後備優先順序，或通用核心輔助程式在運行時載入前所需的原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。金鑰也必須在 `contracts.mediaUnderstandingProviders` 中宣告。

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
| `autoPriority`         | `Record<string, number>`            | 數字越小，在基於憑證的自動提供商後備中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供商支援的原生文件輸入。                         |

## channelConfigs 參考

當頻道插件在運行時載入之前需要廉價的配置元資料時，請使用 `channelConfigs`。唯讀頻道設定/狀態發現可以直接將此元資料用於已配置的外部頻道，當沒有可用的設定項目時，或者當 `setup.requiresRuntime: false` 宣告設定運行時不必要時。

`channelConfigs` 是插件清單元資料，而不是新的頂層用戶配置部分。用戶仍然在 `channels.<channel-id>` 下配置頻道實例。OpenClaw 在執行插件運行時代碼之前讀取清單元資料，以決定哪個插件擁有該已配置的頻道。

對於頻道插件，`configSchema` 和 `channelConfigs` 描述了不同的路徑：

- `configSchema` 驗證 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 驗證 `channels.<channel-id>`

宣告 `channels[]` 的非捆綁外掛程式也應宣告相符的
`channelConfigs` 項目。若沒有這些項目，OpenClaw 仍然可以載入外掛程式，但
冷路徑設定架構、設定程式和控制 UI 介面在執行外掛程式之前，
將無法得知通道擁有的選項形狀。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可以宣告靜態 `auto` 預設值，以供在通道執行時間載入之前執行的
指令設定檢查使用。捆綁通道也可以透過 `package.json#openclaw.channel.commands` 發佈
相同的預設值，以及其其他套件擁有的通道目錄元資料。

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

| 欄位          | 類型                     | 說明                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。對於每個宣告的通道設定項目為必填。 |
| `uiHints`     | `Record<string, object>` | 該通道設定區段選用的 UI 標籤/預留位置/敏感提示。                   |
| `label`       | `string`                 | 當執行時間元資料尚未就緒時，合併到選擇器和檢查介面中的通道標籤。   |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                                 |
| `commands`    | `object`                 | 用於執行前設定檢查的靜態原生指令和原生技能自動預設值。             |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應優先於的舊版或較低優先順序的外掛程式 ID。      |

### 取代另一個通道外掛程式

當您的外掛程式是另一個外掛程式也能提供的通道 ID 的首選擁有者時，請使用 `preferOver`。常見情況包括重新命名的外掛程式 ID、取代捆綁外掛程式的獨立外掛程式，或是為了設定相容性而保留相同通道 ID 的維護分支。

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

當 `channels.chat` 已配置時，OpenClaw 會同時考慮通道 ID 和首選外掛 ID。如果優先順序較低的外掛僅因為是內綑或預設啟用而被選中，OpenClaw 會在有效的執行時配置中停用它，以便由一個外掛擁有該通道及其工具。明確的使用者選擇仍然優先：如果使用者明確啟用了兩個外掛，OpenClaw 將保留該選擇並回報重複的通道/工具診斷，而不是靜默更改請求的外掛集。

請將 `preferOver` 的範圍限制在真正能提供相同通道的外掛 ID 上。這不是一個一般的優先順序欄位，也不會重新命名使用者配置鍵。

## modelSupport 參考

當 OpenClaw 應該在載入外掛執行時之前，從諸如 `gpt-5.5` 或 `claude-sonnet-4.6` 這類簡寫模型 ID 推斷您的提供者外掛時，請使用 `modelSupport`。

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
- 如果一個非內綑外掛和一個內綑外掛同時匹配，則非內綑外掛獲勝
- 其餘的歧義將被忽略，直到使用者或配置指定提供者

欄位：

| 欄位            | 類型       | 含義                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 與簡寫模型 ID 比對的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，與簡寫模型 ID 比對的 Regex 來源。 |

## modelCatalog 參考

當 OpenClaw 應該在載入外掛執行時之前知道提供者模型元數據時，請使用 `modelCatalog`。這是清單所擁有的固定目錄列、提供者別名、抑制規則和發現模式的來源。執行時刷新仍屬於提供者執行時代碼，但清單會告訴核心何時需要執行時。

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

| 欄位           | 類型                                                     | 含義                                                                    |
| -------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 屬於此外掛程式的提供者 ID 的目錄列。金鑰也應出現在頂層 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 應解析為擁有提供者以進行目錄或抑制規劃的提供者別名。                    |
| `suppressions` | `object[]`                                               | 此外掛程式因提供者特定原因而抑制的來自其他來源的模型列。                |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供者目錄是否可從清單元資料讀取、重新整理至快取，或需要執行時期。      |

`aliases` 參與模型目錄規劃的提供者所有權查詢。
別名目標必須是同一外掛程式擁有的頂層提供者。當
提供者篩選清單使用別名時，OpenClaw 可以讀取擁有的清單並
套用別名 API/基礎 URL 覆寫，而無需載入提供者執行時期。
別名不會擴充未篩選的目錄列表；廣泛列表僅發出擁有的
規範提供者列。

`suppressions` 取代了舊的提供者執行時期 `suppressBuiltInModel` 掛鉤。
抑制項目僅在提供者由此外掛程式擁有或
宣告為 `modelCatalog.aliases` 金鑰且目標為擁有的提供者時才會被接受。執行時期
抑制掛鉤在模型解析期間不再被呼叫。

提供者欄位：

| 欄位      | 類型                     | 含義                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供者目錄中模型的選用預設基礎 URL。    |
| `api`     | `ModelApi`               | 此提供者目錄中模型的選用預設 API 配接器。 |
| `headers` | `Record<string, string>` | 套用至此提供者目錄的選用靜態標頭。        |
| `models`  | `object[]`               | 必要的模型列。沒有 `id` 的列將被忽略。    |

模型欄位：

| 欄位            | 類型                                                           | 含義                                                        |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `id`            | `string`                                                       | 提供者本機模型 ID，不含 `provider/` 前綴。                  |
| `name`          | `string`                                                       | 選用的顯示名稱。                                            |
| `api`           | `ModelApi`                                                     | 選用的個別模型 API 覆寫。                                   |
| `baseUrl`       | `string`                                                       | 選用的個別模型基礎 URL 覆寫。                               |
| `headers`       | `Record<string, string>`                                       | 選用的個別模型靜態標頭。                                    |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模態。                                            |
| `reasoning`     | `boolean`                                                      | 模型是否公開推理行為。                                      |
| `contextWindow` | `number`                                                       | 原生提供者上下文視窗。                                      |
| `contextTokens` | `number`                                                       | 當與 `contextWindow` 不同時，選用的有效執行時間上下文上限。 |
| `maxTokens`     | `number`                                                       | 已知時的最大輸出 Token。                                    |
| `cost`          | `object`                                                       | 選用的每百萬 Token 美元定價，包含選用的 `tieredPricing`。   |
| `compat`        | `object`                                                       | 符合 OpenClaw 模型設定相容性的選用相容性旗標。              |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列狀態。僅當該列絕不能出現時才隱藏。                        |
| `statusReason`  | `string`                                                       | 隨非可用狀態顯示的選用原因。                                |
| `replaces`      | `string[]`                                                     | 此模型取代的較舊提供者本機模型 ID。                         |
| `replacedBy`    | `string`                                                       | 已棄用列的替代提供者本機模型 ID。                           |
| `tags`          | `string[]`                                                     | 選擇器和篩選器使用的穩定標籤。                              |

隱藏欄位：

| 欄位                       | 類型       | 含義                                                                  |
| -------------------------- | ---------- | --------------------------------------------------------------------- |
| `provider`                 | `string`   | 要隱藏的上游資料列的提供者 ID。必須由此外掛擁有，或聲明為擁有的別名。 |
| `model`                    | `string`   | 要隱藏的提供者本機模型 ID。                                           |
| `reason`                   | `string`   | 當直接請求被隱藏的資料列時顯示的選用訊息。                            |
| `when.baseUrlHosts`        | `string[]` | 在套用隱藏之前所需的選用有效提供者基礎 URL 主機清單。                 |
| `when.providerConfigApiIn` | `string[]` | 在套用隱藏之前所需的選用精確提供者設定 `api` 值清單。                 |

請勿將僅限執行時期的資料放在 `modelCatalog` 中。僅當資訊清單資料列足以讓提供者篩選的清單和選擇器介面跳過註冊表/執行時期探索時，才使用 `static`。當資訊清單資料列是可列舉的種子或補充資料，但重新整理/快取之後可以新增更多資料列時，請使用 `refreshable`；可重新整理的資料列本身並非權威來源。當 OpenClaw 必須載入提供者執行時期才能得知清單時，請使用 `runtime`。

## modelIdNormalization 參考

使用 `modelIdNormalization` 進行必須在提供者執行時期載入之前發生的低成本提供者擁有模型 ID 清理。這可以將短模型名稱、提供者本機舊版 ID 和代理前綴規則等別名保留在擁有外掛的資訊清單中，而不是核心模型選擇表中。

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

| 欄位                                 | 類型                    | 含義                                                                  |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不區分大小寫的精確模型 ID 別名。值將照原樣傳回。                      |
| `stripPrefixes`                      | `string[]`              | 在別名查詢之前要移除的前綴，適用於舊版提供者/模型重複的情況。         |
| `prefixWhenBare`                     | `string`                | 當標準化模型 ID 未包含 `/` 時要新增的前綴。                           |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 別名查找後的條件式裸 ID 前綴規則，以 `modelPrefix` 和 `prefix` 為鍵。 |

## providerEndpoints 參考

使用 `providerEndpoints` 進行端點分類，通用請求策略需要在提供者運行時載入之前知道這些分類。核心仍然擁有每個 `endpointClass` 的含義；插件清單擁有主機和基礎 URL 元資料。

端點欄位：

| 欄位                           | 類型       | 含義                                                                      |
| ------------------------------ | ---------- | ------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的端點類別，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 對應到端點類別的確切主機名稱。                                            |
| `hostSuffixes`                 | `string[]` | 對應到端點類別的主機後綴。加上 `.` 前綴以進行僅限網域後綴的比對。         |
| `baseUrls`                     | `string[]` | 對應到端點類別的確切正規化 HTTP(S) 基礎 URL。                             |
| `googleVertexRegion`           | `string`   | 用於確切全域主機的靜態 Google Vertex 區域。                               |
| `googleVertexRegionHostSuffix` | `string`   | 從比對的主機中去除的後綴，以顯露 Google Vertex 區域前綴。                 |

## providerRequest 參考

使用 `providerRequest` 來提供廉價的請求相容性元資料，這些是通用請求策略在無需載入提供者運行時的情況下所需要的。請將特定行為的酬載重寫保留在提供者運行時掛鉤或共享的提供者系列輔助程式中。

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
| `family`              | `string`     | 用於通用請求相容性決策和診斷的提供者系列標籤。               |
| `compatibilityFamily` | `"moonshot"` | 選用於共享請求輔助程式的提供者系列相容性群組。               |
| `openAICompletions`   | `object`     | OpenAI 相容的完成請求旗標，目前為 `supportsStreamingUsage`。 |

## modelPricing 參考

當供應商需要在運行時載入之前進行控制平面定價行為時，請使用 `modelPricing`。閘道定價快取會讀取此元數據，而無需匯入供應商運行時程式碼。

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

| 欄位         | 類型              | 含義                                                                         |
| ------------ | ----------------- | ---------------------------------------------------------------------------- |
| `external`   | `boolean`         | 對於不應獲取 OpenRouter 或 LiteLLM 定價的本機/自託管供應商，請設定 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定價查詢對映。`false` 會停用此供應商的 OpenRouter 查詢。          |
| `liteLLM`    | `false \| object` | LiteLLM 定價查詢對映。`false` 會停用此供應商的 LiteLLM 查詢。                |

來源欄位：

| 欄位                       | 類型               | 含義                                                                                     |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 當外部目錄供應商 ID 與 OpenClaw 供應商 ID 不同時使用，例如對於 `zai` 供應商則為 `z-ai`。 |
| `passthroughProviderModel` | `boolean`          | 將包含斜線的模型 ID 視為巢狀供應商/模型參照，這對於 OpenRouter 等代理供應商很有用。      |
| `modelIdTransforms`        | `"version-dots"[]` | 額外的外部目錄模型 ID 變體。`version-dots` 會嘗試點號版本 ID，例如 `claude-opus-4.6`。   |

### OpenClaw 供應商索引

OpenClaw 供應商索引是由 OpenClaw 擁有的供應商預覽元數據，適用於其外掛程式可能尚未安裝的供應商。它不是外掛程式清單的一部分。
外掛程式清單仍保留已安裝外掛程式的權威。供應商索引是內部後備合約，當供應商外掛程式未安裝時，未來的可安裝供應商和預安裝模型選擇器介面將會使用它。

目錄權威順序：

1. 使用者配置。
2. 已安裝的外掛程式清單 `modelCatalog`。
3. 來自明確重新整理的模型目錄快取。
4. OpenClaw 供應商索引預覽列。

提供者索引不得包含秘密、啟用狀態、運行時掛鉤或實時帳戶特定的模型數據。其預覽目錄使用與插件清單相同的 `modelCatalog` 提供者行形狀，但應僅限於穩定的顯示元數據，除非 `api`、`baseUrl`、定價或相容性標誌等運行時適配器字段是故意與已安裝的插件清單保持一致的。具有實時 `/models` 發現功能的提供者應通過顯式模型目錄緩存路徑寫入刷新的行，而不是進行正常的列出或入職調用提供者 API。

提供者索引條目還可以為其插件已移出核心或尚未安裝的提供者攜帶可安裝插件元數據。此元數據反映了通道目錄模式：包名稱、npm 安裝規範、預期的完整性以及廉價的身份驗證選擇標籤足以顯示可安裝的設置選項。安裝插件後，其清單優先，並且該提供者的提供者索引條目將被忽略。

舊版頂層功能鍵已被棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清單加載不再將這些頂層字段視為功能所有權。

## 清單與 package.

這兩個文件有不同的用途：

| 文件                   | 用於                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 發現、配置驗證、身份驗證選擇元數據以及插件代碼運行前必須存在的 UI 提示             |
| `package.json`         | npm 元數據、依賴項安裝以及用於入口點、安裝閘門、設置或目錄元數據的 `openclaw` 區塊 |

如果您不確定某個元數據應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在加載插件代碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果是關於打包、入口檔案或 npm install 行為，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

部分執行時前的插件元資料有意放置在 `package.json` 下的
`openclaw` 區塊中，而非 `openclaw.plugin.json`。
`openclaw.bundle` 和 `openclaw.bundle.json` 並非 OpenClaw 插件合約；
原生插件必須使用 `openclaw.plugin.json` 加上下列支援的
`package.json#openclaw` 欄位。

重要範例：

| 欄位                                                                                       | 含義                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 宣告原生插件入口點。必須保留在插件套件目錄內。                                                          |
| `openclaw.runtimeExtensions`                                                               | 宣告已安裝套件的建置 JavaScript 執行時入口點。必須保留在插件套件目錄內。                                |
| `openclaw.setupEntry`                                                                      | 輕量級僅設定的入口點，用於上架、延遲通道啟動以及唯讀通道狀態/SecretRef 探索。必須保留在插件套件目錄內。 |
| `openclaw.runtimeSetupEntry`                                                               | 宣告已安裝套件的建置 JavaScript 設定入口點。需要 `setupEntry`，必須存在，且必須保留在插件套件目錄內。   |
| `openclaw.channel`                                                                         | 輕量級通道目錄元資料，如標籤、文件路徑、別名和選擇複製內容。                                            |
| `openclaw.channel.commands`                                                                | 設定、稽核和指令清單介面在通道執行時載入之前使用的靜態原生指令和原生技能自動預設元資料。                |
| `openclaw.channel.configuredState`                                                         | 輕量級設定狀態檢查器元資料，可在不載入完整通道執行時的情況下回答「是否已存在僅環境設定？」。            |
| `openclaw.channel.persistedAuthState`                                                      | 輕量級持久驗證檢查器元資料，可在不載入完整通道執行時的情況下回答「是否已登入任何項目？」。              |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 套件和外部發布插件的安裝/更新提示。                                                                     |
| `openclaw.install.defaultChoice`                                                           | 當有多個安裝來源可用時的首選安裝路徑。                                                                  |
| `openclaw.install.minHostVersion`                                                          | 支援的 OpenClaw 主機最低版本，使用諸如 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 的 semver 下限。            |
| `openclaw.install.expectedIntegrity`                                                       | 預期的 npm dist integrity 字串，例如 `sha512-...`；安裝和更新流程會據此驗證擷取的構件。                 |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 當設定無效時，允許針對捆綁外掛程式進行狹窄的重新安裝復原路徑。                                          |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 讓僅設定介面能在啟動期間於完整頻道外掛程式之前載入。                                                    |

Manifest 元數據決定了在執行時期載入之前的新手引導中，會出現哪些提供者/頻道/設定選項。`package.json#openclaw.install` 會告訴新手引導當使用者選擇其中一個選項時，如何擷取或啟用該外掛程式。請勿將安裝提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 會在安裝期間以及針對非捆綁外掛程式來源載入 manifest 註冊表時強制執行。無效的值會被拒絕；在較舊的主機上，較新但有效的值會跳過外部外掛程式。捆綁來源的外掛程式被假設與主機版本同步。

官方的隨需安裝元數據應在該外掛程式發布至 ClawHub 時使用 `clawhubSpec`；新手引導會將其視為首選的遠端來源，並在安裝後記錄 ClawHub 構件資訊。`npmSpec` 仍是尚未遷移至 ClawHub 之套件的相容性備案。

精確的 npm 版本鎖定已經存在於 `npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。正式的外部目錄
項目應將精確規格與 `expectedIntegrity` 配對，以便如果獲取的 npm 構件不再與鎖定的發行版匹配，更新流程將失敗閉合。
互動式引導仍然提供受信任的註冊表 npm 規格，包括裸包名稱和 dist-tags，以保持相容性。目錄診斷可以區分精確、浮動、完整性鎖定、缺少完整性、包名稱不匹配和無效的預設選擇來源。當
`expectedIntegrity` 存在但沒有有效的 npm 來源可以鎖定時，它們也會發出警告。
當 `expectedIntegrity` 存在時，
安裝/更新流程會強制執行它；當它被省略時，註冊表解析將被記錄而沒有完整性鎖定。

當狀態、通道列表或 SecretRef 掃描需要在不加載完整運行時的情況下識別已配置的帳戶時，通道插件應提供 `openclaw.setupEntry`。設置入口應公開通道元數據以及設置安全的配置、狀態和密鑰適配器；將網絡客戶端、網關偵聽器和傳輸運行時保留在主擴展入口點中。

運行時入口點字段不會覆蓋對源入口點字段的包邊界檢查。例如，`openclaw.runtimeExtensions` 無法使逃逸的
`openclaw.extensions` 路徑可加載。

`openclaw.install.allowInvalidConfigRecovery` 是故意設計得狹窄的。它並不
使任意損壞的配置可安裝。目前，它僅允許安裝流程從特定的陳舊捆綁插件升級失敗中恢復，例如缺少捆綁插件路徑或同一捆綁插件的過時 `channels.<id>` 條目。無關的配置錯誤仍將阻止安裝，並將操作員引導至
`openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微小檢查器模塊的包元數據：

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

當 setup、doctor、status 或唯讀 presence 流程需要在完整 channel plugin 載入前進行低成本的 yes/no auth 探測時使用。持久的 auth state 不是已配置的 channel state：請勿使用此元資料自動啟用外掛、修復執行時期相依性或決定 channel runtime 是否應載入。目標匯出應為一個僅讀取持久狀態的小型函式；請勿將其路由通過完整的 channel runtime barrel。

`openclaw.channel.configuredState` 遵循相同的形狀，用於僅環境的低成本配置檢查：

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

當 channel 可以從環境或其他微小的非執行時輸入回答已配置狀態時使用。如果檢查需要完整的配置解析或真實的 channel runtime，請將該邏輯保留在外掛的 `config.hasConfiguredState` hook 中。

## 探索優先順序（重複的外掛 ID）

OpenClaw 從多個根目錄探索外掛。如需原始檔案系統掃描順序，請參閱 [Plugin scan
order](/zh-Hant/gateway/configuration-reference#plugin-scan-order)。如果兩個探索結果共用相同的 `id`，則僅保留優先順序**最高**的清單；優先順序較低的重複項會被丟棄，而不是與其並載入。

優先順序，從高到低：

1. **Config-selected** — 在 `plugins.entries.<id>` 中明確釘選的路徑
2. **Bundled** — 隨 OpenClaw 附帶的外掛
3. **Global install** — 安裝到全域 OpenClaw 外掛根目錄的外掛
4. **Workspace** — 相對於目前工作區探索到的外掛

影響：

- 位於工作區中的分叉或過時 bundled 外掛副本將不會遮蔽 bundled 版本。
- 若要實際使用本機版本覆寫 bundled 外掛，請透過 `plugins.entries.<id>` 釘選它，使其依據優先順序獲勝，而不是依賴工作區探索。
- 重複項的丟棄會被記錄下來，以便 Doctor 和啟動診斷可以指向被捨棄的副本。
- Config-selected 的重複覆寫在診斷中被表述為明確的覆寫，但仍會發出警告，以使過時的分叉和意外的遮蔽保持可見。

## JSON Schema 需求

- **每個外掛必須隨附 JSON Schema**，即使它不接受任何配置。
- 空白的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 是在配置讀取/寫入時驗證，而不是在執行時期。
- 當使用新的配置鍵擴展或分叉打包的外掛程式時，請同時更新該外掛程式的 `openclaw.plugin.json` `configSchema`。打包的外掛程式架構是嚴格的，因此如果在用戶配置中添加 `plugins.entries.<id>.config.myNewKey` 而未在 `configSchema.properties` 中添加 `myNewKey`，將在外掛程式運行時載入之前被拒絕。

架構擴展示例：

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

- 未知的 `channels.*` 鍵是**錯誤**，除非頻道 ID 是由
  外掛程式清單宣告的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可發現的** 外掛程式 ID。未知的 ID 是**錯誤**。
- 如果已安裝外掛程式但其清單或架構損壞或缺失，
  驗證將失敗，並且 Doctor 會報告外掛程式錯誤。
- 如果外掛程式配置存在但該外掛程式已**停用**，則會保留該配置，並
  在 Doctor 和日誌中顯示**警告**。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration) 以取得完整的 `plugins.*` 架構。

## 備註

- 對於原生 OpenClaw 外掛程式（包括本地檔案系統載入），清單是**必須的**。運行時仍然會單獨載入外掛程式模組；清單僅用於發現和驗證。
- 原生清單是使用 JSON5 解析的，因此只要最終值仍然是物件，就會接受註解、尾隨逗號和未加引號的鍵。
- 清單載入器僅會讀取已記載的清單欄位。請避免使用自訂的頂層鍵。
- 當外掛程式不需要 `channels`、`providers`、`cliBackends` 和 `skills` 時，這些欄位皆可省略。
- `providerCatalogEntry` 必須保持輕量級，且不應匯入廣泛的運行時代碼；請將其用於靜態提供者目錄元資料或狹窄的發現描述符，而非請求時執行。`providerDiscoveryEntry` 是舊式拼寫，對於現有外掛程式仍然有效。
- 透過 `plugins.slots.*` 選擇互斥的插件類型：`kind: "memory"` 透過 `plugins.slots.memory`，`kind: "context-engine"` 透過 `plugins.slots.contextEngine`（預設為 `legacy`）。
- 在此清單中宣告互斥的插件類型。Runtime-entry `OpenClawPluginDefinition.kind` 已棄用，僅作為較舊插件的相容性後備方案保留。
- 環境變數元資料（`setup.providers[].envVars`、已棄用的 `providerAuthEnvVars` 和 `channelEnvVars`）僅供宣告。狀態、審計、 cron 傳遞驗證和其他唯讀介面在將環境變數視為已設定之前，仍會套用插件信任權限和有效啟用原則。
- 關於需要提供者程式碼的執行時嚮導元資料，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的插件依賴於原生模組，請記錄建置步驟以及任何套件管理器允許清單需求（例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

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
