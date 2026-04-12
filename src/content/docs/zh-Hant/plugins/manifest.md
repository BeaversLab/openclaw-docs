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

- Codex bundle: `.codex-plugin/plugin.json`
- Claude bundle: `.claude-plugin/plugin.json` 或沒有 manifest 的預設 Claude 元件佈局
- Cursor bundle: `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測那些套件佈局，但它們不會根據此處描述的 `openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料以及宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值、Claude 套件 LSP 預設值和支援的 hook pack。

每個原生 OpenClaw 外掛程式**必須**在**外掛根目錄**中提供一個 `openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證設定，**而不執行外掛程式碼**。遺失或無效的清單會被視為外掛錯誤，並阻擋設定驗證。

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

這些內容應屬於您的外掛程式碼和 `package.json`。

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

| 欄位                                | 必要 | 類型                             | 含義                                                                                                                               |
| ----------------------------------- | ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | 是   | `string`                         | 標準外掛 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                                                           |
| `configSchema`                      | 是   | `object`                         | 此外掛程式設定的內嵌 JSON Schema。                                                                                                 |
| `enabledByDefault`                  | 否   | `true`                           | 將打包的外掛標記為預設啟用。省略它，或設定任何非 `true` 的值，以保持外掛預設為停用狀態。                                           |
| `legacyPluginIds`                   | 否   | `string[]`                       | 會正規化為此正式外掛程式 ID 的舊版 ID。                                                                                            |
| `autoEnableWhenConfiguredProviders` | 否   | `string[]`                       | 當驗證、設定或模型參照提及這些提供者 ID 時，應該自動啟用此外掛程式。                                                               |
| `kind`                              | 否   | `"memory"` \| `"context-engine"` | 聲明 `plugins.slots.*` 使用的獨佔外掛程式類型。                                                                                    |
| `channels`                          | 否   | `string[]`                       | 此外掛程式擁有的頻道 ID。用於探索和設定驗證。                                                                                      |
| `providers`                         | 否   | `string[]`                       | 此外掛程式擁有的提供者 ID。                                                                                                        |
| `modelSupport`                      | 否   | `object`                         | 資訊清單擁有的簡寫模型系列元數據，用於在執行階段之前自動載入外掛程式。                                                             |
| `cliBackends`                       | 否   | `string[]`                       | 由此外掛擁有的 CLI 推論後端 ID。用於從明確設定參照進行啟動時的自動啟用。                                                           |
| `commandAliases`                    | 否   | `object[]`                       | 此外掛程式擁有的指令名稱，這些指令應在執行階段載入之前產生可辨識外掛程式的設定和 CLI 診斷。                                        |
| `providerAuthEnvVars`               | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量級提供者驗證環境元數據。                                                            |
| `providerAuthAliases`               | 否   | `Record<string, string>`         | 應重複使用另一個提供者 ID 進行驗證查找的提供者 ID，例如共用基底提供者 API 金鑰和驗證設定檔的編碼提供者。                           |
| `channelEnvVars`                    | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量級通道環境元數據。將其用於通用啟動/設定輔助工具應看到的環境驅動通道設定或驗證介面。 |
| `providerAuthChoices`               | 否   | `object[]`                       | 用於上架選擇器、首選提供者解析和簡單 CLI 標誌接線的輕量級驗證選擇元數據。                                                          |
| `contracts`                         | 否   | `object`                         | 用於語音、即時轉錄、即時語音、媒體理解、影像生成、音樂生成、影片生成、網頁擷取、網頁搜尋和工具擁有權的靜態捆綁功能快照。           |
| `channelConfigs`                    | 否   | `Record<string, object>`         | 在執行階段載入之前合併到探索和驗證介面的資訊清單擁有通道配置元數據。                                                               |
| `skills`                            | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛程式根目錄。                                                                                           |
| `name`                              | 否   | `string`                         | 人類可讀的外掛程式名稱。                                                                                                           |
| `description`                       | 否   | `string`                         | 在外掛程式介面中顯示的簡短摘要。                                                                                                   |
| `version`                           | 否   | `string`                         | 資訊性外掛程式版本。                                                                                                               |
| `uiHints`                           | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、預留位置和敏感度提示。                                                                                         |

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個上架或驗證選項。
OpenClaw 會在提供者執行時載入之前讀取此項。

| 欄位                  | 必要 | 類型                                            | 意義                                                                    |
| --------------------- | ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`            | 是   | `string`                                        | 此選項所屬的提供者 ID。                                                 |
| `method`              | 是   | `string`                                        | 要分派到的驗證方法 ID。                                                 |
| `choiceId`            | 是   | `string`                                        | 用於上架和 CLI 流程的穩定驗證選項 ID。                                  |
| `choiceLabel`         | 否   | `string`                                        | 使用者可見的標籤。如果省略，OpenClaw 會回退至 `choiceId`。              |
| `choiceHint`          | 否   | `string`                                        | 選擇器的簡短說明文字。                                                  |
| `assistantPriority`   | 否   | `number`                                        | 較低的數值會在助理驅動的互動式選擇器中排序較前面。                      |
| `assistantVisibility` | 否   | `"visible"` \| `"manual-only"`                  | 在助理選擇器中隱藏該選項，但仍允許手動 CLI 選擇。                       |
| `deprecatedChoiceIds` | 否   | `string[]`                                      | 應將使用者重新導向至此取代選項的舊版選項 ID。                           |
| `groupId`             | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                       |
| `groupLabel`          | 否   | `string`                                        | 該群組的使用者可見標籤。                                                |
| `groupHint`           | 否   | `string`                                        | 該群組的簡短說明文字。                                                  |
| `optionKey`           | 否   | `string`                                        | 用於簡單單一旗標驗證流程的內部選項鍵。                                  |
| `cliFlag`             | 否   | `string`                                        | CLI 旗標名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`           | 否   | `string`                                        | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`      | 否   | `string`                                        | 用於 CLI 說明的描述。                                                   |
| `onboardingScopes`    | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪些入門介面中。如果省略，則預設為 `["text-inference"]`。 |

## commandAliases 參考

當外掛程式擁有一個執行階段指令名稱，而使用者可能會將其誤置於 `plugins.allow` 或嘗試作為根 CLI 指令執行時，請使用 `commandAliases`。OpenClaw 會使用此元資料進行診斷，而不需匯入外掛程式執行階段程式碼。

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
| `name`       | 是   | `string`          | 屬於此外掛程式的指令名稱。                             |
| `kind`       | 否   | `"runtime-slash"` | 將別名標記為聊天斜線指令，而非根 CLI 指令。            |
| `cliCommand` | 否   | `string`          | 相關的根 CLI 指令，用於在 CLI 操作時建議（如果存在）。 |

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

| 欄位          | 類型       | 含義                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 使用者面對的欄位標籤。   |
| `help`        | `string`   | 簡短的說明文字。         |
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## contracts 參考

僅對 OpenClaw 可在無需匯入外掛程式執行階段的情況下讀取的靜態功能擁有權元資料使用 `contracts`。

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

| 欄位                             | 類型       | 含義                                                   |
| -------------------------------- | ---------- | ------------------------------------------------------ |
| `speechProviders`                | `string[]` | 此外掛程式擁有的語音提供者 ID。                        |
| `realtimeTranscriptionProviders` | `string[]` | 此外掛程式擁有的即時轉錄提供者 ID。                    |
| `realtimeVoiceProviders`         | `string[]` | 此外掛程式擁有的即時語音提供者 ID。                    |
| `mediaUnderstandingProviders`    | `string[]` | 此外掛程式擁有的媒體理解提供者 ID。                    |
| `imageGenerationProviders`       | `string[]` | 此外掛程式擁有的影像生成提供者 ID。                    |
| `videoGenerationProviders`       | `string[]` | 此外掛程式擁有的影片生成提供者 ID。                    |
| `webFetchProviders`              | `string[]` | 此外掛程式擁有的網頁擷取提供者 ID。                    |
| `webSearchProviders`             | `string[]` | 此外掛程式擁有的網頁搜尋提供者 ID。                    |
| `tools`                          | `string[]` | 此外掛程式擁有的代理程式工具名稱，用於打包的合約檢查。 |

## channelConfigs 參考

當頻道外掛程式需要在執行時間載入之前取得低成本設定元資料時，請使用 `channelConfigs`。

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

每個頻道項目可以包含：

| 欄位          | 類型                     | 含義                                                                 |
| ------------- | ------------------------ | -------------------------------------------------------------------- |
| `schema`      | `object`                 | `channels.<id>` 的 JSON Schema。每個宣告的頻道設定項目皆為必填。     |
| `uiHints`     | `Record<string, object>` | 該頻道設定區段的可選 UI 標籤/預留位置/敏感提示。                     |
| `label`       | `string`                 | 當執行時間元資料尚未準備就緒時，合併到選擇器和檢視介面中的頻道標籤。 |
| `description` | `string`                 | 用於檢視和目錄介面的簡短頻道描述。                                   |
| `preferOver`  | `string[]`               | 此頻道應在選擇介面中排名高於的舊版或較低優先順序的外掛程式 ID。      |

## modelSupport 參考

當 OpenClaw 應該從簡寫模型 ID（例如 `gpt-5.4` 或 `claude-sonnet-4.6`）推斷您的提供者外掛程式時，請使用 `modelSupport`，且在外掛程式執行時間載入之前進行。

```json
{
  "modelSupport": {
    "modelPrefixes": ["gpt-", "o1", "o3", "o4"],
    "modelPatterns": ["^computer-use-preview"]
  }
}
```

OpenClaw 會套用此優先順序：

- 明確的 `provider/model` 參照使用擁有的 `providers` 宣告元資料
- `modelPatterns` 勝過 `modelPrefixes`
- 如果一個非打包外掛程式和一個打包外掛程式都匹配，則非打包外掛程式獲勝
- 剩餘的歧義會被忽略，直到使用者或配置指定提供者

欄位：

| 欄位            | 類型       | 含義                                                    |
| --------------- | ---------- | ------------------------------------------------------- |
| `modelPrefixes` | `string[]` | 使用 `startsWith` 對照簡寫模型 ID 匹配的前綴。          |
| `modelPatterns` | `string[]` | 在移除配置檔後綴後，對照簡寫模型 ID 匹配的 Regex 來源。 |

舊版頂層功能鍵已棄用。請使用 `openclaw doctor --fix` 將 `speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders` 和 `webSearchProviders` 移至 `contracts` 下；正常的資訊清單載入不再將這些頂層欄位視為功能所有權。

## 資訊清單與 package.

這兩個檔案各有不同的用途：

| 檔案                   | 用途                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openclaw.plugin.json` | 探索、配置驗證、驗證選擇元資料，以及外掛程式碼執行前必須存在的 UI 提示               |
| `package.json`         | npm 元資料、相依性安裝，以及用於進入點、安裝閘道、設定或目錄元資料的 `openclaw` 區塊 |

如果您不確定某段元資料應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入外掛程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它與打包、進入檔案或 npm 安裝行為有關，請將其放在 `package.json` 中

### 影響探索的 package. 欄位

某些執行時期前的外掛元資料刻意放在 `package.json` 中的
`openclaw` 區塊下，而非 `openclaw.plugin.json` 中。

重要範例：

| 欄位                                                              | 含義                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `openclaw.extensions`                                             | 宣告原生外掛進入點。                                                                           |
| `openclaw.setupEntry`                                             | 在導入和延遲通道啟動期間使用的輕量級僅設定進入點。                                             |
| `openclaw.channel`                                                | 廉價的通道目錄元資料，例如標籤、文件路徑、別名和選擇文字。                                     |
| `openclaw.channel.configuredState`                                | 輕量級的配置狀態檢查器元資料，可在不載入完整通道執行時的情況下回答「僅環境設定是否已存在？」。 |
| `openclaw.channel.persistedAuthState`                             | 輕量級的持久化認證檢查器元資料，可在不載入完整通道執行時的情況下回答「是否已登入任何項目？」。 |
| `openclaw.install.npmSpec` / `openclaw.install.localPath`         | 針對套件及外部發布外掛程式的安裝/更新提示。                                                    |
| `openclaw.install.defaultChoice`                                  | 當有多個安裝來源可用時的首選安裝路徑。                                                         |
| `openclaw.install.minHostVersion`                                 | 支援的最低 OpenClaw 主機版本，使用諸如 `>=2026.3.22` 的 semver 下限。                          |
| `openclaw.install.allowInvalidConfigRecovery`                     | 當設定無效時，允許狹窄的套件外掛程式重新安裝復原路徑。                                         |
| `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` | 讓僅設定的通道介面在啟動期間於完整通道外掛程式之前載入。                                       |

`openclaw.install.minHostVersion` 會在安裝期間以及資訊清單註冊表載入時強制執行。無效的值會被拒絕；較新但有效的值會讓外掛程式在較舊的主機上被略過。

`openclaw.install.allowInvalidConfigRecovery` 是刻意設計得狹窄的。它不會讓任意損壞的設定變得可安裝。目前，它僅允許安裝流程從特定的陳舊套件外掛程式升級失敗中復原，例如遺失的套件外掛程式路徑，或同一套件外掛程式的陳舊 `channels.<id>` 項目。不相關的設定錯誤仍會阻擋安裝，並將操作員引導至 `openclaw doctor --fix`。

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

當設定、修復或配置狀態流程需要在完整通道外掛程式載入之前進行低成本的授權偵測時使用它。目標匯出應該是一個僅讀取持久化狀態的小型函式；請勿將其路由透過完整的通道執行時桶。

`openclaw.channel.configuredState` 遵循相同的形狀，以進行低成本的僅環境配置檢查：

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

當通道可以從環境或其他微小的非執行時輸入回答配置狀態時使用它。如果檢查需要完整的設定解析或真實的通道執行時，請將該邏輯保留在外掛程式的 `config.hasConfiguredState` 掛勾中。

## JSON Schema 需求

- **每個插件必須包含 JSON Schema**，即使它不接受任何配置。
- 空的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在配置讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非通道 id 是由
  插件清單聲明的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可發現**的插件 id。未知的 id 是**錯誤**。
- 如果插件已安裝但清單或 schema 損壞或缺失，
  驗證將失敗，且 Doctor 會報告插件錯誤。
- 如果插件配置存在但插件已**停用**，配置將被保留，並且
  在 Doctor + 日誌中會顯示**警告**。

有關完整的 `plugins.*` schema，請參閱 [配置參考](/en/gateway/configuration)。

## 註釋

- 清單對於原生 OpenClaw 插件是**必需的**，包括本地文件系統載入。
- 執行時仍然會單獨載入插件模組；清單僅用於
  發現 + 驗證。
- 原生清單使用 JSON5 解析，因此只要最終值仍然是物件，
  就接受註釋、尾隨逗號和未加引號的鍵。
- 清單載入器僅讀取有記錄的清單欄位。避免在此
  添加自定義頂層鍵。
- `providerAuthEnvVars` 是授權探測、env-marker
  驗證以及類似 provider-auth 介面的低成本元數據路徑，這些介面不應僅為了檢查環境變數名稱
  而啟動插件執行時。
- `providerAuthAliases` 允許提供商變體重用另一個提供商的授權
  環境變數、授權設定檔、配置支援的授權以及 API 金鑰入門選項，
  而無需在核心中硬編碼該關係。
- `channelEnvVars` 是 shell-env 備援、設定
  提示以及類似通道介面的低成本元數據路徑，這些介面不應僅為了檢查環境變數名稱
  而啟動插件執行時。
- `providerAuthChoices` 是授權選擇器、`--auth-choice` 解析、偏好提供者映射以及在提供者執行時載入之前的簡單入門 CLI 標誌註冊的輕量級元資料路徑。對於需要提供者程式碼的執行時精靈元資料，請參閱 [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的外掛類型是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選取的
    （預設值：內建 `legacy`）。
- 當外掛不需要時，可以省略 `channels`、`providers`、`cliBackends` 和 `skills`。
- 如果您的外掛依賴於原生模組，請記錄建置步驟以及任何套件管理器允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相關

- [Building Plugins](/en/plugins/building-plugins) — 外掛入門
- [Plugin Architecture](/en/plugins/architecture) — 內部架構
- [SDK Overview](/en/plugins/sdk-overview) — 外掛 SDK 參考
