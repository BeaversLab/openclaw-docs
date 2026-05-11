---
summary: "入站頻道位置解析（Telegram/WhatsApp/Matrix）與上下文字段"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "頻道位置解析"
---

OpenClaw 將聊天頻道中的共享位置標準化為：

- 附加到入站訊息主體的簡明座標文字，以及
- 自動回覆上下文載荷中的結構化字段。頻道提供的標籤、地址和標題/註解會透過共享的不可信元數據 JSON 區塊渲染到提示中，而非直接內聯於使用者訊息主體中。

目前支援：

- **Telegram**（位置圖釘 + 場所 + 即時位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（`m.location` with `geo_uri`）

## 文字格式

位置會以無括號的友好行形式呈現：

- 圖釘：
  - `📍 48.858844, 2.294351 ±12m`
- 具名場所：
  - `📍 48.858844, 2.294351 ±12m`
- 即時分享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果頻道包含標籤、地址或標題/註解，它會保留在上下文載荷中，並以隔離的不可信 JSON 形式出現在提示中：

````text
Location (untrusted metadata):
```
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
}
```
```

## 上下文欄位

當存在位置時，這些字段會被加入到 `ctx`：

- `LocationLat` （數字）
- `LocationLon` （數字）
- `LocationAccuracy` （數字，公尺；選用）
- `LocationName` （字串；選用）
- `LocationAddress` （字串；選用）
- `LocationSource` （`pin | place | live`）
- `LocationIsLive` （布林值）
- `LocationCaption` （字串；選用）

提示渲染器會將 `LocationName`、`LocationAddress` 和 `LocationCaption` 視為不可信元數據，並透過與其他頻道上下文相同的受限 JSON 路徑進行序列化。

## 頻道備註

- **Telegram**：場所會對應到 `LocationName/LocationAddress`；即時位置則使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 會填入 `LocationCaption`。
- **Matrix**：`geo_uri` 被解析為釘選位置；高度會被忽略，且 `LocationIsLive` 始終為 false。

## 相關

- [位置指令（節點）](/zh-Hant/nodes/location-command)
- [相機擷取](/zh-Hant/nodes/camera)
- [媒體理解](/zh-Hant/nodes/media-understanding)
````
