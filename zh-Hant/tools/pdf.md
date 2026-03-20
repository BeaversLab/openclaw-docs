---
title: "PDF 工具"
summary: "使用原生提供者支援和提取後備機制來分析一或多份 PDF 文件"
read_when:
  - 您想要從代理程式分析 PDF
  - 您需要確切的 pdf 工具參數與限制
  - 您正在除錯原生 PDF 模式與提取後備機制
---

# PDF 工具

`pdf` 會分析一或多份 PDF 文件並傳回文字。

快速行為：

- 針對 Anthropic 與 Google 模型提供者使用原生提供者模式。
- 針對其他提供者使用提取後備模式（先提取文字，需要時再提取頁面圖像）。
- 支援單一 (`pdf`) 或多重 (`pdfs`) 輸入，每次呼叫最多 10 份 PDF。

## 可用性

僅當 OpenClaw 能為代理程式解析具備 PDF 能力的模型設定時，才會註冊此工具：

1. `agents.defaults.pdfModel`
2. 後備至 `agents.defaults.imageModel`
3. 根據可用的驗證資訊，後備至盡力而為的提供者預設值

若無法解析可用的模型，將不會公開 `pdf` 工具。

## 輸入參考

- `pdf` (`string`)：一個 PDF 路徑或 URL
- `pdfs` (`string[]`)：多個 PDF 路徑或 URL，總共最多 10 個
- `prompt` (`string`)：分析提示，預設為 `Analyze this PDF document.`
- `pages` (`string`)：頁面過濾器，例如 `1-5` 或 `1,3,7-9`
- `model` (`string`)：選用的模型覆寫 (`provider/model`)
- `maxBytesMb` (`number`)：每份 PDF 的大小上限（單位：MB）

輸入備註：

- `pdf` 和 `pdfs` 會在載入前進行合併與去重。
- 若未提供 PDF 輸入，工具會傳回錯誤。
- `pages` 會被解析為以 1 為基礎的頁碼，經去重、排序，並限制在設定的最大頁數內。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參照

- 本地檔案路徑（包含 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL

參考說明：

- 其他 URI 配置（例如 `ftp://`）將被拒絕並傳回 `unsupported_pdf_reference`。
- 在沙箱模式下，會拒絕遠端 `http(s)` URL。
- 啟用僅限工作區檔案原則後，將會拒絕允許根目錄之外的本地檔案路徑。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
此工具會將原始 PDF 位元組直接傳送至提供者 API。

原生模式限制：

- 不支援 `pages`。如果設定，此工具將傳回錯誤。

### 擷取後援模式

後援模式用於非原生提供者。

流程：

1. 從選取的頁面擷取文字（最多 `agents.defaults.pdfMaxPages` 頁，預設 `20` 頁）。
2. 如果擷取的文字長度低於 `200` 個字元，將選取的頁面轉譯為 PNG 影像並將其包含在內。
3. 將擷取的內容加上提示詞傳送至選取的模型。

後援詳細資訊：

- 頁面影像擷取使用 `4,000,000` 的像素預算。
- 如果目標模型不支援影像輸入且沒有可擷取的文字，此工具將會報錯。
- 擷取後援需要 `pdfjs-dist`（以及 `@napi-rs/canvas` 以進行影像轉譯）。

## 組態

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

完整欄位詳細資訊請參閱 [組態參考](/zh-Hant/gateway/configuration-reference)。

## 輸出詳細資訊

此工具會在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化中繼資料。

常見 `details` 欄位：

- `model`：解析的模型參照 (`provider/model`)
- `native`：原生提供者模式為 `true`，後援模式為 `false`
- `attempts`：成功前失敗的後援嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：具有 `pdf` 個項目的 `details.pdfs[]`
- 沙盒路徑重寫元資料（當適用時）：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：擲回 `pdf required: provide a path or URL to a PDF document`
- PDF 數量過多：在 `details.error = "too_many_pdfs"` 中傳回結構化錯誤
- 不支援的參照架構：傳回 `details.error = "unsupported_pdf_reference"`
- 具有 `pages` 的原生模式：擲回清楚的 `pages is not supported with native PDF providers` 錯誤

## 範例

單一 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

多個 PDF：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

頁面篩選的後援模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
