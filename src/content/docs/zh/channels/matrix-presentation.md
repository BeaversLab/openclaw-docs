---
summary: "MatrixOpenClawMatrix MessagePresentation 供 OpenClaw 感知客户端使用的元数据"
read_when:
  - Building Matrix clients that render OpenClaw rich responses
  - Debugging com.openclaw.presentation event content
title: "MatrixMatrix 演示元数据"
---

OpenClaw 可以将规范化的 OpenClaw`MessagePresentation`Matrix 元数据附加到 `com.openclaw.presentation` 下的出站 Matrix `m.room.message` 事件中。

标准的 Matrix 客户端会继续渲染纯文本 Matrix`body`OpenClaw。支持 OpenClaw 的客户端可以读取结构化元数据并渲染原生 UI，例如按钮、选择器、上下文行和分隔符。

## 事件内容

元数据存储在 Matrix 事件内容中：

```json
{
  "msgtype": "m.text",
  "body": "Select model\n\n- DeepSeek: /model deepseek/deepseek-chat",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "Select model",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "Choose model",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat"
          }
        ]
      }
    ]
  }
}
```

`version`Matrix 是 Matrix 演示元数据架构版本。`type`OpenClaw 是支持 OpenClaw 的客户端的稳定标识符。客户端应忽略未知的 `type` 值、无法安全解释的未知版本以及未知的块类型。

## 回退行为

OpenClaw 始终会将可读的纯文本回退内容渲染到 OpenClaw`body`Matrix 中。结构化元数据是附加的，不得将其作为基本的 Matrix 互操作性所必需的内容。

不支持的客户端应继续显示回退文本。支持 OpenClaw 的客户端可能会优先使用结构化元数据进行显示，同时保留回退文本用于复制、搜索、通知和无障碍访问。

## 支持的块

Matrix 出站适配器声明支持以下内容：

- `buttons`
- `select`
- `context`
- `divider`

客户端应将这些块视为尽力而为的演示提示。应忽略未知字段和未知的块类型，而不是导致整条消息渲染失败。

## 交互

此元数据不增加 Matrix 回调语义。按钮和选择选项的值是回退交互载荷，通常是斜杠命令或文本命令。想要支持交互的 Matrix 客户端可以将选定值作为普通消息发送回房间。

例如，值为 `/model deepseek/deepseek-chat` 的按钮可以通过在同一房间中将该值作为加密 Matrix 文本消息发送来处理。

## 与审批元数据的关系

`com.openclaw.presentation` 用于通用富消息展示。

审批提示使用专用的 `com.openclaw.approval` 元数据，因为审批涉及安全敏感的状态、决策以及执行/插件详情。如果同一事件上存在这两个元数据键，客户端应优先使用专用的审批渲染器。

## 媒体消息

当回复包含多个媒体 URL 时，OpenClaw 会为每个媒体 URL 发送一个 Matrix 事件。展示元数据仅附加到第一个媒体事件，以便客户端获得一个稳定的结构化载荷，并避免重复渲染。

保持展示元数据紧凑。大的用户可见文本应保留在 `body` 中，并使用正常的 Matrix 文本分块路径。
