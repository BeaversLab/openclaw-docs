---
summary: "在 OpenClaw 外掛系統中新增共享功能的貢獻者指南"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "新增功能（貢獻者指南）"
sidebarTitle: "新增功能"
---

<Info>這是給 OpenClaw 核心開發者的**貢獻者指南**。如果您正在 建構外部外掛，請參閱[建構外掛](/zh-Hant/plugins/building-plugins)。</Info>

當 OpenClaw 需要一個新的領域，例如影像生成、影片
生成，或某些未來供應商支援的功能區域時使用。

規則：

- 外掛 = 所有權邊界
- 功能 = 共用核心合約

這意味著你不應該開始就將供應商直接連接到 channel 或
tool。從定義該功能開始。

## 何時建立功能

當以下所有條件皆符合時，建立一個新功能：

1. 多於一個供應商可能會實作它
2. channels、tools 或功能外掛應該使用它，而不需要在意
   供應商
3. 核心需要擁有後備、原則、配置或傳遞行為

如果工作僅供特定供應商使用且尚無共用合約，請停止並先定義
該合約。

## 標準流程

1. 定義型別化的核心合約。
2. 為該合約新增外掛註冊。
3. 新增共用的執行時期輔助程式。
4. 連接一個真實的供應商外掛作為證明。
5. 將功能/channel 使用者移至執行時期輔助程式。
6. 新增合約測試。
7. 記錄面向操作員的配置和所有權模型。

## 什麼放在哪裡

核心：

- 請求/回應型別
- 供應商註冊表 + 解析
- 後備行為
- 配置架構以及在巢狀物件、萬用字元、陣列項目和組合節點上傳播的 `title` / `description` 文件元資料
- 執行時期輔助介面

供應商外掛：

- 供應商 API 呼叫
- 供應商驗證處理
- 特定供應商的請求正規化
- 功能實作的註冊

功能/channel 外掛：

- 呼叫 `api.runtime.*` 或對應的 `plugin-sdk/*-runtime` 輔助程式
- 絕不直接呼叫供應商實作

## 提供者和裝置接縫

當該行為屬於模型提供者合約
而非一般代理程式迴圈時，請使用提供者钩子。範例包括在傳輸選擇後的特定提供者請求
參數、驗證設定檔偏好、提示覆蓋，以及
在模型/設定檔故障轉移後的後續後備路由。

當行為屬於執行回合的執行時時，請使用 agent harness hooks。Harness 可以將成功但無法使用的嘗試結果（例如空回應、僅推理或僅規劃的回應）進行分類，以便外部模型備援策略可以做出重試決策。

保持兩個縫隙狹窄：

- core 擁有重試/備援策略
- provider plugins 擁有特定於供應商的請求/認證/路由提示
- harness plugins 擁有特定於執行時的嘗試分類
- 第三方插件返回提示，而不是直接修改 core 狀態

## 檔案檢查清單

對於新功能，預計會涉及這些區域：

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
- 一個或多個捆綁的插件套件
- config/docs/tests

## 範例：圖像生成

圖像生成遵循標準形狀：

1. core 定義 `ImageGenerationProvider`
2. core 公開 `registerImageGenerationProvider(...)`
3. core 公開 `runtime.imageGeneration.generate(...)`
4. `openai`、`google`、`fal` 和 `minimax` 插件註冊供應商支援的實作
5. 未來的供應商可以註冊相同的合約，而無需更改 channels/tools

配置金鑰與視覺分析路由分開：

- `agents.defaults.imageModel` = 分析圖像
- `agents.defaults.imageGenerationModel` = 生成圖像

將這些分開，以便備援和策略保持明確。

## 審查檢查清單

在發布新功能之前，請驗證：

- 沒有 channel/tool 直接導入供應商程式碼
- 執行時助手是共用路徑
- 至少有一個合約測試斷言捆綁的所有權
- 配置文檔命名了新的模型/配置金鑰
- 插件文檔解釋了所有權邊界

如果 PR 跳過了功能層並將供應商行為硬編碼到 channel/tool 中，請將其退回並先定義合約。

## 相關

- [插件](/zh-Hant/tools/plugin)
- [建立技能](/zh-Hant/tools/creating-skills)
- [工具與外掛](/zh-Hant/tools)
