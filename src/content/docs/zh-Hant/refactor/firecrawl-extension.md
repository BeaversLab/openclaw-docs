---
summary: "設計一個選用的 Firecrawl 擴充功能，在搜索/抓取方面增加價值，而無需將 Firecrawl 硬連線到核心預設值中"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl 擴充功能設計"
---

# Firecrawl 擴充功能設計

## 目標

將 Firecrawl 作為 **選用擴充功能** 發布，加入以下內容：

- 供代理人使用的明確 Firecrawl 工具，
- 選用的 Firecrawl 支援 `web_search` 整合，
- 自我託管支援，
- 比目前的核心後備路徑更強大的安全預設值，

而不將 Firecrawl 推入預設設定/入門路徑。

## 為何採用此形式

最近的 Firecrawl 議題/PR 可歸類為三類：

1. **發行/架構漂移**
   - 數個發行版本拒絕了 `tools.web.fetch.firecrawl`，即使文件和執行時代碼支援它。
2. **安全強化**
   - 目前的 `fetchFirecrawlContent()` 仍然使用原始的 `fetch()` 發送請求到 Firecrawl 端點，而主要的 web-fetch 路徑則使用 SSRF 防護。
3. **產品壓力**
   - 使用者想要 Firecrawl 原生的搜尋/抓取流程，特別是針對自託管/私有設置。
   - 維護者明確拒絕將 Firecrawl 深度整合到核心預設值、設置流程和瀏覽器行為中。

這種結合支持採用擴充功能，而不是在預設核心路徑中加入更多 Firecrawl 特定的邏輯。

## 設計原則

- **選用、供應商範圍**：不自動啟用，不劫持設置，不擴充預設工具配置檔。
- **擴充功能擁有 Firecrawl 特定配置**：優先使用外掛配置，而不是再次擴充 `tools.web.*`。
- **首日即可用**：即使核心 `web_search` / `web_fetch` 介面保持不變也能運作。
- **安全優先**：端點擷取使用與其他網頁工具相同的防護網路狀態。
- **友善自託管**：組態 + 環境變數後備、明確的基底 URL、無僅限託管的假設。

## 建議的擴充功能

外掛 ID：`firecrawl`

### MVP 功能

註冊明確的工具：

- `firecrawl_search`
- `firecrawl_scrape`

未來選用：

- `firecrawl_crawl`
- `firecrawl_map`

在第一個版本中**請勿**加入 Firecrawl 瀏覽器自動化。這是 PR #32543 中將 Firecrawl 過度拉入核心行為並引發最多維護顧慮的部分。

## 組態結構

使用外掛範圍的組態：

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

基底 URL 優先順序：

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### 相容性橋接

對於首個版本，擴充功能可能也會**讀取** `tools.web.fetch.firecrawl.*` 中現有的核心設定作為備用來源，以免現有用戶無需立即遷移。

寫入路徑保持為外掛程式本機。不要持續擴充核心 Firecrawl 設定介面。

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
- 傳回標準化的 OpenClaw 相容結果物件：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 選用 `content`
- 將結果內容包裝為不受信任的外部內容
- 快取鍵包含查詢和相關的提供者參數

為何先使用明確的工具：

- 無需變更 `tools.web.search.provider` 即可於今日運作
- 避免目前的 schema/loader 限制
- 立即讓使用者獲得 Firecrawl 的價值

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
- 傳回 markdown/文字以及元資料：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以與 `web_fetch` 相同的方式包裝提取的內容
- 在實務上與 web 工具預期共享快取語意

為何使用明確的刮取工具：

- 避開核心 `web_fetch` 中未解決的 `Readability -> Firecrawl -> basic HTML cleanup` 排序錯誤
- 為使用者提供針對 JS 較重/受到 bot 保護的網站的決定性「始終使用 Firecrawl」路徑

## 擴充功能不應做的事項

- 不會自動將 `browser`、`web_search` 或 `web_fetch` 新增至 `tools.alsoAllow`
- 在 `openclaw setup` 中沒有預設的上架步驟
- 核心中沒有 Firecrawl 特定的瀏覽器作業階段生命週期
- 在擴充功能 MVP 中，不改變內建 `web_fetch` 後援語意

## 階段計畫

### 階段 1：僅擴充功能，不變更核心 schema

實作：

- `extensions/firecrawl/`
- 外掛程式配置架構
- `firecrawl_search`
- `firecrawl_scrape`
- 針對配置解析、端點選擇、快取、錯誤處理以及 SSRF 防護使用的測試

此階段足以交付真實的用戶價值。

### 階段 2：可選的 `web_search` 提供者整合

僅在修復兩個核心限制後支援 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必須載入已設定/已安裝的 web-search-provider 外掛程式，而不是硬編碼的內建清單。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必須停止以阻擋外掛程式註冊 ID 的方式硬編碼提供者列舉。

建議的形狀：

- 保留內建提供者的文件，
- 允許在執行時使用任何已註冊的外掛程式提供者 ID，
- 透過提供者外掛程式或通用提供者包來驗證特定提供者的配置。

### 第 3 階段：可選的 `web_fetch` provider seam

僅在維護者希望供商特定的 fetch 後端參與 `web_fetch` 時才執行此操作。

所需的核心增補：

- `registerWebFetchProvider` 或等效的 fetch-backend seam

如果沒有該 seam，擴充功能應將 `firecrawl_scrape` 保留為顯式工具，而不是試圖修补內建的 `web_fetch`。

## 安全性要求

該擴充功能必須將 Firecrawl 視為**受信任的操作員配置的端點**，但仍需強化傳輸：

- 對 Firecrawl 端點呼叫使用 SSRF-guarded fetch，而非原始的 `fetch()`
- 使用與其他地方相同的 trusted-web-tools 端點策略，以保持自託管/私有網路相容性
- 絕不記錄 API 金鑰
- 保持端點/基礎 URL 解析的明確性和可預測性
- 將 Firecrawl 傳回的內容視為不受信任的外部內容

這反映了 SSRF 加強 PR 背後的意圖，而不假設 Firecrawl 是充滿敵意的多租戶表面。

## 為何不是技能

該程式庫已關閉了一個 Firecrawl 技能 PR，改由 ClawHub 分發。這對於可選的使用者安裝的提示工作流程來說沒問題，但它並未解決：

- 確定性工具可用性，
- 提供者級別的設定/憑證處理，
- 自託管端點支援，
- 快取，
- 穩定的類型輸出，
- 對網路行為的安全審查。

這應屬於擴充功能，而非僅限提示的技能。

## 成功標準

- 使用者可以安裝/啟用一個擴充功能，並在不觸及核心預設值的情況下獲得可靠的 Firecrawl 搜尋/爬取功能。
- 自託管的 Firecrawl 可透過設定/環境變數備援機制運作。
- 擴充功能端點擷取使用受防護的網路連線。
- 沒有新的 Firecrawl 特定核心導入/預設行為。
- Core 以後可以在不重新設計擴充功能的情況下，採用原生外掛程式 `web_search` / `web_fetch` 接縫。

## 建議的實作順序

1. 建置 `firecrawl_scrape`
2. 建置 `firecrawl_search`
3. 新增文件與範例
4. 如果需要，將 `web_search` 提供者載入一般化，以便擴充功能可以支援 `web_search`
5. 然後再考慮真正的 `web_fetch` 提供者接縫
