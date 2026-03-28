---
summary: "用於為 OpenClaw 新增共享功能的食譜"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "功能食譜"
---

# 功能食譜

當 OpenClaw 需要一個新的領域（例如圖像生成、視頻生成或某些未來由供應商支援的功能區域）時，請使用此內容。

規則：

- 插件 = 所有權邊界
- 功能 = 共享核心合約

這意味著你不應該開始就將供應商直接連接到通道或工具。首先要從定義功能開始。

## 何時創建功能

當以下所有條件都成立時，創建一個新功能：

1. 多個供應商可能實現它
2. 通道、工具或功能插件應該使用它而不必關心
   供應商
3. 核心需要擁有後備、策略、配置或傳遞行為

如果工作僅涉及供應商且尚不存在共享合約，請停止並先定義
該合約。

## 標準流程

1. 定義類型化的核心合約。
2. 為該合約添加插件註冊。
3. 添加共享運行時輔助程式。
4. 連接一個真實的供應商插件作為證明。
5. 將功能/通道使用者移至運行時輔助程式。
6. 添加合約測試。
7. 記錄面向運營商的配置和所有權模型。

## 什麼放在哪裡

核心：

- 請求/回應類型
- 提供者註冊表 + 解析
- 後備行為
- 配置架構和標籤/幫助
- 運行時輔助介面

供應商插件：

- 供應商 API 調用
- 供應商身份驗證處理
- 供應商特定的請求正規化
- 功能實作的註冊

功能/通道插件：

- 調用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 輔助程式
- 絕不直接調用供應商實作

## 文件檢查清單

對於一個新功能，預計需要接觸這些區域：

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
- 一個或多個 `extensions/<vendor>/...`
- 配置/文檔/測試

## 示例：圖像生成

圖像生成遵循標準形式：

1. core 定義了 `ImageGenerationProvider`
2. core 公開了 `registerImageGenerationProvider(...)`
3. core 公開了 `runtime.imageGeneration.generate(...)`
4. `openai` 和 `google` 外掛註冊了供應商支援的實作
5. 未來的供應商可以在不修改 channels/tools 的情況下註冊相同的合約

設定金鑰與視覺分析路由是分開的：

- `agents.defaults.imageModel` = 分析圖片
- `agents.defaults.imageGenerationModel` = 產生圖片

將這兩者分開，以便備援和策略保持明確。

## 審查檢查清單

在發布新功能之前，請驗證：

- 沒有 channel/tool 直接匯入供應商程式碼
- runtime helper 是共用的路徑
- 至少有一個合約測試斷言了捆綁所有權
- 設定文件中指名了新的 model/config 金鑰
- 外掛文件說明了所有權邊界

如果 PR 略過了功能層並將供應商行為硬編碼到 channel/tool 中，請將其退回並先定義合約。
