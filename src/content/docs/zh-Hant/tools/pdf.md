---
title: "PDF 工具"
summary: "使用原生提供者支援和提取後備機制來分析一或多個 PDF 文件"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

# PDF 工具

`pdf` 會分析一或多個 PDF 文件並傳回文字。

快速行為：

- 針對 Anthropic 和 Google 模型提供者的原生提供者模式。
- 針對其他提供者的提取後備模式（先提取文字，有需要時再提取頁面圖片）。
- 支援單一 (`pdf`) 或多個 (`pdfs`) 輸入，每次呼叫最多 10 個 PDF。

## 可用性

只有當 OpenClaw 能夠解析代理程式的 PDF 相容模型設定時，才會註冊此工具：

1. `agents.defaults.pdfModel`
2. 後備至 `agents.defaults.imageModel`
3. 根據可用的驗證資訊後備至盡力而為的提供者預設值

如果無法解析可用的模型，`pdf` 工具將不會被公開。

## 輸入參考

- `pdf` (`string`)：一個 PDF 路徑或 URL
- `pdfs` (`string[]`)：多個 PDF 路徑或 URL，總計最多 10 個
- `prompt` (`string`)：分析提示詞，預設為 `Analyze this PDF document.`
- `pages` (`string`)：頁面過濾器，例如 `1-5` 或 `1,3,7-9`
- `model` (`string`)：選用的模型覆寫 (`provider/model`)
- `maxBytesMb` (`number`)：單個 PDF 大小上限（MB）

輸入備註：

- `pdf` 和 `pdfs` 會在載入前進行合併和去重。
- 如果未提供 PDF 輸入，工具會報錯。
- `pages` 會被解析為從 1 開始的頁碼，經去重、排序並限制在設定的最大頁數範圍內。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參考

- 本機檔案路徑（包含 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL

參考說明：

- 其他 URI 格式（例如 `ftp://`）會被拒絕並傳回 `unsupported_pdf_reference`。
- 在沙盒模式下，遠端 `http(s)` URL 會被拒絕。
- 啟用僅限工作區檔案政策時，允許根目錄之外的本地檔案路徑會被拒絕。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
工具會將原始 PDF 位元組直接傳送至提供者 API。

原生模式限制：

- 不支援 `pages`。若設定，工具會傳回錯誤。

### 擷取後備模式

後備模式用於非原生提供者。

流程：

1. 從選取的頁面擷取文字（最多 `agents.defaults.pdfMaxPages`，預設 `20`）。
2. 如果擷取的文字長度低於 `200` 個字元，將選取的頁面渲染為 PNG 影像並包含在其中。
3. 將擷取的內容加上提示傳送至選取的模型。

後備細節：

- 頁面影像擷取使用 `4,000,000` 的像素預算。
- 如果目標模型不支援影像輸入且沒有可擷取的文字，工具會報錯。
- 擷取後備需要 `pdfjs-dist`（以及影像渲染所需的 `@napi-rs/canvas`）。

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

請參閱 [Configuration Reference](/en/gateway/configuration-reference) 以取得完整的欄位詳細資訊。

## 輸出詳細資訊

工具會在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化中繼資料。

常見 `details` 欄位：

- `model`：已解析的模型參考 (`provider/model`)
- `native`：原生提供者模式為 `true`，後備模式為 `false`
- `attempts`：成功前失敗的後備嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：`details.pdfs[]` 包含 `pdf` 項目
- 沙盒路徑重寫中繼資料（當適用時）：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：拋出 `pdf required: provide a path or URL to a PDF document`
- PDF 過多：在 `details.error = "too_many_pdfs"` 中返回結構化錯誤
- 不支援的參照方案：返回 `details.error = "unsupported_pdf_reference"`
- 具有 `pages` 的原生模式：拋出明確的 `pages is not supported with native PDF providers` 錯誤

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

頁面過濾的後備模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## 相關

- [工具概覽](/en/tools) — 所有可用的代理工具
- [組態參考](/en/gateway/configuration-reference#agent-defaults) — pdfMaxBytesMb 與 pdfMaxPages 組態
