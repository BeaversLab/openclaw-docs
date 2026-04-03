---
summary: "外掛程式清單 + JSON 結構描述需求 (嚴格配置驗證)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

關於相容的套件佈局，請參閱 [外掛程式套件](/en/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex 套件：`.codex-plugin/plugin.json`
- Claude 套件：`.claude-plugin/plugin.json` 或是不含清單的預設 Claude 元件
  佈局
- Cursor 套件：`.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但它們不會根據此處描述的 `openclaw.plugin.json` 結構描述進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料，以及宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值和支援的 hook 套件。

每個原生 OpenClaw 外掛程式**必須**在 **外掛程式根目錄**中提供一個 `openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證設定，**而無需執行外掛程式碼**。遺失或無效的清單會被視為外掛程式錯誤，並阻擋設定驗證。

請參閱完整的外掛程式系統指南：[外掛程式](/en/tools/plugin)。
關於原生功能模型和目前的外部相容性指導原則：
[功能模型](/en/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的外掛程式碼之前讀取的中繼資料。

將其用於：

- 外掛程式身分識別
- 設定驗證
- 應該在啟動外掛程式執行時期之前可用的驗證和上架中繼資料
- 用於套件相容性接線和合約覆蓋率的靜態功能擁有權快照
- 設定 UI 提示

請勿將其用於：

- 註冊執行時行為
- 宣告程式碼進入點
- npm install 中繼資料

這些項目應屬於您的外掛程式碼和 `package.json`。

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
  "cliBackends": ["openrouter-cli"],
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

| 欄位                  | 必要 | 類型                       | 說明                                                                                                     |
| --------------------- | ---- | -------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `id`                  | 是   | `string`                   | 外掛程式的標準 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                           |
| `configSchema`        | 是   | `object`                   | 此外掛程式設定的內嵌 JSON Schema。                                                                       |
| `enabledByDefault`    | 否   | `true`                     | 將打包外掛程式標記為預設啟用。若要讓外掛程式預設為停用狀態，請省略此欄位，或將其設為任何非 `true` 的值。 |
| `kind`                | 否   | `"memory"`                 | `"context-engine"`                                                                                       | 宣告 `plugins.slots.*` 使用的獨佔外掛程式類型。 |
| `channels`            | 否   | `string[]`                 | 此外掛程式擁有的頻道 ID。用於探索和設定驗證。                                                            |
| `providers`           | 否   | `string[]`                 | 此外掛程式擁有的提供者 ID。                                                                              |
| `cliBackends`         | 否   | `string[]`                 | 此外掛程式擁有的 CLI 推理後端 ID。用於透過明確配置參照進行啟動時自動啟用。                               |
| `providerAuthEnvVars` | 否   | `Record<string, string[]>` | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量提供者驗證環境中繼資料。                                  |
| `providerAuthChoices` | 否   | `object[]`                 | 用於入門選擇器、首選提供者解析及簡單 CLI 旗標接線的輕量驗證選擇中繼資料。                                |
| `contracts`           | 否   | `object`                   | 針對語音、媒體理解、圖像生成、網頁搜尋及工具所有權的靜態整合功能快照。                                   |
| `skills`              | 否   | `string[]`                 | 要載入的技能目錄，相對於外掛根目錄。                                                                     |
| `name`                | 否   | `string`                   | 人類可讀的外掛名稱。                                                                                     |
| `description`         | 否   | `string`                   | 在外掛介面中顯示的簡短摘要。                                                                             |
| `version`             | 否   | `string`                   | 資訊性外掛版本。                                                                                         |
| `uiHints`             | 否   | `Record<string, object>`   | 設定欄位的 UI 標籤、佔位符和敏感度提示。                                                                 |

## providerAuthChoices 參考

每個 `providerAuthChoices` 項目描述一個入門或驗證選項。
OpenClaw 會在提供者運行時載入之前讀取此內容。

| 欄位               | 必要 | 類型                                            | 含義                                                                    |
| ------------------ | ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`         | 是   | `string`                                        | 此選項所屬的提供者 ID。                                                 |
| `method`           | 是   | `string`                                        | 要分派的驗證方法 ID。                                                   |
| `choiceId`         | 是   | `string`                                        | 上架流程和 CLI 流程使用的穩定驗證選擇 ID。                              |
| `choiceLabel`      | 否   | `string`                                        | 使用者可見的標籤。如果省略，OpenClaw 會回退到 `choiceId`。              |
| `choiceHint`       | 否   | `string`                                        | 選擇器的簡短說明文字。                                                  |
| `groupId`          | 否   | `string`                                        | 用於將相關選項分組的選用群組 ID。                                       |
| `groupLabel`       | 否   | `string`                                        | 該群組的使用者可見標籤。                                                |
| `groupHint`        | 否   | `string`                                        | 該群組的簡短說明文字。                                                  |
| `optionKey`        | 否   | `string`                                        | 用於簡單單一標誌驗證流程的內部選項鍵。                                  |
| `cliFlag`          | 否   | `string`                                        | CLI 標誌名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`        | 否   | `string`                                        | 完整的 CLI 選項結構，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`   | 否   | `string`                                        | 用於 CLI 說明的描述。                                                   |
| `onboardingScopes` | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪個引導介面中。如果省略，則預設為 `["text-inference"]`。 |

## uiHints 參考

`uiHints` 是一個從配置欄位名稱到小型渲染提示的映射。

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

每個欄位提示可以包括：

| 欄位          | 類型       | 含義                     |
| ------------- | ---------- | ------------------------ |
| `label`       | `string`   | 面向使用者的欄位標籤。   |
| `help`        | `string`   | 簡短的輔助文字。         |
| `tags`        | `string[]` | 選用的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的預留位置文字。 |

## 合約參考

僅對 OpenClaw 可在不匯入外掛執行時間的情況下讀取的靜態能力擁有權中繼資料使用 `contracts`。

```json
{
  "contracts": {
    "speechProviders": ["openai"],
    "mediaUnderstandingProviders": ["openai", "openai-codex"],
    "imageGenerationProviders": ["openai"],
    "webSearchProviders": ["gemini"],
    "tools": ["firecrawl_search", "firecrawl_scrape"]
  }
}
```

每個清單都是選用的：

| 欄位                          | 類型       | 含義                                                 |
| ----------------------------- | ---------- | ---------------------------------------------------- |
| `speechProviders`             | `string[]` | 此外掛擁有的語音提供者 ID。                          |
| `mediaUnderstandingProviders` | `string[]` | 此外掛程式擁有的媒體理解提供者 ID。                  |
| `imageGenerationProviders`    | `string[]` | 此外掛程式擁有的影像生成提供者 ID。                  |
| `webSearchProviders`          | `string[]` | 此外掛程式擁有的網頁搜尋提供者 ID。                  |
| `tools`                       | `string[]` | 此外掛程式擁有的代理程式工具名稱，用於套件合約檢查。 |

舊版頂層 `speechProviders`、`mediaUnderstandingProviders` 和
`imageGenerationProviders` 已被棄用。請使用 `openclaw doctor --fix` 將它們移至
`contracts` 之下；正常的清單載入不再將其視為能力所有權。

## 資訊清單與 package. 的比較

這兩個檔案用途不同：

| 檔案                   | 用途                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 探索、配置驗證、身份驗證選擇元數據，以及在插件程式碼執行前必須存在的 UI 提示 |
| `package.json`         | npm 元數據、依賴安裝，以及用於入口點和設定或目錄元數據的 `openclaw` 區塊     |

如果您不確定某段元數據應該放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入插件程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它與打包、入口檔案或 npm install 行為有關，請將其放在 `package.json` 中

## JSON Schema 需求

- **每個插件都必須附帶 JSON Schema**，即使它不接受任何配置。
- 空 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在配置讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 金鑰是**錯誤**，除非通道 id 是由
  外掛程式清單宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照**可發現**的外掛程式 id。未知的 id 是**錯誤**。
- 如果外掛程式已安裝但其清單或架構損壞或遺失，
  驗證將失敗，且 Doctor 會回報外掛程式錯誤。
- 如果外掛程式組態存在但外掛程式已**停用**，組態將會保留，
  並且會在 Doctor + 記錄中顯示**警告**。

請參閱 [組態參考](/en/gateway/configuration) 以取得完整的 `plugins.*` 架構。

## 注意事項

- 原生 OpenClaw 外掛程式**必須**提供清單，包括本地檔案系統載入。
- 執行時期仍會單獨載入外掛程式模組；清單僅用於
  探索與驗證。
- 清單載入器僅會讀取已記載的清單欄位。請避免在此新增自訂頂層金鑰。
- `providerAuthEnvVars` 是用於驗證探針、env-marker 驗證以及類似的提供者驗證介面的低成本元資料路徑，這些介面不應僅為了檢查環境變數名稱而啟動外掛程式執行時期。
- `providerAuthChoices` 是用於驗證選擇器、`--auth-choice` 解析、偏好的提供者對應以及在提供者執行時期載入之前的簡單入門 CLI 旗標註冊的低成本元資料路徑。若需要提供者程式碼的執行時期精靈元資料，請參閱 [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的外掛程式類型是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 由 `plugins.slots.contextEngine` 選取
    （預設：內建 `legacy`）。
- 當外掛程式不需要 `channels`、`providers`、
  `cliBackends` 和 `skills` 時，可以將其省略。
- 如果您的外掛程式依賴原生模組，請記錄建置步驟以及任何
  套件管理器允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。

## 相關

- [建置外掛](/en/plugins/building-plugins) — 開始使用外掛
- [外掛架構](/en/plugins/architecture) — 內部架構
- [SDK 概觀](/en/plugins/sdk-overview) — 外掛 SDK 參考資料
