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

`extensions` 和 `setupEntry` 仍然是 workspace 和 git checkout 開發的有效來源項目。當 OpenClaw 載入已安裝的套件時，`runtimeExtensions` 和 `runtimeSetupEntry` 是較佳的選擇，它們能讓 npm 套件避免執行時期的 TypeScript 編譯。必須明確指定執行時期項目：`runtimeSetupEntry` 需要 `setupEntry`，並且缺少 `runtimeExtensions` 或 `runtimeSetupEntry` 成果會導致安裝/探索失敗，而不是無聲地回退到來源。如果已安裝的套件僅宣告了 TypeScript 來源項目，OpenClaw 會在存在時使用相符的建置 `dist/*.js` 同位項目，然後再回退到 TypeScript 來源。

所有進入點路徑必須保持在插件套件目錄內。執行時進入點和推斷的已建置 JavaScript 同位點並不會使逸出 `extensions` 或 `setupEntry` 來源路徑變為有效。

<Tip>**尋找逐步指南？** 請參閱 [頻道插件](/zh-Hant/plugins/sdk-channel-plugins) 或 [提供者插件](/zh-Hant/plugins/sdk-provider-plugins) 以獲得逐步指導。</Tip>

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
| `id`           | `string`                                                         | 是   | -          |
| `name`         | `string`                                                         | 是   | -          |
| `description`  | `string`                                                         | 是   | -          |
| `kind`         | `string`                                                         | 否   | -          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件架構 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | -          |

- `id` 必須符合您的 `openclaw.plugin.json` 資訊清單。
- `kind` 用於專用插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一個用於延遲求值的函數。
- OpenClaw 會在首次存取時解析並記憶該 schema，因此昂貴的 schema
  建構器只會執行一次。

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

使用通道專用接線包裝 `definePluginEntry`。自動呼叫
`api.registerChannel({ plugin })`，暴露可選的根幫助 CLI 元數據
接縫，並根據註冊模式對 `registerFull` 進行閘控。

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
| `id`                  | `string`                                                         | 是   | -             |
| `name`                | `string`                                                         | 是   | -             |
| `description`         | `string`                                                         | 是   | -             |
| `plugin`              | `ChannelPlugin`                                                  | 是   | -             |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件 schema |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | -             |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | -             |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | -             |

- `setRuntime` 在註冊期間被呼叫，以便您可以儲存執行時期參照
  （通常透過 `createPluginRuntimeStore`）。在 CLI 中繼資料
  擷取期間會跳過它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 和
  `api.registrationMode === "full"` 期間運行。
  將其用作頻道擁有的 CLI 描述符的規範位置，以便根目錄説明保持非啟用狀態，發現快照包含靜態命令元數據，並且
  正常的 CLI 命令註冊與完整外掛程式加載保持相容。
- 發現註冊是非啟用的，而非無導入的。OpenClaw 可能會
  評估受信任的外掛程式入口和頻道外掛程式模組以構建
  快照，因此請保持頂層導入無副作用，並將 sockets、
  clients、workers 和 services 放在僅 `"full"` 路徑之後。
- `registerFull` 僅在 `api.registrationMode === "full"` 時運行。它在
  僅設定加載期間被跳過。
- 就像 `definePluginEntry` 一樣，`configSchema` 可以是一個惰性工廠（lazy factory），OpenClaw 會在首次存取時將解析後的架構記憶化。
- 對於外掛程式擁有的根 CLI 指令，當您希望該指令保持延遲載入但又不從根 CLI 解析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。對於配對節點（paired-node）功能指令，請優先使用 `api.registerNodeCliFeature(...)`，以便該指令歸屬於 `openclaw nodes` 之下。對於其他巢狀外掛指令，請新增 `parentPath` 並在傳遞給註冊器的 `program` 物件上註冊指令；OpenClaw 會在呼叫外掛程式之前將其解析為父指令。對於通道外掛，建議從 `registerCliMetadata(...)` 註冊這些描述符，並讓 `registerFull(...)` 專注於僅執行時期的工作。
- 如果 `registerFull(...)` 也註冊了網關 RPC 方法，請將它們保持在特定於外掛的前綴上。保留的核心管理命名空間（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）將始終被強制轉換為
  `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

用於輕量級的 `setup-entry.ts` 檔案。僅傳回 `{ plugin }` 而不包含
執行時期或 CLI 連線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當通道被停用、未配置或啟用延遲載入時，OpenClaw 會載入此項而非完整進入點。請參閱
[設定與配置](/zh-Hant/plugins/sdk-setup#setup-entry) 以瞭解這何時重要。

在實務上，請將 `defineSetupPluginEntry(...)` 與狹窄的設定輔助函式系列搭配使用：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時安全的設定輔助程式，例如
  匯入安全的設定修補配接器、lookup-note 輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派的設定代理程式
- `openclaw/plugin-sdk/channel-setup` 用於可選安裝的設定介面
- `openclaw/plugin-sdk/setup-tools` 用於設定/安裝 CLI/歸檔/文件輔助程式

請將繁重的 SDK、CLI 註冊和長期執行的執行時服務保留在完整入口中。

分割設定與執行時介面的綑綁工作區頻道可以改用
`openclaw/plugin-sdk/channel-entry-contract` 中的
`defineBundledChannelSetupEntry(...)`。該合約讓
設定入口點得以保留設定安全的 plugin/secrets 匯出，同時仍公開
執行時設定器：

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

`api.registrationMode` 告訴您的外掛程式它是如何被載入的：

| 模式              | 時機                    | 要註冊的內容                                                                         |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `"full"`          | 正常閘道啟動            | 全部                                                                                 |
| `"discovery"`     | 唯讀功能發現            | 通道註冊加上靜態 CLI 描述符；條目代碼可能會加載，但跳過 socket、worker、客戶端和服務 |
| `"setup-only"`    | 已停用/未配置的通道     | 僅通道註冊                                                                           |
| `"setup-runtime"` | 設置流程，運行時可用    | 通道註冊，加上在完整條目加載之前所需的輕量級運行時                                   |
| `"cli-metadata"`  | 根說明 / CLI 元數據捕獲 | 僅 CLI 描述符                                                                        |

`defineChannelPluginEntry` 會自動處理這種分割。如果您直接針對通道使用 `definePluginEntry`，請自行檢查模式：

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

將 `"setup-runtime"` 視為一個視窗，僅設定的啟動介面必須存在於此，而無需重新進入完整的捆綁通道執行時。適合的項目包括通道註冊、設定安全的 HTTP 路由、設定安全的閘道方法以及委派的設定輔助程式。繁重的背景服務、CLI 註冊器和提供者/用戶端 SDK 啟動程序仍屬於 `"full"`。

特別對於 CLI 註冊器：

- 當註冊器擁有一或多個根命令，且您希望 OpenClaw 在第一次叫用時延遲載入真正的 CLI 模組時，請使用 `descriptors`
- 確保這些描述符覆蓋註冊器公開的
  每個頂層命令根
- 將描述符命令名稱限制為字母、數字、連字符和底線，
  以字母或數字開頭；OpenClaw 會拒絕該形狀之外的描述符名稱，並在
  渲染說明之前從描述中剝離終端機控制序列
- 僅針對急切相容性路徑單獨使用 `commands`

## Plugin shapes

OpenClaw 根據加載插件的註冊行為對其進行分類：

| 形狀                  | 描述                                    |
| --------------------- | --------------------------------------- |
| **plain-capability**  | 一種功能類型（例如僅提供者）            |
| **hybrid-capability** | 多種能力類型（例如：provider + speech） |
| **僅 hook**           | 只有 hooks，沒有能力                    |
| **非能力**            | 工具/指令/服務但沒有能力                |

使用 `openclaw plugins inspect <id>` 來查看外掛程式的形狀。

## 相關

- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 註冊 API 與子路徑參考
- [執行時期輔助函式](/zh-Hant/plugins/sdk-runtime) - `api.runtime` 與 `createPluginRuntimeStore`
- [設定與組態](/zh-Hant/plugins/sdk-setup) - 清單、設定入口、延遲載入
- [頻道外掛](/zh-Hant/plugins/sdk-channel-plugins) - 建構 `ChannelPlugin` 物件
- [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) - 提供者註冊與鉤子
