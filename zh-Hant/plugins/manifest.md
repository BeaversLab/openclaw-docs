---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building a OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin Manifest"
---

# Plugin manifest (openclaw.plugin.)

此頁面僅針對 **原生 OpenClaw plugin manifest**。

關於相容的 bundle 版面配置，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的 bundle 格式使用不同的 manifest 檔案：

- Codex bundle: `.codex-plugin/plugin.json`
- Claude bundle: `.claude-plugin/plugin.json` 或不含 manifest 的預設 Claude 元件
  版面配置
- Cursor bundle: `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測這些 bundle 版面配置，但它們不會根據此處描述的
`openclaw.plugin.json` schema 進行驗證。

對於相容的 bundle，當版面配置符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取 bundle 元資料以及宣告的
skill roots、Claude command roots、Claude bundle `settings.json` 預設值，和
支援的 hook packs。

每個原生 OpenClaw plugin **必須** 在 **plugin root** 中包含一個
`openclaw.plugin.json` 檔案。OpenClaw 使用此 manifest 來驗證設定，
**而無需執行 plugin 程式碼**。遺失或無效的 manifest 會被視為
plugin 錯誤，並會阻擋設定驗證。

請參閱完整的 plugin 系統指南：[Plugins](/zh-Hant/tools/plugin)。

## Required fields

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

Required keys:

- `id` (string)：canonical plugin id。
- `configSchema` (object)：plugin config 的 JSON Schema (inline)。

Optional keys:

- `kind` (string)：plugin kind (例如：`"memory"`、`"context-engine"`)。
- `channels` (array)：由此 plugin 註冊的 channel ids (例如：`["matrix"]`)。
- `providers` (array)：由此 plugin 註冊的 provider ids。
- `providerAuthEnvVars` (object)：以 provider id 為鍵的 auth env vars。當 OpenClaw 應該
  從環境變數解析 provider 憑證而不先載入 plugin 執行時期時，請使用此設定。
- `providerAuthChoices` (array)：由提供者 + 認證方法鍵結的輕量上手/認證選擇元數據。當 OpenClaw 應在認證選擇器、首選提供者解析和 CLI 說明中顯示提供者而不先載入插件執行環境時，請使用此設定。
- `skills` (array)：要載入的技能目錄（相對於插件根目錄）。
- `name` (string)：插件的顯示名稱。
- `description` (string)：簡短插件摘要。
- `uiHints` (object)：用於 UI 渲染的設定欄位標籤/佔位符/敏感標記。
- `version` (string)：插件版本（資訊性）。

### `providerAuthChoices` 結構

每個條目可以聲明：

- `provider`：提供者 ID
- `method`：認證方法 ID
- `choiceId`：穩定的上手/認證選擇 ID
- `choiceLabel` / `choiceHint`：選擇器標籤 + 簡短提示
- `groupId` / `groupLabel` / `groupHint`：分組上手分類元數據
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`：用於簡單認證流程（如 API 金鑰）的可選單一標記 CLI 連線

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

## JSON Schema 要求

- **每個插件必須提供 JSON Schema**，即使它不接受任何設定。
- 空 Schema 是可接受的（例如 `{ "type": "object", "additionalProperties": false }`）。
- Schema 在設定讀取/寫入時驗證，而不是在執行時驗證。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非通道 ID 由插件清單聲明。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須參照**可發現**的插件 ID。未知的 ID 是**錯誤**。
- 如果已安裝插件但清單或 Schema 破損或缺失，
  驗證將失敗，且 Doctor 會回報插件錯誤。
- 如果插件設定存在但插件已**停用**，設定將被保留，並且
  在 Doctor + 日誌中會顯示**警告**。

## 備註

- 清單對於**原生 OpenClaw 外掛是必需的**，包括本地檔案系統載入。
- 執行階段仍然會單獨載入外掛模組；清單僅用於
  探索和驗證。
- `providerAuthEnvVars` 是一種低成本的路徑，用於取得授權探針、env-marker
  驗證以及類似的提供者授權介面，這些介面不應僅為了檢查環境變數名稱而啟動外掛
  執行階段。
- `providerAuthChoices` 是一種低成本的路徑，用於取得授權選擇器、
  `--auth-choice` 解析、偏好的提供者對應，以及在提供者執行階段載入之前的簡單入門
  CLI 標誌註冊。
- 互斥的外掛種類是透過 `plugins.slots.*` 選取的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選取的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選取的
    (預設：內建 `legacy`)。
- 如果您的外掛依賴於原生模組，請記錄建置步驟以及任何
  套件管理員允許清單要求 (例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
