---
summary: "出站渠道的 Markdown 格式化流水线"
read_when:
  - 正在修改出站渠道的 Markdown 格式化或分块
  - 正在新增渠道 formatter 或样式映射
  - 正在排查跨渠道格式化回归
---
# Markdown 格式化

OpenClaw 通过将出站 Markdown 转换为共享的中间表示（IR）再渲染为渠道特定输出来进行格式化。IR 保留源文本，同时携带样式/链接跨度，确保分块与渲染在各渠道一致。

## 目标

- **一致性**：一次解析，多渲染器。
- **安全分块**：渲染前先切块，避免内联格式跨块断裂。
- **渠道适配**：同一 IR 映射为 Slack mrkdwn、Telegram HTML、Signal 样式范围，无需重解析 Markdown。

## 流水线

1. **解析 Markdown -> IR**
   - IR 是纯文本 + 样式跨度（bold/italic/strike/code/spoiler）与链接跨度。
   - 偏移使用 UTF-16 code units，以便 Signal 样式范围对齐其 API。
   - 表格仅在渠道启用表格转换时解析。
2. **IR 分块（先格式后渲染）**
   - 分块在渲染前对 IR 文本执行。
   - 内联格式不会跨块拆分；跨度按块切片。
3. **按渠道渲染**
   - **Slack**：mrkdwn tokens（bold/italic/strike/code），链接为 `<url|label>`。
   - **Telegram**：HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal**：纯文本 + `text-style` 范围；若 label 不同于 URL，则链接变为 `label (url)`。

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

## 使用范围

- Slack、Telegram、Signal 的出站适配器从 IR 渲染。
- 其他渠道（WhatsApp、iMessage、MS Teams、Discord）仍使用纯文本或自身格式规则；当启用时，会在分块前应用 Markdown 表格转换。

## 表格处理

Markdown 表格在聊天客户端中支持不一致。使用 `markdown.tables` 按渠道（或账号）控制转换：

- `code`：将表格渲染为代码块（多数渠道默认）。
- `bullets`：将每行转换为项目符号（Signal + WhatsApp 默认）。
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

- 分块限制来自渠道适配器/配置，并作用于 IR 文本。
- 代码围栏保留为单块，并带尾随换行，以便渠道正确渲染。
- 列表前缀和引用前缀属于 IR 文本，分块不会在前缀中间拆分。
- 内联样式（bold/italic/strike/inline-code/spoiler）不会跨块拆分；渲染器会在每个块内重新打开样式。

如需更多跨渠道分块行为，参见
[Streaming + chunking](/zh/concepts/streaming)。

## 链接策略

- **Slack**：`[label](url)` -> `<url|label>`；裸 URL 保持原样。为避免重复链接，解析时关闭自动链接。
- **Telegram**：`[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal**：`[label](url)` -> `label (url)`，除非 label 与 URL 相同。

## Spoilers

Spoiler 标记（`||spoiler||`）仅对 Signal 解析，并映射为 SPOILER 样式范围。其他渠道视为普通文本。

## 如何新增/更新渠道 formatter

1. **只解析一次**：使用共享 `markdownToIR(...)`，设置适合渠道的选项（自动链接、标题样式、引用前缀）。
2. **渲染**：用 `renderMarkdownWithMarkers(...)` 和样式 marker 映射（或 Signal 样式范围）实现渲染器。
3. **分块**：渲染前调用 `chunkMarkdownIR(...)`，逐块渲染。
4. **接入适配器**：更新渠道出站适配器以使用新的分块器与渲染器。
5. **测试**：新增或更新格式化测试；若渠道使用分块，再补充出站投递测试。

## 常见坑

- Slack 的尖括号 token（`<@U123>`、`<#C123>`、`<https://...>`）必须保留；同时安全转义原始 HTML。
- Telegram HTML 要转义标签外的文本，避免破坏标记。
- Signal 样式范围依赖 UTF-16 偏移；不要用 code point 偏移。
- 保留围栏代码块的尾随换行，使结束标记落在独立行。
