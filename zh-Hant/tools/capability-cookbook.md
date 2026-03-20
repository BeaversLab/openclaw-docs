---
summary: "將新的共享功能新增至 OpenClaw 的食譜"
read_when:
  - 新增新的核心功能與外掛註冊介面
  - 決定程式碼應屬於核心、供應商外掛，還是功能外掛
  - 為通道或工具接線新的執行時期輔助程式
title: "功能食譜"
---

# 功能食譜

當 OpenClaw 需要新的領域（例如影像生成、視訊生成或某些未來由供應商支援的功能區域）時，請使用本指南。

規則：

- plugin = 所有權邊界
- capability = 共享核心合約

這表示你不應該直接將供應商接線到通道或工具。請從定義功能開始。

## 何時建立功能

當以下條件皆成立時，請建立新功能：

1. 多個供應商皆可能合理地實作該功能
2. 通道、工具或功能外掛應使用該功能，而不需關心供應商
3. 核心需要擁有後備、原則、設定或傳遞行為

如果工作僅屬於供應商且尚未存在共享合約，請停止並先定義合約。

## 標準程序

1. 定義類型化的核心合約。
2. 為該合約新增外掛註冊。
3. 新增共享的執行時期輔助程式。
4. 接線一個真實的供應商外掛作為證明。
5. 將功能/通道的消費者移至執行時期輔助程式。
6. 新增合約測試。
7. 記錄操作員導向的設定與所有權模型。

## 位置安排

核心：

- 請求/回應類型
- 提供者註冊表 + 解析
- 後備行為
- 設定結構描述與標籤/說明
- 執行時期輔助程式介面

供應商外掛：

- 供應商 API 呼叫
- 供應商驗證處理
- 供應商特定的請求正規化
- 功能實作的註冊

功能/通道外掛：

- 呼叫 `api.runtime.*` 或相符的 `plugin-sdk/*-runtime` 輔助程式
- 絕不直接呼叫供應商實作

## 檔案檢查清單

對於新功能，預計會涉及以下區域：

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
- 一或多個 `extensions/<vendor>/...`
- config/docs/tests

## 範例：影像生成

影像生成遵循標準結構：

1. core 定義 `ImageGenerationProvider`
2. core 公開 `registerImageGenerationProvider(...)`
3. core 公開 `runtime.imageGeneration.generate(...)`
4. `openai` 和 `google` 外掛程式註冊廠商支援的實作
5. 未來的廠商可以註冊相同的合約，而無需變更 channels/tools

組態金鑰與視覺分析路由是分開的：

- `agents.defaults.imageModel` = 分析影像
- `agents.defaults.imageGenerationModel` = 生成影像

請將這兩者分開，以便回退和原則保持明確。

## 審查檢查清單

在發布新功能之前，請確認：

- 沒有任何 channel/tool 直接匯入廠商程式碼
- runtime helper 是共用路徑
- 至少有一個合約測試斷言捆綁所有權
- 組態文件命名了新的 model/config 金鑰
- 外掛程式文件說明了所有權邊界

如果 PR 略過功能層並將廠商行為硬編碼到 channel/tool 中，請將其退回並先定義合約。

import en from "/components/footer/en.mdx";

<en />
