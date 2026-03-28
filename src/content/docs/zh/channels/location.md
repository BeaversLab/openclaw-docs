---
summary: "入站渠道位置解析（Telegram + WhatsApp）和上下文字段"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "渠道位置解析"
---

# 渠道位置解析

OpenClaw 将来自聊天渠道的共享位置标准化为：

- 附加到入站正文的可读文本，以及
- 自动回复上下文载荷中的结构化字段。

目前支持：

- **Telegram**（位置定位点 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix** (`m.location` 与 `geo_uri`)

## 文本格式

位置呈现为不带括号的友好行：

- 定位点：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果渠道包含标题/评论，它会附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

当存在位置时，这些字段将添加到 `ctx` 中：

- `LocationLat` (number)
- `LocationLon` (number)
- `LocationAccuracy` (number, meters; optional)
- `LocationName` (string; optional)
- `LocationAddress` (string; optional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (boolean)

## 渠道说明

- **Telegram**：场所映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 作为标题行附加。
- **Matrix**：`geo_uri` 被解析为固定位置；海拔被忽略，且 `LocationIsLive` 始终为 false。
