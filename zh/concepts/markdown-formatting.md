---
summary: "出站渠道的 Markdown 格式化流程"
read_when:
  - 您正在更改出站渠道的 Markdown 格式或分块
  - 您正在添加新的渠道格式化器或样式映射
  - 您正在调试跨渠道的格式回退
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 通过将出站 Markdown 转换为共享的中间表示 (IR) 来进行格式化，然后再渲染特定渠道的输出。IR 保持源文本不变，同时携带样式/链接范围，以便分块和渲染在各渠道间保持一致。

## 目标

- **一致性：** 一次解析步骤，多个渲染器。
- **安全分块：** 在渲染前拆分文本，确保内联格式不会在分块之间中断。
- **渠道适配：** 将同一 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal
  样式范围，而无需重新解析 Markdown。

## 流程

1. **解析 Markdown -> IR**
   - IR 是纯文本加上样式范围（粗体/斜体/删除线/代码/剧透）和链接范围。
   - 偏移量是 UTF-16 代码单位，因此 Signal 样式范围与其 API 对齐。
   - 仅当渠道选择加入表格转换时，才会解析表格。
2. **分块 IR（格式优先）**
   - 分块在渲染之前对 IR 文本进行。
   - 内联格式不会在分块之间拆分；范围按分块切片。
3. **按渠道渲染**
   - **Slack：** mrkdwn 令牌（粗体/斜体/删除线/代码），链接为 `<url|label>`。
   - **Telegram：** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：** 纯文本 + `text-style` 范围；当标签不同时，链接变为 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意图）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用位置

- Slack、Telegram 和 Signal 出站适配器从 IR 进行渲染。
- 其他渠道（WhatsApp、iMessage、MS Teams、Discord）仍使用纯文本或
  它们自己的格式化规则，并在启用时在分块之前应用 Markdown 表格转换。

## 表格处理

聊天客户端并不一致支持 Markdown 表格。使用
`markdown.tables` 来控制每个渠道（以及每个账户）的转换。

- `code`：将表格渲染为代码块（大多数渠道的默认设置）。
- `bullets`：将每一行转换为项目符号点（Signal + WhatsApp 的默认设置）。
- `off`：禁用表格解析和转换；原始表格文本原样通过。

配置键：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 分块规则

- 分块限制来自渠道适配器/配置，并应用于 IR 文本。
- 代码围栏保留为单个块，并带有尾随换行符，以便渠道正确渲染它们。
- 列表前缀和引用块前缀是 IR 文本的一部分，因此分块不会在前缀中间拆分。
- 内联样式（粗体/斜体/删除线/内联代码/剧透）绝不会跨分块拆分；渲染器会在每个分块内重新打开样式。

如果您需要有关跨渠道分块行为的更多信息，请参阅[Streaming + chunking](/zh/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持裸露。解析期间禁用自动链接以避免双重链接。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>` (HTML parse mode)。
- **Signal：** `[label](url)` -> `label (url)`，除非标签与 URL 匹配。

## 剧透

剧透标记 (`||spoiler||`) 仅针对 Signal 进行解析，它们映射到 SPOILER 样式范围。其他渠道将其视为纯文本。

## 如何添加或更新渠道格式化程序

1. **解析一次：** 使用共享的 `markdownToIR(...)` 辅助函数，并配合适合渠道的选项（自动链接、标题样式、引用块前缀）。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 实现渲染器以及样式标记映射（或 Signal 样式范围）。
3. **分块：** 在渲染之前调用 `chunkMarkdownIR(...)`；渲染每个分块。
4. **连接适配器：** 更新渠道出站适配器以使用新的分块器和渲染器。
5. **测试：** 添加或更新格式测试，如果渠道使用分块，则添加出站传递测试。

## 常见陷阱

- Slack 尖括号标记 (`<@U123>`, `<#C123>`, `<https://...>`) 必须保留；安全地转义原始 HTML。
- Telegram HTML 需要转义标签之外的文本以避免标记损坏。
- Signal 样式范围取决于 UTF-16 偏移量；请勿使用代码点偏移量。
- 保留围栏代码块末尾的换行符，以便结束标记位于其单独的行上。

import en from "/components/footer/en.mdx";

<en />
