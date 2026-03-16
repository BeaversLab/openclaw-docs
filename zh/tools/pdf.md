---
title: "PDF 工具"
summary: "使用原生提供商支持和提取回退分析一个或多个 PDF 文档"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

# PDF 工具

`pdf` 分析一个或多个 PDF 文档并返回文本。

快速行为：

- 适用于 Anthropic 和 Google 模型提供商的原生提供商模式。
- 适用于其他提供商的提取回退模式（首先提取文本，然后在需要时提取页面图像）。
- 支持单 (`pdf`) 或多 (`pdfs`) 输入，每次调用最多 10 个 PDF。

## 可用性

该工具仅在 OpenClaw 可以为智能体解析支持 PDF 的模型配置时注册：

1. `agents.defaults.pdfModel`
2. 回退到 `agents.defaults.imageModel`
3. 根据可用的身份验证回退到尽力而为的提供商默认值

如果无法解析出可用的模型，则不会暴露 `pdf` 工具。

## 输入参考

- `pdf` (`string`)：一个 PDF 路径或 URL
- `pdfs` (`string[]`)：多个 PDF 路径或 URL，最多总共 10 个
- `prompt` (`string`)：分析提示词，默认为 `Analyze this PDF document.`
- `pages` (`string`)：页面过滤器，例如 `1-5` 或 `1,3,7-9`
- `model` (`string`)：可选的模型覆盖 (`provider/model`)
- `maxBytesMb` (`number`)：每个 PDF 的大小上限（MB）

输入说明：

- `pdf` 和 `pdfs` 在加载之前会被合并和去重。
- 如果未提供 PDF 输入，该工具将报错。
- `pages` 被解析为从 1 开始的页码，经去重、排序后，限制为配置的最大页数。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支持的 PDF 引用

- 本地文件路径（包括 `~` 展开）
- `file://` URL
- `http://` 和 `https://` URL

引用说明：

- 其他 URI 方案（例如 `ftp://`）会被拒绝，并返回 `unsupported_pdf_reference`。
- 在沙箱模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略时，允许根目录之外的本地文件路径将被拒绝。

## 执行模式

### 原生提供程序模式

本机模式用于提供商 `anthropic` 和 `google`。
该工具将原始 PDF 字节直接发送到提供商 API。

原生模式限制：

- 不支持 `pages`。如果已设置，该工具将返回错误。

### 提取回退模式

回退模式用于非原生提供程序。

流程：

1. 从选定页面提取文本（最多 `agents.defaults.pdfMaxPages`，默认 `20`）。
2. 如果提取的文本长度低于 `200` 个字符，则将选定页面渲染为 PNG 图像并将其包含在内。
3. 将提取的内容和提示发送到选定的模型。

回退详细信息：

- 页面图像提取使用 `4,000,000` 的像素预算。
- 如果目标模型不支持图像输入且无可提取的文本，则该工具报错。
- 提取回退需要 `pdfjs-dist`（以及用于图像渲染的 `@napi-rs/canvas`）。

## 配置

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

有关完整字段详情，请参阅 [配置参考](/zh/gateway/configuration-reference)。

## 输出详细信息

该工具在 `content[0].text` 中返回文本，并在 `details` 中返回结构化元数据。

常见的 `details` 字段：

- `model`：已解析的模型引用（`provider/model`）
- `native`：本机提供商模式为 `true`，回退模式为 `false`
- `attempts`：成功之前失败的回退尝试次数

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：包含 `pdf` 个条目的 `details.pdfs[]`
- 沙盒路径重写元数据（如适用）：`rewrittenFrom`

## 错误行为

- 缺少 PDF 输入：抛出 `pdf required: provide a path or URL to a PDF document`
- PDF 太多：在 `details.error = "too_many_pdfs"` 中返回结构化错误
- 不支持的引用方案：返回 `details.error = "unsupported_pdf_reference"`
- 带有 `pages` 的本机模式：抛出清晰的 `pages is not supported with native PDF providers` 错误

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
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

import zh from "/components/footer/zh.mdx";

<zh />
