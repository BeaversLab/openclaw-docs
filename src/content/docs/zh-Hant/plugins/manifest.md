---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin Manifest"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

若要了解相容的套件配置，請參閱 [Plugin bundles](/en/plugins/bundles)。

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

請參閱完整的插件系統指南：[Plugins](/en/tools/plugin)。
若要了解原生功能模型以及目前的外部相容性指引：
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
  "cliBackends": ["openrouter-cli"],
  "providerAuthEnvVars": {
    "openrouter": ["OPENROUTER_API_KEY"]
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
| `id`                                | 是   | `string`                         | 外掛程式的正式 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                           |
| `configSchema`                      | 是   | `object`                         | 此外掛程式設定的內嵌 JSON Schema。                                                                                                       |
| `enabledByDefault`                  | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。若要讓外掛程式保持預設停用，請省略此項，或將其設為任何非 `true` 的值。                                   |
| `legacyPluginIds`                   | 否   | `string[]`                       | 會正規化為此正式外掛程式 ID 的舊版 ID。                                                                                                  |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 當驗證、設定或模型參照提及這些提供者 ID 時，應該自動啟用此外掛程式。                                                                     |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的獨佔外掛程式種類。                                                                                        |
| `channels`                          | 否   | `string[]`                       | 此外掛程式擁有的頻道 ID。用於探索和設定驗證。                                                                                            |
| `providers`                         | 否   | `string[]`                       | 此外掛程式擁有的提供者 ID。                                                                                                              |
| `modelSupport`                      | 否   | `object`                         | 資訊清單擁有的簡寫模型系列元數據，用於在執行階段之前自動載入外掛程式。                                                                   |
| `cliBackends`                       | 否   | `string[]`                       | 由此外掛擁有的 CLI 推論後端 ID。用於從明確設定參照進行啟動時的自動啟用。                                                                 |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量提供者驗證環境中繼資料。                                                                  |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量通道環境中繼資料。將其用於由環境驅動的通道設定，或通用啟動/設定輔助工具應顯示的驗證介面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用於上架挑選器、首選提供者解析以及簡單 CLI 旗標連線的輕量驗證選擇中繼資料。                                                              |
| `contracts`                         | 否   | `object`                         | 語音、即時轉錄、即時語音、媒體理解、圖像生成、音樂生成、影片生成、網路擷取、網路搜尋和工具擁有權的靜態套件功能快照。                     |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 在執行時期載入之前，合併到探索和驗證介面中的清單擁有通道設定中繼資料。                                                                   |
| `skills`                            | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛根目錄。                                                                                                     |
| `name`                              | 否   | `string`                         | 人類可讀的外掛名稱。                                                                                                                     |
| `description`                       | 否   | `string`                         | 顯示在外掛介面中的簡短摘要。                                                                                                             |
| `version`                           | 否   | `string`                         | 資訊性的外掛版本。                                                                                                                       |
| `uiHints`                           | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、預留位置和敏感性提示。                                                                                               |

## providerAuthChoices 參考資料

每個 `providerAuthChoices` 項目描述一個入門或驗證選擇。
OpenClaw 會在提供者執行時載入之前讀取此項目。

| 欄位                  | 必要 | 類型                                            | 說明                                                                  |
| --------------------- | ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選擇所屬的提供者 ID。                                               |
| `method`              | 是   | `string`                                        | 要分派到的驗證方法 ID。                                               |
| `choiceId`            | 是   | `string`                                        | 用於入門和 CLI 流程的穩定驗證選擇 ID。                                |
| `choiceLabel`         | 否   | `string`                                        | 使用者看到的標籤。如果省略，OpenClaw 會回退至 `choiceId`。            |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短輔助說明文字。                                            |
| `assistantPriority`   | 否   | `number`                                        | 數值越低，在助理驅動的互動式選擇器中排序越靠前。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏此選項，但仍允許透過 CLI 手動選取。                 |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選擇 ID。                         |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                     |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者可見標籤。                                              |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短輔助說明文字。                                            |
| `optionKey`           | 否   | `string`                                        | 用於簡單單一旗標驗證流程的內部選項鍵。                                |
| `cliFlag`             | 否   | `string`                                        | CLI 旗標名稱，例如 `--openrouter-api-key`。                           |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。              |
| `cliDescription`      | 否   | `string`                                        | 用於 CLI 說明的描述。                                                 |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪個入門介面中。如果省略，預設為 `["text-inference"]`。 |

## uiHints 參考

`uiHints` 是從設定欄位名稱到小型呈現提示的映射。

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

| 欄位          | 類型       | 其含義                   |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 使用者可見的欄位標籤。   |
| `help`        | `string`   | 簡短說明文字。           |
| `tags`        | `string[]` | 選用性 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅將 `contracts` 用於 OpenClaw 可在不匯入外掛執行環境的情況下讀取的靜態功能擁有權中繼資料。

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

每個清單皆為選用：

| 欄位                             | 類型       | 其含義                                            |
| -------------------------------- | ---------- | ------------------------------------------------- |
| `speechProviders`                | `string[]` | 此外掛擁有的語音提供者 ID。                       |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛擁有的即時轉錄提供者 ID。                   |
| `realtimeVoiceProviders`         | `string[]` | 此外掛擁有的即時語音提供者 ID。                   |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛擁有的媒體理解提供者 ID。                   |
| `imageGenerationProviders`       | `string[]` | 此外掛擁有的圖像生成提供者 ID。                   |
| `videoGenerationProviders`       | `string[]` | 此外掛擁有的影片生成提供者 ID。                   |
| `webFetchProviders`              | `string[]` | 此外掛擁有的 Web 抓取提供者 ID。                  |
| `webSearchProviders`             | `string[]` | 此外掛擁有的 Web 搜尋提供者 ID。                  |
| `tools`                          | `string[]` | 此外掛擁有的 Agent 工具名稱，用於打包的合約檢查。 |

## channelConfigs 參考

當通道外掛需要在執行環境載入前取得低成本設定中繼資料時，請使用 `channelConfigs`。

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

| 欄位          | 類型                     | 其含義                                                           |
| ------------- | ------------------------ | ---------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每個聲明的通道配置項目都需要。   |
| `uiHints`     | `Record<string, object>` | 該通道配置區段的可選 UI 標籤/預留位置/敏感提示。                 |
| `label`       | `string`                 | 當執行時元數據尚未準備好時，合併到選擇器和檢視介面中的通道標籤。 |
| `description` | `string`                 | 用於檢視和目錄介面的簡短通道描述。                               |
| `preferOver`  | `string[]`               | 此通道在選擇介面中應超越的舊版或較低優先級的外掛程式 ID。        |

## modelSupport 參考

當 OpenClaw 應該在 外掛程式執行時載入之前從簡寫模型 ID（如 `gpt-5.4` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 應用以下優先順序：

- 明確的 `provider/model` 參考使用擁有的 `providers` 清單元數據
- `modelPatterns` 優於 `modelPrefixes`
- 如果一個非捆綁外掛程式和一個捆綁外掛程式都匹配，則非捆綁外掛程式獲勝
- 其餘的歧義將被忽略，直到使用者或配置指定提供者為止

欄位：

| 欄位            | 類型       | 含義                                                  |
| --------------- | ---------- | ----------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 與簡寫模型 ID 匹配的前綴。          |
| `modelPatterns` | `string[]` | 在移除設定檔後綴後，與簡寫模型 ID 匹配的 Regex 來源。 |

舊版頂層功能鍵已被棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts`；正常的清單載入不再將這些頂層欄位視為功能所有權。

## 清單與 package. 的比較

這兩個檔案各有不同的用途：

| 檔案                   | 用於                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、配置驗證、授權選擇元資料，以及必須在插件程式碼執行前存在的 UI 提示             |
| `package.json`         | npm 元資料、依賴項安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊 |

如果您不確定某段元資料應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入插件程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它是關於打包、進入檔案或 npm 安裝行為，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

一些執行前期的插件元資料刻意存放在 `package.json` 中的
`openclaw` 區塊下，而不是 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 意義                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生插件進入點。                                                                   |
| `openclaw.setupEntry`                                             | 在入門和延遲通道啟動期間使用的輕量級僅設定進入點。                                     |
| `openclaw.channel`                                                | 輕量級通道目錄元資料，如標籤、文件路徑、別名和選擇複製文字。                           |
| `openclaw.channel.configuredState`                                | 輕量級設定狀態檢查器元資料，無需載入完整通道執行時即可回答「僅環境設定是否已存在？」。 |
| `openclaw.channel.persistedAuthState`                             | 輕量級持久授權檢查器元資料，無需載入完整通道執行時即可回答「是否已經登入？」。         |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 用於套件和外部發布插件的安裝/更新提示。                                                |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時，首選的安裝路徑。                                               |
| `openclaw.install.minHostVersion`                                 | 最低支援的 OpenClaw 主機版本，使用 semver 下限如 `>=2026.3.22`。                       |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當配置無效時，允許狹窄的套件插件重新安裝復原路徑。                                     |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅設定的通道介面在啟動期間於完整通道插件載入前載入。                                 |

`openclaw.install.minHostVersion` 在安裝和 manifest registry 載入期間會被強制執行。無效的值會被拒絕；較新但有效的值會在較舊的主機上跳過該外掛。

`openclaw.install.allowInvalidConfigRecovery` 的範圍故意設得很窄。它並不能讓任意錯誤的配置變得可安裝。目前它僅允許安裝流程從特定的陳舊套件外掛升級失敗中恢復，例如遺失套件外掛路徑或同一套件外掛的過時 `channels.<id>` 條目。不相關的配置錯誤仍會阻擋安裝，並將操作員引導至 `openclaw doctor --fix`。

`openclaw.channel.persistedAuthState` 是一個小型檢查器模組的套件元資料：

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

當設定、doctor 或 configured-state 流程需要在完整 channel 外掛載入之前進行廉價的是/否驗證探測時，請使用它。目標匯出應該是一個僅讀取持久化狀態的小型函數；請勿將其路由通過完整的 channel runtime barrel。

`openclaw.channel.configuredState` 遵循相同的形狀，用於僅基於 env 的廉價配置檢查：

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

當 channel 可以從 env 或其他微小的非 runtime 輸入回答 configured-state 時使用它。如果檢查需要完整的配置解析或真實的 channel runtime，請將該邏輯保留在外掛的 `config.hasConfiguredState` hook 中。

## JSON Schema 需求

- **每個外掛必須附帶一個 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 在配置讀取/寫入時進行驗證，而不是在 runtime。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非 channel id 是由外掛 manifest 宣告的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必須參照**可發現**的外掛 id。未知的 id 是**錯誤**。
- 如果外掛已安裝但 manifest 或 schema 損壞或遺失，驗證會失敗，Doctor 會回報外掛錯誤。
- 如果外掛配置存在但外掛已**停用**，配置會被保留，並在 Doctor + 日誌中顯示**警告**。

請參閱 [Configuration reference](/en/gateway/configuration) 以了解完整的 `plugins.*` schema。

## 備註

- 此清單對於**原生 OpenClaw 外掛程式**是必需的，包括本機檔案系統載入。
- 執行時間仍會單獨載入外掛模組；該清單僅用於發現和驗證。
- 原生清單是使用 JSON5 解析的，因此只要最終值仍為物件，就接受註解、尾隨逗號和未加引號的鍵。
- 清單載入器僅會讀取已記錄的清單欄位。請避免在此處新增自訂頂層鍵。
- `providerAuthEnvVars` 是用於驗證探測、env-marker 驗證和類似提供者驗證介面的低成本中繼資料路徑，這些介面不應僅為了檢查環境名稱就啟動外掛執行時間。
- `channelEnvVars` 是用於 shell-env 後備、設定提示和類似通道介面的低成本中繼資料路徑，這些介面不應僅為了檢查環境名稱就啟動外掛執行時間。
- `providerAuthChoices` 是用於驗證選擇器、`--auth-choice` 解析、偏好提供者對應，以及在提供者執行時間載入之前註冊簡單入門 CLI 旗標的低成本中繼資料路徑。對於需要提供者程式碼的執行時間嚮導中繼資料，請參閱
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的外掛種類是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine`
    選取的（預設值：內建 `legacy`）。
- 當外掛不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的外掛相依於原生模組，請記錄建置步驟和任何套件管理員允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相關

- [Building Plugins](/en/plugins/building-plugins) — 開始使用外掛
- [Plugin Architecture](/en/plugins/architecture) — 內部架構
- [SDK Overview](/en/plugins/sdk-overview) — 外掛 SDK 參考
