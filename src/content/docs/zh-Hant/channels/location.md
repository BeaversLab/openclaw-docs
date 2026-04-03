---
summary: "Inbound channel location parsing (Telegram/WhatsApp/Matrix) and context fields"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "頻道位置解析"
---

# 頻道位置解析

OpenClaw 將聊天頻道中分享的位置正規化為：

- 附加到入站內文的人類可讀文字，以及
- 自動回覆上下文負載中的結構化欄位。

目前支援：

- **Telegram**（位置圖釘 + 地點 + 即時位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（`m.location` 搭配 `geo_uri`）

## 文字格式

位置會呈現為不含括號的友善行：

- 圖釘：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地點：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 即時分享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果頻道包含標題/註解，它會附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文欄位

當存在位置時，這些欄位會新增到 `ctx`：

- `LocationLat` (number)
- `LocationLon` (number)
- `LocationAccuracy` (number, meters; optional)
- `LocationName` (string; optional)
- `LocationAddress` (string; optional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (boolean)

## 頻道註解

- **Telegram**：地點對應至 `LocationName/LocationAddress`；即時位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 會附加為標題行。
- **Matrix**：`geo_uri` 被解析為圖釘位置；高度會被忽略，且 `LocationIsLive` 恆為 false。
