---
summary: "使用 defineToolPlugin 和 openclaw plugins init/build/validate 構建簡單的類型化代理工具"
title: "工具插件"
sidebarTitle: "工具插件"
read_when:
  - You want to build a simple OpenClaw plugin that only adds agent tools
  - You want to use defineToolPlugin instead of hand-writing plugin manifest metadata
  - You need to scaffold, generate, validate, test, or publish a tool-only plugin
---

工具插件在不新增通道、模型提供者、Hook、服務或設置後端的情況下，將可供代理呼叫的工具新增至 OpenClaw。當外掛擁有固定的工具清單，且您希望 OpenClaw 生成清單元數據，以便在不載入執行時代碼的情況下讓這些工具可被發現時，請使用 `defineToolPlugin`。

建議的流程如下：

1. 使用 `openclaw plugins init` 建立（腳手架）一個套件。
2. 使用 `defineToolPlugin` 撰寫工具。
3. 建置 JavaScript。
4. 使用 `openclaw plugins build` 生成 `openclaw.plugin.json` 和 `package.json` 元數據。
5. 在發布或安裝之前驗證生成的元數據。

對於提供者、通道、Hook、服務或混合功能外掛，請改為從 [建置外掛](/zh-Hant/plugins/building-plugins)、[通道外掛](/zh-Hant/plugins/sdk-channel-plugins) 或 [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) 開始。

## 需求

- Node >= 22。
- TypeScript ESM 套件輸出。
- 用於配置和工具參數架構的 `typebox`。
- `openclaw >=2026.5.17`，第一個匯出 `openclaw/plugin-sdk/tool-plugin` 的 OpenClaw 版本。
- 可以發送 `dist/`、`openclaw.plugin.json` 和 `package.json` 的套件根目錄。

生成的外掛在執行時匯入 `typebox`，因此請將 `typebox` 保留在 `dependencies` 中，而不僅僅是 `devDependencies`。

## 快速入門

建立一個新的外掛套件：

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

腳手架會建立：

- `src/index.ts`：一個帶有 `echo` 工具的 `defineToolPlugin` 項目。
- `src/index.test.ts`：一個小型的元數據測試。
- `tsconfig.json`：輸出到 `dist/` 的 NodeNext TypeScript。
- `package.json`：腳本、執行時期相依性以及
  `openclaw.extensions: ["./dist/index.js"]`。
- `openclaw.plugin.json`：針對初始工具產生的清單元資料。

預期的驗證輸出：

```text
Plugin stock-quotes is valid.
```

## 撰寫工具

`defineToolPlugin` 接收外掛身分、選用的設定架構以及
靜態的工具清單。參數與設定型別會從 TypeBox
架構推斷。

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quote snapshots.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "Quote API key." })),
    baseUrl: Type.Optional(Type.String({ description: "Quote API base URL." })),
  }),
  tools: (tool) => [
    tool({
      name: "stock_quote",
      label: "Stock Quote",
      description: "Fetch a stock quote snapshot.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol, for example OPEN." }),
      }),
      async execute({ symbol }, config, context) {
        context.signal?.throwIfAborted();
        return {
          symbol: symbol.toUpperCase(),
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl ?? "https://api.example.com",
        };
      },
    }),
  ],
});
```

工具名稱是穩定的 API。請選擇獨特、小寫且
足夠具體的名稱，以避免與核心工具或其他外掛衝突。

## 選用與工廠工具

當使用者應在工具傳送至模型前明確將其加入允許清單時，請設定 `optional: true`：

```typescript
tool({
  name: "workflow_run",
  description: "Run an external workflow.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

`openclaw plugins build` 會寫入對應的 `toolMetadata.<tool>.optional`
清單項目，讓 OpenClaw 能在不必載入外掛
執行時期程式碼的情況下探索該工具。

當工具需要在建立之前先取得執行時期工具內容時，請使用 `factory`。工廠讓中繼資料保持靜態，同時允許工具針對特定執行選擇退出、
檢查沙盒狀態或綁定執行時期輔助程式。

```typescript
tool({
  name: "local_workflow",
  description: "Run a local workflow outside sandboxed sessions.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  factory({ api, toolContext }) {
    if (toolContext.sandboxed) {
      return null;
    }
    return createLocalWorkflowTool(api);
  },
});
```

工廠依然適用於固定的工具名稱。當外掛動態計算工具名稱，或將工具與 Hook、
服務、供應商、指令或其他執行時期介面結合時，請直接使用 `definePluginEntry`。

## 回傳值

`defineToolPlugin` 會將一般回傳值包裝成 OpenClaw 工具結果
格式：

- 當模型應該看到該精確文字時，請回傳字串。
- 當您希望模型看到格式化的 JSON
  並讓 OpenClaw 在 `details` 中保留原始值時，請回傳 JSON 相容值。

```typescript
tool({
  name: "echo_text",
  description: "Echo input text.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => input,
});
```

```typescript
tool({
  name: "echo_json",
  description: "Echo input as structured JSON.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => ({ input, length: input.length }),
});
```

當您需要回傳自訂 `AgentToolResult` 或重複
使用現有 `api.registerTool` 實作時，請使用工廠工具。當您需要完全動態的工具或混合外掛
功能時，請使用 `definePluginEntry` 而不使用
`defineToolPlugin`。

## 設定

`configSchema` 是選用的。如果您省略它，OpenClaw 會使用嚴格的空白物件
架構，且產生的清單仍會包含 `configSchema`。

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "No Config Tools",
  description: "Adds tools that do not need configuration.",
  tools: () => [],
});
```

當您包含 `configSchema` 時，第二個 `execute` 引數會根據
架構進行型別標註：

```typescript
const configSchema = Type.Object({
  apiKey: Type.String(),
});

export default defineToolPlugin({
  id: "configured-tools",
  name: "Configured Tools",
  description: "Adds configured tools.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "configured_ping",
      description: "Check whether configuration is available.",
      parameters: Type.Object({}),
      execute: (_params, config) => ({ hasKey: config.apiKey.length > 0 }),
    }),
  ],
});
```

OpenClaw 會從 Gateway 設定中的 plugin 項目讀取外掛程式設定。請勿在原始碼或文件範例中硬編碼機密。請根據外掛程式的安全性模型，使用設定、環境變數或 SecretRefs。

## 生成的元資料

OpenClaw 從冷元資料探索已安裝的外掛程式。它必須能在匯入外掛程式執行時代碼之前讀取外掛程式清單。`defineToolPlugin` 因此會公開靜態元資料，而 `openclaw plugins build` 則會將該元資料寫入套件中。

在變更外掛程式 ID、名稱、描述、設定結構描述、啟動或工具名稱後，請執行產生器：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

對於單一工具的外掛程式，產生的清單如下所示：

```json
{
  "id": "stock-quotes",
  "name": "Stock Quotes",
  "description": "Fetch stock quote snapshots.",
  "version": "0.1.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  },
  "activation": {
    "onStartup": true
  },
  "contracts": {
    "tools": ["stock_quote"]
  }
}
```

`contracts.tools` 是重要的探索合約。它告訴 OpenClaw 每個工具屬於哪個外掛程式，而不需要載入每個已安裝的外掛程式執行時。如果清單過時，工具可能會在探索中遺失，或者註冊錯誤可能歸咎於錯誤的外掛程式。

## 套件元資料

對於簡單的工具外掛程式工作流程，`openclaw plugins build` 會將 `package.json` 對齊到選定的單一執行時項目：

```json
{
  "type": "module",
  "files": ["dist", "openclaw.plugin.json", "README.md"],
  "dependencies": {
    "typebox": "^1.1.38"
  },
  "peerDependencies": {
    "openclaw": ">=2026.5.17"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

對於已安裝的套件，請使用建置的 JavaScript，例如 `./dist/index.js`。來源項目在工作區開發中很有用，但已發佈的套件不應依賴 TypeScript 執行時載入。

## 在 CI 中驗證

當產生的元資料過時時，請使用 `plugins build --check` 讓 CI 失敗，而不重新寫入檔案：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

`plugins validate` 會檢查：

- `openclaw.plugin.json` 存在並通過正常的清單載入器。
- 目前的項目匯出 `defineToolPlugin` 元資料。
- 產生的清單欄位符合項目元資料。
- `contracts.tools` 符合宣告的工具名稱。
- `package.json` 將 `openclaw.extensions` 指向選定的執行時項目。

## 在本機安裝和檢查

從單獨的 OpenClaw 簽出或已安裝的 CLI，安裝套件路徑：

```bash
openclaw plugins install ./stock-quotes
openclaw plugins inspect stock-quotes --runtime
```

對於打包的冒煙測試，請先打包並安裝 tarball：

```bash
npm pack
openclaw plugins install npm-pack:./openclaw-plugin-stock-quotes-0.1.0.tgz
openclaw plugins inspect stock-quotes --runtime --json
```

安裝後，請啟動或重新啟動 Gateway，並要求代理程式使用該工具。如果您正在偵錯工具的可見性，請在變更程式碼之前檢查外掛程式執行時和有效的工具目錄。

## 發佈

當套件準備就緒時，透過 ClawHub 發佈：

```bash
clawhub package publish your-org/stock-quotes --dry-run
clawhub package publish your-org/stock-quotes
```

使用明確的 ClawHub 定位符安裝：

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

在啟動切換期間，仍然支援純 npm 套件規格，但 ClawHub 是 OpenClaw 外掛的首選發現和發佈平台。

## 疑難排解

### `plugin entry not found: ./dist/index.js`

選取的進入檔案不存在。請執行 `npm run build`，然後重新執行
`openclaw plugins build --entry ./dist/index.js` 或
`openclaw plugins validate --entry ./dist/index.js`。

### `plugin entry does not expose defineToolPlugin metadata`

進入點未匯出由 `defineToolPlugin` 建立的值。請檢查模組預設匯出是否為 `defineToolPlugin(...)` 結果，或使用 `--entry` 傳遞正確的進入點。

### `openclaw.plugin.json generated metadata is stale`

資訊清單不再符合進入點元資料。請執行：

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

提交 `openclaw.plugin.json` 和 `package.json` 的變更。

### `package.json openclaw.extensions must include ./dist/index.js`

套件元資料指向不同的執行時期進入點。請執行
`openclaw plugins build --entry ./dist/index.js`，以便產生器將
套件元資料與您打算發佈的進入點對齊。

### `Cannot find package 'typebox'`

建置的外掛在執行時期匯入了 `typebox`。請將 `typebox` 保留在
`dependencies` 中，重新安裝套件相依項，重新建置，並重新執行驗證。

### 安裝後工具未顯示

請依序檢查下列項目：

1. `openclaw plugins inspect <plugin-id> --runtime`
2. `openclaw plugins validate --root <plugin-root> --entry ./dist/index.js`
3. `openclaw.plugin.json` 具有預期工具名稱的 `contracts.tools`。
4. `package.json` 具有 `openclaw.extensions: ["./dist/index.js"]`。
5. 安裝外掛後，已重新啟動或重新載入 Gateway。

## 另請參閱

- [建置外掛](/zh-Hant/plugins/building-plugins)
- [外掛進入點](/zh-Hant/plugins/sdk-entrypoints)
- [外掛 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)
- [外掛資訊清單](/zh-Hant/plugins/manifest)
- [外掛 CLI](/zh-Hant/cli/plugins)
- [ClawHub 發佈](/zh-Hant/clawhub/publishing)
