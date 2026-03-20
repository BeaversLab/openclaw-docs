---
summary: "入站渠道位置解析（Telegram + WhatsApp）及上下文字段"
read_when:
  - 添加或修改渠道位置解析
  - 在代理提示词或工具中使用位置上下文字段
title: "渠道位置解析"
---

# 渠道位置解析

OpenClaw 将聊天渠道中的共享位置标准化为：

- 附加到入站正文的人类可读文本，以及
- 自动回复上下文载荷中的结构化字段。

目前支持：

- **Telegram**（位置图钉 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（`m.location` 带有 `geo_uri`）

## 文本格式

位置以不带括号的友好行形式呈现：

- 图钉：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果渠道包含标题/评论，它将附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

当存在位置时，这些字段会添加到 `ctx`：

- `LocationLat` (数字)
- `LocationLon` (数字)
- `LocationAccuracy` (数字，米；可选)
- `LocationName` (字符串；可选)
- `LocationAddress` (字符串；可选)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (布尔值)

## 渠道说明

- **Telegram**：场所映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 被附加为标题行。
- **Matrix**：`geo_uri` 被解析为图钉位置；海拔被忽略，且 `LocationIsLive` 始终为 false。

import zh from "/components/footer/zh.mdx";

<zh />
