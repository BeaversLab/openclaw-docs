---
title: "外掛程式進入點"
sidebarTitle: "進入點"
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的參考資料"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# 外掛程式進入點

每個外掛程式都會匯出一個預設的進入物件。SDK 提供了三個輔助函式來建立它們。

<Tip>**正在尋找逐步指南？** 請參閱 [頻道外掛程式](/en/plugins/sdk-channel-plugins) 或 [提供者外掛程式](/en/plugins/sdk-provider-plugins)。</Tip>

## `definePluginEntry`

**匯入：** `openclaw/plugin-sdk/plugin-entry`

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

- `id` 必須符合您的 `openclaw.plugin.json` 清單。
- `kind` 適用於獨佔插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一個用於延遲求值的函式。
- OpenClaw 會在首次存取時解析並記憶化該架構，因此昂貴的架構
  建構器只會執行一次。

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

使用頻道專屬的連線來包裝 `definePluginEntry`。會自動呼叫
`api.registerChannel({ plugin })`，公開選用的根說明 CLI 中繼資料
接縫，並根據註冊模式來控管 `registerFull`。

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

- `setRuntime` 會在註冊期間被呼叫，因此您可以儲存執行階段參考
  (通常是透過 `createPluginRuntimeStore`)。它會在 CLI 中繼資料
  擷取期間被略過。
- `registerCliMetadata` 會在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期間執行。
  請將其作為頻道擁有的 CLI 描述符的規範位置，以便根說明
  保持非啟動狀態，同時讓一般的 CLI 指令註冊與
  完整外掛程式載入保持相容。
- `registerFull` 僅在 `api.registrationMode === "full"` 時執行。它會在
  僅設定載入期間被略過。
- 與 `definePluginEntry` 類似，`configSchema` 可以是惰性工廠，而 OpenClaw
  會在首次存取時記憶化解析後的架構。
- 對於外掛程式擁有的根 CLI 指令，當您希望該指令保持延遲載入而不從根 CLI 剖析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。對於通道外掛程式，請優先從 `registerCliMetadata(...)` 註冊這些描述元，並讓 `registerFull(...)` 專注於僅限執行時期的工作。
- 如果 `registerFull(...)` 也註冊了閘道 RPC 方法，請將它們保留在外掛程式專屬的前綴下。保留的核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）總是會被強制轉換為 `operator.admin`。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/channel-core`

用於輕量級的 `setup-entry.ts` 檔案。僅回傳 `{ plugin }`，不包含執行時期或 CLI 連線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當通道被停用、未設定，或是啟用延遲載入時，OpenClaw 會載入此項而非完整進入點。請參閱 [設定與設定檔](/en/plugins/sdk-setup#setup-entry) 以了解此時機的重要性。

實務上，請將 `defineSetupPluginEntry(...)` 與狹隘的設定輔助函式家族配對：

- `openclaw/plugin-sdk/setup-runtime` 用於執行時期安全的設定輔助函式，例如匯入安全的設定修補配接器、lookup-note 輸出、`promptResolvedAllowFrom`、`splitSetupEntries` 以及委派的設定代理
- `openclaw/plugin-sdk/channel-setup` 用於選用安裝的設定介面
- `openclaw/plugin-sdk/setup-tools` 用於設定/安裝 CLI/封存/文件的輔助函式

請將繁重的 SDK、CLI 註冊以及長期執行的執行時期服務保留在完整進入點中。

## 註冊模式

`api.registrationMode` 告訴您的外掛程式它是如何被載入的：

| 模式              | 時機                       | 要註冊什麼                                           |
| ----------------- | -------------------------- | ---------------------------------------------------- |
| `"full"`          | 正常閘道啟動               | 所有項目                                             |
| `"setup-only"`    | 已停用/未設定的通道        | 僅通道註冊                                           |
| `"setup-runtime"` | 具備可用執行時期的設定流程 | 通道註冊加上僅在完整進入點載入前所需的輕量級執行時期 |
| `"cli-metadata"`  | 根說明 / CLI 中繼資料擷取  | 僅 CLI 描述元                                        |

`defineChannelPluginEntry` 會自動處理此分割。如果您直接為 channel 使用 `definePluginEntry`，請自行檢查模式：

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

將 `"setup-runtime"` 視為僅設定啟動表面必須存在且無需重新進入完整打包 channel 執行時的視窗。適合的項目包括 channel 註冊、設定安全的 HTTP 路由、設定安全的 gateway 方法，以及委派設定輔助程式。繁重的背景服務、CLI 註冊器，以及 provider/client SDK 引導程序仍屬於 `"full"`。

特別針對 CLI 註冊器：

- 當註冊器擁有一個或多個根指令，且您希望 OpenClaw 在首次呼叫時延遲載入真正的 CLI 模組時，使用 `descriptors`
- 確保那些描述符覆蓋註冊器公開的每個頂層指令根
- 僅針對急切相容性路徑單獨使用 `commands`

## Plugin 形狀

OpenClaw 根據外掛程式的註冊行為對其進行分類：

| 形狀                  | 描述                                   |
| --------------------- | -------------------------------------- |
| **plain-capability**  | 單一能力類型（例如僅 provider）        |
| **hybrid-capability** | 多種能力類型（例如 provider + speech） |
| **hook-only**         | 僅 hooks，無能力                       |
| **non-capability**    | 工具/指令/服務但無能力                 |

使用 `openclaw plugins inspect <id>` 來查看外掛程式的形狀。

## 相關

- [SDK 概觀](/en/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [執行時輔助程式](/en/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與組態](/en/plugins/sdk-setup) — manifest、設定入口、延遲載入
- [Channel 外掛程式](/en/plugins/sdk-channel-plugins) — 建構 `ChannelPlugin` 物件
- [Provider 外掛程式](/en/plugins/sdk-provider-plugins) — provider 註冊和 hooks
