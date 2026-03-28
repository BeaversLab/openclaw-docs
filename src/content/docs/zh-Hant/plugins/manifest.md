---
summary: "Plugin manifest + JSON schema requirements (strict config validation)"
read_when:
  - You are building an OpenClaw plugin
  - You need to ship a plugin config schema or debug plugin validation errors
title: "Plugin Manifest"
---

# Plugin manifest (openclaw.plugin.)

本頁僅適用於 **native OpenClaw plugin manifest**。

關於相容的 bundle 配置，請參閱 [Plugin bundles](/zh-Hant/plugins/bundles)。

相容的 bundle 格式使用不同的 manifest 檔案：

- Codex bundle: `.codex-plugin/plugin.json`
- Claude bundle: `.claude-plugin/plugin.json` 或不使用 manifest 的預設 Claude 組件配置
- Cursor bundle: `.cursor-plugin/plugin.json`

OpenClaw 也會自動偵測那些 bundle 配置，但它們不會根據此處描述的 `openclaw.plugin.json` schema 進行驗證。

對於相容的套件，當佈局符合 OpenClaw 執行時期預期時，OpenClaw 目前會讀取套件中繼資料以及宣告的技能根目錄、Claude 指令根目錄、Claude 套件 `settings.json` 預設值，還有支援的掛鉤套件。

每個原生 OpenClaw 外掛**必須**在**外掛根目錄**中提供一個 `openclaw.plugin.json` 檔案。OpenClaw 使用此資訊清單來驗證設定**而無須執行外掛程式碼**。遺失或無效的資訊清單將被視為外掛錯誤並阻止設定驗證。

請參閱完整的外掛系統指南：[外掛](/zh-Hant/tools/plugin)。
關於原生功能模型和目前的外部相容性指導方針：
[功能模型](/zh-Hant/plugins/architecture#public-capability-model)。

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

必要鍵：

- `id` (字串)：正式外掛 ID。
- `configSchema` (物件)：外掛程式設定的 JSON Schema (內聯)。

可選鍵：

- `kind` (字串)：外掛程式種類 (範例：`"memory"`、`"context-engine"`)。
- `channels` (陣列)：由此外掛程式註冊的頻道 ID (頻道功能；範例：`["matrix"]`)。
- `providers` (陣列)：由此外掛程式註冊的提供者 ID (文字推斷功能)。
- `providerAuthEnvVars` (物件)：依提供者 ID 索引的 auth 環境變數。當 OpenClaw 應從環境變數解析提供者憑證，而不先載入外掛程式執行階段時使用此項。
- `providerAuthChoices` (array): 依供應商與驗證方法索引的輕量型上手/驗證選擇元資料。當 OpenClaw 應在驗證選擇器、首選供應商解析與 CLI 說明中顯示供應商，且無須先載入外掛程式執行階段時，請使用此設定。
- `skills` (array): 要載入的技能目錄（相對於外掛程式根目錄）。
- `name` (string): 外掛程式的顯示名稱。
- `description` (string): 外掛程式的簡短摘要。
- `uiHints` (object): 用於 UI 呈現的設定欄位標籤/預留位置/敏感性旗標。
- `version` (string): 外掛程式版本（資訊用途）。

### `providerAuthChoices` 結構

每個項目可宣告：

- `provider`: 供應商 ID
- `method`: 驗證方法 ID
- `choiceId`: 穩定的 onboarding/auth-choice id
- `choiceLabel` / `choiceHint`: 選擇器標籤 + 簡短提示
- `groupId` / `groupLabel` / `groupHint`: 分組的 onboarding bucket 中繼資料
- `optionKey` / `cliFlag` / `cliOption` / `cliDescription`: 可選的單一旗標
  CLI 接線，用於簡單的驗證流程，例如 API 金鑰

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

- **每個外掛都必須隨附 JSON Schema**，即使它不接受任何設定。
- 空白的 schema 是可接受的（例如，`{ "type": "object", "additionalProperties": false }`）。
- Schema 會在設定讀取/寫入時進行驗證，而不是在執行時。

## 驗證行為

- 未知的 `channels.*` 鍵是**錯誤**，除非該頻道 id 已由
  外掛清單宣告。
- `plugins.entries.<id>`、`plugins.allow`、`plugins.deny` 和 `plugins.slots.*`
  必須引用**可發現**的 plugin id。未知的 id 屬於**錯誤**。
- 如果外掛程式已安裝但其 manifest 或 schema 損壞或遺失，
  驗證將會失敗，且 Doctor 會回報該外掛程式錯誤。
- 如果外掛程式設定存在但外掛程式已**停用**，該設定將會保留，
  並且 Doctor + 日誌中會顯示**警告**。

請參閱 [Configuration reference](/zh-Hant/configuration) 以取得完整的 `plugins.*` schema。

## 備註

- 對於原生 OpenClaw 外掛程式（包括本地檔案系統載入），manifest 是**必須的**。
- 執行時期仍會單獨載入外掛程式模組；manifest 僅用於
  發現與驗證。
- `providerAuthEnvVars` 是用於驗證探測、環境標記驗證和類似的提供者驗證表面的低成本元數據路徑，這些表面不應僅為了檢查環境名稱而啟動插件運行時。
- `providerAuthChoices` 是用於驗證選擇器、`--auth-choice` 解析、首選提供者映射以及簡單的入門 CLI 標誌註冊（在提供者運行時加載之前）的低成本元數據路徑。對於需要提供者代碼的運行時嚮導元數據，請參閱 [Provider runtime hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)。
- 互斥的插件類型是通過 `plugins.slots.*` 選擇的。
  - `kind: "memory"` 是由 `plugins.slots.memory` 選擇的。
  - `kind: "context-engine"` 是由 `plugins.slots.contextEngine` 選擇的
    （默認值：內置 `legacy`）。
- 如果您的插件依賴於原生模組，請記錄建置步驟以及任何套件管理器允許清單需求（例如，pnpm `allow-build-scripts`
  - `pnpm rebuild <package>`）。
