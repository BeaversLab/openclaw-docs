---
title: "PDF 工具"
summary: "使用原生提供者支援和擷取後援模式來分析一或多個 PDF 文件"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

# PDF 工具

`pdf` 分析一或多個 PDF 文件並傳回文字。

快速行為：

- 針對 Anthropic 和 Google 模型提供者的原生提供者模式。
- 針對其他提供者的擷取後援模式（先擷取文字，視需要再擷取頁面圖片）。
- 支援單一 (`pdf`) 或多重 (`pdfs`) 輸入，每次呼叫最多 10 個 PDF。

## 可用性

只有在 OpenClaw 可以為代理程式解析具備 PDF 功能的模型設定時，才會註冊該工具：

1. `agents.defaults.pdfModel`
2. 後援至 `agents.defaults.imageModel`
3. 根據可用的驗證後援至盡力的提供者預設值

如果無法解析可用的模型，`pdf` 工具將不會顯示。

## 輸入參考

- `pdf` (`string`)：一個 PDF 路徑或 URL
- `pdfs` (`string[]`)：多個 PDF 路徑或 URL，總計最多 10 個
- `prompt` (`string`)：分析提示，預設為 `Analyze this PDF document.`
- `pages` (`string`)：頁面過濾器，例如 `1-5` 或 `1,3,7-9`
- `model` (`string`)：選用的模型覆寫 (`provider/model`)
- `maxBytesMb` (`number`)：每個 PDF 的大小上限，單位為 MB

輸入備註：

- `pdf` 和 `pdfs` 會在載入前合併並重複資料刪除。
- 如果未提供 PDF 輸入，工具會回報錯誤。
- `pages` 會被解析為以 1 為基礎的頁碼、重複資料刪除、排序，並限制在設定的最大頁數內。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參照

- 本地檔案路徑（包括 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL

參考說明：

- 其他 URI 配置（例如 `ftp://`）會被拒絕並傳回 `unsupported_pdf_reference`。
- 在沙箱模式下，遠端 `http(s)` URL 會被拒絕。
- 啟用僅限工作區檔案政策時，允許根目錄外的本機檔案路徑會被拒絕。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
此工具會將原始 PDF 位元組直接傳送至提供者 API。

原生模式限制：

- 不支援 `pages`。如果設定，工具會傳回錯誤。

### 提取備援模式

備援模式用於非原生提供者。

流程：

1. 從選取的頁面提取文字（最多 `agents.defaults.pdfMaxPages`，預設 `20`）。
2. 如果提取的文字長度低於 `200` 個字元，將選取的頁面渲染為 PNG 影像並包含其中。
3. 將提取的內容加上提示詞傳送至選取的模型。

備援詳情：

- 頁面影像提取使用 `4,000,000` 的像素預算。
- 如果目標模型不支援影像輸入且沒有可提取的文字，工具會報錯。
- 提取備援需要 `pdfjs-dist`（以及 `@napi-rs/canvas` 用於影像渲染）。

## 設定

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

完整欄位詳情請參閱 [設定參考](/zh-Hant/gateway/configuration-reference)。

## 輸出詳情

工具會在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化元資料。

常見 `details` 欄位：

- `model`：解析的模型參考 (`provider/model`)
- `native`：原生提供者模式為 `true`，備援模式為 `false`
- `attempts`：成功前失敗的備援嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：具有 `pdf` 項目的 `details.pdfs[]`
- 沙箱路徑重寫元資料（適用時）：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：擲回 `pdf required: provide a path or URL to a PDF document`
- PDF 過多：在 `details.error = "too_many_pdfs"` 中回傳結構化錯誤
- 不支援的參照方案：回傳 `details.error = "unsupported_pdf_reference"`
- 帶有 `pages` 的原生模式：擲回清晰的 `pages is not supported with native PDF providers` 錯誤

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

頁面篩選後備模型：

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
