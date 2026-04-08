---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin Manifest"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

如需相容的套件佈局，請參閱 [Plugin bundles](/en/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex bundle：`.codex-plugin/plugin.json`
- Claude bundle：`.claude-plugin/plugin.json` 或預設的 Claude component
  佈局（不含 manifest）
- Cursor bundle：`.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但不會根據此處所述的
`openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料以及宣告的
skill roots、Claude command roots、Claude bundle `settings.json` 預設值、
Claude bundle LSP 預設值和支援的 hook packs。

每個原生 OpenClaw 外掛**必須**在 **plugin root** 中包含一個
`openclaw.plugin.json` 檔案。OpenClaw 使用此 manifest 來驗證設定，**而無需執行外掛程式碼**。
遺失或無效的 manifest 被視為外掛錯誤，並會阻擋設定驗證。

請參閱完整的外掛系統指南：[Plugins](/en/tools/plugin)。
關於原生功能模型和目前的外部相容性指引：
[Capability model](/en/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的外掛程式碼之前讀取的中繼資料。

將其用於：

- 外掛程式身分識別
- 設定驗證
- 應該在啟動外掛程式執行時期之前可用的驗證和上架中繼資料
- alias 和 auto-enable 中繼資料，應該在外掛執行時期載入之前解析
- 簡寫 model-family 所有權中繼資料，應該在執行時期載入之前自動啟用
  外掛
- 靜態功能所有權快照，用於打包的相容連線和
  契約覆蓋範圍
- 特定頻道的設定中繼資料，應該在無需載入執行時期的情況下合併到目錄和驗證
  介面
- 設定 UI 提示

請勿將其用於：

- 註冊執行時期行為
- 宣告程式碼進入點
- npm install 中繼資料

這些應屬於您的外掛程式碼和 `package.json`。

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
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
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

| 欄位                                | 必要 | 類型                             | 含義                                                                                                                     |
| ----------------------------------- | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                                | 是   | `string`                         | 外掛程式的正式 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                           |
| `configSchema`                      | 是   | `object`                         | 此外掛程式設定的內嵌 JSON Schema。                                                                                       |
| `enabledByDefault`                  | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。若要讓外掛程式保持預設停用，請省略此項，或將其設為任何非 `true` 的值。                   |
| `legacyPluginIds`                   | 否   | `string[]`                       | 會正規化為此正式外掛程式 ID 的舊版 ID。                                                                                  |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 當驗證、設定或模型參照提及這些提供者 ID 時，應該自動啟用此外掛程式。                                                     |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的獨佔外掛程式種類。                                                                        |
| `channels`                          | 否   | `string[]`                       | 此外掛程式擁有的頻道 ID。用於探索和設定驗證。                                                                            |
| `providers`                         | 否   | `string[]`                       | 此外掛程式擁有的提供者 ID。                                                                                              |
| `modelSupport`                      | 否   | `object`                         | 資訊清單擁有的簡寫模型系列元數據，用於在執行階段之前自動載入外掛程式。                                                   |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 無需載入外掛程式碼即可檢查的輕量級提供者驗證環境元數據。                                                        |
| `providerAuthChoices`               | 否   | `object[]`                       | 供入門選擇器、首選提供者解析和簡單 CLI 標記連線使用的輕量級驗證選擇元數據。                                              |
| `contracts`                         | 否   | `object`                         | 用於語音、即時轉錄、即時語音、媒體理解、影像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具擁有權的靜態打包功能快照。 |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 在執行階段載入之前合併到探索和驗證介面的資訊清單擁有頻道設定元數據。                                                     |
| `skills`                            | 否   | `string[]`                       | 要載入的 Skill 目錄，相對於外掛程式根目錄。                                                                              |
| `name`                              | 否   | `string`                         | 人類可讀的外掛程式名稱。                                                                                                 |
| `description`                       | 否   | `string`                         | 顯示在外掛程式介面的簡短摘要。                                                                                           |
| `version`                           | 否   | `string`                         | 資訊性的外掛程式版本。                                                                                                   |
| `uiHints`                           | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、預留位置和敏感性提示。                                                                               |

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。
OpenClaw 會在 Provider 執行環境載入前讀取此內容。

| 欄位                  | 必要 | 類型                                            | 說明                                                            |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選項所屬的 Provider ID。                                      |
| `method`              | 是   | `string`                                        | 要分派到的驗證方法 ID。                                         |
| `choiceId`            | 是   | `string`                                        | 由上架和 CLI 流程使用的穩定驗證選項 ID。                        |
| `choiceLabel`         | 否   | `string`                                        | 使用者介面顯示的標籤。如果省略，OpenClaw 會回退至 `choiceId`。  |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短輔助文字。                                          |
| `assistantPriority`   | 否   | `number`                                        | 較低的值會在助理驅動的互動式選擇器中排在較前面。                |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏此選項，但仍允許透過手動 CLI 選取。           |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選項 ID。                   |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                               |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者介面顯示標籤。                                    |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短輔助文字。                                          |
| `optionKey`           | 否   | `string`                                        | 簡單單一標記認證流程的內部選項鍵。                              |
| `cliFlag`             | 否   | `string`                                        | CLI 標記名稱，例如 `--openrouter-api-key`。                     |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。        |
| `cliDescription`      | 否   | `string`                                        | 用於 CLI 說明的描述。                                           |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現的入門介面。如果省略，預設為 `["text-inference"]`。 |

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
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可以在不匯入外掛執行時期的情況下讀取的靜態功能所有權元數據。

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

| 欄位                             | 類型       | 含義                                           |
| -------------------------------- | ---------- | ---------------------------------------------- |
| `speechProviders`                | `string[]` | 此外掛擁有的語音提供者 ID。                    |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛擁有的即時轉錄提供者 ID。                |
| `realtimeVoiceProviders`         | `string[]` | 此外掛擁有的即時語音提供者 ID。                |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛擁有的媒體理解提供者 ID。                |
| `imageGenerationProviders`       | `string[]` | 此外掛擁有的圖像生成提供者 ID。                |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的視訊生成提供者 ID。            |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取提供者 ID。            |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋提供者 ID。            |
| `tools`                          | `string[]` | 此外掛程式用於套件合約檢查的代理程式工具名稱。 |

## channelConfigs 參考

當通道外掛程式在執行階段載入之前需要低成本的配置元資料時，請使用 `channelConfigs`。

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

每個通道條目可以包含：

| 欄位          | 類型                     | 含義                                                                  |
| ------------- | ------------------------ | --------------------------------------------------------------------- |
| `schema`      | `object`                 | 用於 `channels.<id>` 的 JSON Schema。每個宣告的通道配置條目均為必填。 |
| `uiHints`     | `Record<string, object>` | 該通道配置區段的選用 UI 標籤/佔位元/敏感提示。                        |
| `label`       | `string`                 | 當執行階段元資料尚未準備好時，合併到選擇器和檢查介面中的通道標籤。    |
| `description` | `string`                 | 用於檢查和目錄介面的簡短通道描述。                                    |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應優先於的舊版或較低優先級的外掛程式 ID。           |

## modelSupport 參考

當 OpenClaw 應該從縮寫模型 ID（如 `gpt-5.4` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`，且在外掛程式執行階段載入之前。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用此優先順序：

- 明確的 `provider/model` 參考使用擁有的 `providers` 清單元資料
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非套件外掛程式和一個套件外掛程式都匹配，則非套件外掛程式獲勝
- 剩餘的歧義將被忽略，直到使用者或配置指定了提供者

欄位：

| 欄位            | 類型       | 含義                                                        |
| --------------- | ---------- | ----------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 針對簡寫模型 ID 比對符合 `startsWith` 的前綴。              |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，針對簡寫模型 ID 進行匹配的 Regex 來源。 |

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 之下；正常的清單載入程式不再將這些頂層欄位視為功能所有權。

## Manifest 與 package.

這兩個檔案有不同的用途：

| 檔案                   | 用途                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 外掛程式碼執行前必須存在的探索、設定驗證、身分驗證選擇元資料和 UI 提示。               |
| `package.json`         | npm 元資料、相依性安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊。 |

如果您不確定某段元資料應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放入 `openclaw.plugin.json`
- 如果與打包、進入檔案或 npm install 行為有關，請將其放入 `package.json`

### 影響探索的 package. 欄位

部分執行前外掛程式元資料刻意存在於 `package.json` 的 `openclaw` 區塊下，而非 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 含義                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生外掛進入點。                                                                         |
| `openclaw.setupEntry`                                             | 在入門和延遲通道啟動期間使用的輕量級僅設定進入點。                                           |
| `openclaw.channel`                                                | 廉價的通道目錄元資料，如標籤、文件路徑、別名和選擇複製。                                     |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器元資料，可在不載入完整通道執行時的情況下回答「僅環境設定是否已存在？」。 |
| `openclaw.channel.persistedAuthState`                             | 輕量級持久化認證檢查器元資料，可以在不加載完整通道執行時的情況下回答「是否已登入？」。       |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 針對打包和外部發布外掛程式的安裝/更新提示。                                                  |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時的首選安裝路徑。                                                       |
| `openclaw.install.minHostVersion`                                 | 支援的最低 OpenClaw 主機版本，使用諸如 `>=2026.3.22` 的 semver 下限。                        |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當配置無效時，允許一個狹窄的打包外掛程式重新安裝恢復路徑。                                   |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅設定的通道介面在啟動期間於完整通道外掛程式之前載入。                                     |

`openclaw.install.minHostVersion` 在安裝和清單註冊表載入期間會被強制執行。無效值會被拒絕；較新但有效的值會在舊版主機上跳過此外掛程式。

`openclaw.install.allowInvalidConfigRecovery` 是故意設計得狹窄的。它並不讓任意損壞的配置可安裝。目前它僅允許安裝流程從特定的陳舊打包外掛程式升級失敗中恢復，例如遺失的打包外掛程式路徑或同一打包外掛程式的陳舊 `channels.<id>` 項目。不相關的配置錯誤仍然會阻擋安裝，並將操作員導向 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是小型檢查器模組的套件元資料：

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

當設定、診斷或已配置狀態流程在完整通道外掛程式載入之前需要廉價的是/否認證探測時使用它。目標匯出應該是一個僅讀取持久化狀態的小型函式；不要將其通過完整通道執行時桶來路由。

`openclaw.channel.configuredState` 遵循相同的形狀以進行廉價的僅環境配置檢查：

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

當通道可以從環境或其他微小的非執行時輸入回答已配置狀態時使用它。如果檢查需要完整的配置解析或真實的通道執行時，請將該邏輯保留在外掛程式的 `config.hasConfiguredState` 掛鉤中。

## JSON Schema 需求

- **每個外掛程式都必須提供 JSON Schema**，即使它不接受任何配置。
- 空 Schema 是可接受的（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非 channel id 由
  plugin manifest 宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可被發現** 的 plugin id。未知的 id 是**錯誤**。
- 如果外掛已安裝但其 manifest 或 schema 損壞或缺失，
  驗證將會失敗，且 Doctor 會回報該外掛錯誤。
- 如果外掛設定存在但該外掛已被**停用**，則該設定會被保留，
  並且在 Doctor + 記錄檔 中顯示**警告**。

請參閱 [設定參考](/en/gateway/configuration) 以取得完整的 `plugins.*` schema。

## 備註

- 對於原生 OpenClaw 外掛而言，manifest 是**必須的**，包括從本地檔案系統載入的情況。
- Runtime 仍會分別載入外掛模組；manifest 僅用於
  探索 與驗證。
- 原生 manifest 會使用 JSON5 解析，因此只要最終值仍為物件，
  註解、尾隨逗號 和未加引號的鍵 都可被接受。
- manifest 載入器僅會讀取已記載的 manifest 欄位。請避免在此
  新增自訂的頂層鍵。
- `providerAuthEnvVars` 是用於 auth probes、env-marker
  驗證以及類似的 provider-auth 介面的低成本 metadata 路徑，
  這些介面不應僅為了檢查 env 名稱就啟動外掛 runtime。
- `providerAuthChoices` 是用於 auth-choice pickers、
  `--auth-choice` 解析、preferred-provider 對應以及
  簡單入門 CLI flag 註冊的低成本 metadata 路徑，這些動作會在
  provider runtime 載入之前進行。若需要 provider code 的 runtime wizard metadata，
  請參閱 [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的外掛種類是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選取的
    (預設：內建 `legacy`)。
- 當外掛不需要時，可以省略 `channels`、
  `providers` 和 `skills`。
- 如果您的外掛程式依賴於原生模組，請記錄建置步驟及任何
  套件管理員允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相關

- [建置外掛程式](/en/plugins/building-plugins) — 外掛程式入門
- [外掛程式架構](/en/plugins/architecture) — 內部架構
- [SDK 概覽](/en/plugins/sdk-overview) — 外掛程式 SDK 參考
