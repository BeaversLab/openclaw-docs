---
summary: "用于出站通道的 Markdown 格式化管道"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Markdown 格式化"
---

OpenClaw 通过将出站 Markdown 转换为共享的中间表示（IR），然后再渲染特定渠道的输出，从而对其进行格式化。IR 保持源文本不变，同时携带样式/链接范围，以便分块和渲染在各个渠道之间保持一致。

## 目标

- **一致性：** 一次解析步骤，多个渲染器。
- **安全分块：** 在渲染之前拆分文本，使内联格式永远不会在分块之间中断。
- **渠道适配：** 将同一个 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal 样式范围，而无需重新解析 Markdown。

## 流水线

1. **解析 Markdown -> IR**
   - IR 是纯文本加上样式范围（粗体/斜体/删除线/代码/剧透）和链接范围。
   - 偏移量是 UTF-16 代码单元，以便 Signal 样式范围与其 API 对齐。
   - 表格仅在渠道选择进行表格转换时才会被解析。
2. **分块 IR（格式优先）**
   - 分块在渲染之前对 IR 文本进行。
   - 内联格式不会在分块之间拆分；范围会按分块进行切片。
3. **按渠道渲染**
   - **Slack：** mrkdwn 令牌（粗体/斜体/删除线/代码），链接以 `<url|label>` 形式呈现。
   - **Telegram：** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：** 纯文本 + `text-style` 范围；当标签与 URL 不同时，链接会变成 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** - see [docs](https://docs.openclaw.ai).
```

IR（示意图）：

```json
{
  "text": "Hello world - see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用场景

- Slack、Telegram 和 Signal 出站适配器从 IR 进行渲染。
- 其他渠道（WhatsApp、iMessage、Microsoft Teams、Discord）仍然使用纯文本或其自己的格式规则，如果在启用时，会在分块之前应用 Markdown 表格转换。

## 表格处理

Markdown 表格在聊天客户端中的支持并不一致。请使用
`markdown.tables` 来控制每个渠道（以及每个账户）的转换方式。

- `code`：将表格渲染为代码块（大多数渠道的默认设置）。
- `bullets`：将每一行转换为项目符号（Signal + WhatsApp 的默认设置）。
- `off`：禁用表格解析和转换；原始表格文本将原样通过。

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
- 代码围栏被保留为一个带有尾随换行符的块，以便渠道正确渲染它们。
- 列表前缀和引用块前缀是 IR 文本的一部分，因此分块不会在前缀中间进行分割。
- 内联样式（粗体/斜体/删除线/行内代码/剧透）绝不会跨块分割；渲染器会在每个块内重新打开样式。

如果您需要了解有关跨渠道分块行为的更多信息，请参阅
[流式传输 + 分块](/zh/concepts/streaming)。

## 链接策略

- **Slack：** `[label](url)` -> `<url|label>`；裸 URL 保持原样。解析期间
  禁用自动链接以避免重复链接。
- **Telegram：** `[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：** `[label](url)` -> `label (url)`，除非标签与 URL 匹配。

## 剧透

剧透标记（`||spoiler||`）仅针对 Signal 进行解析，在该渠道中它们映射到
SPOILER 样式范围。其他渠道将其视为纯文本。

## 如何添加或更新渠道格式化程序

1. **解析一次：** 使用共享的 `markdownToIR(...)` 助手，并配置适合
   渠道的选项（自动链接、标题样式、引用前缀）。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 实现渲染器以及
   样式标记映射（或 Signal 样式范围）。
3. **分块：** 在渲染之前调用 `chunkMarkdownIR(...)`；然后渲染每个块。
4. **连接适配器：** 更新渠道出站适配器以使用新的分块器
   和渲染器。
5. **测试：** 添加或更新格式测试，如果渠道使用了分块，则添加出站传递测试。

## 常见陷阱

- Slack 尖括号标记（`<@U123>`、`<#C123>`、`<https://...>`）必须保留；安全地转义原始 HTML。
- Telegram HTML 需要对标签外的文本进行转义，以避免损坏的标记。
- Signal 样式范围取决于 UTF-16 偏移量；不要使用代码点偏移量。
- 为围栏代码块保留尾随换行符，以便结束标记落在
  自己的行上。

## 相关

<CardGroup cols={2}>
  <Card title="流式传输和分块" href="/zh/concepts/streaming" icon="bars-staggered">
    出站流式传输行为、分块边界和特定渠道的交付。
  </Card>
  <Card title="系统提示词" href="/zh/concepts/system-prompt" icon="message-lines">
    模型在对话之前看到的内容，包括注入的工作区文件。
  </Card>
</CardGroup>
