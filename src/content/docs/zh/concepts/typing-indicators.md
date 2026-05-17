---
summary: "OpenClaw 何时显示输入指示器以及如何对其进行调整"
read_when:
  - Changing typing indicator behavior or defaults
title: "正在输入指示器"
---

当运行处于活动状态时，输入指示器会发送到聊天渠道。使用
`agents.defaults.typingMode` 控制输入**何时**开始，使用 `typingIntervalSeconds`
控制**刷新频率**。

## 默认值

当 `agents.defaults.typingMode`OpenClaw **未设置**时，OpenClaw 将保持旧行为：

- **直接聊天**：一旦模型循环开始，立即开始输入指示。
- **带提及的群组聊天**：立即开始输入指示。
- **不带提及的群组聊天**：仅在消息文本开始流式传输时才开始输入指示。
- **心跳运行**：如果解析后的心跳目标支持输入指示的聊天且未禁用输入指示，则在心跳运行开始时开始输入指示。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` - 从不显示输入指示器。
- `instant` - **在模型循环开始时**立即开始输入，即使运行
  后来仅返回静默回复令牌。
- `thinking` - 在**首次推理增量**时开始输入（运行需要
  `reasoningLevel: "stream"`）。
- `message` - 在**首次非静默文本增量**时开始输入（忽略
  `NO_REPLY` 静默令牌）。

“触发时机早晚”的顺序：
`never` → `message` → `thinking` → `instant`

## 配置

设置 Agent 级别的默认值：

```json5
{
  agents: {
    defaults: {
      typingMode: "thinking",
      typingIntervalSeconds: 6,
    },
  },
}
```

按会话覆盖模式或频率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意事项

- 当整个有效负载是完全的静默令牌（例如 `NO_REPLY` / `no_reply`，不区分大小写匹配）时，`message` 模式不会针对纯静默回复显示正在输入状态。
- `thinking` 仅当运行流式传输推理（`reasoningLevel: "stream"`）时才会触发。
  如果模型不发出推理增量，打字将不会开始。
- 心跳打字是已解析的传递目标的活跃信号。
  它在心跳运行开始时启动，而不是遵循 `message` 或 `thinking`
  的流式传输时间。设置 `typingMode: "never"` 可将其禁用。
- 当 `target: "none"`、无法解析目标、为心跳禁用了聊天投递或渠道不支持打字输入时，心跳不会显示打字输入状态。
- `typingIntervalSeconds` 控制**刷新节奏**，而非开始时间。默认值为 6 秒。

## 相关

<CardGroup cols={2}>
  <Card title="Presence" href="/zh/concepts/presence" icon="signal"Gateway(网关)macOS>
    Gateway(网关) 如何跟踪已连接的客户端并在 macOS 实例选项卡中显示它们。
  </Card>
  <Card title="流式传输和分块" href="/zh/concepts/streaming" icon="bars-staggered">
    出站流式传输行为、分块边界以及特定渠道的传递。
  </Card>
</CardGroup>
