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
3. 退回到代理程式已解析的 session/預設模型
4. 如果原生 PDF 提供者已驗證身份，則優先於一般圖像後選候選者

如果無法解析可用的模型，則不會暴露 `pdf` 工具。

可用性說明：

- 後選鏈具有驗證感知能力。只有當 OpenClaw 實際上能夠為該代理程式驗證該提供者時，配置的 `provider/model` 才會被計入。
- 目前的原生 PDF 提供者為 **Anthropic** 和 **Google**。
- 如果已解析的 session/預設提供者已經配置了 vision/PDF 模型，PDF 工具會在回退到其他已驗證身份的提供者之前重複使用該模型。

## 輸入參考

- `pdf` (`string`)：一個 PDF 路徑或 URL
- `pdfs` (`string[]`)：多個 PDF 路徑或 URL，總計最多 10 個
- `prompt` (`string`)：分析提示，預設值為 `Analyze this PDF document.`
- `pages` (`string`)：頁面過濾器，例如 `1-5` 或 `1,3,7-9`
- `model` (`string`)：選用的模型覆寫 (`provider/model`)
- `maxBytesMb` (`number`)：單個 PDF 的大小上限（單位為 MB）

輸入說明：

- `pdf` 和 `pdfs` 會在載入前進行合併和重複資料刪除。
- 如果未提供 PDF 輸入，工具會報錯。
- `pages` 會被解析為從 1 開始的頁碼，經過重複資料刪除、排序，並限制在設定的最大頁數範圍內。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參考

- 本機檔案路徑（包括 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL

參考說明：

- 其他 URI 配置（例如 `ftp://`）會被拒絕並返回 `unsupported_pdf_reference`。
- 在沙盒模式下，會拒絕遠端 `http(s)` URL。
- 啟用僅限工作區的檔案策略後，將拒絕允許根目錄之外的本地檔案路徑。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
此工具將原始 PDF 位元組直接傳送到提供者 API。

原生模式限制：

- 不支援 `pages`。如果設定，工具將傳回錯誤。
- 支援多 PDF 輸入；每個 PDF 都會在提示之前作為原生文件區塊 /
  內聯 PDF 部分發送。

### 擷取後援模式

後援模式用於非原生提供者。

流程：

1. 從選取的頁面擷取文字（最多 `agents.defaults.pdfMaxPages`，預設 `20`）。
2. 如果擷取的文字長度低於 `200` 個字元，將選取的頁面渲染為 PNG 影像並包含它們。
3. 將擷取的內容和提示發送到選取的模型。

後援詳細資訊：

- 頁面影像擷取使用 `4,000,000` 的像素預算。
- 如果目標模型不支援影像輸入且沒有可擷取的文字，工具將報錯。
- 如果文字擷取成功，但影像擷取需要純文字模型具備視覺能力，
  OpenClaw 將丟棄渲染的影像並繼續使用擷取的文字。
- 擷取後援需要 `pdfjs-dist`（以及用於影像渲染的 `@napi-rs/canvas`）。

## 設定

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

完整的欄位詳細資訊請參閱 [設定參考](/zh-Hant/gateway/configuration-reference)。

## 輸出詳細資訊

工具在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化元資料。

常見 `details` 欄位：

- `model`：解析的模型參照 (`provider/model`)
- `native`：原生提供者模式為 `true`，後援模式為 `false`
- `attempts`：成功前失敗的後援嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：`details.pdfs[]`，包含 `pdf` 個項目
- 沙箱路徑重寫元資料（適用時）：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：拋出 `pdf required: provide a path or URL to a PDF document`
- PDF 過多：在 `details.error = "too_many_pdfs"` 中返回結構化錯誤
- 不支援的參考方案：返回 `details.error = "unsupported_pdf_reference"`
- 具有 `pages` 的原生模式：拋出清晰的 `pages is not supported with native PDF providers` 錯誤

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

頁面過濾後退模式：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## 相關

- [工具概覽](/zh-Hant/tools) — 所有可用的代理程式工具
- [組態參考](/zh-Hant/gateway/configuration-reference#agent-defaults) — pdfMaxBytesMb 和 pdfMaxPages 組態
