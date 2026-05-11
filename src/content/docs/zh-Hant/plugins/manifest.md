---
summary: "外掛程式清單 + JSON 結構描述需求（嚴格配置驗證）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

關於相容的套件佈局，請參閱 [外掛程式套件](/zh-Hant/plugins/bundles)。

相容的套件格式會使用不同的清單檔案：

- Codex 套件：`.codex-plugin/plugin.json`
- Claude 套件：`.claude-plugin/plugin.json` 或不含清單的預設 Claude 元件佈局
- Cursor 套件：`.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但不會根據此處描述的 `openclaw.plugin.json` 結構描述進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料、已宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值、Claude 套件 LSP 預設值，以及支援的 hook 套件。

每個原生 OpenClaw 外掛程式 **必須** 在 **外掛程式根目錄** 中提供 `openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證配置，**而無需執行外掛程式碼**。遺失或無效的清單將被視為外掛程式錯誤，並會阻擋配置驗證。

請參閱完整的外掛程式系統指南：[外掛程式](/zh-Hant/tools/plugin)。
關於原生功能模型與目前的外部相容性指引：[功能模型](/zh-Hant/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在 **載入外掛程式碼之前** 讀取的中繼資料。以下所有內容必須能夠在不啟動外掛程式執行時期的情況下輕鬆檢查。

**將其用於：**

- 外掛程式身分識別、配置驗證以及配置 UI 提示
- 驗證、上線及設定中繼資料（別名、自動啟用、提供者環境變數、驗證選項）
- 控制平面介面的啟用提示
- 簡寫模型家族擁有權
- 靜態功能擁有權快照（`contracts`）
- 共用 `openclaw qa` 主機可檢查的 QA 執行器中繼資料
- 合併至目錄與驗證介面的特定頻道配置中繼資料

**請勿用於：** 註冊執行時行為、宣告程式碼進入點或 npm install 元資料。這些應屬於您的外掛程式碼和 `package.json`。

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

| 欄位                                 | 必要 | 類型                             | 含義                                                                                                                                                              |
| ------------------------------------ | ---- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | 是   | `string`                         | 外掛的標準 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                                                        |
| `configSchema`                       | 是   | `object`                         | 此外掛設定內嵌的 JSON Schema。                                                                                                                                    |
| `enabledByDefault`                   | 否   | `true`                           | 將打包的外掛標記為預設啟用。省略此欄位或設為任何非 `true` 的值，可讓外掛保持預設停用。                                                                            |
| `legacyPluginIds`                    | 否   | `string[]`                       | 會正規化為此標準外掛 ID 的舊版 ID。                                                                                                                               |
| `autoEnableWhenConfiguredProviders`  | 否   | `string[]`                       | 當驗證、設定或模型參考提及這些提供者 ID 時，應自動啟此外掛。                                                                                                      |
| `kind`                               | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的獨佔外掛類型。                                                                                                                     |
| `channels`                           | 否   | `string[]`                       | 此外掛擁有的頻道 ID。用於探索與設定驗證。                                                                                                                         |
| `providers`                          | 否   | `string[]`                       | 此外掛擁有的提供者 ID。                                                                                                                                           |
| `providerDiscoveryEntry`             | 否   | `string`                         | 輕量級提供者探索模組路徑，相對於外掛根目錄，用於可在不啟動完整外掛執行時的情況下載入的清單範圍提供者目錄元資料。                                                  |
| `modelSupport`                       | 否   | `object`                         | 清單擁有的簡寫模型家族元資料，用於在執行前自動載入外掛。                                                                                                          |
| `modelCatalog`                       | 否   | `object`                         | 此外掛擁有的提供者的宣告式模型目錄元資料。這是未來唯讀列表、上架、模型選擇器、別名和抑制功能的控制平面合約，無需載入外掛執行時。                                  |
| `modelPricing`                       | 否   | `object`                         | 提供商擁有的外部定價查找策略。使用它可以讓本地/自託管提供商選擇退出遠程定價目錄，或將提供商引用映射到 OpenRouter/LiteLLM 目錄 ID，而無需在核心中硬編碼提供商 ID。 |
| `modelIdNormalization`               | 否   | `object`                         | 提供商擁有的模型 ID 別名/前綴清理，必須在提供商運行時加載之前運行。                                                                                               |
| `providerEndpoints`                  | 否   | `object[]`                       | 清單擁有的端點主機/baseUrl 元數據，用於核心必須在提供商運行時加載之前進行分類的提供商路由。                                                                       |
| `providerRequest`                    | 否   | `object`                         | 通用請求策略在提供商運行時加載之前使用的低成本提供商系列和請求兼容性元數據。                                                                                      |
| `cliBackends`                        | 否   | `string[]`                       | 此外掛擁有的 CLI 推理後端 ID。用於從顯式配置引用進行啟動自動激活。                                                                                                |
| `syntheticAuthRefs`                  | 否   | `string[]`                       | 提供商或 CLI 後端引用，其外掛擁有的合成身份驗證掛鈎應在運行時加載之前的冷模型發現期間進行探測。                                                                   |
| `nonSecretAuthMarkers`               | 否   | `string[]`                       | 綑綁外掛擁有的佔位符 API 金鑰值，代表非機密的本地、OAuth 或環境憑證狀態。                                                                                         |
| `commandAliases`                     | 否   | `object[]`                       | 此外掛擁有的命令名稱，應在運行時加載之前產生外掛感知的配置和 CLI 診斷。                                                                                           |
| `providerAuthEnvVars`                | 否   | `Record<string, string[]>`       | 用於提供商身份驗證/狀態查找的已棄用兼容性環境元數據。對於新外掛，建議使用 `setup.providers[].envVars`；OpenClaw 在棄用期限內仍會讀取此元數據。                    |
| `providerAuthAliases`                | 否   | `Record<string, string>`         | 應重用另一個提供商 ID 進行身份驗證查找的提供商 ID，例如共享基礎提供商 API 金鑰和身份驗證配置文件的編碼提供商。                                                    |
| `channelEnvVars`                     | 否   | `Record<string, string[]>`       | OpenClaw 可在無需載入外掛程式碼的情況下檢查的低成本通道環境元資料。將其用於通用啟動/配置輔助工具應能看到的環境驅動通道設定或驗證介面。                            |
| `providerAuthChoices`                | 否   | `object[]`                       | 用於上架選擇器、首選提供者解析以及簡單 CLI 標誌接線的低成本驗證選擇元資料。                                                                                       |
| `activation`                         | 否   | `object`                         | 用於提供者、指令、通道、路由和功能觸發載入的低成本啟動規劃器元資料。僅包含元資料；外掛程式執行時仍擁有實際行為。                                                  |
| `setup`                              | 否   | `object`                         | 探索和設定介面可在無需載入外掛程式執行時的情況下檢查的低成本設定/上架描述元。                                                                                     |
| `qaRunners`                          | 否   | `object[]`                       | 在外掛程式執行時載入之前，由共用 `openclaw qa` 主機使用的低成本 QA 執行器描述元。                                                                                 |
| `contracts`                          | 否   | `object`                         | 用於外部驗證掛勾、語音、即時轉錄、即時語音、媒體理解、圖像生成、音樂生成、視訊生成、網頁擷取、網頁搜尋和工具所有權的靜態打包功能快照。                            |
| `mediaUnderstandingProviderMetadata` | 否   | `Record<string, object>`         | 在 `contracts.mediaUnderstandingProviders` 中宣告的提供者 ID 的低成本媒體理解預設值。                                                                             |
| `channelConfigs`                     | 否   | `Record<string, object>`         | 在執行時載入之前合併到探索和驗證介面的清單擁有通道配置元資料。                                                                                                    |
| `skills`                             | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛程式根目錄。                                                                                                                          |
| `name`                               | 否   | `string`                         | 人類可讀的外掛程式名稱。                                                                                                                                          |
| `description`                        | 否   | `string`                         | 顯示在外掛程式介面中的簡短摘要。                                                                                                                                  |
| `version`                            | 否   | `string`                         | 資訊性的外掛程式版本。                                                                                                                                            |
| `uiHints`                            | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、佔位符與敏感性提示。                                                                                                                          |

## providerAuthChoices 參考資料

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。
OpenClaw 會在提供者執行時期載入前讀取此內容。
提供者設定清單會使用這些清單選項、衍生自描述元的設定
選項，以及安裝目錄中繼資料，而不需載入提供者執行時期。

| 欄位                  | 必要 | 類型                                            | 說明                                                                  |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選項所屬的提供者 ID。                                               |
| `method`              | 是   | `string`                                        | 要分派給的驗證方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 上架與 CLI 流程使用的穩定驗證選項 ID。                                |
| `choiceLabel`         | 否   | `string`                                        | 使用者可見的標籤。若省略，OpenClaw 將回退至 `choiceId`。              |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短輔助文字。                                                |
| `assistantPriority`   | 否   | `number`                                        | 數值較低者會在助理驅動的互動式選擇器中排序較前。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 從助理選擇器中隱藏此選項，同時仍允許手動 CLI 選擇。                   |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此替代選項的舊版選項 ID。                         |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分群的可選群組 ID。                                     |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者可見標籤。                                              |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短輔助文字。                                                |
| `optionKey`           | 否   | `string`                                        | 簡易單一旗標驗證流程的內部選項鍵。                                    |
| `cliFlag`             | 否   | `string`                                        | CLI 旗標名稱，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                        | CLI 說明中使用的描述。                                                |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在何種入門介面中。如果省略，預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛擁有一個使用者可能會錯誤地放入 `plugins.allow` 或嘗試作為根 CLI 指令執行的執行時指令名稱時，請使用 `commandAliases`。OpenClaw 使用此元資料進行診斷，而不需匯入外掛執行時程式碼。

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

| 欄位         | 必要 | 類型              | 含義                                                 |
| ------------ | ---- | ----------------- | ---------------------------------------------------- |
| `name`       | 是   | `string`          | 屬於此外掛的指令名稱。                               |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而非根 CLI 指令。          |
| `cliCommand` | 否   | `string`          | 相關的根 CLI 指令，以建議用於 CLI 操作（如果存在）。 |

## activation 參考

當外掛能輕鬆宣告哪些控制平面事件應將其包含在啟用/載入計畫中時，請使用 `activation`。

此區塊是規劃器元資料，而非生命週期 API。它不註冊執行時行為，不取代 `register(...)`，也不保證外掛程式碼已經執行。啟用規劃器會在回退到現有清單所有權元資料（如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和 hooks）之前，使用這些欄位來縮小候選外掛的範圍。

優先使用已描述所有權的最窄中繼資料。當這些欄位表達關聯性時，請使用
`providers`、`channels`、`commandAliases`、設定描述器或 `contracts`。
對於無法由那些所有權欄位表示的額外規劃器提示，請使用 `activation`。
對於 CLI 執行時期別名，例如 `claude-cli`、
`codex-cli` 或 `google-gemini-cli`，請使用頂層 `cliBackends`；
`activation.onAgentHarnesses` 僅適用於尚未具有所有權欄位的嵌入式代理程式馬具 ID。

此區塊僅為中繼資料。它不註冊執行時期行為，也不取代
`register(...)`、`setupEntry` 或其他執行時期/外掛程式進入點。
目前的消費者會在更廣泛的外掛程式載入之前，將其作為縮小範圍的提示使用，
因此遺失啟用中繼資料通常只會損失效能；只要傳統清單所有權後援機制仍然存在，
就不應影響正確性。

```json
{
  "activation": {
    "onProviders": ["openai"],
    "onCommands": ["models"],
    "onChannels": ["web"],
    "onRoutes": ["gateway-webhook"],
    "onConfigPaths": ["browser"],
    "onCapabilities": ["provider", "tool"]
  }
}
```

| 欄位               | 必要 | 類型                                                 | 含義                                                                                                            |
| ------------------ | ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `onProviders`      | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的提供者 ID。                                                                  |
| `onAgentHarnesses` | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的嵌入式代理程式馬具執行時期 ID。對於 CLI 後端別名，請使用頂層 `cliBackends`。 |
| `onCommands`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的指令 ID。                                                                    |
| `onChannels`       | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的頻道 ID。                                                                    |
| `onRoutes`         | 否   | `string[]`                                           | 應在啟用/載入計畫中包含此外掛程式的路由種類。                                                                   |
| `onConfigPaths`    | 否   | `string[]`                                           | 當路徑存在且未明確停用時，應在啟動/載入計畫中包含此外掛程式的根相對設定路徑。                                   |
| `onCapabilities`   | 否   | `Array<"provider" \| "channel" \| "tool" \| "hook">` | 控制平面啟動規劃使用的廣泛功能提示。盡可能使用更窄的欄位。                                                      |

目前的活躍消費者：

- 指令觸發的 CLI 規劃會回退到舊版
  `commandAliases[].cliCommand` 或 `commandAliases[].name`
- 代理運行時啟動規劃對嵌入式配接器使用 `activation.onAgentHarnesses`，對 CLI 運行時別名使用頂層 `cliBackends[]`
- 通道觸發的設定/通道規劃會在缺少明確的通道啟動元資料時回退到舊版 `channels[]`
  所有权
- 啟動外掛程式規劃對非通道根配置表面（例如隨附的瀏覽器外掛程式的 `browser` 區塊）使用 `activation.onConfigPaths`
- 提供者觸發的設定/運行時規劃會在缺少明確的提供者啟動元資料時回退到舊版
  `providers[]` 和頂層 `cliBackends[]` 所有权

規劃器診斷可以區分明確的啟動提示與清單所有权回退。例如，`activation-command-hint` 表示
`activation.onCommands` 匹配，而 `manifest-command-alias` 表示規劃器改用了 `commandAliases` 所有权。這些原因標籤是用於主機診斷和測試的；外掛程式作者應繼續聲明最能描述所有权的元資料。

## qaRunners 參考

當外掛程式在共享 `openclaw qa` 根目錄下提供一或多個傳輸執行器時，請使用 `qaRunners`。保持此元資料輕量且靜態；外掛程式運行時仍擁有通過輕量級 `runtime-api.ts` 表面進行的實際 CLI 註冊，該表面匯出 `qaRunnerCliRegistrations`。

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
| `commandName` | 是   | `string` | 安裝在 `openclaw qa` 下的子指令，例如 `matrix`。 |
| `description` | 否   | `string` | 當共享主機需要存根指令時使用的回退說明文字。     |

## setup 參考

當設定和入職介面需要在執行時期載入之前取得廉價的外掛程式擁有的中繼資料時，請使用 `setup`。

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

頂層 `cliBackends` 保持有效，並繼續描述 CLI 推斷後端。`setup.cliBackends` 是專屬於設定的描述子介面，用於應保持僅含中繼資料的管理平面/設定流程。

當存在時，`setup.providers` 和 `setup.cliBackends` 是用於設定探索的優先描述子優先查詢介面。如果描述子僅縮小了候選外掛程式的範圍，且設定仍需要更豐富的設定時期執行時期掛鉤，請設定 `requiresRuntime: true` 並保留 `setup-api` 作為後援執行路徑。

OpenClaw 也在一般提供者驗證和環境變數查詢中包含 `setup.providers[].envVars`。`providerAuthEnvVars` 在淘汰期間透過相容性配接器保持支援，但仍使用它的非打包外掛程式會收到清單診斷訊息。新外掛程式應將設定/狀態環境中繼資料放在 `setup.providers[].envVars` 上。

當沒有可用的設定項目，或當 `setup.requiresRuntime: false` 宣告設定執行時期不必要時，OpenClaw 也可以從 `setup.providers[].authMethods` 推導簡單的設定選擇。對於自訂標籤、CLI 旗標、入職範圍和助理中繼資料，明確的 `providerAuthChoices` 項目仍是首選。

僅當那些描述子足以滿足設定介面時，才設定 `requiresRuntime: false`。OpenClaw 將明確的 `false` 視為僅含描述子的合約，並且不會執行 `setup-api` 或 `openclaw.setupEntry` 進行設定查詢。如果僅含描述子的外掛程式仍隨附其中一個設定執行時期項目，OpenClaw 會回報附加診斷並繼續忽略它。省略 `requiresRuntime` 可保留舊版後援行為，因此新增描述子但未新增該旗標的現有外掛程式不會中斷。

因為設置查找可以執行外掛擁有的 `setup-api` 代碼，標準化的
`setup.providers[].id` 和 `setup.cliBackends[]` 值必須在所有發現的外掛中保持唯一。
擁有權不明確時將會失敗（封閉式處理），而不是按照發現順序選擇一個勝出者。

當設置運行時確實執行時，如果 `setup-api` 註冊了清單描述符未聲明的提供者或 CLI 後端，或者描述符沒有匹配的運行時註冊，設置註冊表診斷將報告描述符偏差。這些診斷是累加的，不會拒絕舊版外掛。

### setup.providers 參考

| 欄位          | 必要 | 類型       | 含義                                                              |
| ------------- | ---- | ---------- | ----------------------------------------------------------------- |
| `id`          | 是   | `string`   | 在設置或引導過程中公開的提供者 ID。請保持標準化 ID 的全域唯一性。 |
| `authMethods` | 否   | `string[]` | 此提供者無需加載完整運行時即支援的設置/身份驗證方法 ID。          |
| `envVars`     | 否   | `string[]` | 通用設置/狀態介面可以在外掛運行時加載之前檢查的環境變數。         |

### setup 欄位

| 欄位               | 必要 | 類型       | 含義                                                                  |
| ------------------ | ---- | ---------- | --------------------------------------------------------------------- |
| `providers`        | 否   | `object[]` | 在設置和引導過程中公開的提供者設置描述符。                            |
| `cliBackends`      | 否   | `string[]` | 用於描述符優先設置查找的設置時後端 ID。請保持標準化 ID 的全域唯一性。 |
| `configMigrations` | 否   | `string[]` | 由此外掛的設置介面擁有的設定遷移 ID。                                 |
| `requiresRuntime`  | 否   | `boolean`  | 在描述符查找之後，設置是否仍需要執行 `setup-api`。                    |

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

| 欄位          | 類型       | 含義                         |
| ------------- | ---------- | ---------------------------- |
| `label`       | `string`   | 面向使用者的欄位標籤。       |
| `help`        | `string`   | 簡短的輔助文字。             |
| `tags`        | `string[]` | 選用 UI 標籤。               |
| `advanced`    | `boolean`  | 將該欄位標記為進階。         |
| `sensitive`   | `boolean`  | 將該欄位標記為機密或敏感性。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。     |

## contracts 參考

請僅將 `contracts` 用於 OpenClaw 無需匯入外掛程式執行階段即可讀取的靜態功能擁有權中繼資料。

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
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每個清單都是選用的：

| 欄位                             | 類型       | 含義                                                              |
| -------------------------------- | ---------- | ----------------------------------------------------------------- |
| `embeddedExtensionFactories`     | `string[]` | Codex app-server 擴充功能 factory id，目前為 `codex-app-server`。 |
| `agentToolResultMiddleware`      | `string[]` | 套件外掛程式可註冊 tool-result 中介軟體的執行階段 id。            |
| `externalAuthProviders`          | `string[]` | 此外掛程式擁有其外部驗證設定檔钩子的提供者 id。                   |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 id。                                   |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄提供者 id。                               |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音提供者 id。                               |
| `memoryEmbeddingProviders`       | `string[]` | 此外掛程式擁有的記憶體嵌入提供者 id。                             |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解提供者 id。                               |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的圖像生成提供者 id。                               |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的視訊生成提供者 id。                               |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取提供者 id。                               |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋提供者 id。                               |
| `migrationProviders`             | `string[]` | 此外掛程式為 `openclaw migrate` 擁有的匯入提供者 id。             |
| `tools`                          | `string[]` | 此外掛用於打包合約檢查的代理工具名稱。                            |

`contracts.embeddedExtensionFactories` 保留供打包的 Codex
僅限應用程式伺服器的擴充功能工廠使用。打包的工具結果轉換應該
改為宣告 `contracts.agentToolResultMiddleware` 並註冊至
`api.registerAgentToolResultMiddleware(...)`。外部外掛程式
無法註冊工具結果中介軟體，因為接縫可以在模型看到之前重寫高信任度工具
輸出。

實作 `resolveExternalAuthProfiles` 的提供者外掛應該宣告
`contracts.externalAuthProviders`。未包含此宣告的外掛程式仍然會
透過已棄用的相容性後援機制執行，但該後援機制速度較慢，並且
會在遷移視窗結束後移除。

打包的記憶體嵌入提供者應該為其公開的每個配接器 ID 宣告
`contracts.memoryEmbeddingProviders`，包括
內建配接器，例如 `local`。獨立 CLI 路徑使用此清單
合約，在完整的 Gateway 執行時
註冊提供者之前，僅載入擁有者外掛程式。

## mediaUnderstandingProviderMetadata 參考

當媒體理解提供者具有預設模型、自動驗證後援優先順序，或
通用核心協助程式在執行時載入之前需要的原生文件支援時，請使用 `mediaUnderstandingProviderMetadata`。金鑰也必須在
`contracts.mediaUnderstandingProviders` 中宣告。

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

每個提供者條目可以包含：

| 欄位                   | 類型                                | 意義                                                 |
| ---------------------- | ----------------------------------- | ---------------------------------------------------- |
| `capabilities`         | `("image" \| "audio" \| "video")[]` | 此提供者公開的媒體功能。                             |
| `defaultModels`        | `Record<string, string>`            | 當設定未指定模型時使用的功能對模型預設值。           |
| `autoPriority`         | `Record<string, number>`            | 較小的數字會優先排序，用於自動基於認證的提供者後援。 |
| `nativeDocumentInputs` | `"pdf"[]`                           | 提供者支援的原生文件輸入。                           |

## channelConfigs 參考

當通道外掛程式需要在執行階段載入之前取得低成本的設定元資料時，請使用 `channelConfigs`。當沒有可用的設定項目，或者當 `setup.requiresRuntime: false` 宣告設定執行階段非必要時，唯讀通道設定/狀態探索可以直接針對已設定的外部通道使用此元資料。

`channelConfigs` 是外掛程式清單元資料，而非新的頂層使用者設定區段。使用者仍然在 `channels.<channel-id>` 下設定通道執行個體。OpenClaw 會讀取清單元資料，以便在外掛程式執行階段程式碼執行之前，決定哪個外掛程式擁有該已設定的通道。

對於通道外掛程式，`configSchema` 和 `channelConfigs` 描述了不同的路徑：

- `configSchema` 驗證 `plugins.entries.<plugin-id>.config`
- `channelConfigs.<channel-id>.schema` 驗證 `channels.<channel-id>`

宣告 `channels[]` 的非捆綁外掛程式也應該宣告對應的 `channelConfigs` 項目。如果沒有這些項目，OpenClaw 仍然可以載入外掛程式，但是冷路徑設定結構描述、設定和 Control UI 介面在外掛程式執行階段執行之前，將無法得知通道擁有的選項形狀。

`channelConfigs.<channel-id>.commands.nativeCommandsAutoEnabled` 和
`nativeSkillsAutoEnabled` 可以宣告靜態 `auto` 預設值，用於在通道執行階段載入之前執行的指令設定檢查。捆綁通道也可以透過 `package.json#openclaw.channel.commands` 發布相同的預設值，與其其他套件擁有的通道目錄元資料並列。

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

| 欄位          | 類型                     | 含義                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `schema`      | `object`                 | `channels.<id>` 的 JSON 結構描述。每個宣告的通道設定項目皆為必要。 |
| `uiHints`     | `Record<string, object>` | 該通道設定區段選用的 UI 標籤/預留位置/敏感提示。                   |
| `label`       | `string`                 | 當執行階段元資料尚未準備好時，合併至選擇器和檢查介面的通道標籤。   |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                                 |
| `commands`    | `object`                 | 用於執行時前配置檢查的靜態原生命令和原生技能自動預設值。           |
| `preferOver`  | `string[]`               | 在選擇介面中，此通道應超越的舊版或優先級較低的插件 ID。            |

### 替換另一個通道插件

當您的插件是另一個插件也能提供的通道 ID 的首選擁有者時，請使用 `preferOver`。常見情況包括重新命名的插件 ID、取代套件插件的獨立插件，或為了配置相容性而保留相同通道 ID 的維護分支。

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

當配置了 `channels.chat` 時，OpenClaw 會同時考慮通道 ID 和首選插件 ID。如果優先級較低的插件僅因為是套件的一部分或預設啟用而被選中，OpenClaw 會在有效的執行時配置中停用它，以便一個插件擁有該通道及其工具。明確的使用者選擇仍然優先：如果使用者明確啟用了這兩個插件，OpenClaw 將保留該選擇並回報重複的通道/工具診斷資訊，而不是靜默更改請求的插件集。

請將 `preferOver` 的範圍限制在確實能夠提供相同通道的插件 ID。它不是一般的優先級欄位，也不會重新命名使用者配置金鑰。

## modelSupport 參考

當 OpenClaw 應該在插件執行時載入之前，從簡寫的模型 ID（如 `gpt-5.5` 或 `claude-sonnet-4.6`）推斷您的提供者插件時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用此優先順序：

- 明確的 `provider/model` 引用使用擁有的 `providers` 清單元資料
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非套件插件和一個套件插件都符合，非套件插件獲勝
- 其餘的歧義將被忽略，直到使用者或配置指定了提供者

欄位：

| 欄位            | 類型       | 含義                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 針對簡寫模型 ID 匹配的前綴。        |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，與簡寫模型 ID 比對的 Regex 來源。 |

## modelCatalog 參考

當 OpenClaw 應在載入外掛程式執行階段之前得知提供者模型中繼資料時，請使用 `modelCatalog`。這是清單檔案所擁有的來源，用於固定目錄資料列、提供者別名、抑制規則和探索模式。執行階段重新整理仍屬於提供者執行階段程式碼的範疇，但清單檔案會告知核心何時需要執行階段。

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

| 欄位           | 類型                                                     | 意義                                                                            |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `providers`    | `Record<string, object>`                                 | 屬於此外掛程式所有的提供者 ID 的目錄資料列。金鑰也應出現在頂層 `providers` 中。 |
| `aliases`      | `Record<string, object>`                                 | 應解析為目錄或抑制規劃之擁有提供者的提供者別名。                                |
| `suppressions` | `object[]`                                               | 來自其他來源的模型資料列，此外掛程式因提供者特定原因而將其抑制。                |
| `discovery`    | `Record<string, "static" \| "refreshable" \| "runtime">` | 提供者目錄是否能從清單中繼資料讀取、重新整理到快取，或需要執行階段。            |

`aliases` 參與模型目錄規劃的提供者所有權查詢。
別名目標必須是此外掛程式所有的頂層提供者。當使用
別名的提供者篩選清單時，OpenClaw 可以讀取擁有的清單並
套用別名 API/基底 URL 覆寫，而無需載入提供者執行階段。

`suppressions` 是提供者執行階段 `suppressBuiltInModel` Hook 的首選靜態替代方案。
抑制項目僅在提供者由此外掛程式擁有或宣告為 `modelCatalog.aliases` 金鑰且
目標為擁有的提供者時才會生效。執行階段抑制 Hook 仍會作為已棄用的
相容性後援方案，針對尚未遷移的外掛程式執行。

提供者欄位：

| 欄位      | 類型                     | 意義                                      |
| --------- | ------------------------ | ----------------------------------------- |
| `baseUrl` | `string`                 | 此提供者目錄中模型的選用預設基底 URL。    |
| `api`     | `ModelApi`               | 此提供者目錄中模型的選用預設 API 配接器。 |
| `headers` | `Record<string, string>` | 適用於此提供者目錄的選用性靜態標頭。      |
| `models`  | `object[]`               | 必填的模型列。沒有 `id` 的列會被忽略。    |

模型欄位：

| 欄位            | 類型                                                           | 含義                                                          |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `id`            | `string`                                                       | 提供者本地的模型 ID，不帶 `provider/` 前綴。                  |
| `name`          | `string`                                                       | 選用性的顯示名稱。                                            |
| `api`           | `ModelApi`                                                     | 選用性的個別模型 API 覆蓋。                                   |
| `baseUrl`       | `string`                                                       | 選用性的個別模型基礎 URL 覆蓋。                               |
| `headers`       | `Record<string, string>`                                       | 選用性的個別模型靜態標頭。                                    |
| `input`         | `Array<"text" \| "image" \| "document" \| "audio" \| "video">` | 模型接受的模態。                                              |
| `reasoning`     | `boolean`                                                      | 模型是否公開推理行為。                                        |
| `contextWindow` | `number`                                                       | 原生提供者內容視窗。                                          |
| `contextTokens` | `number`                                                       | 選用性的有效執行時間內容上限，當其與 `contextWindow` 不同時。 |
| `maxTokens`     | `number`                                                       | 已知時的最大輸出 Token 數。                                   |
| `cost`          | `object`                                                       | 選用性的每百萬 Token 美元定價，包含選用性的 `tieredPricing`。 |
| `compat`        | `object`                                                       | 選用性的相容性旗標，符合 OpenClaw 模型配置相容性。            |
| `status`        | `"available"` \| `"preview"` \| `"deprecated"` \| `"disabled"` | 列表狀態。僅當該列完全不應出現時才抑制。                      |
| `statusReason`  | `string`                                                       | 隨非可用狀態顯示的選用性原因。                                |
| `replaces`      | `string[]`                                                     | 此模型取代的較舊供應商本機模型 ID。                           |
| `replacedBy`    | `string`                                                       | 已棄用項目的替代供應商本機模型 ID。                           |
| `tags`          | `string[]`                                                     | 選擇器和篩選器使用的穩定標籤。                                |

請勿在 `modelCatalog` 中放入僅限執行時期的資料。如果供應商需要帳戶狀態、API 要求或本機程序探索才能知道完整的模型集合，請在 `discovery` 中將該供應商宣告為 `refreshable` 或 `runtime`。

## modelIdNormalization 參考

使用 `modelIdNormalization` 進行必須在供應商執行時期載入之前發生的低成本供應商擁有模型 ID 清理。這會將簡短的模型名稱、供應商本機舊版 ID 和代理程式前綴規則等別名保留在擁有的插件清單中，而不是核心模型選擇表中。

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

| 欄位                                 | 類型                    | 含義                                                                        |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------------- |
| `aliases`                            | `Record<string,string>` | 不區分大小寫的精確模型 ID 別名。數值會依照書寫形式傳回。                    |
| `stripPrefixes`                      | `string[]`              | 在別名查閱之前要移除的前綴，適用於舊版供應商/模型重複的情況。               |
| `prefixWhenBare`                     | `string`                | 當正規化的模型 ID 未包含 `/` 時要新增的前綴。                               |
| `prefixWhenBareAfterAliasStartsWith` | `object[]`              | 在別名查閱之後，根據 `modelPrefix` 和 `prefix` 索引的條件式純 ID 前綴規則。 |

## providerEndpoints 參考

使用 `providerEndpoints` 進行通用請求原則必須在供應商執行時期載入之前知道的端點分類。核心仍然擁有每個 `endpointClass` 的含義；插件清單擁有主機和基本 URL 中繼資料。

端點欄位：

| 欄位                           | 類型       | 含義                                                                          |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| `endpointClass`                | `string`   | 已知的核心端點類別，例如 `openrouter`、`moonshot-native` 或 `google-vertex`。 |
| `hosts`                        | `string[]` | 對應至端點類別的確切主機名稱。                                                |
| `hostSuffixes`                 | `string[]` | 對應至端點類別的主機後綴。若要僅進行網域後綴比對，請加上 `.` 前綴。           |
| `baseUrls`                     | `string[]` | 對應至端點類別的確切正規化 HTTP(S) 基礎 URL。                                 |
| `googleVertexRegion`           | `string`   | 針對確切全域主機的靜態 Google Vertex 區域。                                   |
| `googleVertexRegionHostSuffix` | `string`   | 從相符主機中剝離的後綴，用以顯露 Google Vertex 區域前綴。                     |

## providerRequest 參考

使用 `providerRequest` 以取得通用請求原則所需的低成本請求相容性中繼資料，而無須載入提供者執行時。請將特定行為的 Payload 重寫保留在提供者執行時的 Hooks 或共用的提供者系列輔助程式中。

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
| `family`              | `string`     | 用於通用請求相容性決策與診斷的提供者系列標籤。               |
| `compatibilityFamily` | `"moonshot"` | 共用請求輔助程式的選用提供者系列相容性分組。                 |
| `openAICompletions`   | `object`     | OpenAI 相容的完成請求標誌，目前為 `supportsStreamingUsage`。 |

## modelPricing 參考

當提供者需要在執行時載入之前進行控制平面定價行為時，請使用 `modelPricing`。Gateway 定價快取會讀取此中繼資料，而無須匯入提供者執行時程式碼。

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

| 欄位         | 類型              | 含義                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `external`   | `boolean`         | 針對不應該擷取 OpenRouter 或 LiteLLM 定價的本機/自託管提供者，請設定 `false`。 |
| `openRouter` | `false \| object` | OpenRouter 定價查詢對應。`false` 會停用此提供者的 OpenRouter 查詢。            |
| `liteLLM`    | `false \| object` | LiteLLM 價格查詢對應。`false` 會停用此提供者的 LiteLLM 查詢。                  |

來源欄位：

| 欄位                       | 類型               | 說明                                                                                     |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `provider`                 | `string`           | 當外部目錄提供者 ID 與 OpenClaw 提供者 ID 不同時使用，例如對於 `zai` 提供者使用 `z-ai`。 |
| `passthroughProviderModel` | `boolean`          | 將包含斜線的模型 ID 視為巢狀提供者/模型參照，適用於 OpenRouter 等代理提供者。            |
| `modelIdTransforms`        | `"version-dots"[]` | 額外的外部目錄模型 ID 變體。`version-dots` 會嘗試帶點的版本 ID，例如 `claude-opus-4.6`。 |

### OpenClaw 提供者索引

OpenClaw 提供者索引是 OpenClaw 擁有的提供者預覽元數據，
適用於外掛程式可能尚未安裝的提供者。它不屬於外掛程式清單的一部分。
已安裝的外掛程式清單仍是已安裝外掛程式的權威來源。提供者索引是
內部備用契約，當提供者外掛程式未安裝時，未來的可安裝提供者和
預安裝模型選擇器介面將會使用它。

目錄權威順序：

1. 使用者設定。
2. 已安裝的外掛程式清單 `modelCatalog`。
3. 來自明確重新整理的模型目錄快取。
4. OpenClaw 提供者索引預覽資料列。

提供者索引不得包含機密資訊、啟用狀態、執行時期攔截器，或
即時帳號特定的模型資料。其預覽目錄使用與外掛程式清單相同的
`modelCatalog` 提供者資料列形狀，但應保持僅限於
穩定的顯示元數據，除非執行時期介面卡欄位（如 `api`、
`baseUrl`、定價或相容性旗標）刻意與
已安裝的外掛程式清單保持一致。具有即時 `/models` 探索功能的提供者應
透過明確的模型目錄快取路徑寫入重新整理的資料列，而不是
進行一般列出或上架呼叫提供者 API。

供應商索引條目也可能包含可安裝外掛程式的元資料，適用於其外掛程式已從核心移出或尚未安裝的供應商。此元資料反映管道目錄模式：套件名稱、npm 安裝規格、預期的完整性以及簡單的身分驗證選擇標籤，足以顯示可安裝的設定選項。一旦安裝了外掛程式，其清單優先，並且會忽略該供應商的供應商索引條目。

舊版頂層功能鍵已棄用。使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的清單載入不再將這些頂層欄位視為功能所有權。

## Manifest 與 package.

這兩個檔案負責不同的工作：

| 檔案                   | 用途                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、設定驗證、身分驗證選擇元資料，以及必須在外掛程式碼執行前存在的 UI 提示         |
| `package.json`         | npm 元資料、依賴項安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊 |

如果您不確定某個元資料屬於哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放入 `openclaw.plugin.json`
- 如果它與打包、進入檔案或 npm 安裝行為有關，請將其放入 `package.json`

### 影響探索的 package. 欄位

一些執行時前的外掛元資料刻意存在於 `package.json` 的 `openclaw` 區塊中，而不是 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 含義                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生外掛進入點。必須保留在外掛套件目錄內。                                                                |
| `openclaw.runtimeExtensions`                                      | 宣告已安裝套件的已建置 JavaScript 執行時進入點。必須保留在外掛套件目錄內。                                    |
| `openclaw.setupEntry`                                             | 在導入、延遲通道啟動和唯讀通道狀態/SecretRef 探索期間使用的輕量級僅設定進入點。必須保留在外掛程式套件目錄內。 |
| `openclaw.runtimeSetupEntry`                                      | 宣告已安裝套件的建置 JavaScript 設定進入點。必須保留在外掛程式套件目錄內。                                    |
| `openclaw.channel`                                                | 低廉的通道目錄元資料，如標籤、文件路徑、別名和選擇複製。                                                      |
| `openclaw.channel.commands`                                       | 在通道執行時間載入之前，由設定、稽核和指令清單介面使用的靜態原生指令和原生技能自動預設元資料。                |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器元資料，可在不載入完整通道執行時間的情況下回答「僅環境設定是否已存在？」。                |
| `openclaw.channel.persistedAuthState`                             | 輕量級持續性驗證檢查器元資料，可在不載入完整通道執行時間的情況下回答「是否已登入任何項目？」。                |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 套件和外部發佈外掛程式的安裝/更新提示。                                                                       |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時，偏好的安裝路徑。                                                                      |
| `openclaw.install.minHostVersion`                                 | 支援的最低 OpenClaw 主機版本，使用像 `>=2026.3.22` 這樣的 semver 下限。                                       |
| `openclaw.install.expectedIntegrity`                              | 預期的 npm dist 完整性字串，例如 `sha512-...`；安裝和更新流程會據此驗證擷取的檔案。                           |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當設定無效時，允許狹窄的套件外掛程式重新安裝復原路徑。                                                        |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅設定的通道介面在啟動期間於完整通道外掛程式之前載入。                                                      |

Manifest 元資料決定了在執行時間載入之前，導入中會顯示哪些提供者/通道/設定選項。`package.json#openclaw.install` 會告訴導入流程，當使用者選擇其中一個選項時，如何擷取或啟用該外掛程式。請勿將安裝提示移至 `openclaw.plugin.json`。

`openclaw.install.minHostVersion` 會在安裝和 Manifest 登錄載入期間強制執行。無效的值會被拒絕；較新但有效的值會在舊版主機上跳過該外掛程式。

精確的 npm 版本鎖定已存在於 `npmSpec` 中，例如
`"npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3"`。官方的外部目錄
項目應將精確規範與 `expectedIntegrity` 配對，以便當獲取的
npm 構件不再與鎖定的版本匹配時，更新流程會失敗。
互動式入門仍提供受信任的註冊表 npm 規範，包括裸包名
和 dist-tags，以保持相容性。目錄診斷可以區分精確、浮動、
完整性鎖定、缺少完整性、包名不匹配和無效的預設選擇來源。
它們還會在存在 `expectedIntegrity` 但沒有有效的 npm
來源可供鎖定時發出警告。當存在 `expectedIntegrity` 時，
安裝/更新流程會強制執行它；當省略它時，註冊表解析
會被記錄而沒有完整性鎖定。

當狀態、通道列表或 SecretRef 掃描需要在不載入完整
運行時的情況下識別已配置的帳戶時，通道外掛應提供
`openclaw.setupEntry`。設定入口應公開通道元資料以及
設定安全的配置、狀態和密碼配接器；將網路用戶端、
閘道監聽器和傳輸運行時保留在主擴充功能入口中。

運行時入口欄位不會覆蓋源入口欄位的包邊界檢查。
例如，`openclaw.runtimeExtensions` 無法使
逸出的 `openclaw.extensions` 路徑可載入。

`openclaw.install.allowInvalidConfigRecovery` 是故意限制的。它
不會使任意損壞的配置可安裝。目前它僅允許安裝流程從
特定的過時套件外掛升級失敗中恢復，例如缺少套件外掛路徑
或同一套件外掛的過時 `channels.<id>` 項目。
無關的配置錯誤仍會阻止安裝並將操作員引導至
`openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個微小檢查器模組的
套件元資料：

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

當設定、診斷或配置狀態流程需要在完整通道外掛載入之前進行
廉價的是/否身份驗證探測時使用它。目標匯出應該是一個
僅讀取持久狀態的小函數；不要將其路由通過完整
通道運行時筒。

`openclaw.channel.configuredState` 遵循相同的結構，用於僅透過環境變數進行的低成本配置檢查：

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

當頻道可以從環境變數或其他微小的非執行時期輸入來回答配置狀態時，請使用它。如果檢查需要完整的配置解析或真實的頻道執行時期，請將該邏輯保留在插件的 `config.hasConfiguredState` 掛鉤中。

## 探索優先順序（重複的插件 ID）

OpenClaw 從多個根目錄探索插件（打包的、全域安裝的、工作區、明確配置選擇的路徑）。如果兩個探索結果具有相同的 `id`，則只保留 **優先順序最高** 的清單；較低優先順序的重複項會被丟棄，而不會與其並行載入。

優先順序，從高到低：

1. **配置選擇** — 在 `plugins.entries.<id>` 中明確固定的路徑
2. **打包** — 隨 OpenClaw 一起提供的插件
3. **全域安裝** — 安裝到全域 OpenClaw 插件根目錄的插件
4. **工作區** — 相對於當前工作區探索到的插件

影響：

- 位於工作區中的打包插件的分支或過時副本將不會覆蓋打包的版本。
- 若要實際使用本地插件覆蓋打包的插件，請透過 `plugins.entries.<id>` 固定它，使其透過優先順序獲勝，而不是依賴工作區探索。
- 會記錄重複項的丟棄情況，以便 Doctor 和啟動診斷可以指向被丟棄的副本。

## JSON Schema 要求

- **每個插件必須提供 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置讀取/寫入時進行驗證，而不是在執行時期。

## 驗證行為

- 未知的 `channels.*` 鍵是 **錯誤**，除非頻道 ID 由插件清單宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用 **可探索的** 插件 ID。未知的 ID 是 **錯誤**。
- 如果插件已安裝但清單或 schema 損壞或遺失，驗證將失敗，Doctor 會報告插件錯誤。
- 如果插件配置存在但插件被 **停用**，則會保留配置並在 Doctor + 日誌中顯示 **警告**。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration) 以取得完整的 `plugins.*` 結構描述。

## 註記

- Manifest 對於原生 OpenClaw 外掛程式是**必須的**，包括本地檔案系統載入。Runtime 仍會單獨載入外掛模組；Manifest 僅用於探索 + 驗證。
- 原生 Manifest 是使用 JSON5 解析的，因此只要最終值仍是物件，就接受註解、尾隨逗號和未加引號的鍵。
- Manifest 載入器僅會讀取已記錄的 Manifest 欄位。請避免自訂頂層鍵。
- 當外掛程式不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- `providerDiscoveryEntry` 必須保持輕量，不應導入廣泛的 Runtime 程式碼；將其用於靜態供應商目錄元資料或狹窄的探索描述符，而非請求時執行。
- 互斥的外掛種類是透過 `plugins.slots.*` 選取的：`kind: "memory"` 透過 `plugins.slots.memory`，`kind: "context-engine"` 透過 `plugins.slots.contextEngine` (預設 `legacy`)。
- 環境變數元資料 (`setup.providers[].envVars`、已棄用的 `providerAuthEnvVars` 和 `channelEnvVars`) 僅具宣告性。狀態、稽核、Cron 傳遞驗證和其他唯讀介面在將環境變數視為已設定之前，仍會套用外掛信任和有效的啟用原則。
- 對於需要供應商程式碼的 Runtime 精靈元資料，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture-internals#provider-runtime-hooks)。
- 如果您的外掛程式相依於原生模組，請記錄建置步驟以及任何套件管理員允許清單需求 (例如，pnpm `allow-build-scripts` + `pnpm rebuild <package>`)。

## 相關

<CardGroup cols={3}>
  <Card title="建置外掛程式" href="/zh-Hant/plugins/building-plugins" icon="rocket">
    開始使用外掛程式。
  </Card>
  <Card title="外掛程式架構" href="/zh-Hant/plugins/architecture" icon="diagram-project">
    內部架構與功能模型。
  </Card>
  <Card title="SDK 概覽" href="/zh-Hant/plugins/sdk-overview" icon="book">
    外掛程式 SDK 參考與子路徑匯入。
  </Card>
</CardGroup>
