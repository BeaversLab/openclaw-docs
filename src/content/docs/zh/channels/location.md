---
summary: "入站渠道位置解析 (Telegram/WhatsApp/Matrix) 及上下文字段"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "渠道位置解析"
---

OpenClaw 将聊天渠道中的共享位置标准化为：

- 附加到入站消息正文的简洁坐标文本，以及
- 自动回复上下文载荷中的结构化字段。渠道提供的标签、地址和说明/注释通过共享的非受信元数据 JSON 块渲染到提示词中，而不是内嵌在用户正文中。

目前支持：

- **Telegram**（位置图钉 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（`m.location` 带有 `geo_uri`）

## 文本格式

位置渲染为不带括号的友好行：

- 图钉：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 48.858844, 2.294351 ±12m`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果渠道包含标签、地址或说明/注释，它将保留在上下文载荷中，并作为受信的 JSON 代码块显示在提示词中：

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
````

## 上下文字段

当存在位置时，以下字段会添加到 `ctx`：

- `LocationLat`（数字）
- `LocationLon`（数字）
- `LocationAccuracy`（数字，米；可选）
- `LocationName`（字符串；可选）
- `LocationAddress`（字符串；可选）
- `LocationSource`（`pin | place | live`）
- `LocationIsLive`（布尔值）
- `LocationCaption`（字符串；可选）

提示词渲染器将 `LocationName`、`LocationAddress` 和 `LocationCaption` 视为非受信元数据，并通过用于其他渠道上下文的有界 JSON 路径对其进行序列化。

## 渠道说明

- **Telegram**：场所映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 填充 `LocationCaption`。
- **Matrix**：`geo_uri` 被解析为标记位置；海拔被忽略，且 `LocationIsLive` 始终为 false。

## 相关

- [Location command (nodes)](/zh/nodes/location-command)
- [Camera capture](/zh/nodes/camera)
- [Media understanding](/zh/nodes/media-understanding)
