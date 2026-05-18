---
summary: "defineToolPlugin、definePluginEntry、defineChannelPluginEntry 與 defineSetupPluginEntry 參考"
title: "Plugin entry points"
sidebarTitle: "Entry Points"
read_when:
  - You need the exact type signature of defineToolPlugin, definePluginEntry, or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

每個外掛都會匯出一個預設的進入點物件。SDK 提供了用於建立這些物件的輔助函式。

對於已安裝的外掛，當有建置好的 JavaScript 可用時，`package.json` 應將執行時期載入指向該檔案：

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

`extensions` 和 `setupEntry` 仍是工作區 和 git 檢出開發的有效來源進入點。當 OpenClaw 載入已安裝的套件時，`runtimeExtensions` 和 `runtimeSetupEntry` 是首選，它們讓 npm 套件能避免執行時期的 TypeScript 編譯。明確的執行時期進入點是必要的：`runtimeSetupEntry` 需要 `setupEntry`，且如果缺少 `runtimeExtensions` 或 `runtimeSetupEntry` 構件，安裝/探索會失敗，而不是靜默地回退到原始碼。如果已安裝的套件僅宣告了 TypeScript 來源進入點，OpenClaw 會在存在時使用相符的建置 `dist/*.js` 同層檔案，然後才回退到 TypeScript 來源。

所有進入點路徑都必須保留在外掛套件目錄內。執行時期進入點和推斷的建置 JavaScript 同層檔案不會讓跳脫的 `extensions` 或 `setupEntry` 來源路徑變為有效。

<Tip>**正在尋找逐步解說？** 請參閱 [Tool Plugins](/zh-Hant/plugins/tool-plugins)、 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) 或 [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) 以取得逐步指南。</Tip>

## `defineToolPlugin`

**Import:** `openclaw/plugin-sdk/tool-plugin`

適用於僅新增代理程式工具 的簡單外掛。`defineToolPlugin` 保持撰寫來源精簡，從 TypeBox 網格 推斷組態和工具參數類型，將純回傳值包裝成 OpenClaw 工具結果格式，並公開 `openclaw plugins build` 寫入外掛清單 的靜態中繼資料。

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quotes.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API key." })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "Quote",
      description: "Fetch a quote.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol." }),
      }),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` 是可選的。如果省略，OpenClaw 會使用嚴格的空物件
  結構描述，而生成的清單仍然包含 `configSchema`。
- `execute` 會傳回純字串或可 JSON 序列化的值。此輔助函式會將其
  包裝為帶有 `details` 的文字工具結果。
- 工具名稱是靜態的。`openclaw plugins build` 根據宣告的工具衍生 `contracts.tools`，
  因此作者不必手動重複名稱。
- 執行時載入保持嚴格。已安裝的外掛仍然需要
  `openclaw.plugin.json` 和 `package.json` `openclaw.extensions`；OpenClaw
  不會執行外掛程式碼來推斷遺失的清單資料。

## `definePluginEntry`

**匯入：** `openclaw/plugin-sdk/plugin-entry`

適用於提供者外掛、進階工具外掛、Hook 外掛，以及任何
**非**訊息傳遞通道的項目。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| 欄位           | 類型                                                             | 必要 | 預設值         |
| -------------- | ---------------------------------------------------------------- | ---- | -------------- |
| `id`           | `string`                                                         | 是   | -              |
| `name`         | `string`                                                         | 是   | -              |
| `description`  | `string`                                                         | 是   | -              |
| `kind`         | `string`                                                         | 否   | -              |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件結構描述 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | -              |

- `id` 必須符合您的 `openclaw.plugin.json` 清單。
- `kind` 是用於專屬插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是用於延遲評估的函式。
- OpenClaw 會在首次存取時解析並記憶該結構描述，因此昂貴的結構描述
  建構器只會執行一次。

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

使用通道特定配線包裝 `definePluginEntry`。自動呼叫
`api.registerChannel({ plugin })`，公開選用的根協助 CLI 中繼資料
接縫，並根據註冊模式設限 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 欄位                  | 類型                                                             | 必要 | 預設值     |
| --------------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`                  | `string`                                                         | 是   | -          |
| `name`                | `string`                                                         | 是   | -          |
| `description`         | `string`                                                         | 是   | -          |
| `plugin`              | `ChannelPlugin`                                                  | 是   | -          |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件架構 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | -          |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | -          |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | -          |

- `setRuntime` 會在註冊期間被呼叫，以便您儲存執行時期參考
  （通常是透過 `createPluginRuntimeStore`）。在 CLI 元資料
  擷取期間會跳過它。
- `registerCliMetadata` 會在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 和
  `api.registrationMode === "full"` 期間執行。
  將其作為通道擁有的 CLI 描述符的規範位置，以便根幫助
  保持非啟用狀態、探索快照包含靜態指令元資料，且
  一般 CLI 指令註冊保持與完整外掛載入相容。
- 探索註冊是非啟用的，而非免匯入的。OpenClaw 可能
  會評估受信任的外掛進入點和通道外掛模組以建構
  快照，因此請確保頂層匯入無副作用，並將 sockets、
  clients、workers 和服務放在 `"full"` 專用路徑之後。
- `registerFull` 僅在 `api.registrationMode === "full"` 時執行。它會在
  僅設定 載入期間被跳過。
- 就像 `definePluginEntry`，`configSchema` 可以是一個惰性工廠，且 OpenClaw
  會在首次存取時將解析後的架構記憶化。
- 對於外掛程式擁有的根 CLI 指令，當您希望該指令保持延遲載入而不從根 CLI 解析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。對於成對節點功能指令，請優先使用 `api.registerNodeCliFeature(...)`，以便該指令位於 `openclaw nodes` 之下。對於其他巢狀外掛程式指令，請新增 `parentPath` 並在傳遞給註冊器的 `program` 物件上註冊指令；OpenClaw 會在呼叫外掛程式之前將其解析為父指令。對於通道外掛程式，請優先從 `registerCliMetadata(...)` 註冊這些描述符，並讓 `registerFull(...)` 專注於僅限執行時期的工作。
- 如果 `registerFull(...)` 也註冊了閘道 RPC 方法，請將它們保留在特定於外掛程式的前綴上。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）總是被強制轉換為 `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

針對輕量級 `setup-entry.ts` 檔案。僅傳回 `{ plugin }`，不包含執行時期或 CLI 接線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當通道被停用、未配置，或啟用延遲載入時，OpenClaw 會載入此項目而不是完整項目。請參閱 [設定與配置](/zh-Hant/plugins/sdk-setup#setup-entry) 以了解這在何時重要。

實務上，請將 `defineSetupPluginEntry(...)` 與狹義的設定輔助程式系列搭配使用：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時期安全的設定輔助程式，例如 `createSetupTranslator`、匯入安全的設定修補配接器、查詢筆記輸出、`promptResolvedAllowFrom`、`splitSetupEntries` 和委派的設定代理程式
- `openclaw/plugin-sdk/channel-setup` 用於選用安裝的設定介面
- `openclaw/plugin-sdk/setup-tools` 用於設定/安裝 CLI/封存/文件輔助程式

請將繁重的 SDK、CLI 註冊和長期執行的執行時期服務保留在完整項目中。

分割設定與執行時層面的打包工作區頻道，可以改用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。該合約讓設定入口保留設定安全的 plugin/secrets 匯出，同時仍公開執行時設定器：

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
});
```

僅當設定流程確實需要在完整頻道入口載入之前使用輕量級執行時設定器時，才使用該打包合約。

## 註冊模式

`api.registrationMode` 告訴您的外掛它是如何被載入的：

| 模式              | 時機                       | 註冊內容                                                                                        |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| `"full"`          | 正常閘道啟動               | 全部                                                                                            |
| `"discovery"`     | 唯讀功能探索               | 頻道註冊加上靜態 CLI 描述符；入口程式碼可能會載入，但跳過 sockets、workers、clients 和 services |
| `"setup-only"`    | 已停用/未設定的頻道        | 僅頻道註冊                                                                                      |
| `"setup-runtime"` | 具備執行時可用性的設定流程 | 頻道註冊加上僅在完整入口載入前所需的輕量級執行時                                                |
| `"cli-metadata"`  | 根說明 / CLI 中繼資料擷取  | 僅 CLI 描述符                                                                                   |

`defineChannelPluginEntry` 會自動處理此分割。如果您直接對頻道使用 `definePluginEntry`，請自行檢查模式：

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

探索模式會建構非啟動式的登錄快照。它可能仍會評估外掛入口和頻道外掛物件，以便 OpenClaw 可以註冊頻道功能和靜態 CLI 描述符。請將探索中的模組評估視為受信任但輕量級的：頂層不得有網路用戶端、子處理程序、監聽器、資料庫連線、背景 worker、憑證讀取或其他即時執行時副作用。

請將 `"setup-runtime"` 視為僅限設定的啟動層面必須存在的視窗，且無需重新進入完整的打包頻道執行時。適合的項目包括頻道註冊、設定安全的 HTTP 路由、設定安全的閘道方法，以及委派的設定輔助程式。繁重的背景服務、CLI 註冊器和提供者/用戶端 SDK 引導程序仍應屬於 `"full"`。

特別針對 CLI 註冊器：

- 當註冊器擁有一或多個根命令，且您希望 OpenClaw 在首次叫用時延遲載入實際的 CLI 模組時，請使用 `descriptors`
- 確保這些描述子涵蓋註冊器暴露的每個頂層命令根
- 將描述子命令名稱限制為字母、數字、連字號和底線，並以字母或數字開頭；OpenClaw 會拒絕此格式之外的描述子名稱，並在呈現說明之前從描述中移除終端機控制序列
- 僅為了急切相容性路徑單獨使用 `commands`

## Plugin shapes

OpenClaw 根據載入外掛的註冊行為進行分類：

| Shape                 | Description                       |
| --------------------- | --------------------------------- |
| **plain-capability**  | 單一能力類型（例如僅提供者）      |
| **hybrid-capability** | 多種能力類型（例如提供者 + 語音） |
| **hook-only**         | 僅有 hooks，沒有 capabilities     |
| **non-capability**    | 工具/命令/服務但沒有 capabilities |

使用 `openclaw plugins inspect <id>` 來查看外掛的形狀。

## Related

- [SDK 概觀](/zh-Hant/plugins/sdk-overview) - 註冊 API 和子路徑參考
- [Runtime Helpers](/zh-Hant/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [Setup and Config](/zh-Hant/plugins/sdk-setup) - manifest、setup entry、延遲載入
- [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) - 建構 `ChannelPlugin` 物件
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) - 提供者註冊與 hooks
