---
summary: "支援原生供應商以及擷取後援機制來分析一份或多份 PDF 文件"
title: "PDF 工具"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

`pdf` 會分析一份或多份 PDF 文件並傳回文字。

快速行為：

- 針對 Anthropic 和 Google 模型提供者使用原生提供者模式。
- 針對其他提供者使用提取後備模式（先提取文字，有需要時再提取頁面圖片）。
- 支援單一 (`pdf`) 或多重 (`pdfs`) 輸入，每次呼叫最多 10 份 PDF。

## 可用性

僅當 OpenClaw 能為代理程式解析支援 PDF 的模型設定時，才會註冊此工具：

1. `agents.defaults.pdfModel`
2. 後援至 `agents.defaults.imageModel`
3. 後備至代理程式已解析的 session/default 模型
4. 如果原生 PDF 提供者需要身份驗證，則優先於通用圖片後備候選項

若無法解析出可用的模型，則不會開放 `pdf` 工具。

可用性說明：

- 後援鏈具備驗證感知功能。設定的 `provider/model` 僅在
  OpenClaw 實際上能為該代理程式驗證該供應商時才會計入。
- 目前的原生 PDF 提供者為 **Anthropic** 和 **Google**。
- 如果已解析的 session/default 提供者已設定視覺/PDF
  模型，PDF 工具會在後備至其他需身份驗證的
  提供者之前重複使用該模型。

## 輸入參考

<ParamField path="pdf" type="string">
  單一 PDF 路徑或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
  多個 PDF 路徑或 URL，總共最多 10 個。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  分析提示詞。
</ParamField>

<ParamField path="pages" type="string">
  頁面過濾器，例如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="password" type="string">
  擷取後援模式中加密 PDF 的密碼。
</ParamField>

<ParamField path="model" type="string">
  以 `provider/model` 格式選擇的選用模型覆寫。
</ParamField>

<ParamField path="maxBytesMb" type="number">
  單一 PDF 大小上限（單位 MB）。預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

輸入備註：

- `pdf` 和 `pdfs` 會在載入前進行合併與去重。
- 若未提供 PDF 輸入，工具會回報錯誤。
- `pages` 會被解析為以 1 起始的頁碼，經過去重、排序，並限制在設定的最大頁數範圍內。
- `password` 套用於請求中的每份 PDF，且僅供擷取後援模式使用。
- `maxBytesMb` 預設為 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支援的 PDF 參考

- 本地檔案路徑（包括 `~` 展開）
- `file://` URL
- `http://` 和 `https://` URL
- 由 OpenClaw 管理的傳入參考，例如 `media://inbound/<id>`

參考說明：

- 其他 URI 配置（例如 `ftp://`）會被拒絕並傳回 `unsupported_pdf_reference`。
- 在沙箱模式中，會拒絕遠端 `http(s)` URL。
- 若啟用僅限工作區的檔案策略，則會拒絕允許根目錄之外的本地檔案路徑。
- 若啟用僅限工作區的檔案策略，則允許 OpenClaw 傳入媒體存放區下的受管理傳入參考及重放路徑。

## 執行模式

### 原生提供者模式

原生模式用於提供者 `anthropic` 和 `google`。
此工具會將原始 PDF 位元組直接傳送至提供者 API。

原生模式限制：

- 不支援 `pages`。若設定此項，工具會傳回錯誤。
- 不支援 `password`。請使用非原生模型來分析加密的 PDF。
- 支援多 PDF 輸入；每個 PDF 會作為原生文件區塊 /
  內聯 PDF 部分在提示之前傳送。

### 擷取後備模式

後備模式用於非原生提供者。

流程：

1. 從選取的頁面擷取文字（最多 `agents.defaults.pdfMaxPages` 頁，預設 `20` 頁）。
2. 如果擷取的文字長度低於 `200` 個字元，則將選取的頁面呈現為 PNG 影像並包含它們。
3. 將擷取的內容及提示傳送至選取的模型。

後備詳細資訊：

- 頁面影像擷取使用的像素預算為 `4,000,000`。
- 可以使用頂層 `password` 參數開啟加密的 PDF。
- 如果目標模型不支援影像輸入且沒有可擷取的文字，此工具會報錯。
- 如果文字擷取成功，但影像擷取需要純文字模型具備視覺能力，
  OpenClaw 會捨棄呈現的影像並繼續使用
  擷取的文字。
- 提取後備使用內建的 `document-extract` 外掛程式。該外掛程式擁有
  `clawpdf`，透過 PDFium
  WebAssembly 提供文字擷取和圖像呈現。

## 組態

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

請參閱 [組態參考](/zh-Hant/gateway/configuration-reference) 以取得完整欄位詳細資訊。

## 輸出詳細資訊

此工具會在 `content[0].text` 中傳回文字，並在 `details` 中傳回結構化中繼資料。

常見 `details` 欄位：

- `model`：已解析的模型參照 (`provider/model`)
- `native`：原生提供者模式為 `true`，後備模式為 `false`
- `attempts`：成功前失敗的後備嘗試次數

路徑欄位：

- 單一 PDF 輸入：`details.pdf`
- 多個 PDF 輸入：`details.pdfs[]`，其中包含 `pdf` 項目
- 沙箱路徑重寫中繼資料 (適用時)：`rewrittenFrom`

## 錯誤行為

- 缺少 PDF 輸入：擲回 `pdf required: provide a path or URL to a PDF document`
- PDF 太多：在 `details.error = "too_many_pdfs"` 中傳回結構化錯誤
- 不支援的參照配置：傳回 `details.error = "unsupported_pdf_reference"`
- 原生模式搭配 `pages`：擲回清楚的 `pages is not supported with native PDF providers` 錯誤

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
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

使用提取後備的加密 PDF：

```json
{
  "pdf": "/tmp/locked.pdf",
  "password": "example-password",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Summarize this contract"
}
```

## 相關

- [工具總覽](/zh-Hant/tools) - 所有可用的代理程式工具
- [組態參考](/zh-Hant/gateway/config-agents#agent-defaults) - pdfMaxBytesMb 和 pdfMaxPages 組態
