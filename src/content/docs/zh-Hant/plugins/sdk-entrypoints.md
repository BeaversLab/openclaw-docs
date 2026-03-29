---
title: "外掛程式進入點"
sidebarTitle: "進入點"
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的參考資料"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup)
  - You are looking up entry point options
---

# 外掛程式進入點

每個外掛程式都會匯出一個預設的進入物件。SDK 提供了三個輔助函式來建立它們。

<Tip>**尋找逐步指南？** 請參閱 [頻道外掛程式](/en/plugins/sdk-channel-plugins) 或 [提供者外掛程式](/en/plugins/sdk-provider-plugins)。</Tip>

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

使用頻道專用的配線來包裝 `definePluginEntry`。會自動呼叫
`api.registerChannel({ plugin })` 並根據註冊模式對 `registerFull` 進行閘控。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerFull(api) {
    api.registerCli(/* ... */);
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 欄位           | 類型                                                             | 必填 | 預設值         |
| -------------- | ---------------------------------------------------------------- | ---- | -------------- |
| `id`           | `string`                                                         | 是   | —              |
| `name`         | `string`                                                         | 是   | —              |
| `description`  | `string`                                                         | 是   | —              |
| `plugin`       | `ChannelPlugin`                                                  | 是   | —              |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空物件結構描述 |
| `setRuntime`   | `(runtime: PluginRuntime) => void`                               | 否   | —              |
| `registerFull` | `(api: OpenClawPluginApi) => void`                               | 否   | —              |

- `setRuntime` 在註冊期間被呼叫，以便您可以儲存運行時引用
  （通常是透過 `createPluginRuntimeStore`）。
- `registerFull` 僅在 `api.registrationMode === "full"` 時運行。在僅設定載入期間會
  跳過它。

## `defineSetupPluginEntry`

**匯入：** `openclaw/plugin-sdk/core`

用於輕量級的 `setup-entry.ts` 檔案。僅傳回 `{ plugin }`，不包含
運行時或 CLI 連接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

當頻道被停用、未設定或啟用延遲載入時，OpenClaw 會載入此項而非完整入口。請參閱
[設定與組態](/en/plugins/sdk-setup#setup-entry) 以了解這在何時很重要。

## 註冊模式

`api.registrationMode` 會告知您的外掛它是如何被載入的：

| 模式              | 時機                     | 註冊內容            |
| ----------------- | ------------------------ | ------------------- |
| `"full"`          | 正常閘道啟動             | 所有內容            |
| `"setup-only"`    | 已停用/未設定的頻道      | 僅頻道註冊          |
| `"setup-runtime"` | 具備可用運行時的設定流程 | 頻道 + 輕量級運行時 |

`defineChannelPluginEntry` 會自動處理此區分。如果您直接
對頻道使用 `definePluginEntry`，請自行檢查模式：

```typescript
register(api) {
  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerCli(/* ... */);
  api.registerService(/* ... */);
}
```

## 外掛形態

OpenClaw 根據外掛的註冊行為將已載入的外掛分類：

| 形態                  | 描述                              |
| --------------------- | --------------------------------- |
| **plain-capability**  | 單一功能類型（例如僅提供者）      |
| **hybrid-capability** | 多種功能類型（例如提供者 + 語音） |
| **hook-only**         | 僅有 Hook，沒有功能               |
| **non-capability**    | 工具/指令/服務但沒有功能          |

使用 `openclaw plugins inspect <id>` 來查看外掛的形態。

## 相關

- [SDK 概覽](/en/plugins/sdk-overview) — 註冊 API 和子路徑參考
- [運行時輔助函式](/en/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [設定與組態](/en/plugins/sdk-setup) — 宣示清單、設定入口、延遲載入
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — 構建 `ChannelPlugin` 物件
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 提供者註冊與鉤子
