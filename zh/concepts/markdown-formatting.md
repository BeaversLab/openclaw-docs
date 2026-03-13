---
summary: "用于出站通道的 Markdown 格式化管道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

# Markdown 格式化

OpenClaw 通过将出站 Markdown 转换为共享的中间表示（IR），然后渲染特定频道的输出来对其进行格式化。IR 在保留源文本完整的同时携带样式/链接范围，从而使分块和渲染在各频道间保持一致。

## 目标

- **一致性：** 一次解析步骤，多个渲染器。
- **安全分块：** 在渲染之前分割文本，以确保内联格式永远不会
  在分块之间中断。
- **频道适配：** 将同一个 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal
  样式范围，而无需重新解析 Markdown。

## 管道

1. **解析 Markdown -> IR**
   - IR 是纯文本加上样式范围（粗体/斜体/删除线/代码/剧透）和链接范围。
   - 偏移量是 UTF-16 代码单元，以便 Signal 样式范围与其 API 对齐。
   - 仅当频道选择加入表格转换时才会解析表格。
2. **分块 IR（格式优先）**
   - 分块发生在渲染之前的 IR 文本上。
   - 内联格式不会在分块之间拆分；范围按分块切片。
3. **按频道渲染**
   - **Slack:** mrkdwn 标记（粗体/斜体/删除线/代码），链接作为 `<url|label>`。
   - **Telegram:** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal:** 纯文本 + `text-style` 范围；当标签与 URL 不同时，链接变为 `label (url)`。

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

## 使用场景

- Slack、Telegram 和 Signal 出站适配器从 IR 进行渲染。
- 其他频道（WhatsApp、iMessage、MS Teams、Discord）仍使用纯文本或
  它们自己的格式化规则，并在启用时于分块之前应用 Markdown 表格转换。

## 表格处理

聊天客户端对 Markdown 表格的支持并不一致。使用
`markdown.tables` 来控制每个通道（以及每个账户）的转换。

- `code`：将表格渲染为代码块（大多数通道的默认设置）。
- `bullets`：将每一行转换为项目符号（Signal + WhatsApp 的默认设置）。
- `off`：禁用表格解析和转换；原始表格文本将原样传递。

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

- 分块限制源自渠道适配器/配置，并应用于 IR 文本。
- 代码块被保留为带有尾随换行符的单个块，以便渠道
  能够正确渲染它们。
- 列表前缀和引用块前缀是 IR 文本的一部分，因此分块
  不会在前缀中间进行分割。
- 内联样式（粗体/斜体/删除线/行内代码/剧透）绝不会跨越
  分块进行分割；渲染器会在每个分块内重新打开样式。

如果您需要了解有关跨渠道分块行为的更多信息，请参阅
[Streaming + chunking](/en/concepts/streaming)。

## 链接策略

- **Slack:** `[label](url)` -> `<url|label>`；裸露的 URL 保持裸露。自动链接
  禁用自动链接以避免重复链接。
- **Telegram:** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal:** `[label](url)` -> `label (url)`，除非标签与 URL 匹配。

## 剧透

剧透标记（`||spoiler||`）仅在 Signal 上解析，它们映射到
SPOILER 样式范围。其他通道将它们视为纯文本。

## 如何添加或更新渠道格式化程序

1. **解析一次：** 使用共享的 `markdownToIR(...)` 辅助函数并配合适合通道的
   选项（自动链接、标题样式、引用块前缀）。
2. **渲染：** 实现一个带有 `renderMarkdownWithMarkers(...)` 和一个
   样式标记映射（或 Signal 样式范围）的渲染器。
3. **分块：** 在渲染之前调用 `chunkMarkdownIR(...)`；渲染每个块。
4. **连接适配器：** 更新渠道出站适配器以使用新的分块器
   和渲染器。
5. **测试：** 添加或更新格式测试，如果渠道使用了分块，
   还要添加出站交付测试。

## 常见陷阱

- Slack 尖括号标记（`<@U123>`、`<#C123>`、`<https://...>`）必须
  被保留；安全地转义原始 HTML。
- Telegram HTML 需要转义标签之外的文本，以避免损坏的标记。
- 信号样式范围依赖于UTF-16偏移量；不要使用代码点偏移量。
- 为围栏代码块保留尾随换行符，以便闭合标记位于
  它们自己的行上。

import zh from '/components/footer/zh.mdx';

<zh />
