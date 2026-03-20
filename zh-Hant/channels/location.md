---
summary: "入站頻道位置解析（Telegram + WhatsApp）及上下文字段"
read_when:
  - 新增或修改頻道位置解析
  - 在代理程式提示詞或工具中使用位置上下文字段
title: "頻道位置解析"
---

# 頻道位置解析

OpenClaw 將聊天頻道分享的位置正規化為：

- 附加到入站訊息內容的可讀文本，以及
- 自動回覆上下文負載中的結構化字段。

目前支援：

- **Telegram**（位置圖釘 + 場所 + 實時位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix** (`m.location` 搭配 `geo_uri`)

## 文字格式

位置會呈現為不含括號的友善行文：

- 圖釘：
  - `📍 48.858844, 2.294351 ±12m`
- 具名地點：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 即時分享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果頻道包含說明文字/留言，它會附加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

當有位置資訊時，這些字段會加入到 `ctx`：

- `LocationLat` (數字)
- `LocationLon` (數字)
- `LocationAccuracy` (數字，公尺；選填)
- `LocationName` (字串；選填)
- `LocationAddress` (字串；選填)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (布林值)

## 頻道備註

- **Telegram**：場所對應至 `LocationName/LocationAddress`；即時位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 會作為說明文字行附加。
- **Matrix**：`geo_uri` 會被解析為圖釘位置；海拔高度會被忽略，且 `LocationIsLive` 恆為 false。

import en from "/components/footer/en.mdx";

<en />
