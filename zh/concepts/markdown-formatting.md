---
summary: "出站频道的 Markdown 格式化流水线"
read_when:
  - 需要修改出站频道的 markdown 格式化或分块
  - 需要新增频道格式化器或样式映射
  - 在排查跨频道格式回归
title: "Markdown Formatting"
---
# Markdown 格式化

OpenClaw 通过把出站 Markdown 转换为共享的中间表示（IR）来进行格式化，然后渲染为各频道特定输出。IR 保留源文本，同时携带样式/链接范围，使分块与渲染在不同频道之间保持一致。

## 目标

- **一致性：** 一次解析，多渲染器。
- **安全分块：** 在渲染前切分文本，避免内联格式跨块断裂。
- **频道适配：** 同一 IR 映射到 Slack mrkdwn、Telegram HTML、Signal style ranges，无需重新解析 Markdown。

## Pipeline

1. **解析 Markdown -> IR**
   - IR 是纯文本 + 样式范围（bold/italic/strike/code/spoiler）与链接范围。
   - 偏移使用 UTF-16 code units，以便 Signal 样式范围对齐其 API。
   - 仅在频道选择启用表格转换时解析表格。
2. **IR 分块（先格式）**
   - 分块发生在渲染前的 IR 文本上。
   - 内联格式不会跨块断裂；样式范围按块切片。
3. **按频道渲染**
   - **Slack:** mrkdwn tokens（bold/italic/strike/code），链接为 `<url|label>`。
   - **Telegram:** HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal:** 纯文本 + `text-style` ranges；当 label 与 url 不同，链接变为 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [
    { "start": 6, "end": 11, "style": "bold" }
  ],
  "links": [
    { "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }
  ]
}
```

## 使用位置

- Slack、Telegram、Signal 出站适配器从 IR 渲染。
- 其他频道（WhatsApp、iMessage、MS Teams、Discord）仍使用纯文本或各自的格式规则；当启用时，Markdown 表格转换会在分块前进行。

## 表格处理

Markdown 表格在各聊天客户端中支持不一致。使用 `markdown.tables` 按频道（和账号）控制转换。

- `code`：表格渲染为代码块（多数频道默认）。
- `bullets`：将每行转为项目符号（Signal + WhatsApp 默认）。
- `off`：禁用表格解析与转换；原始表格文本直接通过。

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

- 分块限制来自频道适配器/配置，应用于 IR 文本。
- 代码围栏作为单块保留，末尾附加换行以确保频道正确渲染。
- 列表前缀与引用前缀属于 IR 文本，因此分块不会在前缀中断开。
- 内联样式（bold/italic/strike/inline-code/spoiler）不会跨块断裂；渲染器会在每个块内重新打开样式。

若需更多跨频道分块行为说明，见 [Streaming + chunking](/zh/concepts/streaming)。

## 链接策略

- **Slack:** `[label](url)` -> `<url|label>`；裸 URL 保持原样。解析时禁用 autolink 以避免双重链接。
- **Telegram:** `[label](url)` -> `<a href="url">label</a>`（HTML parse mode）。
- **Signal:** `[label](url)` -> `label (url)`，除非 label 与 URL 相同。

## Spoilers

Spoiler 标记（`||spoiler||`）仅在 Signal 中解析，对应 SPOILER 样式范围。其他频道视为纯文本。

## 如何新增或更新频道格式化器

1. **解析一次：** 使用共享的 `markdownToIR(...)`，带上频道合适的选项（autolink、heading style、blockquote prefix）。
2. **渲染：** 使用 `renderMarkdownWithMarkers(...)` 与样式标记映射（或 Signal 样式范围）。
3. **分块：** 在渲染前调用 `chunkMarkdownIR(...)`；对每个块分别渲染。
4. **接线适配器：** 更新频道出站适配器以使用新的 chunker 与 renderer。
5. **测试：** 添加或更新格式测试；若频道使用分块，再添加出站投递测试。

## 常见坑

- Slack 角括号 token（`<@U123>`、`<#C123>`、`<https://...>`）必须保留；安全转义原始 HTML。
- Telegram HTML 需要对标签外文本进行转义，避免破坏标记。
- Signal 样式范围依赖 UTF-16 偏移；不要用 code point 偏移。
- 保留围栏代码块的尾部换行，确保闭合标记落在单独一行。
