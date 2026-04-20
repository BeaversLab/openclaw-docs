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

<Tip>**Looking for a walkthrough?** See [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) or [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) for step-by-step guides.</Tip>

## `definePluginEntry`

**Import:** `openclaw/plugin-sdk/plugin-entry`

適用於提供者外掛程式、工具外掛程式、Hook 外掛程式，以及任何**非**訊息頻道的項目。

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

| 欄位           | 類型                                                             | 必填 | 預設值         |
| -------------- | ---------------------------------------------------------------- | ---- | -------------- |
| `id`           | `string`                                                         | 是   | —              |
| `name`         | `string`                                                         | 是   | —              |
| `description`  | `string`                                                         | 是   | —              |
| `kind`         | `string`                                                         | 否   | —              |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件結構描述 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —              |

- `id` must match your `openclaw.plugin.json` manifest.
- `kind` is for exclusive slots: `"memory"` or `"context-engine"`.
- `configSchema` can be a function for lazy evaluation.
- OpenClaw 會在首次存取時解析並記憶化該架構，因此昂貴的架構
  建構器只會執行一次。

## `defineChannelPluginEntry`

**Import:** `openclaw/plugin-sdk/channel-core`

Wraps `definePluginEntry` with channel-specific wiring. Automatically calls
`api.registerChannel({ plugin })`, exposes an optional root-help CLI metadata
seam, and gates `registerFull` on registration mode.

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
| `id`                  | `string`                                                         | 是   | —          |
| `name`                | `string`                                                         | 是   | —          |
| `description`         | `string`                                                         | 是   | —          |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —          |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件架構 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —          |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —          |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —          |

- `setRuntime` 在註冊期間被呼叫，因此您可以儲存執行時期參考
  （通常是透過 `createPluginRuntimeStore`）。在 CLI 中繼資料
  擷取期間會跳過它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期間都會執行。
  將其作為管道擁有的 CLI 描述符的標準位置，以便根幫助
  保持非啟用狀態，同時讓正常的 CLI 指令註冊
  與完整外掛程式載入相容。
- `registerFull` 僅在 `api.registrationMode === "full"` 時執行。在僅設定
  載入期間會跳過它。
- 就像 `definePluginEntry`，`configSchema` 可以是一個惰性工廠，且 OpenClaw
  會在第一次存取時將解析後的架構記憶化。
- 對於外掛程式擁有的根 CLI 指令，當您希望該指令保持惰性載入
  而又不從根 CLI 剖析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。
  對於管道外掛程式，請優先從 `registerCliMetadata(...)` 註冊這些描述符，
  並讓 `registerFull(...)` 專注於僅執行時期的工作。
- 如果 `registerFull(...)` 也註冊閘道 RPC 方法，請將它們保留在
  外掛程式特定的前綴上。保留的核心管理命名空間（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）總是會被強制
  為 `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

用於輕量級的 `setup-entry.ts` 檔案。僅回傳 `{ plugin }`，不包含
執行時期或 CLI 連接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當管道被停用、未設定，或啟用延遲載入時，OpenClaw 會載入此項而非完整進入點。
請參閱[設定與組態](/zh-Hant/plugins/sdk-setup#setup-entry)以了解其適用時機。

實務上，請將 `defineSetupPluginEntry(...)` 與狹義的設定輔助工具
系列搭配使用：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時期安全的設定輔助工具，
  例如匯入安全的設定修補配接器、lookup-note 輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派設定代理
- `openclaw/plugin-sdk/channel-setup` 用於選用安裝的設定介面
- 用於 setup/install CLI/archive/docs 輔助函式的 `openclaw/plugin-sdk/setup-tools`

請將繁重的 SDK、CLI 註冊以及長期執行的執行時期服務保留在完整進入點中。

將 setup 和 runtime 介面分離的捆绑工作區通道可以改用
來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。該合約允許
setup 入口保留 setup-safe plugin/secrets 匯出，同時仍暴露一個
runtime setter：

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

僅當 setup 流程確實需要在完整的通道入口載入之前使用輕量級 runtime
setter 時，才使用該捆绑合約。

## 註冊模式

`api.registrationMode` 告訴您的插件它是如何被載入的：

| 模式              | 時機                    | 註冊內容                                           |
| ----------------- | ----------------------- | -------------------------------------------------- |
| `"full"`          | 正常閘道啟動            | 所有內容                                           |
| `"setup-only"`    | 已停用/未配置的通道     | 僅通道註冊                                         |
| `"setup-runtime"` | 具備 runtime 的安裝流程 | 通道註冊加上僅在完整入口載入前所需的輕量級 runtime |
| `"cli-metadata"`  | 根幫助 / CLI 元數據捕獲 | 僅 CLI 描述符                                      |

`defineChannelPluginEntry` 會自動處理此分離。如果您直接為通道使用
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

將 `"setup-runtime"` 視為僅 setup 啟動介面必須存在且
不重新進入完整捆绑通道 runtime 的視窗。合適的項目是
通道註冊、setup-safe HTTP 路由、setup-safe 閘道方法，以及
委派的 setup 輔助函式。繁重的背景服務、CLI 註冊器和
provider/client SDK 引導仍屬於 `"full"`。

特別是對於 CLI 註冊器：

- 當註冊器擁有一個或多個根指令並且您希望
  OpenClaw 在首次調用時延遲載入真實的 CLI 模組時，使用 `descriptors`
- 確保這些描述符涵蓋註冊器暴露的每個頂層指令根
- 僅對於急切相容性路徑單獨使用 `commands`

## 插件形狀

OpenClaw 根據載入插件的註冊行為對其進行分類：

| 形狀         | 描述                                   |
| ------------ | -------------------------------------- |
| **純功能**   | 一種功能類型（例如僅 provider）        |
| **混合功能** | 多種功能類型（例如 provider + speech） |
| **僅 hook**  | 僅 hooks，無功能                       |
| **非功能**   | 工具/指令/服務但無功能                 |

使用 `openclaw plugins inspect <id>` 查看外掛程式的結構。

## 相關

- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [執行時期輔助函式](/zh-Hant/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與配置](/zh-Hant/plugins/sdk-setup) — manifest、setup entry、延遲載入
- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 建構 `ChannelPlugin` 物件
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 提供者註冊與 hooks
