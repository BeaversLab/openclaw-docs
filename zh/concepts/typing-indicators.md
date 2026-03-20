---
summary: "当 OpenClaw 显示输入指示器以及如何对其进行调整"
read_when:
  - 更改输入指示器行为或默认值
title: "输入指示器"
---

# 输入指示器

当运行处于活动状态时，输入指示器会发送到聊天渠道。使用
`agents.defaults.typingMode` 控制 **何时** 开始输入，使用 `typingIntervalSeconds`
控制 **刷新频率**。

## 默认值

当 `agents.defaults.typingMode` **未设置** 时，OpenClaw 保持旧行为：

- **直接聊天**：一旦模型循环开始，立即开始输入。
- **带有提及的群组聊天**：立即开始输入。
- **没有提及的群组聊天**：仅在消息文本开始流式传输时开始输入。
- **心跳运行**：输入已禁用。

## 模式

将 `agents.defaults.typingMode` 设置为以下选项之一：

- `never` — 从不显示输入指示器。
- `instant` — **一旦模型循环开始** 就开始输入，即使运行
  后来仅返回静默回复令牌。
- `thinking` — 在 **首次推理增量** 时开始输入（需要运行
  `reasoningLevel: "stream"`）。
- `message` — 在 **首个非静默文本增量** 时开始输入（忽略
  `NO_REPLY` 静默令牌）。

“触发时机”的顺序：
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

你可以按会话覆盖模式或节奏：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 说明

- `message` 模式不会对仅静默回复显示输入（例如用于抑制输出的 `NO_REPLY`
  令牌）。
- `thinking` 仅在运行流式传输推理（`reasoningLevel: "stream"`）时才会触发。
  如果模型未发出推理增量，输入将不会开始。
- 无论处于何种模式，心跳从不显示输入状态。
- `typingIntervalSeconds` 控制 **刷新节奏**，而非开始时间。
  默认值为 6 秒。

import en from "/components/footer/en.mdx";

<en />
