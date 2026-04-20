---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

若要了解相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex bundle：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json` 或沒有資訊清單的預設 Claude 元件
  佈局
- Cursor bundle：`.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但它們不會根據此處描述的
`openclaw.plugin.json` 結構描述進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前
會讀取套件中繼資料以及宣告的技能根目錄、Claude 指令根目錄、Claude 套件
`settings.json` 預設值、Claude 套件 LSP 預設值和支援的掛鉤套件。

每個原生 OpenClaw 外掛程式**必須**在**外掛程式根目錄**中提供一個
`openclaw.plugin.json` 檔案。OpenClaw 使用此資訊清單來驗證設定，而**無須執行外掛程式碼**。
遺失或無效的資訊清單會被視為外掛程式錯誤，並阻擋設定驗證。

請參閱完整的外掛系統指南：[Plugins](/zh-Hant/tools/plugin)。
若要了解原生功能模型以及目前的外部相容性指引：
[Capability model](/zh-Hant/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的外掛程式碼之前所讀取的中繼資料。

將其用於：

- 外掛程式身分識別
- 設定驗證
- 應該在啟動外掛程式執行時期之前可用的驗證和上架中繼資料
- 控制平面介面可在執行時期載入前檢查的低成本啟動提示
- 設定/上架介面可在執行時期載入前檢查的低成本設定描述元
- 應在外掛程式執行時期載入前解析的別名和自動啟用中繼資料
- 應在外掛程式執行時期載入前自動啟動外掛程式的簡寫模型系列擁有權中繼資料
- 用於套件相容性連線和合約覆蓋率的靜態功能擁有權快照
- 共用的 `openclaw qa` 主機可在外掛程式執行時期載入前檢查的低成本 QA 執行器中繼資料
- 應在無須載入執行時期的情況下合併到目錄和驗證介面的特定管道設定中繼資料
- 設定 UI 提示

請勿將其用於：

- 註冊執行時期行為
- 宣告程式碼進入點
- npm install 元資料

那些屬於您的外掛程式碼與 `package.json`。

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
  "providerEndpoints": [
    {
      "endpointClass": "xai-native",
      "hosts": ["api.x.ai"]
    }
  ],
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

| 欄位                                | 必要 | 類型                             | 含義                                                                                                                               |
| ----------------------------------- | ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | 是   | `string`                         | 正式的外掛 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                         |
| `configSchema`                      | 是   | `object`                         | 此外掛設定的內聯 JSON Schema。                                                                                                     |
| `enabledByDefault`                  | 否   | `true`                           | 將打包的外掛標記為預設啟用。省略它，或設定任何非 `true` 的值，以將外掛預設為停用狀態。                                             |
| `legacyPluginIds`                   | 否   | `string[]`                       | 正規化為此正式外掛 ID 的舊版 ID。                                                                                                  |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 當身份驗證、設定或模型參照提及這些提供者 ID 時，應自動啟用此外掛的提供者 ID。                                                      |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的專屬外掛類型。                                                                                      |
| `channels`                          | 否   | `string[]`                       | 由此外掛擁有的頻道 ID。用於探索與設定驗證。                                                                                        |
| `providers`                         | 否   | `string[]`                       | 由此外掛擁有的提供者 ID。                                                                                                          |
| `modelSupport`                      | 否   | `object`                         | 由清單擁有的簡寫模型家族元資料，用於在執行階段前自動載入外掛。                                                                     |
| `providerEndpoints`                 | 否   | `object[]`                       | 清單擁有的端點主機/baseUrl 元資料，用於核心必須在提供者執行時載入之前進行分類的提供者路由。                                        |
| `cliBackends`                       | 否   | `string[]`                       | 此外掛擁有的 CLI 推斷後端 ID。用於透過明確設定參照進行啟動時自動啟用。                                                             |
| `syntheticAuthRefs`                 | 否   | `string[]`                       | 提供者或 CLI 後端參照，其外掛擁有的合成驗證掛勾應在執行時載入之前的冷模型探索期間進行探查。                                        |
| `nonSecretAuthMarkers`              | 否   | `string[]`                       | 套件外掛擁有的預留位置 API 金鑰值，代表非機密的本機、OAuth 或環境認證狀態。                                                        |
| `commandAliases`                    | 否   | `object[]`                       | 此外掛擁有的指令名稱，應在執行時載入之前產生外掛感知的設定和 CLI 診斷。                                                            |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量型提供者驗證環境元資料。                                                            |
| `providerAuthAliases`               | 否   | `Record<string, string>`         | 應重複使用另一個提供者 ID 進行驗證查詢的提供者 ID，例如共用基底提供者 API 金鑰和驗證設定檔的編碼提供者。                           |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量型通道環境元資料。將其用於一般啟動/設定輔助程式應看見的環境驅動通道設定或驗證介面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用於上架挑選器、首選提供者解析和簡單 CLI 旗標接線的輕量型驗證選擇元資料。                                                          |
| `activation`                        | 否   | `object`                         | 針對提供者、指令、頻道、路由和功能觸發載入的低成本啟用提示。僅為元數據；外掛執行時仍擁有實際行為。                                 |
| `setup`                             | 否   | `object`                         | 低成本設定/入門描述符，可供發現和設定介面檢查，無需載入外掛執行時。                                                                |
| `qaRunners`                         | 否   | `object[]`                       | 低成本 QA 執行器描述符，由共用 `openclaw qa` 主機在外掛執行時載入之前使用。                                                        |
| `contracts`                         | 否   | `object`                         | 靜態綁定的功能快照，涵蓋語音、即時轉錄、即時語音、媒體理解、圖像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具所有權。         |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 清單擁有的頻道設定元數據，在執行時載入之前合併到發現和驗證介面中。                                                                 |
| `skills`                            | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                               |
| `name`                              | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                               |
| `description`                       | 否   | `string`                         | 顯示在外掛介面中的簡短摘要。                                                                                                       |
| `version`                           | 否   | `string`                         | 資訊性的外掛版本。                                                                                                                 |
| `uiHints`                           | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、佔位符和敏感性提示。                                                                                           |

## providerAuthChoices 參考資料

每個 `providerAuthChoices` 項目描述一個入門或驗證選擇。
OpenClaw 會在提供者執行時載入之前讀取此內容。

| 欄位                  | 必填 | 類型                                            | 含義                                                                  |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選擇所屬的提供者 ID。                                               |
| `method`              | 是   | `string`                                        | 要分派到的驗證方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 用於入門和 CLI 流程的穩定驗證選擇 ID。                                |
| `choiceLabel`         | 否   | `string`                                        | 使用者可見的標籤。如果省略，OpenClaw 會回退到 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短說明文字。                                                |
| `assistantPriority`   | 否   | `number`                                        | 數值較低者在助理驅動的互動式選擇器中排序較前。                        |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏此選項，但仍允許透過手動 CLI 選取。                 |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選項 ID。                         |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                     |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者面向標籤。                                              |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短說明文字。                                                |
| `optionKey`           | 否   | `string`                                        | 簡單的單一標記驗證流程的內部選項金鑰。                                |
| `cliFlag`             | 否   | `string`                                        | CLI 標記名稱，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                        | 用於 CLI 說明的描述。                                                 |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應顯示在哪些入伙介面上。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有執行階段指令名稱，且使用者可能錯誤地將其置於 `plugins.allow` 或嘗試以根級 CLI 指令執行時，請使用 `commandAliases`。OpenClaw 會使用此中繼資料進行診斷，而不需匯入外掛執行階段程式碼。

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

| 欄位         | 必要 | 類型              | 含義                                                       |
| ------------ | ---- | ----------------- | ---------------------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛的指令名稱。                                     |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而非根級 CLI 指令。              |
| `cliCommand` | 否   | `string`          | 如果在 CLI 操作中存在相關的根 CLI 指令，則建議使用該指令。 |

## activation 參考

當外掛程式能輕鬆宣告哪些控制平面事件應該在稍後啟動它時，請使用 `activation`。

## qaRunners 參考

當外掛程式在共享的 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。請將此元資料保持低成本且靜態；外掛程式執行時間仍擁有透過輕量級 `runtime-api.ts` 介面匯出 `qaRunnerCliRegistrations` 的實際 CLI 註冊權。

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
| `commandName` | 是   | `string` | 掛載於 `openclaw qa` 下的子指令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共享主機需要存根指令時使用的後援說明文字。     |

此區塊僅為元資料。它不註冊執行時間行為，也不取代 `register(...)`、`setupEntry` 或其他執行時間/外掛程式進入點。目前的消費者將其作為更廣泛外掛程式載入前的縮小提示使用，因此遺失啟用元資料通常只會影響效能；只要舊版清單所有權後援機制仍然存在，就不應影響正確性。

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 欄位             | 必要 | 類型                                                 | 含義                                    |
| ---------------- | ---- | ---------------------------------------------------- | --------------------------------------- |
| `onProviders`    | 否   | `string[]`                                           | 當被請求時應啟用此外掛程式的提供者 ID。 |
| `onCommands`     | 否   | `string[]`                                           | 應啟用此外掛程式的指令 ID。             |
| `onChannels`     | 否   | `string[]`                                           | 應啟用此外掛程式的通道 ID。             |
| `onRoutes`       | 否   | `string[]`                                           | 應啟用此外掛程式的路由類型。            |
| `onCapabilities` | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面啟用規劃所使用的廣泛功能提示。  |

目前即時消費者：

- 指令觸發的 CLI 規劃會後援至舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 當缺少明確的通道啟動中繼資料時，通道觸發的設定/通道規劃會回退到舊版 `channels[]`
  所有权
- 當缺少明確的提供者啟動中繼資料時，提供者觸發的設定/執行時規劃會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有权

## 設定參考

當設定和入介面需要在執行時載入之前取得低成本的插件自有中繼資料時，請使用 `setup`

```json
{
  "setup": {
    "providers": [
      {
        "id": "openai",
        "authMethods": ["api-key"],
        "envVars": ["OPENAI_API_KEY"]
      }
    ],
    "cliBackends": ["openai-cli"],
    "configMigrations": ["legacy-openai-auth"],
    "requiresRuntime": false
  }
}
```

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推斷
後端。`setup.cliBackends` 是控制平面/設定流程的特定設定描述介面，應僅包含中繼資料。

當存在時，`setup.providers` 和 `setup.cliBackends` 是設定探索的優先
描述優先查詢介面。如果描述僅縮小了候選插件範圍，而設定仍需要更豐富的設定時執行時
掛鉤，請設定 `requiresRuntime: true` 並將 `setup-api` 保留作為
後備執行路徑。

由於設定查詢可以執行插件自有的 `setup-api` 程式碼，因此正規化後的
`setup.providers[].id` 和 `setup.cliBackends[]` 值必須在所有
已發現的插件中保持唯一。模糊的所有權將以封閉式失敗處理，而不是根據發現順序選擇勝出者。

### setup.providers 參考

| 欄位          | 必要 | 類型       | 說明                                                         |
| ------------- | ---- | ---------- | ------------------------------------------------------------ |
| `id`          | 是   | `string`   | 在設定或入介期間公開的提供者 ID。請保持正規化 ID 全域唯一。  |
| `authMethods` | 否   | `string[]` | 此提供者在無需載入完整執行時的情況下支援的設定/驗證方法 ID。 |
| `envVars`     | 否   | `string[]` | 通用設定/狀態介面可在插件執行時載入之前檢查的環境變數。      |

### setup 欄位

| 欄位               | 必要 | 類型       | 說明                                                                        |
| ------------------ | ---- | ---------- | --------------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和入介期間公開的提供者設定描述。                                      |
| `cliBackends`      | 否   | `string[]` | 用於描述優先設定查找的設定階段後端 ID。請保持正規化的 ID 在全域範圍內唯一。 |
| `configMigrations` | 否   | `string[]` | 由此外掛設定層級擁有的設定遷移 ID。                                         |
| `requiresRuntime`  | 否   | `boolean`  | 在描述查找後，設定是否仍需執行 `setup-api`。                                |

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
| `help`        | `string`   | 簡短的輔助文字。         |
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可在無需匯入外掛執行時期的情況下讀取的靜態功能擁有權元資料。

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "realtimeTranscriptionProviders": ["openai"],
    "realtimeVoiceProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "videoGenerationProviders": ["qwen"],
    "webFetchProviders": ["firecrawl"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每個列表都是選用的：

| 欄位                             | 類型       | 含義                                              |
| -------------------------------- | ---------- | ------------------------------------------------- |
| `speechProviders`                | `string[]` | 此外掛擁有的語音提供者 ID。                       |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛擁有的即時轉錄提供者 ID。                   |
| `realtimeVoiceProviders`         | `string[]` | 此外掛擁有的即時語音提供者 ID。                   |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛擁有的媒體理解提供者 ID。                   |
| `imageGenerationProviders`       | `string[]` | 此外掛擁有的影像生成提供者 ID。                   |
| `videoGenerationProviders`       | `string[]` | 此外掛擁有的影片生成提供者 ID。                   |
| `webFetchProviders`              | `string[]` | 此外掛擁有的網頁擷取提供者 ID。                   |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋提供者 ID。               |
| `tools`                          | `string[]` | 此外掛程式擁有於套件合約檢查中的 Agent 工具名稱。 |

## channelConfigs 參考

當通道外掛程式在執行時間載入之前需要廉價的設定元資料時，請使用 `channelConfigs`。

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
      "preferOver": ["matrix-legacy"]
    }
  }
}
```

每個通道項目可以包含：

| 欄位          | 類型                     | 說明                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每個宣告的通道設定項目都需要。     |
| `uiHints`     | `Record<string, object>` | 該通道設定區段的可選 UI 標籤/預留位置/敏感提示。                   |
| `label`       | `string`                 | 當執行時間元資料尚未準備好時，合併到選擇器和檢查介面中的通道標籤。 |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                                 |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應排在較前的舊版或優先順序較低的外掛程式 ID。    |

## modelSupport 參考

當 OpenClaw 應該從簡寫模型 ID（例如 `gpt-5.4` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`，且這是在外掛程式執行時間載入之前。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用此優先順序：

- 明確的 `provider/model` 參照使用擁有的 `providers` 資訊清單元資料
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非套件外掛程式和一個套件外掛程式都匹配，非套件外掛程式獲勝
- 其餘的歧義會被忽略，直到使用者或設定指定提供者為止

欄位：

| 欄位            | 類型       | 說明                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 與簡寫模型 ID 匹配的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，與簡寫模型 ID 匹配的 Regex 來源。 |

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 之下；正常的清單載入不再將這些頂層欄位視為功能所有權。

## Manifest 與 package.

這兩個檔案用途不同：

| 檔案                   | 用途                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 探索、設定驗證、驗證選擇中繼資料，以及必須在插件程式碼執行前存在的 UI 提示             |
| `package.json`         | npm 中繼資料、依賴安裝，以及用於進入點、安裝閘道、設定或目錄中繼資料的 `openclaw` 區塊 |

如果您不確定某個中繼資料應放在何處，請使用此規則：

- 如果 OpenClaw 必須在載入插件程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它與打包、進入檔案或 npm install 行為有關，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

某些執行前期的插件中繼資料刻意位於 `package.json` 的 `openclaw` 區塊下，而不是 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 含義                                                                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生插件進入點。                                                                                 |
| `openclaw.setupEntry`                                             | 在入門和延遲通道啟動期間使用的輕量級僅設定進入點。                                                   |
| `openclaw.channel`                                                | 輕量級通道目錄中繼資料，例如標籤、文件路徑、別名和選擇文字。                                         |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器中繼資料，可以在不載入完整通道執行時的情況下回答「僅限環境的設定是否已存在？」。 |
| `openclaw.channel.persistedAuthState`                             | 輕量級持久驗證檢查器中繼資料，可以在不載入完整通道執行時的情況下回答「是否已經登入？」。             |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 針對套件與外部發布外掛的安裝/更新提示。                                                              |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時，偏好使用的安裝路徑。                                                         |
| `openclaw.install.minHostVersion`                                 | 支援的最低 OpenClaw 主機版本，使用諸如 `>=2026.3.22` 的 semver 下限。                                |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當配置無效時，允許狹隘的套件外掛重新安裝復原路徑。                                                   |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅限設定的介面在啟動期間於完整通道外掛之前載入。                                                   |

`openclaw.install.minHostVersion` 在安裝期間和清單註冊表載入時會被強制執行。無效的值會被拒絕；較新但有效的值會在舊版主機上跳過此外掛。

`openclaw.install.allowInvalidConfigRecovery` 是刻意設計為狹隘的。它並不會讓任意的損壞配置變得可安裝。目前它僅允許安裝流程從特定的陳舊套件外掛升級失敗中復原，例如缺少套件外掛路徑或該套件外掛的陳舊 `channels.<id>` 項目。無關的配置錯誤仍會阻擋安裝，並將操作員引導至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微小檢查器模組的套件元資料：

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

當設定、診斷或已設定狀態流程需要在完整通道外掛載入之前進行低成本的 yes/no 認證探測時使用它。目標匯出應該是一個僅讀取持久化狀態的小型函式；不要透過完整的通道運行時 barrel 進行路由。

`openclaw.channel.configuredState` 遵循相同的形狀以進行低成本的僅環境變數已設定檢查：

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

當通道可以從環境或其他微小的非執行時輸入回答已設定狀態時使用它。如果檢查需要完整的配置解析或真實的通道運行時，請將該邏輯保留在外掛的 `config.hasConfiguredState` hook 中。

## JSON Schema 需求

- **每個外掛都必須隨附 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可以接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在配置讀取/寫入時進行驗證，而非在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵為**錯誤**，除非該通道 id 是由外掛清單所宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照**可被發現的**（discoverable）外掛程式 ID。未知的 ID 屬於**錯誤**。
- 如果外掛程式已安裝，但其宣告檔或 schema 破損或遺失，
  驗證將會失敗，且 Doctor 會回報該外掛程式的錯誤。
- 如果外掛程式設定存在但外掛程式處於**停用**狀態，該設定將會被保留，
  並且會在 Doctor + 記錄檔中顯示**警告**。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration) 以取得完整的 `plugins.*` schema。

## 備註

- 對於原生 OpenClaw 外掛程式而言，宣告檔是**必要項目**，包括從本機檔案系統載入的情況。
- 執行時期仍會分別載入外掛程式模組；宣告檔僅用於
  探索與驗證。
- 原生宣告檔是以 JSON5 解析，因此只要最終值仍為物件，便接受註解、尾隨逗號和未加引號的鍵。
- 宣告檔載入器僅會讀取已記載的宣告檔欄位。請避免在此新增
  自訂的頂層鍵。
- `providerAuthEnvVars` 是用於 auth probes、env-marker
  驗證和類似 provider-auth 介面的低成本元資料路徑，這些介面不應僅為了檢查環境變數名稱就啟動外掛程式
  執行時期。
- `providerAuthAliases` 讓提供者變體能重複使用另一個提供者的 auth
  環境變數、auth 設定檔、config-backed auth 和 API 金鑰導入選項，
  而無需在核心中將該關係硬式編碼。
- `providerEndpoints` 讓提供者外掛程式能擁有簡單的端點 host/baseUrl
  比對元資料。僅將其用於核心已支援的端點類別；
  外掛程式仍擁有執行時期行為。
- `syntheticAuthRefs` 是用於提供者擁有的合成
  auth hooks 的低成本元資料路徑，這些 hooks 必須在執行時期
  registry 存在之前對冷模型探索可見。僅列出其執行時期提供者或 CLI 後端實際
  實作了 `resolveSyntheticAuth` 的參照。
- `nonSecretAuthMarkers` 是用於配套外掛程式擁有的
  預留位置 API 金鑰（例如 local、OAuth 或環境認證標記）的低成本元資料路徑。
  核心會將這些視為非機密資料以進行 auth 顯示和機密稽核，而無需
  將擁有提供者硬式編碼。
- `channelEnvVars` 是用於 shell-env 回退、設定提示和類似介面的輕量級元數據路徑，這些介面不應僅為了檢查環境變數名稱而啟動外掛執行時。
- `providerAuthChoices` 是用於驗證選擇器、`--auth-choice` 解析、首選提供者映射以及在提供者執行時載入之前的簡單入門 CLI 標誌註冊的輕量級元數據路徑。對於需要提供者程式碼的執行時嚮導元數據，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
- 互斥的外掛類型透過 `plugins.slots.*` 選取。
  - `kind: "memory"` 由 `plugins.slots.memory` 選取。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine`
    選取（預設：內建 `legacy`）。
- 當外掛不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的外掛依賴於原生模組，請記錄建置步驟以及任何套件管理器允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。

## 相關

- [Building Plugins](/zh-Hant/plugins/building-plugins) — 外掛入門
- [Plugin Architecture](/zh-Hant/plugins/architecture) — 內部架構
- [SDK Overview](/zh-Hant/plugins/sdk-overview) — 外掛 SDK 參考
