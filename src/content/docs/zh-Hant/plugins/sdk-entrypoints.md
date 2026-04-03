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

<Tip>**正在尋找逐步教學？** 請參閱 [頻道外掛](/en/plugins/sdk-channel-plugins) 或 [提供者外掛](/en/plugins/sdk-provider-plugins) 以獲得逐步指南。</Tip>

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

## `defineChannelPluginEntry`

**匯入：** `openclaw/plugin-sdk/core`

使用頻道專用的接線包裝 `definePluginEntry`。自動呼叫
`api.registerChannel({ plugin })`，公開可選的根目錄説明 (root-help) CLI 中繼資料
接縫，並根據註冊模式對 `registerFull` 進行閘控。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

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

| 欄位                  | 類型                                                             | 必填 | 預設值         |
| --------------------- | ---------------------------------------------------------------- | ---- | -------------- |
| `id`                  | `string`                                                         | 是   | —              |
| `name`                | `string`                                                         | 是   | —              |
| `description`         | `string`                                                         | 是   | —              |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —              |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件結構描述 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —              |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —              |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —              |

- `setRuntime` 在註冊期間被呼叫，以便您可以儲存執行時期參考
  (通常透過 `createPluginRuntimeStore`)。它會在 CLI 中繼資料
  擷取期間被跳過。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期間都會執行。
  請將其用作頻道擁有的 CLI 描述元的規範位置，以便根目錄説明
  保持非啟用狀態，同時正常的 CLI 命令註冊與完整外掛載入
  保持相容。
- `registerFull` 僅在 `api.registrationMode === "full"` 時執行。它會在
  僅設定 (setup-only) 載入期間被跳過。
- 對於外掛擁有的根 CLI 命令，當您希望命令保持延遲載入
  而不從根 CLI 解析樹中消失時，請優先使用 `api.registerCli(..., { descriptors: [...] })`。
  對於頻道外掛，請優先從 `registerCliMetadata(...)` 註冊這些描述元，
  並讓 `registerFull(...)` 專注於僅執行時期的工作。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/core`

用於輕量級的 `setup-entry.ts` 檔案。僅回傳 `{ plugin }` 而沒有
執行時期或 CLI 接線。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當頻道被停用、未設定，或啟用延遲載入時，OpenClaw 會載入此項而非完整項目。請參閱
[設定與配置](/en/plugins/sdk-setup#setup-entry) 以了解其重要性時機。

## 註冊模式

`api.registrationMode` 告訴您的外掛它是如何被載入的：

| 模式              | 何時                       | 要註冊什麼            |
| ----------------- | -------------------------- | --------------------- |
| `"full"`          | 正常閘道啟動               | 所有內容              |
| `"setup-only"`    | 已停用/未設定的頻道        | 僅頻道註冊            |
| `"setup-runtime"` | 具備執行時期可用的設定流程 | 通道 + 輕量級執行時期 |
| `"cli-metadata"`  | 根說明 / CLI 中繼資料擷取  | 僅限 CLI 描述符       |

`defineChannelPluginEntry` 會自動處理此種分割。如果您直接對通道使用
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

特別針對 CLI 註冊器：

- 當註冊器擁有一或多個根指令，且您希望 OpenClaw 在首次
  叫用時延遲載入實際的 CLI 模組時，請使用 `descriptors`
- 請確保這些描述符涵蓋註冊器公開的每個頂層指令根
- 僅對急切相容性路徑單獨使用 `commands`

## Plugin 形狀

OpenClaw 會根據載入的外掛程式註冊行為將其分類：

| 形狀                  | 描述                             |
| --------------------- | -------------------------------- |
| **plain-capability**  | 單一功能類型 (例如僅提供者)      |
| **hybrid-capability** | 多種功能類型 (例如提供者 + 語音) |
| **hook-only**         | 只有 Hooks，沒有功能             |
| **non-capability**    | 工具/指令/服務但沒有功能         |

使用 `openclaw plugins inspect <id>` 來查看外掛程式的形狀。

## 相關

- [SDK 概觀](/en/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [執行時期輔助程式](/en/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與組態](/en/plugins/sdk-setup) — 資訊清單、設定進入點、延遲載入
- [通道外掛程式](/en/plugins/sdk-channel-plugins) — 建構 `ChannelPlugin` 物件
- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 提供者註冊與 Hooks
