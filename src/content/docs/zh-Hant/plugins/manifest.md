---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

若要了解相容的套件佈局，請參閱 [外掛程式套件](/zh-Hant/plugins/bundles)。

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
  "cliBackends": ["openrouter-cli"],
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

| 欄位                                | 必要 | 類型                             | 含義                                                                                                                                     |
| ----------------------------------- | ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | 是   | `string`                         | 正式的外掛 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                               |
| `configSchema`                      | 是   | `object`                         | 此外掛設定的內聯 JSON Schema。                                                                                                           |
| `enabledByDefault`                  | 否   | `true`                           | 將打包的外掛標記為預設啟用。省略它，或設定任何非 `true` 的值，以將外掛預設為停用狀態。                                                   |
| `legacyPluginIds`                   | 否   | `string[]`                       | 正規化為此正式外掛 ID 的舊版 ID。                                                                                                        |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 當身份驗證、設定或模型參照提及這些提供者 ID 時，應自動啟用此外掛的提供者 ID。                                                            |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的專屬外掛類型。                                                                                            |
| `channels`                          | 否   | `string[]`                       | 由此外掛擁有的頻道 ID。用於探索與設定驗證。                                                                                              |
| `providers`                         | 否   | `string[]`                       | 由此外掛擁有的提供者 ID。                                                                                                                |
| `modelSupport`                      | 否   | `object`                         | 由清單擁有的簡寫模型家族元資料，用於在執行階段前自動載入外掛。                                                                           |
| `cliBackends`                       | 否   | `string[]`                       | 由此外掛擁有的 CLI 推論後端 ID。用於從明確設定參照進行啟動時的自動啟用。                                                                 |
| `commandAliases`                    | 否   | `object[]`                       | 由此外掛擁有的指令名稱，應在執行階段載入前產生具有外掛感知能力的設定與 CLI 診斷資訊。                                                    |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 可在無需載入外掛程式碼的情況下檢查的低耗提供者驗證環境元資料。                                                                  |
| `providerAuthAliases`               | 否   | `Record<string, string>`         | 應該重複使用另一個提供者 ID 進行驗證查詢的提供者 ID，例如共用基礎提供者 API 金鑰和驗證設定檔的編碼提供者。                               |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | OpenClaw 可以在無需載入外掛程式碼的情況下檢查的輕量頻道環境元數據。將此用於環境驅動的頻道設定或通用啟動/設定輔助工具應該看到的驗證介面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用於上手選擇器、首選提供者解析和簡單 CLI 旗標接線的輕量驗證選擇元數據。                                                                  |
| `activation`                        | 否   | `object`                         | 用於提供者、指令、頻道、路由和功能觸發載入的輕量啟用提示。僅為元數據；外掛執行階段仍擁有實際行為。                                       |
| `setup`                             | 否   | `object`                         | 探索和設定介面可以在無需載入外掛執行階段的情況下檢查的輕量設定/上手描述符。                                                              |
| `qaRunners`                         | 否   | `object[]`                       | 由共用的 `openclaw qa` 主機在外掛執行階段載入之前使用的輕量 QA 執行器描述符。                                                            |
| `contracts`                         | 否   | `object`                         | 針對語音、即時轉錄、即時語音、媒體理解、影像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具所有權的靜態套件功能快照。                 |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 在執行階段載入之前合併到探索和驗證介面的清單擁有頻道設定元數據。                                                                         |
| `skills`                            | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                                     |
| `name`                              | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                                     |
| `description`                       | 否   | `string`                         | 顯示在外掛介面上的簡短摘要。                                                                                                             |
| `version`                           | 否   | `string`                         | 資訊性外掛版本。                                                                                                                         |
| `uiHints`                           | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、預留位置和敏感性提示。                                                                                               |

## providerAuthChoices 參考

每個 `providerAuthChoices` 條目描述一個上架或驗證選項。
OpenClaw 會在提供者運行時載入之前讀取此內容。

| 欄位                  | 必要 | 類型                                            | 含義                                                                    |
| --------------------- | ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選項所屬的提供者 ID。                                                 |
| `method`              | 是   | `string`                                        | 要分派到的驗證方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                        | 用於上架和 CLI 流程的穩定驗證選項 ID。                                  |
| `choiceLabel`         | 否   | `string`                                        | 使用者可見的標籤。如果省略，OpenClaw 將回退使用 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短輔助說明文字。                                              |
| `assistantPriority`   | 否   | `number`                                        | 數值越低，在助理驅動的互動式選擇器中排序越前面。                        |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏此選項，但同時允許透過 CLI 手動選取。                 |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選項 ID。                           |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                       |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者可見標籤。                                                |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短輔助說明文字。                                              |
| `optionKey`           | 否   | `string`                                        | 用於簡單單一旗標驗證流程的內部選項鍵。                                  |
| `cliFlag`             | 否   | `string`                                        | CLI 旗標名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否   | `string`                                        | 用於 CLI 說明的描述。                                                   |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪些上線介面中。如果省略，則預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有使用者可能誤放在 `plugins.allow` 中或嘗試作為根 CLI 指令執行的執行時指令名稱時，請使用 `commandAliases`。OpenClaw 使用此元資料進行診斷，而不會匯入外掛執行時代碼。

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

| 欄位         | 必要 | 類型              | 含義                                             |
| ------------ | ---- | ----------------- | ------------------------------------------------ |
| `name`       | 是   | `string`          | 屬於此外掛的指令名稱。                           |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而不是根 CLI 指令。    |
| `cliCommand` | 否   | `string`          | 建議用於 CLI 操作的相關根 CLI 指令（如果存在）。 |

## activation 參考

當外掛可以輕鬆宣告哪些控制平面事件應稍後啟動它時，請使用 `activation`。

## qaRunners 參考

當外掛在共享的 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。請保持此元資料輕量且靜態；外掛執行時仍透過輕量級的 `runtime-api.ts` 介面擁有實際的 CLI 註冊，該介面匯出 `qaRunnerCliRegistrations`。

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

此區塊僅為元資料。它不註冊執行時行為，也不取代 `register(...)`、`setupEntry` 或其他執行時/外掛進入點。目前的消費者將其作為更廣泛外掛載入前的縮小提示使用，因此遺失啟動元資料通常只會損失效能；在舊版清單所有權回退機制仍然存在時，這不應影響正確性。

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

| 欄位             | 必要 | 類型                                                 | 含義                                 |
| ---------------- | ---- | ---------------------------------------------------- | ------------------------------------ |
| `onProviders`    | 否   | `string[]`                                           | 被請求時應啟用此外掛的提供者 ID。    |
| `onCommands`     | 否   | `string[]`                                           | 應啟用此外掛的指令 ID。              |
| `onChannels`     | 否   | `string[]`                                           | 應啟用此外掛的頻道 ID。              |
| `onRoutes`       | 否   | `string[]`                                           | 應啟用此外掛的路由種類。             |
| `onCapabilities` | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面啟用規劃使用的廣泛功能提示。 |

當前活躍的消費者：

- 指令觸發的 CLI 規劃會回退到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 當缺少明確的頻道啟用元數據時，頻道觸發的設定/頻道規劃會回退到舊版 `channels[]`
  所有權
- 當缺少明確的提供者啟用元數據時，提供者觸發的設定/執行時規劃會回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有權

## 設定參考

當設定和上手介面需要在執行時載入之前獲取低成本的插件擁有元數據時，
請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推理
後端。`setup.cliBackends` 是控制平面/設定流程的
特定設定描述元層，應保持僅含元數據。

當存在時，`setup.providers` 和 `setup.cliBackends` 是設定探索的
首選描述元優先查詢層。如果描述元僅縮小候選插件範圍，而設定仍然需要
更豐富的設定時執行時掛鉤，請設定 `requiresRuntime: true` 並保留 `setup-api` 作為
後備執行路徑。

由於設定查詢可以執行插件擁有的 `setup-api` 代碼，正規化的
`setup.providers[].id` 和 `setup.cliBackends[]` 值必須在所有
已發現的插件中保持唯一。所有權不明確時會失敗關閉，而不是從探索順序中選擇
一個獲勝者。

### setup.providers 參考

| 欄位          | 必填 | 類型       | 代表意義                                                         |
| ------------- | ---- | ---------- | ---------------------------------------------------------------- |
| `id`          | 是   | `string`   | 在設定或入門期間公開的提供者 ID。請保持標準化的 ID 全域唯一。    |
| `authMethods` | 否   | `string[]` | 此提供者在無需載入完整執行時期的情況下所支援的設定/驗證方法 ID。 |
| `envVars`     | 否   | `string[]` | 通用設定/狀態介面可在插件執行時期載入前檢查的環境變數。          |

### setup 欄位

| 欄位               | 必要 | 類型       | 代表意義                                                            |
| ------------------ | ---- | ---------- | ------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設定和入門期間公開的提供者設定描述元。                            |
| `cliBackends`      | 否   | `string[]` | 用於描述優先設定查詢的設定時期後端 ID。請保持標準化的 ID 全域唯一。 |
| `configMigrations` | 否   | `string[]` | 由此插件的設定介面所擁有的設定遷移 ID。                             |
| `requiresRuntime`  | 否   | `boolean`  | 在查詢描述元後，設定是否仍需執行 `setup-api`。                      |

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

| 欄位          | 類型       | 代表意義                 |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向使用者的欄位標籤。   |
| `help`        | `string`   | 簡短說明文字。           |
| `tags`        | `string[]` | 選用 UI 標籤。           |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅對 OpenClaw 可在無需匯入插件執行時期的情況下讀取的靜態功能擁有權中繼資料使用 `contracts`。

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

每個清單都是選用的：

| 欄位                             | 類型       | 代表意義                                   |
| -------------------------------- | ---------- | ------------------------------------------ |
| `speechProviders`                | `string[]` | 此插件擁有的語音提供者 ID。                |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式所擁有的即時轉錄提供者 ID。      |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式所擁有的即時語音提供者 ID。      |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式所擁有的媒體理解提供者 ID。      |
| `imageGenerationProviders`       | `string[]` | 此外掛程式所擁有的圖像生成提供者 ID。      |
| `videoGenerationProviders`       | `string[]` | 此外掛程式所擁有的影片生成提供者 ID。      |
| `webFetchProviders`              | `string[]` | 此外掛程式所擁有的網頁擷取提供者 ID。      |
| `webSearchProviders`             | `string[]` | 此外掛程式所擁有的網頁搜尋提供者 ID。      |
| `tools`                          | `string[]` | 此外掛程式用於綑綁合約檢查的代理工具名稱。 |

## channelConfigs 參考

當頻道外掛程式在執行時間載入之前需要廉價的設定元資料時，請使用 `channelConfigs`。

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

每個頻道條目可以包含：

| 欄位          | 類型                     | 含義                                                                   |
| ------------- | ------------------------ | ---------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。對於每個宣告的頻道設定條目都是必需的。 |
| `uiHints`     | `Record<string, object>` | 該頻道設定區段的可選 UI 標籤/佔位符/敏感提示。                         |
| `label`       | `string`                 | 當執行時間元資料尚未準備好時，合併到選擇器和檢查介面中的頻道標籤。     |
| `description` | `string`                 | 用於檢查和目錄介面的簡短頻道描述。                                     |
| `preferOver`  | `string[]`               | 此頻道在選擇介面中應優先於的舊版或低優先級外掛程式 ID。                |

## modelSupport 參考

當 OpenClaw 應該在此外掛執行時間載入之前，從簡寫模型 ID（如 `gpt-5.4` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用此優先順序：

- 明確的 `provider/model` 參照使用所屬 `providers` 清單元數據
- `modelPatterns` 優先於 `modelPrefixes`
- 如果一個非捆綁外掛和一個捆綁外掛都匹配，則非捆綁外掛優先
- 剩餘的歧義將被忽略，直到用戶或配置指定提供者

欄位：

| 欄位            | 類型       | 含義                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 與簡寫模型 ID 匹配的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，與簡寫模型 ID 匹配的 Regex 來源。 |

舊版頂層功能鍵已被棄用。請使用 `openclaw doctor --fix` 將
`speechProviders`、`realtimeTranscriptionProviders`、
`realtimeVoiceProviders`、`mediaUnderstandingProviders`、
`imageGenerationProviders`、`videoGenerationProviders`、
`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常
的清單載入不再將這些頂層欄位視為功能擁有權。

## 清單與 package.

這兩個檔案有不同的用途：

| 檔案                   | 用途                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 探索、配置驗證、身份驗證選擇元數據，以及外掛程式碼運行前必須存在的 UI 提示         |
| `package.json`         | npm 元數據、依賴安裝，以及用於進入點、安裝閘道、設定或目錄元數據的 `openclaw` 區塊 |

如果您不確定某段元數據應放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它與打包、進入檔案或 npm 安裝行為有關，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

部分執行時期前的外掛元數據有意地駐留在 `package.json` 的
`openclaw` 區塊中，而不是 `openclaw.plugin.json`。

重要範例：

| 欄位                                                              | 含義                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `openclaw.extensions`                                             | 宣告原生外掛進入點。                                                                             |
| `openclaw.setupEntry`                                             | 輕量級僅用於設定的進入點，用於入門導覽和延遲通道啟動。                                           |
| `openclaw.channel`                                                | 廉價的通道目錄元數據，例如標籤、文件路徑、別名和選擇文案。                                       |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器元數據，可在不加載完整通道運行時的情況下回答「僅環境設定是否已存在？」。     |
| `openclaw.channel.persistedAuthState`                             | 輕量級持久化身分驗證檢查器元數據，可在不加載完整通道運行時的情況下回答「是否已登入任何項目？」。 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 針對套件和外部發布外掛的安裝/更新提示。                                                          |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時的首選安裝路徑。                                                           |
| `openclaw.install.minHostVersion`                                 | 支援的最低 OpenClaw 主機版本，使用像 `>=2026.3.22` 這樣的 semver 下限。                          |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當配置無效時，允許狹窄的套件外掛重新安裝恢復路徑。                                               |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅用於設定的通道介面在啟動期間於完整通道外掛之前加載。                                         |

`openclaw.install.minHostVersion` 在安裝和清單註冊表加載期間強制執行。無效值會被拒絕；較新但有效的值會在舊主機上跳過該外掛。

`openclaw.install.allowInvalidConfigRecovery` 故意設計得很狹隘。它不會使任意損壞的配置可安裝。目前它僅允許安裝流程從特定的陳舊套件外掛升級失敗中恢復，例如缺少套件外掛路徑或同一套件外掛的過時 `channels.<id>` 條目。不相關的配置錯誤仍會阻止安裝並將操作員引導至 `openclaw doctor --fix`。

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

當設定、診斷或設定狀態流程需要在完整通道外掛加載之前進行廉價的是/否身分驗證探測時，請使用它。目標匯出應該是一個僅讀取持久化狀態的小型函數；請勿將其通過完整通道運行時桶進行路由。

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

當通道可以從環境變數或其他微小的非執行時輸入來回答已配置狀態時使用它。如果檢查需要完整的設定解析或真實的通道執行時，請將該邏輯保留在插件 `config.hasConfiguredState` hook 中。

## JSON Schema 要求

- **每個插件都必須附帶 JSON Schema**，即使它不接受任何設定。
- 空的 schema 是可以接受的（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 會在設定讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非通道 id 是由插件清單聲明的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可發現的**插件 id。未知的 id 是**錯誤**。
- 如果安裝了插件但其清單或 schema 損壞或遺失，
  驗證將失敗，Doctor 會報告插件錯誤。
- 如果插件設定存在但插件已**停用**，設定會被保留，
  並且在 Doctor + 日誌中會顯示**警告**。

有關完整的 `plugins.*` schema，請參閱 [設定參考](/zh-Hant/gateway/configuration)。

## 注意事項

- 清單對於**原生 OpenClaw 插件**是**必需的**，包括本地檔案系統載入。
- 執行時仍會單獨載入插件模組；清單僅用於
  發現 + 驗證。
- 原生清單使用 JSON5 解析，因此只要最終值仍然是物件，就接受註解、尾隨逗號和
  未加引號的鍵。
- 清單載入器僅讀取已記錄的清單欄位。避免在此處添加
  自訂的頂層鍵。
- `providerAuthEnvVars` 是用於授權探測、環境標記驗證和類似供應商授權層面的低成本元數據路徑，這些不應僅為了檢查環境變數名稱而啟動插件執行時。
- `providerAuthAliases` 允許供應商變體重複使用另一個供應商的授權環境變數、授權設定檔、支援設定的授權以及 API 金鑰導入選擇，而無需在核心中硬編碼該關係。
- `channelEnvVars` 是用於 shell 環境回退、設定提示和類似通道層面的低成本元數據路徑，這些不應僅為了檢查環境變數名稱而啟動插件執行時。
- `providerAuthChoices` 是 auth-choice 選擇器、
  `--auth-choice` 解析、首選提供者映射，以及簡單的入門
  CLI 標誌註冊的低成本元數據路徑，在提供者執行時載入之前。對於需要提供者代碼的執行時嚮導
  元數據，請參閱
  [Provider runtime hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件種類是透過 `plugins.slots.*` 選擇的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選擇的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine`
    選擇的（預設：內建 `legacy`）。
- 當插件不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的插件依賴於原生模塊，請記錄構建步驟和任何
  套件管理器允許清單要求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相關

- [Building Plugins](/zh-Hant/plugins/building-plugins) — 插件入門
- [Plugin Architecture](/zh-Hant/plugins/architecture) — 內部架構
- [SDK Overview](/zh-Hant/plugins/sdk-overview) — 插件 SDK 參考
