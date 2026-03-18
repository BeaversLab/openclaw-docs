---
summary: "設計一個選用的 Firecrawl 擴充功能，新增搜尋/抓取價值，而不將 Firecrawl 硬編碼至核心預設值"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl 擴充功能設計"
---

# Firecrawl 擴充功能設計

## 目標

將 Firecrawl 作為**選用擴充功能**推出，新增：

- 供代理程式使用的明確 Firecrawl 工具，
- 選用的 Firecrawl 支援 `web_search` 整合，
- 自託管支援，
- 比目前的核心後援路徑更強大的安全性預設值，

而不將 Firecrawl 推向預設設定/入門路徑。

## 為何採用此形式

近期的 Firecrawl 問題/PR 可歸納為三類：

1. **版本/架構漂移**
   - 有數個版本拒絕了 `tools.web.fetch.firecrawl`，儘管文件和執行時代碼支援它。
2. **安全性強化**
   - 目前的 `fetchFirecrawlContent()` 仍會使用原始 `fetch()` 將資料傳送到 Firecrawl 端點，而主要的 web-fetch 路徑則使用 SSRF 防護。
3. **產品壓力**
   - 使用者想要 Firecrawl 原生的搜尋/抓取流程，特別是針對自託管/私人設定。
   - 維護者明確拒絕將 Firecrawl 深度連結至核心預設值、設定流程和瀏覽器行為。

該種組合證明了需要擴充功能，而非在預設核心路徑中增加更多 Firecrawl 特定邏輯。

## 設計原則

- **選用、廠商範圍**：不自動啟用、不劫持設定、不擴充預設工具設定檔。
- **擴充功能擁有 Firecrawl 特定設定**：優先使用外掛設定，而非再次擴充 `tools.web.*`。
- **首日即可用**：即使核心 `web_search` / `web_fetch` 介面保持不變也能運作。
- **安全優先**：端點擷取使用與其他網路工具相同的受防護網路 stance。
- **友善自託管**：設定 + 環境變數後援、明確的基礎 URL、無僅限託管的假設。

## 提議的擴充功能

外掛 ID：`firecrawl`

### MVP 功能

註冊明確工具：

- `firecrawl_search`
- `firecrawl_scrape`

選項（稍後）：

- `firecrawl_crawl`
- `firecrawl_map`

首個版本**請勿**加入 Firecrawl 瀏覽器自動化功能。這是 PR #32543 中將 Firecrawl 過度牽引至核心行為的部分，也引發了最大的維護疑慮。

## 設定形狀

使用外掛範圍的設定：

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          apiKey: "FIRECRAWL_API_KEY",
          baseUrl: "https://api.firecrawl.dev",
          timeoutSeconds: 60,
          maxAgeMs: 172800000,
          proxy: "auto",
          storeInCache: true,
          onlyMainContent: true,
          search: {
            enabled: true,
            defaultLimit: 5,
            sources: ["web"],
            categories: [],
            scrapeResults: false,
          },
          scrape: {
            formats: ["markdown"],
            fallbackForWebFetchLikeUse: false,
          },
        },
      },
    },
  },
}
```

### 憑證解析

優先順序：

1. `plugins.entries.firecrawl.config.apiKey`
2. `FIRECRAWL_API_KEY`

基礎 URL 優先順序：

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### 相容性橋樑

對於首個版本，擴充功能可能也會**讀取** `tools.web.fetch.firecrawl.*` 的現有核心設定作為備用來源，讓現有使用者無需立即遷移。

寫入路徑保持在外掛本機。不要持續擴充核心 Firecrawl 設定介面。

## 工具設計

### `firecrawl_search`

輸入：

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

行為：

- 呼叫 Firecrawl `v2/search`
- 傳回正規化且相容 OpenClaw 的結果物件：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 選用 `content`
- 將結果內容包裝為不受信任的外部內容
- 快取索引鍵包含查詢和相關供應商參數

為何先提供明確工具：

- 目前無須變更 `tools.web.search.provider` 即可運作
- 避免目前的 Schema/載入器限制
- 立即為使用者提供 Firecrawl 價值

### `firecrawl_scrape`

輸入：

- `url`
- `formats`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

行為：

- 呼叫 Firecrawl `v2/scrape`
- 傳回 Markdown/文字加上中繼資料：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以與 `web_fetch` 相同的方式包裝擷取的內容
- 在實務上，與網頁工具期望共享快取語意

為何使用明確的抓取工具：

- 避開核心 `Readability -> Firecrawl -> basic HTML cleanup` 中未解決的排序錯誤 `web_fetch`
- 為使用者提供一個確定性、針對重度 JS 或防機器人網站「一律使用 Firecrawl」的路徑

## 擴充功能不應做的事項

- 不自動將 `browser`、`web_search` 或 `web_fetch` 新增至 `tools.alsoAllow`
- 在 `openclaw setup` 中沒有預設的上線步驟
- 核心中沒有 Firecrawl 專用的瀏覽器工作階段生命週期
- 在擴充功能 MVP 中，不變更內建 `web_fetch` 的後備語意

## 階段計畫

### 第 1 階段：僅擴充功能，不變更核心架構

實作：

- `extensions/firecrawl/`
- 外掛程式設定架構
- `firecrawl_search`
- `firecrawl_scrape`
- 針對設定解析、端點選擇、快取、錯誤處理以及 SSRF 防護使用的測試

此階段足以提供真正的使用者價值。

### 第 2 階段：選用性 `web_search` 提供者整合

僅在修正兩個核心限制後支援 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必須載入已設定/已安裝的 web-search-provider 外掛程式，而不是硬式編碼的內附清單。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必須停止以阻擋外掛程式註冊 ID 的方式硬式編碼提供者列舉。

建議的形狀：

- 保留內建提供者的文件記載，
- 允許在執行時期使用任何已註冊的外掛程式提供者 ID，
- 透過提供者外掛程式或通用提供者包來驗證提供者專用設定。

### 第 3 階段：選用性 `web_fetch` 提供者接縫

僅在維護者希望廠商專用的擷取後端參與 `web_fetch` 時才執行此動作。

需要的核心新增項目：

- `registerWebFetchProvider` 或等效的擷取後端接縫

若沒有該接縫，擴充功能應將 `firecrawl_scrape` 保留為明確工具，而不是嘗試修補內建的 `web_fetch`。

## 安全需求

擴充功能必須將 Firecrawl 視為**受信任的操作員設定端點**，但仍需強化傳輸：

- 對 Firecrawl 端點呼叫使用受 SSRF 保護的 fetch，而非原始的 `fetch()`
- 使用與其他地方相同的 trusted-web-tools 端點策略，以保持自託管/私人網路的相容性
- 切勿記錄 API 金鑰
- 保持端點/基礎 URL 解析明確且可預測
- 將 Firecrawl 傳回的內容視為不受信任的外部內容

這反映了 SSRF 加強 PR 背後的意圖，而不假設 Firecrawl 是惡意的多租戶表面。

## 為何不是技能

該儲存庫已關閉 Firecrawl 技能 PR，改為透過 ClawHub 分發。這對於選用性的使用者安裝提示工作流程來說沒問題，但它並未解決：

- 工具可用性的確定性，
- 提供者級別的設定/憑證處理，
- 自託管端點支援，
- 快取，
- 穩定的型別輸出，
- 對網路行為的安全性審查。

這應該屬於擴充功能，而不僅僅是僅限提示的技能。

## 成功準則

- 使用者可以安裝/啟用一個擴充功能，並獲得可靠的 Firecrawl 搜尋/抓取，而無需接觸核心預設值。
- 自託管的 Firecrawl 可透過設定/環境變數備援機制運作。
- 擴充功能端點提取使用受保護的網路連線。
- 沒有新的 Firecrawl 特定核心導入/預設行為。
- 核心稍後可以採用外掛原生的 `web_search` / `web_fetch` 縫合，而無需重新設計擴充功能。

## 建議的實作順序

1. 建構 `firecrawl_scrape`
2. 建構 `firecrawl_search`
3. 新增文件和範例
4. 如果需要，一般化 `web_search` 提供者載入，以便擴充功能可以支援 `web_search`
5. 只有在這之後才考慮真正的 `web_fetch` 提供者縫合

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
