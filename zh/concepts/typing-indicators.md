---
summary: "OpenClaw 何时显示输入指示器以及如何对其进行调整"
read_when:
  - Changing typing indicator behavior or defaults
title: "输入指示器"
---

# 输入指示器

输入指示器在运行（run）激活期间发送到聊天频道。使用
`agents.defaults.typingMode` 控制输入**何时**开始，使用 `typingIntervalSeconds`
控制其刷新的频率。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 将保持旧行为：

- **直接聊天**：一旦模型循环开始，立即开始输入。
- **带有提及的群组聊天**：立即开始输入。
- **没有提及的群组聊天**：仅在消息文本开始流式传输时开始输入。
- **心跳运行**：输入已禁用。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 永不显示输入指示器。
- `instant` — 在模型循环**一开始**就开始输入，即使运行
  随后仅返回静默回复令牌。
- `thinking` — 在**首次推理增量**时开始输入（需要
  运行开启 `reasoningLevel: "stream"`）。
- `message` — 在**首次非静默文本增量**时开始输入（忽略
  `NO_REPLY` 静默令牌）。

“触发时机”的顺序为：
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

您可以按会话覆盖模式或节奏：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意事项

- `message` 模式不会为仅包含静默内容的回复显示输入指示器（例如 `NO_REPLY`
  用于抑制输出的令牌）。
- `thinking` 仅在运行流式传输推理时触发（`reasoningLevel: "stream"`）。
  如果模型未发出推理增量，输入将不会开始。
- 无论模式如何，心跳从不显示输入。
- `typingIntervalSeconds` 控制**刷新节奏**，而不是开始时间。
  默认值为 6 秒。

import zh from '/components/footer/zh.mdx';

<zh />
