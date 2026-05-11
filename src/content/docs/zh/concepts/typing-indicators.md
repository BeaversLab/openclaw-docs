---
summary: "OpenClaw 何时显示输入指示器以及如何对其进行调整"
read_when:
  - Changing typing indicator behavior or defaults
title: "正在输入指示器"
---

当运行处于活动状态时，正在输入指示器会发送到聊天渠道。使用
`agents.defaults.typingMode` 控制输入**何时**开始，并使用 `typingIntervalSeconds`
控制其刷新**频率**。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 将保留旧行为：

- **直接聊天**：一旦模型循环开始，立即开始输入指示。
- **带提及的群组聊天**：立即开始输入指示。
- **不带提及的群组聊天**：仅在消息文本开始流式传输时才开始输入指示。
- **心跳运行**：如果解析后的心跳目标支持输入指示的聊天且未禁用输入指示，则在心跳运行开始时开始输入指示。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 从不显示正在输入指示器。
- `instant` — **模型循环一开始**就开始输入，即使运行稍后仅返回静默回复令牌。
- `thinking` — 在**首次推理增量**时开始输入（要求运行具有 `reasoningLevel: "stream"`）。
- `message` — 在**首个非静默文本增量**时开始输入（忽略 `NO_REPLY` 静默令牌）。

“触发时机早晚”的顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

您可以在每个会话中覆盖模式或节奏：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意

- 当整个有效载荷正是确切的静默令牌（例如 `NO_REPLY` / `no_reply`，不区分大小写匹配）时，`message` 模式不会显示仅静默回复的输入指示。
- `thinking` 仅在运行流式传输推理（`reasoningLevel: "stream"`）时才会触发。如果模型未发出推理增量，输入指示将不会开始。
- 心跳输入是解析后的传递目标的活跃信号。它在心跳运行开始时启动，而不是遵循 `message` 或 `thinking` 的流时机。设置 `typingMode: "never"` 可将其禁用。
- 当 `target: "none"`、无法解析目标、为心跳禁用了聊天传递，或者渠道不支持输入时，心跳不会显示正在输入。
- `typingIntervalSeconds` 控制**刷新频率**，而不是开始时间。默认为 6 秒。

## 相关

- [在线状态](/zh/concepts/presence)
- [流式传输和分块](/zh/concepts/streaming)
