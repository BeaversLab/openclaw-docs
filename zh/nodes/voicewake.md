---
title: "Voice Wake（全局唤醒词）"
summary: "全局语音唤醒词（Gateway 持有）及跨节点同步方式"
read_when:
  - 调整语音唤醒词行为或默认值
  - 新增需要唤醒词同步的 node 平台
---
# Voice Wake（全局唤醒词）

OpenClaw 将**唤醒词**视为由 **Gateway** 持有的**全局列表**。

- **没有**按节点的自定义唤醒词。
- **任何 node/app UI 都可以编辑**该列表；变更由 Gateway 持久化并广播给所有客户端。
- 各设备仍保留自己的 **Voice Wake 启用/禁用** 开关（本地 UX + 权限不同）。

## 存储（Gateway 主机）

唤醒词保存在 gateway 机器：

- `~/.openclaw/settings/voicewake.json`

结构：

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### Methods

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set`（参数 `{ triggers: string[] }`）→ `{ triggers: string[] }`

注意：
- 触发词会被规范化（trim、去空）。空列表会回落到默认值。
- 出于安全，会对数量/长度做限制。

### Events

- `voicewake.changed` payload `{ triggers: string[] }`

接收方：
- 所有 WebSocket 客户端（macOS app、WebChat 等）
- 所有已连接 nodes（iOS/Android），并在 node 连接时作为初始“当前状态”推送

## 客户端行为

### macOS app

- 使用全局列表来触发 `VoiceWakeRuntime`。
- 在 Voice Wake 设置中编辑 “Trigger words” 会调用 `voicewake.set`，并依赖广播保持其他客户端同步。

### iOS node

- 使用全局列表做 `VoiceWakeManager` 的触发检测。
- 在 Settings 中编辑 Wake Words 会调用 `voicewake.set`（通过 Gateway WS），同时保持本地检测及时响应。

### Android node

- 在 Settings 中提供 Wake Words 编辑器。
- 通过 Gateway WS 调用 `voicewake.set`，保证全局同步。
