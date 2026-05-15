---
summary: "使用原生提供商支持和提取回退功能分析一个或多个 PDF 文档"
title: "PDF 工具"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

`pdf` 分析一个或多个 PDF 文档并返回文本。

快速行为：

- 针对 Anthropic 和 Google 模型提供商的原生提供商模式。
- 针对其他提供商的提取回退模式（先提取文本，然后在需要时提取页面图像）。
- 支持单 (`pdf`) 或多 (`pdfs`) 输入，每次调用最多 10 个 PDF。

## 可用性

该工具仅在 OpenClaw 能够为智能体解析出支持 PDF 的模型配置时注册：

1. `agents.defaults.pdfModel`
2. 回退到 `agents.defaults.imageModel`
3. 回退到智能体已解析的会话/默认模型
4. 如果原生 PDF 提供商具有身份验证支持，则优先选择它们，而不是通用图像回退候选项

如果无法解析出可用的模型，则不会暴露 `pdf` 工具。

可用性说明：

- 回退链具有身份验证感知能力。配置的 `provider/model` 仅在
  OpenClaw 实际上可以为该智能体验证该提供商时才有效。
- 目前的原生 PDF 提供商为 **Anthropic** 和 **Google**。
- 如果已解析的会话/默认提供商已经配置了视觉/PDF
  模型，PDF 工具将在回退到其他具有身份验证支持的
  提供商之前重用该模型。

## 输入参考

<ParamField path="pdf" type="string">
  一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
  多个 PDF 路径或 URL，总共最多 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  分析提示词。
</ParamField>

<ParamField path="pages" type="string">
  页面过滤器，如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="model" type="string">
  可选的模型覆盖，采用 `provider/model` 格式。
</ParamField>

<ParamField path="maxBytesMb" type="number">
  每个 PDF 的大小上限（以 MB 为单位）。默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

输入说明：

- `pdf` 和 `pdfs` 在加载前会被合并和去重。
- 如果未提供 PDF 输入，该工具将报错。
- `pages` 被解析为从 1 开始的页码，经过去重、排序，并限制在配置的最大页数范围内。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支持的 PDF 引用

- 本地文件路径（包括 `~` 展开）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw 管理的入站引用，例如 `media://inbound/<id>`

引用说明：

- 其他 URI 方案（例如 `ftp://`）将被拒绝，并返回 `unsupported_pdf_reference`。
- 在沙盒模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略后，允许根目录之外的本地文件路径将被拒绝。
- 在使用仅限工作区文件策略时，允许使用托管入站引用以及 OpenClaw 入站媒体存储下重放的路径。

## 执行模式

### 原生提供商模式

原生模式用于提供商 `anthropic` 和 `google`。
该工具将原始 PDF 字节直接发送到提供商 API。

原生模式限制：

- 不支持 `pages`。如果设置了该参数，工具将返回错误。
- 支持多 PDF 输入；每个 PDF 都会在提示之前作为原生文档块/内联 PDF 部分发送。

### 提取回退模式

回退模式用于非原生提供商。

流程：

1. 从选定页面提取文本（最多 `agents.defaults.pdfMaxPages` 页，默认 `20`）。
2. 如果提取的文本长度低于 `200` 个字符，则将选定页面渲染为 PNG 图像并包含在内。
3. 将提取的内容和提示一起发送到选定的模型。

回退详情：

- 页面图像提取使用 `4,000,000` 的像素预算。
- 如果目标模型不支持图像输入且没有可提取的文本，该工具将报错。
- 如果文本提取成功但图像提取需要仅文本模型具备视觉能力，
  OpenClaw 会丢弃渲染的图像并继续处理
  提取的文本。
- 提取回退使用内置的 `document-extract` 插件。该插件拥有
  `pdfjs-dist`；`@napi-rs/canvas` 仅在图像渲染回退
  可用时使用。

## 配置

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

有关完整的字段详细信息，请参阅[配置参考](/zh/gateway/configuration-reference)。

## 输出详情

该工具在 `content[0].text` 中返回文本，在 `details` 中返回结构化元数据。

常见的 `details` 字段：

- `model`：已解析的模型引用 (`provider/model`)
- `native`：对于本机提供商模式为 `true`，对于回退模式为 `false`
- `attempts`：成功前失败的回退尝试次数

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：`details.pdfs[]`，包含 `pdf` 条目
- 沙箱路径重写元数据（如适用）：`rewrittenFrom`

## 错误行为

- 缺少 PDF 输入：抛出 `pdf required: provide a path or URL to a PDF document`
- PDF 过多：在 `details.error = "too_many_pdfs"` 中返回结构化错误
- 不支持的引用方案：返回 `details.error = "unsupported_pdf_reference"`
- 使用 `pages` 的本机模式：抛出明确的 `pages is not supported with native PDF providers` 错误

## 示例

单个 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

多个 PDF：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

页面过滤的回退模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## 相关

- [工具概述](/zh/tools) - 所有可用的代理工具
- [配置参考](/zh/gateway/config-agents#agent-defaults) - pdfMaxBytesMb 和 pdfMaxPages 配置
