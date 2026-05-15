---
summary: "將 Canvas 從核心功能移出並轉為捆綁的實驗性插件的計劃與稽核清單。"
read_when:
  - Moving Canvas host, tools, commands, docs, or protocol ownership
  - Auditing whether Canvas is still core-owned
  - Preparing or reviewing the experimental Canvas plugin PR
title: "Canvas 插件重構"
---

# Canvas 插件重構

Canvas 的使用率較低且屬於實驗性功能。請將其視為一個捆綁插件，而非核心功能。核心部分可以保留通用的 gateway、node、HTTP、auth、config 和 native-client 基礎架構，但 Canvas 特有的行為應置於 `extensions/canvas` 之下。

## 目標

將 Canvas 的所有權移至 `extensions/canvas`，同時保留目前的配對節點行為：

- 面向代理的 `canvas` 工具是由 Canvas 插件註冊的
- Canvas 節點指令僅在 Canvas 插件註冊後才被允許使用
- A2UI 主機/原始檔案位於 Canvas 插件之下
- Canvas 文件具體化 位於 Canvas 插件之下
- CLI 指令的實作位於 Canvas 插件之下，或透過插件擁有的 runtime barrel 進行委派
- 文件與插件清單將 Canvas 描述為實驗性功能且由插件提供支援

## 非目標

- 請勿在此重構中重新設計原生應用程式的 Canvas UI。
- 除非有單獨的產品決策刪除 Canvas，否則請勿從 iOS、Android 或 macOS 移除 Canvas 協定/用戶端支援。
- 除非至少有一個其他捆綁插件需要相同的接縫，否則請不要僅為 Canvas 建構廣泛的插件服務框架。

## 目前分支狀態

已完成：

- 已在 `extensions/canvas` 中新增捆綁插件套件。
- 已新增 `extensions/canvas/openclaw.plugin.json`。
- 已將代理 `canvas` 工具從 `src/agents/tools/canvas-tool.ts` 移至 `extensions/canvas/src/tool.ts`。
- 已從 `src/agents/openclaw-tools.ts` 移除 `createCanvasTool` 的核心註冊。
- 已將 Canvas 主機實作從 `src/canvas-host` 移至 `extensions/canvas/src/host`。
- 保留 `extensions/canvas/runtime-api.ts` 作為插件擁有的相容性 barrel，用於測試、打包和外部公開的 Canvas 輔助程式。
- 已將 Canvas 文件具體化從 `src/gateway/canvas-documents.ts` 移至 `extensions/canvas/src/documents.ts`。
- 已將 Canvas CLI 實作與 A2UI JSONL 輔助程式移至 `extensions/canvas/src/cli.ts`。
- 將 Canvas 主機 URL 和作用域輔助函式移至 `extensions/canvas/src`。
- 將 Canvas 節點指令預設值從硬編碼的核心列表中移出，並移至外掛程式的 `nodeInvokePolicies`。
- 在 `plugins.entries.canvas.config.host` 處新增了外掛程式擁有的 Canvas 主機配置。
- 已將 Canvas 和 A2UI HTTP 服務移至 Canvas 外掛程式 HTTP 路由註冊之後。
- 新增了通用外掛程式 WebSocket 升級分派，用於外掛程式擁有的 HTTP 路由。
- 以通用託管外掛程式介面和節點功能輔助函式取代了特定於 Canvas 的閘道主機 URL 和節點功能驗證。
- 新增了外掛程式擁有的託管媒體解析器，以便 Canvas 文件 URL 透過 Canvas 外掛程式解析，而不是由核心匯入 Canvas 文件內部機制。
- 新增了 `api.registerNodeCliFeature(...)`，以便 Canvas 可以將 `openclaw nodes canvas` 宣告為外掛程式擁有的節點功能，而無需手動拼寫父指令路徑。
- 移除了生產環境 `src/**` 對 `extensions/canvas/runtime-api.js` 的匯入。
- 將 A2UI 套件來源從 `apps/shared/OpenClawKit/Tools/CanvasA2UI` 移至 `extensions/canvas/src/host/a2ui-app`。
- 將 A2UI 建置/複製實作移至 `extensions/canvas/scripts` 之下，並以通用打包外掛程式資產掛鉤取代了根建置接線。
- 移除了執行時期的舊版頂層 `canvasHost` 配置別名。
- 保留了 Canvas doctor 遷移，以便 `openclaw doctor --fix` 將舊的 `canvasHost` 配置重寫為 `plugins.entries.canvas.config.host`。
- 在閘道通訊協定 v4 背後移除了舊代理程式 Canvas 通訊協定相容性。原生用戶端和閘道現在使用僅 `pluginSurfaceUrls.canvas` 加上 `node.pluginSurface.refresh`；在此實驗性重構中，故意不支援已棄用的 `canvasHostUrl`、`canvasCapability` 和 `node.canvas.capability.refresh` 路徑。
- 更新了產生的外掛程式清單以包含 Canvas。
- 在 `docs/plugins/reference/canvas.md` 處新增了外掛程式參考文件。

已知剩餘的核心擁有 Canvas 介面：

- `apps/` 下的原生應用程式 Canvas 處理程式仍有意使用 Canvas 外掛程式介面
- `apps/` 下的原生應用程式 Canvas 通訊協定/用戶端處理程式
- 發佈的構件輸出仍使用 `dist/canvas-host/a2ui` 進行向後相容的執行時查找，但複製步驟現歸外掛程式所有

## 目標架構

`extensions/canvas` 應擁有：

- 外掛程式資訊清單與套件中繼資料
- 代理程式工具註冊
- 節點叫用指令原則
- Canvas 主機與 A2UI 執行時
- Canvas A2UI 套件來源與資產建置/複製腳本
- Canvas 文件建立與資產解析
- Canvas CLI 實作
- Canvas 文件頁面與外掛程式清冊項目

核心應僅擁有通用縫合點：

- 外掛程式探索與註冊
- 通用代理程式工具登錄檔
- 通用節點叫用原則登錄檔
- 通用閘道 HTTP/驗證與 WebSocket 升級分派
- 通用託管外掛程式介面 URL 解析
- 通用託管媒體解析器註冊
- 通用節點功能傳輸
- 通用組態管線
- 通用內建外掛程式資料掛鉤探索

原生應用程式可保留 Canvas 指令處理常式作為通訊協定的用戶端。它們不是外掛程式執行時的擁有者。

## 遷移步驟

1. 將 `plugins.entries.canvas.config.host` 視為外掛程式擁有的組態介面。
2. 更新文件，將 Canvas 描述為實驗性的內建外掛程式。
3. 執行專注的 Canvas 測試、外掛程式清冊檢查、外掛程式 SDK API 檢查，以及受執行時邊界影響的建置/類型檢查閘道。

## 稽核檢查清單

在宣告重構完成之前：

- `rg "src/canvas-host|../canvas-host"` 未傳回任何即時來源匯入。
- `rg "canvas-tool|createCanvasTool" src` 未發現核心擁有的 Canvas 工具實作。
- `rg "canvas.present|canvas.snapshot|canvas.a2ui" src/gateway` 在通用外掛程式原則測試之外，未發現硬式編碼的允許清單預設值。
- `rg "extensions/canvas/runtime-api" src --glob '!**/*.test.ts'` 為空。
- `rg "canvas-documents" src` 為空。
- `rg "registerNodesCanvasCommands|nodes-canvas" src` 為空；Canvas 外掛程式透過巢狀外掛程式 CLI 中繼資料註冊 `openclaw nodes canvas`。
- `rg "createCanvasHostHandler|handleA2uiHttpRequest" src/gateway` 未傳回任何閘道執行時擁有權。
- `rg "apps/shared/OpenClawKit/Tools/CanvasA2UI|canvas-a2ui-copy|extensions/canvas/src/host/a2ui" scripts .github package.json` 僅發現相容性包裝函式或外掛程式擁有的路徑。
- `pnpm plugins:inventory:check` 通過。
- `pnpm plugin-sdk:api:check` 通過，或是生成的 API 基準已刻意更新並經過審查。
- 目標 Canvas 測試通過。
- Canvas 主機/A2UI 路徑的變更通道測試通過。
- PR 主體明確指出 Canvas 是實驗性的且由外掛支援。

## 驗證指令

在反覆運算時使用針對性的本地檢查：

```sh
pnpm test extensions/canvas/src/host/server.test.ts extensions/canvas/src/host/server.state-dir.test.ts extensions/canvas/src/host/file-resolver.test.ts
pnpm test src/gateway/server.plugin-node-capability-auth.test.ts src/gateway/server-import-boundary.test.ts
pnpm test extensions/canvas/src/config-migration.test.ts src/commands/doctor-legacy-config.migrations.test.ts
pnpm test test/scripts/changed-lanes.test.ts test/scripts/build-all.test.ts extensions/canvas/scripts/bundle-a2ui.test.ts test/scripts/bundled-plugin-assets.test.ts extensions/canvas/scripts/copy-a2ui.test.ts src/infra/run-node.test.ts
pnpm tsgo:extensions
pnpm plugins:inventory:check
pnpm plugin-sdk:api:check
```

如果在推送前 runtime barrel、lazy import、打包或已發布的外掛介面發生變更，請先執行 `pnpm build`。
