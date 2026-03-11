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
- **Matrix**（具有 `geo_uri` 的 `m.location`）"

## 文本格式化

位置被呈现为不带括号的友好行：

- Pin：
  - `📍 48.858844, 2.294351 ±12m`"
- 命名场所：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`"
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`"

如果频道包含标题/评论，它会附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

当存在位置时，这些字段会被添加到 `ctx`：

- `LocationLat`（数字）"
- `LocationLon`（数字）"
- `LocationAccuracy`（数字，米；可选）"
- `LocationName`（字符串；可选）"
- `LocationAddress`（字符串；可选）"
- `LocationSource`（`pin | place | live`）"
- `LocationIsLive`（布尔值）"

## 频道说明

- **Telegram**：场所映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。"
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 作为标题行附加。"
- **Matrix**：`geo_uri` 被解析为 pin 位置；海拔被忽略，`LocationIsLive` 始终为 false。"
