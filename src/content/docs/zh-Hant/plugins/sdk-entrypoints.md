---
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的參考資料"
title: "Plugin entry points"
sidebarTitle: "Entry Points"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

每個外掛程式都會匯出一個預設的 entry 物件。SDK 提供了三個輔助函式來建立它們。

對於已安裝的外掛程式，`package.json` 應在可用時將執行時期載入指向建置的 JavaScript：

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

`extensions` 和 `setupEntry` 仍是工作區 (workspace) 和 git 檢出開發的有效來源項目。當 OpenClaw 載入已安裝的套件時，偏好使用 `runtimeExtensions` 和 `runtimeSetupEntry`，這讓 npm 套件能避免執行時期的 TypeScript 編譯。如果已安裝的套件僅宣告 TypeScript 來源項目，OpenClaw 會在存在時使用相符的建置 `dist/*.js` 對應項，然後再回退到 TypeScript 來源。

所有項目路徑必須保留在外掛程式套件目錄內。執行時期項目和推斷的建置 JavaScript 對應項並不會讓跳脫的 `extensions` 或 `setupEntry` 來源路徑變成有效路徑。

<Tip>**正在尋找逐步指南？** 請參閱 [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) 或 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins)。</Tip>

## `definePluginEntry`

**匯入：** `openclaw/plugin-sdk/plugin-entry`

適用於提供者外掛程式、工具外掛程式、掛鉤外掛程式，以及任何**非**訊息頻道的項目。

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

| 欄位           | 類型                                                             | 必要 | 預設值     |
| -------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`           | `string`                                                         | 是   | —          |
| `name`         | `string`                                                         | 是   | —          |
| `description`  | `string`                                                         | 是   | —          |
| `kind`         | `string`                                                         | 否   | —          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件架構 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —          |

- `id` 必須符合您的 `openclaw.plugin.json` 資訊清單。
- `kind` 適用於獨佔插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一個用於延遲求值的函數。
- OpenClaw 會在首次存取時解析並記憶該 schema，因此昂貴的 schema
  建構器只會執行一次。

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

使用通道特定的接線來包裝 `definePluginEntry`。自動呼叫
`api.registerChannel({ plugin })`，公開一個可選的根目錄說明 CLI 元資料
縫隙，並根據註冊模式來控制 `registerFull`。

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

| 欄位                  | 類型                                                             | 必填 | 預設值        |
| --------------------- | ---------------------------------------------------------------- | ---- | ------------- |
| `id`                  | `string`                                                         | 是   | —             |
| `name`                | `string`                                                         | 是   | —             |
| `description`         | `string`                                                         | 是   | —             |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —             |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件 schema |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —             |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —             |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —             |

- `setRuntime` 會在註冊期間被呼叫，因此您可以儲存執行時期參照
  (通常透過 `createPluginRuntimeStore`)。在 CLI 元資料
  擷取期間會略過它。
- `registerCliMetadata` 會在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 和
  `api.registrationMode === "full"` 期間執行。
  將其作為通道擁有的 CLI 描述符的規範位置，以便根目錄說明
  保持非啟動狀態、探索快照包含靜態指令元資料，以及
  一般 CLI 指令註冊與完整外掛載入保持相容。
- 探索註冊是非啟動的，而非免匯入的。OpenClaw 可能會
  評估受信任的外掛進入點和通道外掛模組以建構
  快照，因此請確保頂層匯入沒有副作用，並將 sockets、
  clients、workers 和 services 放在僅限 `"full"` 的路徑之後。
- `registerFull` 僅在 `api.registrationMode === "full"` 時運行。在僅設定載入期間會跳過。
- 與 `definePluginEntry` 類似，`configSchema` 可以是一個惰性工廠，OpenClaw 會在首次存取時將解析後的 schema 記憶化。
- 對於外掛擁有的根層級 CLI 指令，如果您希望該指令保持惰性載入且不從根 CLI 解析樹中消失，請優先使用 `api.registerCli(..., { descriptors: [...] })`。對於通道外掛，請優先從 `registerCliMetadata(...)` 註冊這些描述符，並讓 `registerFull(...)` 專注於僅執行時期的工作。
- 如果 `registerFull(...)` 也註冊了閘道 RPC 方法，請將其保留在特定於外掛的字首上。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）將始終被強制轉換為 `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

用於輕量級的 `setup-entry.ts` 檔案。僅傳回 `{ plugin }`，不包含執行時期或 CLI 連線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當通道被停用、未設定或啟用延遲載入時，OpenClaw 會載入此項目而非完整的進入點。請參閱[設定與配置](/zh-Hant/plugins/sdk-setup#setup-entry)以了解其適用時機。

實務上，將 `defineSetupPluginEntry(...)` 與以下狹義的設定輔助函式系列搭配使用：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時期安全的設定輔助函式，例如匯入安全的設定修補介面卡、lookup-note 輸出、`promptResolvedAllowFrom`、`splitSetupEntries` 和委派設定代理
- `openclaw/plugin-sdk/channel-setup` 用於選用安裝的設定介面
- `openclaw/plugin-sdk/setup-tools` 用於設定/安裝 CLI/封存/文件輔助函式

請將繁重的 SDK、CLI 註冊和長期執行的執行時服務保留在完整入口中。

分離設定和執行時期介面的捆綁工作區通道可以改用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。該契約允許設定進入點保留設定安全的外掛/機密匯出，同時仍公開執行時期 setter：

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

| 模式              | 時機                    | 要註冊的內容                                                                         |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `"full"`          | 正常閘道啟動            | 全部                                                                                 |
| `"discovery"`     | 唯讀功能發現            | 通道註冊加上靜態 CLI 描述符；條目代碼可能會加載，但跳過 socket、worker、客戶端和服務 |
| `"setup-only"`    | 已停用/未配置的通道     | 僅通道註冊                                                                           |
| `"setup-runtime"` | 設置流程，運行時可用    | 通道註冊，加上在完整條目加載之前所需的輕量級運行時                                   |
| `"cli-metadata"`  | 根說明 / CLI 元數據捕獲 | 僅 CLI 描述符                                                                        |

`defineChannelPluginEntry` 會自動處理此拆分。如果你直接對通道使用
`definePluginEntry`，請自行檢查模式：

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

發現模式會建立一個非啟動的註冊表快照。它可能仍會評估
插件條目和通道插件物件，以便 OpenClaw 可以註冊通道
功能和靜態 CLI 描述符。請將發現模式下的模組評估視為
受信任但輕量的：在頂層不得有網路客戶端、子程序、監聽器、資料庫
連接、背景 worker、憑證讀取或其他實時運行時副作用。

將 `"setup-runtime"` 視為一個視窗，僅設置的啟動表面必須
存在於此，而無需重新進入完整的打包通道運行時。合適的選擇是
通道註冊、設置安全的 HTTP 路由、設置安全的 gateway 方法，以及
委派的設置輔助函數。繁重的背景服務、CLI 註冊器和
提供者/客戶端 SDK 引導程序仍應放在 `"full"` 中。

特別對於 CLI 註冊器：

- 當註冊器擁有一個或多個根命令並且你希望
  OpenClaw 在第一次調用時延遲加載真實的 CLI 模組時，請使用 `descriptors`
- 確保這些描述符覆蓋註冊器公開的
  每個頂層命令根
- 將描述符命令名稱限制為字母、數字、連字符和底線，
  以字母或數字開頭；OpenClaw 會拒絕該形狀之外的描述符名稱，並在
  渲染說明之前從描述中剝離終端機控制序列
- 僅對急切相容性路徑單獨使用 `commands`

## Plugin shapes

OpenClaw 根據加載插件的註冊行為對其進行分類：

| 形狀                  | 描述                                    |
| --------------------- | --------------------------------------- |
| **plain-capability**  | 一種功能類型（例如僅提供者）            |
| **hybrid-capability** | 多種能力類型（例如：provider + speech） |
| **僅 hook**           | 只有 hooks，沒有能力                    |
| **非能力**            | 工具/指令/服務但沒有能力                |

使用 `openclaw plugins inspect <id>` 查看插件的外形。

## 相關

- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [Runtime Helpers](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與配置](/zh-Hant/plugins/sdk-setup) — manifest、設定入口、延遲載入
- [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) — 建構 `ChannelPlugin` 物件
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) — provider 註冊與 hooks
