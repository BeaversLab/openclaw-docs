---
summary: "進入頻道位置解析 (Telegram + WhatsApp) 與內容欄位"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "頻道位置解析"
---

# 頻道位置解析

OpenClaw 將聊天頻道分享的位置標準化為：

- 附加到傳入內容的可讀文字，以及
- 自動回覆內容承載中的結構化欄位。

目前支援：

- **Telegram** (位置圖釘 + 場所 + 即時位置)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` 與 `geo_uri`)

## 文字格式化

位置會渲染為不帶括號的友好文字行：

- 圖釘：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地點：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 即時分享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果頻道包含標題/評論，它會被附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## Context fields

當存在位置時，這些欄位會被加入到 `ctx`：

- `LocationLat` (number)
- `LocationLon` (number)
- `LocationAccuracy` (number, meters; optional)
- `LocationName` (string; optional)
- `LocationAddress` (string; optional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (boolean)

## Channel notes

- **Telegram**: venues map to `LocationName/LocationAddress`; live locations use `live_period`.
- **WhatsApp**: `locationMessage.comment` 和 `liveLocationMessage.caption` 被附加為標題行。
- **Matrix**: `geo_uri` 解析為針點位置；海拔高度被忽略，且 `LocationIsLive` 始終為 false。
