---
summary: "使用原生提供者支援和提取後備機制來分析一個或多個 PDF 文件"
title: "PDF 工具"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

`pdf` 會分析一個或多個 PDF 文件並傳回文字。

快速行為：

- 針對 Anthropic 和 Google 模型提供者使用原生提供者模式。
- 針對其他提供者使用提取後備模式（先提取文字，有需要時再提取頁面圖片）。
- 支援單一 (`pdf`) 或多個 (`pdfs`) 輸入，每次呼叫最多 10 個 PDF。

## 可用性

僅當 OpenClaw 能為代理程式解析支援 PDF 的模型設定時，才會註冊此工具：

1. `agents.defaults.pdfModel`
2. 後備至 `agents.defaults.imageModel`
3. 後備至代理程式已解析的 session/default 模型
4. 如果原生 PDF 提供者需要身份驗證，則優先於通用圖片後備候選項

如果無法解析可用的模型，則不會公開 `pdf` 工具。

可用性說明：

- 後備鏈具有身份驗證感知能力。僅當
  OpenClaw 實際上能為代理程式驗證該提供者時，設定的 `provider/model` 才會計算在內。
- 目前的原生 PDF 提供者為 **Anthropic** 和 **Google**。
- 如果已解析的 session/default 提供者已設定視覺/PDF
  模型，PDF 工具會在後備至其他需身份驗證的
  提供者之前重複使用該模型。

## 輸入參考

<ParamField path="pdf" type="string">
  一個 PDF 路徑或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
  多個 PDF 路徑或 URL，最多共 10 個。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  分析提示詞。
</ParamField>

<ParamField path="pages" type="string">
  頁面篩選器，例如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="model" type="string">
  以 `provider/model` 格式表示的選用模型覆寫。
</ParamField>

<ParamField path="maxBytesMb" type="number">
  單一 PDF 的容量上限（單位為 MB）。預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

輸入備註：

- `pdf` 和 `pdfs` 會在載入前合併並去重。
- 若未提供 PDF 輸入，此工具會回報錯誤。
- `pages` 會被解析為從 1 開始的頁碼，經過去重、排序，並限制在設定的最大頁數範圍內。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參考

- 本機檔案路徑（包括 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL
- 由 OpenClaw 管理的輸入參考，例如 `media://inbound/<id>`

參考說明：

- 其他 URI 配置（例如 `ftp://`）會被拒絕並回傳 `unsupported_pdf_reference`。
- 在沙盒模式下，遠端 `http(s)` URL 會被拒絕。
- 啟用僅限工作區的檔案策略後，將拒絕允許根目錄之外的本地檔案路徑。
- 在僅限工作區的檔案政策下，允許使用受管理的輸入參考以及 OpenClaw 輸入媒體存放區下的重播路徑。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
此工具會將原始 PDF 位元組直接傳送至提供者 API。

原生模式限制：

- 不支援 `pages`。若設定此項，工具會回傳錯誤。
- 支援多 PDF 輸入；每個 PDF 會在提示詞之前作為原生文件區塊 /
  內聯 PDF 部分傳送。

### 提取後援模式

後援模式用於非原生提供者。

流程：

1. 從選取的頁面提取文字（最多 `agents.defaults.pdfMaxPages` 頁，預設 `20`）。
2. 如果提取的文字長度低於 `200` 個字元，將選取的頁面呈現為 PNG 影像並包含其中。
3. 將提取的內容連同提示詞傳送至選取的模型。

後援詳情：

- 頁面影像提取使用 `4,000,000` 的像素預算。
- 如果目標模型不支援影像輸入且無可提取的文字，工具會回報錯誤。
- 如果文字擷取成功，但圖片擷取需要僅限文字的模型具備視覺能力，OpenClaw 將捨棄渲染的圖片並繼續使用擷取的文字。
- 擷取回退使用內建的 `document-extract` 外掛程式。該外掛程式擁有 `pdfjs-dist`；僅當圖片渲染回退可用時才使用 `@napi-rs/canvas`。

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

完整的欄位詳情請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## 輸出詳情

該工具會在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化中繼資料。

常見的 `details` 欄位：

- `model`：解析後的模型參照 (`provider/model`)
- `native`：原生提供者模式為 `true`，回退模式為 `false`
- `attempts`：成功前失敗的回退嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：`details.pdfs[]`，包含 `pdf` 個項目
- 沙箱路徑重寫中繼資料 (若適用)：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：擲出 `pdf required: provide a path or URL to a PDF document`
- PDF 數量過多：在 `details.error = "too_many_pdfs"` 中傳回結構化錯誤
- 不支援的參照架構：傳回 `details.error = "unsupported_pdf_reference"`
- 具備 `pages` 的原生模式：擲出明確的 `pages is not supported with native PDF providers` 錯誤

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

頁面過濾的回退模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## 相關

- [工具總覽](/zh-Hant/tools) - 所有可用的代理工具
- [配置參考](/zh-Hant/gateway/config-agents#agent-defaults) - pdfMaxBytesMb 與 pdfMaxPages 配置
