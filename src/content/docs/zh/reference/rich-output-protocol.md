---
summary: "用于嵌入、媒体、音频提示和回复的富输出短代码协议"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "富输出协议"
---

助手输出可以携带一小组传递/渲染指令：

- `MEDIA:` 用于附件传递
- `[[audio_as_voice]]` 用于音频展示提示
- `[[reply_to_current]]` / `[[reply_to:<id>]]` 用于回复元数据
- `[embed ...]` 用于控制 UI 富渲染

远程 `MEDIA:` 附件必须是公共的 `https:` URL。纯 `http:`，
loopback、link-local、private 和 internal 主机名作为附件指令会被忽略；
服务器端媒体获取器仍会强制执行其自身的网络保护。

本地 `MEDIA:` 附件可以使用绝对路径、相对于工作区的路径，或
相对于主目录的 `~/` 路径。在发送之前，它们仍需通过代理文件读取策略和
媒体类型检查。

纯 Markdown 图片语法默认保持为文本。那些有意将
Markdown 图片回复映射为媒体附件的渠道会在其出站
适配器中选择加入；Telegram 这样做是为了让 Telegram`![alt](url)` 仍然能成为媒体回复。

这些指令是分开的。`MEDIA:` 和回复/语音标签保持为传递元数据；`[embed ...]` 是仅限 Web 的富渲染路径。
可信的工具结果媒体在传递之前使用相同的 `MEDIA:` / `[[audio_as_voice]]` 解析器，因此文本工具输出仍然可以将音频附件标记为语音笔记。

当启用分块流式传输时，`MEDIA:` 保持为一次轮次的单次传递元数据。
如果相同的媒体 URL 在流式块中发送并在最终的
助手负载中重复，OpenClaw 将传递一次附件并从最终负载中
去除重复项。

## `[embed ...]`

`[embed ...]` 是 Control UI 面向代理的唯一富渲染语法。

自闭合示例：

```text
[embed ref="cv_123" title="Status" /]
```

规则：

- `[view ...]` 对于新输出不再有效。
- 嵌入短代码仅在助手消息界面中渲染。
- 仅渲染基于 URL 的嵌入。使用 `ref="..."` 或 `url="..."`。
- 块形式的内联 HTML 嵌入短代码不会渲染。
- Web UI 会从可见文本中去除此短代码，并内联渲染该嵌入。
- `MEDIA:` 不是嵌入别名，不应用于富嵌入渲染。

## 存储的渲染形状

标准化/存储的助手内容块是一个结构化的 `canvas` 项：

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

存储/渲染的富块直接使用此 `canvas` 形状。`present_view` 不被识别。

## 相关

- [RPC 适配器](/zh/reference/rpc)
- [Typebox](/zh/concepts/typebox)
