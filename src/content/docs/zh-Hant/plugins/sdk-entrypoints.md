---
title: "Plugin Entry Points"
sidebarTitle: "Entry Points"
summary: "Reference for definePluginEntry, defineChannelPluginEntry, and defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# 外掛程式進入點

每個外掛程式都會匯出一個預設的進入物件。SDK 提供了三個輔助函式來建立它們。

對於已安裝的外掛程式，當可用時，`package.json` 應將執行階段載入指向已建置的
JavaScript：

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

`extensions` 和 `setupEntry` 仍是工作區和 git
check-out 開發的有效來源項目。當 OpenClaw 載入已安裝的套件時，
`runtimeExtensions` 和 `runtimeSetupEntry` 是首選，
這能讓 npm 套件避免執行階段 TypeScript 編譯。如果已安裝的套件僅宣告 TypeScript
來源項目，OpenClaw 將在存在時使用相符的已建置 `dist/*.js` 對等項目，
然後回退到 TypeScript 來源。

所有項目路徑必須保留在外掛程式套件目錄內。執行階段項目
和推斷的已建置 JavaScript 對等項目並不會使逸出 `extensions` 或
`setupEntry` 來源路徑生效。

<Tip>**正在尋找逐步解說？** 請參閱 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) 或 [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) 以取得逐步指南。</Tip>

## `definePluginEntry`

**Import:** `openclaw/plugin-sdk/plugin-entry`

適用於提供者外掛程式、工具外掛程式、Hook 外掛程式，以及任何**非**
訊息通道的項目。

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

| 欄位           | 類型                                                             | 必要 | 預設值          |
| -------------- | ---------------------------------------------------------------- | ---- | --------------- |
| `id`           | `string`                                                         | 是   | —               |
| `name`         | `string`                                                         | 是   | —               |
| `description`  | `string`                                                         | 是   | —               |
| `kind`         | `string`                                                         | 否   | —               |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空白物件 Schema |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —               |

- `id` 必須符合您的 `openclaw.plugin.json` 資訊清單。
- `kind` 用於專屬插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一個用於延遲求值的函數。
- OpenClaw 會在首次存取時解析並記憶該 schema，因此昂貴的 schema
  建構器只會執行一次。

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

使用特定通道的連線包裝 `definePluginEntry`。自動呼叫
`api.registerChannel({ plugin })`，公開選用的根說明 CLI 元資料
接縫，並根據註冊模式控管 `registerFull`。

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

| 欄位                  | 類型                                                             | 必要 | 預設值        |
| --------------------- | ---------------------------------------------------------------- | ---- | ------------- |
| `id`                  | `string`                                                         | 是   | —             |
| `name`                | `string`                                                         | 是   | —             |
| `description`         | `string`                                                         | 是   | —             |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —             |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件 schema |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —             |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —             |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —             |

- `setRuntime` 在註冊期間呼叫，因此您可以儲存執行時期參考
  (通常透過 `createPluginRuntimeStore`)。在 CLI 元資料
  擷取期間會跳過。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期間都會執行。
  請將其作為通道擁有的 CLI 描述符的標準位置，以便根說明
  保持非啟動狀態，同時正常的 CLI 指令註冊仍與
  完整外掛載入相容。
- `registerFull` 僅在 `api.registrationMode === "full"` 時執行。在僅設定的載入期間會
  跳過。
- 與 `definePluginEntry` 類似，`configSchema` 可以是延遲工廠，且 OpenClaw
  會在首次存取時記憶解析後的 schema。
- 對於外掛擁有的根 CLI 指令，當您希望該指令保持延遲載入而不從根 CLI 解析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。對於頻道外掛，請優先從 `registerCliMetadata(...)` 註冊這些描述符，並讓 `registerFull(...)` 專注於僅執行時的工作。
- 如果 `registerFull(...)` 也註冊了閘道 RPC 方法，請將它們保留在外掛特定的前綴上。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）總是會被強制轉換為 `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

用於輕量級的 `setup-entry.ts` 檔案。僅返回 `{ plugin }`，不包含執行時或 CLI 連線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當頻道被停用、未配置，或啟用了延遲載入時，OpenClaw 會載入此項而非完整入口。請參閱 [Setup and Config](/zh-Hant/plugins/sdk-setup#setup-entry) 以了解此時機的相關說明。

實務上，請將 `defineSetupPluginEntry(...)` 與精簡的設定輔助函式系列配對使用：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時安全的設定輔助函式，例如匯入安全的設定修補介面卡、lookup-note 輸出、`promptResolvedAllowFrom`、`splitSetupEntries` 以及委派的設定代理
- `openclaw/plugin-sdk/channel-setup` 用於可選安裝的設定介面
- `openclaw/plugin-sdk/setup-tools` 用於設定/安裝 CLI/封存/文件輔助函式

請將繁重的 SDK、CLI 註冊和長期執行的執行時服務保留在完整入口中。

分割設定和執行時介面的套件工作區頻道可以改用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。該合約允許設定入口保留設定安全的外掛/機密匯出，同時仍公開執行時設定器：

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

僅當設定流程確實需要在完整頻道入口載入之前使用輕量級執行時設定器時，才使用該套件合約。

## 註冊模式

`api.registrationMode` 告訴您的外掛它是如何被載入的：

| 模式              | 時機                    | 要註冊的內容                                     |
| ----------------- | ----------------------- | ------------------------------------------------ |
| `"full"`          | 正常閘道啟動            | 全部                                             |
| `"setup-only"`    | 已停用/未配置的通道     | 僅通道註冊                                       |
| `"setup-runtime"` | 具備運行時的設定流程    | 通道註冊加上僅在完整入口載入前所需的輕量級運行時 |
| `"cli-metadata"`  | 根說明 / CLI 元數據擷取 | 僅 CLI 描述符                                    |

`defineChannelPluginEntry` 會自動處理此分割。如果您針對通道直接使用
`definePluginEntry`，請自行檢查模式：

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

將 `"setup-runtime"` 視為僅設定啟動介面必須存在的時間窗口，
且無需重新進入完整的捆綁通道運行時。合適的選擇包括
通道註冊、設定安全的 HTTP 路由、設定安全的閘道方法，以及
委派設定輔助程式。繁重的背景服務、CLI 註冊器，以及
提供者/客戶端 SDK 啟動程序仍屬於 `"full"`。

具體對於 CLI 註冊器：

- 當註冊器擁有一或多個根命令，且您希望
  OpenClaw 在首次叫用時延遲載入真實的 CLI 模組時，請使用 `descriptors`
- 確保這些描述符涵蓋註冊器公開的每個頂層命令根
- 僅針對急切兼容性路徑單獨使用 `commands`

## Plugin 形狀

OpenClaw 根據註冊行為對已載入的外掛進行分類：

| 形狀                  | 描述                             |
| --------------------- | -------------------------------- |
| **plain-capability**  | 一種功能類型 (例如僅提供者)      |
| **hybrid-capability** | 多種功能類型 (例如提供者 + 語音) |
| **hook-only**         | 僅 Hooks，無功能                 |
| **non-capability**    | 工具/命令/服務但無功能           |

使用 `openclaw plugins inspect <id>` 查看外掛的形狀。

## 相關

- [SDK 概觀](/zh-Hant/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [Runtime Helpers](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與配置](/zh-Hant/plugins/sdk-setup) — 宣示清單、設定入口、延遲載入
- [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) — 建構 `ChannelPlugin` 物件
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) — 提供者註冊與 Hooks
