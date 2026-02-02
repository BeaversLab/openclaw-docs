---
summary: "OpenClaw 何时显示输入指示以及如何调节"
read_when:
  - 修改输入指示行为或默认值
title: "Typing Indicators"
---
# 输入指示

输入指示会在运行中发送到聊天渠道。使用 `agents.defaults.typingMode` 控制**何时**开始输入指示，使用 `typingIntervalSeconds` 控制**刷新频率**。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 保持旧行为：
- **私聊**：模型循环开始即显示输入。
- **群聊且有 mention**：立即显示输入。
- **群聊且无 mention**：仅当消息文本开始 streaming 时显示输入。
- **Heartbeat 运行**：禁用输入指示。

## 模式

将 `agents.defaults.typingMode` 设置为：
- `never` — 永不显示输入指示。
- `instant` — **模型循环开始即显示**，即便最终仅返回静默 token。
- `thinking` — 在**第一个推理 delta**时显示（需该次运行 `reasoningLevel: "stream"`）。
- `message` — 在**第一个非静默文本 delta**时显示（忽略 `NO_REPLY` 静默 token）。

“触发越早”的顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6
  }
}
```

可按会话覆盖模式或频率：
```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4
  }
}
```

## 注

- `message` 模式不会为仅静默回复显示输入（例如用于抑制输出的 `NO_REPLY`）。
- `thinking` 仅在运行流式推理时触发（`reasoningLevel: "stream"`）。若模型不输出推理 delta，则不会开始输入指示。
- Heartbeats 无论模式如何都不显示输入。
- `typingIntervalSeconds` 控制**刷新频率**，而非开始时间。默认 6 秒。
