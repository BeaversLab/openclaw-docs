---
summary: "設計一個選用式 Firecrawl 擴充功能，在不將 Firecrawl 硬連線至核心預設值的情況下，新增搜尋/擷取價值"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl 擴充功能設計"
---

# Firecrawl 擴充功能設計

## 目標

將 Firecrawl 作為**選用式擴充功能**推出，它新增了：

- 供代理使用的明確 Firecrawl 工具，
- 可選的 Firecrawl 支援 `web_search` 整合，
- 自我託管支援，
- 比目前的核心備援路徑更強的安全性預設值，

且不將 Firecrawl 推送到預設設定/入門路徑中。

## 為何採用此形式

近期的 Firecrawl 問題/PR 聚集在三個類別中：

1. **版本/架構漂移**
   - 數個版本拒絕了 `tools.web.fetch.firecrawl`，即使文件和執行時代碼支援它。
2. **安全性強化**
   - 目前的 `fetchFirecrawlContent()` 仍會使用原始 `fetch()` 發佈至 Firecrawl 端點，而主要的 web-fetch 路徑則使用 SSRF 防護。
3. **產品壓力**
   - 使用者想要 Firecrawl 原生的搜尋/擷取流程，特別是針對自我託管/私人設定。
   - 維護者明確拒絕將 Firecrawl 深度連線至核心預設值、設定流程和瀏覽器行為。

這種結合支持採用擴充功能，而非在預設核心路徑中加入更多特定於 Firecrawl 的邏輯。

## 設計原則

- **選用式、供應商範圍**：不自動啟用、不劫持設定、不擴充預設工具設定檔。
- **擴充功能擁有 Firecrawl 特定設定**：偏好外掛設定而非再次擴充 `tools.web.*`。
- **首日即可用**：即使核心 `web_search` / `web_fetch` 介面保持不變也能運作。
- **安全優先**：端點擷取使用與其他網頁工具相同的防護網路姿態。
- **利於自我託管**：設定 + 環境變數備援、明確的基礎 URL、無僅限託管的假設。

## 建議的擴充功能

外掛 ID：`firecrawl`

### MVP 功能

註冊明確工具：

- `firecrawl_search`
- `firecrawl_scrape`

稍後選用：

- `firecrawl_crawl`
- `firecrawl_map`

請在第一個版本中**不要**新增 Firecrawl 瀏覽器自動化。這是 PR #32543 中將 Firecrawl 過度牽引入核心行為的部分，也引發了最多的維護者疑慮。

## Config 形狀

使用外掛範圍的 config：

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

Base URL 優先順序：

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### 相容性橋接

在第一個版本中，擴充功能也可以**讀取**位於 `tools.web.fetch.firecrawl.*` 的現有核心 config 作為備用來源，以便現有用戶無需立即遷移。

寫入路徑保持在外掛本機。請勿不斷擴充核心 Firecrawl config 表面。

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
- 傳回標準化且相容 OpenClaw 的結果物件：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 選用 `content`
- 將結果內容包裝為不受信任的外部內容
- 快取鍵包含查詢 + 相關的提供者參數

為何先有明確的工具：

- 無需變更 `tools.web.search.provider` 即可於現階段運作
- 避免目前 schema/loader 的限制
- 立即為用戶提供 Firecrawl 價值

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
- 傳回 markdown/文字以及中繼資料：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以與 `web_fetch` 相同的方式包裝擷取的內容
- 在切實可行的情況下，與 web 工具的預期共用快取語意

為什麼要提供明確的 scrape 工具：

- 避開了核心中未解決的 `Readability -> Firecrawl -> basic HTML cleanup` 排序錯誤 `web_fetch`
- 為 JS 較重/有 bot 保護的網站提供使用者一個確定的「始終使用 Firecrawl」路徑

## 擴充功能不應做的事項

- 不會自動將 `browser`、`web_search` 或 `web_fetch` 加入到 `tools.alsoAllow`
- 在 `openclaw setup` 中沒有預設的入門步驟
- 核心中沒有特定於 Firecrawl 的瀏覽器會話生命週期
- 在擴充功能 MVP 中，不改變內建 `web_fetch` 的後備語意

## 階段計畫

### 階段 1：僅擴充功能，無核心架構變更

實作：

- `extensions/firecrawl/`
- 外掛程式配置架構
- `firecrawl_search`
- `firecrawl_scrape`
- 針對配置解析、端點選擇、快取、錯誤處理和 SSRF 防護使用的測試

此階段足以提供實際的使用者價值。

### 階段 2：選用 `web_search` 提供者整合

僅在修正兩個核心限制後才支援 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必須載入已配置/已安裝的 web-search-provider 外掛程式，而不是硬式編碼的內建清單。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必須停止以阻擋外掛註冊 ID 的方式硬式編碼提供者列舉。

建議的形狀：

- 保留內建提供者的文件，
- 允許在執行時期使用任何已註冊的外掛提供者 ID，
- 透過提供者外掛程式或通用提供者套件驗證特定於提供者的配置。

### 階段 3：選用 `web_fetch` 提供者縫隙

僅當維護者希望供應商特定的提取後端參與 `web_fetch` 時才執行此操作。

需要的核心新增功能：

- `registerWebFetchProvider` 或同等的提取後端縫隙

如果沒有該縫隙，擴充功能應將 `firecrawl_scrape` 保持為明確工具，而不是嘗試修補內建 `web_fetch`。

## 安全性要求

擴充功能必須將 Firecrawl 視為 **受信任的操作員配置端點**，但仍需強化傳輸：

- 對 Firecrawl 端點呼叫使用受 SSRF 保護的 fetch，而非原始的 `fetch()`
- 使用與其他地方相同的 trusted-web-tools 端點策略，以保留自託管/私人網路的相容性
- 絕不記錄 API 金鑰
- 保持端點/基礎 URL 解析明確且可預測
- 將 Firecrawl 傳回的內容視為不受信任的外部內容

這反映了 SSRF 加強 PR 背後的意圖，而不假設 Firecrawl 是惡意的多租戶環境。

## 為何不是技能

該程式庫已關閉一個 Firecrawl 技能 PR，改採 ClawHub 發行。這對於使用者可選安裝的提示工作流程來說沒問題，但並未解決：

- 確定的工具可用性，
- 供應商等級的設定/憑證處理，
- 自託管端點支援，
- 快取，
- 穩定的型別輸出，
- 針對網路行為的安全性審查。

這應屬於擴充功能，而非僅限提示的技能。

## 成功標準

- 使用者可以安裝/啟用一個擴充功能，並在無需觸碰核心預設值的情況下獲得可靠的 Firecrawl 搜尋/爬取功能。
- 自託管的 Firecrawl 可透過設定/環境變數後援來運作。
- 擴充功能端點的提取使用受防護的網路連線。
- 沒有新的 Firecrawl 專屬核心上架/預設行為。
- 核心稍後可採用外掛原生的 `web_search` / `web_fetch` 縫合，而無需重新設計擴充功能。

## 建議的實作順序

1. 建構 `firecrawl_scrape`
2. 建構 `firecrawl_search`
3. 新增文件與範例
4. 如果需要，一般化 `web_search` 供應商載入，以便擴充功能可以支援 `web_search`
5. 只有在那之後才考慮真正的 `web_fetch` 供應商縫合
