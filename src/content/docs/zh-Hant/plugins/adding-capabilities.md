---
summary: "Contributor guide for adding a new shared capability to the OpenClaw plugin system"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "新增功能（貢獻者指南）"
sidebarTitle: "新增功能"
---

<Info>這是給 OpenClaw 核心開發者的**貢獻者指南**。如果您正在 建構外部插件，請改為參閱[建構插件](/zh-Hant/plugins/building-plugins)。 若要深入了解架構參考（功能模型、所有權、 載入管線、執行時期輔助程式），請參閱[插件內部運作](/zh-Hant/plugins/architecture)。</Info>

當 OpenClaw 需要一個新的共享領域時使用此指南，例如嵌入、影像
生成、影片生成，或某些未來由供應商支援的功能區域。

規則：

- **外掛** = 所有權界線
- **功能** = 共享核心契約

不要開始就將供應商直接連接到頻道或工具。首先從定義該功能開始。

## 何時建立功能

當 **所有** 以下條件都符合時，請建立新功能：

1. 多個供應商可能實作它。
2. 頻道、工具或功能外掛應該在不在乎供應商的情況下使用它。
3. 核心需要擁有後備、原則、設定或傳遞行為。

如果工作僅限於供應商且尚未存在共享契約，請停止並先定義契約。

## 標準程序

1. 定義類型化的核心契約。
2. 新增該契約的外掛註冊。
3. 新增共享的執行時期輔助程式。
4. 連接一個真實的供應商外掛作為證明。
5. 將功能/頻道消費者移至執行時期輔助程式。
6. 新增契約測試。
7. 記錄面向操作員的設定和所有權模型。

## 什麼放在哪裡

**核心：**

- 請求/回應類型。
- 提供者註冊表 + 解析。
- 後備行為。
- 在巢狀物件、萬用字元、陣列項目和組合節點上，具有傳播 `title` / `description` 文件中繼資料的設定架構。
- 執行時期輔助程式介面。

**供應商外掛：**

- 供應商 API 呼叫。
- 供應商驗證處理。
- 供應商特定的請求正規化。
- 功能實作的註冊。

**功能/頻道外掛：**

- 呼叫 `api.runtime.*` 或相符的 `plugin-sdk/*-runtime` 輔助程式。
- 永遠不要直接呼叫供應商實作。

## 提供者與程式縫隙

當行為屬於模型提供者合約而非通用代理程式迴圈時，請使用 **provider hooks**。範例包括在選擇傳輸後的供應商特定請求參數、auth-profile 偏好、提示覆蓋層，以及在模型/設定檔故障後的後續容錯路由。

當行為屬於正在執行轉次的執行階段時，請使用 **agent harness hooks**。程式 可以將成功但無用的嘗試結果（例如空、僅推理或僅規劃的回應）進行分類，以便外部模型容錯原則可以做出重試決策。

保持這兩個縫隙狹窄：

- 核心擁有重試/容錯原則。
- 提供者外掛擁有供應商特定的請求/驗證/路由提示。
- 程式外掛擁有執行階段特定的嘗試分類。
- 第三方外掛返回提示，而不是直接變更核心狀態。

## 檔案檢查清單

對於新功能，預計會接觸到這些區域：

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- 一或多個套件的外掛程式套件。
- 組態、文件、測試。

## 實作範例：影像生成

影像生成遵循標準形式：

1. 核心定義 `ImageGenerationProvider`。
2. 核心公開 `registerImageGenerationProvider(...)`。
3. 核心公開 `runtime.imageGeneration.generate(...)`。
4. `openai`、`google`、`fal` 和 `minimax` 外掛註冊供應商支援的實作。
5. 未來的供應商註冊相同的合約，而無需變更頻道/工具。

組態金鑰特意與視覺分析路由分開：

- `agents.defaults.imageModel` 分析影像。
- `agents.defaults.imageGenerationModel` 生成影像。

將這兩者分開，以便容錯和原則保持明確。

## 嵌入提供者

對於可重複使用的向量嵌入提供者，請使用 `embeddingProviders`。此合約
的範圍故意比記憶體更廣：工具、搜尋、檢索、匯入器，或
未來的功能外掛都可以消耗嵌入，而不需依賴記憶體
引擎。

記憶體搜尋可以使用通用的 `embeddingProviders`。較舊的
`memoryEmbeddingProviders` 合約僅供現有
記憶體特定的供應商遷移時使用，屬於棄用的相容性支援；
新的可重複使用的嵌入供應商應該使用
`embeddingProviders`。

## 審查檢查清單

在發布新功能之前，請驗證：

- 沒有通道/工具直接匯入供應商程式碼。
- 執行時期輔助函式是共享路徑。
- 至少有一個合約測試斷言了打包的擁有權。
- 設定文件命名了新的模型/設定鍵。
- 外掛文件說明了擁有權邊界。

如果 PR 跳過了功能層並將供應商行為硬編碼到通道/工具中，請將其退回並先定義合約。

## 相關

- [插件內部運作](/zh-Hant/plugins/architecture) — 功能模型、所有權、載入管線、執行時期輔助程式。
- [建構插件](/zh-Hant/plugins/building-plugins) — 第一個插件教學。
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 匯入映射與註冊 API 參考。
- [建立技能](/zh-Hant/tools/creating-skills) — 伴隨的貢獻者介面。
