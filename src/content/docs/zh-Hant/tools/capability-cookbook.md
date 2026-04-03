---
summary: "在 OpenClaw 外掛系統中新增共享功能的貢獻者指南"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "新增功能（貢獻者指南）"
sidebarTitle: "新增功能"
---

# 新增功能

<Info>這是一份供 OpenClaw 核心開發者使用的**貢獻者指南**。如果您正在 建構外部外掛程式，請改參閱 [Building Plugins](/en/plugins/building-plugins)。</Info>

當 OpenClaw 需要一個新的領域（例如影像生成、視訊生成或某些未來廠商支援的功能區域）時，請使用本指南。

規則：

- 外掛 = 所有權邊界
- 功能 = 共享核心合約

這意味著您不應該先將廠商直接連接到通道或工具。請先從定義該功能開始。

## 何時建立功能

當以下所有條件都成立時，請建立一個新功能：

1. 多個廠商可能會實作它
2. 通道、工具或功能外掛應該使用它，而不需要在意具體的廠商
3. 核心需要擁有後備、原則、設定或傳遞行為

如果工作僅針對特定廠商且尚不存在共享合約，請先停止並定義該合約。

## 標準程序

1. 定義型別化的核心合約。
2. 新增該合約的外掛註冊。
3. 新增共享的執行時期協助程式。
4. 連接一個真實的廠商外掛作為證明。
5. 將功能/通道消費者移至執行時期協助程式。
6. 新增合約測試。
7. 記錄面向操作員的設定與所有權模型。

## 內容放置位置

核心：

- 請求/回應型別
- 提供者註冊表 + 解析
- 後備行為
- 設定架構和標籤/說明
- 執行時期協助程式介面

廠商外掛：

- 廠商 API 呼叫
- 廠商驗證處理
- 特定廠商的請求正規化
- 功能實作的註冊

功能/通道外掛：

- 呼叫 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 協助程式
- 絕不直接呼叫廠商實作

## 檔案檢查清單

對於新功能，預期會涉及以下區域：

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
- 一或多個捆綁的外掛程式套件
- config/docs/tests

## 範例：圖像生成

圖像生成遵循標準結構：

1. core 定義了 `ImageGenerationProvider`
2. core 暴露了 `registerImageGenerationProvider(...)`
3. core 暴露了 `runtime.imageGeneration.generate(...)`
4. `openai` 和 `google` 外掛程式註冊了廠商支援的實作
5. 未來的廠商可以註冊相同的合約，而無需更改 channels/tools

配置金鑰與視覺分析路由是分開的：

- `agents.defaults.imageModel` = 分析影像
- `agents.defaults.imageGenerationModel` = 生成影像

將這些分開，以便後備和策略保持明確。

## 審查檢查清單

在發布新功能之前，請驗證：

- 沒有 channel/tool 直接導入廠商程式碼
- runtime helper 是共享路徑
- 至少有一個合約測試斷言了捆綁所有權
- 配置文檔命名了新的 model/config 金鑰
- 外掛程式文檔解釋了所有權邊界

如果 PR 略過了功能層，並將廠商行為硬編碼到 channel/tool 中，請將其退回並先定義合約。
