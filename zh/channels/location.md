---
summary: "入站频道位置解析（Telegram + WhatsApp）和上下文字段"
read_when:
  - "Adding or modifying channel location parsing"
  - "Using location context fields in agent prompts or tools"
title: "频道位置解析"
---

# 频道位置解析

OpenClaw 将聊天频道中共享的位置标准化为：

- 附加到入站正文的人类可读文本，以及
- 自动回复上下文负载中的结构化字段。

目前支持：

- **Telegram**（位置标记 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（%%P2%% 为 %%P1%%）

## 文本格式化

位置被呈现为不带括号的友好行：

- 标记：
  - %%P3%%
- 命名地点：
  - %%P4%%
- 实时分享：
  - %%P5%%

如果频道包含标题/评论，它会附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

当存在位置时，这些字段被添加到 %%P6%%：

- %%P7%%（数字）
- %%P8%%（数字）
- %%P9%%（数字，米；可选）
- %%P10%%（字符串；可选）
- %%P11%%（字符串；可选）
- %%P12%%（%%P13%%）
- %%P14%%（布尔值）

## 频道说明

- **Telegram**：场所映射到 %%P15%%；实时位置使用 %%P16%%。
- **WhatsApp**：%%P17%% 和 %%P18%% 被附加为标题行。
- **Matrix**：%%P19%% 被解析为标记位置；海拔被忽略，%%P20%% 始终为 false。
