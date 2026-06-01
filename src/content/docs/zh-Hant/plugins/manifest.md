---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin manifest"
---

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

關於相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

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
關於原生功能模型和目前的外部相容性指導原則：
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
| `id`                                 | 是   | `string`                         | 標準外掛程式 ID。這是 `plugins.entries.<id>` 中使用的 ID。                                                                                                          |
| `configSchema`                       | 是   | `object`                         | 此外掛設定內嵌的 JSON Schema。                                                                                                                                      |
| `requiresPlugins`                    | 否   | `string[]`                       | 必須同時安裝的插件 ID，此插件才能發揮作用。Discovery 會讓插件保持可載入狀態，但在缺少任何必要插件時會發出警告。                                                     |
| `enabledByDefault`                   | 否   | `true`                           | 將打包的插件標記為預設啟用。若要讓插件保持預設停用，請省略此項，或設定為任何非 `true` 的值。                                                                        |
| `enabledByDefaultOnPlatforms`        | 否   | `string[]`                       | 僅在列出的 Node.js 平台上（例如 `["darwin"]`）將打包的插件標記為預設啟用。明確設定仍具有優先權。                                                                    |
| `legacyPluginIds`                    | 否   | `string[]`                       | 會正規化為此標準插件 ID 的舊版 ID。                                                                                                                                 |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 當驗證、組態或模型參照提及這些提供者 ID 時，應自動啟用此外掛。                                                                                                      |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的專屬插件種類。                                                                                                                       |
| `channels`                           | 否   | `string[]`                       | 由此插件擁有的頻道 ID。用於探索和組態驗證。                                                                                                                         |
| `providers`                          | 否   | `string[]`                       | 由此插件擁有的提供者 ID。                                                                                                                                           |
| `providerCatalogEntry`               | 否   | `string`                         | 輕量級提供者目錄模組路徑（相對於插件根目錄），用於可在不啟動完整插件執行時期的情況下載入的清單範圍提供者目錄元數據。                                                |
| `modelSupport`                       | 否   | `object`                         | 由清單擁有的簡寫模型系列元數據，用於在執行時期之前自動載入插件。                                                                                                    |
| `modelCatalog`                       | 否   | `object`                         | 宣告式模型目錄元資料，用於此外掛所擁有的提供者。這是未來唯讀列表、上架、模型選擇器、別名和抑制的控制平面契約，無需載入外掛執行時。                                  |
| `modelPricing`                       | 否   | `object`                         | 提供者所擁有的外部價格查詢策略。使用它可將本機/自託管提供者排除在遠端價格目錄之外，或將提供者參照對應至 OpenRouter/LiteLLM 目錄 ID，而無需在核心中硬編碼提供者 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供者所擁有的模型 ID 別名/前綴清理，必須在提供者執行時載入之前執行。                                                                                               |
| `providerEndpoints`                  | 否   | `object[]`                       | 清單所擁有的端點主機/baseUrl 元資料，用於核心必須在提供者執行時載入之前分類的提供者路由。                                                                           |
| `providerRequest`                    | 否   | `object`                         | 通用請求策略在提供者執行時載入之前所使用的低成本供應商系列和請求相容性元資料。                                                                                      |
| `cliBackends`                        | 否   | `string[]`                       | 此外掛所擁有的 CLI 推論後端 ID。用於來自明確設定參照的啟動自動啟動。                                                                                                |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供者或 CLI 後端參照，其外掛所擁有的合成認證掛鉤應在執行時載入之前的冷模型探索期間進行探測。                                                                       |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 捆綁外掛所擁有的佔位符 API 金鑰值，代表非機密的本機、OAuth 或環境憑證狀態。                                                                                         |
| `commandAliases`                     | 否   | `object[]`                       | 此外掛所擁有的指令名稱，應在執行時載入之前產生外掛感知的設定和 CLI 診斷。                                                                                           |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 已棄用的相容性環境元資料，用於提供者認證/狀態查詢。對於新外掛建議使用 `setup.providers[].envVars`；OpenClaw 在棄用期間仍會讀取此內容。                              |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 應重複使用另一個提供者 ID 進行認證查詢的提供者 ID，例如共享基底提供者 API 金鑰和認證設定檔的編碼提供者。                                                            |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 無需載入外掛程式碼即可檢查的輕量級通道環境中繼資料。用於環境驅動的通道設定或通用啟動/設定輔助工具應可見的驗證介面。                                        |
| `providerAuthChoices`                | 否   | `object[]`                       | 用於入門選擇器、首選提供者解析以及簡單 CLI 標誌連線的輕量級驗證選擇中繼資料。                                                                                       |
| `activation`                         | 否   | `object`                         | 用於啟動、提供者、指令、通道、路由和功能觸發載入的輕量級啟用規劃器中繼資料。僅包含中繼資料；實際行為仍由外掛執行時擁有。                                            |
| `setup`                              | 否   | `object`                         | 探索和設定介面可在不載入外掛執行時的情況下檢查的輕量級設定/入門描述元。                                                                                             |
| `qaRunners`                          | 否   | `object[]`                       | 由共用的 `openclaw qa` 主機在外掛執行時載入之前使用的輕量級 QA 執行器描述元。                                                                                       |
| `contracts`                          | 否   | `object`                         | 靜態功能所有權快照，用於外部驗證掛勾、嵌入、語音、即時轉錄、即時語音、媒體理解、影像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具所有權。                      |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中宣告的提供者 ID 的輕量級媒體理解預設值。                                                                               |
| `imageGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.imageGenerationProviders` 中宣告的提供者 ID 的輕量級影像生成驗證中繼資料，包括提供者擁有的驗證別名和基底 URL 防護。                                   |
| `videoGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.videoGenerationProviders` 中宣告的提供者 ID 的輕量級影片生成驗證中繼資料，包括提供者擁有的驗證別名和基底 URL 防護。                                   |
| `musicGenerationProviderMetadata`    | 否   | `Record<string, object>`         | 在 `contracts.musicGenerationProviders` 中宣告的提供者 ID 的輕量級音樂生成驗證中繼資料，包括提供者擁有的驗證別名和基底 URL 防護。                                   |
| `toolMetadata`                       | 否   | `Record<string, object>`         | 在 `contracts.tools` 中宣告的插件擁有工具的低成本可用性元數據。當工具除非存在配置、環境變數或身份驗證證據，否則不應載入執行時時使用。                               |
| `channelConfigs`                     | 否   | `Record<string, object>`         | Manifest 擁有的頻道配置元數據，在執行時載入之前合併到發現和驗證層中。                                                                                               |
| `skills`                             | 否   | `string[]`                       | 要載入的技能目錄，相對於插件根目錄。                                                                                                                                |
| `name`                               | 否   | `string`                         | 人類可讀的插件名稱。                                                                                                                                                |
| `description`                        | 否   | `string`                         | 顯示在插件介面上的簡短摘要。                                                                                                                                        |
| `version`                            | 否   | `string`                         | 資訊性插件版本。                                                                                                                                                    |
| `uiHints`                            | 否   | `Record<string, object>`         | 配置欄位的 UI 標籤、佔位符和敏感性提示。                                                                                                                            |

## 生成供應商元數據參考

生成供應商元數據欄位描述了在匹配的 `contracts.*GenerationProviders` 列表中宣告的供應商的靜態身份驗證訊號。
OpenClaw 在供應商執行時載入之前讀取這些欄位，以便核心工具可以決定生成供應商是否可用，而無需匯入每個
供應商插件。

僅將這些欄位用於低成本、聲明性事實。傳輸、請求
轉換、令牌重新整理、憑證驗證和實際生成行為
保留在插件執行時中。

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

| 欄位                   | 必要 | 類型       | 含義                                                                                                   |
| ---------------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `aliases`              | 否   | `string[]` | 其他應計為生成供應商的靜態身份驗證別名的供應商 ID。                                                    |
| `authProviders`        | 否   | `string[]` | 其已配置的身份驗證設定檔應計為此生成供應商的身份驗證的供應商 ID。                                      |
| `configSignals`        | 否   | `object[]` | 針對無需身份驗證設定檔或環境變數即可配置的本地或自託管供應商的低成本純配置可用性訊號。                 |
| `authSignals`          | 否   | `object[]` | 明確的身份驗證訊號。當存在時，這些訊號將取代來自供應商 ID、`aliases` 和 `authProviders` 的預設訊號集。 |
| `referenceAudioInputs` | 否   | `boolean`  | 僅用於視訊生成。當提供者接受參考音訊資產時設為 `true`，否則 `video_generate` 會隱藏音訊參考參數。      |

每個 `configSignals` 項目支援：

| 欄位          | 必填 | 類型       | 說明                                                                                                             |
| ------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `rootPath`    | 是   | `string`   | 要檢查的外掛程式擁有之設定物件的點路徑，例如 `plugins.entries.example.config`。                                  |
| `overlayPath` | 否   | `string`   | 根設定內部的點路徑，其物件應在評估訊號之前覆蓋根物件。將此用於特定功能的設定，例如 `image`、`video` 或 `music`。 |
| `required`    | 否   | `string[]` | 有效設定內部必須具有設定值的點路徑。字串必須非空；物件和陣列不得為空。                                           |
| `requiredAny` | 否   | `string[]` | 有效設定內部的點路徑，其中至少必須有一個具有設定值。                                                             |
| `mode`        | 否   | `object`   | 有效設定內部的選用字串模式防護。當僅限設定的可用性僅適用於一種模式時，請使用此選項。                             |

每個 `mode` 防護支援：

| 欄位         | 必填 | 類型       | 說明                                                   |
| ------------ | ---- | ---------- | ------------------------------------------------------ |
| `path`       | 否   | `string`   | 有效設定內部的點路徑。預設為 `mode`。                  |
| `default`    | 否   | `string`   | 當設定省略路徑時使用的模式值。                         |
| `allowed`    | 否   | `string[]` | 如果存在，則僅當有效模式為這些值之一時，訊號才會通過。 |
| `disallowed` | 否   | `string[]` | 如果存在，則當有效模式為這些值之一時，訊號將失敗。     |

每個 `authSignals` 項目支援：

| 欄位              | 必填 | 類型     | 說明                                                                                                                 |
| ----------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string` | 要在已設定的授權設定檔中檢查的提供者 ID。                                                                            |
| `providerBaseUrl` | 否   | `object` | 可選的守衛，僅當參照的已設定提供者使用允許的基底 URL 時，才使訊號計數。當驗證別名僅對特定 API 有效時，請使用此選項。 |

每個 `providerBaseUrl` 守衛支援：

| 欄位              | 必要 | 類型       | 含義                                                                                        |
| ----------------- | ---- | ---------- | ------------------------------------------------------------------------------------------- |
| `provider`        | 是   | `string`   | 應檢查其 `baseUrl` 的提供者設定 ID。                                                        |
| `defaultBaseUrl`  | 否   | `string`   | 當提供者設定省略 `baseUrl` 時，應假設的基底 URL。                                           |
| `allowedBaseUrls` | 是   | `string[]` | 此驗證訊號的允許基底 URL。當已設定或預設的基底 URL 不符合這些正規化值之一時，將忽略該訊號。 |

## Tool 元數據參考

`toolMetadata` 使用與生成提供者元數據相同的 `configSignals` 和 `authSignals` 形狀，並以工具名稱為鍵。`contracts.tools` 宣告所有權。`toolMetadata` 宣告低成本可用性證據，以便 OpenClaw 可以避免僅為了讓其工具工廠傳回 `null` 而導入插件執行時。

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

如果工具沒有 `toolMetadata`，OpenClaw 將保留現有行為，並在工具合約符合原則時載入擁有插件。對於其工廠依賴驗證/設定的熱路徑工具，插件作者應宣告 `toolMetadata`，而不是讓核心導入執行時來詢問。

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個入門或驗證選擇。
OpenClaw 在提供者執行時載入之前讀取此內容。
提供者設定清單使用這些清單選擇、衍生自描述元的設定選擇和安裝目錄元數據，而無需載入提供者執行時。

| 欄位                  | 必要 | 類型                                                                  | 含義                                                                    |
| --------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                                              | 此選擇所屬的提供者 ID。                                                 |
| `method`              | 是   | `string`                                                              | 要分派到的驗證方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                                              | 由入門和 CLI 流程使用的穩定驗證選擇 ID。                                |
| `choiceLabel`         | 否   | `string`                                                              | 面向使用者的標籤。如果省略，OpenClaw 將會回退到 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                                              | 選擇器的簡短輔助文字。                                                  |
| `assistantPriority`   | 否   | `number`                                                              | 較低的數值在助理驅動的互動式選擇器中會排序較靠前。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                                        | 在助理選擇器中隱藏此選項，但同時仍允許手動 CLI 選擇。                   |
| `deprecatedChoiceIds` | 否   | `string[]`                                                            | 應將使用者重新導向至此取代選項的舊版選項 ID。                           |
| `groupId`             | 否   | `string`                                                              | 用於將相關選項分組的可選群組 ID。                                       |
| `groupLabel`          | 否   | `string`                                                              | 該群組的面向使用者的標籤。                                              |
| `groupHint`           | 否   | `string`                                                              | 該群組的簡短輔助文字。                                                  |
| `optionKey`           | 否   | `string`                                                              | 用於簡單單一標誌驗證流程的內部選項鍵。                                  |
| `cliFlag`             | 否   | `string`                                                              | CLI 標誌名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`           | 否   | `string`                                                              | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否   | `string`                                                              | CLI 說明中使用的描述。                                                  |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation" \| "music-generation">` | 此選項應出現在哪一個入門介面中。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有執行時命令名稱，且使用者可能會誤將其放入 `plugins.allow` 或嘗試作為根 CLI 命令執行時，請使用 `commandAliases`。OpenClaw 會使用此元數據進行診斷，而不需匯入外掛執行時代碼。

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

| 欄位         | 必填 | 類型              | 含義                                           |
| ------------ | ---- | ----------------- | ---------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛的命令名稱。                         |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而非根 CLI 命令。    |
| `cliCommand` | 否   | `string`          | 如果存在，則為 CLI 操作建議的相關根 CLI 指令。 |

## 啟用 參考

當外掛程式可以輕鬆宣告哪些控制平面事件應將其包含在啟用/載入計畫中時，請使用 `activation`。

此區塊是規劃器元資料，而非生命週期 API。它不註冊執行時期行為，不取代 `register(...)`，也不保證外掛程式程式碼已經執行。啟用規劃器會在回退到現有的清單所有權元資料（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks）之前，使用這些欄位來縮小候選外掛程式的範圍。

請優先使用已描述所有權的最精確元資料。當這些欄位表達關聯時，請使用 `providers`、`channels`、`commandAliases`、設定描述符或 `contracts`。請使用 `activation` 來表示無法由這些所有權欄位表示的額外規劃器提示。對於 CLI 執行時期別名（例如 `claude-cli`、`my-cli` 或 `google-gemini-cli`），請使用頂層的 `cliBackends`；`activation.onAgentHarnesses` 僅適用於尚無所有權欄位的內嵌代理程式 harness ID。

此區塊僅為元資料。它不註冊執行時期行為，也不取代 `register(...)`、`setupEntry` 或其他執行時期/外掛程式進入點。目前的消費者會將其用作廣泛載入外掛程式之前的縮小提示，因此缺少非啟動啟用元資料通常只會影響效能；只要清單所有權回退機制仍然存在，它應不會影響正確性。

每個插件應該有意圖地設定 `activation.onStartup`。僅當插件必須在 Gateway 啟動期間執行時，才將其設定為 `true`。當插件在啟動時處於非活動狀態且應僅由更窄的觸發器載入時，將其設定為 `false`。省略 `onStartup` 不再隱含地在啟動時載入插件；請針對 startup、channel、config、agent-harness、memory 或其他更窄的啟動觸發器使用明確的啟動元資料。

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

| 欄位               | 必填 | 類型                                                 | 含義                                                                                                                                         |
| ------------------ | ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `onStartup`        | 否   | `boolean`                                            | 明確的 Gateway 啟動啟用。每個插件都應設定此項。`true` 會在啟動期間匯入插件；`false` 則使其保持啟動延遲狀態，除非另一個符合的觸發器要求載入。 |
| `onProviders`      | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的提供者 ID。                                                                                               |
| `onAgentHarnesses` | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的嵌入式 agent harness 執行階段 ID。請使用頂層 `cliBackends` 作為 CLI 後端別名。                            |
| `onCommands`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的指令 ID。                                                                                                 |
| `onChannels`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的通道 ID。                                                                                                 |
| `onRoutes`         | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的路由種類。                                                                                                |
| `onConfigPaths`    | 否   | `string[]`                                           | 當根相對設定路徑存在且未明確停用時，應在啟動/載入計畫中包含此外掛程式的根相對設定路徑。                                                      |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 由控制平面啟用規劃使用的廣泛功能提示。盡可能優先使用更窄的欄位。                                                                             |

目前即時消費者：

- Gateway 啟動規劃使用 `activation.onStartup` 進行明確啟動
  匯入
- 指令觸發的 CLI 規劃會回退到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- agent-runtime 啟動規劃對於嵌入式控制線程使用 `activation.onAgentHarnesses`，對於 CLI 執行時別名使用頂層 `cliBackends[]`
- 當缺少明確的通道啟動元數據時，通道觸發的設定/通道規劃會回退到舊版 `channels[]` 所屬權
- 啟動外掛程式規劃對於非通道根配置介面（例如捆绑式瀏覽器外掛程式的 `browser` 區塊）使用 `activation.onConfigPaths`
- 當缺少明確的提供者啟動元數據時，提供者觸發的設定/執行時規劃會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所屬權

規劃器診斷可以區分明確的啟動提示與清單所屬權回退。例如，`activation-command-hint` 表示
`activation.onCommands` 已匹配，而 `manifest-command-alias` 表示
規劃器改用了 `commandAliases` 所屬權。這些原因標籤是供主機診斷和測試使用的；外掛程式作者應繼續聲明最能描述所屬權的元數據。

## qaRunners 參考

當外掛程式在共享 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。請保持此元數據低成本且靜態；外掛程式執行時仍透過輕量級的 `runtime-api.ts` 介面擁有實際的 CLI 註冊，該介面會匯出 `qaRunnerCliRegistrations`。

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

| 欄位          | 必要 | 類型     | 含義                                             |
| ------------- | ---- | -------- | ------------------------------------------------ |
| `commandName` | 是   | `string` | 掛載在 `openclaw qa` 下的子指令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共享主機需要存根指令時使用的備用說明文字。     |

## setup 參考

當設定和上架介面需要在執行時載入之前取得低成本的外掛程式自有元數據時，請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推理後端。`setup.cliBackends` 是用於控制平面/設定流程的特定設定描述表面，應保持為僅包含元數據。

當存在時，`setup.providers` 和 `setup.cliBackends` 是用於設定探索的首選描述優先查找表面。如果描述僅縮小了候選插件範圍，且設定仍需要更豐富的設定時運行時掛鉤，請設定 `requiresRuntime: true` 並保留 `setup-api` 作為後備執行路徑。

OpenClaw 也會在通用提供者驗證和環境變量查找中包含 `setup.providers[].envVars`。`providerAuthEnvVars` 在棄用期間透過相容性適配器保持支援，但仍在使用它的非捆綁式插件會收到清單診斷訊息。新插件應將設定/狀態環境變量元數據放在 `setup.providers[].envVars` 上。

當沒有可用的設定條目，或者當 `setup.requiresRuntime: false` 宣告設定運行時不必要時，OpenClaw 也可以從 `setup.providers[].authMethods` 推導簡單的設定選擇。對於自定義標籤、CLI 標誌、入門範圍和助理元數據，顯式的 `providerAuthChoices` 條目仍然是首選。

僅當那些描述足以滿足設定表面時，才設定 `requiresRuntime: false`。OpenClaw 將顯式的 `false` 視為僅描述契約，並且不會執行 `setup-api` 或 `openclaw.setupEntry` 進行設定查找。如果僅描述插件仍然發送其中一個設定運行時條目，OpenClaw 會報告一個附加診斷訊息並繼續忽略它。省略 `requiresRuntime` 會保留傳統的後備行為，以便添加了描述但未添加該標誌的現有插件不會中斷。

由於設定查找可以執行插件擁有的 `setup-api` 代碼，標準化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必須在發現的插件之間保持唯一。模稜兩可的所有權會以封閉式失敗處理，而不是從發現順序中選擇一個獲勝者。

當 setup runtime 執行時，如果 `setup-api` 註冊了 manifest 描述符未宣告的提供者或 CLI 後端，或者描述符沒有對應的 runtime 註冊，setup registry 診斷會報告描述符偏移。這些診斷是累加的，不會拒絕舊版外掛。

### setup.providers 參考

| 欄位           | 必填 | 類型       | 說明                                                                 |
| -------------- | ---- | ---------- | -------------------------------------------------------------------- |
| `id`           | 是   | `string`   | 在設定或啟用期間公開的提供者 ID。請保持標準化 ID 的全域唯一性。      |
| `authMethods`  | 否   | `string[]` | 此提供者無需載入完整 runtime 即支援的設定/驗證方法 ID。              |
| `envVars`      | 否   | `string[]` | 通用設定/狀態介面可在載入外掛 runtime 之前檢查的環境變數。           |
| `authEvidence` | 否   | `object[]` | 針對可透過非秘密標記進行驗證的提供者，進行低成本的本機驗證證據檢查。 |

`authEvidence` 適用於無需載入 runtime 程式碼即可驗證的提供者擁有的本機憑證標記。這些檢查必須保持低成本且僅限本機：不進行網路呼叫、不讀取鑰匙圈或秘密管理器、不執行 Shell 指令，也不對提供者 API 進行探測。

支援的證據項目：

| 欄位               | 必填 | 類型       | 說明                                                                                   |
| ------------------ | ---- | ---------- | -------------------------------------------------------------------------------------- |
| `type`             | 是   | `string`   | 目前為 `local-file-with-env`。                                                         |
| `fileEnvVar`       | 否   | `string`   | 包含明確憑證檔案路徑的環境變數。                                                       |
| `fallbackPaths`    | 否   | `string[]` | 當 `fileEnvVar` 不存在或為空時檢查的本機憑證檔案路徑。支援 `${HOME}` 和 `${APPDATA}`。 |
| `requiresAnyEnv`   | 否   | `string[]` | 在證據有效之前，列出的環境變數中至少有一個必須非空。                                   |
| `requiresAllEnv`   | 否   | `string[]` | 在證據有效之前，列出的每個環境變數都必須非空。                                         |
| `credentialMarker` | 是   | `string`   | 當存在證據時返回的非秘密標記。                                                         |
| `source`           | 否   | `string`   | 使用者面向的來源標籤，用於驗證/狀態輸出。                                              |

### setup 欄位

| 欄位               | 必填 | 類型       | 說明                                                                          |
| ------------------ | ---- | ---------- | ----------------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和上手期間公開的提供者設定描述符。                                      |
| `cliBackends`      | 否   | `string[]` | 用於以描述符優先設定查找的設定階段後端 ID。請保持正規化 ID 在全域範圍內唯一。 |
| `configMigrations` | 否   | `string[]` | 由此外掛程式的設定介面所擁有的設定遷移 ID。                                   |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找後，設定是否仍需要執行 `setup-api`。                              |

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

| 欄位          | 類型       | 說明                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 使用者面向的欄位標籤。   |
| `help`        | `string`   | 簡短的輔助文字。         |
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可在不匯入外掛程式執行時間的情況下讀取的靜態功能擁有權中繼資料。

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

| 欄位                             | 類型       | 說明                                                                          |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex 應用程式伺服器擴充功能 factory ID，目前為 `codex-app-server`。          |
| `agentToolResultMiddleware`      | `string[]` | 打包的外掛程式可以為其註冊工具結果中介軟體的執行時間 ID。                     |
| `externalAuthProviders`          | `string[]` | 此外掛程式擁有外部驗證設定檔掛鉤的提供者 ID。                                 |
| `embeddingProviders`             | `string[]` | 此外掛程式擁有的通用嵌入提供者 ID，用於可重複使用的向量嵌入用途，包括記憶體。 |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 ID。                                               |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄提供者 ID。                                           |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音提供者 ID。                                           |
| `memoryEmbeddingProviders`       | `string[]` | 此外掛程式擁有的已棄用記憶體專用嵌入提供者 ID。                               |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解提供者 ID。                                           |
| `transcriptSourceProviders`      | `string[]` | 此外掛程式擁有的轉錄來源提供者 ID。                                           |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的影像生成提供者 ID。                                           |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成提供者 ID。                                           |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取提供者 ID。                                           |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋提供者 ID。                                           |
| `migrationProviders`             | `string[]` | 此外掛程式擁有的匯入提供者 ID，用於 `openclaw migrate`。                      |
| `gatewayMethodDispatch`          | `string[]` | 為在程序內分發 Gateway 方法的已驗證外掛程式 HTTP 路由保留的權利。             |
| `tools`                          | `string[]` | 此外掛程式擁有的 Agent 工具名稱。                                             |

`contracts.embeddedExtensionFactories` 保留給僅限打包 Codex 應用程式伺服器的擴充功能工廠。打包的工具結果轉換應改為宣告 `contracts.agentToolResultMiddleware` 並向 `api.registerAgentToolResultMiddleware(...)` 註冊。外部外掛程式無法註冊工具結果中介軟體，因為縫合可以在模型看到高信任工具輸出之前重寫它。

執行時期 `api.registerTool(...)` 註冊必須符合 `contracts.tools`。工具發現會使用此清單，僅載入可擁有請求工具的外掛程式執行時期。

實作 `resolveExternalAuthProfiles` 的提供者外掛應宣告
`contracts.externalAuthProviders`；未宣告的外部認證掛鉤將會被忽略。

一般嵌入式提供者應為每個透過 `api.registerEmbeddingProvider(...)` 註冊的配接器宣告 `contracts.embeddingProviders`。請使用一般合約進行可重複使用的向量生成，包括被記憶體搜尋使用的提供者。`contracts.memoryEmbeddingProviders` 是已棄用的記憶體特定相容性功能，僅在現有提供者遷移至通用嵌入式提供者介面時保留。

`contracts.gatewayMethodDispatch` 目前接受
`"authenticated-request"`。這是一個原生外掛 HTTP 路由的 API 衛生閘道，用於在程序內故意分派 Gateway 控制平面方法，而非針對惡意原生外掛的沙箱。僅將其用於已經過嚴格審查的捆綁/操作員介面，且這些介面已需要 Gateway HTTP 認證。

## mediaUnderstandingProviderMetadata 參考

當媒體理解提供者具有預設模型、自動認證後援優先順序，或通用核心協助程式在執行階段載入之前所需的原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。金鑰也必須在 `contracts.mediaUnderstandingProviders` 中宣告。

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

| 欄位                   | 類型                                | 含義                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供者公開的媒體功能。                           |
| `defaultModels`        | `Record<string, string>`            | 當組態未指定模型時使用的功能對模型預設值。         |
| `autoPriority`         | `Record<string, number>`            | 數字越小，在自動基於憑證的提供者後援中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供者支援的原生文件輸入。                         |

## channelConfigs 參考

當通道外掛需要在執行階段載入之前取得低成本的組態元資料時，請使用 `channelConfigs`。唯讀通道設定/狀態探索可以在沒有可用設定項目時，或當 `setup.requiresRuntime: false` 宣告設定執行階段不必要時，直接將此元資料用於已設定的外部通道。

`channelConfigs` 是插件清單元資料，而非新的頂層使用者設定區段。使用者仍在 `channels.<channel-id>` 下設定通道實例。OpenClaw 會讀取清單元資料，以便在插件執行時期程式碼執行之前，決定哪個插件擁有該已設定的通道。

對於通道插件而言，`configSchema` 和 `channelConfigs` 描述了不同的路徑：

- `configSchema` 驗證 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 驗證 `channels.<channel-id>`

宣告 `channels[]` 的非打包插件也應宣告相符的 `channelConfigs` 項目。若沒有這些項目，OpenClaw 仍可載入該插件，但在插件執行時期程式碼執行之前，冷路徑設定架構、設定程式和控制 UI 介面將無法得知通道擁有的選項形狀。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和 `nativeSkillsAutoEnabled` 可針對在通道執行時期載入前執行的命令設定檢查，宣告靜態 `auto` 預設值。打包通道也可以透過 `package.json#openclaw.channel.commands` 發布相同的預設值，與其套件擁有的其他通道目錄元資料並列。

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

| 欄位          | 類型                     | 說明                                                             |
| ------------- | ------------------------ | ---------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每個宣告的通道設定項目皆為必填。 |
| `uiHints`     | `Record<string, object>` | 該通道設定區段選用的 UI 標籤/預留位置/敏感提示。                 |
| `label`       | `string`                 | 當執行時期元資料尚未就緒時，合併至選擇器和檢查介面的通道標籤。   |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                               |
| `commands`    | `object`                 | 用於執行時期前設定檢查的靜態原生命令和原生技能自動預設值。       |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應排名於其上的舊版或較低優先權插件 ID。        |

### 替換其他通道外掛程式

當您的外掛程式是某個通道 ID 的首選擁有者，而另一個外掛程式也能提供該通道時，請使用 `preferOver`。常見情況包括：重新命名的外掛程式 ID、取代打包外掛程式的獨立外掛程式，或是為了保持設定相容性而保留相同通道 ID 的維護分支。

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

當設定 `channels.chat` 時，OpenClaw 會同時考慮通道 ID 和首選的外掛程式 ID。如果較低優先順序的外掛程式僅因為被打包或預設啟用而被選中，OpenClaw 會在有效的執行時設定中停用它，以便由一個外掛程式擁有該通道及其工具。明確的使用者選擇仍然優先：如果使用者明確啟用了兩個外掛程式，OpenClaw 將保留該選擇，並回報重複的通道/工具診斷訊息，而不是無聲地變更要求的外掛程式集。

請將 `preferOver` 的範圍限制在真正能提供相同通道的外掛程式 ID 上。這不是一個通用的優先順序欄位，也不會重新命名使用者設定鍵。

## modelSupport 參考

當 OpenClaw 應在載入外掛程式執行階段之前，從 `gpt-5.5` 或 `claude-sonnet-4.6` 等簡寫模型 ID 推斷您的提供者外掛程式時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 會套用下列優先順序：

- 明確的 `provider/model` 參照使用擁有的 `providers` 資訊清單元資料
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非打包外掛程式和一個打包外掛程式都符合，非打包外掛程式獲勝
- 其餘的歧異會被忽略，直到使用者或設定指定提供者為止

欄位：

| 欄位            | 類型       | 含義                                                    |
| --------------- | ---------- | ------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 對照簡寫模型 ID 比對的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，對照簡寫模型 ID 比對的 Regex 來源。 |

`modelPatterns` 項目是透過 `compileSafeRegex` 編譯的，它會拒絕包含巢狀重複的模式（例如 `(a+)+$`）。未通過安全性檢查的模式會被無訊息跳過，就像語法無效的 regex 一樣。請保持模式簡單，並避免巢狀量詞。

## modelCatalog 參考

當 OpenClaw 需要在載入外掛執行期之前知道提供者模型中繼資料時，請使用 `modelCatalog`。這是屬於清單擁有的來源，用於固定目錄列、提供者別名、抑制規則和探索模式。執行期重新整理仍屬於提供者執行期程式碼，但清單會告訴核心何時需要執行期。

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

| 欄位             | 類型                                                     | 含義                                                                    |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `providers`      | `Record<string, object>`                                 | 屬於此外掛擁有的提供者 ID 的目錄列。金鑰也應出現在頂層 `providers` 中。 |
| `aliases`        | `Record<string, object>`                                 | 應解析為擁有的提供者以進行目錄或抑制規劃的提供者別名。                  |
| `suppressions`   | `object[]`                                               | 來自其他來源的模型列，此外掛因提供者特定原因將其抑制。                  |
| `discovery`      | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供者目錄是可以從清單中繼資料讀取、重新整理到快取中，還是需要執行期。  |
| `runtimeAugment` | `boolean`                                                | 僅當提供者執行期必須在清單/組態規劃之後附加目錄列時，才設定為 `true`。  |

`aliases` 參與模型目錄規劃的提供者擁有權查找。
別名目標必須是同一外掛擁有的頂層提供者。當使用提供者過濾的列表使用別名時，OpenClaw 可以讀取擁有的清單並套用別名 API/基底 URL 覆寫，而無需載入提供者執行期。
別名不會展開未過濾的目錄列表；廣泛列表僅發出擁有的正式提供者列。

`suppressions` 取代了舊的 provider runtime `suppressBuiltInModel` hook。
僅當提供者是由外掛程式擁有，或被宣告為指向已擁有提供者的 `modelCatalog.aliases` 鍵時，才會採用抑制項目。Runtime
抑制 hooks 在模型解析期間不再被呼叫。

Provider 欄位：

| 欄位      | 類型                     | 含義                                           |
| --------- | ------------------------ | ---------------------------------------------- |
| `baseUrl` | `string`                 | 此提供者目錄中模型的選用預設基礎 URL。         |
| `api`     | `ModelApi`               | 此提供者目錄中模型的選用預設 API 配接器。      |
| `headers` | `Record<string, string>` | 套用至此提供者目錄的選用靜態標頭。             |
| `models`  | `object[]`               | 必要的模型資料列。沒有 `id` 的資料列將被忽略。 |

模型欄位：

| 欄位            | 類型                                                           | 含義                                                         |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `id`            | `string`                                                       | 提供者本機的模型 ID，不帶 `provider/` 前綴。                 |
| `name`          | `string`                                                       | 選用的顯示名稱。                                             |
| `api`           | `ModelApi`                                                     | 選用個別模型的 API 覆寫。                                    |
| `baseUrl`       | `string`                                                       | 選用個別模型的基礎 URL 覆寫。                                |
| `headers`       | `Record<string, string>`                                       | 選用個別模型的靜態標頭。                                     |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模式。                                             |
| `reasoning`     | `boolean`                                                      | 模型是否公開推理行為。                                       |
| `contextWindow` | `number`                                                       | 原生提供者上下文視窗。                                       |
| `contextTokens` | `number`                                                       | 當與 `contextWindow` 不同時，選用的有效 runtime 上下文上限。 |
| `maxTokens`     | `number`                                                       | 已知時的最大輸出 token 數。                                  |
| `cost`          | `object`                                                       | 選用的每百萬 token 美金價格，包括選用的 `tieredPricing`。    |
| `compat`        | `object`                                                       | 符合 OpenClaw 模型配置相容性的選用相容性旗標。               |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列舉狀態。僅當該列完全不能出現時才進行隱藏。                 |
| `statusReason`  | `string`                                                       | 與非可用狀態一起顯示的選用原因。                             |
| `replaces`      | `string[]`                                                     | 此模型取代的較舊供應商本機模型 ID。                          |
| `replacedBy`    | `string`                                                       | 已棄用列的取代供應商本機模型 ID。                            |
| `tags`          | `string[]`                                                     | 選取器和篩選器使用的穩定標籤。                               |

隱藏欄位：

| 欄位                       | 類型       | 含義                                                                  |
| -------------------------- | ---------- | --------------------------------------------------------------------- |
| `provider`                 | `string`   | 要隱藏的上游列之供應商 ID。必須由此外掛程式擁有，或宣告為擁有的別名。 |
| `model`                    | `string`   | 要隱藏的供應商本機模型 ID。                                           |
| `reason`                   | `string`   | 直接請求隱藏列時顯示的選用訊息。                                      |
| `when.baseUrlHosts`        | `string[]` | 在隱藏生效前所需的選用有效供應商基礎 URL 主機清單。                   |
| `when.providerConfigApiIn` | `string[]` | 在隱藏生效前所需的確切供應商配置 `api` 值選用清單。                   |

請勿將僅限運行時的資料放在 `modelCatalog` 中。僅當清單（manifest）資料列完整到足以讓供應商篩選清單和選擇器介面跳過註冊表/運行時探索時，才使用 `static`。當清單資料列是有用的可列出種子或補充資料，但重新整理/快取稍後可新增更多資料列時，請使用 `refreshable`；可重新整理的資料列本身不具有權威性。當 OpenClaw 必須載入供應商運行時才能得知清單時，請使用 `runtime`。

## modelIdNormalization 參考

使用 `modelIdNormalization` 進行廉價的供應商自有模型 ID 清理，這些清理必須在載入供應商運行時之前發生。這將短模型名稱、供應商本地舊版 ID 和代理前綴規則等別名保留在擁有者外掛程式清單中，而不是在核心模型選擇表中。

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

| 欄位                                 | 類型                    | 含義                                                                  |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不區分大小寫的精確模型 ID 別名。數值會按書寫形式返回。                |
| `stripPrefixes`                      | `string[]`              | 在別名查閱之前要移除的前綴，適用於舊版供應商/模型重複的情況。         |
| `prefixWhenBare`                     | `string`                | 當正規化後的模型 ID 未包含 `/` 時要新增的前綴。                       |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 別名查閱後的條件式純 ID 前綴規則，以 `modelPrefix` 和 `prefix` 為鍵。 |

## providerEndpoints 參考

使用 `providerEndpoints` 進行端點分類，通用請求策略必須在載入供應商運行時之前知道這些分類。核心仍然擁有每個 `endpointClass` 的含義；外掛程式清單擁有主機和基本 URL 元資料。

端點欄位：

| 欄位                           | 類型       | 含義                                                                          |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端點類別，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 對應至端點類別的精確主機名稱。                                                |
| `hostSuffixes`                 | `string[]` | 對應至端點類別的主機後綴。若僅針對域名後綴進行比對，請加上 `.` 前綴。         |
| `baseUrls`                     | `string[]` | 對應至端點類別的精確正規化 HTTP(S) 基礎 URL。                                 |
| `googleVertexRegion`           | `string`   | 用於精確全域主機的靜態 Google Vertex 區域。                                   |
| `googleVertexRegionHostSuffix` | `string`   | 從符合條件的主機中移除的後綴，以揭露 Google Vertex 區域前綴。                 |

## providerRequest 參考

請使用 `providerRequest` 來提供低成本的請求相容性中繼資料，供通用請求原則在不需要載入提供者執行時間的情況下使用。請將特定行為的承載重寫保留在提供者執行時間的勾點或共享的提供者系列輔助程式中。

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

| 欄位                  | 類型         | 說明                                                         |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `family`              | `string`     | 用於通用請求相容性決策和診斷的提供者系列標籤。               |
| `compatibilityFamily` | `"moonshot"` | 用於共享請求輔助程式的選用提供者系列相容性群組。             |
| `openAICompletions`   | `object`     | OpenAI 相容的補全請求旗標，目前為 `supportsStreamingUsage`。 |

## modelPricing 參考

當提供者需要在執行時間載入之前進行控制平面定價行為時，請使用 `modelPricing`。閘道定價快取會讀取此中繼資料，而不需匯入提供者執行時間程式碼。

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

| 欄位         | 類型              | 說明                                                                         |
| ------------ | ----------------- | ---------------------------------------------------------------------------- |
| `external`   | `boolean`         | 針對不應擷取 OpenRouter 或 LiteLLM 定價的本機/自託管提供者，請設定 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定價查詢對應。`false` 會停用此提供者的 OpenRouter 查詢。          |
| `liteLLM`    | `false \| object` | LiteLLM 定價查詢對應。`false` 會停用此提供者的 LiteLLM 查詢。                |

來源欄位：

| 欄位                       | 類型               | 含義                                                                                      |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 當外部目錄提供者 ID 與 OpenClaw 提供者 ID 不同時使用，例如對於 `zai` 提供者使用 `z-ai`。  |
| `passthroughProviderModel` | `boolean`          | 將包含斜線的模型 ID 視為巢狀提供者/模型參照，適用於 OpenRouter 等代理提供者。             |
| `modelIdTransforms`        | `"version-dots"[]` | 額外的外部目錄模型 ID 變體。`version-dots` 會嘗試像 `claude-opus-4.6` 這樣的點號版本 ID。 |

### OpenClaw 提供者索引

OpenClaw 提供者索引是 OpenClaw 擁有的提供者預覽元資料，
適用於外掛程式可能尚未安裝的提供者。它不是外掛程式清單的一部分。
外掛程式清單仍然是已安裝外掛程式的權威來源。提供者索引是
內部後援合約，當未安裝提供者外掛程式時，未來的可安裝提供者和
預安裝模型選擇器介面將會使用此合約。

目錄權威順序：

1. 使用者設定。
2. 已安裝的外掛程式清單 `modelCatalog`。
3. 來自明確重新整理的模型目錄快取。
4. OpenClaw 提供者索引預覽列。

提供者索引不得包含祕密、啟用狀態、執行時期鉤子，或
即時帳戶特定的模型資料。其預覽目錄使用與外掛程式清單相同的
`modelCatalog` 提供者列形狀，但應保持限制
於穩定的顯示元資料，除非像 `api`、
`baseUrl`、定價或相容性旗標等執行時期介面卡欄位是有意與
已安裝的外掛程式清單保持一致。具有即時 `/models` 探索功能的提供者應
透過明確的模型目錄快取路徑寫入重新整理的列，而不是
對提供者 API 進行正常的列出或上架呼叫。

Provider Index 項目也可能包含可安裝外掛程式的元數據，適用於其外掛程式已從核心移出或尚未安裝的提供者。此元數據反映通道目錄模式：套件名稱、npm install 規格、預期的完整性以及廉價的驗證選擇標籤，足以顯示可安裝的設定選項。一旦外掛程式安裝完成，其清單將優先，並忽略該提供者的 Provider Index 項目。

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清單載入程序不再將這些頂層欄位視為功能所有權。

## Manifest 與 package.

這兩個檔案有不同的用途：

| 檔案                   | 用途                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、設定驗證、驗證選擇元數據，以及外掛程式碼執行前必須存在的 UI 提示               |
| `package.json`         | npm 元數據、相依性安裝，以及用於進入點、安裝閘道、設定或目錄元數據的 `openclaw` 區塊 |

如果您不確定某段元數據應該放在哪裡，請使用這條規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它與打包、進入檔案或 npm install 行為有關，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

某些執行前階段的外掛元數據刻意存放在 `package.json` 的 `openclaw` 區塊下，而非 `openclaw.plugin.json` 中。`openclaw.bundle` 和 `openclaw.bundle.json` 並非 OpenClaw 外掛程式合約；原生外掛程式必須使用 `openclaw.plugin.json` 加上下列支援的 `package.json#openclaw` 欄位。

重要範例：

| 欄位                                                                                       | 含義                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                                                      | 宣告原生外掛程式的進入點。必須保留在外掛程式套件目錄內。                                                      |
| `openclaw.runtimeExtensions`                                                               | 宣告已安裝套件的已建置 JavaScript 執行時進入點。必須保留在外掛程式套件目錄內。                                |
| `openclaw.setupEntry`                                                                      | 在加入、延遲通道啟動和唯讀通道狀態/SecretRef 探索期間使用的輕量級僅設定進入點。必須保留在外掛程式套件目錄內。 |
| `openclaw.runtimeSetupEntry`                                                               | 宣告已安裝套件的已建置 JavaScript 設定進入點。需要 `setupEntry`，必須存在，且必須保留在外掛程式套件目錄內。   |
| `openclaw.channel`                                                                         | 輕量級通道目錄元資料，例如標籤、文件路徑、別名和選擇複本。                                                    |
| `openclaw.channel.commands`                                                                | 設定、稽核和命令清單介面在通道執行時載入之前所使用的靜態原生命令和原生技能自動預設元資料。                    |
| `openclaw.channel.configuredState`                                                         | 輕量級設定狀態檢查器元資料，可在不載入完整通道執行時的情況下回答「僅環境的設定是否已存在？」。                |
| `openclaw.channel.persistedAuthState`                                                      | 輕量級持續性驗證檢查器元資料，可在不載入完整通道執行時的情況下回答「是否有任何項目已登入？」。                |
| `openclaw.install.clawhubSpec` / `openclaw.install.npmSpec` / `openclaw.install.localPath` | 套件和外部發布外掛程式的安裝/更新提示。                                                                       |
| `openclaw.install.defaultChoice`                                                           | 當有多個安裝來源可用時的首選安裝路徑。                                                                        |
| `openclaw.install.minHostVersion`                                                          | 最低支援的 OpenClaw 主機版本，使用像 `>=2026.3.22` 或 `>=2026.5.1-beta.1` 這樣的 semver 下限。                |
| `openclaw.compat.pluginApi`                                                                | 此套件所需的最低 OpenClaw 外掛程式 API 範圍，使用像 `>=2026.5.27` 這樣的 semver 下限。                        |
| `openclaw.install.expectedIntegrity`                                                       | 預期的 npm dist 完整性字串，例如 `sha512-...`；安裝和更新流程會根據其驗證擷取的構件。                         |
| `openclaw.install.allowInvalidConfigRecovery`                                              | 當設定無效時，允許狹窄的套件外掛程式重新安裝復原路徑。                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`                          | 讓 setup-runtime 頻道表面在 listen 之前加載，然後將完整配置的頻道外掛程式延遲到 post-listen 啟動時再載入。    |

Manifest 元資料決定了哪些 provider/channel/setup 選項在 runtime 載入前出現在 onboarding 中。`package.json#openclaw.install` 告訴 onboarding 當使用者選擇其中一個選項時如何獲取或啟用該外掛程式。請勿將安裝提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 在安裝期間針對非捆綁的外掛程式來源執行 manifest registry 載入。無效的值會被拒絕；較新但有效的值會在舊版主機上跳過外部外掛程式。假設捆綁的來源外掛程式與主機結帳的版本是共同版本控制的。

`openclaw.compat.pluginApi` 在非捆綁外掛程式來源的套件安裝期間被執行。將其用於該套件建構時所依據的 OpenClaw 外掛程式 SDK/runtime API 底線。當外掛程式套件需要較新的 API，但仍為其他流程保持較低的安裝提示時，它可以比 `minHostVersion` 更嚴格。官方 OpenClaw 發布版本預設會將現有的官方外掛程式 API 底線同步提升至 OpenClaw 發布版本，但僅外掛程式的發布版本在套件有意支援較舊的主機時可以保持較低的底線。請勿單獨使用套件版本作為相容性合約。`peerDependencies.openclaw` 保持為 npm 套件元資料；OpenClaw 使用 `openclaw.compat.pluginApi` 合約來決定安裝相容性。

官方的 install-on-demand 元資料應該在外掛程式發布於 ClawHub 時使用 `clawhubSpec`；onboarding 將其視為首選的遠端來源，並在安裝後記錄 ClawHub artifact 事實。`npmSpec` 仍是尚未遷移至 ClawHub 的套件的相容性後備方案。

精確的 npm 版本鎖定已經存在於 `npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方的外部目錄
項目應將精確規範與 `expectedIntegrity` 配對，以便當獲取的 npm 構件不再與鎖定的發行版相符時，更新流程將失敗。
互動式引導仍然提供受信任的 registry npm 規範（包括裸套件名稱和 dist-tags），以保持相容性。目錄診斷可以區分精確、浮動、完整性鎖定、缺少完整性、套件名稱不匹配和無效的預設選擇來源。它們還會在
存在 `expectedIntegrity` 但沒有有效的 npm 來源可供鎖定時發出警告。
當存在 `expectedIntegrity` 時，
安裝/更新流程會強制執行它；當省略它時，registry 解析方案會被記錄下來，而不包含完整性鎖定。

當狀態、通道列表或 SecretRef 掃描需要在不加載完整執行時的情況下識別已配置的帳戶時，通道外掛程式應提供 `openclaw.setupEntry`。設置項目應公開通道元數據以及設置安全的配置、狀態和祕密適配器；將網路客戶端、閘道監聽器和傳輸執行時保留在主擴充功能入口點中。

執行時入口點欄位不會覆蓋對源入口點欄位的套件邊界檢查。例如，`openclaw.runtimeExtensions` 無法使
逸出的 `openclaw.extensions` 路徑可載入。

`openclaw.install.allowInvalidConfigRecovery` 的範圍是有意限縮的。它
並不會使任意損壞的配置可安裝。目前它僅允許安裝流程從特定的過時捆綁外掛程式升級失敗中恢復，例如缺少捆綁外掛程式路徑或同一
捆綁外掛程式的過時 `channels.<id>` 項目。無關的配置錯誤仍會阻止安裝並將操作員引導至
`openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微小檢查器模組的套件元數據：

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

在安裝、檢查、狀態或唯讀呈現流程需要在完整頻道外掛載入前進行低成本的
是/否驗證探測時使用。持久的驗證狀態並非已配置的頻道狀態：請勿使用此元資料來自動啟用外掛、
修復執行階段相依性，或決定是否應載入頻道執行階段。目標匯出應為一個僅讀取持久狀態的小型函式；請
將其路由傳送至完整的頻道執行階段集合。

`openclaw.channel.configuredState` 遵循相同的結構，用於低成本的僅限環境變數
配置檢查：

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

當頻道可以從環境變數或其他微小的非執行階段輸入回報已配置狀態時使用。如果檢查需要完整的配置解析或實際的
頻道執行階段，請將該邏輯保留在外掛的 `config.hasConfiguredState`
掛鉤中。

## 探索優先順序 (重複的外掛 ID)

OpenClaw 會從多個根目錄探索外掛。若要了解原始檔案系統掃描
順序，請參閱 [外掛掃描
順序](/zh-Hant/gateway/configuration-reference#plugin-scan-order)。如果兩個探索結果
共用相同的 `id`，則只會保留 **優先順序最高** 的清單；
優先順序較低的重複項將被捨棄，而不是與其並排載入。

優先順序，從高到低：

1. **配置選取** — 在 `plugins.entries.<id>` 中明確釘選的路徑
2. **內建** — 隨 OpenClaw 一起發行外掛
3. **全域安裝** — 安裝在全域 OpenClaw 外掛根目錄中的外掛
4. **工作區** — 相對於目前工作區探索到的外掛

影響：

- 位於工作區中的內建外掛的分支或過時副本將不會覆蓋內建的組建。
- 若要實際使用本機版本覆寫內建外掛，請透過 `plugins.entries.<id>` 進行釘選，使其因優先順序而獲勝，而不是仰賴工作區探索。
- 重複項的捨棄會被記錄下來，以便 Doctor 和啟動診斷能夠指向被捨棄的副本。
- 在診斷中，配置選取的重複覆寫會被表述為明確的覆寫，但仍會發出警告，以便讓過時的分支和意外的覆蓋保持可見。

## JSON Schema 需求

- **每個外掛都必須隨附 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可以接受的 (例如，`{ "type": "object", "additionalProperties": false }`)。
- Schema 會在配置讀取/寫入時進行驗證，而不是在執行階段。
- 當使用新的配置鍵擴展或分叉打包插件時，請同時更新該插件的 `openclaw.plugin.json` `configSchema`。打包插件的 schema 很嚴格，因此如果在用戶配置中添加 `plugins.entries.<id>.config.myNewKey` 而未將 `myNewKey` 添加到 `configSchema.properties`，將在插件運行時加載之前被拒絕。

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

- 未知的 `channels.*` 鍵是**錯誤**，除非頻道 id 已由
  插件清單聲明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可發現**的插件 id。未知的 id 是**錯誤**。
- 如果插件已安裝但清單或 schema 損壞或缺失，
  驗證將失敗，Doctor 將報告插件錯誤。
- 如果插件配置存在但插件已**停用**，配置將被保留，並在
  Doctor + 日誌中顯示**警告**。

有關完整的 `plugins.*` schema，請參閱 [配置參考](/zh-Hant/gateway/configuration)。

## 備註

- 對於原生 OpenClaw 插件（包括本地文件系統加載），清單是**必需的**。運行時仍然會單獨加載插件模組；清單僅用於發現和驗證。
- 原生清單使用 JSON5 解析，因此只要最終值仍為對象，就接受註釋、尾隨逗號和未加引號的鍵。
- 清單加載器僅讀取記錄在案的清單欄位。請避免自定義頂層鍵。
- 當插件不需要時，`channels`、`providers`、`cliBackends` 和 `skills` 都可以省略。
- `providerCatalogEntry` 必須保持輕量，不應導入廣泛的運行時代碼；將其用於靜態提供者目錄元數據或狹窄的發現描述符，而不是請求時執行。
- 互斥的插件類型通過 `plugins.slots.*` 選擇：`kind: "memory"` 通過 `plugins.slots.memory`，`kind: "context-engine"` 通過 `plugins.slots.contextEngine`（預設 `legacy`）。
- 在此宣告中宣告獨佔的外掛種類。Runtime-entry `OpenClawPluginDefinition.kind` 已被棄用，僅作為舊版外掛的相容性後備方案保留。
- 環境變數中繼資料（`setup.providers[].envVars`、已棄用的 `providerAuthEnvVars` 和 `channelEnvVars`）僅供宣告使用。狀態、稽核、cron 傳遞驗證及其他唯讀介面，在將環境變數視為已設定之前，仍會套用外掛信任權限和有效啟用原則。
- 關於需要提供者程式碼的執行時精靈中繼資料，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的外掛相依於原生模組，請記錄建置步驟及任何套件管理員允許清單需求（例如 pnpm `allow-build-scripts` + `pnpm rebuild <package>`）。

## 相關

<CardGroup cols={3}>
  <Card title="Building plugins" href="/zh-Hant/plugins/building-plugins" icon="rocket">
    外掛入門指南。
  </Card>
  <Card title="Plugin architecture" href="/zh-Hant/plugins/architecture" icon="diagram-project">
    內部架構與功能模型。
  </Card>
  <Card title="SDK overview" href="/zh-Hant/plugins/sdk-overview" icon="book">
    外掛 SDK 參考與子路徑匯入。
  </Card>
</CardGroup>
