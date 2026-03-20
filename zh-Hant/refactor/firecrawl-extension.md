---
summary: "設計一個選用的 Firecrawl 擴充功能，新增搜尋/擷取價值而不將 Firecrawl 硬編碼到核心預設值中"
read_when:
  - 設計 Firecrawl 整合工作
  - 評估 web_search/web_fetch 外掛縫隙
  - 決定 Firecrawl 應屬於核心還是作為擴充功能
title: "Firecrawl Extension Design"
---

# Firecrawl Extension Design

## Goal

Ship Firecrawl as an **opt-in extension** that adds:

- explicit Firecrawl tools for agents,
- optional Firecrawl-backed `web_search` integration,
- self-hosted support,
- stronger security defaults than the current core fallback path,

without pushing Firecrawl into the default setup/onboarding path.

## Why this shape

Recent Firecrawl issues/PRs cluster into three buckets:

1. **Release/schema drift**
   - Several releases rejected `tools.web.fetch.firecrawl` even though docs and runtime code supported it.
2. **Security hardening**
   - Current `fetchFirecrawlContent()` still posts to the Firecrawl endpoint with raw `fetch()`, while the main web-fetch path uses the SSRF guard.
3. **Product pressure**
   - Users want Firecrawl-native search/scrape flows, especially for self-hosted/private setups.
   - Maintainers explicitly rejected wiring Firecrawl deeply into core defaults, setup flow, and browser behavior.

That combination argues for an extension, not more Firecrawl-specific logic in the default core path.

## Design principles

- **Opt-in, vendor-scoped**: no auto-enable, no setup hijack, no default tool-profile widening.
- **Extension owns Firecrawl-specific config**: prefer plugin config over growing `tools.web.*` again.
- **Useful on day one**: works even if core `web_search` / `web_fetch` seams stay unchanged.
- **Security-first**: endpoint fetches use the same guarded networking posture as other web tools.
- **Self-hosted-friendly**: config + env fallback, explicit base URL, no hosted-only assumptions.

## Proposed extension

Plugin id: `firecrawl`

### MVP capabilities

Register explicit tools:

- `firecrawl_search`
- `firecrawl_scrape`

Optional later:

- `firecrawl_crawl`
- `firecrawl_map`

首個版本中**切勿**加入 Firecrawl 瀏覽器自動化功能。這正是 PR #32543 中將 Firecrawl 過度捲入核心行為的部分，也引發了最多的維護疑慮。

## Config 形狀

使用 plugin-scoped config：

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

在首個版本中，擴充功能也可能**讀取** `tools.web.fetch.firecrawl.*` 中現有的核心 config 作為備用來源，讓現有使用者無需立即遷移。

寫入路徑保持 plugin-local。不要持續擴充核心 Firecrawl config 表面。

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
- 傳回標準化的 OpenClaw-friendly 結果物件：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 選用 `content`
- 將結果內容包裝為不信任的外部內容
- 快取鍵包含查詢 + 相關的提供者參數

為何先採用明確工具：

- 無需變更 `tools.web.search.provider` 即可在今日運作
- 避免目前的 schema/loader 限制
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
- 傳回 markdown/text 加上中繼資料：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以與 `web_fetch` 相同的方式包裝擷取的內容
- 在實務上與 web 工具預期共享快取語意

為什麼要有明確的刮取工具：

- 避開核心 `web_fetch` 中未解決的 `Readability -> Firecrawl -> basic HTML cleanup` 順序錯誤
- 為使用者提供針對重度 JS 或受機器人保護網站的確定性「一律使用 Firecrawl」路徑

## 擴充功能不應做的事項

- 不自動將 `browser`、`web_search` 或 `web_fetch` 加入 `tools.alsoAllow`
- 在 `openclaw setup` 中沒有預設的入門步驟
- 核心中沒有 Firecrawl 專用的瀏覽器 session 生命週期
- 在擴充功能 MVP 中，不改變內建 `web_fetch` 的後備語意

## 階段計畫

### 階段 1：僅擴充功能，不變更核心架構

實作：

- `extensions/firecrawl/`
- plugin config schema
- `firecrawl_search`
- `firecrawl_scrape`
- 針對設定解析、端點選擇、快取、錯誤處理和 SSRF 防護使用的測試

此階段已足以提供實際的使用者價值。

### 階段 2：選用 `web_search` 提供者整合

僅在修正兩個核心限制後支援 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必須載入已設定/已安裝的 web-search-provider 外掛，而非硬式編碼的內建清單。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必須停止以阻擋外掛註冊 ID 的方式硬式編碼提供者列舉。

建議的形狀：

- 將內建提供者保留在文件中，
- 在執行時期允許任何已註冊的外掛提供者 ID，
- 透過提供者外掛或通用提供者包來驗證特定提供者的設定。

### 階段 3：選用 `web_fetch` 提供者接縫

僅在維護者希望特定供應商的 fetch 後端參與 `web_fetch` 時才進行此操作。

需要的核心新增功能：

- `registerWebFetchProvider` 或對等的 fetch-backend 接縫

沒有該接縫，擴充功能應將 `firecrawl_scrape` 保持為明確的工具，而不是嘗試修補內建的 `web_fetch`。

## 安全性需求

擴充功能必須將 Firecrawl 視為**受信任的操作員設定端點**，但仍需強化傳輸：

- 使用受 SSRF 保護的 fetch 來呼叫 Firecrawl 端點，而不是原始的 `fetch()`
- 使用與其他地方相同的受信任網路工具端點策略，以保持自託管/私有網路的相容性
- 絕不要記錄 API 金鑰
- 保持端點/基礎 URL 解析的明確性和可預測性
- 將 Firecrawl 返回的內容視為不受信任的外部內容

這反映了 SSRF 加強 PR 背後的意圖，而不假設 Firecrawl 是敵對的多租戶表面。

## 為何不使用技能

該儲存庫已關閉 Firecrawl 技能 PR，改為透過 ClawHub 分發。這對於可選的使用者安裝的提示工作流程來說沒問題，但它無法解決：

- 確定性的工具可用性，
- 提供者層級的設定/憑證處理，
- 自託管端點支援，
- 快取，
- 穩定的類型化輸出，
- 對網路行為的安全性審查。

這應該屬於擴充功能，而不僅是僅限提示的技能。

## 成功標準

- 使用者可以安裝/啟用一個擴充功能並獲得可靠的 Firecrawl 搜尋/抓取，而無需觸及核心預設值。
- 自託管的 Firecrawl 可透過設定/環境變數後援機制運作。
- 擴充功能端點提取使用受防護的網路連線。
- 沒有新的特定於 Firecrawl 的核心入門/預設行為。
- 核心稍後可以採用外掛原生的 `web_search` / `web_fetch` 縫隙，而無需重新設計擴充功能。

## 建議的實作順序

1. 建構 `firecrawl_scrape`
2. 建構 `firecrawl_search`
3. 新增文件和範例
4. 如果需要，一般化 `web_search` 提供者載入，以便擴充功能可以支援 `web_search`
5. 只有在那之後才考慮真正的 `web_fetch` 提供者縫隙

import en from "/components/footer/en.mdx";

<en />
