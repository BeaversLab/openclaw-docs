---
summary: "外掛程式清單 + JSON 結構描述要求（嚴格的設定驗證）"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "外掛程式清單"
---

# 外掛程式清單 (openclaw.plugin.)

此頁面僅適用於 **原生 OpenClaw 外掛程式清單**。

關於相容的套件佈局，請參閱 [外掛程式套件](/en/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex 套件： `.codex-plugin/plugin.json`
- Claude 套件： `.claude-plugin/plugin.json` 或沒有清單的預設 Claude 元件
  佈局
- Cursor 套件： `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但它們不會根據此處描述的
`openclaw.plugin.json` 結構描述進行驗證。

對於相容套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料以及宣告的
技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值，和
支援的 Hook 套件。

每個原生 OpenClaw 外掛程式 **必須** 在 **外掛程式根目錄** 中提供一個
`openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證設定，
**而不需執行外掛程式碼**。遺失或無效的清單會被視為
外掛程式錯誤，並會阻擋設定驗證。

請參閱完整的外掛程式系統指南：[外掛程式](/en/tools/plugin)。
關於原生能力模型和目前的外部相容性指引：
[能力模型](/en/plugins/architecture#public-capability-model)。

## 此檔案的用途

`openclaw.plugin.json` 是 OpenClaw 在載入您的
外掛程式碼之前所讀取的中繼資料。

將其用於：

- 外掛程式身分識別
- 設定驗證
- 應該在啟動外掛程式執行時期之前可用的驗證和上架中繼資料
- 設定 UI 提示

請勿將其用於：

- 註冊執行時期行為
- 宣告程式碼進入點
- npm install 中繼資料

這些內容應屬於您的外掛程式碼和 `package.json`。

## 基本範例

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

| 欄位                  | 必要 | 類型                             | 含義                                                                                               |
| --------------------- | ---- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                  | 是   | `string`                         | 標準外掛程式 ID。這是在 `plugins.entries.<id>` 中使用的 ID。                                       |
| `configSchema`        | 是   | `object`                         | 此外掛程式設定的內嵌 JSON Schema。                                                                 |
| `enabledByDefault`    | 否   | `true`                           | 將打包的外掛程式標記為預設啟用。若省略此項，或設為任何非 `true` 的值，則此外掛程式預設為停用狀態。 |
| `kind`                | 否   | `"memory"` \| `"context-engine"` | 宣告由 `plugins.slots.*` 使用的專屬外掛程式類型。                                                  |
| `channels`            | 否   | `string[]`                       | 此外掛程式擁有的頻道 ID。用於探索與設定驗證。                                                      |
| `providers`           | 否   | `string[]`                       | 此外掛程式擁有的供應商 ID。                                                                        |
| `providerAuthEnvVars` | 否   | `Record<string, string[]>`       | OpenClaw 可在不載入外掛程式碼的情況下檢查的輕量級供應商驗證環境元資料。                            |
| `providerAuthChoices` | 否   | `object[]`                       | 用於入門選擇器、偏好供應商解析以及簡單 CLI 旗標連線的輕量級驗證選擇元資料。                        |
| `skills`              | 否   | `string[]`                       | 要載入的技能目錄，相對於外掛程式根目錄。                                                           |
| `name`                | 否   | `string`                         | 人類可讀的外掛程式名稱。                                                                           |
| `description`         | 否   | `string`                         | 顯示於外掛程式介面的簡短摘要。                                                                     |
| `version`             | 否   | `string`                         | 資訊用途的外掛程式版本。                                                                           |
| `uiHints`             | 否   | `Record<string, object>`         | 設定欄位的 UI 標籤、預留位置與敏感性提示。                                                         |

## providerAuthChoices 參考資料

每個 `providerAuthChoices` 項目描述一個入門或驗證選擇。
OpenClaw 會在載入供應商執行環境之前讀取此資料。

| 欄位               | 必要 | 類型                                            | 含義                                                                    |
| ------------------ | ---- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `provider`         | 是   | `string`                                        | 此選擇所屬的供應商 ID。                                                 |
| `method`           | 是   | `string`                                        | 要分派至的驗證方法 ID。                                                 |
| `choiceId`         | 是   | `string`                                        | 用於入門和 CLI 流程的穩定 auth-choice id。                              |
| `choiceLabel`      | 否   | `string`                                        | 使用者可見的標籤。如果省略，OpenClaw 會回退到 `choiceId`。              |
| `choiceHint`       | 否   | `string`                                        | 選擇器的簡短輔助文字。                                                  |
| `groupId`          | 否   | `string`                                        | 用於將相關選項分組的群組 ID (可選)。                                    |
| `groupLabel`       | 否   | `string`                                        | 該群組的使用者可見標籤。                                                |
| `groupHint`        | 否   | `string`                                        | 該群組的簡短輔助文字。                                                  |
| `optionKey`        | 否   | `string`                                        | 簡單單一標誌認證流程的內部選項鍵。                                      |
| `cliFlag`          | 否   | `string`                                        | CLI 標誌名稱，例如 `--openrouter-api-key`。                             |
| `cliOption`        | 否   | `string`                                        | 完整的 CLI 選項形狀，例如 `--openrouter-api-key <key>`。                |
| `cliDescription`   | 否   | `string`                                        | 用於 CLI 說明的描述。                                                   |
| `onboardingScopes` | 否   | `Array<"text-inference" \| "image-generation">` | 此選項應出現在哪些入門介面中。如果省略，則預設為 `["text-inference"]`。 |

## uiHints 參考資料

`uiHints` 是一個從設定欄位名稱到小型渲染提示的對應。

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
| `label`       | `string`   | 使用者可見的欄位標籤。   |
| `help`        | `string`   | 簡短輔助文字。           |
| `tags`        | `string[]` | 可選的 UI 標籤。         |
| `advanced`    | `boolean`  | 將欄位標記為進階。       |
| `sensitive`   | `boolean`  | 將欄位標記為機密或敏感。 |
| `placeholder` | `string`   | 表單輸入的佔位符文字。   |

## Manifest 與 package. 的對比

這兩個檔案用於不同的用途：

| 檔案                   | 用於                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| `openclaw.plugin.json` | 在插件程式碼執行前必須存在的探索、設定驗證、授權選擇中繼資料和 UI 提示        |
| `package.json`         | 用於進入點和設定或目錄中繼資料的 npm 中繼資料、相依性安裝以及 `openclaw` 區塊 |

如果您不確定某段中繼資料應放在哪裡，請使用此規則：

- 如果 OpenClaw 必須在載入插件程式碼之前知道它，請將其放在 `openclaw.plugin.json` 中
- 如果它是關於打包、進入檔案或 npm install 行為，請將其放在 `package.json` 中

## JSON Schema 需求

- **每個插件都必須附帶 JSON Schema**，即使它不接受任何設定。
- 空的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在設定讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非頻道 ID 已由
  插件清單宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照**可發現**的插件 ID。未知的 ID 是**錯誤**。
- 如果已安裝插件但其清單或 schema 損壞或缺失，
  驗證會失敗，且 Doctor 會回報插件錯誤。
- 如果插件設定存在但插件已**停用**，則會保留設定，
  並在 Doctor + 記錄中顯示**警告**。

請參閱[設定參考](/en/gateway/configuration)以取得完整的 `plugins.*` schema。

## 備註

- 原生 OpenClaw 插件**需要清單**，包括本地檔案系統載入。
- 執行時仍然會單獨載入插件模組；清單僅用於
  探索 + 驗證。
- 清單載入器僅會讀取記載的清單欄位。避免在此處
  新增自訂的頂層鍵。
- `providerAuthEnvVars` 是用於授權探測、env-marker
  驗證和類似的提供者授權介面的低成本中繼資料路徑，這些介面不應僅為了檢查環境變數名稱而啟動插件
  執行時。
- `providerAuthChoices` 是用於 auth-choice pickers 的輕量級元資料路徑、
  `--auth-choice` 解析、首選提供者映射以及簡單的入門
  CLI 標誌註冊，且在提供者執行時間載入之前。對於需要提供者程式碼的
  執行時間精靈元資料，請參閱
  [Provider runtime hooks](/en/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件類型是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine`
    選取的 (預設值：內建 `legacy`)。
- 當插件不需要時，可以省略 `channels`、`providers` 和 `skills`。
- 如果您的插件依賴於原生模組，請記錄建置步驟以及任何
  套件管理器允許清單要求 (例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。
