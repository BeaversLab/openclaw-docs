---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

關於相容的套件佈局，請參閱[外掛程式套件](/zh-Hant/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex bundle: `.codex-plugin/plugin.json`
- Claude bundle: `.claude-plugin/plugin.json` 或沒有清單的預設 Claude 元件佈局
- Cursor bundle: `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但它們不會根據此處描述的 `openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料以及宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值、Claude 套件 LSP 預設值，以及支援的掛鉤套件。

每個原生 OpenClaw 外掛程式**必須**在**外掛程式根目錄**中提供一個 `openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證設定，而**無需執行外掛程式碼**。遺失或無效的清單將被視為外掛程式錯誤，並會阻擋設定驗證。

請參閱完整的外掛程式系統指南：[外掛程式](/zh-Hant/tools/plugin)。
關於原生功能模型和目前的外部相容性指引：
[功能模型](/zh-Hant/plugins/architecture#public-capability-model)。

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
- 便宜的 QA runner 中繼資料，共用的 `openclaw qa` 主機可以在外掛程式執行時期載入之前進行檢查
- 應在無須載入執行時期的情況下合併到目錄和驗證介面的特定管道設定中繼資料
- 設定 UI 提示

請勿將其用於：

- 註冊執行時期行為
- 宣告程式碼進入點
- npm install 元資料

這些屬於您的外掛程式碼和 `package.json`。

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

| 欄位                                 | 必要 | 類型                             | 含義                                                                                                                                   |
| ------------------------------------ | ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 標準外掛程式 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                           |
| `configSchema`                       | 是   | `object`                         | 此外掛設定的內聯 JSON Schema。                                                                                                         |
| `enabledByDefault`                   | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。省略它，或將其設為任何非 `true` 的值，以使外掛程式預設保持停用狀態。                                   |
| `legacyPluginIds`                    | 否   | `string[]`                       | 正規化為此正式外掛 ID 的舊版 ID。                                                                                                      |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 當身份驗證、設定或模型參照提及這些提供者 ID 時，應自動啟用此外掛的提供者 ID。                                                          |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 宣告一個由 `plugins.slots.*` 使用的專用外掛類型。                                                                                      |
| `channels`                           | 否   | `string[]`                       | 由此外掛擁有的頻道 ID。用於探索與設定驗證。                                                                                            |
| `providers`                          | 否   | `string[]`                       | 由此外掛擁有的提供者 ID。                                                                                                              |
| `modelSupport`                       | 否   | `object`                         | 由清單擁有的簡寫模型家族元資料，用於在執行階段前自動載入外掛。                                                                         |
| `providerEndpoints`                  | 否   | `object[]`                       | 清單擁有的端點主機/baseUrl 元資料，用於核心必須在提供者執行時載入之前進行分類的提供者路由。                                            |
| `cliBackends`                        | 否   | `string[]`                       | 此外掛擁有的 CLI 推斷後端 ID。用於透過明確設定參照進行啟動時自動啟用。                                                                 |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供者或 CLI 後端參照，其外掛擁有的合成驗證掛勾應在執行時載入之前的冷模型探索期間進行探查。                                            |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 套件外掛擁有的預留位置 API 金鑰值，代表非機密的本機、OAuth 或環境認證狀態。                                                            |
| `commandAliases`                     | 否   | `object[]`                       | 此外掛擁有的指令名稱，應在執行時載入之前產生外掛感知的設定和 CLI 診斷。                                                                |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量型提供者驗證環境元資料。                                                                |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 應重複使用另一個提供者 ID 進行驗證查詢的提供者 ID，例如共用基底提供者 API 金鑰和驗證設定檔的編碼提供者。                               |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量型通道環境元資料。將其用於一般啟動/設定輔助程式應看見的環境驅動通道設定或驗證介面。     |
| `providerAuthChoices`                | 否   | `object[]`                       | 用於上架挑選器、首選提供者解析和簡單 CLI 旗標接線的輕量型驗證選擇元資料。                                                              |
| `activation`                         | 否   | `object`                         | 針對提供者、指令、頻道、路由和功能觸發載入的低成本啟用提示。僅為元數據；外掛執行時仍擁有實際行為。                                     |
| `setup`                              | 否   | `object`                         | 低成本設定/入門描述符，可供發現和設定介面檢查，無需載入外掛執行時。                                                                    |
| `qaRunners`                          | 否   | `object[]`                       | 由共享 `openclaw qa` 主機在載入外掛執行環境之前使用的低成本 QA 執行器描述子。                                                          |
| `contracts`                          | 否   | `object`                         | 用於外部驗證掛鉤、語音、即時轉錄、即時語音、媒體理解、圖像生成、音樂生成、視頻生成、網絡獲取、網絡搜索和工具所有權的靜態捆綁功能快照。 |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中宣告的提供者 ID 的低成本媒體理解預設值。                                                  |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在執行環境載入之前，合併到發現和驗證層的清單擁有的通道配置元數據。                                                                     |
| `skills`                             | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                                   |
| `name`                               | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                                   |
| `description`                        | 否   | `string`                         | 顯示於外掛介面的簡短摘要。                                                                                                             |
| `version`                            | 否   | `string`                         | 資訊性外掛版本。                                                                                                                       |
| `uiHints`                            | 否   | `Record<string, object>`         | 組態欄位的 UI 標籤、預留位置及敏感度提示。                                                                                             |

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。
OpenClaw 會在提供者執行時期載入前讀取此項目。

| 欄位                  | 必要 | 類型                                            | 含義                                                                |
| --------------------- | ---- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選項所屬的提供者 ID。                                             |
| `method`              | 是   | `string`                                        | 要分發到的驗證方法 ID。                                             |
| `choiceId`            | 是   | `string`                                        | 用於上架和 CLI 流程的穩定驗證選項 ID。                              |
| `choiceLabel`         | 否   | `string`                                        | 使用者面向的標籤。若省略，OpenClaw 將回退至 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短輔助說明文字。                                          |
| `assistantPriority`   | 否   | `number`                                        | 較低的值會在助理驅動的互動式選擇器中排序較前。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏此選項，但同時仍允許手動 CLI 選取。               |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選項 ID。                       |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                   |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者面向標籤。                                            |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短輔助說明文字。                                          |
| `optionKey`           | 否   | `string`                                        | 簡單單旗標驗證流程的內部選項鍵。                                    |
| `cliFlag`             | 否   | `string`                                        | CLI 標誌名稱，例如 `--openrouter-api-key`。                         |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。            |
| `cliDescription`      | 否   | `string`                                        | CLI 說明中使用的描述。                                              |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪些介面表面。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛程式擁有使用者可能錯誤地放在 `plugins.allow` 中或嘗試作為根 CLI 命令執行的執行時命令名稱時，請使用 `commandAliases`。OpenClaw 會使用此元資料進行診斷，而不需匯入外掛程式執行時程式碼。

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

| 欄位         | 必要 | 類型              | 含義                                                   |
| ------------ | ---- | ----------------- | ------------------------------------------------------ |
| `name`       | 是   | `string`          | 屬於此外掛程式的命令名稱。                             |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線命令，而不是根 CLI 命令。          |
| `cliCommand` | 否   | `string`          | 相關的根 CLI 命令，用於建議進行 CLI 操作（如果存在）。 |

## activation 參考

當外掛程式可以輕鬆宣告哪些控制平面事件應在之後啟動它時，請使用 `activation`。

## qaRunners 參考

當外掛程式在共用 `openclaw qa` 根目錄下貢獻一或多個傳輸執行器時，請使用 `qaRunners`。請保持此元資料輕量且靜態；外掛程式執行時仍然透過輕量級 `runtime-api.ts` 介面擁有實際的 CLI 註冊，該介面會匯出 `qaRunnerCliRegistrations`。

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
| `commandName` | 是   | `string` | 安裝在 `openclaw qa` 下的子命令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共用主機需要存根命令時使用的後援說明文字。     |

此區塊僅為元資料。它不註冊執行時期行為，也不會取代 `register(...)`、`setupEntry` 或其他執行時期/外掛程式進入點。
當前的消費者會在廣泛的外掛程式載入之前將其用作縮減提示，因此遺失啟用元資料通常只會造成效能損失；只要舊版清單所有權備援機制仍然存在，它應不會影響正確性。

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
| `onChannels`     | 否   | `string[]`                                           | 應啟用此外掛程式的頻道 ID。             |
| `onRoutes`       | 否   | `string[]`                                           | 應啟用此外掛程式的路由種類。            |
| `onCapabilities` | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 由控制平面啟用規劃使用的廣泛功能提示。  |

當前實際消費者：

- 指令觸發的 CLI 規劃會備援至舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 頻道觸發的設定/頻道規劃在缺少明確的頻道啟用元資料時，會備援至舊版 `channels[]`
  所有權
- 提供者觸發的設定/執行時期規劃在缺少明確的提供者啟用元資料時，會備援至舊版
  `providers[]` 和頂層 `cliBackends[]` 所有權

## 設定參考

當設定和介面需要在執行時期載入之前取得廉價的外掛程式擁有元資料時，請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推斷後端。`setup.cliBackends` 是控制平面/設定流程的特定設定描述表面，應保持僅含元資料。

當存在時，`setup.providers` 和 `setup.cliBackends` 是用於設置發現的首選以描述符為主的查找表面。如果描述符僅縮小候選外掛程式的範圍，並且設置仍然需要更豐富的設置時執行時掛鉤，請設定 `requiresRuntime: true` 並將 `setup-api` 保留作為後備執行路徑。

由於設置查找可以執行外掛程式擁有的 `setup-api` 代碼，因此標準化的 `setup.providers[].id` 和 `setup.cliBackends[]` 值必須在發現的外掛程式之間保持唯一。模棱兩可的所有權將失敗關閉，而不是從發現順序中選擇一個優勝者。

### setup.providers 參考

| 欄位          | 必要 | 類型       | 含義                                                            |
| ------------- | ---- | ---------- | --------------------------------------------------------------- |
| `id`          | 是   | `string`   | 在設置或載入期間公開的供應商 ID。請保持標準化 ID 的全域唯一性。 |
| `authMethods` | 否   | `string[]` | 此供應商在無需載入完整執行時的情況下支援的設置/驗證方法 ID。    |
| `envVars`     | 否   | `string[]` | 通用設置/狀態表面可以在外掛程式執行時載入之前檢查的環境變數。   |

### setup 欄位

| 欄位               | 必要 | 類型       | 含義                                                                      |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設置和載入期間公開的供應商設置描述符。                                  |
| `cliBackends`      | 否   | `string[]` | 用於以描述符為主的設置查找的設置時後端 ID。請保持標準化 ID 的全域唯一性。 |
| `configMigrations` | 否   | `string[]` | 由此外掛程式的設置表面擁有的組態遷移 ID。                                 |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之後，設置是否仍然需要 `setup-api` 執行。                     |

## uiHints 參考

`uiHints` 是從組態欄位名稱到小型渲染提示的映射。

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

| 欄位          | 類型       | 含義                             |
| ------------- | ---------- | -------------------------------- |
| `label`       | `string`   | 面向使用者的欄位標籤。           |
| `help`        | `string`   | 簡短的輔助文字。                 |
| `tags`        | `string[]` | 選用 UI 標籤。                   |
| `advanced`    | `boolean`  | 將該欄位標記為進階。             |
| `sensitive`   | `boolean`  | 將該欄位標記為秘密或敏感性資訊。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。         |

## 合約 參考資料

僅針對 OpenClaw 無需匯入外掛程式執行時間即可讀取的靜態功能擁有權中繼資料，使用 `contracts`。

```json
{
  "contracts": {
    "embeddedExtensionFactories": ["pi"],
    "externalAuthProviders": ["acme-ai"],
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

每個清單都是選用的：

| 欄位                             | 類型       | 含義                                               |
| -------------------------------- | ---------- | -------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | 套件外掛程式可為其註冊工廠的內建執行時間 ID。      |
| `externalAuthProviders`          | `string[]` | 此外掛程式擁有其外部驗證設定檔勾點的提供者 ID。    |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 ID。                    |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄 提供者 ID。               |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音 提供者 ID。               |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解 提供者 ID。               |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的影像生成 提供者 ID。               |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成 提供者 ID。               |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取 提供者 ID。               |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋 提供者 ID。               |
| `tools`                          | `string[]` | 此外掛程式擁有用於套件合約檢查的代理程式工具名稱。 |

實作 `resolveExternalAuthProfiles` 的提供者外掛程式應宣告 `contracts.externalAuthProviders`。未宣告的外掛程式仍會透過已棄用的相容性後援機制執行，但該後援機制速度較慢，且將在移轉期限後移除。

## mediaUnderstandingProviderMetadata 參考

當媒體理解提供者具有預設模型、自動驗證後援優先順序，或通用核心輔助程式在執行階段載入之前需要的原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。金鑰也必須在 `contracts.mediaUnderstandingProviders` 中宣告。

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
| `defaultModels`        | `Record<string, string>`            | 當設定未指定模型時使用的功能對模型預設值。         |
| `autoPriority`         | `Record<string, number>`            | 數字越小，在自動基於憑證的提供者後援中排序越靠前。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供者支援的原生文件輸入。                         |

## channelConfigs 參考

當通道外掛需要在執行階段載入之前取得輕量級設定元資料時，請使用 `channelConfigs`。

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

| 欄位          | 類型                     | 含義                                                             |
| ------------- | ------------------------ | ---------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON 結構描述。每個宣告的通道設定項目都需要。 |
| `uiHints`     | `Record<string, object>` | 該通道設定區段的可選 UI 標籤/預留位置/敏感性提示。               |
| `label`       | `string`                 | 當執行階段元資料未就緒時，合併至選擇器和檢查介面的通道標籤。     |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                               |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應超越的舊版或較低優先級外掛 ID。              |

## modelSupport 參考

當 OpenClaw 應該在執行階段載入之前，從 `gpt-5.4` 或 `claude-sonnet-4.6` 等簡寫模型 ID 推斷您的提供者外掛時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 會套用此優先順序：

- 明確的 `provider/model` 參照使用所屬 `providers` 清單元資料
- `modelPatterns` 優先於 `modelPrefixes`
- 如果一個非捆綁外掛和一個捆綁外掛都符合，則非捆綁外掛優先
- 剩餘的歧義將被忽略，直到使用者或設定指定了供應商

欄位：

| 欄位            | 類型       | 含義                                                |
| --------------- | ---------- | --------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 與簡寫模型 ID 匹配的前綴。        |
| `modelPatterns` | `string[]` | 移除設定檔後綴後，與簡寫模型 ID 匹配的 Regex 來源。 |

舊版頂層功能鍵已棄用。使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清單載入不再將這些頂層欄位視為功能擁有權。

## 清單與 package.

這兩個檔案有不同的用途：

| 檔案                   | 用途                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、設定驗證、授權選擇元資料，以及外掛程式碼執行前必須存在的 UI 提示               |
| `package.json`         | npm 元資料、相依性安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊 |

如果您不確定某段元資料應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它是關於打包、進入檔案或 npm 安裝行為，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

部分執行前外掛元資料特意位於 `package.json` 的 `openclaw` 區塊中，而不是 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 含義                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生插件進入點。必須保留在插件套件目錄內。                                                            |
| `openclaw.runtimeExtensions`                                      | 宣告已安裝套件的已建置 JavaScript 執行時進入點。必須保留在插件套件目錄內。                                |
| `openclaw.setupEntry`                                             | 輕量級僅設定進入點，用於上線手續、延遲通道啟動以及唯讀通道狀態/SecretRef 探索。必須保留在插件套件目錄內。 |
| `openclaw.runtimeSetupEntry`                                      | 宣告已安裝套件的已建置 JavaScript 設定進入點。必須保留在插件套件目錄內。                                  |
| `openclaw.channel`                                                | 輕量級通道目錄元數據，如標籤、文件路徑、別名和選擇複製。                                                  |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器元數據，可在不加載完整通道執行時的情況下回答「僅環境的設定是否已存在？」。            |
| `openclaw.channel.persistedAuthState`                             | 輕量級持久化驗證檢查器元數據，可在不加載完整通道執行時的情況下回答「是否已登入任何項目？」。              |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 套件和外部發佈插件的安裝/更新提示。                                                                       |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時的首選安裝路徑。                                                                    |
| `openclaw.install.minHostVersion`                                 | 最低支援的 OpenClaw 主機版本，使用像 `>=2026.3.22` 這樣的 semver 下限。                                   |
| `openclaw.install.expectedIntegrity`                              | 預期的 npm dist 完整性字串，例如 `sha512-...`；安裝和更新流程會根據此驗證取得的構件。                     |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當設定無效時，允許狹窄的套件插件重新安裝復原路徑。                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅設定的通道介面在啟動期間於完整通道插件之前載入。                                                      |

清單元數據決定在執行時載入之前，上線手續中會出現哪些提供者/通道/設定選項。`package.json#openclaw.install` 會告訴上線手續當使用者選擇其中一個選項時，如何取得或啟用該插件。請勿將安裝提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 在安裝和清單登錄庫載入期間會強制執行。無效的值會被拒絕；較新但有效的值會在較舊的主機上跳過此外掛程式。

精確的 npm 版本鎖定已存在於 `npmSpec` 中，例如 `"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。當您希望如果取得的 npm 成品不再符合鎖定的發行版本時，更新流程能失敗封閉，請將其與 `expectedIntegrity` 搭配使用。互動式入門提供受信任的登錄庫 npm 規格，包括裸套件名稱和發行版本標籤。當存在 `expectedIntegrity` 時，安裝/更新流程會強制執行它；當省略它時，會記錄登錄庫解析結果而不含完整性鎖定。

當狀態、通道清單或 SecretRef 掃描需要在不載入完整執行時間的情況下識別已設定的帳戶時，通道外掛程式應提供 `openclaw.setupEntry`。設定項目應公開通道中繼資料加上設定安全的設定、狀態和秘密配接器；將網路用戶端、閘道接聽程式和傳輸執行時間保留在主要擴充功能進入點中。

執行時間進入點欄位不會覆寫來源進入點欄位的套件邊界檢查。例如，`openclaw.runtimeExtensions` 無法使逸出的 `openclaw.extensions` 路徑可載入。

`openclaw.install.allowInvalidConfigRecovery` 是刻意狹隘的。它並不會讓任意損壞的設定可安裝。目前它僅允許安裝流程從特定的過時打包外掛程式升級失敗中恢復，例如遺漏的打包外掛程式路徑或該同一打包外掛程式的過時 `channels.<id>` 項目。不相關的設定錯誤仍會阻擋安裝，並將操作員導向 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微型檢查器模組的套件中繼資料：

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

當設定、醫生或設定狀態流程需要在完整通道外掛程式載入之前進行廉價的是/否驗證探測時，請使用它。目標匯出應該是一個僅讀取持久化狀態的小型函式；請勿將其路由透過完整的通道執行時間匯出集。

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

當頻道可以從環境變數或其他微小的非執行時輸入中回答配置狀態時使用。如果檢查需要完整的配置解析或真實的頻道執行時，請將該邏輯保留在插件 `config.hasConfiguredState` hook 中。

## 探索優先順序（重複的插件 ID）

OpenClaw 會從多個根目錄發現插件（打包、全域安裝、工作區、明確的配置選定路徑）。如果兩個發現結果共享同一個 `id`，則僅保留**優先順序最高**的 manifest；優先順序較低的副本會被捨棄，而不是與其並行載入。

優先順序，從高到低：

1. **配置選定** — 在 `plugins.entries.<id>` 中明確釘選的路徑
2. **打包** — 隨 OpenClaw 一起發布的插件
3. **全域安裝** — 安裝在全域 OpenClaw 插件根目錄中的插件
4. **工作區** — 相對於當前工作區發現的插件

影響：

- 位於工作區中的打包插件之分支或過時副本將不會覆蓋打包的組建版本。
- 若要實際用本地插件覆蓋打包插件，請透過 `plugins.entries.<id>` 釘選它，使其透過優先順序獲勝，而不是依賴工作區發現。
- 重複捨棄的操作會被記錄下來，以便 Doctor 和啟動診斷工具能指向被捨棄的副本。

## JSON Schema 需求

- **每個插件必須提供 JSON Schema**，即使它不接受任何配置。
- 空 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在配置讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非該頻道 ID 是由插件 manifest 宣告的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必須參照**可發現**的插件 ID。未知的 ID 是**錯誤**。
- 如果插件已安裝但其 manifest 或 schema 損壞或缺失，驗證將失敗，Doctor 將報告插件錯誤。
- 如果插件配置存在但插件已**停用**，則會保留該配置，並在 Doctor + 記錄中顯示**警告**。

請參閱[配置參考](/zh-Hant/gateway/configuration)以取得完整的 `plugins.*` schema。

## 註記

- 對於原生 OpenClaw 外掛程式，包括本地檔案系統載入，Manifest 是**必要**的。
- 執行時期仍然會單獨載入外掛程式模組；Manifest 僅用於
  探索與驗證。
- 原生 Manifest 是使用 JSON5 解析的，因此只要最終值仍為物件，
  註解、尾隨逗號和未加引號的鍵都是可接受的。
- Manifest 載入器僅會讀取已記錄的 Manifest 欄位。請避免在此
  新增自訂的最上層鍵。
- `providerAuthEnvVars` 是用於驗證探測、環境標記
  驗證，以及類似的提供者驗證介面的低成本元資料路徑，這些介面不應僅為了檢查環境變數名稱而啟動外掛程式
  執行時期。
- `providerAuthAliases` 允許提供者變體重複使用另一個提供者的驗證
  環境變數、驗證設定檔、設支援驗證，以及 API 金鑰導入選擇
  而無需在核心中硬編碼該關聯。
- `providerEndpoints` 允許提供者外掛程式擁有簡單的端點主機/BaseUrl
  匹配元資料。僅對核心已支援的端點類別使用它；
  外掛程式仍擁有執行時期行為。
- `syntheticAuthRefs` 是提供者擁有的合成
  驗證掛鉤的低成本元資料路徑，這些掛鉤必須在執行時期
  登錄存在之前，對冷模型探索可見。僅列出其執行時期提供者或 CLI 後端實際
  實作 `resolveSyntheticAuth` 的參照。
- `nonSecretAuthMarkers` 是隨附外掛程式擁有的
  佔位符 API 金鑰（例如 local、OAuth 或環境憑證標記）的低成本元資料路徑。
  核心會將這些視為非機密，用於驗證顯示和機密審計，而無需
  硬編碼擁有者提供者。
- `channelEnvVars` 是用於 shell-env 回退、設定
  提示，以及類似通道介面的低成本元資料路徑，這些介面不應僅為了檢查環境變數名稱而啟動外掛程式執行時期。環境變數名稱是元資料，本身
  並非啟動：狀態、審計、cron 傳遞驗證和其他唯讀
  介面在將環境變數視為已設定的通道之前，仍會套用外掛程式信任和有效啟動原則。
- `providerAuthChoices` 是 auth-choice 選擇器、`--auth-choice` 解析、首選提供者映射以及在提供者執行時載入之前的簡單入門 CLI 標誌註冊的廉價中繼資料路徑。對於需要提供者程式碼的執行時嚮導中繼資料，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
- 獨佔的插件種類是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選取的
    (預設：內建 `legacy`)。
- 當插件不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的插件依賴於原生模組，請記錄建置步驟和任何套件管理器允許清單要求 (例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。

## 相關

- [Building Plugins](/zh-Hant/plugins/building-plugins) — 開始使用插件
- [Plugin Architecture](/zh-Hant/plugins/architecture) — 內部架構
- [SDK Overview](/zh-Hant/plugins/sdk-overview) — Plugin SDK 參考
