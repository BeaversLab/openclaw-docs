---
summary: "Perplexity 網路搜尋提供者設定 (API 金鑰、搜尋模式、篩選)"
title: "Perplexity"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

Perplexity 外掛程式透過 Perplexity 搜尋 API 或透過 OpenRouter 的 Perplexity Sonar 提供網路搜尋功能。

<Note>此頁面是 Perplexity **提供者** (provider) 的設定。關於 Perplexity **工具** (tool) (代理程式如何使用它)，請參閱 [Perplexity tool](/zh-Hant/tools/perplexity-search)。</Note>

| 屬性     | 值                                                                    |
| -------- | --------------------------------------------------------------------- |
| 類型     | 網路搜尋提供者 (不是模型提供者)                                       |
| 驗證     | `PERPLEXITY_API_KEY` (直接) 或 `OPENROUTER_API_KEY` (透過 OpenRouter) |
| 設定路徑 | `plugins.entries.perplexity.config.webSearch.apiKey`                  |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    執行互動式網路搜尋設定流程：

    ```bash
    openclaw configure --section web
    ```

    或直接設定金鑰：

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="開始搜尋">
    一旦設定好金鑰，代理程式將自動使用 Perplexity 進行網路搜尋。不需要額外的步驟。
  </Step>
</Steps>

## 搜尋模式

外掛程式會根據 API 金鑰前綴自動選擇傳輸方式：

<Tabs>
  <Tab title="原生 Perplexity API (pplx-)">當您的金鑰以 `pplx-` 開頭時，OpenClaw 使用原生的 Perplexity 搜尋 API。此傳輸方式會傳回結構化結果，並支援網域、語言 和日期篩選 (請參閱下方的篩選選項)。</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">當您的金鑰以 `sk-or-` 開頭時，OpenClaw 會透過 OpenRouter 使用 Perplexity Sonar 模型進行路由。此傳輸方式會傳回附帶引用文獻的 AI 綜合答案。</Tab>
</Tabs>

| 金鑰前綴 | 傳輸方式                 | 功能                           |
| -------- | ------------------------ | ------------------------------ |
| `pplx-`  | 原生 Perplexity 搜尋 API | 結構化結果、網域/語言/日期篩選 |
| `sk-or-` | OpenRouter (Sonar)       | 附帶引用文獻的 AI 綜合答案     |

## 原生 API 篩選

<Note>篩選選項僅在使用原生 Perplexity API (`pplx-` 金鑰) 時可用。OpenRouter/Sonar 搜尋不支援這些參數。</Note>

使用原生 Perplexity API 時，搜尋支援以下篩選器：

| 篩選器    | 描述                                | 範例                                |
| --------- | ----------------------------------- | ----------------------------------- |
| 國家/地區 | 兩字母國家代碼                      | `us`, `de`, `jp`                    |
| 語言      | ISO 639-1 語言代碼                  | `en`, `fr`, `zh`                    |
| 日期範圍  | 時間窗口                            | `day`, `week`, `month`, `year`      |
| 網域篩選  | 允許清單或封鎖清單 (最多 20 個網域) | `example.com`                       |
| 內容預算  | 每個回應 / 每頁的 Token 限制        | `max_tokens`, `max_tokens_per_page` |

## 進階設定

<AccordionGroup>
  <Accordion title="守護程序的環境變數">
    如果 OpenClaw Gateway 以守護程序 (launchd/systemd) 執行，請確保
    `PERPLEXITY_API_KEY` 對該程序可用。

    <Warning>
    僅在 `~/.profile` 中設定的金鑰將無法被 launchd/systemd
    守護程序看見，除非該環境被明確匯入。請在
    `~/.openclaw/.env` 中設定金鑰或透過 `env.shellEnv` 設定，以確保 gateway 程序可以
    讀取它。
    </Warning>

  </Accordion>

  <Accordion title="OpenRouter 代理設定">
    如果您希望透過 OpenRouter 路由 Perplexity 搜尋，請設定
    `OPENROUTER_API_KEY` (前綴 `sk-or-`) 而非原生 Perplexity 金鑰。
    OpenClaw 將自動檢測前綴並切換到 Sonar 傳輸。

    <Tip>
    如果您已經擁有 OpenRouter 帳戶
    並希望整合多個供應商的帳單，OpenRouter 傳輸會很有用。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Perplexity 搜尋工具" href="/zh-Hant/tools/perplexity-search" icon="magnifying-glass">
    代理程式如何叫用 Perplexity 搜尋並解讀結果。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的組態參考，包括外掛程式項目。
  </Card>
</CardGroup>
