---
title: "建置擴充功能"
summary: "建立 OpenClaw 通道和提供者擴充功能的逐步指南"
read_when:
  - You want to create a new OpenClaw plugin or extension
  - You need to understand the plugin SDK import patterns
  - You are adding a new channel or provider to OpenClaw
---

# 建置擴充功能

本指南將逐步說明從頭開始建立 OpenClaw 擴充功能的過程。擴充功能可以新增通道、模型提供者、工具或其他功能。

## 先決條件

- 已複製 OpenClaw 存儲庫並安裝相依性 (`pnpm install`)
- 熟悉 TypeScript (ESM)

## 擴充功能結構

每個擴充功能都位於 `extensions/<name>/` 下，並遵循此佈局：

```
extensions/my-channel/
├── package.json          # npm metadata + openclaw config
├── index.ts              # Entry point (defineChannelPluginEntry)
├── setup-entry.ts        # Setup wizard (optional)
├── api.ts                # Public contract barrel (optional)
├── runtime-api.ts        # Internal runtime barrel (optional)
└── src/
    ├── channel.ts        # Channel adapter implementation
    ├── runtime.ts        # Runtime wiring
    └── *.test.ts         # Colocated tests
```

## 步驟 1：建立套件

建立 `extensions/my-channel/package.json`：

```json
{
  "name": "@openclaw/my-channel",
  "version": "2026.1.1",
  "description": "OpenClaw My Channel plugin",
  "type": "module",
  "dependencies": {},
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (plugin)",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Short description of the channel.",
      "order": 80
    },
    "install": {
      "npmSpec": "@openclaw/my-channel",
      "localPath": "extensions/my-channel"
    }
  }
}
```

`openclaw` 欄位告訴外掛系統您的擴充功能提供什麼。對於提供者外掛，請使用 `providers` 而非 `channel`。

## 步驟 2：定義進入點

建立 `extensions/my-channel/index.ts`：

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Connects OpenClaw to My Channel",
  plugin: {
    // Channel adapter implementation
  },
});
```

對於提供者外掛，請改用 `definePluginEntry`。

## 步驟 3：從特定的子路徑匯入

外掛 SDK 提供許多專注的子路徑。請務必從特定的子路徑匯入，而不是從單一根目錄匯入：

```typescript
// Correct: focused subpaths
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import { createChannelPairingController } from "openclaw/plugin-sdk/channel-pairing";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";
import { resolveChannelGroupRequireMention } from "openclaw/plugin-sdk/channel-policy";

// Wrong: monolithic root (lint will reject this)
import { ... } from "openclaw/plugin-sdk";
```

常見子路徑：

| 子路徑                              | 用途                      |
| ----------------------------------- | ------------------------- |
| `plugin-sdk/core`                   | 外掛進入點定義、基本類型  |
| `plugin-sdk/channel-setup`          | 選用設定介面卡/精靈       |
| `plugin-sdk/channel-pairing`        | DM 配對基本元件           |
| `plugin-sdk/channel-reply-pipeline` | 前綴 + 輸入回覆連線       |
| `plugin-sdk/channel-config-schema`  | 設定架構建構器            |
| `plugin-sdk/channel-policy`         | 群組/DM 政策輔助函式      |
| `plugin-sdk/secret-input`           | 機密輸入解析/輔助函式     |
| `plugin-sdk/webhook-ingress`        | Webhook 請求/目標輔助函式 |
| `plugin-sdk/runtime-store`          | 持久化插件儲存            |
| `plugin-sdk/allow-from`             | 允許清單解析              |
| `plugin-sdk/reply-payload`          | 訊息回覆類型              |
| `plugin-sdk/provider-onboard`       | 提供商上架配置補丁        |
| `plugin-sdk/testing`                | 測試工具程式              |

使用符合任務的最小原語。僅當尚未存在專用子路徑時，才使用 `channel-runtime` 或其他較大的輔助函式 barrel。

## 步驟 4：使用本地 barrel 進行內部匯入

在你的擴充功能內，建立 barrel 檔案用於內部程式碼共享，而不是透過 plugin SDK 匯入：

```typescript
// api.ts — public contract for this extension
export { MyChannelConfig } from "./src/config.js";
export { MyChannelRuntime } from "./src/runtime.js";

// runtime-api.ts — internal-only exports (not for production consumers)
export { internalHelper } from "./src/helpers.js";
```

**自我導入防護**：切勿從生產檔案透過其已發佈的 SDK 合約路徑將您自己的擴充功能重新匯入。請改透過 `./api.ts` 或 `./runtime-api.ts` 路由內部匯入。SDK 合約僅供外部消費者使用。

## 步驟 5：新增外掛程式清單

在您的擴充功能根目錄中建立 `openclaw.plugin.json`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "name": "My Channel Plugin",
  "description": "Connects OpenClaw to My Channel"
}
```

請參閱 [Plugin manifest](/zh-Hant/plugins/manifest) 以了解完整的架構。

## 步驟 6：使用合約測試進行測試

OpenClaw 會對所有已註冊的外掛程式執行合約測試。新增您的擴充功能後，請執行：

```bash
pnpm test:contracts:channels   # channel plugins
pnpm test:contracts:plugins    # provider plugins
```

合約測試會驗證您的外掛程式是否符合預期的介面（設定精靈、工作階段繫結、訊息處理、群組原則等）。

對於單元測試，請從公開的測試介面匯入測試輔助程式：

```typescript
import { createTestRuntime } from "openclaw/plugin-sdk/testing";
```

## Lint 強制執行

三個腳本會強制執行 SDK 邊界：

1. **No monolithic root imports** — `openclaw/plugin-sdk` root 會被拒絕
2. **No direct src/ imports** — 擴充功能不能直接匯入 `../../src/`
3. **No self-imports** — 擴充功能不能匯入自己的 `plugin-sdk/<name>` 子路徑

在提交之前執行 `pnpm check` 以驗證所有邊界。

## 檢查清單

提交您的擴充功能之前：

- [ ] `package.json` 具有正確的 `openclaw` 中繼資料
- [ ] 進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`
- [ ] 所有匯入都使用專注的 `plugin-sdk/<subpath>` 路徑
- [ ] 內部匯入使用本地 barrels，而非 SDK 自我匯入
- [ ] `openclaw.plugin.json` 資訊清單存在且有效
- [ ] 合約測試通過 (`pnpm test:contracts`)
- [ ] 單元測試作為 `*.test.ts` 同置
- [ ] `pnpm check` 通過（lint + format）
- [ ] Doc page created under `docs/channels/` or `docs/plugins/`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
