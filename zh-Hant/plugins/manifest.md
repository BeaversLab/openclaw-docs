---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - 您正在建構 OpenClaw 外掛
  - 您需要提供外掛設定 Schema 或對外掛驗證錯誤進行除錯
title: "Plugin Manifest"
---

# Plugin manifest (openclaw.plugin.)

本頁面僅適用於 **原生 OpenClaw 外掛清單**。

關於相容的套件佈局，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的套件格式使用不同的清單檔案：

- Codex bundle: `.codex-plugin/plugin.json`
- Claude bundle: `.claude-plugin/plugin.json` 或預設的 Claude 元件
  佈局（無須清單）
- Cursor bundle: `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些套件佈局，但針對這些佈局不會使用此處所述的 `openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料、宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值，以及支援的 hook pack。

每個原生 OpenClaw 外掛**必須**在 **外掛根目錄** 中包含 `openclaw.plugin.json` 檔案。OpenClaw 使用此清單來驗證設定，而**無須執行外掛程式碼**。遺失或無效的清單將被視為外掛錯誤，並阻擋設定驗證。

請參閱完整的外掛系統指南：[Plugins](/zh-Hant/tools/plugin)。
關於原生功能模型與目前的外部相容性指導：
[Capability model](/zh-Hant/tools/plugin#public-capability-model)。

## 必要欄位

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

必要金鑰：

- `id` (string)：外掛的正式 ID。
- `configSchema` (object)：外掛設定的 JSON Schema（內嵌）。

選用金鑰：

- `kind` (string)：外掛種類（例如：`"memory"`、`"context-engine"`）。
- `channels` (array)：由此外掛註冊的頻道 ID（頻道功能；例如：`["matrix"]`）。
- `providers` (array)：由此外掛註冊的提供者 ID（文字推論功能）。
- `providerAuthEnvVars` (物件)：依提供者 ID 索引的認證環境變數。當 OpenClaw 應在未先載入外掛執行時間的情況下從環境變數解析提供者憑證時，請使用此選項。
- `providerAuthChoices` (陣列)：依提供者 + 認證方法索引的低廉入門/認證選擇元資料。當 OpenClaw 應在未先載入外掛執行時間的情況下，在認證選擇選擇器、偏好提供者解析和 CLI 說明中顯示提供者時，請使用此選項。
- `skills` (陣列)：要載入的技能目錄 (相對於外掛根目錄)。
- `name` (字串)：外掛的顯示名稱。
- `description` (字串)：簡短的外掛摘要。
- `uiHints` (物件)：用於 UI 轉譯的設定欄位標籤/預留位置/敏感旗標。
- `version` (字串)：外掛版本 (資訊性)。

### `providerAuthChoices` 形狀

每個項目可以宣告：

- `provider`：提供者 ID
- `method`：認證方法 ID
- `choiceId`：穩定的入門/認證選擇 ID
- `choiceLabel` / `choiceHint`：選擇器標籤 + 簡短提示
- `groupId` / `groupLabel` / `groupHint`：分組入門區塊元資料
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`：針對簡單認證流程 (例如 API 金鑰) 的可選單旗標 CLI 連線

範例：

```json
{
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
      "cliDescription": "OpenRouter API key"
    }
  ]
}
```

## JSON Schema 需求

- **每個外掛都必須提供 JSON Schema**，即使它不接受任何設定。
- 空白的 schema 是可接受的 (例如 `{ "type": "object", "additionalProperties": false }`)。
- Schema 會在設定讀取/寫入時進行驗證，而不是在執行時間。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非頻道 ID 是由外掛清單宣告的。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*` 必須參照**可被發現的** 外掛 ID。未知的 ID 是**錯誤**。
- 如果外掛程式已安裝但其清單或架構損壞或缺失，
  驗證將會失敗，且 Doctor 會回報此外掛程式錯誤。
- 如果外掛程式設定存在但外掛程式已**停用**，該設定會被保留，
  且 Doctor 和日誌中會顯示一個**警告**。

如需完整的 `plugins.*` 架構，請參閱[設定參考](/zh-Hant/configuration)。

## 備註

- 對於原生 OpenClaw 外掛程式（包括本地檔案系統載入），清單是**必要項目**。
- 執行時仍會單獨載入外掛程式模組；清單僅用於
  探索與驗證。
- `providerAuthEnvVars` 是驗證探測、環境標記
  驗證以及類似的提供者驗證介面的低成本元資料路徑，這些介面不應僅為了檢查環境名稱就啟動外掛程式
  執行時。
- `providerAuthChoices` 是驗證選擇器、
  `--auth-choice` 解析、偏好提供者對應以及在提供者執行時載入之前的簡單入門
  CLI 旗標註冊的低成本元資料路徑。對於需要提供者程式碼的執行時嚮導
  元資料，請參閱
  [Provider runtime hooks](/zh-Hant/tools/plugin#provider-runtime-hooks)。
- 互斥的外掛程式類型是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選取的
    (預設：內建 `legacy`)。
- 如果您的外掛程式相依於原生模組，請記錄建置步驟及任何
  套件管理員允許清單要求 (例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
